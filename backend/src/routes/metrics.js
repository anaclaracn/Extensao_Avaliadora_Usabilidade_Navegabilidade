// Rotas de métricas de usabilidade e navegabilidade
const express          = require('express');
const MetricsController = require('../controllers/metricsController');

const router = express.Router();

// ── Eficácia (Effectiveness) ──────────────────────────────────
router.get('/test/:testId/completion-rate',  MetricsController.completionRate);
router.get('/test/:testId/error-rate',       MetricsController.errorRate);
router.get('/test/:testId/abandonment-rate', MetricsController.abandonmentRate);

// ── Eficiência (Efficiency) ────────────────────────────────────
router.get('/test/:testId/time-on-task',      MetricsController.timeOnTask);
router.get('/test/:testId/click-efficiency',  MetricsController.clickEfficiency);
router.get('/test/:testId/success-per-minute',MetricsController.successPerMinute);

// ── Navegabilidade (Lostness, backtrack, profundidade) ────────
router.get('/test/:testId/lostness',    MetricsController.lostness);
router.get('/test/:testId/backtrack',   MetricsController.backtrack);
router.get('/test/:testId/page-depth', MetricsController.pageDepth);
router.get('/test/:testId/participant-breakdown', MetricsController.participantBreakdown);

// Estas duas usam o site inteiro (cruzam eventos de todas as sessões do site)
router.get('/site/:siteId/non-interactive-clicks', MetricsController.nonInteractiveClicks);
router.get('/site/:siteId/click-density',          MetricsController.clickDensity);

// ── Estrutura do site (a partir de um snapshot de varredura) ──
router.get('/snapshot/:snapshotId/interactive-density', MetricsController.interactiveDensity);
router.get('/snapshot/:snapshotId/link-composition',    MetricsController.linkComposition);
router.get('/snapshot/:snapshotId/color-contrast',       MetricsController.colorContrast);
router.get('/snapshot/:snapshotId/alt-coverage',         MetricsController.altCoverage);

// ── Relatórios consolidados ────────────────────────────────────
router.get('/test/:testId/full-report',          MetricsController.fullTestReport);
router.get('/snapshot/:snapshotId/full-report',  MetricsController.fullStructuralReport);

module.exports = router;
