// Service de tarefas — cada tarefa pertence a um teste e possui
// descrição, ordem, e opcionalmente os parâmetros de "caminho ótimo"
// usados para calcular métricas de eficiência (click efficiency, lostness)

const db = require('../database/connection');

class TaskService {
  /**
   * Criar uma nova tarefa para um teste
   * @param {{
   *   test_id: number,
   *   description: string,
   *   order_index?: number,
   *   min_clicks?: number,            -- cliques mínimos esperados (eficiência)
   *   optimal_path_length?: number    -- páginas no caminho ótimo (lostness)
   * }} data
   */
  static async createTask(data) {
    const { test_id, description, order_index, min_clicks, optimal_path_length } = data;

    let idx = order_index;
    if (idx === undefined || idx === null) {
      const countResult = await db.query(
        'SELECT COUNT(*) AS cnt FROM tasks WHERE test_id = $1',
        [test_id]
      );
      idx = parseInt(countResult.rows[0].cnt) + 1;
    }

    const result = await db.query(
      `INSERT INTO tasks (test_id, description, order_index, min_clicks, optimal_path_length)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [test_id, description, idx, min_clicks || null, optimal_path_length || null]
    );
    return result.rows[0];
  }

  static async listByTest(testId) {
    const result = await db.query(
      'SELECT * FROM tasks WHERE test_id = $1 ORDER BY order_index ASC;',
      [testId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Atualizar os parâmetros de caminho ótimo de uma tarefa existente
   * (útil se o pesquisador quiser ajustar depois de criada)
   */
  static async updateOptimalParams(taskId, { min_clicks, optimal_path_length }) {
    const result = await db.query(
      `UPDATE tasks SET
         min_clicks = COALESCE($1, min_clicks),
         optimal_path_length = COALESCE($2, optimal_path_length)
       WHERE id = $3
       RETURNING *;`,
      [min_clicks || null, optimal_path_length || null, taskId]
    );
    return result.rows[0] || null;
  }
}

module.exports = TaskService;
