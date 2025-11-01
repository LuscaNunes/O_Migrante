const mysql = require('mysql2');
require('dotenv').config();

// Se o DB_PORT não estiver definido, o default é 3306 (padrão)
// Mas vamos garantir que ele busque a porta 4000 do TiDB
const DB_PORT = process.env.DB_PORT || 3306;
const DB_HOST = process.env.DB_HOST || 'localhost';

/**
 * Configuração do Pool de Conexões com o banco de dados MySQL
 */
const poolConfig = {
    host: DB_HOST,
    port: DB_PORT,
    // user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2024',
    database: process.env.DB_NAME || 'test',
    connectTimeout: 10000,
    charset: 'utf8mb4',
    
    // --- Configurações do Pool (NOVO) ---
    waitForConnections: true, // Se o limite for atingido, espera por uma conexão livre
    connectionLimit: 10,      // Número máximo de conexões no pool
    queueLimit: 0,            // 0 significa sem limite para requisições na fila
    
    // --- Configurações de Resiliência para Cloud (NOVO) ---
    enableKeepAlive: true,      // Tenta ativamente manter a conexão viva
    keepAliveInitialDelay: 0,
    idleTimeout: 60000,         // 60 segundos antes de considerar uma conexão inativa
    
    // --- Configuração de SSL para Nuvem (TiDB) ---
    ssl: {
        rejectUnauthorized: true
    }
};

// Cria o Pool de Conexões
const pool = mysql.createPool(poolConfig);

/**
 * Funções de Verificação (Usando o Pool)
 */
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Erro ao obter conexão do Pool:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            // Se o pool falhar, pode haver um problema de firewall/credenciais no início
            console.error('Verifique as credenciais e o Firewall/ACL do TiDB!');
        }
        // Não é necessário reconexão manual aqui, o Pool gerencia isso.
        // A falha inicial pode indicar um erro de configuração.
    } else {
        console.log('Pool de conexões criado e funcionando. Conectado ao MySQL!');
        // Se a conexão for bem-sucedida, você pode liberá-la e verificar o DB.
        connection.query('SELECT DATABASE() AS db_name', (err, result) => {
            if (err) {
                console.error('Erro ao verificar banco de dados:', err);
            } else {
                console.log('Banco de dados atual:', result[0].db_name);
            }
            connection.release(); // LIBERA A CONEXÃO DE VOLTA AO POOL
        });
    }
});

// Exporta o Pool, que é o que deve ser usado com .promise() nos seus routes
module.exports = pool;