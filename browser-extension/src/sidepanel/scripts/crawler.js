/* CRAWLER.JS — Lógica da tela de crawler com polling em tempo real */

let crawlerState = {
  sessionId:   null,
  pollInterval: null,
  baseUrl:     null,
};

// ── Entry point ───────────────────────────────────────────────
function bindCrawler() {
  $('btn-start-crawler').addEventListener('click', startCrawler);
  $('btn-stop-crawler').addEventListener('click', stopCrawler);
  $('btn-new-crawler').addEventListener('click', resetCrawlerScreen);
  $('btn-crawler-history').addEventListener('click', loadCrawlerHistory);
  $('btn-back-crawler').addEventListener('click', () => {
    stopPolling();
    if (typeof enterAdmin === 'function') enterAdmin();
  });
}

function enterCrawler() {
  showScreen('crawler');

  // Extrair domínio base da aba atual
  let origin = '—';
  try { origin = new URL(S.currentSiteUrl).origin; } catch(_) {}
  crawlerState.baseUrl = origin;

  $('crawler-site-label').textContent   = origin.replace('https://', '').replace('http://', '');
  $('crawler-base-url-display').textContent = origin;

  // Resetar UI para estado inicial
  show('crawler-config-section');
  hide('crawler-running-section');
  hide('crawler-done-section');
  hide('crawler-history-section');
  hide('crawler-start-error');
}

// ── Iniciar crawler ───────────────────────────────────────────
async function startCrawler() {
  hide('crawler-start-error');

  const chromePath = $('crawler-chrome-path').value.trim() || null;

  const btn = $('btn-start-crawler');
  btn.disabled = true; btn.textContent = '⏳ Iniciando...';

  try {
    const res = await api('POST', '/crawler/start', {
      base_url:      crawlerState.baseUrl,
      researcher_id: S.loggedResearcher?.id || null,
      chrome_path:   chromePath,
    });

    crawlerState.sessionId = res.session_id;

    // Mostrar seção de progresso
    hide('crawler-config-section');
    show('crawler-running-section');
    $('crawler-status-label').textContent = 'Iniciando varredura...';

    // Começar polling
    startPolling();

  } catch (err) {
    showErr('crawler-start-error', `Erro ao iniciar: ${err.message}`);
    btn.disabled = false; btn.textContent = '🕷️ Iniciar crawler';
  }
}

// ── Parar crawler ─────────────────────────────────────────────
async function stopCrawler() {
  if (!crawlerState.sessionId) return;
  try {
    await api('POST', `/crawler/${crawlerState.sessionId}/stop`, {});
    $('crawler-status-label').textContent = 'Parando...';
    $('crawler-pulse').className = 'crawler-pulse stopped';
  } catch(err) {
    console.error('Erro ao parar crawler:', err);
  }
}

// ── Polling de status (a cada 2s) ─────────────────────────────
function startPolling() {
  stopPolling();
  crawlerState.pollInterval = setInterval(pollStatus, 2000);
  pollStatus(); // imediato
}

function stopPolling() {
  if (crawlerState.pollInterval) {
    clearInterval(crawlerState.pollInterval);
    crawlerState.pollInterval = null;
  }
}

async function pollStatus() {
  if (!crawlerState.sessionId) return;

  try {
    const res = await api('GET', `/crawler/${crawlerState.sessionId}/status`);
    const d   = res.data;

    const pending  = d.queue?.pending  || 0;
    const crawling = d.queue?.crawling || 0;
    const done     = d.queue?.done     || 0;
    const errors   = d.queue?.error    || 0;
    const total    = pending + crawling + done + errors;
    const pct      = total > 0 ? Math.round((done / total) * 100) : 0;

    // Atualizar contadores
    $('c-crawled').textContent  = d.pages_crawled || 0;
    $('c-found').textContent    = d.pages_found   || 0;
    $('c-pending').textContent  = pending + crawling;
    $('c-errors').textContent   = d.pages_error   || 0;

    // Cor especial para erros
    $('c-errors').className = (d.pages_error > 0)
      ? 'crawler-counter-val error-val'
      : 'crawler-counter-val';

    // Progress bar
    $('crawler-progress-fill').style.width = pct + '%';

    // Status label
    const statusLabels = {
      running: `Varrendo... (${pct}%)`,
      done:    'Concluído!',
      error:   'Erro durante a varredura',
      stopped: 'Parado pelo usuário',
      pending: 'Aguardando início...',
    };
    $('crawler-status-label').textContent = statusLabels[d.status] || d.status;

    // Sessão terminou?
    if (['done', 'error', 'stopped'].includes(d.status)) {
      stopPolling();
      showCrawlerDone(d);
    }

  } catch(err) {
    console.error('[CRAWLER] Erro no polling:', err.message);
  }
}

function showCrawlerDone(data) {
  hide('crawler-running-section');
  show('crawler-done-section');

  const icons   = { done: '✅', error: '❌', stopped: '⏹️' };
  const titles  = {
    done:    'Crawler concluído!',
    error:   'Crawler encerrado com erro',
    stopped: 'Crawler interrompido',
  };

  $('crawler-done-icon').textContent  = icons[data.status]  || '✅';
  $('crawler-done-title').textContent = titles[data.status] || 'Concluído';
  $('cd-crawled').textContent = data.pages_crawled || 0;
  $('cd-found').textContent   = data.pages_found   || 0;
  $('cd-errors').textContent  = data.pages_error   || 0;
}

function resetCrawlerScreen() {
  crawlerState.sessionId = null;
  hide('crawler-done-section');
  hide('crawler-running-section');
  show('crawler-config-section');
  $('btn-start-crawler').disabled = false;
  $('btn-start-crawler').textContent = '🕷️ Iniciar crawler';
}

// ── Histórico ─────────────────────────────────────────────────
async function loadCrawlerHistory() {
  const section = $('crawler-history-section');
  const list    = $('crawler-history-list');

  show('crawler-history-section');
  list.innerHTML = '<p class="empty-state">Carregando...</p>';

  try {
    const siteParam = encodeURIComponent(S.currentSiteUrl || '');
    const res = await api('GET', `/crawler?site_url=${siteParam}`);
    const sessions = res.data || [];

    if (!sessions.length) {
      list.innerHTML = '<p class="empty-state">Nenhuma sessão registrada para este site.</p>';
      return;
    }

    list.innerHTML = '';
    sessions.forEach(s => {
      const date = new Date(s.started_at).toLocaleString('pt-BR', {
        day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
      });
      const duration = s.finished_at
        ? Math.round((new Date(s.finished_at) - new Date(s.started_at)) / 1000)
        : null;

      const el = document.createElement('div');
      el.className = 'crawler-history-item';
      el.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px">
          <div class="crawler-history-url" style="flex:1">${s.base_url}</div>
          <span class="crawler-history-status status-${s.status}">${s.status}</span>
        </div>
        <div class="crawler-history-meta">
          <span>📄 ${s.pages_crawled} varridas</span>
          <span>🔗 ${s.pages_found} encontradas</span>
          ${s.pages_error > 0 ? `<span style="color:var(--danger)">❌ ${s.pages_error} erros</span>` : ''}
          ${duration ? `<span>⏱ ${duration}s</span>` : ''}
          <span style="margin-left:auto;color:var(--text-3)">${date}</span>
        </div>
      `;
      list.appendChild(el);
    });
  } catch(err) {
    list.innerHTML = `<p class="empty-state" style="color:#dc2626">Erro: ${err.message}</p>`;
  }
}
