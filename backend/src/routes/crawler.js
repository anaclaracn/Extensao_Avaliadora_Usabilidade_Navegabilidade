const express           = require('express');
const CrawlerController = require('../controllers/crawlerController');
const router = express.Router();

router.post('/start',     CrawlerController.start);
router.get('/:id/status', CrawlerController.status);
router.post('/:id/stop',  CrawlerController.stop);
router.get('/',           CrawlerController.list);

module.exports = router;
