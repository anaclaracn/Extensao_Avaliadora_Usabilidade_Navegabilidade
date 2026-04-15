// Rotas de sessões
const express = require('express');
const SessionController = require('../controllers/sessionController');
const { validateSession } = require('../middleware/validationMiddleware');

const router = express.Router();

// POST /sessions — criar sessão (cria o site automaticamente se necessário)
router.post('/', validateSession, SessionController.createSession);

// GET /sessions/:id — buscar sessão
router.get('/:id', SessionController.getSession);

// PATCH /sessions/:id/end — encerrar sessão (preenche ended_at)
router.patch('/:id/end', SessionController.endSession);

module.exports = router;
