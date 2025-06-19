const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Defined' : 'Undefined');

const db = require('./config/database');
const { authenticateToken, checkAdmin } = require('./middleware/auth');
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
  origin: '*', // Ou especifique a origem do frontend, ex: 'http://localhost:3000'
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/public', authenticateToken, express.static(path.join(__dirname, 'public')));
app.use('/admin', authenticateToken, checkAdmin, express.static(path.join(__dirname, 'admin')));
app.use('/biblia', express.static(path.join(__dirname, 'public', 'biblia')));

app.use('/auth', authRoutes);
app.use(authRoutes);
app.use('/verifyToken', authRoutes);
app.use('/usuarios', userRoutes);
app.use('/niveis', nivelRoutes);
app.use('/perguntas', perguntaRoutes);
app.use('/progresso', progressoRoutes);
app.use('/anotacoes', anotacaoRoutes);
app.use('/mensagens', mensagemRoutes);
app.use('/amizades', amizadeRoutes);


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'telas', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Erro no servidor:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT} - ${new Date().toLocaleString()}`));

app.use(express.static(path.join(__dirname, 'public')));