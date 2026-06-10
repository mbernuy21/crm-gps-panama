// Rutas CRUD de clientes
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const auditoria = require('../services/auditoria');

router.use(authMiddleware);

// GET /api/clientes — listar con filtros
router.get('/', async (req, res) => {
  try {
    const { estado, provincia, tipo_cliente, buscar, frecuencia_contrato, modalidad_gps, page = 1, limit = 500 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = ['1=1'];
    let params = [];
    let joins = [];

    if (estado) { where.push('c.estado = ?'); params.push(estado); }
    if (provincia) { where.push('c.provincia = ?'); params.push(provincia); }
    if (tipo_cliente) { where.push('c.tipo_cliente = ?'); params.push(tipo_cliente); }
    if (buscar) {
      where.push('(c.nombre_razon_social LIKE ? OR c.ruc LIKE ? OR c.telefono_principal LIKE ? OR c.email LIKE ?)');
      const term = `%${buscar}%`;
      params.push(term, term, term, term);
    }
    // Filtro por frecuencia de contrato (mensual, semestral, anual)
    if (frecuencia_contrato) {
      joins.push('INNER JOIN contratos ct_f ON ct_f.cliente_id = c.id AND ct_f.frecuencia = ?');
      params.push(frecuencia_contrato);
    }
    // Filtro por modalidad de GPS (alquiler, venta)
    if (modalidad_gps) {
      joins.push('INNER JOIN dispositivos d_f ON d_f.cliente_id = c.id AND d_f.modalidad = ? AND d_f.estado = \'asignado\'');
      params.push(modalidad_gps);
    }

    const whereStr = where.join(' AND ');
    const joinsStr = joins.join(' ');

    const [clientes] = await db.query(`
      SELECT c.*,
        COUNT(DISTINCT d.id) AS total_dispositivos,
        COUNT(DISTINCT con.id) AS total_contratos
      FROM clientes c
      LEFT JOIN dispositivos d ON d.cliente_id = c.id AND d.estado = 'asignado'
      LEFT JOIN contratos con ON con.cliente_id = c.id AND con.estado = 'activo'
      ${joinsStr}
      WHERE ${whereStr}
      GROUP BY c.id
      ORDER BY c.nombre_razon_social ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM clientes c WHERE ${whereStr}`,
      params
    );

    res.json({ success: true, data: clientes, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Error listando clientes:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo clientes' });
  }
});

// GET /api/clientes/:id — detalle completo
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [[cliente]] = await db.query('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

    const [dispositivos] = await db.query(
      'SELECT * FROM dispositivos WHERE cliente_id = ? ORDER BY fecha_asignacion DESC',
      [id]
    );

    const [contratos] = await db.query(
      'SELECT * FROM contratos WHERE cliente_id = ? ORDER BY created_at DESC',
      [id]
    );

    const [pagos] = await db.query(
      `SELECT p.*, u.nombre AS registrado_por_nombre
       FROM pagos p
       LEFT JOIN usuarios u ON u.id = p.registrado_por
       WHERE p.cliente_id = ?
       ORDER BY p.fecha_pago DESC LIMIT 20`,
      [id]
    );

    const [facturas] = await db.query(
      'SELECT id, numero_factura, fecha_emision, total, estado FROM facturas WHERE cliente_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success: true,
      data: { ...cliente, dispositivos, contratos, pagos, facturas }
    });
  } catch (err) {
    console.error('Error obteniendo cliente:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo cliente' });
  }
});

// POST /api/clientes — crear
router.post('/', async (req, res) => {
  try {
    const {
      nombre_razon_social, tipo_cliente, ruc, telefono_principal, whatsapp,
      email, direccion, provincia, distrito, contacto_secundario_nombre,
      contacto_secundario_telefono, estado, notas_internas
    } = req.body;

    if (!nombre_razon_social) {
      return res.status(400).json({ success: false, message: 'El nombre o razón social es requerido' });
    }

    const [result] = await db.query(
      `INSERT INTO clientes (nombre_razon_social, tipo_cliente, ruc, telefono_principal, whatsapp,
        email, direccion, provincia, distrito, contacto_secundario_nombre,
        contacto_secundario_telefono, estado, notas_internas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre_razon_social, tipo_cliente || 'natural', ruc, telefono_principal, whatsapp,
       email, direccion, provincia, distrito, contacto_secundario_nombre,
       contacto_secundario_telefono, estado || 'activo', notas_internas]
    );

    const [[nuevo]] = await db.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    await auditoria.registrar(req, 'crear', 'cliente', result.insertId, `Creó el cliente "${nombre_razon_social}"`);
    res.status(201).json({ success: true, data: nuevo, message: 'Cliente creado correctamente' });
  } catch (err) {
    console.error('Error creando cliente:', err);
    res.status(500).json({ success: false, message: 'Error creando cliente' });
  }
});

// PUT /api/clientes/:id — actualizar
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre_razon_social, tipo_cliente, ruc, telefono_principal, whatsapp,
      email, direccion, provincia, distrito, contacto_secundario_nombre,
      contacto_secundario_telefono, estado, notas_internas
    } = req.body;

    const [[existe]] = await db.query('SELECT id FROM clientes WHERE id = ?', [id]);
    if (!existe) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

    await db.query(
      `UPDATE clientes SET nombre_razon_social=?, tipo_cliente=?, ruc=?, telefono_principal=?,
        whatsapp=?, email=?, direccion=?, provincia=?, distrito=?, contacto_secundario_nombre=?,
        contacto_secundario_telefono=?, estado=?, notas_internas=?
       WHERE id=?`,
      [nombre_razon_social, tipo_cliente, ruc, telefono_principal, whatsapp,
       email, direccion, provincia, distrito, contacto_secundario_nombre,
       contacto_secundario_telefono, estado, notas_internas, id]
    );

    const [[actualizado]] = await db.query('SELECT * FROM clientes WHERE id = ?', [id]);
    await auditoria.registrar(req, 'editar', 'cliente', id, `Editó el cliente "${nombre_razon_social}"`);
    res.json({ success: true, data: actualizado, message: 'Cliente actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando cliente:', err);
    res.status(500).json({ success: false, message: 'Error actualizando cliente' });
  }
});

// PUT /api/clientes/:id/estado — cambiar estado con historial
router.put('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas } = req.body;

    const estadosValidos = ['activo', 'inactivo', 'moroso', 'suspendido', 'cortado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ success: false, message: 'Estado inválido' });
    }

    await db.query('UPDATE clientes SET estado = ? WHERE id = ?', [estado, id]);

    // Si se corta el cliente, marcar sus SIMs como duplicadas
    if (estado === 'cortado') {
      await db.query(
        "UPDATE dispositivos SET estado = 'duplicado' WHERE cliente_id = ? AND estado = 'asignado'",
        [id]
      );
    }

    await auditoria.registrar(req, 'cambiar_estado', 'cliente', id, `Cambió estado del cliente a "${estado}"`);
    res.json({ success: true, message: `Estado actualizado a: ${estado}` });
  } catch (err) {
    console.error('Error cambiando estado:', err);
    res.status(500).json({ success: false, message: 'Error cambiando estado' });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [[cliente]] = await db.query('SELECT id FROM clientes WHERE id = ?', [id]);
    if (!cliente) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

    await db.query('DELETE FROM clientes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Cliente eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando cliente:', err);
    res.status(500).json({ success: false, message: 'Error eliminando cliente' });
  }
});

module.exports = router;
