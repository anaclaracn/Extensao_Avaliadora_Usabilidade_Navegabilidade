// Middleware de validação dos dados de entrada
// Valida os campos mínimos antes de processar a requisição

/**
 * Middleware para validar dados de evento
 * Verifica se os campos obrigatórios estão presentes
 * 
 * Campos obrigatórios:
 * - type: tipo de evento (ex: 'click', 'scroll', 'keypress')
 * - timestamp: data/hora do evento
 */
const validateEventData = (req, res, next) => {
  try {
    const { type, timestamp } = req.body;

    // Validar se os campos obrigatórios existem
    if (!type || !timestamp) {
      return res.status(400).json({
        error: 'Campos obrigatórios faltando',
        requiredFields: ['type', 'timestamp'],
        message: 'Por favor, forneça os campos: type e timestamp',
      });
    }

    // Validar se type é uma string não vazia
    if (typeof type !== 'string' || type.trim().length === 0) {
      return res.status(400).json({
        error: 'Campo "type" inválido',
        message: 'O campo "type" deve ser uma string não vazia',
      });
    }

    // Validar se timestamp é uma data válida
    const timestamp_date = new Date(timestamp);
    if (isNaN(timestamp_date.getTime())) {
      return res.status(400).json({
        error: 'Campo "timestamp" inválido',
        message: 'O campo "timestamp" deve ser uma data válida (ISO 8601)',
        example: new Date().toISOString(),
      });
    }

    // Se passou na validação, continua para o próximo middleware/controller
    next();
  } catch (error) {
    console.error('❌ Erro na validação:', error);
    res.status(500).json({
      error: 'Erro ao validar dados',
      message: error.message,
    });
  }
};

module.exports = {
  validateEventData,
};
