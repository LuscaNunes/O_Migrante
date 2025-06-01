const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

/**
 * Rota para criar uma nova anotação
 * POST /anotacoes
 * Requer autenticação
 */
router.post('/', authenticateToken, async (req, res) => {
  const { versao, livro, capitulo, versiculo, texto_versiculo, texto_anotacao } = req.body;
  const usuario_id = req.user.id;

  // Validação dos campos
  if (!versao || !livro || !capitulo || !versiculo || !texto_versiculo || !texto_anotacao) {
    return res.status(400).json({
      success: false,
      message: 'Todos os campos são obrigatórios.'
    });
  }

  // Validações adicionais
  if (typeof capitulo !== 'number' || capitulo <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Capítulo deve ser um número positivo.'
    });
  }
  if (typeof versiculo !== 'number' || versiculo <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Versículo deve ser um número positivo.'
    });
  }

  try {
    // Inserir a anotação
    const [result] = await db.promise().query(
      `INSERT INTO Anotacoes 
       (usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, texto_anotacao) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, texto_anotacao]
    );

    // Buscar a anotação recém-criada para retorno
    const [anotacao] = await db.promise().query(
      `SELECT 
         id_anotacao,
         usuario_id,
         versao,
         livro,
         capitulo,
         versiculo,
         texto_versiculo,
         texto_anotacao,
         criado_em
       FROM Anotacoes 
       WHERE id_anotacao = ?`,
      [result.insertId]
    );

    res.json({
      success: true,
      message: 'Anotação salva com sucesso.',
      data: anotacao[0]
    });
  } catch (err) {
    console.error('Erro ao salvar anotação:', err);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar anotação.'
    });
  }
});

/**
 * Rota para listar anotações do usuário autenticado
 * GET /anotacoes
 * Requer autenticação
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const [anotacoes] = await db.promise().query(
      `SELECT 
         id_anotacao,
         versao,
         livro,
         capitulo,
         versiculo,
         texto_versiculo,
         texto_anotacao,
         criado_em
       FROM Anotacoes
       WHERE usuario_id = ?
       ORDER BY criado_em DESC`,
      [usuario_id]
    );
    res.json({
      success: true,
      anotacoes
    });
  } catch (error) {
    console.error('Erro ao buscar anotações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar anotações.'
    });
  }
});

module.exports = router;