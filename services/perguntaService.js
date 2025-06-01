const db = require('../config/database');

/**
 * Cadastra uma nova pergunta
 * @param {number} usuario_id - ID do usuário
 * @param {Object} dados - Dados da pergunta (nivel_id, texto, resposta_correta, opcao1, opcao2, opcao3)
 * @returns {Promise<void>}
 */
async function cadastrarPergunta(usuario_id, { nivel_id, texto, resposta_correta, opcao1, opcao2, opcao3 }) {
  if (!nivel_id || !texto || !resposta_correta || !opcao1 || !opcao2 || !opcao3) {
    throw new Error('Preencha todos os campos');
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
  } catch (err) {
    throw new Error('Erro ao cadastrar pergunta: ' + err.message);
  }
}

/**
 * Busca perguntas aleatórias de um nível
 * @param {number} nivel_id - ID do nível
 * @param {number} quantidade - Quantidade de perguntas a buscar
 * @returns {Promise<Object>} Objeto com perguntas e xp_total do nível
 */
async function buscarPerguntasAleatorias(nivel_id, quantidade) {
  if (!nivel_id || isNaN(nivel_id) || nivel_id <= 0) {
    throw new Error('O parâmetro "nivel_id" deve ser um número positivo');
  }
  if (!quantidade || isNaN(quantidade) || quantidade <= 0) {
    throw new Error('O parâmetro "quantidade" deve ser um número positivo');
  }

  try {
    const checkSql = `
      SELECT n.xp_total, COUNT(p.id) AS total 
      FROM niveis n
      LEFT JOIN perguntas p ON p.nivel_id = n.id
      WHERE n.id = ?
      GROUP BY n.id
    `;
    const [results] = await db.promise().query(checkSql, [nivel_id]);
    if (results.length === 0 || results[0].total === 0) {
      throw new Error('Não há perguntas cadastradas para este nível');
    }

    const xpTotal = results[0].xp_total;
    const sql = `
      SELECT * FROM perguntas 
      WHERE nivel_id = ? 
      ORDER BY RAND() 
      LIMIT ?
    `;
    const [perguntas] = await db.promise().query(sql, [nivel_id, quantidade]);

    if (perguntas.length === 0) {
      throw new Error('Não há perguntas suficientes para este nível');
    }

    return { perguntas, xp_total: xpTotal };
  } catch (err) {
    throw new Error('Erro ao buscar perguntas aleatórias: ' + err.message);
  }
}

/**
 * Busca perguntas de um nível específico
 * @param {number} nivel_id - ID do nível
 * @returns {Promise<Array>} Lista de perguntas
 */
async function buscarPerguntasPorNivel(nivel_id) {
  if (!nivel_id) {
    throw new Error('Parâmetro nivel_id não fornecido');
  }

  try {
    const [results] = await db.promise().query('SELECT * FROM perguntas WHERE nivel_id = ?', [nivel_id]);
    return results;
  } catch (err) {
    throw new Error('Erro ao buscar perguntas: ' + err.message);
  }
}

/**
 * Busca uma pergunta por ID
 * @param {number} id - ID da pergunta
 * @returns {Promise<Object>} Dados da pergunta
 */
async function buscarPerguntaPorId(id) {
  try {
    const [result] = await db.promise().query('SELECT * FROM perguntas WHERE id = ?', [id]);
    if (result.length === 0) {
      throw new Error('Pergunta não encontrada');
    }
    return result[0];
  } catch (err) {
    throw new Error('Erro ao buscar pergunta: ' + err.message);
  }
}

/**
 * Atualiza uma pergunta
 * @param {number} id - ID da pergunta
 * @param {Object} dados - Dados a atualizar (texto, resposta_correta, opcao1, opcao2, opcao3)
 * @returns {Promise<void>}
 */
async function atualizarPergunta(id, { texto, resposta_correta, opcao1, opcao2, opcao3 }) {
  if (!texto || !resposta_correta || !opcao1 || !opcao2 || !opcao3) {
    throw new Error('Preencha todos os campos');
  }

  try {
    const [results] = await db.promise().query('SELECT * FROM perguntas WHERE id = ?', [id]);
    if (results.length === 0) {
      throw new Error('Pergunta não encontrada');
    }

    const sql = `
      UPDATE perguntas 
      SET texto = ?, resposta_correta = ?, opcao1 = ?, opcao2 = ?, opcao3 = ?
      WHERE id = ?
    `;
    await db.promise().query(sql, [texto, resposta_correta, opcao1, opcao2, opcao3, id]);
  } catch (err) {
    throw new Error('Erro ao editar pergunta: ' + err.message);
  }
}

/**
 * Exclui uma pergunta
 * @param {number} id - ID da pergunta
 * @returns {Promise<void>}
 */
async function excluirPergunta(id) {
  try {
    const [result] = await db.promise().query('DELETE FROM perguntas WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      throw new Error('Pergunta não encontrada');
    }
  } catch (err) {
    throw new Error('Erro ao excluir pergunta: ' + err.message);
  }
}

module.exports = {
  cadastrarPergunta,
  buscarPerguntasAleatorias,
  buscarPerguntasPorNivel,
  buscarPerguntaPorId,
  atualizarPergunta,
  excluirPergunta
};