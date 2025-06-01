const db = require('../config/database');

/**
 * Cria uma nova anotação para o usuário
 * @param {number} usuario_id - ID do usuário
 * @param {Object} dados - Dados da anotação (versao, livro, capitulo, versiculo, texto_versiculo, texto_anotacao)
 * @returns {Promise<Object>} Dados da anotação criada
 */
async function criarAnotacao(usuario_id, { versao, livro, capitulo, versiculo, texto_versiculo, texto_anotacao }) {
  // Validação dos campos
  if (!versao || !livro || !capitulo || !versiculo || !texto_versiculo || !texto_anotacao) {
    throw new Error('Todos os campos são obrigatórios');
  }
  if (typeof capitulo !== 'number' || capitulo <= 0) {
    throw new Error('Capítulo deve ser um número positivo');
  }
  if (typeof versiculo !== 'number' || versiculo <= 0) {
    throw new Error('Versículo deve ser um número positivo');
  }

  try {
    // Inserir a anotação
    const [result] = await db.promise().query(
      `INSERT INTO Anotacoes 
       (usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, texto_anotacao) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, texto_anotacao]
    );

    // Buscar a anotação recém-criada
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

    return anotacao[0];
  } catch (err) {
    throw new Error('Erro ao salvar anotação: ' + err.message);
  }
}

/**
 * Lista todas as anotações de um usuário
 * @param {number} usuario_id - ID do usuário
 * @returns {Promise<Array>} Lista de anotações
 */
async function listarAnotacoes(usuario_id) {
  try {
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
    return anotacoes;
  } catch (error) {
    throw new Error('Erro ao buscar anotações: ' + error.message);
  }
}

module.exports = {
  criarAnotacao,
  listarAnotacoes
};