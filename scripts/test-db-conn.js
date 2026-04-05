// Script de teste de conexão com PostgreSQL usando as mesmas configs da aplicação
require("dotenv").config();
const { Pool } = require("pg");
const config = require("../src/config/env").database;

const pool = new Pool({
  user: config.user,
  password: config.password,
  host: config.host,
  port: config.port,
  database: config.database,
});

(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Conectou ao PostgreSQL com sucesso.");
    const res = await client.query("SELECT 1 AS ok");
    console.log("Resultado do teste:", res.rows);
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("❌ Erro de conexão:", err.message);
    console.error(err);
    process.exit(1);
  }
})();
