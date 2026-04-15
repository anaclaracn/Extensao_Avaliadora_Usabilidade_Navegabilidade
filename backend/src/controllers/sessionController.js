// Controller de sessões — cria e encerra sessões de uso
// A criação do site (se necessário) é feita automaticamente pelo service

const SessionService = require('../services/sessionService');

class SessionController {
  /**
   * POST /sessions
   * Cria uma sessão para um usuário em um site
   * Se o site ainda não existir, é criado automaticamente
   */
  static async createSession(req, res) {
    try {
      const { user_id, site_url } = req.body;
      console.log(`🖥️  Criando sessão: user_id=${user_id}, site=${site_url}`);

      const session = await SessionService.createSession({ user_id, site_url });

      return res.status(201).json({
        success:    true,
        message:    'Sessão criada com sucesso',
        session_id: session.id,
        data:       session,
      });
    } catch (error) {
      console.error('❌ Erro ao criar sessão:', error);

      // Chave estrangeira violada — user_id não existe
      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          error:   'user_id inválido — usuário não encontrado',
        });
      }

      return res.status(500).json({
        success: false,
        error:   'Erro ao criar sessão',
        message: error.message,
      });
    }
  }

  /**
   * PATCH /sessions/:id/end
   * Marca o encerramento de uma sessão
   */
  static async endSession(req, res) {
    try {
      const session = await SessionService.endSession(req.params.id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Sessão não encontrada' });
      }
      return res.status(200).json({
        success: true,
        message: 'Sessão encerrada',
        data:    session,
      });
    } catch (error) {
      console.error('❌ Erro ao encerrar sessão:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /sessions/:id
   * Retorna os dados de uma sessão
   */
  static async getSession(req, res) {
    try {
      const session = await SessionService.findById(req.params.id);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Sessão não encontrada' });
      }
      return res.status(200).json({ success: true, data: session });
    } catch (error) {
      console.error('❌ Erro ao buscar sessão:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = SessionController;
