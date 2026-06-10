// Rutas de auditoría — historial de acciones de los usuarios
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/auditoria — feed global de actividad (con filtros opcionales)
router.get('/', async (req, res) => {
  try {
    const { entidad, usuario_id, limite } = req.query;
    const where = [];
    const params = [];
    if (entidad) { where.push('entidad = ?'); params.push(entidad); }
    if (usuario_id) { where.push('usuario_id = ?'); params.push(usuario_id); }
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const lim = Math.min(parseInt(limite) || 100, 500);

    const [rows] = await db.query(
      `SELECT a.*, u.nombre AS usuario_actual
       FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
       ${whereSQL}
       ORDER BY a.created_at DESC
       LIMIT ${lim}`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error obteniendo auditoría:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo auditoría' });
  }
});

// GET /api/auditoria/entidad/:entidad/:id — historial de un registro específico
router.get('/entidad/:entidad/:id', async (req, res) => {
  try {
    const { entidad, id } = req.params;
    const [rows] = await db.query(
      `SELECT * FROM auditoria WHERE entidad = ? AND entidad_id = ? ORDER BY created_at DESC LIMIT 50`,
      [entidad, id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error obteniendo historial' });
  }
});

module.exports = router;
