// Rutas CRUD de contratos
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const auditoria = require('../services/auditoria');

router.use(authMiddleware);

// GET /api/contratos
router.get('/', async (req, res) => {
  try {
    const { estado, frecuencia, cliente_id } = req.query;

    let where = ['1=1'];
    let params = [];

    if (estado) { where.push('con.estado = ?'); params.push(estado); }
    if (frecuencia) { where.push('con.frecuencia = ?'); params.push(frecuencia); }
    if (cliente_id) { where.push('con.cliente_id = ?'); params.push(cliente_id); }

    const [contratos] = await db.query(`
      SELECT con.*, c.nombre_razon_social AS cliente_nombre, c.whatsapp AS cliente_whatsapp,
        c.estado AS cliente_estado,
        DATEDIFF(con.fecha_proximo_pago, CURDATE()) AS dias_para_vencer
      FROM contratos con
      INNER JOIN clientes c ON c.id = con.cliente_id
      WHERE ${where.join(' AND ')}
      ORDER BY con.fecha_proximo_pago ASC
    `, params);

    res.json({ success: true, data: contratos });
  } catch (err) {
    console.error('Error listando contratos:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo contratos' });
  }
});

// GET /api/contratos/:id
router.get('/:id', async (req, res) => {
  try {
    const [[contrato]] = await db.query(`
      SELECT con.*, c.nombre_razon_social AS cliente_nombre, c.whatsapp AS cliente_whatsapp
      FROM contratos con
      INNER JOIN clientes c ON c.id = con.cliente_id
      WHERE con.id = ?
    `, [req.params.id]);

    if (!contrato) return res.status(404).json({ success: false, message: 'Contrato no encontrado' });

    const [pagos] = await db.query(
      `SELECT p.*, u.nombre AS registrado_por_nombre
       FROM pagos p LEFT JOIN usuarios u ON u.id = p.registrado_por
       WHERE p.contrato_id = ? ORDER BY p.fecha_pago DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...contrato, pagos } });
  } catch (err) {
    console.error('Error obteniendo contrato:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo contrato' });
  }
});

// POST /api/contratos
router.post('/', async (req, res) => {
  try {
    const { cliente_id, frecuencia, monto_total, fecha_inicio, fecha_proximo_pago, dias_alerta, estado } = req.body;

    if (!cliente_id || !monto_total || !fecha_inicio || !fecha_proximo_pago) {
      return res.status(400).json({ success: false, message: 'cliente_id, monto_total, fecha_inicio y fecha_proximo_pago son requeridos' });
    }

    const [[cliente]] = await db.query('SELECT id FROM clientes WHERE id = ?', [cliente_id]);
    if (!cliente) return res.status(400).json({ success: false, message: 'Cliente no encontrado' });

    const [result] = await db.query(
      `INSERT INTO contratos (cliente_id, frecuencia, monto_total, fecha_inicio, fecha_proximo_pago, dias_alerta, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cliente_id, frecuencia || 'mensual', monto_total, fecha_inicio, fecha_proximo_pago, dias_alerta || 5, estado || 'activo']
    );

    const [[nuevo]] = await db.query('SELECT * FROM contratos WHERE id = ?', [result.insertId]);
    await auditoria.registrar(req, 'crear', 'contrato', result.insertId, `Creó contrato ${frecuencia || 'mensual'} de B/. ${parseFloat(monto_total).toFixed(2)}`);
    res.status(201).json({ success: true, data: nuevo, message: 'Contrato creado correctamente' });
  } catch (err) {
    console.error('Error creando contrato:', err);
    res.status(500).json({ success: false, message: 'Error creando contrato' });
  }
});

// PUT /api/contratos/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { frecuencia, monto_total, fecha_inicio, fecha_proximo_pago, dias_alerta, estado } = req.body;

    const [[existe]] = await db.query('SELECT id FROM contratos WHERE id = ?', [id]);
    if (!existe) return res.status(404).json({ success: false, message: 'Contrato no encontrado' });

    await db.query(
      `UPDATE contratos SET frecuencia=?, monto_total=?, fecha_inicio=?,
        fecha_proximo_pago=?, dias_alerta=?, estado=?
       WHERE id=?`,
      [frecuencia, monto_total, fecha_inicio, fecha_proximo_pago, dias_alerta, estado, id]
    );

    const [[actualizado]] = await db.query('SELECT * FROM contratos WHERE id = ?', [id]);
    await auditoria.registrar(req, 'editar', 'contrato', id, `Editó contrato (${frecuencia}, B/. ${parseFloat(monto_total).toFixed(2)})`);
    res.json({ success: true, data: actualizado, message: 'Contrato actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando contrato:', err);
    res.status(500).json({ success: false, message: 'Error actualizando contrato' });
  }
});

// DELETE /api/contratos/:id
router.delete('/:id', async (req, res) => {
  try {
    const [[existe]] = await db.query('SELECT id FROM contratos WHERE id = ?', [req.params.id]);
    if (!existe) return res.status(404).json({ success: false, message: 'Contrato no encontrado' });

    await db.query('DELETE FROM contratos WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Contrato eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando contrato:', err);
    res.status(500).json({ success: false, message: 'Error eliminando contrato' });
  }
});

module.exports = router;
