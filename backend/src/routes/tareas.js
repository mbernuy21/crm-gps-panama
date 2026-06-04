// Módulo de Tareas Pendientes — GPS Tracker Panamá
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Transporter de email para alertas
function crearTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

// GET /api/tareas — listar todas (con filtros opcionales)
router.get('/', auth, async (req, res) => {
  try {
    const { estado, prioridad, cliente_id } = req.query;
    let where = '1=1';
    const params = [];

    if (estado) { where += ' AND t.estado = ?'; params.push(estado); }
    if (prioridad) { where += ' AND t.prioridad = ?'; params.push(prioridad); }
    if (cliente_id) { where += ' AND t.cliente_id = ?'; params.push(cliente_id); }

    const [rows] = await db.query(`
      SELECT t.*,
        c.nombre_razon_social AS nombre_cliente,
        u.nombre AS creado_por_nombre,
        DATEDIFF(t.fecha_limite, CURDATE()) AS dias_restantes
      FROM tareas t
      LEFT JOIN clientes c ON c.id = t.cliente_id
      LEFT JOIN usuarios u ON u.id = t.creada_por
      WHERE ${where}
      ORDER BY
        CASE t.estado WHEN 'pendiente' THEN 0 WHEN 'en_progreso' THEN 1 ELSE 2 END,
        CASE t.prioridad WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
        t.fecha_limite ASC
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error cargando tareas' });
  }
});

// GET /api/tareas/stats — contadores para el badge del sidebar
router.get('/stats', auth, async (req, res) => {
  try {
    const [[{ pendientes }]] = await db.query(
      `SELECT COUNT(*) AS pendientes FROM tareas WHERE estado != 'completada'`
    );
    const [[{ vencidas }]] = await db.query(
      `SELECT COUNT(*) AS vencidas FROM tareas
       WHERE estado != 'completada' AND fecha_limite < CURDATE()`
    );
    const [[{ hoy }]] = await db.query(
      `SELECT COUNT(*) AS hoy FROM tareas
       WHERE estado != 'completada' AND fecha_limite = CURDATE()`
    );
    res.json({ success: true, data: { pendientes, vencidas, hoy } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

// GET /api/tareas/:id — detalle de una tarea
router.get('/:id', auth, async (req, res) => {
  try {
    const [[tarea]] = await db.query(`
      SELECT t.*, c.nombre_razon_social AS nombre_cliente, u.nombre AS creado_por_nombre
      FROM tareas t
      LEFT JOIN clientes c ON c.id = t.cliente_id
      LEFT JOIN usuarios u ON u.id = t.creada_por
      WHERE t.id = ?
    `, [req.params.id]);
    if (!tarea) return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    res.json({ success: true, data: tarea });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

// POST /api/tareas — crear tarea
router.post('/', auth, async (req, res) => {
  try {
    const { titulo, descripcion, cliente_id, fecha_limite, prioridad } = req.body;
    if (!titulo) return res.status(400).json({ success: false, message: 'El título es requerido' });

    const [result] = await db.query(
      `INSERT INTO tareas (titulo, descripcion, cliente_id, creada_por, fecha_limite, prioridad)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [titulo, descripcion || null, cliente_id || null, req.usuario?.id || null,
       fecha_limite || null, prioridad || 'media']
    );
    res.json({ success: true, data: { id: result.insertId }, message: 'Tarea creada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error creando tarea' });
  }
});

// PUT /api/tareas/:id — actualizar tarea
router.put('/:id', auth, async (req, res) => {
  try {
    const { titulo, descripcion, cliente_id, fecha_limite, prioridad, estado } = req.body;
    await db.query(
      `UPDATE tareas SET titulo=?, descripcion=?, cliente_id=?, fecha_limite=?,
       prioridad=?, estado=?, updated_at=NOW() WHERE id=?`,
      [titulo, descripcion || null, cliente_id || null, fecha_limite || null,
       prioridad || 'media', estado || 'pendiente', req.params.id]
    );
    res.json({ success: true, message: 'Tarea actualizada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error actualizando tarea' });
  }
});

// PATCH /api/tareas/:id/completar — marcar como completada
router.patch('/:id/completar', auth, async (req, res) => {
  try {
    await db.query(
      `UPDATE tareas SET estado='completada', updated_at=NOW() WHERE id=?`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Tarea completada ✅' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

// DELETE /api/tareas/:id — eliminar tarea
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM tareas WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Tarea eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error eliminando tarea' });
  }
});

// POST /api/tareas/enviar-alertas — ejecutado por el cron job diario
router.post('/enviar-alertas', auth, async (req, res) => {
  try {
    await enviarAlertasTareas();
    res.json({ success: true, message: 'Alertas enviadas' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error enviando alertas' });
  }
});

// Función reutilizable para enviar alertas de tareas por email
async function enviarAlertasTareas() {
  const [tareas] = await db.query(`
    SELECT t.*, c.nombre_razon_social AS nombre_cliente
    FROM tareas t
    LEFT JOIN clientes c ON c.id = t.cliente_id
    WHERE t.estado != 'completada'
      AND t.alerta_enviada = 0
      AND (t.fecha_limite <= DATE_ADD(CURDATE(), INTERVAL 1 DAY))
  `);

  if (!tareas.length) return;

  const lineas = tareas.map(t => {
    const cliente = t.nombre_cliente ? ` — Cliente: ${t.nombre_cliente}` : '';
    const fecha = t.fecha_limite ? new Date(t.fecha_limite).toLocaleDateString('es-PA') : 'Sin fecha';
    const vencida = t.fecha_limite && new Date(t.fecha_limite) < new Date() ? ' ⚠️ VENCIDA' : '';
    return `• [${t.prioridad.toUpperCase()}] ${t.titulo}${cliente} — Vence: ${fecha}${vencida}`;
  }).join('\n');

  const transporter = crearTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'ventas@gpstrackerpanama.com',
    to: process.env.EMAIL_FROM || 'ventas@gpstrackerpanama.com',
    subject: `⏰ GPS Tracker CRM — ${tareas.length} tarea(s) pendiente(s)`,
    text: `Tareas pendientes o próximas a vencer:\n\n${lineas}\n\nRevísalas en: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/tareas`
  });

  // Marcar alertas como enviadas
  const ids = tareas.map(t => t.id);
  await db.query(`UPDATE tareas SET alerta_enviada=1 WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
}

module.exports = router;
module.exports.enviarAlertasTareas = enviarAlertasTareas;
