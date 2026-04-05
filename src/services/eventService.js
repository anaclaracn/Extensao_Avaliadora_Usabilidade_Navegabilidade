// Service responsável pela lógica de negócio relacionada a eventos
// Contém operações de banco de dados e processamento de eventos

const db = require("../database/connection");

/**
 * Service para gerenciar eventos
 */
class EventService {
  /**
   * Inserir um novo evento no banco de dados
   *
   * @param {Object} eventData - Dados do evento
   * @param {string} eventData.type - Tipo do evento (required)
   * @param {string} eventData.tag - Tag HTML do elemento (opcional)
   * @param {string} eventData.text - Texto do elemento (opcional)
   * @param {string} eventData.element_id - ID do elemento HTML (opcional)
   * @param {string} eventData.class - Classe CSS do elemento (opcional)
   * @param {string} eventData.timestamp - Data/hora do evento (required)
   *
   * @returns {Promise<Object>} - Objeto com os dados inseridos incluindo o ID gerado
   */
  static async createEvent(eventData) {
    try {
      // Query SQL para inserir o evento na tabela 'events'
      // Utiliza parâmetros ($1, $2, etc) para proteção contra SQL injection
      const query = `
        INSERT INTO events (type, tag, text, element_id, class, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;

      // Array com os valores a serem inseridos, na mesma ordem dos parâmetros
      const values = [
        eventData.type,
        eventData.tag || null,
        eventData.text || null,
        eventData.element_id || null,
        eventData.class || null,
        eventData.timestamp,
      ];

      // Executar a query
      const result = await db.query(query, values);

      // Retornar a primeira linha do resultado (o evento inserido)
      return result.rows[0];
    } catch (error) {
      console.error("❌ Erro ao criar evento:", error);
      throw error;
    }
  }

  /**
   * Obter todos os eventos cadastrados (útil para testes e análise)
   *
   * @param {number} limit - Número máximo de eventos a retornar (padrão: 100)
   * @returns {Promise<Array>} - Lista de eventos
   */
  static async getAllEvents(limit = 100) {
    try {
      const query = `
        SELECT * FROM events 
        ORDER BY timestamp DESC 
        LIMIT $1;
      `;

      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error("❌ Erro ao obter eventos:", error);
      throw error;
    }
  }

  /**
   * Obter estatísticas básicas dos eventos
   *
   * @returns {Promise<Object>} - Objeto com informações estatísticas
   */
  static async getEventStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT type) as unique_types,
          COUNT(DISTINCT CAST(timestamp::date AS TEXT)) as distinct_days
        FROM events;
      `;

      const result = await db.query(query, []);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Erro ao obter estatísticas:", error);
      throw error;
    }
  }
}

module.exports = EventService;
