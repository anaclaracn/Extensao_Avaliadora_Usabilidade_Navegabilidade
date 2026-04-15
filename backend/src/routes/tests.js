// Rotas de testes de usabilidade
const express = require('express');
const TestController = require('../controllers/testController');
const { validateTest } = require('../middleware/validationMiddleware');

const router = express.Router();

// POST /tests — criar teste
router.post('/', validateTest, TestController.createTest);

// GET /tests — listar todos (?site_id= para filtrar)
router.get('/', TestController.listTests);

// GET /tests/:id — buscar por ID
router.get('/:id', TestController.getTest);

module.exports = router;
