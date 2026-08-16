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

  ['report-effectiveness-list','report-efficiency-list','report-navigability-list',
   'report-structure-list','report-participants-list'].forEach(id => {
    $(id).innerHTML = '<p class="empty-state">Carregando...</p>';
  });

  // Buscar site_id do teste para as métricas de clique
  try {
    const testRes = await api('GET', `/tests/${testId}`);
    reportState.siteId = testRes.data?.site_id || null;
  } catch(_) {}

  await Promise.all([
    loadEffectivenessAndEfficiency(testId),
    loadNavigability(testId),
    loadStructuralMetrics(),
    loadDemographics(testId),
    loadHoverTime(testId),
    loadScrollDepth(testId),
    loadClickMetrics(reportState.siteId),
    loadParticipantBreakdown(testId),
    loadSus(reportState.siteId),
  ]);
}

async function loadClickMetrics(siteId) {
  const niList   = $('report-noninteractive-list');
  const densGrid = $('report-density-grid');

  if (!siteId) {
    if (niList)   niList.innerHTML   = '<p class="empty-state">site_id não disponível.</p>';
    if (densGrid) densGrid.innerHTML = '<p class="empty-state">site_id não disponível.</p>';
    return;
  }

  try {
    const [niRes, densRes] = await Promise.all([
      api('GET', `/metrics/site/${siteId}/non-interactive-clicks`),
      api('GET', `/metrics/site/${siteId}/click-density`),
    ]);

    // ── Cliques em Elementos Não-Interativos ──────────────
    const ni = niRes.data;
    if (niList) {
      if (!ni || ni.total_clicks === 0) {
        niList.innerHTML = '<p class="empty-state">Nenhum clique registrado ainda.</p>';
      } else {
        niList.innerHTML = `
          <div class="report-structure-grid">
            <div class="report-struct-box">
              <span class="report-struct-val">${ni.non_interactive_clicks ?? 0}</span>
              <span class="report-struct-lbl">cliques não-interativos</span>
            </div>
            <div class="report-struct-box">
              <span class="report-struct-val">${ni.total_clicks ?? 0}</span>
              <span class="report-struct-lbl">total de cliques</span>
            </div>
            <div class="report-struct-box">
              <span class="report-struct-val">${fmtPctReport(ni.non_interactive_pct)}</span>
              <span class="report-struct-lbl">% não-interativos</span>
            </div>
          </div>
        `;
      }
    }

    // ── Densidade de Cliques por Quadrante ────────────────
    const grid = densRes.data?.grid;
    if (densGrid) {
      if (!grid) {
        densGrid.innerHTML = '<p class="empty-state">Nenhum dado de clique registrado ainda.</p>';
      } else {
        const max = Math.max(...grid.flat(), 1);
        densGrid.innerHTML = grid.map(row =>
          `<div class="density-row">${row.map(val => {
            const pct = Math.round((val / max) * 100);
            return `<div class="density-cell" style="--pct:${pct}%" title="${val} cliques">${val > 0 ? val : ''}</div>`;
          }).join('')}</div>`
        ).join('');
      }
    }

  } catch (err) {
    if (niList)   niList.innerHTML   = errBoxReport(err.message);
    if (densGrid) densGrid.innerHTML = errBoxReport(err.message);
  }
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
    // Buscar site_id para as métricas de clique
    const siteId = reportState.siteId;

    const requests = [
      api('GET', `/metrics/test/${testId}/lostness`),
      api('GET', `/metrics/test/${testId}/backtrack`),
      api('GET', `/metrics/test/${testId}/page-depth`),
      api('GET', `/metrics/test/${testId}/scroll-depth`),
    ];
    requests.push(api('GET', `/metrics/test/${testId}/non-interactive-clicks`));

    const results = await Promise.all(requests);
    const [lostRes, backRes, depthRes, scrollRes, niRes] = results;

    const lostness  = lostRes.data  || [];
    const backtrack  = backRes.data  || [];
    const depth      = depthRes.data || [];
    const scrollData = scrollRes.data || [];
    const ni         = niRes?.data;

    const backByTask   = {}; backtrack.forEach(t => { backByTask[t.task_id]   = t; });
    const lostByTask   = {}; lostness.forEach(t  => { lostByTask[t.task_id]   = t; });
    const scrollByTask = {}; scrollData.forEach(t => { scrollByTask[t.task_id] = t; });

    const niData   = niRes?.data || [];
    const niByTask = {};
    niData.forEach(t => { niByTask[t.task_id] = t; });

    const list = $('report-navigability-list');
    list.innerHTML = '';

    if (!depth.length) {
      list.innerHTML = '<p class="empty-state">Nenhum resultado registrado ainda.</p>';
      return;
    }

    let hasNotApplicable = false;

    depth.forEach((task, i) => {
      const ls = lostByTask[task.task_id];
      const bt = backByTask[task.task_id];

      let lostnessVal = '—';
      if (ls && !ls.not_applicable && ls.avg_lostness_score != null) {
        lostnessVal = ls.avg_lostness_score;
      } else if (ls && ls.interpretation?.includes('Não aplicável')) {
        lostnessVal = 'N/A';
        hasNotApplicable = true;
      }

      const sd = scrollByTask[task.task_id];
      const scrollVal = sd?.avg_scroll_depth_pct != null
        ? `${sd.avg_scroll_depth_pct}%`
        : '—';

      list.appendChild(metricCardReport(i, task.description, [
        { val: task.avg_page_depth ?? '—',                       lbl: 'páginas visitadas' },
        { val: fmtPctReport(task.pct_within_3_pages),            lbl: '≤3 páginas' },
        { val: lostnessVal,                                      lbl: 'lostness' },
        { val: bt ? fmtPctReport(bt.avg_backtrack_rate_pct) : '—', lbl: 'retrocesso' },
        { val: niByTask[task.task_id]?.avg_non_interactive_pct != null
          ? fmtPctReport(niByTask[task.task_id].avg_non_interactive_pct)
          : '—',
        lbl: 'cliques não-interativos' },
        { val: scrollVal,                                        lbl: 'scroll médio' },
      ]));
    });

    if (hasNotApplicable) {
      const note = document.createElement('p');
      note.className = 'report-note';
      note.textContent = '* N/A — Lostness não aplicável para tarefas de página única.';
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

  // SUS (System Usability Scale) — média das respostas por pergunta
  async function loadSus(siteId) {
    const container = $('report-sus-container');
    if (!container) return;
    if (!siteId) {
      container.innerHTML = '<p class="empty-state">site_id não disponível.</p>';
      return;
    }

    try {
      const res  = await api('GET', `/metrics/site/${siteId}/sus-questions`);
      const data = res.data;

      if (!data) {
        container.innerHTML = '<p class="empty-state">Nenhuma resposta SUS registrada ainda.</p>';
        return;
      }

      const scoreColor = data.avg_score >= 80.3 ? 'var(--teal)' :
                        data.avg_score >= 68    ? 'var(--primary)' :
                        data.avg_score >= 51    ? 'var(--amber)' : 'var(--danger)';

      container.innerHTML = `
        <div class="sus-report-header">
          <div class="sus-score-box">
            <span class="sus-score-val" style="color:${scoreColor}">${data.avg_score}</span>
            <span class="sus-score-lbl">score médio</span>
          </div>
          <div class="sus-score-box">
            <span class="sus-score-val" style="color:${scoreColor}">${data.classification}</span>
            <span class="sus-score-lbl">classificação</span>
          </div>
          <div class="sus-score-box">
            <span class="sus-score-val">${data.total_responses}</span>
            <span class="sus-score-lbl">respostas</span>
          </div>
        </div>
        <div class="sus-questions-report">
          ${data.questions.map((q, i) => {
            const avg = parseFloat(q.avg);
            const pct = ((avg - 1) / 4) * 100; // escala 1-5 → 0-100%
            return `
              <div class="sus-q-row">
                <span class="sus-q-num">${i + 1}</span>
                <span class="sus-q-text">${escHtmlReport(q.text)}</span>
                <div class="sus-q-bar-track">
                  <div class="sus-q-bar-fill" style="width:${pct}%"></div>
                </div>
                <span class="sus-q-avg">${avg.toFixed(1)}</span>
              </div>
            `;
          }).join('')}
        </div>
        <p class="report-note" style="margin-top:8px">
          Escala de 1 (discordo totalmente) a 5 (concordo totalmente) · 
          Perguntas pares são negativas (score mais baixo = melhor)
        </p>
      `;
    } catch (err) {
      container.innerHTML = errBoxReport(err.message);
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

async function loadDemographics(testId) {
  const list = $('report-demographics-list');
  try {
    const res  = await api('GET', `/metrics/test/${testId}/demographics`);
    const data = res.data;

    list.innerHTML = '';

    const groups = [
      { key: 'by_age_range',       title: 'Por faixa etária',  labelField: 'age_range' },
      { key: 'by_gender',          title: 'Por gênero',        labelField: 'gender' },
      { key: 'by_education_level', title: 'Por escolaridade',  labelField: 'education_level' },
    ];

    let hasAnyData = false;

    groups.forEach(group => {
      const rows = data[group.key] || [];
      if (!rows.length) return;
      hasAnyData = true;

      const groupEl = document.createElement('div');
      groupEl.className = 'demo-group';
      groupEl.innerHTML = `<p class="demo-group-title">${group.title}</p>`;

      const barsContainer = document.createElement('div');
      barsContainer.className = 'demo-bars';

      rows.forEach(row => {
        const label = row[group.labelField] || '—';
        const pct   = row.completion_rate_pct ?? 0;
        const n     = row.total_attempts ?? 0;

        const barRow = document.createElement('div');
        barRow.className = 'demo-bar-row';
        barRow.innerHTML = `
          <span class="demo-bar-label">${escHtmlReport(label)}</span>
          <div class="demo-bar-track">
            <div class="demo-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="demo-bar-pct">${pct}%</span>
          <span class="demo-bar-n">(n=${n})</span>
        `;
        barsContainer.appendChild(barRow);
      });

      groupEl.appendChild(barsContainer);
      list.appendChild(groupEl);
    });

    if (!hasAnyData) {
      list.innerHTML = '<p class="empty-state">Nenhum dado demográfico disponível ainda.</p>';
    }

  } catch (err) {
    list.innerHTML = errBoxReport(err.message);
  }
}

async function loadHoverTime(testId) {
  const list = $('report-hover-list');
  try {
    const res  = await api('GET', `/metrics/test/${testId}/hover-time`);
    const rows = res.data || [];

    list.innerHTML = '';

    if (!rows.length) {
      list.innerHTML = '<p class="empty-state">Nenhum dado de hover registrado ainda.</p>';
      return;
    }

    rows.forEach(row => {
      const elementLabel = row.element_id
        ? `#${row.element_id}`
        : (row.class ? `.${String(row.class).split(' ')[0]}` : `<${row.tag}>`);

      const elementText = row.element_text
        ? `"${String(row.element_text).slice(0, 40)}${row.element_text.length > 40 ? '…' : ''}"`
        : null;

      const el = document.createElement('div');
      el.className = 'hover-item';
      el.innerHTML = `
        <div class="hover-item-tag">${escHtmlReport(row.tag || '?')}</div>
        <div class="hover-item-info">
          <span class="hover-item-label">${escHtmlReport(elementLabel)}</span>
          ${elementText ? `<span class="hover-item-text">${escHtmlReport(elementText)}</span>` : ''}
          <span class="hover-item-meta">${row.hover_count}x observado</span>
        </div>
        <div class="hover-item-stats">
          <span class="hover-item-avg">${fmtMsReport(row.avg_hover_ms)}</span>
          <span class="hover-item-range">min ${fmtMsReport(row.min_hover_ms)} · máx ${fmtMsReport(row.max_hover_ms)}</span>
        </div>
      `;
      list.appendChild(el);
    });

  } catch (err) {
    list.innerHTML = errBoxReport(err.message);
  }
}

// Helper: formatar milissegundos como segundos quando >= 1000
function fmtMsReport(ms) {
  ms = Number(ms);
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

async function loadScrollDepth(testId) {
  const list = $('report-scroll-list');
  try {
    const res  = await api('GET', `/metrics/test/${testId}/scroll-depth`);
    const rows = res.data || [];

    list.innerHTML = '';

    if (!rows.length) {
      list.innerHTML = '<p class="empty-state">Nenhum dado de scroll registrado ainda.</p>';
      return;
    }

    rows.forEach((task, i) => {
      list.appendChild(metricCardReport(i, task.description, [
        { val: task.avg_scroll_depth_pct != null ? `${task.avg_scroll_depth_pct}%` : '—', lbl: 'média' },
        { val: task.min_scroll_depth_pct != null ? `${task.min_scroll_depth_pct}%` : '—', lbl: 'mínimo' },
        { val: task.max_scroll_depth_pct != null ? `${task.max_scroll_depth_pct}%` : '—', lbl: 'máximo' },
        { val: task.sample_size ?? 0, lbl: 'amostras' },
      ]));
    });
  } catch (err) {
    list.innerHTML = errBoxReport(err.message);
  }
}