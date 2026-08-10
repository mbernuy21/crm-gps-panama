// Rutas de gestión de sub-agentes — solo accesibles por admins
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { authMiddleware, soloAdmin } = require('../middleware/auth');
const { invalidarCache } = require('../services/rolFiltro');

router.use(authMiddleware);
router.use(soloAdmin); // Solo admins pueden gestionar sub-agentes

// GET /api/agentes — listar todos los sub-agentes
router.get('/', async (req, res) => {
  try {
    const [agentes] = await db.query(`
      SELECT u.id, u.nombre, u.email, u.rol, u.activo, u.created_at,
        (SELECT COUNT(*) FROM clientes WHERE creado_por = u.id) AS total_clientes,
        (SELECT COUNT(*) FROM dispositivos WHERE creado_por = u.id) AS total_dispositivos,
        (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE creado_por = u.id
         AND MONTH(fecha_pago) = MONTH(CURDATE()) AND YEAR(fecha_pago) = YEAR(CURDATE())) AS cobros_mes,
        (SELECT COUNT(*) FROM simcards WHERE asignado_a_agente = u.id AND estado = 'disponible') AS simcards_disponibles
      FROM usuarios u
      WHERE u.rol = 'sub_agente'
      ORDER BY u.nombre ASC
    `);
    res.json({ success: true, data: agentes });
  } catch (err) {
    console.error('Error listando agentes:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo agentes' });
  }
});

// POST /api/agentes — crear nuevo sub-agente
router.post('/', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: 'nombre, email y password son requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar que el email no exista
    const [[existe]] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe) {
      return res.status(400).json({ success: false, message: 'Ya existe un usuario con ese email' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES (?, ?, ?, 'sub_agente', 1)`,
      [nombre, email, hash]
    );

    invalidarCache();
    res.json({ success: true, data: { id: result.insertId, nombre, email, rol: 'sub_agente' }, message: 'Sub-agente creado correctamente' });
  } catch (err) {
    console.error('Error creando agente:', err);
    res.status(500).json({ success: false, message: 'Error creando sub-agente' });
  }
});

// PUT /api/agentes/:id — editar sub-agente (nombre, email, activo, password opcional)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, activo } = req.body;

    // Verificar que existe y es sub_agente
    const [[agente]] = await db.query(`SELECT * FROM usuarios WHERE id = ? AND rol = 'sub_agente'`, [id]);
    if (!agente) return res.status(404).json({ success: false, message: 'Sub-agente no encontrado' });

    // Si se cambia el email, verificar que no esté en uso
    if (email && email !== agente.email) {
      const [[dup]] = await db.query('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id]);
      if (dup) return res.status(400).json({ success: false, message: 'Email ya en uso por otro usuario' });
    }

    let updateSQL = `UPDATE usuarios SET nombre = ?, email = ?, activo = ? WHERE id = ?`;
    let params = [nombre || agente.nombre, email || agente.email, activo !== undefined ? activo : agente.activo, id];

    // Si se proporciona nueva contraseña, actualizarla también
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      updateSQL = `UPDATE usuarios SET nombre = ?, email = ?, activo = ?, password_hash = ? WHERE id = ?`;
      params = [nombre || agente.nombre, email || agente.email, activo !== undefined ? activo : agente.activo, hash, id];
    }

    await db.query(updateSQL, params);
    res.json({ success: true, message: 'Sub-agente actualizado correctamente' });
  } catch (err) {
    console.error('Error editando agente:', err);
    res.status(500).json({ success: false, message: 'Error editando sub-agente' });
  }
});

// DELETE /api/agentes/:id — desactivar sub-agente (no borrar)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [[agente]] = await db.query(`SELECT id FROM usuarios WHERE id = ? AND rol = 'sub_agente'`, [id]);
    if (!agente) return res.status(404).json({ success: false, message: 'Sub-agente no encontrado' });

    await db.query(`UPDATE usuarios SET activo = 0 WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Sub-agente desactivado' });
  } catch (err) {
    console.error('Error desactivando agente:', err);
    res.status(500).json({ success: false, message: 'Error desactivando sub-agente' });
  }
});

// GET /api/agentes/:id/simcards — SIM cards asignadas a este agente
router.get('/:id/simcards', async (req, res) => {
  try {
    const { id } = req.params;
    const [simcards] = await db.query(`
      SELECT s.*, d.serial_gps, d.placa_vehiculo, c.nombre_razon_social AS cliente_nombre
      FROM simcards s
      LEFT JOIN dispositivos d ON d.id = s.dispositivo_id
      LEFT JOIN clientes c ON c.id = s.cliente_id
      WHERE s.asignado_a_agente = ?
      ORDER BY s.estado ASC, s.numero ASC
    `, [id]);
    res.json({ success: true, data: simcards });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error obteniendo SIM cards' });
  }
});

// GET /api/agentes/simcards/disponibles — SIMs sin asignar a ningún agente (para el admin)
router.get('/simcards/disponibles', async (req, res) => {
  try {
    const [simcards] = await db.query(`
      SELECT id, numero, iccid, operador, estado
      FROM simcards
      WHERE asignado_a_agente IS NULL AND estado IN ('disponible', 'suspendida')
      ORDER BY numero ASC
    `);
    res.json({ success: true, data: simcards });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error obteniendo SIM cards disponibles' });
  }
});

// POST /api/agentes/asignar-simcard — asignar SIM card a un sub-agente
router.post('/asignar-simcard', async (req, res) => {
  try {
    const { simcard_id, agente_id } = req.body;
    if (!simcard_id || !agente_id) {
      return res.status(400).json({ success: false, message: 'simcard_id y agente_id son requeridos' });
    }

    // Verificar que el agente existe
    const [[agente]] = await db.query(`SELECT id, nombre FROM usuarios WHERE id = ? AND rol = 'sub_agente'`, [agente_id]);
    if (!agente) return res.status(404).json({ success: false, message: 'Sub-agente no encontrado' });

    // Verificar que la SIM existe
    const [[sim]] = await db.query(`SELECT id, numero FROM simcards WHERE id = ?`, [simcard_id]);
    if (!sim) return res.status(404).json({ success: false, message: 'SIM card no encontrada' });

    await db.query(`UPDATE simcards SET asignado_a_agente = ? WHERE id = ?`, [agente_id, simcard_id]);
    res.json({ success: true, message: `SIM ${sim.numero} asignada a ${agente.nombre}` });
  } catch (err) {
    console.error('Error asignando SIM:', err);
    res.status(500).json({ success: false, message: 'Error asignando SIM card' });
  }
});

// DELETE /api/agentes/simcard/:simId/quitar — quitar asignación de SIM
router.delete('/simcard/:simId/quitar', async (req, res) => {
  try {
    const { simId } = req.params;
    await db.query(`UPDATE simcards SET asignado_a_agente = NULL WHERE id = ?`, [simId]);
    res.json({ success: true, message: 'SIM card desasignada del agente' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error desasignando SIM card' });
  }
});

// GET /api/agentes/:id/resumen — estadísticas del agente para su dashboard
router.get('/:id/resumen', async (req, res) => {
  try {
    const { id } = req.params;
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM clientes WHERE creado_por = ?) AS clientes_activos,
        (SELECT COUNT(*) FROM clientes WHERE creado_por = ? AND estado = 'moroso') AS clientes_morosos,
        (SELECT COUNT(*) FROM dispositivos WHERE creado_por = ?) AS dispositivos_asignados,
        (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE creado_por = ?
         AND MONTH(fecha_pago) = MONTH(CURDATE()) AND YEAR(fecha_pago) = YEAR(CURDATE())) AS cobros_mes,
        (SELECT COUNT(*) FROM simcards WHERE asignado_a_agente = ? AND estado = 'disponible') AS simcards_disponibles
    `, [id, id, id, id, id]);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error obteniendo resumen' });
  }
});

module.exports = router;
