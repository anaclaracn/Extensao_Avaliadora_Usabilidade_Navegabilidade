// Controller de métricas — expõe todas as 15 métricas via HTTP

const MetricsService = require('../services/metricsService');

class MetricsController {

  // ── Eficácia ──────────────────────────────────────────────────
  static async completionRate(req, res) {
    try {
      const data = await MetricsService.taskCompletionRate(req.params.testId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async errorRate(req, res) {
    try {
      const data = await MetricsService.errorRate(req.params.testId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

    static async demographics(req, res) {
    try {
      const data = await MetricsService.completionRateByDemographics(req.params.testId);
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ── Eficiência ────────────────────────────────────────────────
  static async timeOnTask(req, res) {
    try {
      const data = await MetricsService.timeOnTask(req.params.testId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async clickEfficiency(req, res) {
    try {
      const data = await MetricsService.clickEfficiency(req.params.testId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  // ── Navegabilidade ────────────────────────────────────────────
  static async lostness(req, res) {
    try {
      const data = await MetricsService.lostnessScore(req.params.testId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async backtrack(req, res) {
    try {
      const data = await MetricsService.backtrackRate(req.params.testId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async pageDepth(req, res) {
    try {
      const data = await MetricsService.pageDepth(req.params.testId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async nonInteractiveClicks(req, res) {
    try {
      const tolerance = parseInt(req.query.tolerance_px) || 15;
      const data = await MetricsService.nonInteractiveClicks(req.params.siteId, tolerance);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async clickDensity(req, res) {
    try {
      const gridSize = parseInt(req.query.grid_size) || 4;
      const vw = parseInt(req.query.viewport_width)  || 1280;
      const vh = parseInt(req.query.viewport_height) || 2000;
      const data = await MetricsService.clickDensityByQuadrant(req.params.siteId, gridSize, vw, vh);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async scrollDepth(req, res) {
    try {
      const data = await MetricsService.scrollDepth(req.params.testId);
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async hoverTime(req, res) {
    try {
      const data = await MetricsService.hoverTimeAnalysis(req.params.testId);
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  // ── Estrutura (varredura) ───────────────────────────────────
  static async interactiveDensity(req, res) {
    try {
      const data = await MetricsService.interactiveDensity(req.params.snapshotId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async linkComposition(req, res) {
    try {
      const data = await MetricsService.linkComposition(req.params.snapshotId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async colorContrast(req, res) {
    try {
      const data = await MetricsService.colorContrastAudit(req.params.snapshotId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async altCoverage(req, res) {
    try {
      const data = await MetricsService.altTextCoverage(req.params.snapshotId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  // ── Relatórios consolidados ──────────────────────────────────
  static async fullTestReport(req, res) {
    try {
      const data = await MetricsService.fullTestReport(req.params.testId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async fullStructuralReport(req, res) {
    try {
      const data = await MetricsService.fullStructuralReport(req.params.snapshotId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async participantBreakdown(req, res) {
    try {
      const data = await MetricsService.participantBreakdown(req.params.testId);
      res.json({ success: true, count: data.length, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }

  static async submitSus(req, res) {
    try {
      const { user_id, site_id, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10 } = req.body;
      const answers = { q1, q2, q3, q4, q5, q6, q7, q8, q9, q10 };

      // Validar que todas as perguntas foram respondidas
      const missing = Object.entries(answers).filter(([,v]) => v === undefined || v === null).map(([k]) => k);
      if (!user_id || !site_id || missing.length) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios ausentes',
          missing: [!user_id && 'user_id', !site_id && 'site_id', ...missing].filter(Boolean),
        });
      }

      const data = await MetricsService.submitSusResponse({ userId: user_id, siteId: site_id, answers });
      return res.status(201).json({
        success: true,
        message: 'Resposta SUS registrada',
        sus_score: data.sus_score,
        data,
      });
    } catch (err) {
      console.error('❌ Erro ao salvar SUS:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async susSummary(req, res) {
    try {
      const data = await MetricsService.siteSusSummary(req.params.siteId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  }
}

module.exports = MetricsController;
