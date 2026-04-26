// Rotas de pesquisadores
const express              = require('express');
const ResearcherController = require('../controllers/researcherController');
const { requireFields }    = require('../middleware/validationMiddleware');

const router = express.Router();

// POST /researchers/register — cadastrar (requer master_password)
router.post(
  '/register',
  requireFields(['name', 'email', 'password', 'master_password']),
  ResearcherController.register
);

// POST /researchers/login — autenticar
router.post(
  '/login',
  requireFields(['email', 'password']),
  ResearcherController.login
);

// GET /researchers — listar todos (uso interno / debug)
router.get('/', ResearcherController.listAll);

module.exports = router;
