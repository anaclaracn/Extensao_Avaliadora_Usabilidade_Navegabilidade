// Rotas de eventos — session_id agora é obrigatório no POST
const express = require('express');
const EventController = require('../controllers/eventController');
const { validateEvent } = require('../middleware/validationMiddleware');

const router = express.Router();

// POST /events — registrar evento (session_id obrigatório)
router.post('/', validateEvent, EventController.createEvent);

// GET /events — listar eventos (?limit=&session_id=)
router.get('/', EventController.getAllEvents);

// GET /events/stats — estatísticas gerais
router.get('/stats', EventController.getEventStats);

module.exports = router;
