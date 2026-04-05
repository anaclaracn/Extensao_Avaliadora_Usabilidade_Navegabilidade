// Arquivo de rotas para eventos
// Define os endpoints disponíveis para interagir com eventos

const express = require("express");
const EventController = require("../controllers/eventController");
const { validateEventData } = require("../middleware/validationMiddleware");

// Criar um router do Express
const router = express.Router();

/**
 * POST /events
 *
 * Criar um novo evento
 *
 * Corpo da requisição:
 * {
 *   "type": "click",
 *   "tag": "button",
 *   "text": "Clique aqui",
 *   "element_id": "btn-submit",
 *   "class": "btn btn-primary",
 *   "timestamp": "2024-04-01T10:30:45.123Z"
 * }
 *
 * Resposta de sucesso (201):
 * {
 *   "success": true,
 *   "message": "Evento registrado com sucesso",
 *   "data": {
 *     "id": 1,
 *     "type": "click",
 *     "tag": "button",
 *     ...
 *   }
 * }
 */
router.post("/", validateEventData, EventController.createEvent);

/**
 * GET /events
 *
 * Obter todos os eventos (útil para testes)
 *
 * Query parameters (opcionais):
 * - limit: número máximo de eventos a retornar (padrão: 100)
 *
 * Exemplo: GET /events?limit=50
 */
router.get("/", EventController.getAllEvents);

/**
 * GET /events/stats
 *
 * Obter estatísticas dos eventos
 *
 * Resposta:
 * {
 *   "success": true,
 *   "data": {
 *     "total_events": 150,
 *     "unique_types": 5,
 *     "distinct_days": 3
 *   }
 * }
 */
router.get("/stats", EventController.getEventStats);

module.exports = router;
