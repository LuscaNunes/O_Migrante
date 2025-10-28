const mysql = require('mysql2');
require('dotenv').config();

// Se o DB_PORT não estiver definido, o default é 3306 (padrão)
// Mas vamos garantir que ele busque a porta 4000 do TiDB
const DB_PORT = process.env.DB_PORT || 3306;
const DB_HOST = process.env.DB_HOST || 'localhost';

/**
 * Configuração da conexão com o banco de dados MySQL
 */
const dbConfig = {
    host: DB_HOST,
    port: DB_PORT, // <--- NOVO: Adicionamos a porta
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2024',
    database: process.env.DB_NAME || 'test', // <--- AJUSTADO: Usando 'test'
    connectTimeout: 10000,
    charset: 'utf8mb4',
    // --- NOVO: Configuração de SSL para Nuvem (TiDB, PlanetScale, etc.) ---
    ssl: {
        // Habilita SSL. 'rejectUnauthorized: true' garante que o certificado é válido.
        // O Render e o TiDB geralmente funcionam com 'rejectUnauthorized: true'
        // Se falhar, você pode tentar 'rejectUnauthorized: false' (menos seguro) ou fornecer um CA (mais complexo).
        rejectUnauthorized: true
    }
    // -------------------------------------------------------------------
};

const db = mysql.createConnection(dbConfig);
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