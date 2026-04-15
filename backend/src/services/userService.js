// Service de usuários — contém toda a lógica de negócio e acesso ao banco
// para operações relacionadas a usuários anônimos

const db = require('../database/connection');

class UserService {
  /**
   * Criar um novo usuário anônimo
   * @param {{ age: number, gender: string, education_level: string }} data
   * @returns {Promise<Object>} usuário criado
   */
  static async createUser(data) {
    const { age, gender, education_level } = data;

    const query = `
      INSERT INTO users (age, gender, education_level)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const result = await db.query(query, [age, gender, education_level]);
    return result.rows[0];
  }

  /**
   * Buscar um usuário pelo ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = UserService;
