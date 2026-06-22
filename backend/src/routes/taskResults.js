// Rotas de resultados de tarefas
const express = require('express');
const TaskResultController = require('../controllers/taskResultController');
const { validateTaskResult } = require('../middleware/validationMiddleware');

const router = express.Router();

// POST /task-results — salvar resultado
router.post('/', validateTaskResult, TaskResultController.createResult);

// POST /task-results/start — iniciar tentativa
router.post('/start',          TaskResultController.startAttempt);

// PATCH /task-results/:id/finish — finalizar tentativa
router.patch('/:id/finish',    TaskResultController.finishAttempt);

// POST /task-results/mark-stale-abandoned — marcar como 'abandoned'
router.post('/mark-stale-abandoned', TaskResultController.markStaleAbandoned);

// GET /task-results?session_id= OU ?task_id= — listar resultados
router.get('/', TaskResultController.listResults);

// GET /task-results/stats?test_id= — métricas por teste
router.get('/stats', TaskResultController.statsByTest);

module.exports = router;
