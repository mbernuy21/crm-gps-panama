// Asistente de IA con Google Gemini — GPS Tracker Panamá
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/database');
const auth = require('../middleware/auth');

// POST /api/asistente/chat — enviar mensaje al asistente
router.post('/chat', auth, async (req, res) => {
  try {
    const { mensaje, historial } = req.body;
    if (!mensaje) return res.status(400).json({ success: false, message: 'Mensaje requerido' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ success: false, message: 'Asistente IA no configurado. Agrega GEMINI_API_KEY al servidor.' });

    // Obtener contexto actualizado de la base de datos
    const contexto = await obtenerContextoCRM();

    // Inicializar Gemini con modelo Flash (económico)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prompt del sistema con contexto del CRM
    const systemPrompt = `Eres el asistente virtual del CRM de GPS Tracker Panamá, una empresa de rastreo GPS vehicular en Panamá.
Tu nombre es "GPT GPS" (GPS Panamá Tracker).
Responde siempre en español, de forma concisa, profesional y amigable.
Usa B/. para la moneda (Balboas panameños = USD).

DATOS ACTUALES DEL CRM (${new Date().toLocaleDateString('es-PA')}):
${contexto}

CAPACIDADES:
- Responder preguntas sobre clientes, pagos, dispositivos, leads y cotizaciones
- Ayudar a redactar mensajes de cobro para WhatsApp
- Redactar emails formales para clientes
- Dar resúmenes y estadísticas del negocio
- Sugerir acciones basadas en los datos

REGLAS:
- Si te preguntan algo que no está en los datos del CRM, dilo claramente
- Para acciones que modifican datos, indica al usuario que las realice manualmente en el CRM
- Sé conciso — respuestas de máximo 3-4 párrafos salvo que se pida más detalle`;

    // Construir historial de chat para Gemini
    const chat = model.startChat({
      history: (historial || []).map(msg => ({
        role: msg.rol === 'usuario' ? 'user' : 'model',
        parts: [{ text: msg.contenido }]
      })),
      systemInstruction: systemPrompt
    });

    const result = await chat.sendMessage(mensaje);
    const respuesta = result.response.text();

    res.json({ success: true, data: { respuesta } });
  } catch (err) {
    console.error('Error asistente IA:', err.message);
    if (err.message?.includes('API key')) {
      return res.status(401).json({ success: false, message: 'API key de Gemini inválida' });
    }
    res.status(500).json({ success: false, message: 'Error del asistente: ' + err.message });
  }
});

// Función para construir el contexto del CRM en texto
async function obtenerContextoCRM() {
  try {
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM clientes WHERE estado='activo') AS clientes_activos,
        (SELECT COUNT(*) FROM clientes WHERE estado='moroso') AS clientes_morosos,
        (SELECT COUNT(*) FROM clientes WHERE estado='suspendido') AS clientes_suspendidos,
        (SELECT COUNT(*) FROM clientes) AS total_clientes,
        (SELECT COUNT(*) FROM dispositivos WHERE estado='asignado') AS gps_asignados,
        (SELECT COUNT(*) FROM dispositivos WHERE estado='disponible') AS gps_disponibles,
        (SELECT COUNT(*) FROM leads WHERE estado='nuevo') AS leads_nuevos,
        (SELECT COUNT(*) FROM leads) AS total_leads,
        (SELECT COUNT(*) FROM tareas WHERE estado!='completada') AS tareas_pendientes,
        (SELECT COUNT(*) FROM tareas WHERE estado!='completada' AND fecha_limite < CURDATE()) AS tareas_vencidas,
        (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE MONTH(fecha_pago)=MONTH(CURDATE()) AND YEAR(fecha_pago)=YEAR(CURDATE())) AS cobros_este_mes,
        (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE MONTH(fecha_pago)=MONTH(DATE_SUB(CURDATE(),INTERVAL 1 MONTH)) AND YEAR(fecha_pago)=YEAR(DATE_SUB(CURDATE(),INTERVAL 1 MONTH))) AS cobros_mes_anterior
    `);

    // Clientes morosos (top 5)
    const [morosos] = await db.query(`
      SELECT c.nombre_razon_social, c.whatsapp, ct.monto_total, ct.fecha_proximo_pago,
        DATEDIFF(CURDATE(), ct.fecha_proximo_pago) AS dias_mora
      FROM clientes c
      JOIN contratos ct ON ct.cliente_id = c.id
      WHERE c.estado = 'moroso'
      ORDER BY dias_mora DESC LIMIT 5
    `);

    // Vencimientos próximos (7 días)
    const [proximos] = await db.query(`
      SELECT c.nombre_razon_social, ct.fecha_proximo_pago, ct.monto_total,
        DATEDIFF(ct.fecha_proximo_pago, CURDATE()) AS dias_restantes
      FROM contratos ct
      JOIN clientes c ON c.id = ct.cliente_id
      WHERE ct.estado='activo' AND ct.fecha_proximo_pago BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY ct.fecha_proximo_pago ASC LIMIT 10
    `);

    // Tareas pendientes urgentes
    const [tareas] = await db.query(`
      SELECT t.titulo, t.prioridad, t.fecha_limite, c.nombre_razon_social AS cliente
      FROM tareas t
      LEFT JOIN clientes c ON c.id = t.cliente_id
      WHERE t.estado != 'completada'
      ORDER BY t.fecha_limite ASC LIMIT 5
    `);

    let ctx = `ESTADÍSTICAS GENERALES:
- Clientes activos: ${stats.clientes_activos} | Morosos: ${stats.clientes_morosos} | Suspendidos: ${stats.clientes_suspendidos} | Total: ${stats.total_clientes}
- GPS asignados: ${stats.gps_asignados} | Disponibles: ${stats.gps_disponibles}
- Leads nuevos: ${stats.leads_nuevos} | Total leads: ${stats.total_leads}
- Tareas pendientes: ${stats.tareas_pendientes} (${stats.tareas_vencidas} vencidas)
- Cobros este mes: B/.${parseFloat(stats.cobros_este_mes).toFixed(2)}
- Cobros mes anterior: B/.${parseFloat(stats.cobros_mes_anterior).toFixed(2)}`;

    if (morosos.length) {
      ctx += `\n\nCLIENTES MOROSOS:\n` + morosos.map(m =>
        `- ${m.nombre_razon_social}: B/.${m.monto_total} — ${m.dias_mora} días de mora`
      ).join('\n');
    }

    if (proximos.length) {
      ctx += `\n\nVENCIMIENTOS PRÓXIMOS (7 días):\n` + proximos.map(p =>
        `- ${p.nombre_razon_social}: B/.${p.monto_total} — vence en ${p.dias_restantes} día(s)`
      ).join('\n');
    }

    if (tareas.length) {
      ctx += `\n\nTAREAS PENDIENTES:\n` + tareas.map(t =>
        `- [${t.prioridad}] ${t.titulo}${t.cliente ? ` (${t.cliente})` : ''} — ${t.fecha_limite ? new Date(t.fecha_limite).toLocaleDateString('es-PA') : 'Sin fecha'}`
      ).join('\n');
    }

    return ctx;
  } catch (err) {
    console.error('Error obteniendo contexto CRM:', err.message);
    return 'No se pudo obtener el contexto del CRM en este momento.';
  }
}

module.exports = router;
