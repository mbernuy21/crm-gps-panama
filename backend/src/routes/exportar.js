// Rutas de exportación a Excel para todos los módulos
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const {
  generarExcelClientes,
  generarExcelDispositivos,
  generarExcelPagos,
  generarExcelFacturas,
  generarExcelLeads,
  generarExcelInventario
} = require('../services/exportExcel');

router.use(authMiddleware);

function enviarExcel(res, buffer, nombre) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}-${Date.now()}.xlsx"`);
  res.send(buffer);
}

// GET /api/exportar/clientes
router.get('/clientes', async (req, res) => {
  try {
    const { estado, provincia } = req.query;
    let where = ['1=1'];
    let params = [];
    if (estado) { where.push('c.estado = ?'); params.push(estado); }
    if (provincia) { where.push('c.provincia = ?'); params.push(provincia); }

    const [clientes] = await db.query(`
      SELECT c.*, COUNT(DISTINCT d.id) AS total_dispositivos
      FROM clientes c
      LEFT JOIN dispositivos d ON d.cliente_id = c.id AND d.estado = 'asignado'
      WHERE ${where.join(' AND ')}
      GROUP BY c.id
      ORDER BY c.nombre_razon_social ASC
    `, params);

    const buffer = generarExcelClientes(clientes);
    enviarExcel(res, buffer, 'clientes');
  } catch (err) {
    console.error('Error exportando clientes:', err);
    res.status(500).json({ success: false, message: 'Error exportando clientes' });
  }
});

// GET /api/exportar/dispositivos
router.get('/dispositivos', async (req, res) => {
  try {
    const [dispositivos] = await db.query(`
      SELECT d.*, c.nombre_razon_social AS cliente_nombre
      FROM dispositivos d
      LEFT JOIN clientes c ON c.id = d.cliente_id
      ORDER BY d.estado ASC, d.created_at DESC
    `);
    const buffer = generarExcelDispositivos(dispositivos);
    enviarExcel(res, buffer, 'dispositivos');
  } catch (err) {
    console.error('Error exportando dispositivos:', err);
    res.status(500).json({ success: false, message: 'Error exportando dispositivos' });
  }
});

// GET /api/exportar/pagos
router.get('/pagos', async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    let where = ['1=1'];
    let params = [];
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

    const buffer = generarExcelPagos(pagos);
    enviarExcel(res, buffer, 'pagos');
  } catch (err) {
    console.error('Error exportando pagos:', err);
    res.status(500).json({ success: false, message: 'Error exportando pagos' });
  }
});

// GET /api/exportar/facturas
router.get('/facturas', async (req, res) => {
  try {
    const [facturas] = await db.query(`
      SELECT f.*, c.nombre_razon_social AS cliente_nombre
      FROM facturas f INNER JOIN clientes c ON c.id = f.cliente_id
      ORDER BY f.created_at DESC
    `);
    const buffer = generarExcelFacturas(facturas);
    enviarExcel(res, buffer, 'facturas');
  } catch (err) {
    console.error('Error exportando facturas:', err);
    res.status(500).json({ success: false, message: 'Error exportando facturas' });
  }
});

// GET /api/exportar/leads
router.get('/leads', async (req, res) => {
  try {
    const [leads] = await db.query(`
      SELECT l.*, u.nombre AS atendido_por_nombre
      FROM leads l LEFT JOIN usuarios u ON u.id = l.atendido_por
      ORDER BY l.created_at DESC
    `);
    const buffer = generarExcelLeads(leads);
    enviarExcel(res, buffer, 'leads');
  } catch (err) {
    console.error('Error exportando leads:', err);
    res.status(500).json({ success: false, message: 'Error exportando leads' });
  }
});

// GET /api/exportar/inventario
router.get('/inventario', async (req, res) => {
  try {
    const [dispositivos] = await db.query(`
      SELECT d.*, c.nombre_razon_social AS cliente_nombre
      FROM dispositivos d
      LEFT JOIN clientes c ON c.id = d.cliente_id
      ORDER BY d.estado ASC
    `);
    const buffer = generarExcelInventario(dispositivos);
    enviarExcel(res, buffer, 'inventario');
  } catch (err) {
    console.error('Error exportando inventario:', err);
    res.status(500).json({ success: false, message: 'Error exportando inventario' });
  }
});

module.exports = router;
