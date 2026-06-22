/* ============================================================
   REPORT.JS — Tela de relatório de desempenho de um teste
   v2: agora exibe TODAS as 15 métricas (eficácia, eficiência,
   navegabilidade e estrutura do site via última varredura)
   ============================================================ */

let reportState = {
  testId:   null,
  testName: null,
  siteId:   null,
};

// ── Entry point ───────────────────────────────────────────────
function bindReport() {
  $('btn-back-report').addEventListener('click', () => {
    if (typeof enterAdmin === 'function') enterAdmin();
  });
}

/**
 * Chamado pelo botão "📊 Relatório" na lista de testes do painel admin.
 */
async function enterReportScreen(testId, testName) {
  reportState.testId   = testId;
  reportState.testName = testName;

  showScreen('report');
  $('report-test-name').textContent = testName || '—';

  // Resetar todas as seções para "carregando"
  ['report-effectiveness-list','report-efficiency-list','report-navigability-list',
   'report-structure-list','report-participants-list'].forEach(id => {
    $(id).innerHTML = '<p class="empty-state">Carregando...</p>';
  });

  await Promise.all([
    loadEffectivenessAndEfficiency(testId),
    loadNavigability(testId),
    loadStructuralMetrics(),
    loadParticipantBreakdown(testId),
  ]);
}

// ════════════════════════════════════════════════════════════
// DIMENSÃO 1 + 2 — Eficácia e Eficiência (vêm do full-report)
// ════════════════════════════════════════════════════════════
async function loadEffectivenessAndEfficiency(testId) {
  try {
    const res  = await api('GET', `/metrics/test/${testId}/full-report`);
    const data = res.data;

    renderEffectiveness(data.effectiveness);
    renderEfficiency(data.efficiency);

  } catch (err) {
    $('report-effectiveness-list').innerHTML = errBoxReport(err.message);
    $('report-efficiency-list').innerHTML    = errBoxReport(err.message);
  }
}

function renderEffectiveness(eff) {
  const completion = eff?.completionRate || [];
  const errorRate    = eff?.errorRate      || [];

  const errByTask = {}; errorRate.forEach(t => { errByTask[t.id] = t; });

  const list = $('report-effectiveness-list');
  list.innerHTML = '';

  if (!completion.length) {
    list.innerHTML = '<p class="empty-state">Nenhum resultado registrado ainda.</p>';
    return;
  }

  completion.forEach((task, i) => {
    const er = errByTask[task.id] || {};

    list.appendChild(metricCardReport(i, task.description, [
      { val: fmtPctReport(task.completion_rate_pct), lbl: 'conclusão' },
      { val: task.total_attempts ?? 0,                lbl: 'tentativas' },
      { val: fmtPctReport(er.error_rate_pct),         lbl: 'taxa de erro' },
    ]));
  });
}

function renderEfficiency(eff) {
  const time   = eff?.timeOnTask      || [];
  const clicks  = eff?.clickEfficiency  || [];

  const clicksByTask = {}; clicks.forEach(t => { clicksByTask[t.id] = t; });

  const list = $('report-efficiency-list');
  list.innerHTML = '';

  if (!time.length) {
    list.innerHTML = '<p class="empty-state">Nenhum resultado registrado ainda.</p>';
    return;
  }

  time.forEach((task, i) => {
    const ce = clicksByTask[task.id] || {};

    list.appendChild(metricCardReport(i, task.description, [
      { val: task.avg_duration_seconds != null ? fmtSecReport(task.avg_duration_seconds) : '—', lbl: 'tempo médio' },
      { val: task.median_duration_seconds != null ? fmtSecReport(task.median_duration_seconds) : '—', lbl: 'mediana' },
      { val: ce.click_efficiency_ratio ?? '—', lbl: 'eficiência cliques' },
    ]));
  });
}

// ════════════════════════════════════════════════════════════
// DIMENSÃO 3 — Navegabilidade
// ════════════════════════════════════════════════════════════
async function loadNavigability(testId) {
  try {
    const [lostRes, backRes, depthRes] = await Promise.all([
      api('GET', `/metrics/test/${testId}/lostness`),
      api('GET', `/metrics/test/${testId}/backtrack`),
      api('GET', `/metrics/test/${testId}/page-depth`),
    ]);

    const lostness  = lostRes.data  || [];
    const backtrack  = backRes.data  || [];
    const depth      = depthRes.data || [];

    const backByTask = {};   backtrack.forEach(t => { backByTask[t.task_id] = t; });
    const lostByTask = {};   lostness.forEach(t => { lostByTask[t.task_id] = t; });

    const list = $('report-navigability-list');
    list.innerHTML = '';

    if (!depth.length) { list.innerHTML = '<p class="empty-state">Nenhum resultado registrado ainda.</p>'; return; }

    let hasNotApplicable = false;

    depth.forEach((task, i) => {
      const ls = lostByTask[task.task_id];
      const bt = backByTask[task.task_id];

      // Lostness: distinguir "não aplicável" de "sem dados"
      let lostnessVal = '—';
      if (ls && !ls.not_applicable && ls.avg_lostness_score != null) {
        lostnessVal = ls.avg_lostness_score;
      } else if (ls && ls.interpretation?.includes('Não aplicável')) {
        lostnessVal = 'N/A';
        hasNotApplicable = true;
      }

      list.appendChild(metricCardReport(i, task.description, [
        { val: task.avg_page_depth ?? '—', lbl: 'páginas visitadas' },
        { val: fmtPctReport(task.pct_within_3_pages), lbl: '≤3 páginas' },
        { val: lostnessVal, lbl: 'lostness' },
        { val: bt ? fmtPctReport(bt.avg_backtrack_rate_pct) : '—', lbl: 'retrocesso' },
      ]));
    });

    if (hasNotApplicable) {
      const note = document.createElement('p');
      note.className = 'report-note';
      note.innerHTML = '<strong>N/A</strong> = Lostness não aplicável a tarefas de página única (defina "Páginas no caminho ótimo" maior que 1 ao criar a tarefa, se ela envolve navegar entre páginas).';
      list.appendChild(note);
    }

  } catch (err) {
    $('report-navigability-list').innerHTML = errBoxReport(err.message);
  }
}

// ════════════════════════════════════════════════════════════
// DIMENSÃO 4 — Estrutura do site (via última varredura)
// ════════════════════════════════════════════════════════════
async function loadStructuralMetrics() {
  const list = $('report-structure-list');
  try {
    // Buscar o snapshot mais recente do site atual
    const snapRes = await api('GET', `/snapshots?site_url=${encodeURIComponent(S.currentSiteUrl || '')}`);
    const snapshots = snapRes.data || [];

    if (!snapshots.length) {
      list.innerHTML = '<p class="empty-state">Nenhuma varredura encontrada para este site.<br>Use "Varrer este site" no painel para habilitar estas métricas.</p>';
      return;
    }

    const snapshotId = snapshots[0].id; // mais recente
    const res = await api('GET', `/metrics/snapshot/${snapshotId}/full-report`);
    const d   = res.data;

    list.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'report-structure-grid';
    grid.innerHTML = `
      <div class="report-struct-box">
        <span class="report-struct-val">${fmtPctReport(d.density?.interactive_density_pct)}</span>
        <span class="report-struct-lbl">elementos interativos</span>
      </div>
      <div class="report-struct-box">
        <span class="report-struct-val">${fmtPctReport(d.links?.pct_external)}</span>
        <span class="report-struct-lbl">links externos</span>
      </div>
      <div class="report-struct-box">
        <span class="report-struct-val">${fmtPctReport(d.contrast?.pct_compliant)}</span>
        <span class="report-struct-lbl">contraste WCAG ok</span>
      </div>
      <div class="report-struct-box">
        <span class="report-struct-val">${fmtPctReport(d.altCoverage?.pct_with_alt)}</span>
        <span class="report-struct-lbl">imagens com alt</span>
      </div>
    `;
    list.appendChild(grid);

    const meta = document.createElement('p');
    meta.className = 'report-note';
    meta.innerHTML = `Baseado na varredura de ${new Date(snapshots[0].scanned_at).toLocaleDateString('pt-BR')} · ${snapshots[0].url}`;
    list.appendChild(meta);

    // Se houver falhas de contraste, listar até 5 como exemplo
    if (d.contrast?.failures?.length) {
      const failBox = document.createElement('div');
      failBox.className = 'report-contrast-failures';
      failBox.innerHTML = `
        <p class="report-note" style="margin-bottom:6px"><strong>Elementos com contraste insuficiente:</strong></p>
        ${d.contrast.failures.slice(0, 5).map(f => `
          <div class="report-fail-item">
            <span>${escHtmlReport(f.text || f.type)}</span>
            <span class="report-fail-ratio">${f.contrast_ratio}:1</span>
          </div>
        `).join('')}
      `;
      list.appendChild(failBox);
    }

  } catch (err) {
    list.innerHTML = errBoxReport(err.message);
  }
}

// ════════════════════════════════════════════════════════════
// Participantes individuais
// ════════════════════════════════════════════════════════════
async function loadParticipantBreakdown(testId) {
  try {
    const res         = await api('GET', `/metrics/test/${testId}/participant-breakdown`);
    const participants = res.data || [];

    $('report-participant-count').textContent = participants.length;

    const list = $('report-participants-list');
    list.innerHTML = '';

    if (!participants.length) {
      list.innerHTML = '<p class="empty-state">Nenhum participante realizou este teste ainda.</p>';
      return;
    }

    participants.forEach(p => {
      const totalTasks   = p.tasks.length;
      const successCount = p.tasks.filter(t => t.success).length;

      const card = document.createElement('div');
      card.className = 'report-participant-card';

      const header = document.createElement('div');
      header.className = 'report-participant-header';
      header.innerHTML = `
        <div class="report-participant-info">
          <span class="report-participant-id">Sessão #${p.session_id}</span>
          <span class="report-participant-demo">${p.user.age ? p.user.age + ' anos' : '—'} · ${escHtmlReport(p.user.gender || '—')}</span>
        </div>
        <div class="report-participant-summary">
          <span class="report-pill ${successCount === totalTasks ? 'pill-success' : 'pill-partial'}">
            ${successCount}/${totalTasks} concluídas
          </span>
          <span class="report-expand-arrow">›</span>
        </div>
      `;

      const detail = document.createElement('div');
      detail.className = 'report-participant-detail hidden';
      detail.innerHTML = p.tasks.map(t => `
        <div class="report-detail-row">
          <span class="report-detail-task">${escHtmlReport(t.description)}</span>
          <span class="report-detail-stat">${t.success ? '✅' : '❌'}</span>
          <span class="report-detail-stat">⏱ ${t.duration_seconds != null ? fmtSecReport(t.duration_seconds) : '—'}</span>
          <span class="report-detail-stat">🖱 ${t.clicks ?? '—'}</span>
        </div>
      `).join('');

      header.addEventListener('click', () => {
        const isOpen = !detail.classList.contains('hidden');
        detail.classList.toggle('hidden', isOpen);
        header.querySelector('.report-expand-arrow').classList.toggle('open', !isOpen);
      });

      card.appendChild(header);
      card.appendChild(detail);
      list.appendChild(card);
    });

  } catch (err) {
    $('report-participants-list').innerHTML = errBoxReport(err.message);
  }
}

// ── Helpers de renderização ─────────────────────────────────────
function metricCardReport(index, description, metrics) {
  const el = document.createElement('div');
  el.className = 'report-task-card';
  el.innerHTML = `
    <div class="report-task-header">
      <span class="report-task-num">#${index + 1}</span>
      <span class="report-task-desc">${escHtmlReport(description)}</span>
    </div>
    <div class="report-metric-row">
      ${metrics.map(m => `
        <div class="report-metric">
          <span class="report-metric-val">${m.val}</span>
          <span class="report-metric-lbl">${m.lbl}</span>
        </div>
      `).join('')}
    </div>
  `;
  return el;
}

function errBoxReport(msg) {
  return `<p class="empty-state" style="color:#dc2626">Erro: ${escHtmlReport(msg)}</p>`;
}

function escHtmlReport(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtSecReport(s) {
  s = Math.round(s);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function fmtPctReport(v) {
  return v != null ? `${v}%` : '—';
}
