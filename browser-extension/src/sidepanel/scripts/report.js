/* ============================================================
   REPORT.JS — Tela de relatório de desempenho de um teste
   ARQUIVO NOVO — salvar em:
   browser-extension/src/sidepanel/scripts/report.js
   ============================================================ */

let reportState = {
  testId:   null,
  testName: null,
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

  $('report-aggregate-list').innerHTML   = '<p class="empty-state">Carregando...</p>';
  $('report-participants-list').innerHTML = '<p class="empty-state">Carregando...</p>';

  await Promise.all([
    loadAggregateReport(testId),
    loadParticipantBreakdown(testId),
  ]);
}

// ── Resumo agregado (médias por tarefa) ───────────────────────
async function loadAggregateReport(testId) {
  try {
    const res  = await api('GET', `/metrics/test/${testId}/full-report`);
    const data = res.data;

    // Cruzar completion rate + time on task + click efficiency
    // (todas vêm indexadas por tarefa, na mesma ordem)
    const completion = data.effectiveness?.completionRate || [];
    const time        = data.efficiency?.timeOnTask || [];
    const lostness     = data.navigability?.lostness || [];

    const timeByTask = {};
    time.forEach(t => { timeByTask[t.id] = t; });
    const lostnessByTask = {};
    lostness.forEach(t => { lostnessByTask[t.task_id] = t; });

    const list = $('report-aggregate-list');
    list.innerHTML = '';

    if (!completion.length) {
      list.innerHTML = '<p class="empty-state">Nenhum resultado registrado ainda para este teste.</p>';
      return;
    }

    completion.forEach((task, i) => {
      const t  = timeByTask[task.id] || {};
      const ls = lostnessByTask[task.id];

      const el = document.createElement('div');
      el.className = 'report-task-card';
      el.innerHTML = `
        <div class="report-task-header">
          <span class="report-task-num">#${i + 1}</span>
          <span class="report-task-desc">${escHtmlReport(task.description)}</span>
        </div>
        <div class="report-metric-row">
          <div class="report-metric">
            <span class="report-metric-val">${task.completion_rate_pct ?? '—'}%</span>
            <span class="report-metric-lbl">conclusão</span>
          </div>
          <div class="report-metric">
            <span class="report-metric-val">${task.total_attempts ?? 0}</span>
            <span class="report-metric-lbl">tentativas</span>
          </div>
          <div class="report-metric">
            <span class="report-metric-val">${t.avg_duration_seconds != null ? fmtSecReport(t.avg_duration_seconds) : '—'}</span>
            <span class="report-metric-lbl">tempo médio</span>
          </div>
          <div class="report-metric">
            <span class="report-metric-val">${ls ? ls.avg_lostness_score : '—'}</span>
            <span class="report-metric-lbl">lostness</span>
          </div>
        </div>
      `;
      list.appendChild(el);
    });

  } catch (err) {
    $('report-aggregate-list').innerHTML =
      `<p class="empty-state" style="color:#dc2626">Erro ao carregar resumo: ${err.message}</p>`;
  }
}

// ── Tabela individual por participante ────────────────────────
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
      const totalClicks  = p.tasks.reduce((a, t) => a + (t.clicks || 0), 0);

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
    $('report-participants-list').innerHTML =
      `<p class="empty-state" style="color:#dc2626">Erro ao carregar participantes: ${err.message}</p>`;
  }
}

// ── Helpers locais ─────────────────────────────────────────────
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
