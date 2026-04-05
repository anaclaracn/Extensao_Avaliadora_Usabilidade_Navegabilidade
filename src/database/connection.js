// Arquivo responsável pela conexão com o banco de dados PostgreSQL
// Utiliza a biblioteca 'pg' para estabelecer conexão

const { Pool } = require('pg');
const config = require('../config/env');

// Criar um pool de conexões com o banco de dados
// O pool gerencia múltiplas conexões reutilizáveis
const pool = new Pool({
  user: config.database.user,
  password: config.database.password,
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
});

console.log('CONFIG:', config.database);

// Evento para quando a conexão com o banco é estabelecida com sucesso
pool.on('connect', () => {
  console.log('📊 Conexão com banco de dados PostgreSQL estabelecida com sucesso!');
});

// Evento para tratar erros não capturados no pool
pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool de conexões:', err);
});

/**
 * Função para executar queries no banco de dados
 * @param {string} query - A query SQL a ser executada
 * @param {array} values - Os valores dos parâmetros da query (proteção contra SQL injection)
 * @returns {Promise} - Promise com o resultado da query
 */
const query = async (sql, values) => {
  try {
    const result = await pool.query(sql, values);
    return result;
  } catch (error) {
    console.error('❌ Erro ao executar query:', error);
    throw error;
  }
};

/**
 * Função para fechar a conexão com o banco de dados
 */
const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Conexão com o banco de dados foi encerrada.');
  } catch (error) {
    console.error('❌ Erro ao fechar a conexão:', error);
  }
};

module.exports = {
  query,
  closePool,
  pool,
};
