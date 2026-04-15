// Controller de usuários — intermedia requisições HTTP e o UserService

const UserService = require('../services/userService');

class UserController {
  /**
   * POST /users
   * Cria um usuário anônimo com dados demográficos básicos
   */
  static async createUser(req, res) {
    try {
      const { age, gender, education_level } = req.body;
      console.log(`👤 Criando usuário: idade=${age}, gênero=${gender}`);

      const user = await UserService.createUser({ age, gender, education_level });

      return res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: user,
      });
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      return res.status(500).json({
        success: false,
        error:   'Erro ao criar usuário',
        message: error.message,
      });
    }
  }

  /**
   * GET /users/:id
   * Busca um usuário pelo ID (útil para verificação)
   */
  static async getUser(req, res) {
    try {
      const user = await UserService.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      }
      return res.status(200).json({ success: true, data: user });
    } catch (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = UserController;
