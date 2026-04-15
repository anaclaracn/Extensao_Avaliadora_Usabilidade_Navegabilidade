/**
 * POPUP.JS v3
 *
 * Telas:
 *   identify   → pick-test → session → results
 *                          → admin
 */

// ── Constantes ────────────────────────────────────────────────
const ADMIN_PWD_KEY  = 'adminPassword';
const DEFAULT_PWD    = 'admin123';
const BACKEND_KEY    = 'backendUrl';
const DEFAULT_BACKEND = 'http://localhost:3000';

// ── Estado ────────────────────────────────────────────────────
const S = {
  backendUrl:     DEFAULT_BACKEND,
  currentSiteUrl: null,
  userId:         null,
  sessionId:      null,
  sessionStart:   null,
  activeTestId:   null,
  activeTestName: null,
  tasks:          [],          // tarefas do teste escolhido
  activeTaskIdx:  null,        // índice da tarefa em andamento
  taskTimerMs:    0,
  taskTimerInt:   null,
  statsInt:       null,
};

// ── Helpers ───────────────────────────────────────────────────
const $       = id => document.getElementById(id);
const show    = id => $(id).classList.remove('hidden');
const hide    = id => $(id).classList.add('hidden');
const getText = id => $(id).value.trim();

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const el = $(`screen-${name}`);
  el.classList.remove('hidden');
  el.classList.add('active');
}

function showFeedback(id, msg, err = false) {
  const el = $(id);
  el.textContent = msg;
  el.className = 'feedback' + (err ? ' error' : '');
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function showErr(id, msg) { $(id).textContent = msg; show(id); }
function hideErr(id)       { hide(id); }

function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}
function fmtSec(s) {
  if (s < 60)  return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const stored = await getStorage([BACKEND_KEY]);
  S.backendUrl = stored[BACKEND_KEY] || DEFAULT_BACKEND;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) S.currentSiteUrl = tab.url;

  // Se já há sessão ativa, vai direto para sessão
  chrome.runtime.sendMessage({ action: 'getExtensionStatus' }, (res) => {
    if (res?.status?.sessionId) {
      S.sessionId    = res.status.sessionId;
      S.userId       = res.status.userId;
      S.sessionStart = res.status.sessionStartTime;
      // Tentar restaurar teste ativo se havia um
      if (S.activeTestId) enterSession();
      else                 enterPickTest();  // deixa escolher de novo
    }
  });

  bindIdentify();
  bindPickTest();
  bindSession();
  bindResults();
  bindAdmin();

  chrome.runtime.onMessage.addListener((req) => {
    if (req.action === 'eventLogged') updateSessionStats();
  });
});

// ══════════════════════════════════════════════════════════════
// TELA: IDENTIFY
// ══════════════════════════════════════════════════════════════
function bindIdentify() {
  ['participant','admin'].forEach(role => {
    $(`role-${role}`).addEventListener('click', () => {
      document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
      $(`role-${role}`).classList.add('selected');
      hide('form-participant'); hide('form-admin');
      hideErr('participant-error'); hideErr('admin-error');
      show(`form-${role}`);
    });
  });

  bindPills('gender-group',    'p-gender');
  bindPills('education-group', 'p-education');

  $('btn-start-participant').addEventListener('click', startParticipant);
  $('btn-login-admin').addEventListener('click', loginAdmin);
  $('admin-password').addEventListener('keydown', e => { if (e.key==='Enter') loginAdmin(); });
}

function bindPills(groupId, hiddenId) {
  $(groupId)?.querySelectorAll('.sel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $(groupId).querySelectorAll('.sel-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $(hiddenId).value = btn.dataset.val;
    });
  });
}

async function startParticipant() {
  hideErr('participant-error');
  const age  = parseInt($('p-age').value);
  const gen  = $('p-gender').value;
  const edu  = $('p-education').value;

  if (!age || age < 10) return showErr('participant-error', 'Informe uma idade válida.');
  if (!gen)             return showErr('participant-error', 'Selecione o gênero.');
  if (!edu)             return showErr('participant-error', 'Selecione a escolaridade.');

  const btn = $('btn-start-participant');
  btn.disabled = true; btn.textContent = 'Criando...';

  try {
    const uRes = await api('POST', '/users', { age, gender: gen, education_level: edu });
    S.userId = uRes.data.id;

    const sRes = await api('POST', '/sessions', {
      user_id:  S.userId,
      site_url: S.currentSiteUrl || 'http://desconhecido',
    });
    S.sessionId    = sRes.session_id;
    S.sessionStart = Date.now();

    chrome.runtime.sendMessage({ action: 'sessionCreated', sessionId: S.sessionId, userId: S.userId });
    enterPickTest();
  } catch (err) {
    showErr('participant-error', `Erro: ${err.message}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Continuar →';
  }
}

async function loginAdmin() {
  hideErr('admin-error');
  const pwd    = $('admin-password').value;
  const stored = await getStorage([ADMIN_PWD_KEY]);
  const correct = stored[ADMIN_PWD_KEY] || DEFAULT_PWD;
  if (pwd !== correct) return showErr('admin-error', 'Senha incorreta.');
  enterAdmin();
}

// ══════════════════════════════════════════════════════════════
// TELA: PICK-TEST
// ══════════════════════════════════════════════════════════════
function bindPickTest() {
  $('btn-back-from-pick').addEventListener('click', () => {
    showScreen('identify');
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
    hide('form-participant'); hide('form-admin');
  });
}

async function enterPickTest() {
  showScreen('pick-test');
  let host = '—';
  try { host = new URL(S.currentSiteUrl).hostname; } catch(_) {}
  $('pick-site-label').textContent = host;

  const list = $('tests-list');
  list.innerHTML = '<p class="empty-state">Carregando testes...</p>';

  try {
    // Filtra pelos testes do site atual usando site_url
    const siteParam = encodeURIComponent(S.currentSiteUrl || '');
    const res   = await api('GET', `/tests?site_url=${siteParam}`);
    const tests = res.data || [];

    if (!tests.length) {
      list.innerHTML = '<p class="empty-state">Nenhum teste configurado para este site.<br>Peça ao pesquisador para criar um.</p>';
      return;
    }

    list.innerHTML = '';
    tests.forEach(test => {
      const el = document.createElement('div');
      el.className = 'test-item';
      el.innerHTML = `
        <span class="test-item-icon">📋</span>
        <div class="test-item-info">
          <div class="test-item-name">${test.name}</div>
          <div class="test-item-meta">id #${test.id}</div>
        </div>
        <span class="test-item-arrow">›</span>
      `;
      el.addEventListener('click', () => selectTest(test));
      list.appendChild(el);
    });
  } catch (err) {
    list.innerHTML = `<p class="empty-state" style="color:#dc2626">Erro: ${err.message}</p>`;
  }
}

async function selectTest(test) {
  S.activeTestId   = test.id;
  S.activeTestName = test.name;

  try {
    const res = await api('GET', `/tasks?test_id=${test.id}`);
    S.tasks = res.data || [];
  } catch(_) { S.tasks = []; }

  enterSession();
}

// ══════════════════════════════════════════════════════════════
// TELA: SESSION
// ══════════════════════════════════════════════════════════════
function bindSession() {
  $('btn-task-done').addEventListener('click', () => finishTask(true));
  $('btn-task-skip').addEventListener('click', () => finishTask(false));
  $('btn-end-session').addEventListener('click', endSession);
}

function enterSession() {
  showScreen('session');
  let host = '—';
  try { host = new URL(S.currentSiteUrl).hostname; } catch(_) {}
  $('session-site-label').textContent = host;
  $('session-test-name').textContent  = S.activeTestName || 'Teste';

  renderSessionTasks();
  startStatsInterval();
}

function renderSessionTasks() {
  const list = $('session-tasks-list');
  list.innerHTML = '';

  if (!S.tasks.length) {
    list.innerHTML = '<p class="empty-state">Nenhuma tarefa neste teste.</p>';
    return;
  }

  S.tasks.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'task-item';
    el.id = `stask-${t.id}`;

    const isActive  = S.activeTaskIdx === i;
    const completed = S.tasks[i]._done;

    if (isActive)   el.classList.add('task-active');
    if (completed)  el.classList.add(S.tasks[i]._success ? 'task-success' : 'task-fail');

    const icon = completed
      ? (S.tasks[i]._success ? '✅' : '❌')
      : (isActive ? '⏱' : '○');

    const btn = (!completed && !isActive)
      ? `<button class="btn-start-task" data-idx="${i}">Começar</button>`
      : '';

    el.innerHTML = `
      <span class="task-num">${i+1}</span>
      <span class="task-text">${t.description}</span>
      <span class="task-status-icon">${icon}</span>
      ${btn}
    `;
    list.appendChild(el);
  });

  // Bind botões Começar
  list.querySelectorAll('.btn-start-task').forEach(btn => {
    btn.addEventListener('click', () => startTask(parseInt(btn.dataset.idx)));
  });
}

function startTask(idx) {
  if (S.activeTaskIdx !== null) return; // já tem tarefa ativa
  const task = S.tasks[idx];
  S.activeTaskIdx = idx;
  S.taskTimerMs   = 0;

  // Avisar background para começar a contar clicks
  chrome.runtime.sendMessage({
    action:      'startTask',
    taskId:      task.id,
    description: task.description,
  });

  // Mostrar card de tarefa ativa
  $('active-task-desc').textContent = task.description;
  $('active-task-timer').textContent = '00:00';
  $('active-task-clicks').textContent = '0';
  show('active-task-card');

  // Timer local (visual) — continua em background via background.js
  clearInterval(S.taskTimerInt);
  S.taskTimerInt = setInterval(() => {
    S.taskTimerMs += 1000;
    $('active-task-timer').textContent = fmtMs(S.taskTimerMs);

    // Atualizar clicks do background
    chrome.runtime.sendMessage({ action: 'getEventStats' }, (res) => {
      if (res?.stats?.activeTask) {
        $('active-task-clicks').textContent = res.stats.activeTask.clicks || 0;
      }
    });
  }, 1000);

  renderSessionTasks();
}

async function finishTask(success) {
  clearInterval(S.taskTimerInt);

  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: success ? 'completeTask' : 'skipTask', success }, (res) => {
      if (res?.result) {
        const task = S.tasks[S.activeTaskIdx];
        task._done       = true;
        task._success    = success;
        task._durationMs = res.result.durationMs;
        task._clicks     = res.result.clicks;
      }
      S.activeTaskIdx = null;
      hide('active-task-card');
      renderSessionTasks();

      // Avançar para próxima tarefa automaticamente se houver
      const nextIdx = S.tasks.findIndex(t => !t._done);
      if (nextIdx !== -1) {
        // Sugerir iniciar próxima
        setTimeout(() => {
          const nextBtn = document.querySelector(`.btn-start-task[data-idx="${nextIdx}"]`);
          if (nextBtn) nextBtn.style.animation = 'pulse 1s 2';
        }, 300);
      }
      resolve();
    });
  });
}

async function endSession() {
  if (!confirm('Encerrar a sessão e ver os resultados?')) return;

  // Se houver tarefa ativa, finalizar como não concluída
  if (S.activeTaskIdx !== null) await finishTask(false);

  clearInterval(S.taskTimerInt);
  clearInterval(S.statsInt);

  // Encerrar sessão no backend
  if (S.sessionId) {
    try { await api('PATCH', `/sessions/${S.sessionId}/end`, {}); } catch(_) {}
  }

  showResults();
}

function startStatsInterval() {
  clearInterval(S.statsInt);
  S.statsInt = setInterval(updateSessionStats, 1000);
}

function updateSessionStats() {
  chrome.runtime.sendMessage({ action: 'getEventStats' }, (res) => {
    if (!res?.stats) return;
    $('s-events').textContent = res.stats.eventsCollected || 0;
    $('s-time').textContent   = fmtSec(res.stats.sessionDuration || 0);
    $('s-done').textContent   = S.tasks.filter(t => t._done).length;
  });
}

// ══════════════════════════════════════════════════════════════
// TELA: RESULTS
// ══════════════════════════════════════════════════════════════
function bindResults() {
  $('btn-new-session').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resetStats' });
    S.sessionId = null; S.userId = null; S.sessionStart = null;
    S.activeTestId = null; S.activeTestName = null;
    S.tasks = []; S.activeTaskIdx = null;
    showScreen('identify');
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
    hide('form-participant'); hide('form-admin');
  });
}

async function showResults() {
  showScreen('results');
  $('results-test-name').textContent = S.activeTestName || '—';

  // Pegar stats do background
  const statsRes = await new Promise(r =>
    chrome.runtime.sendMessage({ action: 'getEventStats' }, r)
  );
  const bgStats = statsRes?.stats || {};

  const done      = S.tasks.filter(t => t._done);
  const succeeded = done.filter(t => t._success);
  const totalMs   = done.reduce((a, t) => a + (t._durationMs || 0), 0);
  const totalClks = done.reduce((a, t) => a + (t._clicks || 0), 0);
  const sessionSec= bgStats.sessionDuration || Math.floor((Date.now() - S.sessionStart) / 1000);

  const successRate = done.length > 0
    ? Math.round((succeeded.length / S.tasks.length) * 100) + '%'
    : '—';
  const avgTime  = done.length > 0 ? fmtMs(Math.round(totalMs / done.length)) : '—';
  const avgClicks= done.length > 0 ? Math.round(totalClks / done.length) : '—';

  $('m-success-rate').textContent  = successRate;
  $('m-total-time').textContent    = fmtSec(sessionSec);
  $('m-total-clicks').textContent  = totalClks;
  $('m-avg-time').textContent      = avgTime;
  $('m-avg-clicks').textContent    = avgClicks;
  $('m-events').textContent        = bgStats.eventsCollected || 0;

  // Detalhe por tarefa
  const breakdown = $('tasks-breakdown');
  breakdown.innerHTML = '';

  S.tasks.forEach((t, i) => {
    const el  = document.createElement('div');
    el.className = 'breakdown-item';

    const status = !t._done
      ? '<span class="breakdown-badge" style="background:#f3f4f6;color:#6b7280">Não iniciada</span>'
      : t._success
        ? '<span class="breakdown-badge ok">Concluída ✓</span>'
        : '<span class="breakdown-badge fail">Não concluída ✗</span>';

    const dur  = t._durationMs != null ? fmtMs(t._durationMs) : '—';
    const clks = t._clicks     != null ? t._clicks             : '—';

    el.innerHTML = `
      <div class="breakdown-header">
        <span class="breakdown-num">#${i+1}</span>
        <span class="breakdown-desc">${t.description}</span>
        ${status}
      </div>
      <div class="breakdown-stats">
        <span class="bstat">⏱ <strong>${dur}</strong></span>
        <span class="bstat">🖱 <strong>${clks}</strong> clicks</span>
      </div>
    `;
    breakdown.appendChild(el);
  });
}

// ══════════════════════════════════════════════════════════════
// TELA: ADMIN
// ══════════════════════════════════════════════════════════════
function enterAdmin() {
  showScreen('admin');
  let host = '—';
  try { host = new URL(S.currentSiteUrl).hostname; } catch(_) {}
  $('admin-site-label').textContent = host;
  $('admin-backend-url').value = S.backendUrl;
  loadAdminTests();
}

async function loadAdminTests() {
  const list = $('admin-tests-list');
  list.innerHTML = '<p class="empty-state">Carregando...</p>';
  try {
    // Filtra pelos testes do site atual
    const siteParam = encodeURIComponent(S.currentSiteUrl || '');
    const res   = await api('GET', `/tests?site_url=${siteParam}`);
    const tests = res.data || [];
    if (!tests.length) { list.innerHTML = '<p class="empty-state">Nenhum teste para este site ainda.</p>'; return; }
    list.innerHTML = '';
    tests.forEach(t => {
      const el = document.createElement('div');
      el.className = 'test-item';
      el.innerHTML = `
        <span class="test-item-icon">📋</span>
        <div class="test-item-info">
          <div class="test-item-name">${t.name}</div>
          <div class="test-item-meta">id #${t.id}</div>
        </div>
        <button class="btn-start-task" style="font-size:10px" data-id="${t.id}" data-name="${t.name}">Editar tarefas</button>
      `;
      el.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        S.activeTestId   = parseInt(e.target.dataset.id);
        S.activeTestName = e.target.dataset.name;
        $('tasks-test-badge').textContent = S.activeTestName;
        show('tasks-section');
        loadAdminTasks();
      });
      list.appendChild(el);
    });
  } catch(err) {
    list.innerHTML = `<p class="empty-state" style="color:#dc2626">Erro: ${err.message}</p>`;
  }
}

async function loadAdminTasks() {
  if (!S.activeTestId) return;
  try {
    const res  = await api('GET', `/tasks?test_id=${S.activeTestId}`);
    S.tasks = res.data || [];
    renderAdminTasks();
  } catch(_) {}
}

function renderAdminTasks() {
  const list = $('tasks-list');
  list.innerHTML = '';
  if (!S.tasks.length) {
    list.innerHTML = '<p class="empty-state">Nenhuma tarefa ainda.</p>';
    return;
  }
  S.tasks.forEach((t, i) => {
    const el = document.createElement('div');
    el.className = 'task-item';
    el.innerHTML = `<span class="task-num">${i+1}</span><span class="task-text">${t.description}</span>`;
    list.appendChild(el);
  });
}

function bindAdmin() {
  $('btn-create-test').addEventListener('click', async () => {
    const name = getText('test-name');
    if (!name) return showFeedback('test-feedback', 'Digite o nome do teste.', true);

    try {
      // Passa site_url diretamente — backend cria o site se necessário
      const tRes = await api('POST', '/tests', {
        name,
        site_url: S.currentSiteUrl || 'http://desconhecido',
      });
      S.activeTestId   = tRes.data.id;
      S.activeTestName = tRes.data.name;
      $('test-name').value = '';
      $('tasks-test-badge').textContent = name;
      show('tasks-section');
      showFeedback('test-feedback', `✓ Teste "${name}" criado para ${new URL(S.currentSiteUrl).hostname}!`);
      loadAdminTests();
    } catch(err) {
      showFeedback('test-feedback', `Erro: ${err.message}`, true);
    }
  });

  $('btn-add-task').addEventListener('click', async () => {
    const desc = getText('task-description');
    if (!desc)             return showFeedback('task-feedback', 'Digite a descrição.', true);
    if (!S.activeTestId)   return showFeedback('task-feedback', 'Crie um teste primeiro.', true);

    try {
      const res = await api('POST', '/tasks', { test_id: S.activeTestId, description: desc });
      S.tasks.push(res.data);
      $('task-description').value = '';
      renderAdminTasks();
      showFeedback('task-feedback', '✓ Tarefa adicionada!');
    } catch(err) {
      showFeedback('task-feedback', `Erro: ${err.message}`, true);
    }
  });

  $('task-description').addEventListener('keydown', e => { if (e.key==='Enter') $('btn-add-task').click(); });

  $('btn-save-url').addEventListener('click', async () => {
    const url = getText('admin-backend-url');
    if (!url) return;
    S.backendUrl = url;
    await setStorage({ [BACKEND_KEY]: url });
    chrome.runtime.sendMessage({ action: 'updateBackendUrl', url });
    $('btn-save-url').textContent = '✓';
  });

  $('btn-save-password').addEventListener('click', async () => {
    const pwd = $('admin-new-password').value.trim();
    if (!pwd) return;
    await setStorage({ [ADMIN_PWD_KEY]: pwd });
    $('admin-new-password').value = '';
    $('btn-save-password').textContent = '✓';
    setTimeout(() => $('btn-save-password').textContent = '✓', 1500);
  });

  $('btn-logout-admin').addEventListener('click', () => {
    showScreen('identify');
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
    hide('form-admin'); hide('form-participant');
    $('admin-password').value = '';
  });
}

// ── API helper ────────────────────────────────────────────────
async function api(method, path, body) {
  const url  = `${S.backendUrl}${path}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function getStorage(keys) { return new Promise(r => chrome.storage.sync.get(keys, r)); }
function setStorage(obj)  { return new Promise(r => chrome.storage.sync.set(obj, r)); }
