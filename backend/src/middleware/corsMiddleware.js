// Middleware de CORS — permite que a extensão de navegador e frontends
// se comuniquem com a API mesmo vindos de origens diferentes

const cors = require('cors');

const corsOptions = {
  origin: '*',              // Em produção, substitua por origens específicas
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);
