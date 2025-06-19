const express = require('express');
const { authenticateToken, checkAdmin } = require('../middleware/auth');
const db = require('../config/database');
const router = express.Router();

// Cadastrar mensagem (admin)
router.post('/', authenticateToken, checkAdmin, async (req, res) => {
    console.log('POST /mensagens received:', req.body);
    const { versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao } = req.body;
    const usuario_id = req.user.id;
    console.log('Cadastrando mensagem:', { versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao });

    if (!versao || !livro || !capitulo || !versiculo || !texto_versiculo || !titulo || !descricao) {
        return res.status(400).json({ success: false, message: 'Preencha todos os campos.' });
    }
    if (typeof capitulo !== 'number' || capitulo <= 0) {
        return res.status(400).json({ success: false, message: 'Capítulo deve ser um número positivo.' });
    }
    if (typeof versiculo !== 'number' || versiculo <= 0) {
        return res.status(400).json({ success: false, message: 'Versículo deve ser um número positivo.' });
    }

    try {
        // Determina a próxima ordem_exibicao
        const [lastOrder] = await db.promise().query('SELECT MAX(ordem_exibicao) as maxOrder FROM MensagensDiarias');
        const ordem_exibicao = (lastOrder[0].maxOrder || 0) + 1;

        await db.promise().query(
            'INSERT INTO MensagensDiarias (usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao, ordem_exibicao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao, ordem_exibicao]
        );
        res.json({ success: true, message: 'Mensagem cadastrada com sucesso!' });
    } catch (error) {
        console.error('Erro ao cadastrar mensagem:', error);
        res.status(500).json({ success: false, message: 'Erro ao cadastrar mensagem.' });
    }
});

// Listar mensagens cadastradas (admin)
router.get('/', authenticateToken, checkAdmin, async (req, res) => {
    const { busca } = req.query;
    console.log('Listando mensagens:', { busca });

    try {
        let query = 'SELECT id_mensagem, usuario_id, versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao, ordem_exibicao FROM MensagensDiarias WHERE 1=1';
        const params = [];
        if (busca) {
            query += ' AND (LOWER(titulo) LIKE LOWER(?) OR LOWER(livro) LIKE LOWER(?) OR LOWER(texto_versiculo) LIKE LOWER(?))';
            params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
        }
        query += ' ORDER BY ordem_exibicao DESC';
        const [results] = await db.promise().query(query, params);
        res.json({ success: true, mensagens: results });
    } catch (error) {
        console.error('Erro ao listar mensagens:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar mensagens.' });
    }
});

// Obter mensagem do dia (qualquer usuário autenticado)
router.get('/diaria', authenticateToken, async (req, res) => {
    try {
        // Calcula o índice da mensagem com base no dia atual
        const startDate = new Date('2025-06-01'); // Data base
        const today = new Date();
        const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        const [count] = await db.promise().query('SELECT COUNT(*) as total FROM MensagensDiarias');
        const totalMensagens = count[0].total;
        if (totalMensagens === 0) {
            return res.status(404).json({ success: false, message: 'Nenhuma mensagem disponível.' });
        }
        const ordem_exibicao = (daysSinceStart % totalMensagens) + 1;

        const [results] = await db.promise().query(
            'SELECT id_mensagem, versao, livro, capitulo, versiculo, texto_versiculo, titulo, descricao FROM MensagensDiarias WHERE ordem_exibicao = ?',
            [ordem_exibicao]
        );
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Nenhuma mensagem para hoje.' });
        }
        res.json({ success: true, mensagem: results[0] });
    } catch (error) {
        console.error('Erro ao buscar mensagem do dia:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar mensagem do dia.' });
    }
});

module.exports = router;