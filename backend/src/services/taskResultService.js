// Service de resultados de tarefas — registra o desempenho do participante
// em cada tarefa de um teste de usabilidade

const db = require('../database/connection');

class TaskResultService {
  /**
   * Salvar o resultado de uma tarefa realizada pelo participante
   * @param {{
   *   task_id:     number,
   *   session_id:  number,
   *   started_at:  string,
   *   finished_at: string,
   *   success:     boolean,
   *   clicks:      number
   * }} data
   * @returns {Promise<Object>}
   */
  static async createResult(data) {
    const { task_id, session_id, started_at, finished_at, success, clicks } = data;

    const result = await db.query(
      `INSERT INTO task_results
         (task_id, session_id, started_at, finished_at, success, clicks)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [task_id, session_id, started_at, finished_at, success, clicks]
    );
    return result.rows[0];
  }

  /**
   * Listar resultados de uma sessão específica
   * @param {number} sessionId
   * @returns {Promise<Array>}
   */
  static async listBySession(sessionId) {
    const result = await db.query(
      `SELECT tr.*, t.description AS task_description
       FROM task_results tr
       JOIN tasks t ON t.id = tr.task_id
       WHERE tr.session_id = $1
       ORDER BY tr.started_at ASC;`,
      [sessionId]
    );
    return result.rows;
  }

  /**
   * Listar resultados de uma tarefa específica com métricas agregadas
   * @param {number} taskId
   * @returns {Promise<Array>}
   */
  static async listByTask(taskId) {
    const result = await db.query(
      `SELECT
         tr.*,
         EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at)) AS duration_seconds
       FROM task_results tr
       WHERE tr.task_id = $1
       ORDER BY tr.started_at ASC;`,
      [taskId]
    );
    return result.rows;
  }

  /**
   * Métricas agregadas de um teste inteiro (taxa de sucesso, tempo médio, etc.)
   * @param {number} testId
   * @returns {Promise<Array>}
   */
  static async statsByTest(testId) {
    const result = await db.query(
      `SELECT
         t.id                                              AS task_id,
         t.description,
         t.order_index,
         COUNT(tr.id)                                     AS total_participantes,
         SUM(CASE WHEN tr.success THEN 1 ELSE 0 END)      AS total_sucesso,
         ROUND(
           100.0 * SUM(CASE WHEN tr.success THEN 1 ELSE 0 END) / COUNT(tr.id),
           2
         )                                                AS taxa_sucesso_pct,
         ROUND(AVG(tr.clicks), 2)                         AS media_clicks,
         ROUND(AVG(
           EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at))
         ), 2)                                            AS media_duracao_segundos
       FROM tasks t
       LEFT JOIN task_results tr ON tr.task_id = t.id
       WHERE t.test_id = $1
       GROUP BY t.id, t.description, t.order_index
       ORDER BY t.order_index ASC;`,
      [testId]
    );
    return result.rows;
  }

  /**
   * Criar registro de INÍCIO de tentativa (chamado quando o
   * participante clica "Começar" na tarefa, antes de saber o resultado)
   */
  static async startAttempt({ task_id, session_id, started_at }) {
    const result = await db.query(
      `INSERT INTO task_results (task_id, session_id, started_at, status)
       VALUES ($1, $2, $3, 'started')
       RETURNING *;`,
      [task_id, session_id, started_at]
    );
    return result.rows[0];
  }

  /**
   * Finalizar uma tentativa já existente (chamado ao clicar
   * Concluí ou Não consegui). Atualiza o registro criado por
   * startAttempt em vez de criar um novo.
   */
  static async finishAttempt({ result_id, finished_at, success, clicks }) {
    const result = await db.query(
      `UPDATE task_results
       SET finished_at = $1, success = $2, clicks = $3, status = 'completed'
       WHERE id = $4
       RETURNING *;`,
      [finished_at, success, clicks, result_id]
    );
    return result.rows[0] || null;
  }

  /**
   * Marcar tentativas órfãs como abandonadas: registros com
   * status='started' cuja sessão já foi encerrada (sessions.ended_at
   * preenchido) há mais de N minutos, mas nunca foram finalizados.
   * Pode ser chamado periodicamente (cron) ou ao consultar métricas.
   */
  static async markStaleAttemptsAsAbandoned(staleMinutes = 30) {
    const result = await db.query(
      `UPDATE task_results tr
       SET status = 'abandoned'
       FROM sessions s
       WHERE tr.session_id = s.id
         AND tr.status = 'started'
         AND (
           s.ended_at IS NOT NULL
           OR tr.started_at < NOW() - INTERVAL '${staleMinutes} minutes'
         )
       RETURNING tr.id;`
    );
    return result.rows.length;
  }
}

module.exports = TaskResultService;
