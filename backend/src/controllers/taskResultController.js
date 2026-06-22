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

  /**
   * POST /task-results/start
   * Body: { task_id, session_id, started_at }
   * Chamado pela extensão quando o participante clica "Começar"
   */
  static async startAttempt(req, res) {
    try {
      const { task_id, session_id, started_at } = req.body;
      if (!task_id || !session_id || !started_at) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios ausentes',
          missing: ['task_id', 'session_id', 'started_at'].filter(f => !req.body[f]),
        });
      }

      const attempt = await TaskResultService.startAttempt({ task_id, session_id, started_at });
      return res.status(201).json({
        success: true,
        message: 'Tentativa iniciada',
        result_id: attempt.id,
        data: attempt,
      });
    } catch (err) {
      console.error('❌ Erro ao iniciar tentativa:', err);
      if (err.code === '23503') {
        return res.status(400).json({ success: false, error: 'task_id ou session_id inválido' });
      }
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PATCH /task-results/:id/finish
   * Body: { finished_at, success, clicks }
   * Chamado pela extensão ao clicar Concluí ou Não consegui
   */
  static async finishAttempt(req, res) {
    try {
      const { finished_at, success, clicks } = req.body;
      if (!finished_at || success === undefined) {
        return res.status(400).json({
          success: false,
          error: 'finished_at e success são obrigatórios',
        });
      }

      const attempt = await TaskResultService.finishAttempt({
        result_id: req.params.id, finished_at, success, clicks: clicks || 0,
      });

      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Tentativa não encontrada' });
      }

      return res.status(200).json({
        success: true,
        message: 'Tentativa finalizada',
        data: attempt,
      });
    } catch (err) {
      console.error('❌ Erro ao finalizar tentativa:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /task-results/mark-stale-abandoned — marcar como 'abandoned'
   * Body: { stale_minutes: 30 }
   * Chamado pelo cron job para marcar tentativas que ficaram abertas por muito tempo como abandonadas
   */
  static async markStaleAbandoned(req, res) {
    try {
      const staleMinutes = parseInt(req.query.stale_minutes) || 30;
      const count = await TaskResultService.markStaleAttemptsAsAbandoned(staleMinutes);
      return res.status(200).json({
        success: true,
        message: `${count} tentativa(s) marcada(s) como abandonada(s)`,
        count,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = TaskResultController;
