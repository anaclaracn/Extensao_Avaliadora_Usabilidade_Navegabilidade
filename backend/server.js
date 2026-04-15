// ============================================================
// server.js — Ponto de entrada do backend TCC-UX (v2.0)
// ============================================================

const express        = require('express');
const corsMiddleware = require('./src/middleware/corsMiddleware');
const config         = require('./src/config/env');

// ── Importar rotas ───────────────────────────────────────────
const userRoutes       = require('./src/routes/users');
const sessionRoutes    = require('./src/routes/sessions');
const eventRoutes      = require('./src/routes/events');
const testRoutes       = require('./src/routes/tests');
const taskRoutes       = require('./src/routes/tasks');
const taskResultRoutes = require('./src/routes/taskResults');

const app = express();

// ============================================================
// MIDDLEWARES GLOBAIS
// ============================================================

// CORS — permite requisições da extensão e de outros frontends
app.use(corsMiddleware);

// Parser de JSON e form-data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log simples de toda requisição recebida
app.use((req, res, next) => {
  console.log(`\n📨 ${new Date().toLocaleTimeString()} — ${req.method} ${req.path}`);
  next();
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/', (req, res) => {
  res.status(200).json({
    message:   'Backend TCC-UX v2.0 rodando com sucesso! 🚀',
    version:   '2.0.0',
    status:    'online',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST   /users',
      'GET    /users/:id',
      'POST   /sessions',
      'GET    /sessions/:id',
      'PATCH  /sessions/:id/end',
      'POST   /events',
      'GET    /events',
      'GET    /events/stats',
      'POST   /tests',
      'GET    /tests',
      'GET    /tests/:id',
      'POST   /tasks',
      'GET    /tasks?test_id=',
      'POST   /task-results',
      'GET    /task-results?session_id= | ?task_id=',
      'GET    /task-results/stats?test_id=',
    ],
  });
});

// ============================================================
// ROTAS
// ============================================================

app.use('/users',        userRoutes);
app.use('/sessions',     sessionRoutes);
app.use('/events',       eventRoutes);
app.use('/tests',        testRoutes);
app.use('/tasks',        taskRoutes);
app.use('/task-results', taskResultRoutes);

// ============================================================
// ROTA NÃO ENCONTRADA
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    error:   'Rota não encontrada',
    path:    req.path,
    method:  req.method,
    message: `O endpoint ${req.method} ${req.path} não existe`,
  });
});

// ============================================================
// TRATAMENTO GLOBAL DE ERROS
// ============================================================

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({
    error:   'Erro interno do servidor',
    message: error.message,
  });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================

const PORT     = config.server.port;
const NODE_ENV = config.server.nodeEnv;

const server = app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🎯 Backend TCC-UX v2.0 iniciado!');
  console.log('========================================');
  console.log(`🌐 Servidor: http://localhost:${PORT}`);
  console.log(`📍 Ambiente: ${NODE_ENV}`);
  console.log(`📊 Banco:    ${config.database.database}`);
  console.log(`🔗 BD Host:  ${config.database.host}:${config.database.port}`);
  console.log('========================================\n');
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n📴 Sinal ${signal} recebido. Encerrando servidor...`);
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
