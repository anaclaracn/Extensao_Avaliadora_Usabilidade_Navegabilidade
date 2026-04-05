// Middleware de CORS (Cross-Origin Resource Sharing)
// Permite que a extensão do navegador acesse este backend

const cors = require('cors');

/**
 * Configuração de CORS para aceitar requisições da extensão de navegador
 * e de aplicações locais
 */
const corsOptions = {
  // Origens permitidas para acessar o backend
  // Ajuste conforme necessário para segurança em produção
  origin: [
    'http://localhost:*',      // Aceita localhost em qualquer porta
    'http://127.0.0.1:*',      // Aceita 127.0.0.1 em qualquer porta
    // Para produção, adicione o domínio específico:
    // 'https://seu-dominio.com'
  ],
  
  // Métodos HTTP permitidos
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  
  // Headers permitidos
  allowedHeaders: ['Content-Type', 'Authorization'],
  
  // Permite que credenciais sejam enviadas
  credentials: true,
  
  // Tempo máximo (em segundos) para cache da preflight request
  maxAge: 3600,
};

module.exports = cors(corsOptions);
