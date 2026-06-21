/* CRAWLER.JS — Lógica da tela de crawler com polling em tempo real */

let crawlerState = {
  sessionId:    null,
  pollInterval: null,
  baseUrl:      null,
};

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
  let origin = '—';
  try { origin = new URL(S.currentSiteUrl).origin; } catch(_) {}
  crawlerState.baseUrl = origin;
  $('crawler-site-label').textContent       = origin.replace(/^https?:\/\//, '');
  $('crawler-base-url-display').textContent = origin;
  show('crawler-config-section');
  hide('crawler-running-section');
  hide('crawler-done-section');
  hide('crawler-history-section');
  hide('crawler-start-error');
  hide('crawler-patterns-section');
}

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
    hide('crawler-config-section');
    show('crawler-running-section');
    $('crawler-status-label').textContent = 'Iniciando varredura...';
    startPolling();
  } catch (err) {
    showErr('crawler-start-error', `Erro ao iniciar: ${err.message}`);
    btn.disabled = false; btn.textContent = '🕷️ Iniciar crawler';
  }
}

async function stopCrawler() {
  if (!crawlerState.sessionId) return;
  try {
    await api('POST', `/crawler/${crawlerState.sessionId}/stop`, {});
    $('crawler-status-label').textContent = 'Parando...';
    $('crawler-pulse').className = 'crawler-pulse stopped';
  } catch(err) { console.error('Erro ao parar:', err); }
}

function startPolling() {
  stopPolling();
  pollStatus();
  crawlerState.pollInterval = setInterval(pollStatus, 2000);
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
    const skipped  = d.queue?.skipped  || 0;
    const errors   = d.queue?.error    || 0;
    const total    = pending + crawling + done + skipped + errors;
    const pct      = total > 0 ? Math.round(((done + skipped) / total) * 100) : 0;

    $('c-crawled').textContent = d.pages_crawled || 0;
    $('c-found').textContent   = d.pages_found   || 0;
    $('c-skipped').textContent = d.pages_skipped || 0;
    $('c-pending').textContent = pending + crawling;
    $('c-errors').textContent  = d.pages_error   || 0;
    $('c-errors').className    = d.pages_error > 0
      ? 'crawler-counter-val error-val' : 'crawler-counter-val';

    $('crawler-progress-fill').style.width = pct + '%';
    $('crawler-status-label').textContent  = {
      running: `Varrendo... ${pct}%`,
      done:    'Concluído!',
      error:   'Erro durante a varredura',
      stopped: 'Parado pelo usuário',
      pending: 'Aguardando início...',
    }[d.status] || d.status;

    if (d.patterns?.length > 0) {
      show('crawler-patterns-section');
      renderPatterns(d.patterns);
    }

    if (['done', 'error', 'stopped'].includes(d.status)) {
      stopPolling();
      showCrawlerDone(d);
    }
  } catch(err) { console.error('[CRAWLER] Polling:', err.message); }
}

function renderPatterns(patterns) {
  const list = $('crawler-patterns-list');
  list.innerHTML = '';
  patterns.forEach(p => {
    const el = document.createElement('div');
    el.className = 'crawler-pattern-item';
    el.innerHTML = `
      <div class="crawler-pattern-url">${p.url_pattern}</div>
      <div class="crawler-pattern-meta">
        <span>🔗 ${p.total_urls} URLs</span>
        <span>✅ 1 varrida</span>
        <span>⏭️ ${p.skipped} puladas</span>
      </div>`;
    list.appendChild(el);
  });
}

function showCrawlerDone(data) {
  hide('crawler-running-section');
  show('crawler-done-section');
  $('crawler-done-icon').textContent  = { done:'✅', error:'❌', stopped:'⏹️' }[data.status] || '✅';
  $('crawler-done-title').textContent = {
    done:'Crawler concluído!', error:'Encerrado com erro', stopped:'Interrompido',
  }[data.status] || 'Concluído';
  $('cd-crawled').textContent  = data.pages_crawled || 0;
  $('cd-found').textContent    = data.pages_found   || 0;
  $('cd-skipped').textContent  = data.pages_skipped || 0;
  $('cd-errors').textContent   = data.pages_error   || 0;
}

function resetCrawlerScreen() {
  crawlerState.sessionId = null;
  hide('crawler-done-section');
  hide('crawler-running-section');
  hide('crawler-patterns-section');
  show('crawler-config-section');
  $('btn-start-crawler').disabled = false;
  $('btn-start-crawler').textContent = '🕷️ Iniciar crawler';
}

async function loadCrawlerHistory() {
  show('crawler-history-section');
  const list = $('crawler-history-list');
  list.innerHTML = '<p class="empty-state">Carregando...</p>';
  try {
    const res      = await api('GET', `/crawler?site_url=${encodeURIComponent(S.currentSiteUrl||'')}`);
    const sessions = res.data || [];
    if (!sessions.length) { list.innerHTML = '<p class="empty-state">Nenhuma sessão registrada.</p>'; return; }
    list.innerHTML = '';
    sessions.forEach(s => {
      const date = new Date(s.started_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      const duration = s.finished_at ? Math.round((new Date(s.finished_at)-new Date(s.started_at))/1000) : null;
      const el = document.createElement('div');
      el.className = 'crawler-history-item';
      el.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:5px">
          <div class="crawler-history-url" style="flex:1">${s.base_url}</div>
          <span class="crawler-history-status status-${s.status}">${s.status}</span>
        </div>
        <div class="crawler-history-meta">
          <span>✅ ${s.pages_crawled} varridas</span>
          <span>⏭️ ${s.pages_skipped||0} puladas</span>
          <span>🔗 ${s.pages_found} encontradas</span>
          ${s.pages_error>0?`<span style="color:var(--danger)">❌ ${s.pages_error}</span>`:''}
          ${duration?`<span>⏱ ${duration}s</span>`:''}
          <span style="margin-left:auto;color:var(--text-3)">${date}</span>
        </div>`;
      list.appendChild(el);
    });
  } catch(err) { list.innerHTML=`<p class="empty-state" style="color:#dc2626">Erro: ${err.message}</p>`; }
}
