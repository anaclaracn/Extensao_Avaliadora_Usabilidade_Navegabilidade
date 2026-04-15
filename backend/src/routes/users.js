// Rotas de usuários
const express    = require('express');
const UserController = require('../controllers/userController');
const { validateUser } = require('../middleware/validationMiddleware');

const router = express.Router();

// POST /users — criar usuário anônimo
router.post('/', validateUser, UserController.createUser);

// GET /users/:id — buscar usuário por ID
router.get('/:id', UserController.getUser);

module.exports = router;
