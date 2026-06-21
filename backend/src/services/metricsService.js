// ============================================================
// metricsService.js — Cálculo de métricas de usabilidade e navegabilidade
//
// Organizado em 4 dimensões (baseado em ISO 9241-11 + literatura de IHC):
//   1. Eficácia      (Effectiveness)
//   2. Eficiência     (Efficiency)
//   3. Orientação     (Navigability / Lostness)
//   4. Estrutura      (análise estática do site via varredura)
// ============================================================

const db = require('../database/connection');

class MetricsService {

  // ════════════════════════════════════════════════════════════
  // DIMENSÃO 1 — EFICÁCIA (Effectiveness)
  // ════════════════════════════════════════════════════════════

  /**
   * 1.1 — Taxa de Conclusão de Tarefas (Task Completion Rate)
   * TCR = (tarefas com sucesso / total de tentativas) × 100
   * Referência: ISO 9241-11; MeasuringU benchmark ~78%
   */
  static async taskCompletionRate(testId) {
    const result = await db.query(
      `SELECT
         t.id, t.description, t.order_index,
         COUNT(tr.id)                                          AS total_attempts,
         SUM(CASE WHEN tr.success THEN 1 ELSE 0 END)            AS total_success,
         ROUND(
           100.0 * SUM(CASE WHEN tr.success THEN 1 ELSE 0 END) / NULLIF(COUNT(tr.id), 0),
           2
         )                                                      AS completion_rate_pct
       FROM tasks t
       LEFT JOIN task_results tr ON tr.task_id = t.id
       WHERE t.test_id = $1
       GROUP BY t.id, t.description, t.order_index
       ORDER BY t.order_index ASC`,
      [testId]
    );
    return result.rows;
  }

  /**
   * 1.2 — Taxa de Erro por Tarefa
   * Proporção de tentativas que resultaram em falha (success = false)
   * Referência: Userlytics — Error Rate = (erros / tentativas) × 100
   */
  static async errorRate(testId) {
    const result = await db.query(
      `SELECT
         t.id, t.description,
         COUNT(tr.id)                                       AS total_attempts,
         SUM(CASE WHEN NOT tr.success THEN 1 ELSE 0 END)    AS total_errors,
         ROUND(
           100.0 * SUM(CASE WHEN NOT tr.success THEN 1 ELSE 0 END) / NULLIF(COUNT(tr.id), 0),
           2
         )                                                   AS error_rate_pct
       FROM tasks t
       LEFT JOIN task_results tr ON tr.task_id = t.id
       WHERE t.test_id = $1
       GROUP BY t.id, t.description
       ORDER BY error_rate_pct DESC NULLS LAST`,
      [testId]
    );
    return result.rows;
  }

  /**
   * 1.3 — Taxa de Abandono de Tarefa
   * Tarefas iniciadas mas nunca concluídas com sucesso
   * (aqui contabilizamos task_results com success=false como abandono,
   *  já que o fluxo da extensão só grava resultado ao finalizar/desistir)
   */
  static async abandonmentRate(testId) {
    const result = await db.query(
      `SELECT
         t.id, t.description,
         COUNT(tr.id)                                     AS total_attempts,
         SUM(CASE WHEN NOT tr.success THEN 1 ELSE 0 END)  AS total_abandoned,
         ROUND(
           100.0 * SUM(CASE WHEN NOT tr.success THEN 1 ELSE 0 END) / NULLIF(COUNT(tr.id), 0),
           2
         )                                                 AS abandonment_rate_pct
       FROM tasks t
       LEFT JOIN task_results tr ON tr.task_id = t.id
       WHERE t.test_id = $1
       GROUP BY t.id, t.description
       ORDER BY abandonment_rate_pct DESC NULLS LAST`,
      [testId]
    );
    return result.rows;
  }

  // ════════════════════════════════════════════════════════════
  // DIMENSÃO 2 — EFICIÊNCIA (Efficiency)
  // ════════════════════════════════════════════════════════════

  /**
   * 2.1 — Tempo por Tarefa (Time on Task)
   * Retorna média, mediana e desvio padrão do tempo de conclusão
   * Referência: ISO 9241-11 — eficiência via tempo de execução
   */
  static async timeOnTask(testId) {
    const result = await db.query(
      `SELECT
         t.id, t.description,
         COUNT(tr.id) AS total_attempts,
         ROUND(AVG(EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at))), 2)
           AS avg_duration_seconds,
         ROUND(
           (PERCENTILE_CONT(0.5) WITHIN GROUP (
             ORDER BY EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at))
           ))::numeric, 2
         ) AS median_duration_seconds,
         ROUND(STDDEV(EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at)))::numeric, 2)
           AS stddev_duration_seconds,
         ROUND(AVG(
           CASE WHEN tr.success
             THEN EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at))
           END
         )::numeric, 2) AS avg_duration_success_seconds,
         ROUND(AVG(
           CASE WHEN NOT tr.success
             THEN EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at))
           END
         )::numeric, 2) AS avg_duration_failure_seconds
       FROM tasks t
       LEFT JOIN task_results tr ON tr.task_id = t.id
       WHERE t.test_id = $1
       GROUP BY t.id, t.description
       ORDER BY t.order_index ASC NULLS LAST, t.id ASC`,
      [testId]
    );
    return result.rows;
  }

  /**
   * 2.2 — Eficiência de Cliques por Tarefa
   * Razão entre cliques mínimos esperados (definidos pelo pesquisador
   * em tasks.min_clicks) e cliques reais realizados.
   * Valor próximo de 1.0 = caminho quase ótimo; valores baixos = desperdício
   */
  static async clickEfficiency(testId) {
    const result = await db.query(
      `SELECT
         t.id, t.description, t.min_clicks,
         ROUND(AVG(tr.clicks)::numeric, 2)                       AS avg_clicks,
         MIN(tr.clicks)                                          AS min_clicks_observed,
         MAX(tr.clicks)                                          AS max_clicks_observed,
         CASE
           WHEN t.min_clicks IS NOT NULL AND AVG(tr.clicks) > 0
             THEN ROUND((t.min_clicks::numeric / AVG(tr.clicks)), 3)
           ELSE NULL
         END AS click_efficiency_ratio
       FROM tasks t
       LEFT JOIN task_results tr ON tr.task_id = t.id
       WHERE t.test_id = $1
       GROUP BY t.id, t.description, t.min_clicks
       ORDER BY t.order_index ASC NULLS LAST, t.id ASC`,
      [testId]
    );
    return result.rows;
  }

  /**
   * 2.3 — Taxa de Sucesso por Unidade de Tempo
   * Eficiência composta = TCR(%) / tempo médio em minutos
   * Referência: Common Industry Format (ISO 9241-11)
   * Permite comparar diferentes versões/testes de um mesmo site
   */
  static async successPerMinute(testId) {
    const result = await db.query(
      `SELECT
         t.id, t.description,
         ROUND(
           100.0 * SUM(CASE WHEN tr.success THEN 1 ELSE 0 END) / NULLIF(COUNT(tr.id), 0),
           2
         ) AS completion_rate_pct,
         ROUND(AVG(EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at))) / 60.0, 3)
           AS avg_duration_minutes,
         CASE
           WHEN AVG(EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at))) > 0
           THEN ROUND(
             (100.0 * SUM(CASE WHEN tr.success THEN 1 ELSE 0 END) / NULLIF(COUNT(tr.id), 0))
             / (AVG(EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at))) / 60.0),
             2
           )
           ELSE NULL
         END AS success_per_minute
       FROM tasks t
       LEFT JOIN task_results tr ON tr.task_id = t.id
       WHERE t.test_id = $1
       GROUP BY t.id, t.description
       ORDER BY t.order_index ASC NULLS LAST, t.id ASC`,
      [testId]
    );
    return result.rows;
  }

  // ════════════════════════════════════════════════════════════
  // DIMENSÃO 3 — ORIENTAÇÃO / NAVEGABILIDADE
  // ════════════════════════════════════════════════════════════

  /**
   * Helper interno: busca a sequência de URLs visitadas (eventos)
   * dentro da janela de tempo de uma tarefa específica
   */
  static async _getNavigationSequence(sessionId, taskStartedAt, taskFinishedAt) {
    const result = await db.query(
      `SELECT url, timestamp
       FROM events
       WHERE session_id = $1
         AND timestamp >= $2
         AND timestamp <= $3
         AND url IS NOT NULL
       ORDER BY timestamp ASC`,
      [sessionId, taskStartedAt, taskFinishedAt]
    );
    return result.rows.map(r => r.url);
  }

  /**
   * 3.1 — Índice de Desorientação (Lostness Score)
   * Fórmula de Smith (1996), validada por Gwizdka & Spence (2007):
   *   L = √( (R/S - 1)² + (N/S - 1)² )
   *   R = caminho ótimo (tasks.optimal_path_length, definido pelo pesquisador)
   *   S = páginas ÚNICAS visitadas durante a tarefa
   *   N = páginas TOTAIS visitadas (com repetição)
   *
   * L > 0.4 indica que o usuário esteve "perdido" durante a tarefa.
   * L próximo de 0 indica navegação direta e eficiente.
   */
  static async lostnessScore(testId) {
    // Buscar todas as tentativas de tarefas deste teste com sessão associada
    const attempts = await db.query(
      `SELECT tr.id, tr.task_id, tr.session_id, tr.started_at, tr.finished_at,
              t.description, t.optimal_path_length
       FROM task_results tr
       JOIN tasks t ON t.id = tr.task_id
       WHERE t.test_id = $1`,
      [testId]
    );

    const byTask = {};

    for (const attempt of attempts.rows) {
      if (!attempt.optimal_path_length) continue; // sem R definido, não calculável

      const urls = await MetricsService._getNavigationSequence(
        attempt.session_id, attempt.started_at, attempt.finished_at
      );

      const N = urls.length;
      const S = new Set(urls).size;
      const R = attempt.optimal_path_length;

      if (S === 0) continue; // sem navegação registrada

      const term1 = (R / S) - 1;
      const term2 = (N / S) - 1;
      const L = Math.sqrt(term1 * term1 + term2 * term2);

      if (!byTask[attempt.task_id]) {
        byTask[attempt.task_id] = {
          task_id: attempt.task_id,
          description: attempt.description,
          optimal_path_length: R,
          scores: [],
        };
      }
      byTask[attempt.task_id].scores.push(L);
    }

    return Object.values(byTask).map(t => {
      const avg = t.scores.reduce((a, b) => a + b, 0) / t.scores.length;
      const lostCount = t.scores.filter(s => s > 0.4).length;
      return {
        task_id: t.task_id,
        description: t.description,
        optimal_path_length: t.optimal_path_length,
        sample_size: t.scores.length,
        avg_lostness_score: Math.round(avg * 1000) / 1000,
        pct_users_lost: Math.round((lostCount / t.scores.length) * 10000) / 100,
        interpretation: avg > 0.4 ? 'Usuários geralmente perdidos' : 'Navegação geralmente direta',
      };
    });
  }

  /**
   * 3.2 — Taxa de Retrocesso (Backtrack Rate)
   * Conta quantas vezes, durante uma tarefa, o usuário voltou a uma
   * URL já visitada anteriormente na mesma sequência de navegação
   */
  static async backtrackRate(testId) {
    const attempts = await db.query(
      `SELECT tr.id, tr.task_id, tr.session_id, tr.started_at, tr.finished_at,
              t.description
       FROM task_results tr
       JOIN tasks t ON t.id = tr.task_id
       WHERE t.test_id = $1`,
      [testId]
    );

    const byTask = {};

    for (const attempt of attempts.rows) {
      const urls = await MetricsService._getNavigationSequence(
        attempt.session_id, attempt.started_at, attempt.finished_at
      );

      if (urls.length < 2) continue;

      let backtracks = 0;
      const seen = new Set([urls[0]]);
      for (let i = 1; i < urls.length; i++) {
        if (seen.has(urls[i])) backtracks++;
        seen.add(urls[i]);
      }

      const backtrackPct = (backtracks / urls.length) * 100;

      if (!byTask[attempt.task_id]) {
        byTask[attempt.task_id] = {
          task_id: attempt.task_id,
          description: attempt.description,
          samples: [],
        };
      }
      byTask[attempt.task_id].samples.push({ backtracks, total: urls.length, pct: backtrackPct });
    }

    return Object.values(byTask).map(t => {
      const avgPct = t.samples.reduce((a, s) => a + s.pct, 0) / t.samples.length;
      const totalBacktracks = t.samples.reduce((a, s) => a + s.backtracks, 0);
      return {
        task_id: t.task_id,
        description: t.description,
        sample_size: t.samples.length,
        total_backtracks: totalBacktracks,
        avg_backtrack_rate_pct: Math.round(avgPct * 100) / 100,
      };
    });
  }

  /**
   * 3.3 — Profundidade de Clique até o Objetivo (Click Depth)
   * Número de cliques (eventos tipo 'click') registrados até o momento
   * de conclusão da tarefa. Aproximação prática da "distância" percorrida.
   */
  static async clickDepth(testId) {
    const result = await db.query(
      `SELECT
         t.id AS task_id, t.description,
         ROUND(AVG(tr.clicks)::numeric, 2)  AS avg_click_depth,
         MIN(tr.clicks)                     AS min_click_depth,
         MAX(tr.clicks)                     AS max_click_depth,
         -- Regra dos 3 cliques: % de tentativas que ficaram dentro do limite
         ROUND(
           100.0 * SUM(CASE WHEN tr.clicks <= 3 THEN 1 ELSE 0 END) / NULLIF(COUNT(tr.id), 0),
           2
         ) AS pct_within_3_clicks
       FROM tasks t
       LEFT JOIN task_results tr ON tr.task_id = t.id
       WHERE t.test_id = $1
       GROUP BY t.id, t.description
       ORDER BY t.order_index ASC NULLS LAST, t.id ASC`,
      [testId]
    );
    return result.rows;
  }

  /**
   * 3.4 — Proporção de Cliques em Elementos Não Interativos
   * Cruza eventos de clique (events) com o inventário de elementos
   * capturado na varredura (site_elements), usando proximidade de
   * coordenadas X/Y para inferir em qual elemento catalogado o clique
   * provavelmente ocorreu.
   *
   * Tolerância de proximidade: 15px (ajustável)
   */
  static async nonInteractiveClicks(siteId, tolerancePx = 15) {
    // Pegar o snapshot mais recente do site para ter o inventário de elementos
    const snapRes = await db.query(
      `SELECT id FROM site_snapshots WHERE site_id = $1 ORDER BY scanned_at DESC LIMIT 1`,
      [siteId]
    );
    if (!snapRes.rows.length) {
      return { error: 'Nenhuma varredura encontrada para este site. Execute uma varredura primeiro.' };
    }
    const snapshotId = snapRes.rows[0].id;

    // Pegar todos os cliques registrados nas sessões deste site
    const clicksRes = await db.query(
      `SELECT e.id, e.x, e.y
       FROM events e
       JOIN sessions s ON s.id = e.session_id
       WHERE s.site_id = $1 AND e.type = 'click' AND e.x IS NOT NULL AND e.y IS NOT NULL`,
      [siteId]
    );

    // Pegar elementos interativos do snapshot (links e botões)
    const elementsRes = await db.query(
      `SELECT x, y, type FROM site_elements
       WHERE snapshot_id = $1
         AND type IN ('link', 'button')
         AND x IS NOT NULL AND y IS NOT NULL`,
      [snapshotId]
    );

    let onInteractive = 0;
    let onNonInteractive = 0;

    for (const click of clicksRes.rows) {
      const matchedInteractive = elementsRes.rows.some(el =>
        Math.abs(el.x - click.x) <= tolerancePx &&
        Math.abs(el.y - click.y) <= tolerancePx
      );
      if (matchedInteractive) onInteractive++;
      else onNonInteractive++;
    }

    const total = onInteractive + onNonInteractive;
    return {
      snapshot_id: snapshotId,
      total_clicks_analyzed: total,
      clicks_on_interactive: onInteractive,
      clicks_on_non_interactive: onNonInteractive,
      pct_non_interactive: total > 0 ? Math.round((onNonInteractive / total) * 10000) / 100 : null,
      tolerance_px: tolerancePx,
    };
  }

  /**
   * 3.5 — Densidade de Cliques por Região (Click Density por Quadrante)
   * Divide a página em uma grade (default 4x4) e conta cliques por célula
   */
  static async clickDensityByQuadrant(siteId, gridSize = 4, viewportWidth = 1280, viewportHeight = 2000) {
    const clicksRes = await db.query(
      `SELECT e.x, e.y
       FROM events e
       JOIN sessions s ON s.id = e.session_id
       WHERE s.site_id = $1 AND e.type = 'click' AND e.x IS NOT NULL AND e.y IS NOT NULL`,
      [siteId]
    );

    const cellWidth  = viewportWidth  / gridSize;
    const cellHeight = viewportHeight / gridSize;
    const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));

    clicksRes.rows.forEach(c => {
      const col = Math.min(Math.floor(c.x / cellWidth), gridSize - 1);
      const row = Math.min(Math.floor(c.y / cellHeight), gridSize - 1);
      if (col >= 0 && row >= 0) grid[row][col]++;
    });

    return {
      grid_size: gridSize,
      viewport: { width: viewportWidth, height: viewportHeight },
      total_clicks: clicksRes.rows.length,
      density_grid: grid,
    };
  }

  // ════════════════════════════════════════════════════════════
  // DIMENSÃO 4 — ESTRUTURA DO SITE (análise estática via varredura)
  // ════════════════════════════════════════════════════════════

  /**
   * 4.1 — Densidade de Elementos Interativos por Página
   * Razão entre elementos clicáveis (links + botões) e total de elementos
   */
  static async interactiveDensity(snapshotId) {
    const result = await db.query(
      `SELECT
         COUNT(*) AS total_elements,
         SUM(CASE WHEN type IN ('link', 'button') THEN 1 ELSE 0 END) AS interactive_elements,
         ROUND(
           100.0 * SUM(CASE WHEN type IN ('link', 'button') THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
           2
         ) AS interactive_density_pct
       FROM site_elements
       WHERE snapshot_id = $1`,
      [snapshotId]
    );
    return result.rows[0];
  }

  /**
   * 4.2 — Proporção de Links Internos vs. Externos
   */
  static async linkComposition(snapshotId) {
    const result = await db.query(
      `SELECT
         COUNT(*) AS total_links,
         SUM(CASE WHEN is_external THEN 1 ELSE 0 END)     AS external_links,
         SUM(CASE WHEN NOT is_external THEN 1 ELSE 0 END) AS internal_links,
         ROUND(
           100.0 * SUM(CASE WHEN is_external THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
           2
         ) AS pct_external
       FROM site_elements
       WHERE snapshot_id = $1 AND type = 'link'`,
      [snapshotId]
    );
    return result.rows[0];
  }

  /**
   * 4.3 — Contraste de Cores (WCAG 2.1)
   * Verifica se a razão de contraste entre bg_color e text_color
   * atende ao mínimo de 4.5:1 (texto normal) ou 3:1 (texto grande)
   * Fórmula de luminância relativa do WCAG 2.1
   */
  static async colorContrastAudit(snapshotId) {
    const result = await db.query(
      `SELECT id, type, text, bg_color, text_color
       FROM site_elements
       WHERE snapshot_id = $1
         AND type IN ('link', 'button', 'heading')
         AND bg_color IS NOT NULL AND text_color IS NOT NULL`,
      [snapshotId]
    );

    const parseRgb = (str) => {
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
    };

    const relLuminance = ([r, g, b]) => {
      const f = v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };

    const contrastRatio = (rgb1, rgb2) => {
      const l1 = relLuminance(rgb1), l2 = relLuminance(rgb2);
      const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    };

    let compliant = 0, nonCompliant = 0;
    const failures = [];

    for (const el of result.rows) {
      const bg = parseRgb(el.bg_color);
      const fg = parseRgb(el.text_color);
      if (!bg || !fg) continue;

      const ratio = contrastRatio(bg, fg);
      const passes = ratio >= 4.5;

      if (passes) compliant++;
      else {
        nonCompliant++;
        failures.push({
          element_id: el.id, type: el.type,
          text: (el.text || '').slice(0, 60),
          contrast_ratio: Math.round(ratio * 100) / 100,
        });
      }
    }

    const total = compliant + nonCompliant;
    return {
      total_elements_checked: total,
      wcag_compliant: compliant,
      wcag_non_compliant: nonCompliant,
      pct_compliant: total > 0 ? Math.round((compliant / total) * 10000) / 100 : null,
      failures: failures.slice(0, 20), // limitar para não explodir payload
    };
  }

  /**
   * 4.4 — Cobertura de Atributos ALT em Imagens
   */
  static async altTextCoverage(snapshotId) {
    const result = await db.query(
      `SELECT
         COUNT(*) AS total_images,
         SUM(CASE WHEN extra->>'alt' IS NOT NULL AND extra->>'alt' != '' THEN 1 ELSE 0 END)
           AS images_with_alt,
         ROUND(
           100.0 * SUM(CASE WHEN extra->>'alt' IS NOT NULL AND extra->>'alt' != '' THEN 1 ELSE 0 END)
           / NULLIF(COUNT(*), 0), 2
         ) AS pct_with_alt
       FROM site_elements
       WHERE snapshot_id = $1 AND type = 'image'`,
      [snapshotId]
    );
    return result.rows[0];
  }

  // ════════════════════════════════════════════════════════════
  // RELATÓRIO CONSOLIDADO
  // ════════════════════════════════════════════════════════════

  /**
   * Retorna todas as métricas de eficácia, eficiência e navegabilidade
   * de um teste em uma única chamada — usado pela tela de relatório.
   */
  static async fullTestReport(testId) {
    const [
      completionRate, errorRate, abandonment,
      timeOnTask, clickEfficiency, successPerMinute,
      lostness, backtrack, clickDepth,
    ] = await Promise.all([
      MetricsService.taskCompletionRate(testId),
      MetricsService.errorRate(testId),
      MetricsService.abandonmentRate(testId),
      MetricsService.timeOnTask(testId),
      MetricsService.clickEfficiency(testId),
      MetricsService.successPerMinute(testId),
      MetricsService.lostnessScore(testId),
      MetricsService.backtrackRate(testId),
      MetricsService.clickDepth(testId),
    ]);

    return {
      effectiveness: { completionRate, errorRate, abandonment },
      efficiency:    { timeOnTask, clickEfficiency, successPerMinute },
      navigability:  { lostness, backtrack, clickDepth },
    };
  }

  /**
   * Retorna todas as métricas estruturais (dimensão 4) de um snapshot
   */
  static async fullStructuralReport(snapshotId) {
    const [density, links, contrast, altCoverage] = await Promise.all([
      MetricsService.interactiveDensity(snapshotId),
      MetricsService.linkComposition(snapshotId),
      MetricsService.colorContrastAudit(snapshotId),
      MetricsService.altTextCoverage(snapshotId),
    ]);

    return { density, links, contrast, altCoverage };
  }

  /**
   * Relatório individual por participante de um teste.
   * Retorna uma linha por (sessão, tarefa) com as métricas brutas,
   * permitindo ao pesquisador ver o desempenho de cada pessoa.
   */
  static async participantBreakdown(testId) {
    const result = await db.query(
      `SELECT
         tr.id                AS result_id,
         tr.session_id,
         u.id                 AS user_id,
         u.age, u.gender, u.education_level,
         t.id                 AS task_id,
         t.description        AS task_description,
         t.order_index,
         tr.started_at,
         tr.finished_at,
         EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at)) AS duration_seconds,
         tr.clicks,
         tr.success
       FROM task_results tr
       JOIN tasks t     ON t.id = tr.task_id
       JOIN sessions s  ON s.id = tr.session_id
       JOIN users u     ON u.id = s.user_id
       WHERE t.test_id = $1
       ORDER BY tr.session_id ASC, t.order_index ASC`,
      [testId]
    );

    // Agrupar por sessão (= por participante) para facilitar o consumo no front
    const bySession = {};
    for (const row of result.rows) {
      if (!bySession[row.session_id]) {
        bySession[row.session_id] = {
          session_id: row.session_id,
          user: {
            id: row.user_id,
            age: row.age,
            gender: row.gender,
            education_level: row.education_level,
          },
          tasks: [],
        };
      }
      bySession[row.session_id].tasks.push({
        result_id:        row.result_id,
        task_id:          row.task_id,
        description:      row.task_description,
        order_index:      row.order_index,
        started_at:       row.started_at,
        finished_at:      row.finished_at,
        duration_seconds: row.duration_seconds != null ? Math.round(row.duration_seconds) : null,
        clicks:           row.clicks,
        success:          row.success,
      });
    }

    return Object.values(bySession);
  }
}

module.exports = MetricsService;
