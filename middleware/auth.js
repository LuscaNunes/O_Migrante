const jwt = require('jsonwebtoken');
require('dotenv').config();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('Token não fornecido');
    return res.status(401).json({ success: false, message: 'Token não fornecido.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Token inválido ou expirado:', err.message);
      return res.status(403).json({ success: false, message: 'Token inválido ou expirado.' });
    }
    console.log('Token válido:', user);
    req.user = user; // user contém { id, tipo, iat, exp }
    next();
  });
}

function checkAdmin(req, res, next) {
  if (req.user.tipo !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acesso restrito a administradores.' });
  }
  next();
}

module.exports = { authenticateToken, checkAdmin };