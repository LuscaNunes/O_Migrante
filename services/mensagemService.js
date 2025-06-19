const db = require('../config/database');

async function cadastrarMensagem({ usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao }) {
    if (!versao || !livro || !capitulo || !versiculo || !texto_versiculo || !titulo || !descricao) {
        throw new Error('Preencha todos os campos');
    }
    if (typeof capitulo !== 'number' || capitulo <= 0) {
        throw new Error('Capítulo deve ser um número positivo');
    }
    if (typeof versiculo !== 'number' || versiculo <= 0) {
        throw new Error('Versículo deve ser um número positivo');
    }

    try {
        const [lastOrder] = await db.promise().query('SELECT MAX(ordem_exibicao) as maxOrder FROM MensagensDiarias');
        const ordem_exibicao = (lastOrder[0].maxOrder || 0) + 1;

        await db.promise().query(
            'INSERT INTO MensagensDiarias (usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao, ordem_exibicao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao, ordem_exibicao]
        );
    } catch (error) {
        throw new Error('Erro ao salvar mensagem: ' + error.message);
    }
}

async function listarMensagens(busca) {
    try {
        let query = 'SELECT id_mensagem, usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao, ordem_exibicao FROM MensagensDiarias WHERE 1=1';
        const params = [];
        if (busca) {
            query += ' AND (LOWER(titulo) LIKE LOWER(?) OR LOWER(livro) LIKE LOWER(?) OR LOWER(texto_versiculo) LIKE LOWER(?))';
            params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
        }
        query += ' ORDER BY ordem_exibicao DESC';
        const [results] = await db.promise().query(query, params);
        return results;
    } catch (error) {
        throw new Error('Erro ao listar mensagens: ' + error.message);
    }
}

async function obterMensagemDoDia() {
    try {
        const startDate = new Date('2025-06-01');
        const today = new Date();
        const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        const [count] = await db.promise().query('SELECT COUNT(*) as total FROM MensagensDiarias');
        const totalMensagens = count[0].total;
        if (totalMensagens === 0) return null;
        const ordem_exibicao = (daysSinceStart % totalMensagens) + 1;

        const [results] = await db.promise().query(
            'SELECT id_mensagem, versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao FROM MensagensDiarias WHERE ordem_exibicao = ?',
            [ordem_exibicao]
        );
        return results[0] || null;
    } catch (error) {
        throw new Error('Erro ao buscar mensagem do dia: ' + error.message);
    }
}

module.exports = { cadastrarMensagem, listarMensagens, obterMensagemDoDia };