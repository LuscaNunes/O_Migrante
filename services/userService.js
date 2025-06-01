const bcrypt = require('bcryptjs');
const db = require('../config/database');

/**
 * Busca usuários com base em um termo de busca (ID, nome ou email)
 * @param {string|number} busca - Termo de busca
 * @returns {Promise<Array>} Lista de usuários
 */
async function buscarUsuarios(busca) {
  let sql = 'SELECT * FROM Usuarios WHERE 1=1';
  const params = [];

  if (busca) {
    if (!isNaN(busca)) {
      sql += ' AND id_usuario = ?';
      params.push(busca);
    } else {
      sql += ' AND (LOWER(nome) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))';
      params.push(`%${busca}%`, `%${busca}%`);
    }
  }

  try {
    const [results] = await db.promise().query(sql, params);
    return results;
  } catch (err) {
    throw new Error('Erro ao buscar usuários: ' + err.message);
  }
}

/**
 * Busca informações públicas de um usuário por ID
 * @param {number} id - ID do usuário
 * @returns {Promise<Object>} Dados públicos do usuário
 */
async function buscarUsuarioPublico(id) {
  try {
    const [results] = await db.promise().query(
      'SELECT id_usuario, nome, email, xp_total, fase_atual, tipo, criado_em FROM Usuarios WHERE id_usuario = ?',
      [id]
    );
    if (results.length === 0) {
      throw new Error('Usuário não encontrado');
    }
    return results[0];
  } catch (err) {
    throw new Error('Erro ao buscar usuário: ' + err.message);
  }
}

/**
 * Busca um usuário por ID
 * @param {number} id - ID do usuário
 * @returns {Promise<Object>} Dados completos do usuário
 */
async function buscarUsuarioPorId(id) {
  try {
    const [results] = await db.promise().query('SELECT * FROM Usuarios WHERE id_usuario = ?', [id]);
    if (results.length === 0) {
      throw new Error('Usuário não encontrado');
    }
    return results[0];
  } catch (err) {
    throw new Error('Erro ao buscar usuário: ' + err.message);
  }
}

/**
 * Atualiza um usuário (admin)
 * @param {number} id - ID do usuário
 * @param {Object} dados - Dados a atualizar (nome, email, tipo, xp_total, fase_atual)
 * @returns {Promise<void>}
 */
async function atualizarUsuario(id, { nome, email, tipo, xp_total, fase_atual }) {
  if (!nome || !email || !tipo || !xp_total || !fase_atual) {
    throw new Error('Preencha todos os campos');
  }

  try {
    const [result] = await db.promise().query(
      'UPDATE Usuarios SET nome = ?, email = ?, tipo = ?, xp_total = ?, fase_atual = ? WHERE id_usuario = ?',
      [nome, email, tipo, xp_total, fase_atual, id]
    );
    if (result.affectedRows === 0) {
      throw new Error('Usuário não encontrado');
    }
  } catch (err) {
    throw new Error('Erro ao editar usuário: ' + err.message);
  }
}

/**
 * Atualiza o perfil do usuário autenticado
 * @param {number} usuario_id - ID do usuário
 * @param {Object} dados - Dados a atualizar (nome, email, senha)
 * @returns {Promise<void>}
 */
async function atualizarPerfil(usuario_id, { nome, email, senha }) {
  if (!nome) {
    throw new Error('O nome é obrigatório');
  }

  try {
    const [currentUser] = await db.promise().query('SELECT email FROM Usuarios WHERE id_usuario = ?', [usuario_id]);
    if (currentUser.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    const finalEmail = email || currentUser[0].email;

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Email inválido');
      }
      const [existingUser] = await db.promise().query(
        'SELECT id_usuario FROM Usuarios WHERE email = ? AND id_usuario != ?',
        [email, usuario_id]
      );
      if (existingUser.length > 0) {
        throw new Error('Este email já está em uso');
      }
    }

    const queryParams = [nome, finalEmail];
    let updateQuery = 'UPDATE Usuarios SET nome = ?, email = ?';

    if (senha) {
      if (senha.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
      }
      const hashedPassword = await bcrypt.hash(senha, 10);
      queryParams.push(hashedPassword);
      updateQuery += ', senha = ?';
    }

    queryParams.push(usuario_id);
    updateQuery += ' WHERE id_usuario = ?';

    const [result] = await db.promise().query(updateQuery, queryParams);
    if (result.affectedRows === 0) {
      throw new Error('Usuário não encontrado');
    }
  } catch (error) {
    throw new Error('Erro ao atualizar perfil: ' + error.message);
  }
}

module.exports = {
  buscarUsuarios,
  buscarUsuarioPublico,
  buscarUsuarioPorId,
  atualizarUsuario,
  atualizarPerfil
};