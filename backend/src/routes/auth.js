// Rutas de autenticación: login y perfil
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
    }

    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const usuario = rows[0];
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      data: {
        token,
        usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
      },
      message: 'Login exitoso'
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// GET /api/auth/me — obtener usuario actual
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error obteniendo perfil:', err);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// PUT /api/auth/cambiar-password
router.put('/cambiar-password', authMiddleware, async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({ success: false, message: 'Contraseña actual y nueva requeridas' });
    }

    if (password_nueva.length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña nueva debe tener al menos 8 caracteres' });
    }

    const [rows] = await db.query('SELECT password_hash FROM usuarios WHERE id = ?', [req.usuario.id]);
    const valida = await bcrypt.compare(password_actual, rows[0].password_hash);

    if (!valida) {
      return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });
    }

    const nuevoHash = await bcrypt.hash(password_nueva, 10);
    await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [nuevoHash, req.usuario.id]);

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error cambiando contraseña:', err);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

module.exports = router;
