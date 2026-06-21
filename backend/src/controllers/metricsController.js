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

  static async abandonmentRate(req, res) {
    try {
      const data = await MetricsService.abandonmentRate(req.params.testId);
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
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

  static async successPerMinute(req, res) {
    try {
      const data = await MetricsService.successPerMinute(req.params.testId);
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
}

module.exports = MetricsController;
