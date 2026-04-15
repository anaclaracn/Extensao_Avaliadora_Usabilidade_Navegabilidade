/**
 * BACKGROUND.JS v3 — Service Worker
 *
 * Novidades:
 *  - Gerencia timers de tarefas em background (popup pode fechar)
 *  - Rastreia clicks por tarefa ativa
 *  - Expõe getTaskState para o popup consultar
 */

// ── Estado global ────────────────────────────────────────────
const state = {
  isEnabled:        true,
  backendUrl:       'http://localhost:3000',
  eventsCollected:  0,
  sessionStartTime: Date.now(),
  userId:           null,
  sessionId:        null,
  sessionCreating:  false,

  // Tarefa em andamento
  activeTask:       null,   // { id, description, startedAt (ms), clicks }
  completedTasks:   [],     // [{ taskId, description, startedAt, finishedAt, clicks, success }]
};

// ── Boot ──────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.sync.set({ isEnabled: true, backendUrl: 'http://localhost:3000' });
  }
});

chrome.storage.sync.get(null, (data) => { Object.assign(state, data); });

// ── Messages ──────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  switch (req.action) {

    case 'sessionCreated':
      state.sessionId        = req.sessionId;
      state.userId           = req.userId;
      state.eventsCollected  = 0;
      state.sessionStartTime = Date.now();
      state.completedTasks   = [];
      state.activeTask       = null;
      sendResponse({ success: true });
      break;

    case 'getExtensionStatus':
      chrome.storage.sync.get(null, (data) => {
        sendResponse({ success: true, status: { ...state, ...data } });
      });
      return true;

    case 'getEventStats':
      sendResponse({
        success: true,
        stats: {
          eventsCollected: state.eventsCollected,
          sessionDuration: Math.floor((Date.now() - state.sessionStartTime) / 1000),
          sessionId:       state.sessionId,
          activeTask:      state.activeTask,
          completedTasks:  state.completedTasks,
        },
      });
      break;

    // Participante clicou em "Começar tarefa"
    case 'startTask':
      state.activeTask = {
        id:          req.taskId,
        description: req.description,
        startedAt:   Date.now(),
        clicks:      0,
      };
      console.log('▶️  Tarefa iniciada:', req.description);
      sendResponse({ success: true });
      break;

    // Participante clicou em "Concluir tarefa"
    case 'completeTask':
      handleCompleteTask(req.success ?? true, sendResponse);
      return true;

    // Participante abandonou tarefa sem concluir
    case 'skipTask':
      handleCompleteTask(false, sendResponse);
      return true;

    case 'getCompletedTasks':
      sendResponse({ success: true, tasks: state.completedTasks });
      break;

    case 'toggleExtension':
      state.isEnabled = req.enabled;
      if (!req.enabled) resetSession();
      chrome.storage.sync.set({ isEnabled: req.enabled });
      notifyTabs({ action: 'toggleTracking', enabled: req.enabled });
      sendResponse({ success: true });
      break;

    case 'updateBackendUrl':
      state.backendUrl = req.url;
      resetSession();
      chrome.storage.sync.set({ backendUrl: req.url });
      notifyTabs({ action: 'updateConfig', config: { backendUrl: req.url } });
      sendResponse({ success: true });
      break;

    case 'resetStats':
      resetSession();
      sendResponse({ success: true });
      break;

    case 'sendEventToBackend':
      handleSendEvent(
        req.event,
        sender?.tab?.url || req.event?.url || 'http://desconhecido',
        sendResponse
      );
      return true;

    default:
      sendResponse({ error: 'Ação desconhecida' });
  }
  return true;
});

// ── Completar tarefa ──────────────────────────────────────────
async function handleCompleteTask(success, sendResponse) {
  if (!state.activeTask) {
    sendResponse({ success: false, error: 'Nenhuma tarefa ativa' });
    return;
  }

  const task = state.activeTask;
  const finishedAt = Date.now();

  const result = {
    taskId:      task.id,
    description: task.description,
    startedAt:   task.startedAt,
    finishedAt,
    durationMs:  finishedAt - task.startedAt,
    clicks:      task.clicks,
    success,
  };

  state.completedTasks.push(result);
  state.activeTask = null;

  // Salvar no backend
  try {
    await fetch(`${state.backendUrl}/task-results`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id:     result.taskId,
        session_id:  state.sessionId,
        started_at:  new Date(result.startedAt).toISOString(),
        finished_at: new Date(result.finishedAt).toISOString(),
        success:     result.success,
        clicks:      result.clicks,
      }),
    });
    console.log('✅ task_result salvo');
  } catch (err) {
    console.error('❌ Erro ao salvar task_result:', err.message);
  }

  sendResponse({ success: true, result });
}

// ── Enviar evento ─────────────────────────────────────────────
async function handleSendEvent(event, siteUrl, sendResponse) {
  if (!state.isEnabled) {
    sendResponse({ success: false, error: 'Extensão desabilitada' });
    return;
  }

  if (!state.sessionId) {
    const sid = await ensureSession(siteUrl);
    if (!sid) { sendResponse({ success: false, error: 'Sem sessão' }); return; }
  }

  // Contar click na tarefa ativa
  if (state.activeTask && event.type === 'click') {
    state.activeTask.clicks++;
  }

  const payload = { ...event, session_id: state.sessionId };

  try {
    const res  = await fetch(`${state.backendUrl}/events`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) { sendResponse({ success: false, error: data.error }); return; }

    state.eventsCollected++;
    chrome.runtime.sendMessage({ action: 'eventLogged', event }).catch(() => {});
    sendResponse({ success: true, data });

  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

// ── Fallback session ──────────────────────────────────────────
async function ensureSession(siteUrl) {
  if (state.sessionId) return state.sessionId;
  if (state.sessionCreating) {
    await new Promise(r => setTimeout(r, 1200));
    return state.sessionId;
  }
  state.sessionCreating = true;
  try {
    const uRes  = await fetch(`${state.backendUrl}/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age: 0, gender: 'nao_informado', education_level: 'nao_informado' }),
    });
    const uData = await uRes.json();
    state.userId = uData.data.id;

    const sRes  = await fetch(`${state.backendUrl}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: state.userId, site_url: siteUrl }),
    });
    const sData = await sRes.json();
    state.sessionId        = sData.session_id;
    state.sessionStartTime = Date.now();
    return state.sessionId;
  } catch (err) {
    console.error('❌ Fallback session falhou:', err.message);
    return null;
  } finally {
    state.sessionCreating = false;
  }
}

function resetSession() {
  state.sessionId        = null;
  state.userId           = null;
  state.eventsCollected  = 0;
  state.sessionStartTime = Date.now();
  state.activeTask       = null;
  state.completedTasks   = [];
}

function notifyTabs(msg) {
  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, msg, () => { chrome.runtime.lastError; });
    });
  });
}

// ── Badge ─────────────────────────────────────────────────────
setInterval(() => {
  chrome.action.setBadgeText({ text: state.eventsCollected > 0 ? String(state.eventsCollected) : '' });
  chrome.action.setBadgeBackgroundColor({ color: state.activeTask ? '#f59e0b' : '#0d9488' });
}, 1500);

console.log('🔧 Background v3 carregado!');
