const db = require('../config/database');

/**
 * Cadastra um novo nível
 * @param {number} usuario_id - ID do usuário
 * @param {Object} dados - Dados do nível (titulo, descricao, xp_total)
 * @returns {Promise<number>} ID do nível cadastrado
 */
async function cadastrarNivel(usuario_id, { titulo, descricao, xp_total }) {
  if (!titulo || !descricao || !xp_total) {
    throw new Error('Preencha todos os campos');
  }

  try {
    const sql = 'INSERT INTO niveis (titulo, descricao, xp_total, usuario_id) VALUES (?, ?, ?, ?)';
    const [result] = await db.promise().query(sql, [titulo, descricao, xp_total, usuario_id]);
    return result.insertId;
  } catch (err) {
    throw new Error('Erro ao cadastrar nível: ' + err.message);
  }
}

/**
 * Busca níveis com base em um termo de busca (ID, título ou descrição)
 * @param {string|number} busca - Termo de busca
 * @returns {Promise<Array>} Lista de níveis
 */
async function buscarNiveis(busca) {
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
    return results;
  } catch (err) {
    throw new Error('Erro ao buscar níveis: ' + err.message);
  }
}

/**
 * Busca um nível por ID
 * @param {number} id - ID do nível
 * @returns {Promise<Object>} Dados do nível
 */
async function buscarNivelPorId(id) {
  if (!id || isNaN(id)) {
    throw new Error('ID do nível inválido');
  }

  try {
    const [results] = await db.promise().query('SELECT * FROM niveis WHERE id = ?', [id]);
    if (results.length === 0) {
      throw new Error('Nível não encontrado');
    }
    return results[0];
  } catch (err) {
    throw new Error('Erro ao buscar nível: ' + err.message);
  }
}

/**
 * Atualiza um nível
 * @param {number} id - ID do nível
 * @param {Object} dados - Dados a atualizar (titulo, descricao, xp_total)
 * @returns {Promise<void>}
 */
async function atualizarNivel(id, { titulo, descricao, xp_total }) {
  if (!titulo || !descricao || !xp_total) {
    throw new Error('Preencha todos os campos');
  }

  try {
    const [results] = await db.promise().query('SELECT * FROM niveis WHERE id = ?', [id]);
    if (results.length === 0) {
      throw new Error('Nível não encontrado');
    }

    const updateNivelSql = `
      UPDATE niveis 
      SET titulo = ?, descricao = ?, xp_total = ?
      WHERE id = ?
    `;
    await db.promise().query(updateNivelSql, [titulo, descricao, xp_total, id]);
  } catch (err) {
    throw new Error('Erro ao editar nível: ' + err.message);
  }
}

/**
 * Ativa ou desativa um nível
 * @param {number} id - ID do nível
 * @param {boolean} ativo - Estado ativo/inativo
 * @param {number} posicao - Posição (obrigatória se ativo=true)
 * @returns {Promise<void>}
 */
async function ativarNivel(id, ativo, posicao) {
  if (ativo === undefined) {
    throw new Error('O campo "ativo" é obrigatório');
  }

  try {
    await new Promise((resolve, reject) => {
      db.beginTransaction(err => (err ? reject(err) : resolve()));
    });

    const [results] = await db.promise().query('SELECT * FROM niveis WHERE id = ?', [id]);
    if (results.length === 0) {
      await new Promise((resolve) => db.rollback(() => resolve()));
      throw new Error('Nível não encontrado');
    }

    const nivel = results[0];

    if (!ativo) {
      const desativarSql = 'UPDATE niveis SET ativo = false, posicao = NULL WHERE id = ?';
      await db.promise().query(desativarSql, [id]);
      const reordenarSql = 'UPDATE niveis SET posicao = posicao - 1 WHERE posicao > ?';
      await db.promise().query(reordenarSql, [nivel.posicao]);
    } else {
      if (!posicao || posicao <= 0) {
        await new Promise((resolve) => db.rollback(() => resolve()));
        throw new Error('Informe uma posição válida');
      }

      const [posicaoResults] = await db.promise().query('SELECT * FROM niveis WHERE posicao = ?', [posicao]);
      if (posicaoResults.length > 0) {
        const deslocarSql = 'UPDATE niveis SET posicao = posicao + 1 WHERE posicao >= ?';
        await db.promise().query(deslocarSql, [posicao]);
      }

      const ativarSql = 'UPDATE niveis SET ativo = true, posicao = ? WHERE id = ?';
      await db.promise().query(ativarSql, [posicao, id]);
    }

    await new Promise((resolve, reject) => {
      db.commit(err => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    await new Promise((resolve) => db.rollback(() => resolve()));
    throw new Error('Erro ao processar solicitação: ' + err.message);
  }
}

/**
 * Busca níveis ativos ordenados por posição
 * @returns {Promise<Array>} Lista de níveis ativos
 */
async function buscarNiveisAtivos() {
  try {
    const [results] = await db.promise().query('SELECT * FROM niveis WHERE ativo = true ORDER BY posicao ASC');
    return results;
  } catch (err) {
    throw new Error('Erro ao buscar níveis ativos: ' + err.message);
  }
}

/**
 * Exclui um nível e suas perguntas associadas
 * @param {number} id - ID do nível
 * @returns {Promise<void>}
 */
async function excluirNivel(id) {
  try {
    const [result] = await db.promise().query('DELETE FROM niveis WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      throw new Error('Nível não encontrado');
    }
    await db.promise().query('DELETE FROM perguntas WHERE nivel_id = ?', [id]);
  } catch (err) {
    throw new Error('Erro ao excluir nível: ' + err.message);
  }
}

module.exports = {
  cadastrarNivel,
  buscarNiveis,
  buscarNivelPorId,
  atualizarNivel,
  ativarNivel,
  buscarNiveisAtivos,
  excluirNivel
};