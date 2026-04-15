// Módulo de conexão com o banco de dados PostgreSQL
// Utiliza um pool de conexões para melhor performance e reutilização

const { Pool } = require('pg');
const config = require('../config/env');

// Criar pool de conexões com as configurações do ambiente
const pool = new Pool({
  host:     config.database.host,
  port:     config.database.port,
  database: config.database.database,
  user:     config.database.user,
  password: config.database.password,
});

// Evento de conexão bem-sucedida
pool.on('connect', () => {
  console.log('✅ Nova conexão com o banco de dados estabelecida');
});

// Evento de erro no pool
pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool do banco de dados:', err);
  process.exit(-1);
});

/**
 * Executa uma query parametrizada no banco de dados
 * @param {string} text  - Texto da query SQL
 * @param {Array}  params - Parâmetros da query
 * @returns {Promise<QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };
