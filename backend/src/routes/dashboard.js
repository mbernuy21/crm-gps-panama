// Rutas del dashboard — métricas y resumen ejecutivo
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getSubAgenteIds } = require('../services/rolFiltro');

router.use(authMiddleware);

// GET /api/dashboard — resumen completo (filtrado por rol si es sub_agente)
router.get('/', async (req, res) => {
  try {
    const esSubAgente = req.usuario.rol === 'sub_agente';
    const agenteId = req.usuario.id;

    // IDs de sub-agentes desde caché (no subquery por cada petición)
    const [subIds, configRows] = await Promise.all([
      getSubAgenteIds(),
      db.query("SELECT clave, valor FROM configuracion WHERE clave IN ('dias_alerta_pago', 'dias_moroso')")
    ]);

    const configMap = {};
    (configRows[0] || []).forEach(r => { configMap[r.clave] = r.valor; });
    const diasAlerta = parseInt(configMap['dias_alerta_pago'] || 5);

    const excluirSub = subIds.length > 0 ? `NOT IN (${subIds.join(',')})` : null;

    // Construir filtros según rol
    const mkFiltro = (col) => esSubAgente
      ? `AND ${col} = ${agenteId}`
      : excluirSub ? `AND (${col} IS NULL OR ${col} ${excluirSub})` : '';

    const filtroCliente    = mkFiltro('creado_por');
    const filtroPago       = mkFiltro('registrado_por');
    const filtroVenta      = mkFiltro('registrado_por');
    const filtroGPS        = mkFiltro('creado_por');
    const filtroTarea      = esSubAgente
      ? `AND creada_por = ${agenteId}`
      : excluirSub ? `AND (creada_por IS NULL OR creada_por ${excluirSub})` : '';
    const filtroClienteJoin = esSubAgente
      ? `AND c.creado_por = ${agenteId}`
      : excluirSub ? `AND (c.creado_por IS NULL OR c.creado_por ${excluirSub})` : '';
    const filtroSIM = esSubAgente ? `WHERE asignado_a_agente = ${agenteId}` : '';

    // Ejecutar TODAS las queries en paralelo (no secuenciales)
    const [
      kpisResult,
      alertasResult,
      ingresosResult,
      estadosResult,
      ultimosPagosResult,
      alertasDetalleResult,
      paretoResult,
      tareasResult,
      gpsResult,
      simResult,
      plataformaResult,
      ventasMesResult,
      anualidadesResult,
      mrrResult,
      clientesNuevosResult,
      ticketPromedioResult
    ] = await Promise.allSettled([

      // KPIs principales
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM clientes WHERE estado = 'activo' ${filtroCliente}) AS clientes_activos,
          (SELECT COUNT(*) FROM clientes WHERE estado = 'moroso' ${filtroCliente}) AS clientes_morosos,
          (SELECT COUNT(*) FROM clientes WHERE estado = 'suspendido' ${filtroCliente}) AS clientes_suspendidos,
          (SELECT COUNT(*) FROM clientes WHERE estado = 'cortado' ${filtroCliente}) AS clientes_cortados,
          (SELECT COUNT(*) FROM leads WHERE estado = 'nuevo' ${filtroCliente}) AS leads_nuevos,
          (SELECT COUNT(*) FROM leads WHERE estado IN ('nuevo','contactado','interesado') ${filtroCliente}) AS leads_activos,
          (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE MONTH(fecha_pago) = MONTH(CURDATE()) AND YEAR(fecha_pago) = YEAR(CURDATE()) ${filtroPago}) AS cobros_mes_actual,
          (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE MONTH(fecha_pago) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(fecha_pago) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) ${filtroPago}) AS cobros_mes_anterior,
          (SELECT COUNT(*) FROM dispositivos WHERE estado = 'disponible' ${filtroGPS}) AS dispositivos_disponibles,
          (SELECT COUNT(*) FROM dispositivos WHERE estado = 'perdido' ${filtroGPS}) AS dispositivos_perdidos
      `),

      // Conteo de alertas
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM contratos con INNER JOIN clientes c ON c.id = con.cliente_id
            WHERE con.estado = 'activo' AND c.estado = 'activo'
            AND DATEDIFF(con.fecha_proximo_pago, CURDATE()) BETWEEN 1 AND ${diasAlerta}
            ${filtroClienteJoin}) AS proximos_vencer,
          (SELECT COUNT(*) FROM contratos con INNER JOIN clientes c ON c.id = con.cliente_id
            WHERE con.estado = 'activo' AND DATEDIFF(CURDATE(), con.fecha_proximo_pago) > 0
            ${filtroClienteJoin}) AS vencidos
      `),

      // Ingresos últimos 6 meses
      db.query(`
        SELECT
          DATE_FORMAT(fecha_pago, '%Y-%m') AS mes,
          DATE_FORMAT(fecha_pago, '%b %Y') AS mes_label,
          COALESCE(SUM(monto), 0) AS total
        FROM pagos
        WHERE fecha_pago >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) ${filtroPago}
        GROUP BY DATE_FORMAT(fecha_pago, '%Y-%m')
        ORDER BY mes ASC
      `),

      // Distribución de estados de clientes
      db.query(`SELECT estado, COUNT(*) AS cantidad FROM clientes WHERE 1=1 ${filtroCliente} GROUP BY estado`),

      // Últimos 5 pagos
      db.query(`
        SELECT p.*, c.nombre_razon_social AS cliente_nombre
        FROM pagos p INNER JOIN clientes c ON c.id = p.cliente_id
        WHERE 1=1 ${filtroPago}
        ORDER BY p.created_at DESC LIMIT 5
      `),

      // Alertas del día (detalle)
      db.query(`
        SELECT con.id, con.monto_total, con.fecha_proximo_pago,
          c.id AS cliente_id, c.nombre_razon_social AS cliente_nombre,
          c.whatsapp, c.estado AS cliente_estado,
          DATEDIFF(con.fecha_proximo_pago, CURDATE()) AS dias_para_vencer,
          DATEDIFF(CURDATE(), con.fecha_proximo_pago) AS dias_mora
        FROM contratos con
        INNER JOIN clientes c ON c.id = con.cliente_id
        WHERE con.estado = 'activo'
          AND (
            DATEDIFF(con.fecha_proximo_pago, CURDATE()) BETWEEN 0 AND ${diasAlerta}
            OR DATEDIFF(CURDATE(), con.fecha_proximo_pago) > 0
          )
          ${filtroClienteJoin}
        ORDER BY con.fecha_proximo_pago ASC
        LIMIT 20
      `),

      // Pareto 80/20
      db.query(`
        SELECT c.id, c.nombre_razon_social, c.estado,
          COALESCE(SUM(p.monto), 0) AS total_pagado
        FROM clientes c
        LEFT JOIN pagos p ON p.cliente_id = c.id
        WHERE 1=1 ${filtroCliente}
        GROUP BY c.id, c.nombre_razon_social, c.estado
        ORDER BY total_pagado DESC
      `),

      // Tareas pendientes
      db.query(`
        SELECT
          COUNT(*) AS pendientes,
          SUM(CASE WHEN fecha_limite < CURDATE() THEN 1 ELSE 0 END) AS vencidas
        FROM tareas WHERE estado != 'completada' ${filtroTarea}
      `),

      // Stats de GPS
      db.query(`
        SELECT
          COUNT(*) AS total_gps,
          SUM(CASE WHEN estado = 'asignado' THEN 1 ELSE 0 END) AS gps_activos,
          SUM(CASE WHEN modalidad = 'venta' THEN 1 ELSE 0 END) AS gps_en_venta,
          SUM(CASE WHEN modalidad = 'alquiler' THEN 1 ELSE 0 END) AS gps_en_alquiler,
          SUM(CASE WHEN tipo_producto = 'portatil' THEN 1 ELSE 0 END) AS gps_portatiles,
          SUM(CASE WHEN tipo_producto = 'portatil' AND modalidad = 'alquiler' THEN 1 ELSE 0 END) AS portatiles_alquiler,
          SUM(CASE WHEN tipo_producto = 'fijo' AND modalidad = 'alquiler' THEN 1 ELSE 0 END) AS fijos_alquiler,
          SUM(CASE WHEN tipo_producto = 'fijo' AND modalidad = 'venta' THEN 1 ELSE 0 END) AS fijos_venta
        FROM dispositivos WHERE estado != 'perdido' ${filtroGPS}
      `),

      // SIM stats
      db.query(`
        SELECT
          COUNT(*) AS total_sims,
          SUM(CASE WHEN estado = 'asignada' THEN 1 ELSE 0 END) AS sims_activas,
          SUM(CASE WHEN estado = 'disponible' THEN 1 ELSE 0 END) AS sims_disponibles
        FROM simcards ${filtroSIM}
      `),

      // GPS por plataforma
      db.query(`
        SELECT
          COALESCE(plataforma, 'Sin plataforma') AS plataforma,
          COUNT(*) AS cantidad
        FROM dispositivos
        WHERE estado != 'perdido' ${filtroGPS}
        GROUP BY plataforma
        ORDER BY cantidad DESC
      `),

      // ══ NUEVO: Ventas del mes actual vs mes anterior (tabla ventas_cobros) ══
      db.query(`
        SELECT
          COALESCE(SUM(CASE
            WHEN MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
            THEN total ELSE 0 END), 0) AS ventas_mes_actual,
          COALESCE(SUM(CASE
            WHEN MONTH(fecha) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
              AND YEAR(fecha) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
            THEN total ELSE 0 END), 0) AS ventas_mes_anterior,
          COUNT(CASE
            WHEN MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
            THEN 1 END) AS cantidad_ventas_mes
        FROM ventas_cobros
        WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 2 MONTH) ${filtroVenta}
      `),

      // ══ NUEVO: Anualidades por cobrar este mes ══
      db.query(`
        SELECT
          COUNT(*) AS cantidad_anualidades,
          COALESCE(SUM(con.monto_total), 0) AS monto_anualidades,
          COUNT(CASE WHEN DATEDIFF(con.fecha_proximo_pago, CURDATE()) < 0 THEN 1 END) AS anualidades_vencidas,
          COUNT(CASE WHEN DATEDIFF(con.fecha_proximo_pago, CURDATE()) >= 0 THEN 1 END) AS anualidades_por_cobrar
        FROM contratos con
        INNER JOIN clientes c ON c.id = con.cliente_id
        WHERE con.frecuencia = 'anual'
          AND con.estado = 'activo'
          AND MONTH(con.fecha_proximo_pago) = MONTH(CURDATE())
          AND YEAR(con.fecha_proximo_pago) = YEAR(CURDATE())
          ${filtroClienteJoin}
      `),

      // ══ NUEVO: MRR — Ingreso Mensual Recurrente proyectado de contratos activos ══
      db.query(`
        SELECT
          COALESCE(SUM(
            CASE
              WHEN frecuencia = 'mensual'    THEN monto_total
              WHEN frecuencia = 'trimestral' THEN monto_total / 3
              WHEN frecuencia = 'semestral'  THEN monto_total / 6
              WHEN frecuencia = 'anual'      THEN monto_total / 12
              ELSE 0
            END
          ), 0) AS mrr,
          COUNT(*) AS contratos_activos,
          COUNT(CASE WHEN frecuencia = 'mensual'    THEN 1 END) AS contratos_mensuales,
          COUNT(CASE WHEN frecuencia = 'trimestral' THEN 1 END) AS contratos_trimestrales,
          COUNT(CASE WHEN frecuencia = 'semestral'  THEN 1 END) AS contratos_semestrales,
          COUNT(CASE WHEN frecuencia = 'anual'      THEN 1 END) AS contratos_anuales
        FROM contratos con
        INNER JOIN clientes c ON c.id = con.cliente_id
        WHERE con.estado = 'activo'
          ${filtroClienteJoin}
      `),

      // ══ NUEVO: Nuevos clientes este mes ══
      db.query(`
        SELECT
          COUNT(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) AS nuevos_mes_actual,
          COUNT(CASE WHEN MONTH(created_at) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) THEN 1 END) AS nuevos_mes_anterior
        FROM clientes
        WHERE 1=1 ${filtroCliente}
      `),

      // ══ NUEVO: Ticket promedio (pagos del mes) ══
      db.query(`
        SELECT
          COUNT(*) AS cantidad_pagos_mes,
          COALESCE(AVG(monto), 0) AS ticket_promedio,
          COALESCE(MAX(monto), 0) AS pago_max,
          COALESCE(MIN(monto), 0) AS pago_min
        FROM pagos
        WHERE MONTH(fecha_pago) = MONTH(CURDATE())
          AND YEAR(fecha_pago) = YEAR(CURDATE())
          ${filtroPago}
      `)
    ]);

    // Extraer resultados con fallbacks seguros
    const ok = (r, idx = 0) => r.status === 'fulfilled' ? r.value[0][idx] : null;
    const okArr = (r) => r.status === 'fulfilled' ? r.value[0] : [];

    const kpis              = ok(kpisResult) || {};
    const alertas_count     = ok(alertasResult) || { proximos_vencer: 0, vencidos: 0 };
    const ingresos_mensuales = okArr(ingresosResult);
    const estados_clientes  = okArr(estadosResult);
    const ultimos_pagos     = okArr(ultimosPagosResult);
    const alertas_detalle   = okArr(alertasDetalleResult);
    const pareto_raw        = okArr(paretoResult);
    const tareas_stats      = ok(tareasResult) || { pendientes: 0, vencidas: 0 };
    const gps_stats         = ok(gpsResult) || {};
    const sim_stats         = ok(simResult) || {};
    const gps_por_plataforma = okArr(plataformaResult);
    const ventas_stats      = ok(ventasMesResult) || { ventas_mes_actual: 0, ventas_mes_anterior: 0, cantidad_ventas_mes: 0 };
    const anualidades_stats = ok(anualidadesResult) || { cantidad_anualidades: 0, monto_anualidades: 0, anualidades_vencidas: 0, anualidades_por_cobrar: 0 };
    const mrr_stats         = ok(mrrResult) || { mrr: 0, contratos_activos: 0, contratos_mensuales: 0, contratos_anuales: 0 };
    const clientes_nuevos   = ok(clientesNuevosResult) || { nuevos_mes_actual: 0, nuevos_mes_anterior: 0 };
    const ticket_stats      = ok(ticketPromedioResult) || { cantidad_pagos_mes: 0, ticket_promedio: 0, pago_max: 0, pago_min: 0 };

    // Calcular Pareto 80/20
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

    // Calcular tasa de cobro del mes: cobrado / MRR proyectado
    const cobros_mes = parseFloat(kpis.cobros_mes_actual || 0);
    const mrr_val = parseFloat(mrr_stats.mrr || 0);
    const tasa_cobro_mes = mrr_val > 0 ? Math.min(100, Math.round((cobros_mes / mrr_val) * 100)) : 0;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
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
        tareas_stats,
        gps_stats,
        sim_stats,
        gps_por_plataforma,
        // ══ Nuevas métricas ══
        ventas_stats,
        anualidades_stats,
        mrr_stats,
        clientes_nuevos,
        ticket_stats,
        tasa_cobro_mes
      }
    });
  } catch (err) {
    console.error('Error obteniendo dashboard:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo dashboard: ' + err.message });
  }
});

module.exports = router;
