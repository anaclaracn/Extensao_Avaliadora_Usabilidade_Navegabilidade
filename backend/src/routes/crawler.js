// Rotas do crawler
const express           = require('express');
const CrawlerController = require('../controllers/crawlerController');

const router = express.Router();

// POST  /crawler/start       — iniciar crawler
router.post('/start',        CrawlerController.start);

// GET   /crawler/:id/status  — status em tempo real
router.get('/:id/status',    CrawlerController.status);

// POST  /crawler/:id/stop    — parar sessão
router.post('/:id/stop',     CrawlerController.stop);

// GET   /crawler?site_url=   — listar sessões de um site
router.get('/',              CrawlerController.list);

module.exports = router;
