const db = require('../config/database');

function checkUserExists(id_usuario, callback) {
  db.query('SELECT id_usuario FROM Usuarios WHERE id_usuario = ?', [id_usuario], (error, rows) => {
    if (error) {
      console.error('Erro ao verificar usuário:', error.message);
      return callback(error);
    }
    if (rows.length === 0) {
      const err = new Error('Usuário não encontrado.');
      err.status = 404;
      return callback(err);
    }
    callback(null);
  });
}

function listarAmizades(userId, callback) {
  db.query(`
    SELECT a.id_amizade, 
           CASE WHEN a.id_usuario1 = ? THEN u2.id_usuario ELSE u1.id_usuario END AS id_usuario,
           CASE WHEN a.id_usuario1 = ? THEN u2.nome ELSE u1.nome END AS nome,
           CASE WHEN a.id_usuario1 = ? THEN u2.email ELSE u1.email END AS email
    FROM Amizades a
    LEFT JOIN Usuarios u1 ON a.id_usuario1 = u1.id_usuario
    LEFT JOIN Usuarios u2 ON a.id_usuario2 = u2.id_usuario
    WHERE a.status = 'aceito' AND (a.id_usuario1 = ? OR a.id_usuario2 = ?)
  `, [userId, userId, userId, userId, userId], (error, amigos) => {
    if (error) {
      console.error('Erro ao listar amizades:', error.message);
      return callback(error);
    }

    db.query(`
      SELECT a.id_amizade, u.nome, u.email
      FROM Amizades a
      JOIN Usuarios u ON a.id_usuario1 = u.id_usuario
      WHERE a.id_usuario2 = ? AND a.status = 'pendente'
    `, [userId], (error, pedidosPendentes) => {
      if (error) {
        console.error('Erro ao listar pedidos pendentes:', error.message);
        return callback(error);
      }

      db.query(`
        SELECT a.id_amizade, u.nome, u.email
        FROM Amizades a
        JOIN Usuarios u ON a.id_usuario2 = u.id_usuario
        WHERE a.id_usuario1 = ? AND a.status = 'pendente'
      `, [userId], (error, solicitacoesEnviadas) => {
        if (error) {
          console.error('Erro ao listar solicitações enviadas:', error.message);
          return callback(error);
        }

        callback(null, { amigos, pedidosPendentes, solicitacoesEnviadas });
      });
    });
  });
}

function criarSolicitacao(id_usuario1, id_usuario2, callback) {
  if (id_usuario1 === id_usuario2) {
    const error = new Error('Não é possível enviar solicitação para si mesmo.');
    error.status = 400;
    return callback(error);
  }

  checkUserExists(id_usuario2, (error) => {
    if (error) return callback(error);

    db.query(`
      SELECT id_amizade FROM Amizades
      WHERE (id_usuario1 = ? AND id_usuario2 = ?) OR (id_usuario1 = ? AND id_usuario2 = ?)
    `, [id_usuario1, id_usuario2, id_usuario2, id_usuario1], (error, rows) => {
      if (error) {
        console.error('Erro ao verificar amizade existente:', error.message);
        return callback(error);
      }

      if (rows.length > 0) {
        const err = new Error('Solicitação ou amizade já existe.');
        err.status = 400;
        return callback(err);
      }

      db.query(`
        INSERT INTO Amizades (id_usuario1, id_usuario2, status)
        VALUES (?, ?, 'pendente')
      `, [id_usuario1, id_usuario2], (error, result) => {
        if (error) {
          console.error('Erro ao criar solicitação:', error.message);
          return callback(error);
        }
        callback(null, result.insertId);
      });
    });
  });
}

function atualizarSolicitacao(id_amizade, status, userId, callback) {
  if (!['aceito', 'recusado'].includes(status)) {
    const error = new Error('Status inválido.');
    error.status = 400;
    return callback(error);
  }

  db.query(`
    SELECT id_amizade FROM Amizades
    WHERE id_amizade = ? AND id_usuario2 = ? AND status = 'pendente'
  `, [id_amizade, userId], (error, rows) => {
    if (error) {
      console.error('Erro ao verificar solicitação:', error.message);
      return callback(error);
    }

    if (rows.length === 0) {
      const err = new Error('Solicitação não encontrada ou não autorizada.');
      err.status = 404;
      return callback(err);
    }

    db.query(`
      UPDATE Amizades SET status = ?
      WHERE id_amizade = ?
    `, [status, id_amizade], (error) => {
      if (error) {
        console.error('Erro ao atualizar solicitação:', error.message);
        return callback(error);
      }
      callback(null);
    });
  });
}

function removerAmizade(id_amizade, userId, callback) {
  db.query(`
    SELECT id_amizade FROM Amizades
    WHERE id_amizade = ? AND (id_usuario1 = ? OR id_usuario2 = ?)
  `, [id_amizade, userId, userId], (error, rows) => {
    if (error) {
      console.error('Erro ao verificar amizade:', error.message);
      return callback(error);
    }

    if (rows.length === 0) {
      const err = new Error('Solicitação ou amizade não encontrada.');
      err.status = 404;
      return callback(err);
    }

    db.query(`
      DELETE FROM Amizades WHERE id_amizade = ?
    `, [id_amizade], (error) => {
      if (error) {
        console.error('Erro ao remover amizade:', error.message);
        return callback(error);
      }
      callback(null);
    });
  });
}

function pesquisarUsuarios(termo, userId, callback) {
  console.log('Executando pesquisa com termo:', termo, 'e userId:', userId);
  db.query(
    `SELECT id_usuario, nome, email 
     FROM Usuarios 
     WHERE (nome LIKE ? OR email LIKE ?) 
     AND id_usuario != ?`,
    [`%${termo}%`, `%${termo}%`, userId],
    (error, usuarios) => {
      if (error) {
        console.error('Erro ao executar query de pesquisa de usuários:', error.message);
        const err = new Error('Erro ao buscar usuários no banco de dados.');
        err.status = 500;
        return callback(err);
      }
      console.log('Usuários encontrados:', usuarios);
      callback(null, usuarios);
    }
  );
}

module.exports = {
  listarAmizades,
  criarSolicitacao,
  atualizarSolicitacao,
  removerAmizade,
  pesquisarUsuarios
};