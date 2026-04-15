// Service de tarefas — cada tarefa pertence a um teste e possui
// uma descrição e ordem de apresentação ao participante

const db = require('../database/connection');

class TaskService {
  /**
   * Criar uma nova tarefa para um teste
   * @param {{ test_id: number, description: string, order_index?: number }} data
   * @returns {Promise<Object>}
   */
  static async createTask(data) {
    const { test_id, description, order_index } = data;

    // Se order_index não for fornecido, usar o próximo disponível para o teste
    let idx = order_index;
    if (idx === undefined || idx === null) {
      const countResult = await db.query(
        'SELECT COUNT(*) AS cnt FROM tasks WHERE test_id = $1',
        [test_id]
      );
      idx = parseInt(countResult.rows[0].cnt) + 1;
    }

    const result = await db.query(
      `INSERT INTO tasks (test_id, description, order_index)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [test_id, description, idx]
    );
    return result.rows[0];
  }

  /**
   * Listar tarefas de um teste, ordenadas
   * @param {number} testId
   * @returns {Promise<Array>}
   */
  static async listByTest(testId) {
    const result = await db.query(
      'SELECT * FROM tasks WHERE test_id = $1 ORDER BY order_index ASC;',
      [testId]
    );
    return result.rows;
  }

  /**
   * Buscar tarefa pelo ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const result = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}

module.exports = TaskService;
