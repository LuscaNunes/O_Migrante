const mysql = require('mysql2');
require('dotenv').config();

/**
 * Configuração da conexão com o banco de dados MySQL
 */
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '2024',
  database: process.env.DB_NAME || 'Agape_BD',
  connectTimeout: 10000, // Tempo limite de conexão em milissegundos
  charset: 'utf8mb4' // Suporte a caracteres UTF-8 para emojis e outros
});

/**
 * Conecta ao banco de dados e verifica a conexão
 */
db.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao MySQL:', err);
    // Tenta reconectar em caso de falha
    setTimeout(() => {
      console.log('Tentando reconectar ao MySQL...');
      db.connect((retryErr) => {
        if (retryErr) {
          console.error('Falha ao reconectar ao MySQL:', retryErr);
        } else {
          console.log('Reconexão ao MySQL bem-sucedida!');
          logDatabase();
        }
      });
    }, 5000); // Tenta reconectar após 5 segundos
  } else {
    console.log('Conectado ao MySQL!');
    logDatabase();
  }
});

/**
 * Função auxiliar para logar o banco de dados atual
 */
function logDatabase() {
  db.query('SELECT DATABASE() AS db_name', (err, result) => {
    if (err) {
      console.error('Erro ao verificar banco de dados:', err);
    } else {
      console.log('Banco de dados atual:', result[0].db_name);
    }
  });
}

/**
 * Tratamento de erros de conexão perdida
 */
db.on('error', (err) => {
  console.error('Erro na conexão com o MySQL:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Conexão perdida. Tentando reconectar...');
    db.connect((retryErr) => {
      if (retryErr) {
        console.error('Falha ao reconectar ao MySQL:', retryErr);
      } else {
        console.log('Reconexão ao MySQL bem-sucedida!');
        logDatabase();
      }
    });
  } else {
    throw err; // Lança outros erros para serem tratados globalmente
  }
});

// Exporta a conexão para uso em outros módulos
module.exports = db;