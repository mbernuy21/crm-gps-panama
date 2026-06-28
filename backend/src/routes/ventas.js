// Rutas CRUD de ventas y cobros únicos (no recurrentes)
// Ej: venta de equipo GPS, instalación, depósito de garantía
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const auditoria = require('../services/auditoria');

router.use(authMiddleware);

// GET /api/ventas — listar ventas/cobros únicos
router.get('/', async (req, res) => {
  try {
    const { cliente_id, fecha_desde, fecha_hasta } = req.query;
    let where = ['1=1'];
    let params = [];

    if (cliente_id) { where.push('v.cliente_id = ?'); params.push(cliente_id); }
    if (fecha_desde) { where.push('v.fecha >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { where.push('v.fecha <= ?'); params.push(fecha_hasta); }

    const [ventas] = await db.query(`
      SELECT v.*, c.nombre_razon_social AS cliente_nombre, u.nombre AS registrado_por_nombre
      FROM ventas_cobros v
      INNER JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.registrado_por
      WHERE ${where.join(' AND ')}
      ORDER BY v.fecha DESC, v.created_at DESC
    `, params);

    const [[{ total_periodo }]] = await db.query(
      `SELECT COALESCE(SUM(v.total), 0) AS total_periodo FROM ventas_cobros v WHERE ${where.join(' AND ')}`,
      params
    );

    res.json({ success: true, data: ventas, total_periodo });
  } catch (err) {
    console.error('Error listando ventas:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo ventas' });
  }
});

// POST /api/ventas — registrar venta/cobro único
router.post('/', async (req, res) => {
  try {
    const { cliente_id, tipo, descripcion, cantidad, precio_unitario, metodo, fecha, link_comprobante, notas } = req.body;

    if (!cliente_id || !tipo || !cantidad || !precio_unitario) {
      return res.status(400).json({ success: false, message: 'cliente_id, tipo, cantidad y precio_unitario son requeridos' });
    }

    const cant = parseFloat(cantidad) || 1;
    const precio = parseFloat(precio_unitario) || 0;
    const total = cant * precio;
    const fechaVenta = fecha || new Date().toISOString().split('T')[0];

    const [result] = await db.query(
      `INSERT INTO ventas_cobros (cliente_id, tipo, descripcion, cantidad, precio_unitario, total, metodo, fecha, link_comprobante, notas, registrado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cliente_id, tipo, descripcion || tipo, cant, precio, total, metodo || 'efectivo', fechaVenta, link_comprobante || null, notas || null, req.usuario.id]
    );

    const [[nueva]] = await db.query(
      `SELECT v.*, c.nombre_razon_social AS cliente_nombre FROM ventas_cobros v
       INNER JOIN clientes c ON c.id = v.cliente_id WHERE v.id = ?`,
      [result.insertId]
    );

    await auditoria.registrar(req, 'crear', 'venta', result.insertId,
      `Registró venta: ${tipo} x${cant} — B/. ${total.toFixed(2)} a "${nueva.cliente_nombre}"`);

    res.status(201).json({ success: true, data: nueva, message: 'Venta registrada correctamente' });
  } catch (err) {
    console.error('Error registrando venta:', err);
    res.status(500).json({ success: false, message: 'Error registrando venta' });
  }
});

// PUT /api/ventas/:id — editar venta
router.put('/:id', async (req, res) => {
  try {
    const { tipo, descripcion, cantidad, precio_unitario, metodo, fecha, link_comprobante, notas } = req.body;
    const [[venta]] = await db.query('SELECT * FROM ventas_cobros WHERE id = ?', [req.params.id]);
    if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' });

    const cant = parseFloat(cantidad) || 1;
    const precio = parseFloat(precio_unitario) || 0;
    const total = cant * precio;

    await db.query(
      `UPDATE ventas_cobros SET tipo=?, descripcion=?, cantidad=?, precio_unitario=?, total=?, metodo=?, fecha=?, link_comprobante=?, notas=? WHERE id=?`,
      [tipo, descripcion || tipo, cant, precio, total, metodo || 'efectivo', fecha, link_comprobante || null, notas || null, req.params.id]
    );

    const [[actualizada]] = await db.query(
      `SELECT v.*, c.nombre_razon_social AS cliente_nombre FROM ventas_cobros v
       INNER JOIN clientes c ON c.id = v.cliente_id WHERE v.id = ?`,
      [req.params.id]
    );

    await auditoria.registrar(req, 'editar', 'venta', req.params.id, `Editó venta #${req.params.id}`);
    res.json({ success: true, data: actualizada, message: 'Venta actualizada correctamente' });
  } catch (err) {
    console.error('Error editando venta:', err);
    res.status(500).json({ success: false, message: 'Error editando venta' });
  }
});

// DELETE /api/ventas/:id — eliminar venta
router.delete('/:id', async (req, res) => {
  try {
    const [[venta]] = await db.query('SELECT * FROM ventas_cobros WHERE id = ?', [req.params.id]);
    if (!venta) return res.status(404).json({ success: false, message: 'Venta no encontrada' });

    await db.query('DELETE FROM ventas_cobros WHERE id = ?', [req.params.id]);
    await auditoria.registrar(req, 'eliminar', 'venta', req.params.id, `Eliminó venta #${req.params.id}`);
    res.json({ success: true, message: 'Venta eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando venta:', err);
    res.status(500).json({ success: false, message: 'Error eliminando venta' });
  }
});

module.exports = router;
