// Rutas CRUD de leads (prospectos)
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const { estado, provincia, atendido_por, buscar } = req.query;

    let where = ['1=1'];
    let params = [];

    if (estado) { where.push('l.estado = ?'); params.push(estado); }
    if (provincia) { where.push('l.provincia = ?'); params.push(provincia); }
    if (atendido_por) { where.push('l.atendido_por = ?'); params.push(atendido_por); }
    if (buscar) {
      where.push('(l.nombre LIKE ? OR l.telefono LIKE ? OR l.email LIKE ?)');
      const term = `%${buscar}%`;
      params.push(term, term, term);
    }

    const [leads] = await db.query(`
      SELECT l.*, u.nombre AS atendido_por_nombre
      FROM leads l
      LEFT JOIN usuarios u ON u.id = l.atendido_por
      WHERE ${where.join(' AND ')}
      ORDER BY l.created_at DESC
    `, params);

    res.json({ success: true, data: leads });
  } catch (err) {
    console.error('Error listando leads:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo leads' });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const [[lead]] = await db.query(`
      SELECT l.*, u.nombre AS atendido_por_nombre
      FROM leads l LEFT JOIN usuarios u ON u.id = l.atendido_por
      WHERE l.id = ?
    `, [req.params.id]);

    if (!lead) return res.status(404).json({ success: false, message: 'Lead no encontrado' });
    res.json({ success: true, data: lead });
  } catch (err) {
    console.error('Error obteniendo lead:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo lead' });
  }
});

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const { nombre, telefono, whatsapp, email, tipo_gps_consultado, provincia, fecha_contacto, atendido_por, estado, notas } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, message: 'El nombre del lead es requerido' });
    }

    const [result] = await db.query(
      `INSERT INTO leads (nombre, telefono, whatsapp, email, tipo_gps_consultado, provincia,
        fecha_contacto, atendido_por, estado, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, telefono, whatsapp, email, tipo_gps_consultado, provincia,
       fecha_contacto || new Date().toISOString().split('T')[0],
       atendido_por || req.usuario.id, estado || 'nuevo', notas]
    );

    const [[nuevo]] = await db.query('SELECT * FROM leads WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: nuevo, message: 'Lead creado correctamente' });
  } catch (err) {
    console.error('Error creando lead:', err);
    res.status(500).json({ success: false, message: 'Error creando lead' });
  }
});

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, whatsapp, email, tipo_gps_consultado, provincia, fecha_contacto, atendido_por, estado, notas } = req.body;

    const [[existe]] = await db.query('SELECT id FROM leads WHERE id = ?', [id]);
    if (!existe) return res.status(404).json({ success: false, message: 'Lead no encontrado' });

    await db.query(
      `UPDATE leads SET nombre=?, telefono=?, whatsapp=?, email=?, tipo_gps_consultado=?,
        provincia=?, fecha_contacto=?, atendido_por=?, estado=?, notas=?
       WHERE id=?`,
      [nombre, telefono, whatsapp, email, tipo_gps_consultado, provincia,
       fecha_contacto, atendido_por, estado, notas, id]
    );

    const [[actualizado]] = await db.query('SELECT * FROM leads WHERE id = ?', [id]);
    res.json({ success: true, data: actualizado, message: 'Lead actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando lead:', err);
    res.status(500).json({ success: false, message: 'Error actualizando lead' });
  }
});

// POST /api/leads/:id/convertir — convertir lead a cliente
router.post('/:id/convertir', async (req, res) => {
  try {
    const [[lead]] = await db.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead no encontrado' });

    // Crear cliente con los datos del lead
    const [result] = await db.query(
      `INSERT INTO clientes (nombre_razon_social, tipo_cliente, telefono_principal, whatsapp, email, provincia, estado)
       VALUES (?, 'natural', ?, ?, ?, ?, 'activo')`,
      [lead.nombre, lead.telefono, lead.whatsapp, lead.email, lead.provincia]
    );

    // Marcar lead como cerrado
    await db.query("UPDATE leads SET estado = 'cerrado' WHERE id = ?", [req.params.id]);

    const [[nuevoCliente]] = await db.query('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: nuevoCliente, message: 'Lead convertido a cliente correctamente' });
  } catch (err) {
    console.error('Error convirtiendo lead:', err);
    res.status(500).json({ success: false, message: 'Error convirtiendo lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const [[existe]] = await db.query('SELECT id FROM leads WHERE id = ?', [req.params.id]);
    if (!existe) return res.status(404).json({ success: false, message: 'Lead no encontrado' });

    await db.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Lead eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando lead:', err);
    res.status(500).json({ success: false, message: 'Error eliminando lead' });
  }
});

module.exports = router;
