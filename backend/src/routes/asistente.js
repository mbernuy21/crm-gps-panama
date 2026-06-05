// Asistente de IA con Groq API (fetch directo, sin SDK) — GPS Tracker Panamá
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware: auth } = require('../middleware/auth');

// POST /api/asistente/chat — enviar mensaje al asistente
router.post('/chat', auth, async (req, res) => {
  try {
    const { mensaje, historial } = req.body;
    if (!mensaje) return res.status(400).json({ success: false, message: 'Mensaje requerido' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ success: false, message: 'Asistente IA no configurado. Agrega GROQ_API_KEY en Railway Variables.' });

    // Obtener contexto del CRM
    const contexto = await obtenerContextoCRM();

    const systemPrompt = `Eres el asistente virtual del CRM de GPS Tracker Panamá, empresa de rastreo GPS vehicular en Panamá.
Tu nombre es "Asistente GPS". Responde siempre en español, conciso y profesional. Usa B/. para la moneda.

DATOS ACTUALES DEL CRM (${new Date().toLocaleDateString('es-PA')}):
${contexto}

CAPACIDADES: responder sobre clientes, pagos, dispositivos, leads, cotizaciones. Redactar mensajes WhatsApp y emails de cobro.
REGLAS: Si no está en los datos, dilo claramente. Para modificar datos, indica que lo hagan manualmente en el CRM.`;

    // Construir mensajes (formato OpenAI-compatible que usa Groq)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(historial || []).map(m => ({
        role: m.rol === 'usuario' ? 'user' : 'assistant',
        content: m.contenido
      })),
      { role: 'user', content: mensaje }
    ];

    // Llamada directa a Groq API (compatible con OpenAI)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 401) return res.status(401).json({ success: false, message: 'API key de Groq inválida. Verifica GROQ_API_KEY en Railway.' });
      if (response.status === 429) return res.status(429).json({ success: false, message: 'Límite alcanzado. Espera un momento.' });
      throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const respuesta = data.choices?.[0]?.message?.content || 'Sin respuesta';
    res.json({ success: true, data: { respuesta } });

  } catch (err) {
    console.error('Error asistente IA:', err.message);
    res.status(500).json({ success: false, message: 'Error del asistente: ' + err.message });
  }
});

// Contexto del CRM para el prompt
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
        (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE MONTH(fecha_pago)=MONTH(CURDATE()) AND YEAR(fecha_pago)=YEAR(CURDATE())) AS cobros_mes,
        (SELECT COALESCE(SUM(monto),0) FROM pagos) AS cobros_total
    `);

    const tareas = await db.query(
      `SELECT titulo, estado, prioridad, fecha_limite FROM tareas WHERE estado != 'completada' ORDER BY fecha_limite ASC LIMIT 5`
    ).then(([rows]) => rows).catch(() => []);

    const [pagos] = await db.query(
      `SELECT p.monto, p.fecha_pago, c.nombre_razon_social AS cliente FROM pagos p JOIN clientes c ON c.id=p.cliente_id ORDER BY p.fecha_pago DESC LIMIT 5`
    ).catch(() => [[]]);

    const [morosos] = await db.query(
      `SELECT nombre_razon_social, whatsapp FROM clientes WHERE estado='moroso' LIMIT 5`
    ).catch(() => [[]]);

    let ctx = `RESUMEN:
- Clientes: ${stats.clientes_activos} activos | ${stats.clientes_morosos} morosos | ${stats.clientes_suspendidos} suspendidos | ${stats.total_clientes} total
- GPS: ${stats.gps_asignados} asignados | ${stats.gps_disponibles} disponibles
- Leads nuevos: ${stats.leads_nuevos}
- Cobros este mes: B/. ${parseFloat(stats.cobros_mes).toFixed(2)} | Total histórico: B/. ${parseFloat(stats.cobros_total).toFixed(2)}`;

    if (pagos?.length) {
      ctx += '\n\nÚLTIMOS PAGOS:';
      pagos.forEach(p => { ctx += `\n- ${p.cliente}: B/. ${p.monto} (${new Date(p.fecha_pago).toLocaleDateString('es-PA')})`; });
    }
    if (morosos?.length) {
      ctx += '\n\nMOROSOS:';
      morosos.forEach(m => { ctx += `\n- ${m.nombre_razon_social} (WA: ${m.whatsapp || 'N/A'})`; });
    }
    if (tareas?.length) {
      ctx += '\n\nTAREAS PENDIENTES:';
      tareas.forEach(t => { ctx += `\n- [${t.prioridad}] ${t.titulo} — ${t.estado}`; });
    }

    return ctx;
  } catch (err) {
    console.error('Error contexto CRM:', err.message);
    return 'Contexto no disponible.';
  }
}

module.exports = router;
