// Arquivo principal do servidor Express
// Inicializa a aplicação e configura todos os middlewares e rotas

const express = require("express");
const corsMiddleware = require("./src/middleware/corsMiddleware");
const config = require("./src/config/env");
const eventRoutes = require("./src/routes/events");

// Criar uma aplicação Express
const app = express();

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Middleware de CORS - permite requisições de origens diferentes
app.use(corsMiddleware);

// Middleware para parsear JSON no corpo da requisição
// Limita o tamanho do payload a 10MB
app.use(express.json({ limit: "10mb" }));

// Middleware para parsear dados de formulário
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Middleware customizado para logs simples
app.use((req, res, next) => {
  console.log(
    `\n📨 ${new Date().toLocaleTimeString()} - ${req.method} ${req.path}`,
  );
  next();
});

// ============================================
// ROTAS
// ============================================

/**
 * Rota raiz - Health check
 * GET /
 *
 * Retorna informações sobre o servidor para verificar se está rodando
 */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Backend TCC-UX rodando com sucesso! 🚀",
    version: "1.0.0",
    status: "online",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Rotas de eventos
 * Prefixo: /events
 */
app.use("/events", eventRoutes);

// ============================================
// TRATAMENTO DE ROTAS NÃO ENCONTRADAS
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: "Rota não encontrada",
    path: req.path,
    method: req.method,
    message: `O endpoint ${req.method} ${req.path} não existe`,
  });
});

// ============================================
// TRATAMENTO DE ERROS
// ============================================

app.use((error, req, res, next) => {
  console.error("❌ Erro não tratado:", error);
  res.status(500).json({
    error: "Erro interno do servidor",
    message: error.message,
  });
});

// ============================================
// INICIAR O SERVIDOR
// ============================================

const PORT = config.server.port;
const NODE_ENV = config.server.nodeEnv;

const server = app.listen(PORT, () => {
  console.log("\n========================================");
  console.log("🎯 Backend TCC-UX iniciado!");
  console.log("========================================");
  console.log(`🌐 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`📍 Ambiente: ${NODE_ENV}`);
  console.log(`📊 Banco de dados: ${config.database.database}`);
  console.log(`🔗 Host do BD: ${config.database.host}:${config.database.port}`);
  console.log("========================================\n");
});

// Graceful shutdown - encerrar conexões quando o servidor desliga
process.on("SIGTERM", async () => {
  console.log("\n📴 Sinal SIGTERM recebido. Encerrando servidor...");
  server.close(() => {
    console.log("✅ Servidor encerrado");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("\n📴 Sinal SIGINT recebido. Encerrando servidor...");
  server.close(() => {
    console.log("✅ Servidor encerrado");
    process.exit(0);
  });
});

// Exportar app para testes ou uso externo
module.exports = app;
