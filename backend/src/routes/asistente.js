// Asistente de IA con Groq (Llama 3.3) + Function Calling — GPS Tracker Panamá
// La IA puede consultar la base de datos en vivo: clientes, pagos, dispositivos, contratos, etc.
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware: auth } = require('../middleware/auth');

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELO = 'llama-3.3-70b-versatile';

// ─────────────────────────────────────────────────────────────────────────────
// HERRAMIENTAS (funciones que la IA puede llamar para consultar datos reales)
// ─────────────────────────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'buscar_cliente',
      description: 'Busca uno o varios clientes por nombre, RUC, teléfono, WhatsApp o email. Devuelve sus datos, dispositivos GPS asignados, contrato y resumen de pagos. Úsalo siempre que pregunten por un cliente específico.',
      parameters: {
        type: 'object',
        properties: {
          termino: { type: 'string', description: 'Nombre, RUC, teléfono o email del cliente a buscar (parcial)' }
        },
        required: ['termino']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'estado_cuenta_cliente',
      description: 'Devuelve el historial completo de pagos de un cliente (estado de cuenta): fechas, montos, método. Úsalo cuando pidan estado de cuenta, últimos pagos o historial de un cliente.',
      parameters: {
        type: 'object',
        properties: {
          termino: { type: 'string', description: 'Nombre o RUC del cliente' },
          limite: { type: 'number', description: 'Cantidad de pagos a devolver (por defecto 12)' }
        },
        required: ['termino']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listar_clientes_por_estado',
      description: 'Lista clientes filtrados por estado: activo, inactivo, moroso, suspendido o cortado. Úsalo para "cuántos morosos hay", "lista de suspendidos", etc.',
      parameters: {
        type: 'object',
        properties: {
          estado: { type: 'string', enum: ['activo', 'inactivo', 'moroso', 'suspendido', 'cortado'], description: 'Estado a filtrar' }
        },
        required: ['estado']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'buscar_dispositivo',
      description: 'Busca un dispositivo GPS por serial, placa de vehículo o número de SIM. Devuelve su estado, cliente asignado y datos.',
      parameters: {
        type: 'object',
        properties: {
          termino: { type: 'string', description: 'Serial GPS, placa o SIM card' }
        },
        required: ['termino']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'proximos_vencimientos',
      description: 'Lista contratos con pagos próximos a vencer o ya vencidos (morosos). Úsalo para "qué pagos vencen esta semana", "quién debe", "vencimientos".',
      parameters: {
        type: 'object',
        properties: {
          dias: { type: 'number', description: 'Ventana de días hacia adelante para próximos vencimientos (por defecto 7)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'estadisticas_generales',
      description: 'Resumen ejecutivo del negocio: total clientes por estado, dispositivos, leads, cobros del mes y del histórico. Úsalo para preguntas generales o financieras.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'pagos_recientes',
      description: 'Últimos pagos registrados en todo el CRM (de cualquier cliente). Úsalo para "últimos pagos", "qué se cobró hoy/esta semana".',
      parameters: {
        type: 'object',
        properties: {
          limite: { type: 'number', description: 'Cantidad de pagos (por defecto 10)' }
        }
      }
    }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTACIÓN de cada herramienta (consultas reales a MySQL, parametrizadas)
// ─────────────────────────────────────────────────────────────────────────────
const IMPL = {
  async buscar_cliente({ termino }) {
    const like = `%${termino}%`;
    const [clientes] = await db.query(
      `SELECT id, nombre_razon_social, tipo_cliente, ruc, telefono_principal, whatsapp, email,
              provincia, distrito, estado, notas_internas
       FROM clientes
       WHERE nombre_razon_social LIKE ? OR ruc LIKE ? OR telefono_principal LIKE ? OR whatsapp LIKE ? OR email LIKE ?
       LIMIT 5`,
      [like, like, like, like, like]
    );
    if (!clientes.length) return { encontrados: 0, mensaje: 'No se encontró ningún cliente con ese término.' };

    // Enriquecer cada cliente con dispositivos, contrato y resumen de pagos
    for (const c of clientes) {
      const [disp] = await db.query(
        `SELECT serial_gps, simcard, placa_vehiculo, modelo_auto, estado, modalidad FROM dispositivos WHERE cliente_id = ?`, [c.id]
      ).catch(() => [[]]);
      const [[contrato]] = await db.query(
        `SELECT frecuencia, monto_total, fecha_inicio, fecha_proximo_pago, estado FROM contratos WHERE cliente_id = ? ORDER BY id DESC LIMIT 1`, [c.id]
      ).catch(() => [[]]);
      const [[resumen]] = await db.query(
        `SELECT COUNT(*) AS num_pagos, COALESCE(SUM(monto),0) AS total_pagado, MAX(fecha_pago) AS ultimo_pago FROM pagos WHERE cliente_id = ?`, [c.id]
      ).catch(() => [[{}]]);
      c.dispositivos = disp || [];
      c.contrato = contrato || null;
      c.resumen_pagos = resumen || {};
    }
    return { encontrados: clientes.length, clientes };
  },

  async estado_cuenta_cliente({ termino, limite = 12 }) {
    const like = `%${termino}%`;
    const [[cliente]] = await db.query(
      `SELECT id, nombre_razon_social, estado FROM clientes WHERE nombre_razon_social LIKE ? OR ruc LIKE ? LIMIT 1`,
      [like, like]
    );
    if (!cliente) return { mensaje: 'Cliente no encontrado.' };
    const [pagos] = await db.query(
      `SELECT p.fecha_pago, p.monto, p.metodo, p.notas, u.nombre AS registrado_por
       FROM pagos p LEFT JOIN usuarios u ON u.id = p.registrado_por
       WHERE p.cliente_id = ? ORDER BY p.fecha_pago DESC LIMIT ?`,
      [cliente.id, parseInt(limite) || 12]
    );
    const [[contrato]] = await db.query(
      `SELECT frecuencia, monto_total, fecha_proximo_pago, estado FROM contratos WHERE cliente_id = ? ORDER BY id DESC LIMIT 1`, [cliente.id]
    ).catch(() => [[]]);
    const total = pagos.reduce((s, p) => s + parseFloat(p.monto), 0);
    return { cliente: cliente.nombre_razon_social, estado: cliente.estado, contrato: contrato || null, total_historico: total.toFixed(2), pagos };
  },

  async listar_clientes_por_estado({ estado }) {
    const [clientes] = await db.query(
      `SELECT nombre_razon_social, telefono_principal, whatsapp, provincia FROM clientes WHERE estado = ? ORDER BY nombre_razon_social ASC LIMIT 50`,
      [estado]
    );
    return { estado, cantidad: clientes.length, clientes };
  },

  async buscar_dispositivo({ termino }) {
    const like = `%${termino}%`;
    const [disp] = await db.query(
      `SELECT d.serial_gps, d.simcard, d.placa_vehiculo, d.modelo_auto, d.estado, d.modalidad, d.valor_equipo_usd,
              c.nombre_razon_social AS cliente
       FROM dispositivos d LEFT JOIN clientes c ON c.id = d.cliente_id
       WHERE d.serial_gps LIKE ? OR d.placa_vehiculo LIKE ? OR d.simcard LIKE ?
       LIMIT 10`,
      [like, like, like]
    );
    return { encontrados: disp.length, dispositivos: disp };
  },

  async proximos_vencimientos({ dias = 7 }) {
    const [rows] = await db.query(
      `SELECT c.nombre_razon_social AS cliente, c.whatsapp, c.estado AS estado_cliente,
              con.monto_total, con.fecha_proximo_pago, con.frecuencia,
              DATEDIFF(con.fecha_proximo_pago, CURDATE()) AS dias_para_vencer,
              DATEDIFF(CURDATE(), con.fecha_proximo_pago) AS dias_mora
       FROM contratos con INNER JOIN clientes c ON c.id = con.cliente_id
       WHERE con.estado = 'activo'
         AND (DATEDIFF(con.fecha_proximo_pago, CURDATE()) BETWEEN 0 AND ?
              OR DATEDIFF(CURDATE(), con.fecha_proximo_pago) > 0)
       ORDER BY con.fecha_proximo_pago ASC LIMIT 50`,
      [parseInt(dias) || 7]
    );
    return { cantidad: rows.length, vencimientos: rows };
  },

  async estadisticas_generales() {
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM clientes WHERE estado='activo') AS clientes_activos,
        (SELECT COUNT(*) FROM clientes WHERE estado='moroso') AS clientes_morosos,
        (SELECT COUNT(*) FROM clientes WHERE estado='suspendido') AS clientes_suspendidos,
        (SELECT COUNT(*) FROM clientes WHERE estado='cortado') AS clientes_cortados,
        (SELECT COUNT(*) FROM clientes) AS total_clientes,
        (SELECT COUNT(*) FROM dispositivos WHERE estado='asignado') AS gps_asignados,
        (SELECT COUNT(*) FROM dispositivos WHERE estado='disponible') AS gps_disponibles,
        (SELECT COUNT(*) FROM dispositivos WHERE estado='perdido') AS gps_perdidos,
        (SELECT COUNT(*) FROM leads WHERE estado='nuevo') AS leads_nuevos,
        (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE MONTH(fecha_pago)=MONTH(CURDATE()) AND YEAR(fecha_pago)=YEAR(CURDATE())) AS cobros_mes,
        (SELECT COALESCE(SUM(monto),0) FROM pagos) AS cobros_historico
    `);
    return stats;
  },

  async pagos_recientes({ limite = 10 }) {
    const [pagos] = await db.query(
      `SELECT p.fecha_pago, p.monto, p.metodo, c.nombre_razon_social AS cliente, u.nombre AS registrado_por
       FROM pagos p INNER JOIN clientes c ON c.id = p.cliente_id LEFT JOIN usuarios u ON u.id = p.registrado_por
       ORDER BY p.fecha_pago DESC, p.id DESC LIMIT ?`,
      [parseInt(limite) || 10]
    );
    return { cantidad: pagos.length, pagos };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Llamada a Groq
// ─────────────────────────────────────────────────────────────────────────────
async function llamarGroq(apiKey, messages, usarTools = true) {
  const body = {
    model: MODELO,
    messages,
    temperature: 0.3,
    max_tokens: 1500
  };
  if (usarTools) { body.tools = TOOLS; body.tool_choice = 'auto'; }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const e = new Error(err.error?.message || `HTTP ${response.status}`);
    e.status = response.status;
    throw e;
  }
  return response.json();
}

// POST /api/asistente/chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { mensaje, historial } = req.body;
    if (!mensaje) return res.status(400).json({ success: false, message: 'Mensaje requerido' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ success: false, message: 'Asistente IA no configurado. Agrega GROQ_API_KEY en Railway Variables.' });

    const hoy = new Date().toLocaleDateString('es-PA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const systemPrompt = `Eres "Asistente GPS", el asistente inteligente del CRM de GPS Tracker Panamá (empresa de rastreo GPS vehicular en Panamá).
Hoy es ${hoy}.

TIENES ACCESO EN VIVO A LA BASE DE DATOS mediante herramientas (functions). ÚSALAS SIEMPRE que necesites datos reales:
- buscar_cliente: para cualquier pregunta sobre un cliente específico (datos, equipos, contrato).
- estado_cuenta_cliente: para estados de cuenta, historial o últimos pagos de un cliente.
- listar_clientes_por_estado: para listas (morosos, suspendidos, etc.).
- buscar_dispositivo: para GPS por serial, placa o SIM.
- proximos_vencimientos: para pagos próximos o vencidos.
- estadisticas_generales: para resúmenes del negocio o finanzas.
- pagos_recientes: para últimos pagos globales.

REGLAS:
- NUNCA inventes datos. Si no tienes la info, llama a la herramienta correcta. Si aún no aparece, dilo claramente.
- Cuando muestres pagos, estados de cuenta o listas, formatea la respuesta en TABLAS Markdown (| columna | columna |) para que se lea fácil.
- Usa B/. para la moneda (Balboa = USD). Fechas en formato DD/MM/YYYY.
- Sé conciso, profesional y en español panameño neutro.
- Para modificar datos, indica al usuario que lo haga en el módulo correspondiente del CRM (tú solo consultas).`;

    let messages = [
      { role: 'system', content: systemPrompt },
      ...(historial || []).slice(-8).map(m => ({
        role: m.rol === 'usuario' ? 'user' : 'assistant',
        content: m.contenido
      })),
      { role: 'user', content: mensaje }
    ];

    // Bucle de razonamiento con herramientas (máx 4 iteraciones)
    let respuestaFinal = null;
    for (let i = 0; i < 4; i++) {
      const data = await llamarGroq(apiKey, messages, true);
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      // Si la IA quiere llamar herramientas, las ejecutamos y devolvemos resultados
      if (msg.tool_calls && msg.tool_calls.length) {
        messages.push(msg); // mensaje del asistente con las tool_calls
        for (const tc of msg.tool_calls) {
          let resultado;
          try {
            const args = JSON.parse(tc.function.arguments || '{}');
            const fn = IMPL[tc.function.name];
            resultado = fn ? await fn(args) : { error: 'Función desconocida' };
          } catch (e) {
            resultado = { error: e.message };
          }
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(resultado)
          });
        }
        continue; // volver a llamar a la IA con los resultados
      }

      // Respuesta final de texto
      respuestaFinal = msg.content;
      break;
    }

    if (!respuestaFinal) respuestaFinal = 'No pude generar una respuesta. Intenta reformular la pregunta.';
    res.json({ success: true, data: { respuesta: respuestaFinal } });

  } catch (err) {
    console.error('Error asistente IA:', err.message);
    if (err.status === 401) return res.status(401).json({ success: false, message: 'API key de Groq inválida. Verifica GROQ_API_KEY en Railway.' });
    if (err.status === 429) return res.status(429).json({ success: false, message: 'Límite de uso alcanzado. Espera un momento.' });
    res.status(500).json({ success: false, message: 'Error del asistente: ' + err.message });
  }
});

module.exports = router;
