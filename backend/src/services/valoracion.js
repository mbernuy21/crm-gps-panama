/**
 * Servicio de Valoración Automática de Clientes
 * ─────────────────────────────────────────────
 * Calcula una puntuación de 1.0 a 5.0 estrellas (en pasos de 0.5)
 * basada en 4 componentes del historial de pagos y estado del cliente.
 *
 * Componentes:
 *  1. Estado actual del cliente       (0-25 pts)
 *  2. Días de mora en contrato activo (0-25 pts)
 *  3. Cantidad de pagos últimos 12m   (0-25 pts)
 *  4. Puntualidad entre pagos         (0-25 pts)
 *
 * Total 0-100 → estrellas 1.0-5.0 en incrementos de 0.5
 */

const ESTADO_SCORE = {
  activo:    25,
  moroso:     8,
  suspendido: 3,
  cortado:    0,
  inactivo:   5,
};

const INTERVALOS_DIAS = {
  mensual:    30,
  trimestral: 90,
  semestral:  180,
  anual:      365,
};

const PERIODOS_12M = {
  mensual:    12,
  trimestral:  4,
  semestral:   2,
  anual:       1,
};

/**
 * Convierte puntaje 0-100 a estrellas 1.0-5.0 en pasos de 0.5
 */
function scoreAEstrellas(score) {
  const raw = 1 + (Math.max(0, Math.min(100, score)) / 100) * 4;
  return Math.round(raw * 2) / 2; // redondear a 0.5
}

/**
 * Calcula la valoración de un cliente individual
 * @param {object} cliente  - fila de la tabla clientes
 * @param {array}  pagos    - pagos ordenados por fecha ASC
 * @param {object} contrato - contrato activo (puede ser null)
 * @returns {{ estrellas: number, score: number, detalle: object }}
 */
function calcularValoracion(cliente, pagos = [], contrato = null) {
  let score = 0;
  const detalle = { estado: 0, mora: 0, cantidad: 0, puntualidad: 0 };

  // ── 1. Estado actual ──────────────────────────────────────────────────────
  detalle.estado = ESTADO_SCORE[cliente.estado] ?? 0;
  score += detalle.estado;

  // ── 2. Mora actual (días desde fecha_proximo_pago del contrato activo) ────
  if (contrato && contrato.fecha_proximo_pago) {
    const hoy = new Date();
    const vence = new Date(contrato.fecha_proximo_pago);
    const diasMora = Math.floor((hoy - vence) / 86_400_000);

    if      (diasMora <= -10) detalle.mora = 25; // paga muy adelantado
    else if (diasMora <= -1)  detalle.mora = 23; // paga adelantado
    else if (diasMora <=  0)  detalle.mora = 22; // exactamente a tiempo
    else if (diasMora <=  5)  detalle.mora = 18; // pequeño retraso
    else if (diasMora <= 15)  detalle.mora = 10; // retraso moderado
    else if (diasMora <= 30)  detalle.mora =  5; // retraso importante
    else                       detalle.mora =  0; // mora grave
  } else if (pagos.length > 0) {
    detalle.mora = 15; // Sin contrato activo pero tiene pagos
  }
  score += detalle.mora;

  // ── 3. Cantidad de pagos en los últimos 12 meses ─────────────────────────
  const hace12meses = new Date();
  hace12meses.setFullYear(hace12meses.getFullYear() - 1);

  const pagosRecientes = pagos.filter(p => new Date(p.fecha_pago) >= hace12meses);

  if (pagos.length > 0) {
    const esperados = contrato ? (PERIODOS_12M[contrato.frecuencia] || 12) : 6;
    const ratio = Math.min(1, pagosRecientes.length / esperados);
    detalle.cantidad = Math.round(ratio * 25);
  }
  score += detalle.cantidad;

  // ── 4. Puntualidad entre pagos consecutivos ────────────────────────────────
  const pagosOrdenados = [...pagos].sort((a, b) =>
    new Date(a.fecha_pago) - new Date(b.fecha_pago)
  );

  if (pagosOrdenados.length >= 2 && contrato) {
    const intervalo = INTERVALOS_DIAS[contrato.frecuencia] || 30;
    let totalPuntos = 0;
    const n = pagosOrdenados.length - 1;

    for (let i = 1; i <= n; i++) {
      const gap = Math.floor(
        (new Date(pagosOrdenados[i].fecha_pago) - new Date(pagosOrdenados[i - 1].fecha_pago))
        / 86_400_000
      );
      const diff = gap - intervalo; // negativo = pagó antes de tiempo

      let puntos;
      if      (diff <= -10) puntos = 100; // muy adelantado
      else if (diff <=   0) puntos = 100; // a tiempo o adelantado
      else if (diff <=   5) puntos =  85; // casi a tiempo
      else if (diff <=  15) puntos =  60; // algo tarde
      else if (diff <=  30) puntos =  30; // bastante tarde
      else                   puntos =   0; // muy tarde

      totalPuntos += puntos;
    }

    const promedio = totalPuntos / n;
    detalle.puntualidad = Math.round((promedio / 100) * 25);

  } else if (pagosOrdenados.length === 1) {
    detalle.puntualidad = 15; // Solo un pago — beneficio de la duda
  }
  score += detalle.puntualidad;

  const estrellas = scoreAEstrellas(score);

  return {
    estrellas,
    score,
    detalle,
    total_pagos: pagos.length,
    pagos_12m: pagosRecientes.length,
  };
}

/**
 * Calcula valoraciones para una lista de clientes de forma eficiente
 * usando los datos ya cargados (pagos y contratos por lotes)
 */
async function calcularValoracionesLote(db, clienteIds, filtroRolSql = '') {
  if (!clienteIds.length) return {};

  const ids = clienteIds.join(',');

  const [pagosRows] = await db.query(`
    SELECT p.cliente_id, p.fecha_pago, p.monto, p.contrato_id
    FROM pagos p
    WHERE p.cliente_id IN (${ids})
    ORDER BY p.fecha_pago ASC
  `);

  const [contratosRows] = await db.query(`
    SELECT con.cliente_id, con.frecuencia, con.fecha_proximo_pago, con.monto_total
    FROM contratos con
    WHERE con.cliente_id IN (${ids}) AND con.estado = 'activo'
    ORDER BY con.created_at DESC
  `);

  // Agrupar pagos por cliente
  const pagosPorCliente = {};
  for (const p of pagosRows) {
    if (!pagosPorCliente[p.cliente_id]) pagosPorCliente[p.cliente_id] = [];
    pagosPorCliente[p.cliente_id].push(p);
  }

  // Contrato activo por cliente (el más reciente)
  const contratoPorCliente = {};
  for (const c of contratosRows) {
    if (!contratoPorCliente[c.cliente_id]) contratoPorCliente[c.cliente_id] = c;
  }

  return { pagosPorCliente, contratoPorCliente };
}

module.exports = {
  calcularValoracion,
  calcularValoracionesLote,
  scoreAEstrellas,
};
