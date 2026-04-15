// Controller de resultados de tarefas — registra e consulta desempenho

const TaskResultService = require('../services/taskResultService');

class TaskResultController {
  /**
   * POST /task-results
   * Salva o resultado de uma tarefa executada por um participante
   */
  static async createResult(req, res) {
    try {
      const { task_id, session_id, started_at, finished_at, success, clicks } = req.body;
      console.log(`📊 Resultado: task_id=${task_id}, session_id=${session_id}, sucesso=${success}`);

      const result = await TaskResultService.createResult({
        task_id,
        session_id,
        started_at,
        finished_at,
        success,
        clicks,
      });

      return res.status(201).json({
        success: true,
        message: 'Resultado registrado com sucesso',
        data:    result,
      });
    } catch (error) {
      console.error('❌ Erro ao registrar resultado:', error);

      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          error:   'task_id ou session_id inválido',
        });
      }

      return res.status(500).json({
        success: false,
        error:   'Erro ao registrar resultado',
        message: error.message,
      });
    }
  }

  /**
   * GET /task-results?session_id= OU ?task_id=
   * Lista resultados filtrados por sessão ou tarefa
   */
  static async listResults(req, res) {
    try {
      const { session_id, task_id } = req.query;

      if (!session_id && !task_id) {
        return res.status(400).json({
          success: false,
          error:   'Informe session_id ou task_id como parâmetro de query',
        });
      }

      const results = session_id
        ? await TaskResultService.listBySession(session_id)
        : await TaskResultService.listByTask(task_id);

      return res.status(200).json({ success: true, count: results.length, data: results });
    } catch (error) {
      console.error('❌ Erro ao listar resultados:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /task-results/stats?test_id=
   * Métricas agregadas por teste (taxa de sucesso, tempo médio, clicks médios)
   */
  static async statsByTest(req, res) {
    try {
      const { test_id } = req.query;
      if (!test_id) {
        return res.status(400).json({
          success: false,
          error:   'Parâmetro test_id é obrigatório',
        });
      }

      const stats = await TaskResultService.statsByTest(test_id);
      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = TaskResultController;
