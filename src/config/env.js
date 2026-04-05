// Arquivo de configuração de variáveis de ambiente
// Carrega as variáveis do arquivo .env usando dotenv
require("dotenv").config();

module.exports = {
  // Variáveis do banco de dados
  database: {
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || "tcc_ux",
  },

  // Variáveis do servidor
  server: {
    port: process.env.SERVER_PORT || 3000,
    nodeEnv: process.env.NODE_ENV || "development",
  },
};
