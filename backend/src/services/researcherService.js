// Service de pesquisadores
// Hash de senha com crypto nativo do Node (SHA-256 + salt por usuário)

const crypto = require('crypto');
const db     = require('../database/connection');

// Senha mestra para autorizar o cadastro — altere aqui quando quiser
const MASTER_PASSWORD = 'master2025';

class ResearcherService {

  // ── Hash ──────────────────────────────────────────────────
  static generateSalt() {
    return crypto.randomBytes(16).toString('hex');
  }

  static hashPassword(password, salt) {
    return crypto
      .createHash('sha256')
      .update(salt + password)
      .digest('hex');
  }

  // ── Cadastro ──────────────────────────────────────────────
  /**
   * Cadastrar novo pesquisador
   * Valida a senha mestra antes de criar
   */
  static async register({ name, email, password, masterPassword }) {
    // Validar senha mestra
    if (masterPassword !== MASTER_PASSWORD) {
      const err = new Error('Senha mestra incorreta');
      err.code  = 'INVALID_MASTER';
      throw err;
    }

    // Verificar e-mail duplicado
    const existing = await db.query(
      'SELECT id FROM researchers WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      const err = new Error('E-mail já cadastrado');
      err.code  = 'EMAIL_TAKEN';
      throw err;
    }

    const salt    = ResearcherService.generateSalt();
    const pwdHash = ResearcherService.hashPassword(password, salt);

    const result = await db.query(
      `INSERT INTO researchers (name, email, pwd_hash, salt)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, created_at;`,
      [name, email.toLowerCase(), pwdHash, salt]
    );

    console.log(`✅ Pesquisador cadastrado: ${email}`);
    return result.rows[0];
  }

  // ── Login ─────────────────────────────────────────────────
  /**
   * Autenticar pesquisador por e-mail e senha
   * Retorna os dados públicos (sem hash/salt) ou lança erro
   */
  static async login({ email, password }) {
    const result = await db.query(
      'SELECT * FROM researchers WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      const err = new Error('E-mail ou senha incorretos');
      err.code  = 'INVALID_CREDENTIALS';
      throw err;
    }

    const researcher = result.rows[0];
    const hash       = ResearcherService.hashPassword(password, researcher.salt);

    if (hash !== researcher.pwd_hash) {
      const err = new Error('E-mail ou senha incorretos');
      err.code  = 'INVALID_CREDENTIALS';
      throw err;
    }

    console.log(`🔑 Login: ${email}`);
    return {
      id:         researcher.id,
      name:       researcher.name,
      email:      researcher.email,
      created_at: researcher.created_at,
    };
  }

  // ── Listagem ──────────────────────────────────────────────
  static async listAll() {
    const result = await db.query(
      'SELECT id, name, email, created_at FROM researchers ORDER BY created_at DESC'
    );
    return result.rows;
  }
}

module.exports = ResearcherService;
