// Controller de tarefas — gerencia criação e listagem de tarefas por teste

const TaskService = require('../services/taskService');

class TaskController {
  /**
   * POST /tasks
   * Cria uma tarefa para um teste. Aceita min_clicks e optimal_path_length
   * opcionalmente, para habilitar métricas de eficiência e lostness.
   */
  static async createTask(req, res) {
    try {
      const { test_id, description, order_index, min_clicks, optimal_path_length } = req.body;
      console.log(`📋 Criando tarefa para test_id=${test_id} (min_clicks=${min_clicks}, optimal_path=${optimal_path_length})`);

      const task = await TaskService.createTask({
        test_id, description, order_index, min_clicks, optimal_path_length,
      });

      return res.status(201).json({
        success: true,
        message: 'Tarefa criada com sucesso',
        data:    task,
      });
    } catch (error) {
      console.error('❌ Erro ao criar tarefa:', error);

      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          error:   'test_id inválido — teste não encontrado',
        });
      }

      return res.status(500).json({
        success: false,
        error:   'Erro ao criar tarefa',
        message: error.message,
      });
    }
  }

  /**
   * GET /tasks?test_id=
   */
  static async listTasks(req, res) {
    try {
      const { test_id } = req.query;
      if (!test_id) {
        return res.status(400).json({
          success: false,
          error:   'Parâmetro test_id é obrigatório na query string',
        });
      }

      const tasks = await TaskService.listByTest(test_id);
      return res.status(200).json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
      console.error('❌ Erro ao listar tarefas:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /tasks/:id/optimal-params
   * Atualiza min_clicks / optimal_path_length de uma tarefa existente
   */
  static async updateOptimalParams(req, res) {
    try {
      const { min_clicks, optimal_path_length } = req.body;
      const task = await TaskService.updateOptimalParams(req.params.id, { min_clicks, optimal_path_length });
      if (!task) return res.status(404).json({ success: false, error: 'Tarefa não encontrada' });
      return res.status(200).json({ success: true, data: task });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = TaskController;
