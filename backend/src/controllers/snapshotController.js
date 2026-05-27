// Controller de varredura de sites

const SnapshotService = require('../services/snapshotService');

class SnapshotController {

  /**
   * POST /snapshots
   * Recebe o payload de varredura coletado pela extensão e persiste.
   * Body: { url, meta, elements, researcher_id }
   */
  static async create(req, res) {
    try {
      const { url, meta, elements, researcher_id } = req.body;

      if (!url)              return res.status(400).json({ success: false, error: 'url é obrigatório' });
      if (!Array.isArray(elements)) return res.status(400).json({ success: false, error: 'elements deve ser um array' });

      console.log(`🔍 Varredura recebida: ${url} — ${elements.length} elementos`);

      const result = await SnapshotService.createSnapshot({
        url, meta: meta || {}, elements, researcherId: researcher_id || null,
      });

      return res.status(201).json({
        success:      true,
        message:      'Snapshot salvo com sucesso',
        snapshot_id:  result.snapshot.id,
        element_count: result.elementCount,
        data:         result.snapshot,
      });

    } catch (err) {
      console.error('❌ Erro ao salvar snapshot:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /snapshots?site_url=
   * Lista snapshots de um site (filtra por URL/hostname)
   */
  static async list(req, res) {
    try {
      const { site_url, site_id } = req.query;

      if (!site_url && !site_id) {
        return res.status(400).json({ success: false, error: 'Informe site_url ou site_id' });
      }

      let siteId = site_id;

      // Resolver site_id a partir da URL se necessário
      if (!siteId && site_url) {
        const db = require('../database/connection');
        let hostname;
        try { hostname = new URL(site_url).origin; } catch(_) { hostname = site_url; }

        const s = await db.query('SELECT id FROM sites WHERE url LIKE $1', [`%${hostname}%`]);
        if (!s.rows.length) return res.status(200).json({ success: true, count: 0, data: [] });
        siteId = s.rows[0].id;
      }

      const snapshots = await SnapshotService.listBySite(siteId);
      return res.status(200).json({ success: true, count: snapshots.length, data: snapshots });

    } catch (err) {
      console.error('❌ Erro ao listar snapshots:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /snapshots/:id
   * Retorna um snapshot completo com todos os elementos
   */
  static async findById(req, res) {
    try {
      const snapshot = await SnapshotService.findById(req.params.id);
      if (!snapshot) return res.status(404).json({ success: false, error: 'Snapshot não encontrado' });
      return res.status(200).json({ success: true, data: snapshot });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /snapshots/:id/summary
   * Retorna resumo agregado: contagem por tipo, links externos, headings
   */
  static async summary(req, res) {
    try {
      const data = await SnapshotService.summarizeById(req.params.id);
      if (!data) return res.status(404).json({ success: false, error: 'Snapshot não encontrado' });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = SnapshotController;
