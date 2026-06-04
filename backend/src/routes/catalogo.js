// Rutas para catálogo de productos — GPS Tracker Panamá
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/catalogo — listar todos los productos activos
router.get('/', async (req, res) => {
  try {
    const [productos] = await db.query(
      'SELECT * FROM catalogo_productos WHERE activo = 1 ORDER BY nombre ASC'
    );
    res.json({ success: true, data: productos });
  } catch (err) {
    console.error('Error obteniendo catálogo:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo catálogo' });
  }
});

// POST /api/catalogo — crear producto
router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion, precio } = req.body;
    if (!nombre) return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    const [r] = await db.query(
      'INSERT INTO catalogo_productos (nombre, descripcion, precio) VALUES (?, ?, ?)',
      [nombre, descripcion || '', parseFloat(precio) || 0]
    );
    const [[producto]] = await db.query('SELECT * FROM catalogo_productos WHERE id = ?', [r.insertId]);
    res.json({ success: true, data: producto, message: 'Producto creado' });
  } catch (err) {
    console.error('Error creando producto:', err);
    res.status(500).json({ success: false, message: 'Error creando producto' });
  }
});

// PUT /api/catalogo/:id — actualizar producto
router.put('/:id', async (req, res) => {
  try {
    const { nombre, descripcion, precio, activo } = req.body;
    await db.query(
      'UPDATE catalogo_productos SET nombre=?, descripcion=?, precio=?, activo=? WHERE id=?',
      [nombre, descripcion || '', parseFloat(precio) || 0, activo !== undefined ? activo : 1, req.params.id]
    );
    res.json({ success: true, message: 'Producto actualizado' });
  } catch (err) {
    console.error('Error actualizando producto:', err);
    res.status(500).json({ success: false, message: 'Error actualizando producto' });
  }
});

// DELETE /api/catalogo/:id — desactivar producto
router.delete('/:id', async (req, res) => {
  try {
    await db.query('UPDATE catalogo_productos SET activo = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (err) {
    console.error('Error eliminando producto:', err);
    res.status(500).json({ success: false, message: 'Error eliminando producto' });
  }
});

module.exports = router;
