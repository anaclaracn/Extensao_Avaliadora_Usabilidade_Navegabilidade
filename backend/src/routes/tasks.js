// Rotas de tarefas
const express = require('express');
const TaskController = require('../controllers/taskController');
const { validateTask } = require('../middleware/validationMiddleware');

const router = express.Router();

// POST /tasks — criar tarefa (aceita min_clicks, optimal_path_length opcionais)
router.post('/', validateTask, TaskController.createTask);

// GET /tasks?test_id= — listar tarefas de um teste
router.get('/', TaskController.listTasks);

// PATCH /tasks/:id/optimal-params — ajustar parâmetros de caminho ótimo
router.patch('/:id/optimal-params', TaskController.updateOptimalParams);

module.exports = router;
