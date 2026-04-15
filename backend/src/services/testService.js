// Service de testes de usabilidade
// Um teste é vinculado a um site e agrupa um conjunto de tarefas

const db = require('../database/connection');

class TestService {
  /**
   * Criar um novo teste de usabilidade
   * @param {{ name: string, site_id: number }} data
   * @returns {Promise<Object>}
   */
  static async createTest(data) {
    const { name, site_id } = data;

    const result = await db.query(
      `INSERT INTO tests (name, site_id)
       VALUES ($1, $2)
       RETURNING *;`,
      [name, site_id]
    );
    return result.rows[0];
  }

  /**
   * Listar testes por site_id
   * @param {number|null} siteId
   * @returns {Promise<Array>}
   */
  static async listTests(siteId = null) {
    if (siteId) {
      const result = await db.query(
        'SELECT * FROM tests WHERE site_id = $1 ORDER BY created_at DESC;',
        [siteId]
      );
      return result.rows;
    }
    const result = await db.query(
      'SELECT * FROM tests ORDER BY created_at DESC;'
    );
    return result.rows;
  }

  /**
   * Listar testes pelo domínio/URL do site.
   * Faz match parcial: qualquer site cuja URL contenha o hostname informado.
   * Ex: buscar "claude.ai" retorna testes do site "https://claude.ai"
   * @param {string} siteUrl - URL ou hostname completo vindo da extensão
   * @returns {Promise<Array>}
   */
  static async listTestsBySiteUrl(siteUrl) {
    // Extrair apenas o hostname para comparação robusta
    let hostname = siteUrl;
    try {
      hostname = new URL(siteUrl).hostname;
    } catch (_) {
      // siteUrl já pode ser só o hostname
    }

    const result = await db.query(
      `SELECT t.*
       FROM tests t
       JOIN sites s ON s.id = t.site_id
       WHERE s.url LIKE $1
       ORDER BY t.created_at DESC;`,
      [`%${hostname}%`]
    );
    return result.rows;
  }

  /**
   * Buscar ou criar um site pela URL e criar o teste vinculado.
   * Útil para o admin criar teste passando a URL em vez do site_id.
   * @param {{ name: string, site_url: string }} data
   * @returns {Promise<Object>}
   */
  static async createTestBySiteUrl(data) {
    const { name, site_url } = data;

    // Buscar site existente
    let siteResult = await db.query('SELECT * FROM sites WHERE url = $1', [site_url]);
    let site = siteResult.rows[0];

    // Se não existir, criar
    if (!site) {
      const inserted = await db.query(
        'INSERT INTO sites (url) VALUES ($1) RETURNING *;',
        [site_url]
      );
      site = inserted.rows[0];
    }

    const result = await db.query(
      `INSERT INTO tests (name, site_id) VALUES ($1, $2) RETURNING *;`,
      [name, site.id]
    );
    return { ...result.rows[0], site };
  }

  /**
   * Buscar teste pelo ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const result = await db.query('SELECT * FROM tests WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}

module.exports = TestService;
