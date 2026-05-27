// Rotas de varredura de sites
const express            = require('express');
const SnapshotController = require('../controllers/snapshotController');

const router = express.Router();

// POST   /snapshots            — salvar varredura
router.post('/',             SnapshotController.create);

// GET    /snapshots?site_url=  — listar por site
router.get('/',              SnapshotController.list);

// GET    /snapshots/:id        — snapshot completo com elementos
router.get('/:id',           SnapshotController.findById);

// GET    /snapshots/:id/summary — resumo agregado
router.get('/:id/summary',   SnapshotController.summary);

module.exports = router;
