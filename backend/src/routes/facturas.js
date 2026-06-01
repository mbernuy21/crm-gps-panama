// Rutas de facturas — generación PDF y CRUD
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { generarPDFFactura } = require('../services/pdfFactura');

router.use(authMiddleware);

// GET /api/facturas
router.get('/', async (req, res) => {
  try {
    const { cliente_id, estado, fecha_desde, fecha_hasta } = req.query;

    let where = ['1=1'];
    let params = [];

    if (cliente_id) { where.push('f.cliente_id = ?'); params.push(cliente_id); }
    if (estado) { where.push('f.estado = ?'); params.push(estado); }
    if (fecha_desde) { where.push('f.fecha_emision >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { where.push('f.fecha_emision <= ?'); params.push(fecha_hasta); }

    const [facturas] = await db.query(`
      SELECT f.*, c.nombre_razon_social AS cliente_nombre
      FROM facturas f
      INNER JOIN clientes c ON c.id = f.cliente_id
      WHERE ${where.join(' AND ')}
      ORDER BY f.created_at DESC
    `, params);

    res.json({ success: true, data: facturas });
  } catch (err) {
    console.error('Error listando facturas:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo facturas' });
  }
});

// GET /api/facturas/:id
router.get('/:id', async (req, res) => {
  try {
    const [[factura]] = await db.query(`
      SELECT f.*, c.nombre_razon_social AS cliente_nombre, c.ruc AS cliente_ruc,
        c.direccion AS cliente_direccion, c.email AS cliente_email
      FROM facturas f
      INNER JOIN clientes c ON c.id = f.cliente_id
      WHERE f.id = ?
    `, [req.params.id]);

    if (!factura) return res.status(404).json({ success: false, message: 'Factura no encontrada' });

    res.json({ success: true, data: factura });
  } catch (err) {
    console.error('Error obteniendo factura:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo factura' });
  }
});

// POST /api/facturas — crear factura
router.post('/', async (req, res) => {
  try {
    const { cliente_id, fecha_emision, items, notas } = req.body;

    if (!cliente_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'cliente_id e items son requeridos' });
    }

    const [[cliente]] = await db.query('SELECT * FROM clientes WHERE id = ?', [cliente_id]);
    if (!cliente) return res.status(400).json({ success: false, message: 'Cliente no encontrado' });

    // Obtener y actualizar número de factura correlativo
    const [[config]] = await db.query("SELECT valor FROM configuracion WHERE clave = 'siguiente_numero_factura'");
    const [[prefixConfig]] = await db.query("SELECT valor FROM configuracion WHERE clave = 'prefijo_factura'");
    const numero = parseInt(config.valor);
    const prefijo = prefixConfig?.valor || 'GPS-';
    const numero_factura = `${prefijo}${String(numero).padStart(4, '0')}`;

    await db.query(
      "UPDATE configuracion SET valor = ? WHERE clave = 'siguiente_numero_factura'",
      [numero + 1]
    );

    // Calcular totales
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.precio) * parseInt(item.cantidad)), 0);
    const total = subtotal; // Sin ITBMS por ahora (estructura preparada)

    const [result] = await db.query(
      `INSERT INTO facturas (cliente_id, numero_factura, fecha_emision, items_json, subtotal, total, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'borrador')`,
      [cliente_id, numero_factura, fecha_emision || new Date().toISOString().split('T')[0],
       JSON.stringify(items), subtotal, total]
    );

    const [[nueva]] = await db.query('SELECT * FROM facturas WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: nueva, message: 'Factura creada correctamente' });
  } catch (err) {
    console.error('Error creando factura:', err);
    res.status(500).json({ success: false, message: 'Error creando factura' });
  }
});

// PUT /api/facturas/:id/estado — cambiar estado
router.put('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    const estadosValidos = ['borrador', 'enviada', 'pagada', 'anulada'];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    await db.query('UPDATE facturas SET estado = ? WHERE id = ?', [estado, req.params.id]);
    res.json({ success: true, message: `Factura marcada como: ${estado}` });
  } catch (err) {
    console.error('Error actualizando estado factura:', err);
    res.status(500).json({ success: false, message: 'Error actualizando factura' });
  }
});

// GET /api/facturas/:id/pdf — generar y descargar PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const [[factura]] = await db.query(`
      SELECT f.*, c.nombre_razon_social AS cliente_nombre, c.ruc AS cliente_ruc,
        c.direccion AS cliente_direccion, c.email AS cliente_email, c.telefono_principal AS cliente_telefono
      FROM facturas f INNER JOIN clientes c ON c.id = f.cliente_id
      WHERE f.id = ?
    `, [req.params.id]);

    if (!factura) return res.status(404).json({ success: false, message: 'Factura no encontrada' });

    factura.items_json = typeof factura.items_json === 'string'
      ? JSON.parse(factura.items_json)
      : factura.items_json;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="factura-${factura.numero_factura}.pdf"`);

    generarPDFFactura(factura, res);
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ success: false, message: 'Error generando PDF' });
  }
});

// DELETE /api/facturas/:id
router.delete('/:id', async (req, res) => {
  try {
    const [[factura]] = await db.query('SELECT id, estado FROM facturas WHERE id = ?', [req.params.id]);
    if (!factura) return res.status(404).json({ success: false, message: 'Factura no encontrada' });

    if (factura.estado === 'pagada') {
      return res.status(400).json({ success: false, message: 'No se puede eliminar una factura pagada. Anúlela primero.' });
    }

    await db.query('DELETE FROM facturas WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Factura eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando factura:', err);
    res.status(500).json({ success: false, message: 'Error eliminando factura' });
  }
});

module.exports = router;
