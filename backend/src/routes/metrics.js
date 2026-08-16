// Rotas de métricas de usabilidade e navegabilidade
const express          = require('express');
const MetricsController = require('../controllers/metricsController');

const router = express.Router();

// ── Eficácia (Effectiveness) ──────────────────────────────────
router.get('/test/:testId/completion-rate',  MetricsController.completionRate);
router.get('/test/:testId/error-rate',       MetricsController.errorRate);
router.get('/test/:testId/demographics', MetricsController.demographics);

// ── Eficiência (Efficiency) ────────────────────────────────────
router.get('/test/:testId/time-on-task',      MetricsController.timeOnTask);
router.get('/test/:testId/click-efficiency',  MetricsController.clickEfficiency);

// ── Navegabilidade (Lostness, backtrack, profundidade) ────────
router.get('/test/:testId/lostness',    MetricsController.lostness);
router.get('/test/:testId/backtrack',   MetricsController.backtrack);
router.get('/test/:testId/page-depth', MetricsController.pageDepth);
router.get('/test/:testId/participant-breakdown', MetricsController.participantBreakdown);
router.get('/test/:testId/scroll-depth', MetricsController.scrollDepth);
router.get('/test/:testId/hover-time', MetricsController.hoverTime);
router.get('/test/:testId/non-interactive-clicks', MetricsController.nonInteractiveClicks);

// ── O site inteiro (cruzam eventos de todas as sessões do site) ──
router.get('/site/:siteId/click-density',          MetricsController.clickDensity);

// ── Estrutura do site (a partir de um snapshot de varredura) ──
router.get('/snapshot/:snapshotId/interactive-density', MetricsController.interactiveDensity);
router.get('/snapshot/:snapshotId/link-composition',    MetricsController.linkComposition);
router.get('/snapshot/:snapshotId/color-contrast',       MetricsController.colorContrast);
router.get('/snapshot/:snapshotId/alt-coverage',         MetricsController.altCoverage);

// ── SUS (System Usability Scale) ───────────────────────────────
router.get('/site/:siteId/sus-questions', MetricsController.susQuestionAverages);

// ── Relatórios consolidados ────────────────────────────────────
router.get('/test/:testId/full-report',          MetricsController.fullTestReport);
router.get('/snapshot/:snapshotId/full-report',  MetricsController.fullStructuralReport);

router.post("/sus",                     MetricsController.submitSus);
router.get("/site/:siteId/sus-summary", MetricsController.susSummary);

module.exports = router;
