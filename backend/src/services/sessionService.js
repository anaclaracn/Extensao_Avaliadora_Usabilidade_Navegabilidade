// Service de sessões — cria sessões e garante que o site exista no banco
// Se o site ainda não estiver cadastrado, é criado automaticamente (upsert)

const db = require('../database/connection');

class SessionService {
  /**
   * Buscar ou criar um site pela URL
   * @param {string} siteUrl
   * @returns {Promise<Object>} site encontrado ou criado
   */
  static async findOrCreateSite(siteUrl) {
    // Verificar se o site já existe
    const existing = await db.query(
      'SELECT * FROM sites WHERE url = $1',
      [siteUrl]
    );

    if (existing.rows.length > 0) {
      console.log(`🔗 Site já existente: ${siteUrl} (id=${existing.rows[0].id})`);
      return existing.rows[0];
    }

    // Site não existe — criar
    const inserted = await db.query(
      'INSERT INTO sites (url) VALUES ($1) RETURNING *;',
      [siteUrl]
    );
    console.log(`🆕 Novo site criado: ${siteUrl} (id=${inserted.rows[0].id})`);
    return inserted.rows[0];
  }

  /**
   * Criar uma nova sessão de uso
   * @param {{ user_id: number, site_url: string }} data
   * @returns {Promise<Object>} sessão criada com site_id e session_id
   */
  static async createSession(data) {
    const { user_id, site_url } = data;

    // Garantir que o site exista (cria se necessário)
    const site = await SessionService.findOrCreateSite(site_url);

    const result = await db.query(
      `INSERT INTO sessions (user_id, site_id, started_at)
       VALUES ($1, $2, NOW())
       RETURNING *;`,
      [user_id, site.id]
    );

    return { ...result.rows[0], site };
  }

  /**
   * Finalizar uma sessão (preencher ended_at)
   * @param {number} sessionId
   * @returns {Promise<Object>}
   */
  static async endSession(sessionId) {
    const result = await db.query(
      `UPDATE sessions SET ended_at = NOW()
       WHERE id = $1 RETURNING *;`,
      [sessionId]
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar sessão pelo ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = SessionService;
