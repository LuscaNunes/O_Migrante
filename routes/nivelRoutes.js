const express = require('express');
const { authenticateToken, checkAdmin } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

/**
 * Rota para cadastrar níveis
 * POST /niveis
 * Requer autenticação
 */
router.post('/', authenticateToken, async (req, res) => {
  const { titulo, descricao, xp_total } = req.body;
  const usuario_id = req.user.id;

  if (!titulo || !descricao || !xp_total) {
    return res.status(400).send('Preencha todos os campos.');
  }

  try {
    const sql = 'INSERT INTO niveis (titulo, descricao, xp_total, usuario_id) VALUES (?, ?, ?, ?)';
    const [result] = await db.promise().query(sql, [titulo, descricao, xp_total, usuario_id]);
    res.send({ message: 'Nível cadastrado com sucesso!', id: result.insertId });
  } catch (err) {
    console.error('Erro ao cadastrar nível:', err);
    res.status(500).send('Erro ao cadastrar nível.');
  }
});

/**
 * Rota para buscar níveis (filtro por ID, título ou descrição)
 * GET /niveis
 * Requer autenticação
 */
router.get('/', authenticateToken, async (req, res) => {
  const { busca } = req.query;
  let sql = 'SELECT * FROM niveis WHERE 1=1';
  const params = [];

  if (busca) {
    if (!isNaN(busca)) {
      sql += ' AND id = ?';
      params.push(busca);
    } else {
      sql += ' AND (LOWER(titulo) LIKE LOWER(?) OR LOWER(descricao) LIKE LOWER(?))';
      params.push(`%${busca}%`, `%${busca}%`);
    }
  }

  try {
    const [results] = await db.promise().query(sql, params);
    res.json({ niveis: results });
  } catch (err) {
    console.error('Erro ao buscar níveis:', err);
    res.status(500).json({ error: 'Erro ao buscar níveis.' });
  }
});

/**
 * Rota para buscar um nível por ID
 * GET /niveis/:id
 * Requer autenticação
 */
router.get('/:id', authenticateToken, async (req, res) => {
  const nivelId = req.params.id;
  console.log('Buscando nível com ID:', nivelId);

  if (!nivelId || isNaN(nivelId)) {
    console.error('ID do nível inválido:', nivelId);
    return res.status(400).json({ error: 'ID do nível inválido.' });
  }

  try {
    const [results] = await db.promise().query('SELECT * FROM niveis WHERE id = ?', [nivelId]);
    if (results.length === 0) {
      console.error('Nível não encontrado para ID:', nivelId);
      return res.status(404).json({ error: 'Nível não encontrado.' });
    }
    console.log('Nível encontrado:', results[0]);
    res.json(results[0]);
  } catch (err) {
    console.error('Erro ao buscar nível:', err);
    res.status(500).json({ error: 'Erro ao buscar nível.' });
  }
});

/**
 * Rota para editar um nível
 * PUT /niveis/:id
 * Requer autenticação
 */
router.put('/:id', authenticateToken, async (req, res) => {
  const nivelId = req.params.id;
  const { titulo, descricao, xp_total } = req.body;

  if (!titulo || !descricao || !xp_total) {
    return res.status(400).json({ success: false, message: 'Preencha todos os campos.' });
  }

  try {
    const [results] = await db.promise().query('SELECT * FROM niveis WHERE id = ?', [nivelId]);
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Nível não encontrado.' });
    }

    const updateNivelSql = `
      UPDATE niveis 
      SET titulo = ?, descricao = ?, xp_total = ?
      WHERE id = ?
    `;
    await db.promise().query(updateNivelSql, [titulo, descricao, xp_total, nivelId]);
    res.json({ success: true, message: 'Nível atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao editar nível:', err);
    res.status(500).json({ success: false, message: 'Erro ao editar nível.' });
  }
});

/**
 * Rota para ativar/desativar um nível
 * PUT /niveis/:id/ativar
 * Requer autenticação
 */
router.put('/:id/ativar', authenticateToken, async (req, res) => {
  const nivelId = req.params.id;
  const { ativo, posicao } = req.body;

  if (ativo === undefined) {
    return res.status(400).json({ error: 'O campo "ativo" é obrigatório.' });
  }

  try {
    await new Promise((resolve, reject) => {
      db.beginTransaction(err => (err ? reject(err) : resolve()));
    });

    const [results] = await db.promise().query('SELECT * FROM niveis WHERE id = ?', [nivelId]);
    if (results.length === 0) {
      await new Promise((resolve) => db.rollback(() => resolve()));
      return res.status(404).json({ error: 'Nível não encontrado.' });
    }

    const nivel = results[0];

    if (!ativo) {
      const desativarSql = 'UPDATE niveis SET ativo = false, posicao = NULL WHERE id = ?';
      await db.promise().query(desativarSql, [nivelId]);
      const reordenarSql = 'UPDATE niveis SET posicao = posicao - 1 WHERE posicao > ?';
      await db.promise().query(reordenarSql, [nivel.posicao]);
      await new Promise((resolve, reject) => {
        db.commit(err => (err ? reject(err) : resolve()));
      });
      res.json({ success: true, message: 'Nível desativado com sucesso! Os níveis subsequentes foram reordenados.' });
    } else {
      if (!posicao || posicao <= 0) {
        await new Promise((resolve) => db.rollback(() => resolve()));
        return res.status(400).json({ error: 'Informe uma posição válida.' });
      }

      const [posicaoResults] = await db.promise().query('SELECT * FROM niveis WHERE posicao = ?', [posicao]);
      if (posicaoResults.length > 0) {
        const deslocarSql = 'UPDATE niveis SET posicao = posicao + 1 WHERE posicao >= ?';
        await db.promise().query(deslocarSql, [posicao]);
      }

      const ativarSql = 'UPDATE niveis SET ativo = true, posicao = ? WHERE id = ?';
      await db.promise().query(ativarSql, [posicao, nivelId]);
      await new Promise((resolve, reject) => {
        db.commit(err => (err ? reject(err) : resolve()));
      });
      res.json({ success: true, message: `Nível ativado com sucesso na posição ${posicao}!` });
    }
  } catch (err) {
    await new Promise((resolve) => db.rollback(() => resolve()));
    console.error('Erro ao processar solicitação:', err);
    res.status(500).json({ error: 'Erro ao processar solicitação.' });
  }
});

/**
 * Rota para buscar níveis ativos ordenados por posição
 * GET /niveis/ativos
 * Acessível sem autenticação
 */
router.get('/ativos', async (req, res) => {
  try {
    const [results] = await db.promise().query('SELECT * FROM niveis WHERE ativo = true ORDER BY posicao ASC');
    res.json({ niveis: results });
  } catch (err) {
    console.error('Erro ao buscar níveis ativos:', err);
    res.status(500).json({ error: 'Erro ao buscar níveis ativos.' });
  }
});

/**
 * Rota para excluir um nível
 * DELETE /niveis/:id
 * Requer autenticação
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const nivelId = req.params.id;

  try {
    const [result] = await db.promise().query('DELETE FROM niveis WHERE id = ?', [nivelId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Nível não encontrado.' });
    }

    await db.promise().query('DELETE FROM perguntas WHERE nivel_id = ?', [nivelId]);
    res.json({ message: 'Nível e perguntas excluídos com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir nível:', err);
    res.status(500).json({ message: 'Erro ao excluir nível.' });
  }
});

module.exports = router;