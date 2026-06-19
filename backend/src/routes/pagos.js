// Rutas CRUD de pagos
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const auditoria = require('../services/auditoria');

router.use(authMiddleware);

// GET /api/pagos
router.get('/', async (req, res) => {
  try {
    const { cliente_id, contrato_id, metodo, fecha_desde, fecha_hasta } = req.query;

    let where = ['1=1'];
    let params = [];

    if (cliente_id) { where.push('p.cliente_id = ?'); params.push(cliente_id); }
    if (contrato_id) { where.push('p.contrato_id = ?'); params.push(contrato_id); }
    if (metodo) { where.push('p.metodo = ?'); params.push(metodo); }
    if (fecha_desde) { where.push('p.fecha_pago >= ?'); params.push(fecha_desde); }
    if (fecha_hasta) { where.push('p.fecha_pago <= ?'); params.push(fecha_hasta); }

    const [pagos] = await db.query(`
      SELECT p.*, c.nombre_razon_social AS cliente_nombre, u.nombre AS registrado_por_nombre
      FROM pagos p
      INNER JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN usuarios u ON u.id = p.registrado_por
      WHERE ${where.join(' AND ')}
      ORDER BY p.fecha_pago DESC
    `, params);

    // Total del período
    const [[{ total_periodo }]] = await db.query(
      `SELECT COALESCE(SUM(p.monto), 0) AS total_periodo FROM pagos p WHERE ${where.join(' AND ')}`,
      params
    );

    res.json({ success: true, data: pagos, total_periodo });
  } catch (err) {
    console.error('Error listando pagos:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo pagos' });
  }
});

// POST /api/pagos — registrar nuevo pago
router.post('/', async (req, res) => {
  try {
    const { contrato_id, cliente_id, fecha_pago, monto, metodo, link_comprobante, notas } = req.body;

    if (!contrato_id || !cliente_id || !fecha_pago || !monto) {
      return res.status(400).json({ success: false, message: 'contrato_id, cliente_id, fecha_pago y monto son requeridos' });
    }

    const [result] = await db.query(
      `INSERT INTO pagos (contrato_id, cliente_id, fecha_pago, monto, metodo, link_comprobante, registrado_por, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [contrato_id, cliente_id, fecha_pago, monto, metodo || 'transferencia', link_comprobante, req.usuario.id, notas]
    );

    // Calcular próxima fecha de pago según frecuencia del contrato
    const [[contrato]] = await db.query('SELECT frecuencia FROM contratos WHERE id = ?', [contrato_id]);
    if (contrato) {
      let meses = 1;
      if (contrato.frecuencia === 'semestral') meses = 6;
      if (contrato.frecuencia === 'anual') meses = 12;

      await db.query(
        `UPDATE contratos SET fecha_proximo_pago = DATE_ADD(fecha_proximo_pago, INTERVAL ? MONTH), estado = 'activo'
         WHERE id = ?`,
        [meses, contrato_id]
      );

      // Reactivar cliente si estaba moroso/suspendido
      await db.query(
        `UPDATE clientes SET estado = 'activo' WHERE id = ? AND estado IN ('moroso', 'suspendido')`,
        [cliente_id]
      );
    }

    const [[nuevo]] = await db.query(
      `SELECT p.*, c.nombre_razon_social AS cliente_nombre FROM pagos p
       INNER JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?`,
      [result.insertId]
    );

    await auditoria.registrar(req, 'crear', 'pago', result.insertId, `Registró pago de B/. ${parseFloat(monto).toFixed(2)} de "${nuevo.cliente_nombre}"`);
    res.status(201).json({ success: true, data: nuevo, message: 'Pago registrado correctamente' });
  } catch (err) {
    console.error('Error registrando pago:', err);
    res.status(500).json({ success: false, message: 'Error registrando pago' });
  }
});

// PUT /api/pagos/:id — editar pago existente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_pago, monto, metodo, link_comprobante, notas } = req.body;

    const [[pago]] = await db.query('SELECT * FROM pagos WHERE id = ?', [id]);
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });

    if (!fecha_pago || !monto) {
      return res.status(400).json({ success: false, message: 'fecha_pago y monto son requeridos' });
    }

    await db.query(
      `UPDATE pagos SET fecha_pago=?, monto=?, metodo=?, link_comprobante=?, notas=? WHERE id=?`,
      [fecha_pago, monto, metodo || 'transferencia', link_comprobante || null, notas || null, id]
    );

    const [[actualizado]] = await db.query(
      `SELECT p.*, c.nombre_razon_social AS cliente_nombre, u.nombre AS registrado_por_nombre
       FROM pagos p INNER JOIN clientes c ON c.id = p.cliente_id
       LEFT JOIN usuarios u ON u.id = p.registrado_por WHERE p.id = ?`,
      [id]
    );

    await auditoria.registrar(req, 'editar', 'pago', id, `Editó pago #${id} — B/. ${parseFloat(monto).toFixed(2)}`);
    res.json({ success: true, data: actualizado, message: 'Pago actualizado correctamente' });
  } catch (err) {
    console.error('Error editando pago:', err);
    res.status(500).json({ success: false, message: 'Error editando pago' });
  }
});

// DELETE /api/pagos/:id — anular pago
router.delete('/:id', async (req, res) => {
  try {
    const [[pago]] = await db.query('SELECT * FROM pagos WHERE id = ?', [req.params.id]);
    if (!pago) return res.status(404).json({ success: false, message: 'Pago no encontrado' });

    await db.query('DELETE FROM pagos WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Pago eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando pago:', err);
    res.status(500).json({ success: false, message: 'Error eliminando pago' });
  }
});

module.exports = router;
