const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, checkAdmin } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

/**
 * Rota para buscar usuários (filtro por ID, nome ou email)
 * GET /usuarios
 * Requer autenticação e permissão de admin
 */
router.get('/', authenticateToken, checkAdmin, async (req, res) => {
  const { busca } = req.query;

  if (!busca) {
    return res.status(400).json({ error: 'Parâmetro de busca não fornecido.' });
  }

  let sql = 'SELECT * FROM Usuarios WHERE 1=1';
  const params = [];

  if (!isNaN(busca)) {
    sql += ' AND id_usuario = ?';
    params.push(busca);
  } else {
    sql += ' AND (LOWER(nome) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))';
    params.push(`%${busca}%`, `%${busca}%`);
  }

  try {
    const [results] = await db.promise().query(sql, params);
    res.json({ usuarios: results });
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

/**
 * Rota para buscar informações públicas de um usuário
 * GET /usuarios/public/:id
 * Requer autenticação
 */
router.get('/public/:id', authenticateToken, async (req, res) => {
  try {
    const [results] = await db.promise().query(
      'SELECT id_usuario, nome, email, xp_total, fase_atual, tipo, criado_em FROM Usuarios WHERE id_usuario = ?',
      [req.params.id]
    );
    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    res.json(results[0]);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

/**
 * Rota para buscar um usuário por ID
 * GET /usuarios/:id
 * Requer autenticação e permissão de admin
 */
router.get('/:id', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const [results] = await db.promise().query('SELECT * FROM Usuarios WHERE id_usuario = ?', [req.params.id]);
    if (results.length === 0) {
      return res.status(404).send('Usuário não encontrado.');
    }
    res.send(results[0]);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).send('Erro ao buscar usuário.');
  }
});

/**
 * Rota para atualizar um usuário
 * PUT /usuarios/:id
 * Requer autenticação e permissão de admin
 */
router.put('/:id', authenticateToken, checkAdmin, async (req, res) => {
  const { nome, email, tipo, xp_total, fase_atual } = req.body;

  if (!nome || !email || !tipo || !xp_total || !fase_atual) {
    return res.status(400).json({ success: false, message: 'Preencha todos os campos.' });
  }

  try {
    const [result] = await db.promise().query(
      'UPDATE Usuarios SET nome = ?, email = ?, tipo = ?, xp_total = ?, fase_atual = ? WHERE id_usuario = ?',
      [nome, email, tipo, xp_total, fase_atual, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }
    res.json({ success: true, message: 'Usuário atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao editar usuário:', err);
    res.status(500).json({ success: false, message: 'Erro ao editar usuário.' });
  }
});

/**
 * Rota para atualizar o perfil do usuário autenticado
 * PUT /usuarios/atualizar
 * Requer autenticação
 */
router.put('/atualizar', authenticateToken, async (req, res) => {
  const { nome, email, senha } = req.body;
  const usuario_id = req.user.id;

  if (!nome) {
    return res.status(400).json({ success: false, message: 'O nome é obrigatório.' });
  }

  try {
    const [currentUser] = await db.promise().query('SELECT email FROM Usuarios WHERE id_usuario = ?', [usuario_id]);
    if (currentUser.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const finalEmail = email || currentUser[0].email;

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Email inválido.' });
      }
      const [existingUser] = await db.promise().query(
        'SELECT id_usuario FROM Usuarios WHERE email = ? AND id_usuario != ?',
        [email, usuario_id]
      );
      if (existingUser.length > 0) {
        return res.status(400).json({ success: false, message: 'Este email já está em uso.' });
      }
    }

    const updateData = { nome, email: finalEmail };
    const queryParams = [nome, finalEmail];

    if (senha) {
      if (senha.length < 6) {
        return res.status(400).json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres.' });
      }
      const hashedPassword = await bcrypt.hash(senha, 10);
      updateData.senha = hashedPassword;
      queryParams.push(hashedPassword);
    }

    queryParams.push(usuario_id);
    const updateQuery = `UPDATE Usuarios SET nome = ?, email = ?${senha ? ', senha = ?' : ''} WHERE id_usuario = ?`;
    const [result] = await db.promise().query(updateQuery, queryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    res.json({ success: true, message: 'Perfil atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar perfil.' });
  }
});

module.exports = router;