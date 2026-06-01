// Rutas del módulo de inventario
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/inventario — resumen completo del inventario
router.get('/', async (req, res) => {
  try {
    // Resumen por estado
    const [resumen] = await db.query(`
      SELECT estado, COUNT(*) AS cantidad, COALESCE(SUM(valor_equipo_usd), 0) AS valor_total
      FROM dispositivos
      GROUP BY estado
    `);

    // Valor total del inventario
    const [[totales]] = await db.query(`
      SELECT
        COUNT(*) AS total_equipos,
        COALESCE(SUM(valor_equipo_usd), 0) AS valor_total_inventario,
        COALESCE(SUM(CASE WHEN estado = 'perdido' THEN valor_equipo_usd ELSE 0 END), 0) AS valor_perdidas,
        COALESCE(SUM(CASE WHEN estado = 'disponible' THEN valor_equipo_usd ELSE 0 END), 0) AS valor_disponibles,
        COUNT(CASE WHEN estado = 'disponible' THEN 1 END) AS equipos_disponibles,
        COUNT(CASE WHEN estado = 'asignado' THEN 1 END) AS equipos_asignados,
        COUNT(CASE WHEN estado = 'perdido' THEN 1 END) AS equipos_perdidos,
        COUNT(CASE WHEN estado = 'duplicado' THEN 1 END) AS equipos_duplicados
      FROM dispositivos
    `);

    // Equipos disponibles para reasignar
    const [disponibles] = await db.query(`
      SELECT * FROM dispositivos WHERE estado = 'disponible' ORDER BY created_at DESC
    `);

    // Alertas: duplicados y perdidos
    const [alertas] = await db.query(`
      SELECT d.*, c.nombre_razon_social AS cliente_nombre
      FROM dispositivos d
      LEFT JOIN clientes c ON c.id = d.cliente_id
      WHERE d.estado IN ('perdido', 'duplicado')
      ORDER BY d.estado ASC
    `);

    res.json({
      success: true,
      data: {
        resumen,
        totales,
        disponibles,
        alertas
      }
    });
  } catch (err) {
    console.error('Error obteniendo inventario:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo inventario' });
  }
});

module.exports = router;
