// Controller de tarefas — gerencia criação e listagem de tarefas por teste

const TaskService = require('../services/taskService');

class TaskController {
  /**
   * POST /tasks
   * Cria uma tarefa para um teste
   */
  static async createTask(req, res) {
    try {
      const { test_id, description, order_index } = req.body;
      console.log(`📋 Criando tarefa para test_id=${test_id}`);

      const task = await TaskService.createTask({ test_id, description, order_index });

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
   * Lista tarefas de um teste (test_id obrigatório via query)
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
}

module.exports = TaskController;
