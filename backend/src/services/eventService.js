// Service de eventos — agora vincula cada evento a uma sessão obrigatória
// Mantém compatibilidade com os métodos GET de estatísticas anteriores

const db = require('../database/connection');

class EventService {
  /**
   * Inserir um evento vinculado a uma sessão
   * @param {Object} data
   * @returns {Promise<Object>} evento inserido
   */
  static async createEvent(data) {
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
    } = data;

    const query = `
      INSERT INTO events
        (session_id, type, tag, text, element_id, class, url, x, y, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      session_id,
      type,
      tag        || null,
      text       || null,
      element_id || null,
      cssClass   || null,
      url        || null,
      x          || null,
      y          || null,
      timestamp,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Obter eventos (opcionalmente filtrados por sessão)
   * @param {number} limit
   * @param {number|null} sessionId
   * @returns {Promise<Array>}
   */
  static async getAllEvents(limit = 100, sessionId = null) {
    let query = 'SELECT * FROM events';
    const params = [];

    if (sessionId) {
      query += ' WHERE session_id = $1 ORDER BY timestamp DESC LIMIT $2';
      params.push(sessionId, limit);
    } else {
      query += ' ORDER BY timestamp DESC LIMIT $1';
      params.push(limit);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Estatísticas gerais de eventos
   * @returns {Promise<Object>}
   */
  static async getEventStats() {
    const result = await db.query(`
      SELECT
        COUNT(*)                                        AS total_events,
        COUNT(DISTINCT type)                            AS unique_types,
        COUNT(DISTINCT session_id)                      AS sessions_with_events,
        COUNT(DISTINCT CAST(timestamp::date AS TEXT))   AS distinct_days
      FROM events;
    `);
    return result.rows[0];
  }
}

module.exports = EventService;
