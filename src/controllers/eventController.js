// Controller responsável por lidar com as requisições HTTP de eventos
// Atua como intermediária entre as rotas e o service

const EventService = require("../services/eventService");

/**
 * Controller para gerenciar eventos
 */
class EventController {
  /**
   * Criar um novo evento
   *
   * Rota: POST /events
   *
   * Corpo da requisição esperado:
   * {
   *   "type": "click",
   *   "tag": "button",
   *   "text": "Clique aqui",
   *   "element_id": "btn-submit",
   *   "class": "btn btn-primary",
   *   "timestamp": "2024-04-01T10:30:45.123Z"
   * }
   *
   * @param {Object} req - Objeto da requisição Express
   * @param {Object} res - Objeto da resposta Express
   */
  static async createEvent(req, res) {
    try {
      // Validação de campos já é feita pelo middleware
      // Extrair os dados do corpo da requisição
      const {
        type,
        tag,
        text,
        element_id,
        class: cssClass,
        timestamp,
      } = req.body;

      // Log para rastreamento
      console.log(`📝 Recebendo evento: ${type} em ${timestamp}`);

      // Chamar o service para inserir o evento
      const newEvent = await EventService.createEvent({
        type,
        tag,
        text,
        element_id,
        class: cssClass,
        timestamp,
      });

      // Retornar resposta de sucesso (status 201 = Created)
      return res.status(201).json({
        success: true,
        message: "Evento registrado com sucesso",
        data: newEvent,
      });
    } catch (error) {
      console.error("❌ Erro ao criar evento:", error);

      // Tratamento genérico de erro
      return res.status(500).json({
        success: false,
        error: "Erro ao registrar evento",
        message: error.message,
      });
    }
  }

  /**
   * Obter todos os eventos (endpoint para testes/verificação)
   *
   * Rota: GET /events
   *
   * Query parameters (opcionais):
   * - limit: número máximo de eventos a retornar (padrão: 100)
   *
   * @param {Object} req - Objeto da requisição Express
   * @param {Object} res - Objeto da resposta Express
   */
  static async getAllEvents(req, res) {
    try {
      // Extrair o parâmetro limit da query string, com padrão de 100
      const limit = parseInt(req.query.limit) || 100;

      console.log(`📊 Buscando até ${limit} eventos`);

      // Chamar o service para obter todos os eventos
      const events = await EventService.getAllEvents(limit);

      // Retornar resposta com sucesso
      return res.status(200).json({
        success: true,
        count: events.length,
        data: events,
      });
    } catch (error) {
      console.error("❌ Erro ao obter eventos:", error);

      return res.status(500).json({
        success: false,
        error: "Erro ao obter eventos",
        message: error.message,
      });
    }
  }

  /**
   * Obter estatísticas dos eventos
   *
   * Rota: GET /events/stats
   *
   * @param {Object} req - Objeto da requisição Express
   * @param {Object} res - Objeto da resposta Express
   */
  static async getEventStats(req, res) {
    try {
      console.log("📈 Buscando estatísticas dos eventos");

      // Chamar o service para obter estatísticas
      const stats = await EventService.getEventStats();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("❌ Erro ao obter estatísticas:", error);

      return res.status(500).json({
        success: false,
        error: "Erro ao obter estatísticas",
        message: error.message,
      });
    }
  }
}

module.exports = EventController;
