// Asistente de IA con Groq (llama-3.1-70b) — GPS Tracker Panamá
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const db = require('../config/database');
const { authMiddleware: auth } = require('../middleware/auth');

// POST /api/asistente/chat — enviar mensaje al asistente
router.post('/chat', auth, async (req, res) => {
  try {
    const { mensaje, historial } = req.body;
    if (!mensaje) return res.status(400).json({ success: false, message: 'Mensaje requerido' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(503).json({ success: false, message: 'Asistente IA no configurado. Agrega GROQ_API_KEY al servidor.' });

    // Obtener contexto actualizado del CRM
    const contexto = await obtenerContextoCRM();

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

    // Construir mensajes para Groq (formato OpenAI compatible)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(historial || []).map(msg => ({
        role: msg.rol === 'usuario' ? 'user' : 'assistant',
        content: msg.contenido
      })),
      { role: 'user', content: mensaje }
    ];

    // Llamar a Groq
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',   // Modelo gratuito de alta calidad
      messages,
      temperature: 0.7,
      max_tokens: 1024
    });

    const respuesta = completion.choices[0]?.message?.content || 'Sin respuesta';
    res.json({ success: true, data: { respuesta } });

  } catch (err) {
    console.error('Error asistente IA:', err.message);
    if (err.message?.includes('API key') || err.status === 401) {
      return res.status(401).json({ success: false, message: 'API key de Groq inválida. Verifica GROQ_API_KEY en Railway.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ success: false, message: 'Límite de requests alcanzado. Espera un momento.' });
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
        (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE MONTH(fecha_pago)=MONTH(CURDATE()) AND YEAR(fecha_pago)=YEAR(CURDATE())) AS cobros_mes,
        (SELECT COALESCE(SUM(monto),0) FROM pagos) AS cobros_total
    `);

    // Tareas con fallback
    const tareas = await db.query(`
      SELECT titulo, estado, prioridad, fecha_limite FROM tareas
      WHERE estado != 'completada' ORDER BY fecha_limite ASC LIMIT 5
    `).then(([rows]) => rows).catch(() => []);

    // Últimos 5 pagos
    const [pagos] = await db.query(`
      SELECT p.monto, p.fecha_pago, c.nombre_razon_social AS cliente
      FROM pagos p JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.fecha_pago DESC LIMIT 5
    `).catch(() => [[]]);

    // Clientes morosos
    const [morosos] = await db.query(`
      SELECT nombre_razon_social, whatsapp FROM clientes
      WHERE estado='moroso' LIMIT 5
    `).catch(() => [[]]);

    let ctx = `
RESUMEN:
- Clientes activos: ${stats.clientes_activos} | Morosos: ${stats.clientes_morosos} | Suspendidos: ${stats.clientes_suspendidos} | Total: ${stats.total_clientes}
- GPS asignados: ${stats.gps_asignados} | Disponibles: ${stats.gps_disponibles}
- Leads nuevos: ${stats.leads_nuevos}
- Cobros este mes: B/. ${parseFloat(stats.cobros_mes).toFixed(2)} | Total histórico: B/. ${parseFloat(stats.cobros_total).toFixed(2)}`;

    if (pagos?.length) {
      ctx += `\n\nÚLTIMOS PAGOS:`;
      pagos.forEach(p => { ctx += `\n- ${p.cliente}: B/. ${p.monto} el ${new Date(p.fecha_pago).toLocaleDateString('es-PA')}`; });
    }

    if (morosos?.length) {
      ctx += `\n\nCLIENTES MOROSOS:`;
      morosos.forEach(m => { ctx += `\n- ${m.nombre_razon_social} (WA: ${m.whatsapp || 'N/A'})`; });
    }

    if (tareas?.length) {
      ctx += `\n\nTAREAS PENDIENTES:`;
      tareas.forEach(t => { ctx += `\n- [${t.prioridad}] ${t.titulo} — ${t.estado} (vence: ${t.fecha_limite ? new Date(t.fecha_limite).toLocaleDateString('es-PA') : 'sin fecha'})`; });
    }

    return ctx;
  } catch (err) {
    console.error('Error obteniendo contexto CRM:', err.message);
    return 'Contexto no disponible temporalmente.';
  }
}

module.exports = router;
