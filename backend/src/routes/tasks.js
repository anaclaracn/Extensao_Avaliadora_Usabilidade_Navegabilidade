// Rotas de tarefas
const express = require('express');
const TaskController = require('../controllers/taskController');
const { validateTask } = require('../middleware/validationMiddleware');

const router = express.Router();

// POST /tasks — criar tarefa
router.post('/', validateTask, TaskController.createTask);

// GET /tasks?test_id= — listar tarefas de um teste
router.get('/', TaskController.listTasks);

module.exports = router;
