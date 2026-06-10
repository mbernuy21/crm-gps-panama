// Rutas para plantillas de WhatsApp
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/plantillas
router.get('/', async (req, res) => {
  try {
    const [plantillas] = await db.query('SELECT * FROM plantillas_whatsapp ORDER BY tipo ASC');
    res.json({ success: true, data: plantillas });
  } catch (err) {
    console.error('Error listando plantillas:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo plantillas' });
  }
});

// POST /api/plantillas — crear plantilla personalizada
router.post('/', async (req, res) => {
  try {
    const { nombre, tipo, contenido } = req.body;
    if (!nombre || !contenido) {
      return res.status(400).json({ success: false, message: 'Nombre y contenido son requeridos' });
    }
    const [r] = await db.query(
      'INSERT INTO plantillas_whatsapp (nombre, tipo, contenido, activa) VALUES (?, ?, ?, 1)',
      [nombre, tipo || 'personalizada', contenido]
    );
    const [[nueva]] = await db.query('SELECT * FROM plantillas_whatsapp WHERE id = ?', [r.insertId]);
    res.status(201).json({ success: true, data: nueva, message: 'Plantilla creada' });
  } catch (err) {
    console.error('Error creando plantilla:', err);
    res.status(500).json({ success: false, message: 'Error creando plantilla' });
  }
});

// DELETE /api/plantillas/:id
router.delete('/:id', async (req, res) => {
  try {
    const [[existe]] = await db.query('SELECT id FROM plantillas_whatsapp WHERE id = ?', [req.params.id]);
    if (!existe) return res.status(404).json({ success: false, message: 'Plantilla no encontrada' });
    await db.query('DELETE FROM plantillas_whatsapp WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Plantilla eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error eliminando plantilla' });
  }
});

// PUT /api/plantillas/:id — editar contenido de plantilla
router.put('/:id', async (req, res) => {
  try {
    const { nombre, contenido, activa } = req.body;

    const [[existe]] = await db.query('SELECT id FROM plantillas_whatsapp WHERE id = ?', [req.params.id]);
    if (!existe) return res.status(404).json({ success: false, message: 'Plantilla no encontrada' });

    await db.query(
      'UPDATE plantillas_whatsapp SET nombre=?, contenido=?, activa=? WHERE id=?',
      [nombre, contenido, activa !== undefined ? activa : 1, req.params.id]
    );

    const [[actualizada]] = await db.query('SELECT * FROM plantillas_whatsapp WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: actualizada, message: 'Plantilla actualizada correctamente' });
  } catch (err) {
    console.error('Error actualizando plantilla:', err);
    res.status(500).json({ success: false, message: 'Error actualizando plantilla' });
  }
});

// POST /api/plantillas/generar-link — generar link de WhatsApp con variables resueltas
router.post('/generar-link', async (req, res) => {
  try {
    const { plantilla_id, variables, numero_whatsapp } = req.body;

    if (!plantilla_id || !numero_whatsapp) {
      return res.status(400).json({ success: false, message: 'plantilla_id y numero_whatsapp son requeridos' });
    }

    const [[plantilla]] = await db.query(
      'SELECT * FROM plantillas_whatsapp WHERE id = ? AND activa = 1',
      [plantilla_id]
    );

    if (!plantilla) return res.status(404).json({ success: false, message: 'Plantilla no encontrada o inactiva' });

    let mensaje = plantilla.contenido;

    // Reemplazar variables dinámicas
    if (variables && typeof variables === 'object') {
      Object.keys(variables).forEach(key => {
        mensaje = mensaje.replaceAll(`[${key}]`, variables[key] || '');
      });
    }

    // Limpiar el número (solo dígitos)
    const numero = numero_whatsapp.replace(/\D/g, '');
    const link = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

    res.json({ success: true, data: { link, mensaje, numero } });
  } catch (err) {
    console.error('Error generando link WhatsApp:', err);
    res.status(500).json({ success: false, message: 'Error generando link' });
  }
});

module.exports = router;
