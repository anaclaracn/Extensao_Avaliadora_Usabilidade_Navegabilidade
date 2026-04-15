// Controller de testes de usabilidade

const TestService = require('../services/testService');

class TestController {
  /**
   * POST /tests
   * Cria um teste. Aceita site_id direto OU site_url (cria o site se necessário).
   */
  static async createTest(req, res) {
    try {
      const { name, site_id, site_url } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Campo name é obrigatório' });
      }
      if (!site_id && !site_url) {
        return res.status(400).json({ success: false, error: 'Informe site_id ou site_url' });
      }

      let test;
      if (site_url) {
        console.log(`🧪 Criando teste: "${name}" para site_url=${site_url}`);
        test = await TestService.createTestBySiteUrl({ name, site_url });
      } else {
        console.log(`🧪 Criando teste: "${name}" para site_id=${site_id}`);
        test = await TestService.createTest({ name, site_id });
      }

      return res.status(201).json({ success: true, message: 'Teste criado com sucesso', data: test });
    } catch (error) {
      console.error('❌ Erro ao criar teste:', error);
      if (error.code === '23503') {
        return res.status(400).json({ success: false, error: 'site_id inválido' });
      }
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /tests
   * Lista testes. Filtros aceitos (em ordem de prioridade):
   *   ?site_url=https://claude.ai  → filtra pelo domínio (recomendado para a extensão)
   *   ?site_id=3                   → filtra pelo ID do site
   *   (sem filtro)                 → retorna todos
   */
  static async listTests(req, res) {
    try {
      const { site_url, site_id } = req.query;

      let tests;
      if (site_url) {
        console.log(`🔍 Buscando testes para site_url=${site_url}`);
        tests = await TestService.listTestsBySiteUrl(site_url);
      } else {
        tests = await TestService.listTests(site_id || null);
      }

      return res.status(200).json({ success: true, count: tests.length, data: tests });
    } catch (error) {
      console.error('❌ Erro ao listar testes:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /tests/:id
   * Retorna um teste pelo ID
   */
  static async getTest(req, res) {
    try {
      const test = await TestService.findById(req.params.id);
      if (!test) {
        return res.status(404).json({ success: false, error: 'Teste não encontrado' });
      }
      return res.status(200).json({ success: true, data: test });
    } catch (error) {
      console.error('❌ Erro ao buscar teste:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = TestController;
