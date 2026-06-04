// Rutas CRUD de dispositivos GPS
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/dispositivos
router.get('/', async (req, res) => {
  try {
    const { estado, cliente_id, tipo_producto, modalidad, buscar } = req.query;

    let where = ['1=1'];
    let params = [];

    if (estado) { where.push('d.estado = ?'); params.push(estado); }
    if (cliente_id) { where.push('d.cliente_id = ?'); params.push(cliente_id); }
    if (tipo_producto) { where.push('d.tipo_producto = ?'); params.push(tipo_producto); }
    if (modalidad) { where.push('d.modalidad = ?'); params.push(modalidad); }
    if (buscar) {
      where.push('(d.serial_gps LIKE ? OR d.simcard LIKE ? OR d.placa_vehiculo LIKE ? OR c.nombre_razon_social LIKE ?)');
      const term = `%${buscar}%`;
      params.push(term, term, term, term);
    }

    const [dispositivos] = await db.query(`
      SELECT d.*, c.nombre_razon_social AS cliente_nombre, c.whatsapp AS cliente_whatsapp
      FROM dispositivos d
      LEFT JOIN clientes c ON c.id = d.cliente_id
      WHERE ${where.join(' AND ')}
      ORDER BY d.estado ASC, d.created_at DESC
    `, params);

    res.json({ success: true, data: dispositivos });
  } catch (err) {
    console.error('Error listando dispositivos:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo dispositivos' });
  }
});

// GET /api/dispositivos/:id
router.get('/:id', async (req, res) => {
  try {
    const [[dispositivo]] = await db.query(`
      SELECT d.*, c.nombre_razon_social AS cliente_nombre
      FROM dispositivos d
      LEFT JOIN clientes c ON c.id = d.cliente_id
      WHERE d.id = ?
    `, [req.params.id]);

    if (!dispositivo) return res.status(404).json({ success: false, message: 'Dispositivo no encontrado' });

    const [historial] = await db.query(`
      SELECT h.*, c.nombre_razon_social AS cliente_nombre
      FROM historial_dispositivos h
      LEFT JOIN clientes c ON c.id = h.cliente_id
      WHERE h.dispositivo_id = ?
      ORDER BY h.fecha DESC
    `, [req.params.id]);

    res.json({ success: true, data: { ...dispositivo, historial } });
  } catch (err) {
    console.error('Error obteniendo dispositivo:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo dispositivo' });
  }
});

// POST /api/dispositivos
router.post('/', async (req, res) => {
  try {
    const {
      cliente_id, serial_gps, simcard, placa_vehiculo, modelo_auto,
      tipo_producto, modalidad, valor_equipo_usd, estado, fecha_asignacion, notas
    } = req.body;

    if (!serial_gps) {
      return res.status(400).json({ success: false, message: 'El serial GPS es requerido' });
    }

    // Verificar serial GPS único
    const [[existe]] = await db.query('SELECT id FROM dispositivos WHERE serial_gps = ?', [serial_gps]);
    if (existe) {
      return res.status(400).json({ success: false, message: 'Ya existe un dispositivo con ese serial GPS' });
    }

    // Verificar SIM card única (si se proporcionó)
    const simLimpia = simcard && simcard.trim() !== '' ? simcard.trim() : null;
    if (simLimpia) {
      const [[simExiste]] = await db.query(
        'SELECT id, serial_gps FROM dispositivos WHERE simcard = ?', [simLimpia]
      );
      if (simExiste) {
        return res.status(400).json({
          success: false,
          message: `⚠️ La SIM Card ${simLimpia} ya está registrada en el GPS ${simExiste.serial_gps}. Primero retírala de ese equipo antes de asignarla a uno nuevo.`
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO dispositivos (cliente_id, serial_gps, simcard, placa_vehiculo, modelo_auto,
        tipo_producto, modalidad, valor_equipo_usd, estado, fecha_asignacion, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cliente_id || null, serial_gps, simLimpia, placa_vehiculo, modelo_auto,
       tipo_producto || 'fijo', modalidad || 'alquiler', valor_equipo_usd || 0,
       estado || 'disponible', fecha_asignacion || null, notas]
    );

    // Registrar en historial
    if (cliente_id) {
      await db.query(
        'INSERT INTO historial_dispositivos (dispositivo_id, cliente_id, accion, notas) VALUES (?, ?, ?, ?)',
        [result.insertId, cliente_id, 'Asignación inicial', notas || null]
      );
    }

    const [[nuevo]] = await db.query('SELECT * FROM dispositivos WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: nuevo, message: 'Dispositivo creado correctamente' });
  } catch (err) {
    console.error('Error creando dispositivo:', err);
    res.status(500).json({ success: false, message: 'Error creando dispositivo' });
  }
});

// PUT /api/dispositivos/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cliente_id, serial_gps, simcard, placa_vehiculo, modelo_auto,
      tipo_producto, modalidad, valor_equipo_usd, estado, fecha_asignacion, notas
    } = req.body;

    const [[actual]] = await db.query('SELECT * FROM dispositivos WHERE id = ?', [id]);
    if (!actual) return res.status(404).json({ success: false, message: 'Dispositivo no encontrado' });

    // Verificar SIM card única al actualizar (excluye el propio dispositivo)
    const simLimpia = simcard && simcard.trim() !== '' ? simcard.trim() : null;
    if (simLimpia) {
      const [[simExiste]] = await db.query(
        'SELECT id, serial_gps FROM dispositivos WHERE simcard = ? AND id != ?', [simLimpia, id]
      );
      if (simExiste) {
        return res.status(400).json({
          success: false,
          message: `⚠️ La SIM Card ${simLimpia} ya está registrada en el GPS ${simExiste.serial_gps}. Primero retírala de ese equipo (déjalo en blanco) antes de asignarla aquí.`
        });
      }
    }

    await db.query(
      `UPDATE dispositivos SET cliente_id=?, serial_gps=?, simcard=?, placa_vehiculo=?,
        modelo_auto=?, tipo_producto=?, modalidad=?, valor_equipo_usd=?,
        estado=?, fecha_asignacion=?, notas=?
       WHERE id=?`,
      [cliente_id || null, serial_gps, simLimpia, placa_vehiculo, modelo_auto,
       tipo_producto, modalidad, valor_equipo_usd, estado, fecha_asignacion || null, notas, id]
    );

    // Registrar reasignación si cambió de cliente
    if (cliente_id && cliente_id != actual.cliente_id) {
      await db.query(
        'INSERT INTO historial_dispositivos (dispositivo_id, cliente_id, accion, notas) VALUES (?, ?, ?, ?)',
        [id, cliente_id, 'Reasignación de cliente', notas || null]
      );
    }

    const [[actualizado]] = await db.query('SELECT * FROM dispositivos WHERE id = ?', [id]);
    res.json({ success: true, data: actualizado, message: 'Dispositivo actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando dispositivo:', err);
    res.status(500).json({ success: false, message: 'Error actualizando dispositivo' });
  }
});

// DELETE /api/dispositivos/:id
router.delete('/:id', async (req, res) => {
  try {
    const [[disp]] = await db.query('SELECT id FROM dispositivos WHERE id = ?', [req.params.id]);
    if (!disp) return res.status(404).json({ success: false, message: 'Dispositivo no encontrado' });

    await db.query('DELETE FROM dispositivos WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Dispositivo eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando dispositivo:', err);
    res.status(500).json({ success: false, message: 'Error eliminando dispositivo' });
  }
});

module.exports = router;
