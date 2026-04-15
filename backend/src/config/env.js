// Centraliza o carregamento e validação das variáveis de ambiente
require('dotenv').config();

const config = {
  server: {
    port:    process.env.PORT    || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT) || 5433,
    database: process.env.DB_NAME     || 'tcc_ux',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
};

module.exports = config;
