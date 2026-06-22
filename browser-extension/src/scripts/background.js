/**
 * BACKGROUND.JS — Service Worker da extensão
 * ============================================================
 * Responsabilidades:
 *  1. Gerenciar o estado da sessão ativa (criada pelo sidepanel)
 *  2. Controlar o timer de tarefa em background (sobrevive ao
 *     fechamento do painel)
 *  3. Receber eventos do content-script e enviá-los ao backend
 *  4. Contar cliques durante uma tarefa ativa
 *  5. Gerenciar o ciclo de vida started → completed de cada
 *     tentativa de tarefa, comunicando com /task-results/start
 *     e /task-results/:id/finish
 *  6. Badge do ícone da extensão (contador de eventos)
 * ============================================================
 */
 
// ── Estado global do service worker ──────────────────────────
const state = {
  isEnabled:        true,
  backendUrl:       'http://localhost:3000',
  eventsCollected:  0,
  sessionStartTime: Date.now(),
  userId:           null,
  sessionId:        null,
  sessionCreating:  false,
 
  // Tarefa em andamento (null quando nenhuma tarefa está ativa)
  // Formato: { id, description, startedAt (ms), startedAtIso,
  //            clicks, resultId }
  activeTask:       null,
 
  // Histórico de tarefas concluídas nesta sessão (para a tela de resultados)
  completedTasks:   [],
};
 
// ── Boot ──────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.sync.set({ isEnabled: true, backendUrl: 'http://localhost:3000' });
  }
});
 
chrome.storage.sync.get(null, (data) => { Object.assign(state, data); });
 
// ── Abrir side panel ao clicar no ícone da extensão ───────────
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
 
// ── Listener central de mensagens ─────────────────────────────
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  switch (req.action) {
 
    // Sidepanel avisa que criou uma sessão nova (POST /sessions)
    case 'sessionCreated':
      state.sessionId        = req.sessionId;
      state.userId           = req.userId;
      state.eventsCollected  = 0;
      state.sessionStartTime = Date.now();
      state.completedTasks   = [];
      state.activeTask       = null;
      sendResponse({ success: true });
      break;
 
    // Sidepanel consulta o estado atual ao reabrir o painel
    case 'getExtensionStatus':
      chrome.storage.sync.get(null, (data) => {
        sendResponse({ success: true, status: { ...state, ...data } });
      });
      return true;
 
    // Sidepanel consulta estatísticas em tempo real (polling)
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
 
    // Participante clica em "Começar" numa tarefa
    case 'startTask':
      handleStartTask(req.taskId, req.description, sendResponse);
      return true;
 
    // Participante clica em "Concluí" ou "Não consegui"
    case 'completeTask':
    case 'skipTask':
      handleCompleteTask(req.success ?? (req.action === 'completeTask'), sendResponse);
      return true;
 
    case 'toggleExtension':
      state.isEnabled = req.enabled;
      if (!req.enabled) resetSession();
      chrome.storage.sync.set({ isEnabled: req.enabled });
      notifyTabs({ action: 'toggleTracking', enabled: req.enabled });
      sendResponse({ success: true, enabled: req.enabled });
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
 
    // Content-script envia um evento de interação capturado na página
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
 
// ════════════════════════════════════════════════════════════
// CICLO DE VIDA DE TAREFA (started → completed)
// ════════════════════════════════════════════════════════════
 
/**
 * Chamado quando o participante clica "Começar" numa tarefa.
 * Cria o registro no backend (POST /task-results/start) ANTES
 * de qualquer interação, para que tentativas abandonadas no
 * meio do caminho deixem rastro no banco.
 */
async function handleStartTask(taskId, description, sendResponse) {
  const startedAt = new Date().toISOString();
 
  try {
    const res = await fetch(`${state.backendUrl}/task-results/start`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id:    taskId,
        session_id: state.sessionId,
        started_at: startedAt,
      }),
    });
    const data = await res.json();
 
    if (!res.ok) {
      console.error('❌ Erro ao registrar início da tarefa:', data.error);
      sendResponse({ success: false, error: data.error });
      return;
    }
 
    state.activeTask = {
      id:            taskId,
      description,
      startedAt:     Date.now(),   // timestamp em ms, usado pro timer local
      startedAtIso:  startedAt,    // string ISO, usada pra comunicação com a API
      clicks:        0,
      resultId:      data.result_id,
    };
 
    console.log('▶️  Tarefa iniciada, result_id =', data.result_id);
    sendResponse({ success: true });
 
  } catch (err) {
    console.error('❌ Falha ao chamar /task-results/start:', err.message);
    sendResponse({ success: false, error: err.message });
  }
}
 
/**
 * Chamado quando o participante clica "Concluí" ou "Não consegui".
 * Atualiza (PATCH) o registro criado em handleStartTask, em vez
 * de criar um novo — fechando o ciclo de vida da tentativa.
 */
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
 
  try {
    const res = await fetch(`${state.backendUrl}/task-results/${task.resultId}/finish`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        finished_at: new Date(result.finishedAt).toISOString(),
        success:     result.success,
        clicks:      result.clicks,
      }),
    });
 
    if (!res.ok) {
      const data = await res.json();
      console.error('❌ Erro ao finalizar tentativa:', data.error);
    } else {
      console.log('✅ Tentativa finalizada, result_id =', task.resultId);
    }
  } catch (err) {
    console.error('❌ Erro ao chamar /task-results/:id/finish:', err.message);
  }
 
  sendResponse({ success: true, result });
}
 
// ════════════════════════════════════════════════════════════
// EVENTOS DE INTERAÇÃO (cliques, scroll, teclado...)
// ════════════════════════════════════════════════════════════
 
/**
 * Recebe um evento do content-script e envia ao backend.
 * Garante que existe uma sessão ativa antes de enviar (fallback
 * de auto-criação, caso o sidepanel nunca tenha sido aberto).
 */
async function handleSendEvent(event, siteUrl, sendResponse) {
  if (!state.isEnabled) {
    sendResponse({ success: false, error: 'Extensão desabilitada' });
    return;
  }
 
  if (!state.sessionId) {
    const sid = await ensureSession(siteUrl);
    if (!sid) {
      sendResponse({ success: false, error: 'Sem sessão ativa' });
      return;
    }
  }
 
  // Contar clique na tarefa ativa, se houver uma em andamento
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
 
    if (!res.ok) {
      sendResponse({ success: false, error: data.error });
      return;
    }
 
    state.eventsCollected++;
    // Avisar o sidepanel (se estiver aberto) para atualizar o log em tempo real
    chrome.runtime.sendMessage({ action: 'eventLogged', event }).catch(() => {});
 
    sendResponse({ success: true, data });
 
  } catch (err) {
    console.error('❌ Erro ao enviar evento:', err.message);
    sendResponse({ success: false, error: err.message });
  }
}
 
// ════════════════════════════════════════════════════════════
// FALLBACK: criar sessão automaticamente se necessário
// ════════════════════════════════════════════════════════════
 
/**
 * Usado apenas como fallback, caso eventos cheguem antes do
 * sidepanel ter criado uma sessão explicitamente (ex: usuário
 * navegando antes de abrir o painel). O fluxo normal é o
 * sidepanel criar a sessão via 'sessionCreated'.
 */
async function ensureSession(siteUrl) {
  if (state.sessionId) return state.sessionId;
  if (state.sessionCreating) {
    await new Promise(r => setTimeout(r, 1200));
    return state.sessionId;
  }
 
  state.sessionCreating = true;
  try {
    const uRes = await fetch(`${state.backendUrl}/users`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age: 0, gender: 'nao_informado', education_level: 'nao_informado' }),
    });
    const uData = await uRes.json();
    state.userId = uData.data.id;
 
    const sRes = await fetch(`${state.backendUrl}/sessions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: state.userId, site_url: siteUrl }),
    });
    const sData = await sRes.json();
    state.sessionId        = sData.session_id;
    state.sessionStartTime = Date.now();
 
    console.log('🖥️  Sessão criada automaticamente (fallback):', state.sessionId);
    return state.sessionId;
 
  } catch (err) {
    console.error('❌ Falha ao criar sessão (fallback):', err.message);
    return null;
  } finally {
    state.sessionCreating = false;
  }
}
 
// ── Reset de sessão (logout, troca de backend, etc.) ──────────
function resetSession() {
  state.sessionId        = null;
  state.userId           = null;
  state.eventsCollected  = 0;
  state.sessionStartTime = Date.now();
  state.activeTask       = null;
  state.completedTasks   = [];
}
 
// ── Notificar todas as abas (usado em toggle/config) ───────────
function notifyTabs(msg) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, msg, () => {
        if (chrome.runtime.lastError) { /* silencioso — aba sem content-script */ }
      });
    });
  });
}
 
// ── Badge do ícone: contador de eventos + indicador de tarefa ──
setInterval(() => {
  chrome.action.setBadgeText({
    text: state.eventsCollected > 0 ? String(state.eventsCollected) : ''
  });
  chrome.action.setBadgeBackgroundColor({
    color: state.activeTask ? '#f59e0b' : '#0d9488'  // âmbar durante tarefa ativa
  });
}, 1500);
 
console.log('🔧 Background service worker carregado!');