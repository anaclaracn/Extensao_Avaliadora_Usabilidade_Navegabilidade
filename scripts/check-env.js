// Script de verificação: carrega a configuração e imprime valores-chave (mas não imprime a senha inteira)
require("dotenv").config();
const config = require("../src/config/env");

console.log("DB_USER=", config.database.user);
console.log(
  "DB_PASSWORD_PRESENT=",
  config.database.password ? "***" : "(vazio)",
);
console.log("DB_HOST=", config.database.host);
console.log("DB_PORT=", config.database.port);
console.log("DB_NAME=", config.database.database);

// Saída legível para testes automatizados
process.exit(0);
