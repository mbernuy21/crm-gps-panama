// Middleware de autenticación JWT
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Aceptar token desde header O desde query param (para descargas directas de archivos)
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
}

// Solo admins pueden acceder (preparado para roles futuros)
function soloAdmin(req, res, next) {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso restringido a administradores' });
  }
  next();
}

module.exports = { authMiddleware, soloAdmin };
