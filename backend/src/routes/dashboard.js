// Rutas del dashboard — métricas y resumen ejecutivo
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/dashboard — resumen completo del dashboard
router.get('/', async (req, res) => {
  try {
    // KPIs principales
    const [[kpis]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM clientes WHERE estado = 'activo') AS clientes_activos,
        (SELECT COUNT(*) FROM clientes WHERE estado = 'moroso') AS clientes_morosos,
        (SELECT COUNT(*) FROM clientes WHERE estado = 'suspendido') AS clientes_suspendidos,
        (SELECT COUNT(*) FROM clientes WHERE estado = 'cortado') AS clientes_cortados,
        (SELECT COUNT(*) FROM leads WHERE estado = 'nuevo') AS leads_nuevos,
        (SELECT COUNT(*) FROM leads WHERE estado IN ('nuevo','contactado','interesado')) AS leads_activos,
        (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE MONTH(fecha_pago) = MONTH(CURDATE()) AND YEAR(fecha_pago) = YEAR(CURDATE())) AS cobros_mes_actual,
        (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE MONTH(fecha_pago) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(fecha_pago) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))) AS cobros_mes_anterior,
        (SELECT COUNT(*) FROM dispositivos WHERE estado = 'disponible') AS dispositivos_disponibles,
        (SELECT COUNT(*) FROM dispositivos WHERE estado = 'perdido') AS dispositivos_perdidos
    `);

    // Alertas del día
    const [[configAlerta]] = await db.query(
      "SELECT valor FROM configuracion WHERE clave = 'dias_alerta_pago'"
    );
    const diasAlerta = parseInt(configAlerta?.valor || 5);

    const [[alertas_count]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM contratos con INNER JOIN clientes c ON c.id = con.cliente_id
          WHERE con.estado = 'activo' AND c.estado = 'activo'
          AND DATEDIFF(con.fecha_proximo_pago, CURDATE()) BETWEEN 1 AND ?) AS proximos_vencer,
        (SELECT COUNT(*) FROM contratos con INNER JOIN clientes c ON c.id = con.cliente_id
          WHERE con.estado = 'activo' AND DATEDIFF(CURDATE(), con.fecha_proximo_pago) > 0) AS vencidos
    `, [diasAlerta]);

    // Ingresos por mes (últimos 6 meses)
    const [ingresos_mensuales] = await db.query(`
      SELECT
        DATE_FORMAT(fecha_pago, '%Y-%m') AS mes,
        DATE_FORMAT(fecha_pago, '%b %Y') AS mes_label,
        COALESCE(SUM(monto), 0) AS total
      FROM pagos
      WHERE fecha_pago >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(fecha_pago, '%Y-%m')
      ORDER BY mes ASC
    `);

    // Distribución de estados de clientes
    const [estados_clientes] = await db.query(`
      SELECT estado, COUNT(*) AS cantidad
      FROM clientes
      GROUP BY estado
    `);

    // Últimos pagos registrados
    const [ultimos_pagos] = await db.query(`
      SELECT p.*, c.nombre_razon_social AS cliente_nombre
      FROM pagos p INNER JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.created_at DESC LIMIT 5
    `);

    // Alertas del día (detalle)
    const [alertas_detalle] = await db.query(`
      SELECT con.id, con.monto_total, con.fecha_proximo_pago,
        c.id AS cliente_id, c.nombre_razon_social AS cliente_nombre,
        c.whatsapp, c.estado AS cliente_estado,
        DATEDIFF(con.fecha_proximo_pago, CURDATE()) AS dias_para_vencer,
        DATEDIFF(CURDATE(), con.fecha_proximo_pago) AS dias_mora
      FROM contratos con
      INNER JOIN clientes c ON c.id = con.cliente_id
      WHERE con.estado = 'activo'
        AND (
          DATEDIFF(con.fecha_proximo_pago, CURDATE()) BETWEEN 0 AND ?
          OR DATEDIFF(CURDATE(), con.fecha_proximo_pago) > 0
        )
      ORDER BY con.fecha_proximo_pago ASC
      LIMIT 20
    `, [diasAlerta]);

    // Pareto 80/20 — clientes ordenados por total pagado
    const [pareto_raw] = await db.query(`
      SELECT c.id, c.nombre_razon_social, c.estado,
        COALESCE(SUM(p.monto), 0) AS total_pagado
      FROM clientes c
      LEFT JOIN pagos p ON p.cliente_id = c.id
      GROUP BY c.id, c.nombre_razon_social, c.estado
      ORDER BY total_pagado DESC
    `);

    // Calcular 80/20
    const totalIngresos = pareto_raw.reduce((s, r) => s + parseFloat(r.total_pagado), 0);
    const umbral80 = totalIngresos * 0.8;
    let acumulado = 0;
    let corte20 = 0;
    const pareto = pareto_raw.map((r, i) => {
      acumulado += parseFloat(r.total_pagado);
      const es20 = acumulado <= umbral80;
      if (es20) corte20 = i + 1;
      return { ...r, total_pagado: parseFloat(r.total_pagado), acumulado, es_top20: es20 };
    });

    // Tareas pendientes para badge en dashboard
    const [[tareas_stats]] = await db.query(`
      SELECT
        COUNT(*) AS pendientes,
        SUM(CASE WHEN fecha_limite < CURDATE() THEN 1 ELSE 0 END) AS vencidas
      FROM tareas WHERE estado != 'completada'
    `).catch(() => [[{ pendientes: 0, vencidas: 0 }]]);

    res.json({
      success: true,
      data: {
        kpis,
        alertas_count,
        ingresos_mensuales,
        estados_clientes,
        ultimos_pagos,
        alertas_detalle,
        pareto: pareto.slice(0, 20),
        pareto_corte: corte20,
        total_ingresos: totalIngresos,
        tareas_stats: tareas_stats || { pendientes: 0, vencidas: 0 }
      }
    });
  } catch (err) {
    console.error('Error obteniendo dashboard:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo dashboard' });
  }
});

module.exports = router;
