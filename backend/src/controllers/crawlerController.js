// Controller do crawler

const CrawlerService = require('../services/crawlerService');

class CrawlerController {

  /**
   * POST /crawler/start
   * Cria a sessão e dispara o crawler em background
   * Body: { base_url, researcher_id, chrome_path? }
   */
  static async start(req, res) {
    try {
      const { base_url, researcher_id, chrome_path } = req.body;

      if (!base_url) {
        return res.status(400).json({ success: false, error: 'base_url é obrigatório' });
      }

      // Validar URL
      try { new URL(base_url); } catch(_) {
        return res.status(400).json({ success: false, error: 'base_url inválida' });
      }

      console.log(`🕷️  Iniciando crawler para: ${base_url}`);

      // Criar sessão no banco
      const session = await CrawlerService.createSession({
        baseUrl: base_url,
        researcherId: researcher_id || null,
      });

      // Disparar crawler em background (não await — responde imediatamente)
      CrawlerService.startCrawler(session.id, chrome_path || null)
        .catch(err => console.error('Crawler background error:', err));

      return res.status(201).json({
        success:    true,
        message:    'Crawler iniciado',
        session_id: session.id,
        data:       session,
      });

    } catch (err) {
      console.error('❌ Erro ao iniciar crawler:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /crawler/:id/status
   * Retorna o status atual da sessão com contadores da fila
   */
  static async status(req, res) {
    try {
      const data = await CrawlerService.getStatus(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: 'Sessão não encontrada' });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /crawler/:id/stop
   * Para uma sessão em andamento
   */
  static async stop(req, res) {
    try {
      await CrawlerService.stopSession(req.params.id);
      return res.status(200).json({ success: true, message: 'Sessão marcada para parar' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /crawler?site_url=
   * Lista todas as sessões de crawler de um site
   */
  static async list(req, res) {
    try {
      const { site_url, site_id } = req.query;
      if (!site_url && !site_id) {
        return res.status(400).json({ success: false, error: 'Informe site_url ou site_id' });
      }

      let siteId = site_id;
      if (!siteId && site_url) {
        const db = require('../database/connection');
        let origin;
        try { origin = new URL(site_url).origin; } catch(_) { origin = site_url; }
        const s = await db.query('SELECT id FROM sites WHERE url LIKE $1', [`%${origin}%`]);
        if (!s.rows.length) return res.status(200).json({ success: true, count: 0, data: [] });
        siteId = s.rows[0].id;
      }

      const sessions = await CrawlerService.listBySite(siteId);
      return res.status(200).json({ success: true, count: sessions.length, data: sessions });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = CrawlerController;
