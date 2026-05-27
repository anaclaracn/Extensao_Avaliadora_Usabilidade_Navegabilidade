/* SCANNER.JS — Lógica da tela de varredura de sites */

// Tipos de elemento com ícone e label legível
const ELEMENT_TYPES = {
  link:      { icon: '🔗', label: 'Links' },
  button:    { icon: '🔘', label: 'Botões' },
  heading:   { icon: '📝', label: 'Títulos' },
  form:      { icon: '📋', label: 'Formulários' },
  image:     { icon: '🖼️', label: 'Imagens' },
  input:     { icon: '✏️', label: 'Campos' },
  nav:       { icon: '🧭', label: 'Navegações' },
  highlight: { icon: '✨', label: 'Destaques' },
};

// Estado local da varredura
let scanState = {
  scanning:    false,
  lastSnapshot: null,  // dados do último snapshot exibido
};

// ── Entry point ───────────────────────────────────────────────
function bindScanner() {
  console.log('[SCANNER] bindScanner() chamado');

  const btnScan = $('btn-scan');
  const btnHistory = $('btn-scan-history');
  const btnAgain = $('btn-scan-again');
  const btnBack = $('btn-back-scanner');

  console.log('[SCANNER] btn-scan:', btnScan);
  console.log('[SCANNER] btn-scan-history:', btnHistory);

  if (btnScan)    btnScan.addEventListener('click', startScan);
  if (btnHistory) btnHistory.addEventListener('click', loadScanHistory);
  if (btnAgain)   btnAgain.addEventListener('click', startScan);
  if (btnBack)    btnBack.addEventListener('click', () => {
    if (typeof enterAdmin === 'function') enterAdmin();
  });

  console.log('[SCANNER] bindScanner() concluído');
}

function enterScanner() {
  showScreen('scanner');
  let host = '—';
  try { host = new URL(S.currentSiteUrl).hostname; } catch(_) {}
  $('scanner-site-label').textContent = host;

  // Esconder resultados anteriores e mostrar botão
  hide('scan-progress-section');
  hide('scan-results-section');
  hide('scan-history-section');
  show('scan-action-section');
}

// ── Iniciar varredura ─────────────────────────────────────────
async function startScan() {
  if (scanState.scanning) return;
  scanState.scanning = true;

  const btn = $('btn-scan');
  btn.disabled = true;
  btn.innerHTML = '⏳ Varrendo...';

  hide('scan-results-section');
  show('scan-progress-section');
  resetProgress();

  try {
    // Passo 1: obter a aba ativa
    updateProgress(1, 'Acessando a página...');
    console.log('[SCANNER] Passo 1 — buscando aba ativa...');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('[SCANNER] Aba:', tab?.id, tab?.url);
    if (!tab?.id) throw new Error('Não foi possível acessar a aba atual.');

    // Passo 2: injetar o scanner na página e executar
    updateProgress(2, 'Varrendo elementos do DOM...');
    console.log('[SCANNER] Passo 2 — injetando script na aba', tab.id);
    let results;
    try {
      results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files:  ['src/scripts/scanner.js'],
      });
      console.log('[SCANNER] executeScript retornou:', results);
    } catch (scriptErr) {
      console.error('[SCANNER] executeScript FALHOU:', scriptErr);
      throw new Error(`Falha ao injetar script: ${scriptErr.message}`);
    }

    const scanData = results?.[0]?.result;
    console.log('[SCANNER] Dados coletados:', scanData ? `${scanData.elements?.length} elementos` : 'NULO');
    if (!scanData) throw new Error('A varredura não retornou dados. Verifique se a página está carregada.');

    // Passo 3: enviar ao backend
    updateProgress(3, `Salvando ${scanData.elements.length} elementos...`);
    console.log('[SCANNER] Passo 3 — enviando para backend. URL:', S.backendUrl, '| Elementos:', scanData.elements.length);
    let res;
    try {
      res = await api('POST', '/snapshots', {
        url:           tab.url,
        meta:          scanData.meta,
        elements:      scanData.elements,
        researcher_id: S.loggedResearcher?.id || null,
      });
      console.log('[SCANNER] Backend respondeu:', res);
    } catch (apiErr) {
      console.error('[SCANNER] Chamada ao backend FALHOU:', apiErr);
      throw new Error(`Erro ao salvar no backend: ${apiErr.message}`);
    }

    // Passo 4: exibir resultado
    updateProgress(4, 'Concluído!');
    await new Promise(r => setTimeout(r, 600));

    scanState.lastSnapshot = { ...res.data, elements: scanData.elements };
    showScanResults(scanData, res);

  } catch (err) {
    console.error('[SCANNER] ERRO GERAL na varredura:', err);
    hide('scan-progress-section');
    showFeedback('scan-feedback', `Erro: ${err.message}`, true);
    show('scan-action-section');
  } finally {
    scanState.scanning = false;
    btn.disabled = false;
    btn.innerHTML = '🔍 Varrer site novamente';
  }
}

// ── Progress steps ────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Acessando a página' },
  { id: 2, label: 'Varrendo elementos do DOM' },
  { id: 3, label: 'Enviando dados ao backend' },
  { id: 4, label: 'Concluído' },
];

function resetProgress() {
  const container = $('progress-steps');
  container.innerHTML = '';
  STEPS.forEach(step => {
    const el = document.createElement('div');
    el.className = 'progress-step';
    el.id = `step-${step.id}`;
    el.innerHTML = `<span class="step-icon">○</span><span>${step.label}</span>`;
    container.appendChild(el);
  });
  $('progress-bar-fill').style.width = '0%';
}

function updateProgress(stepNum, label) {
  const pct = Math.round((stepNum / STEPS.length) * 100);
  $('progress-bar-fill').style.width = pct + '%';
  $('progress-label-text').textContent = label;

  STEPS.forEach(s => {
    const el = $(`step-${s.id}`);
    if (!el) return;
    if (s.id < stepNum) {
      el.className = 'progress-step done';
      el.querySelector('.step-icon').textContent = '✓';
    } else if (s.id === stepNum) {
      el.className = 'progress-step active';
      el.querySelector('.step-icon').textContent = '▶';
    }
  });
}

// ── Mostrar resultados ────────────────────────────────────────
function showScanResults(scanData, apiRes) {
  hide('scan-progress-section');
  hide('scan-action-section');
  show('scan-results-section');

  // Resumo numérico
  const countByType = {};
  scanData.elements.forEach(el => {
    countByType[el.type] = (countByType[el.type] || 0) + 1;
  });

  $('sr-links').textContent    = countByType.link    || 0;
  $('sr-buttons').textContent  = countByType.button  || 0;
  $('sr-headings').textContent = countByType.heading || 0;
  $('sr-forms').textContent    = countByType.form    || 0;
  $('sr-images').textContent   = countByType.image   || 0;
  $('sr-total').textContent    = scanData.elements.length;

  // Grupos de elementos colapsáveis
  const groupsContainer = $('scan-element-groups');
  groupsContainer.innerHTML = '';

  Object.entries(ELEMENT_TYPES).forEach(([type, meta]) => {
    const items = scanData.elements.filter(e => e.type === type);
    if (!items.length) return;

    const group = document.createElement('div');
    group.className = 'element-group';

    const header = document.createElement('div');
    header.className = 'element-group-header';
    header.innerHTML = `
      <span class="element-group-icon">${meta.icon}</span>
      <span>${meta.label}</span>
      <span class="element-group-count">${items.length}</span>
      <span class="element-group-arrow" id="arrow-${type}">›</span>
    `;

    const list = document.createElement('div');
    list.className = 'element-list hidden';
    list.id = `group-list-${type}`;

    items.slice(0, 100).forEach(el => {
      const item = document.createElement('div');
      item.className = 'element-item';
      item.innerHTML = renderElementItem(el, type);
      list.appendChild(item);
    });

    if (items.length > 100) {
      const more = document.createElement('div');
      more.className = 'element-item';
      more.style.color = 'var(--text-3)';
      more.textContent = `... e mais ${items.length - 100} ${meta.label.toLowerCase()}`;
      list.appendChild(more);
    }

    header.addEventListener('click', () => {
      const isOpen = !list.classList.contains('hidden');
      list.classList.toggle('hidden', isOpen);
      $(`arrow-${type}`).classList.toggle('open', !isOpen);
    });

    group.appendChild(header);
    group.appendChild(list);
    groupsContainer.appendChild(group);
  });
}

function renderElementItem(el, type) {
  const text = el.text || '(sem texto)';

  if (type === 'link') {
    const badge = el.is_external
      ? '<span class="element-item-badge badge-external">externo</span>'
      : '<span class="element-item-badge badge-internal">interno</span>';
    return `
      <div class="element-item-text">${escHtml(text)} ${badge}</div>
      <div class="element-item-meta">${escHtml(el.href || '')}</div>
    `;
  }

  if (type === 'heading') {
    const lvl = el.extra?.level || '?';
    const badge = `<span class="element-item-badge badge-h${lvl <= 2 ? lvl : ''}" style="background:#f3e8ff;color:#7c3aed">H${lvl}</span>`;
    return `<div class="element-item-text">${escHtml(text)} ${badge}</div>`;
  }

  if (type === 'form') {
    return `
      <div class="element-item-text">${escHtml(el.element_id || el.text || 'Formulário')}</div>
      <div class="element-item-meta">${el.extra?.field_count || 0} campos · ${el.extra?.method?.toUpperCase() || 'GET'} ${escHtml(el.extra?.action || '')}</div>
    `;
  }

  if (type === 'image') {
    return `
      <div class="element-item-text">${escHtml(el.extra?.alt || '(sem alt)')}</div>
      <div class="element-item-meta">${escHtml((el.extra?.src || '').slice(0, 80))}</div>
    `;
  }

  if (type === 'nav') {
    return `
      <div class="element-item-text">${escHtml(text || 'nav')}</div>
      <div class="element-item-meta">${el.extra?.link_count || 0} links internos</div>
    `;
  }

  return `<div class="element-item-text">${escHtml(text)}</div>`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ── Histórico de varreduras ───────────────────────────────────
async function loadScanHistory() {
  show('scan-history-section');
  const list = $('snapshot-history-list');
  list.innerHTML = '<p class="empty-state">Carregando...</p>';

  try {
    const siteParam = encodeURIComponent(S.currentSiteUrl || '');
    const res = await api('GET', `/snapshots?site_url=${siteParam}`);
    const snaps = res.data || [];

    if (!snaps.length) {
      list.innerHTML = '<p class="empty-state">Nenhuma varredura registrada para este site.</p>';
      return;
    }

    list.innerHTML = '';
    snaps.forEach(snap => {
      const date = new Date(snap.scanned_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      const el = document.createElement('div');
      el.className = 'snapshot-item';
      el.innerHTML = `
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:var(--text);margin-bottom:3px">${escHtml(snap.url.replace(/^https?:\/\//, '').slice(0, 50))}</div>
          <div class="snapshot-counts">
            <span class="snapshot-tag">🔗 ${snap.total_links}</span>
            <span class="snapshot-tag">🔘 ${snap.total_buttons}</span>
            <span class="snapshot-tag">📝 ${snap.total_headings}</span>
            <span class="snapshot-tag">📋 ${snap.total_forms}</span>
            <span class="snapshot-tag">🖼️ ${snap.total_images}</span>
          </div>
        </div>
        <div class="snapshot-date">${date}</div>
      `;
      list.appendChild(el);
    });
  } catch(err) {
    list.innerHTML = `<p class="empty-state" style="color:#dc2626">Erro: ${err.message}</p>`;
  }
}
