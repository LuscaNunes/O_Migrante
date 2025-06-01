const db = require('../config/database');

/**
 * Salva o progresso do usuário ao completar um nível
 * @param {number} usuario_id - ID do usuário
 * @param {Object} dados - Dados do progresso (nivel_id, xp_ganho, ordem)
 * @returns {Promise<Object>} Objeto com xp_ganho e ordem
 */
async function salvarProgresso(usuario_id, { nivel_id, xp_ganho, ordem }) {
  if (!nivel_id || !xp_ganho || !ordem || isNaN(nivel_id) || isNaN(xp_ganho) || isNaN(ordem)) {
    throw new Error('Parâmetros inválidos');
  }
  if (ordem < 1 || ordem > 12) {
    throw new Error('Ordem deve estar entre 1 e 12');
  }

  try {
    await new Promise((resolve, reject) => {
      db.beginTransaction(err => (err ? reject(err) : resolve()));
    });

    const [nivelRows] = await db.promise().query('SELECT id FROM niveis WHERE id = ?', [nivel_id]);
    if (nivelRows.length === 0) {
      await new Promise((resolve) => db.rollback(() => resolve()));
      throw new Error('Nível não encontrado');
    }

    const [progressoRows] = await db.promise().query(
      'SELECT xp_ganho, ordem FROM ProgressoUsuario WHERE usuario_id = ? AND nivel_id = ? AND ordem = ?',
      [usuario_id, nivel_id, ordem]
    );

    let novoXpGanho = xp_ganho;
    const concluido = xp_ganho > 0 ? 1 : 0;

    if (progressoRows.length > 0) {
      const progressoAtual = progressoRows[0];
      novoXpGanho = progressoAtual.xp_ganho + xp_ganho;
      await db.promise().query(
        'UPDATE ProgressoUsuario SET xp_ganho = ?, concluido = ? WHERE usuario_id = ? AND nivel_id = ? AND ordem = ?',
        [novoXpGanho, concluido, usuario_id, nivel_id, ordem]
      );
    } else {
      await db.promise().query(
        'INSERT INTO ProgressoUsuario (usuario_id, nivel_id, xp_ganho, ordem, concluido) VALUES (?, ?, ?, ?, ?)',
        [usuario_id, nivel_id, novoXpGanho, ordem, concluido]
      );
    }

    if (xp_ganho > 0) {
      await db.promise().query(
        'UPDATE Usuarios SET xp_total = xp_total + ? WHERE id_usuario = ?',
        [xp_ganho, usuario_id]
      );
    }

    await new Promise((resolve, reject) => {
      db.commit(err => (err ? reject(err) : resolve()));
    });

    return { xp_ganho: novoXpGanho, ordem };
  } catch (error) {
    await new Promise((resolve) => db.rollback(() => resolve()));
    throw new Error('Erro ao salvar progresso: ' + error.message);
  }
}

/**
 * Busca o progresso dos botões por nível
 * @param {number} usuario_id - ID do usuário
 * @param {number} nivel_id - ID do nível
 * @returns {Promise<Object>} Objeto com progresso dos botões
 */
async function buscarProgressoBotoes(usuario_id, nivel_id) {
  try {
    const [progresso] = await db.promise().query(
      `
      SELECT ordem, concluido, xp_ganho
      FROM ProgressoUsuario 
      WHERE usuario_id = ? AND nivel_id = ?
      ORDER BY ordem ASC
      `,
      [usuario_id, nivel_id]
    );

    const botoesCompletos = {};
    progresso.forEach(item => {
      botoesCompletos[item.ordem] = {
        concluido: item.concluido,
        xp_ganho: item.xp_ganho
      };
    });

    return botoesCompletos;
  } catch (error) {
    throw new Error('Erro ao buscar progresso dos botões: ' + error.message);
  }
}

/**
 * Busca o progresso detalhado do usuário
 * @param {number} usuario_id - ID do usuário
 * @returns {Promise<Object>} Objeto com progresso por nível
 */
async function buscarProgressoDetalhado(usuario_id) {
  try {
    const [progresso] = await db.promise().query(
      `
      SELECT nivel_id, COUNT(*) AS perguntas_completas
      FROM ProgressoUsuario
      WHERE usuario_id = ? AND concluido = true
      GROUP BY nivel_id
      `,
      [usuario_id]
    );

    const niveisCompletos = progresso.reduce((map, item) => {
      map[item.nivel_id] = item.perguntas_completas;
      return map;
    }, {});

    return niveisCompletos;
  } catch (error) {
    throw new Error('Erro ao buscar progresso detalhado: ' + error.message);
  }
}

module.exports = {
  salvarProgresso,
  buscarProgressoBotoes,
  buscarProgressoDetalhado
};