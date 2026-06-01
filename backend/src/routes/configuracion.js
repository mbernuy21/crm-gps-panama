// Rutas de configuración del sistema
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/configuracion
router.get('/', async (req, res) => {
  try {
    const [config] = await db.query('SELECT * FROM configuracion ORDER BY clave ASC');
    res.json({ success: true, data: config });
  } catch (err) {
    console.error('Error obteniendo configuración:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo configuración' });
  }
});

// PUT /api/configuracion/:clave
router.put('/:clave', async (req, res) => {
  try {
    const { valor } = req.body;
    if (valor === undefined) {
      return res.status(400).json({ success: false, message: 'El valor es requerido' });
    }

    await db.query(
      'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
      [req.params.clave, valor, valor]
    );

    res.json({ success: true, message: 'Configuración actualizada' });
  } catch (err) {
    console.error('Error actualizando configuración:', err);
    res.status(500).json({ success: false, message: 'Error actualizando configuración' });
  }
});

module.exports = router;
