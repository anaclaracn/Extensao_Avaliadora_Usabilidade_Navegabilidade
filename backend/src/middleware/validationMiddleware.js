// Middlewares de validação simples para cada rota
// Verificam se os campos obrigatórios foram enviados antes de chegar ao controller

/**
 * Retorna um middleware que verifica campos obrigatórios no body
 * @param {string[]} requiredFields
 */
const requireFields = (requiredFields) => (req, res, next) => {
  const missing = requiredFields.filter((f) => {
    const val = req.body[f];
    return val === undefined || val === null || val === '';
  });

  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      error:   'Campos obrigatórios ausentes',
      missing,
    });
  }
  next();
};

// ── Validadores específicos por rota ────────────────────────────────────────

/** POST /users — cria usuário anônimo */
const validateUser = requireFields(['age', 'gender', 'education_level']);

/** POST /sessions — cria sessão */
const validateSession = requireFields(['user_id', 'site_url']);

/** POST /events — registra evento vinculado a sessão */
const validateEvent = requireFields(['session_id', 'type', 'timestamp']);

/** POST /tests — aceita site_id OU site_url */
const validateTest = (req, res, next) => {
  const { name, site_id, site_url } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes', missing: ['name'] });
  }
  if (!site_id && !site_url) {
    return res.status(400).json({ success: false, error: 'Informe site_id ou site_url' });
  }
  next();
};

/** POST /tasks — cria tarefa para um teste */
const validateTask = requireFields(['test_id', 'description']);

/** POST /task-results — salva resultado de tarefa */
const validateTaskResult = requireFields([
  'task_id',
  'session_id',
  'started_at',
  'finished_at',
  'success',
  'clicks',
]);

module.exports = {
  requireFields,
  validateUser,
  validateSession,
  validateEvent,
  validateTest,
  validateTask,
  validateTaskResult,
};
