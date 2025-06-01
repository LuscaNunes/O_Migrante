const express = require('express');
const { authenticateToken, checkAdmin } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

/**
 * Rota para cadastrar perguntas
 * POST /perguntas
 * Requer autenticação e permissão de admin
 */
router.post('/', authenticateToken, checkAdmin, async (req, res) => {
  const { nivel_id, texto, resposta_correta, opcao1, opcao2, opcao3 } = req.body;
  const usuario_id = req.user.id;

  if (!nivel_id || !texto || !resposta_correta || !opcao1 || !opcao2 || !opcao3) {
    return res.status(400).json({ success: false, message: 'Preencha todos os campos.' });
  }

  try {
    const [results] = await db.promise().query('SELECT MAX(ordem) as max_ordem FROM perguntas WHERE nivel_id = ?', [nivel_id]);
    const ordem = results[0].max_ordem + 1 || 1;

    const sqlInsert = `
      INSERT INTO perguntas 
      (nivel_id, texto, resposta_correta, opcao1, opcao2, opcao3, ordem, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.promise().query(sqlInsert, [nivel_id, texto, resposta_correta, opcao1, opcao2, opcao3, ordem, usuario_id]);
    res.json({ success: true, message: 'Pergunta cadastrada com sucesso!' });
  } catch (err) {
    console.error('Erro ao cadastrar pergunta:', err);
    res.status(500).json({ success: false, message: 'Erro no servidor.' });
  }
});

/**
 * Rota para buscar perguntas aleatórias de um nível
 * GET /perguntas/aleatorias
 * Requer autenticação
 */
router.get('/aleatorias', authenticateToken, async (req, res) => {
  const { nivel_id, quantidade } = req.query;

  console.log('Rota /perguntas/aleatorias chamada');
  console.log('nivel_id:', nivel_id, 'tipo:', typeof nivel_id);
  console.log('quantidade:', quantidade, 'tipo:', typeof quantidade);

  if (!nivel_id || !quantidade) {
    console.log('Parâmetros inválidos');
    return res.status(400).json({ error: 'Parâmetros "nivel_id" e "quantidade" são obrigatórios.' });
  }

  const nivelIdParam = parseInt(nivel_id);
  const quantidadeParam = parseInt(quantidade);

  if (isNaN(nivelIdParam) || nivelIdParam <= 0) {
    console.log('nivel_id inválido');
    return res.status(400).json({ error: 'O parâmetro "nivel_id" deve ser um número positivo.' });
  }

  if (isNaN(quantidadeParam) || quantidadeParam <= 0) {
    console.log('quantidade inválida');
    return res.status(400).json({ error: 'O parâmetro "quantidade" deve ser um número positivo.' });
  }

  try {
    const checkSql = `
      SELECT n.xp_total, COUNT(p.id) AS total 
      FROM niveis n
      LEFT JOIN perguntas p ON p.nivel_id = n.id
      WHERE n.id = ?
      GROUP BY n.id
    `;
    const [results] = await db.promise().query(checkSql, [nivelIdParam]);
    if (results.length === 0 || results[0].total === 0) {
      console.error('Nenhuma pergunta encontrada para nivel_id:', nivelIdParam);
      return res.status(404).json({ error: 'Não há perguntas cadastradas para este nível.' });
    }

    const xpTotal = results[0].xp_total;
    const sql = `
      SELECT * FROM perguntas 
      WHERE nivel_id = ? 
      ORDER BY RAND() 
      LIMIT ?
    `;
    console.log('Executando consulta SQL:', sql);
    console.log('Parâmetros:', [nivelIdParam, quantidadeParam]);

    const [perguntas] = await db.promise().query(sql, [nivelIdParam, quantidadeParam]);
    console.log('Resultados da consulta:', perguntas);

    if (perguntas.length === 0) {
      console.error('Nenhuma pergunta encontrada para nivel_id:', nivelIdParam);
      return res.status(404).json({ error: 'Não há perguntas suficientes para este nível.' });
    }

    res.json({ perguntas, xp_total: xpTotal });
  } catch (err) {
    console.error('Erro no banco:', err);
    res.status(500).json({ error: 'Erro ao buscar perguntas aleatórias.' });
  }
});

/**
 * Rota para buscar perguntas de um nível específico
 * GET /perguntas
 * Requer autenticação
 */
router.get('/', authenticateToken, async (req, res) => {
  const nivelId = req.query.nivel_id;

  if (!nivelId) {
    return res.status(400).json({ error: 'Parâmetro nivel_id não fornecido.' });
  }

  try {
    const [results] = await db.promise().query('SELECT * FROM perguntas WHERE nivel_id = ?', [nivelId]);
    res.json({ perguntas: results });
  } catch (err) {
    console.error('Erro ao buscar perguntas:', err);
    res.status(500).json({ error: 'Erro ao buscar perguntas.' });
  }
});

/**
 * Rota para buscar uma pergunta por ID
 * GET /perguntas/:id
 * Requer autenticação
 */
router.get('/:id', authenticateToken, async (req, res) => {
  const perguntaId = req.params.id;

  try {
    const [result] = await db.promise().query('SELECT * FROM perguntas WHERE id = ?', [perguntaId]);
    if (result.length === 0) {
      return res.status(404).json({ message: 'Pergunta não encontrada.' });
    }
    res.json(result[0]);
  } catch (err) {
    console.error('Erro ao buscar pergunta:', err);
    res.status(500).json({ message: 'Erro ao buscar pergunta.' });
  }
});

/**
 * Rota para atualizar uma pergunta
 * PUT /perguntas/:id
 * Requer autenticação
 */
router.put('/:id', authenticateToken, async (req, res) => {
  const perguntaId = req.params.id;
  const { texto, resposta_correta, opcao1, opcao2, opcao3 } = req.body;

  if (!texto || !resposta_correta || !opcao1 || !opcao2 || !opcao3) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  try {
    const [results] = await db.promise().query('SELECT * FROM perguntas WHERE id = ?', [perguntaId]);
    if (results.length === 0) {
      console.error('Pergunta não encontrada para id:', perguntaId);
      return res.status(404).json({ error: 'A pergunta com o ID fornecido não foi encontrada.' });
    }

    const sql = `
      UPDATE perguntas 
      SET texto = ?, resposta_correta = ?, opcao1 = ?, opcao2 = ?, opcao3 = ?
      WHERE id = ?
    `;
    await db.promise().query(sql, [texto, resposta_correta, opcao1, opcao2, opcao3, perguntaId]);
    res.json({ success: true, message: 'Pergunta atualizada com sucesso!' });
  } catch (err) {
    console.error('Erro ao editar pergunta:', err);
    res.status(500).json({ error: 'Erro ao editar pergunta.' });
  }
});

/**
 * Rota para excluir uma pergunta
 * DELETE /perguntas/:id
 * Requer autenticação
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const perguntaId = req.params.id;

  try {
    const [result] = await db.promise().query('DELETE FROM perguntas WHERE id = ?', [perguntaId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pergunta não encontrada.' });
    }
    res.json({ success: true, message: 'Pergunta excluída com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir pergunta:', err);
    res.status(500).json({ error: 'Erro ao excluir pergunta.' });
  }
});

module.exports = router;