const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    console.log('Requisição de login recebida:', { email, senha: '****' });

    try {
        const [rows] = await db.promise().query('SELECT * FROM Usuarios WHERE email = ?', [email]);
        if (rows.length === 0) {
            console.log('Usuário não encontrado');
            return res.status(401).json({ auth: false, message: 'Email ou senha incorretos.' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(senha, user.senha);
        if (!isMatch) {
            console.log('Senha incorreta');
            return res.status(401).json({ auth: false, message: 'Email ou senha incorretos.' });
        }

        const token = jwt.sign({ id: user.id_usuario, tipo: user.tipo }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log('Token gerado para usuário:', user.id_usuario);
        res.json({ auth: true, token });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ auth: false, message: 'Erro no servidor' });
    }
});

// Register route
router.post('/register', async (req, res) => {
    const { nome, email, senha } = req.body;
    console.log('Requisição de cadastro recebida:', { nome, email, senha: '****' });

    try {
        const [existingUsers] = await db.promise().query('SELECT * FROM Usuarios WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            console.log('Email já cadastrado');
            return res.status(400).json({ message: 'Email já cadastrado.' });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);
        await db.promise().query('INSERT INTO Usuarios (nome, email, senha, tipo, criado_em) VALUES (?, ?, ?, ?, NOW())', [nome, email, hashedPassword, 'user']);
        console.log('Usuário cadastrado com sucesso');
        res.json({ message: 'Cadastro realizado com sucesso!' });
    } catch (error) {
        console.error('Erro no cadastro:', error);
        res.status(500).json({ message: 'Erro no cadastro.' });
    }
});

// Verify token route
router.get('/verifyToken', authenticateToken, async (req, res) => {
    console.log('Rota /verifyToken acessada, usuário:', req.user);
    try {
        const [rows] = await db.promise().query('SELECT id_usuario, nome, email, tipo, criado_em, xp_total, fase_atual FROM Usuarios WHERE id_usuario = ?', [req.user.id]);
        if (rows.length === 0) {
            console.log('Usuário não encontrado');
            return res.status(401).json({ auth: false, message: 'Usuário não encontrado' });
        }
        const user = rows[0];
        console.log('Usuário encontrado:', user);
        res.json({ auth: true, user });
    } catch (error) {
        console.error('Erro na verificação:', error);
        res.status(500).json({ auth: false, message: 'Erro no servidor' });
    }
});

// Get detailed progress
router.get('/progresso/detalhado', authenticateToken, async (req, res) => {
    console.log('Rota /progresso/detalhado acessada, usuário:', req.user);
    try {
        const [progress] = await db.promise().query(
            'SELECT nivel_id, COUNT(*) as completos, SUM(xp_ganho) as xp_total FROM ProgressoUsuario WHERE usuario_id = ? AND concluido = 1 GROUP BY nivel_id',
            [req.user.id]
        );
        if (!progress.length) {
            console.log('Nenhum progresso encontrado');
            return res.status(200).json({ niveisCompletos: {}, message: 'Nenhum progresso encontrado' });
        }
        const niveisCompletos = progress.reduce((acc, row) => {
            acc[row.nivel_id] = { completos: row.completos, xp_total: row.xp_total };
            return acc;
        }, {});
        console.log('Progresso encontrado:', niveisCompletos);

        // Update xp_total in Usuarios
        const totalXp = progress.reduce((sum, row) => sum + row.xp_total, 0);
        await db.promise().query('UPDATE Usuarios SET xp_total = ? WHERE id_usuario = ?', [totalXp, req.user.id]);

        res.json({ niveisCompletos });
    } catch (error) {
        console.error('Erro ao buscar progresso detalhado:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(400).json({ message: 'Tabela ProgressoUsuario não encontrada' });
        }
        res.status(500).json({ message: 'Erro ao buscar progresso detalhado', error: error.message });
    }
});

// Get active levels
router.get('/niveis/ativos', authenticateToken, async (req, res) => {
    console.log('Rota /niveis/ativos acessada, usuário:', req.user);
    try {
        const [niveis] = await db.promise().query('SELECT id, titulo, descricao, xp_total, posicao FROM niveis WHERE ativo = 1');
        if (!niveis.length) {
            console.log('Nenhum nível ativo encontrado');
            return res.status(200).json({ niveis: [], message: 'Nenhum nível ativo encontrado' });
        }
        console.log('Níveis encontrados:', niveis);
        res.json({ niveis });
    } catch (error) {
        console.error('Erro ao buscar níveis ativos:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(400).json({ message: 'Tabela niveis não encontrada' });
        }
        res.status(500).json({ message: 'Erro ao buscar níveis ativos', error: error.message });
    }
});

// Get button progress for a level
router.get('/progresso/botoes/:id', authenticateToken, async (req, res) => {
    console.log('Rota /progresso/botoes/:id acessada, usuário:', req.user);
    try {
        const nivelId = req.params.id;
        const [botoes] = await db.promise().query(
            'SELECT ordem, concluido, xp_ganho FROM ProgressoUsuario WHERE usuario_id = ? AND nivel_id = ?',
            [req.user.id, nivelId]
        );
        const botoesCompletos = botoes.reduce((acc, botao) => {
            acc[botao.ordem] = { concluido: botao.concluido, xp_ganho: botao.xp_ganho };
            return acc;
        }, {});
        console.log('Progresso de botões:', botoesCompletos);
        res.json({ botoesCompletos });
    } catch (error) {
        console.error('Erro ao buscar progresso de botões:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(400).json({ message: 'Tabela ProgressoUsuario não encontrada' });
        }
        res.status(500).json({ message: 'Erro ao buscar progresso de botões', error: error.message });
    }
});

// Update user profile
router.put('/usuarios/atualizar', authenticateToken, async (req, res) => {
    console.log('Rota /usuarios/atualizar acessada, usuário:', req.user);
    const { nome, email, senha } = req.body;

    try {
        const updates = { nome };
        const params = [nome];

        if (email) {
            const [existingUsers] = await db.promise().query('SELECT id_usuario FROM Usuarios WHERE email = ? AND id_usuario != ?', [email, req.user.id]);
            if (existingUsers.length > 0) {
                return res.status(400).json({ success: false, message: 'Email já está em uso.' });
            }
            updates.email = email;
            params.push(email);
        }

        if (senha) {
            const hashedPassword = await bcrypt.hash(senha, 10);
            updates.senha = hashedPassword;
            params.push(hashedPassword);
        }

        params.push(req.user.id);

        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        await db.promise().query(`UPDATE Usuarios SET ${setClause} WHERE id_usuario = ?`, params);

        res.json({ success: true, message: 'Perfil atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar perfil' });
    }
});

// authRoutes.js (Rota /teste-tabela)

router.get('/teste-tabela', async (req, res) => {
    console.log('--- Executando teste de nome de tabela ---');
    try {
        // Tentativa 1 (Original): Usuarios (U maiúsculo)
        const [rows_upper_plural] = await db.promise().query('SELECT * FROM Usuarios LIMIT 1');
        return res.json({ success: true, tableName: 'Usuarios (U maiúsculo)', data: rows_upper_plural });
    } catch (error_upper_plural) {
        
        try {
            // Tentativa 2: usuarios (minúsculo)
            const [rows_lower_plural] = await db.promise().query('SELECT * FROM usuarios LIMIT 1');
            return res.json({ success: true, tableName: 'usuarios (minúsculo)', data: rows_lower_plural });
        } catch (error_lower_plural) {

            try {
                // *** Tentativa 3: usuario (singular, minúsculo) ***
                const [rows_lower_singular] = await db.promise().query('SELECT * FROM usuario LIMIT 1');
                return res.json({ success: true, tableName: 'usuario (singular, minúsculo)', data: rows_lower_singular });
            } catch (error_singular) {
                
                console.error('FALHA GERAL. O nome da tabela é outro:', error_singular);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Nenhuma das formas de capitalização Usuários/usuarios/usuario funcionou.', 
                    error_original: error_singular.message 
                });
            }
        }
    }
});

module.exports = router;