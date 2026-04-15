// Controller de eventos — agora exige session_id em todos os registros

const EventService = require('../services/eventService');

class EventController {
  /**
   * POST /events
   * Registra um evento vinculado a uma sessão ativa
   */
  static async createEvent(req, res) {
    try {
      const {
        session_id,
        type,
        tag,
        text,
        element_id,
        class: cssClass,
        url,
        x,
        y,
        timestamp,
      } = req.body;

      console.log(`📝 Evento: ${type} | sessão=${session_id}`);

      const event = await EventService.createEvent({
        session_id,
        type,
        tag,
        text,
        element_id,
        class: cssClass,
        url,
        x,
        y,
        timestamp,
      });

      return res.status(201).json({
        success: true,
        message: 'Evento registrado com sucesso',
        data:    event,
      });
    } catch (error) {
      console.error('❌ Erro ao criar evento:', error);

      // FK violation — session_id não existe
      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          error:   'session_id inválido — sessão não encontrada',
        });
      }

      return res.status(500).json({
        success: false,
        error:   'Erro ao registrar evento',
        message: error.message,
      });
    }
  }

  /**
   * GET /events
   * Lista eventos. Aceita query params: ?limit=100&session_id=42
   */
  static async getAllEvents(req, res) {
    try {
      const limit     = parseInt(req.query.limit)      || 100;
      const sessionId = req.query.session_id           || null;

      const events = await EventService.getAllEvents(limit, sessionId);

      return res.status(200).json({
        success: true,
        count:   events.length,
        data:    events,
      });
    } catch (error) {
      console.error('❌ Erro ao listar eventos:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /events/stats
   * Retorna estatísticas agregadas
   */
  static async getEventStats(req, res) {
    try {
      const stats = await EventService.getEventStats();
      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = EventController;
