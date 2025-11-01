const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Defined' : 'Undefined');

// Módulos
const db = require('./config/database');
const { authenticateToken, checkAdmin } = require('./middleware/auth');

// Rotas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const nivelRoutes = require('./routes/nivelRoutes');
const perguntaRoutes = require('./routes/perguntaRoutes');
const progressoRoutes = require('./routes/progressoRoutes');
const anotacaoRoutes = require('./routes/anotacaoRoutes');
const mensagemRoutes = require('./routes/mensagemRoutes');
const amizadeRoutes = require('./routes/amizadeRoutes');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// --- 1. ROTAS PÚBLICAS (Login/Cadastro e Arquivo Index) ---

// Rota para a tela inicial (index.html) - Deve ser pública!
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'telas', 'Index.html'));
});

// Rotas de Autenticação (Login e Cadastro) - DEVEM SER PÚBLICAS!
app.use('/auth', authRoutes); 

// Servir arquivos estáticos PÚBLICOS (CSS, JS, etc.) para o login/cadastro.
// Isso deve vir antes da proteção de rotas.
app.use(express.static(path.join(__dirname, 'public')));
app.use('/biblia', express.static(path.join(__dirname, 'public', 'biblia')));

// --- 2. APLICAÇÃO DO MIDDLEWARE DE AUTENTICAÇÃO ---

// 🛑 A partir daqui, todas as rotas/arquivos estáticos precisam de autenticação!

// Proteção para Painel.html e outros arquivos do usuário logado
// Use '/app' ou outra rota para os arquivos que exigem login.
app.use('/app', authenticateToken, express.static(path.join(__dirname, 'public', 'telas'))); 

// Rotas de API que precisam de token
app.use('/usuarios', authenticateToken, userRoutes);
app.use('/niveis', authenticateToken, nivelRoutes);
app.use('/perguntas', authenticateToken, perguntaRoutes);
app.use('/progresso', authenticateToken, progressoRoutes);
app.use('/anotacoes', authenticateToken, anotacaoRoutes);
app.use('/mensagens', authenticateToken, mensagemRoutes);
app.use('/amizades', authenticateToken, amizadeRoutes);

// Proteção da área de ADMIN (requer autenticação E permissão de admin)
app.use('/admin', authenticateToken, checkAdmin, express.static(path.join(__dirname, 'admin')));

// --- 3. LIMPEZA E ERROS ---

// Remoção das rotas incorretas:
// app.use(authRoutes); // Removido!
// app.use('/verifyToken', authRoutes); // Removido! (Isso deve ser uma rota específica dentro de authRoutes)
// app.use('/public', authenticateToken, express.static(path.join(__dirname, 'public'))); // Subsitituido!

app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT} - ${new Date().toLocaleString()}`));