const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Verificando token:', token ? 'Presente' : 'Ausente');

    if (!token) {
        console.log('Token não fornecido');
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token válido:', decoded);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.status(403).json({ error: 'Token inválido.' });
    }
};

const checkAdmin = (req, res, next) => {
    console.log('Verificando permissão de admin:', req.user);
    if (req.user.tipo !== 'admin') {
        console.log('Acesso não autorizado: usuário não é admin');
        return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }
    next();
};

module.exports = { authenticateToken, checkAdmin };