// Controller de pesquisadores

const ResearcherService = require('../services/researcherService');

class ResearcherController {

  /**
   * POST /researchers/register
   * Cadastra novo pesquisador (requer senha mestra no body)
   */
  static async register(req, res) {
    try {
      const { name, email, password, master_password } = req.body;

      const researcher = await ResearcherService.register({
        name,
        email,
        password,
        masterPassword: master_password,
      });

      return res.status(201).json({
        success: true,
        message: 'Pesquisador cadastrado com sucesso',
        data:    researcher,
      });

    } catch (err) {
      console.error('❌ Erro no cadastro:', err.message);

      if (err.code === 'INVALID_MASTER') {
        return res.status(403).json({ success: false, error: err.message });
      }
      if (err.code === 'EMAIL_TAKEN') {
        return res.status(409).json({ success: false, error: err.message });
      }

      return res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  /**
   * POST /researchers/login
   * Autentica pesquisador e retorna dados públicos
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const researcher = await ResearcherService.login({ email, password });

      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        data:    researcher,
      });

    } catch (err) {
      console.error('❌ Erro no login:', err.message);

      if (err.code === 'INVALID_CREDENTIALS') {
        return res.status(401).json({ success: false, error: err.message });
      }

      return res.status(500).json({ success: false, error: 'Erro interno' });
    }
  }

  /**
   * GET /researchers
   * Lista todos os pesquisadores (sem dados sensíveis)
   */
  static async listAll(req, res) {
    try {
      const researchers = await ResearcherService.listAll();
      return res.status(200).json({ success: true, count: researchers.length, data: researchers });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = ResearcherController;
