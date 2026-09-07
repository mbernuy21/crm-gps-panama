// Webhook de WhatsApp Cloud API — Meta
// Recibe mensajes entrantes y responde con IA (Claude)
const express = require('express');
const router = express.Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'gps_tracker_panama_2025';
const WA_TOKEN    = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

// ── GET /api/whatsapp/webhook — verificación de Meta ────────────────────────
// Meta llama a este endpoint cuando configuras el webhook en el panel
router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook de WhatsApp verificado por Meta');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Token de verificación incorrecto:', token);
  res.sendStatus(403);
});

// ── POST /api/whatsapp/webhook — mensajes entrantes ─────────────────────────
router.post('/webhook', express.json(), async (req, res) => {
  // Responder 200 inmediatamente para que Meta no reintente
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry    = body.entry?.[0];
    const changes  = entry?.changes?.[0];
    const value    = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const msg     = messages[0];
    const from    = msg.from;          // número del cliente
    const tipo    = msg.type;          // text, image, audio, etc.
    const nombre  = value.contacts?.[0]?.profile?.name || 'Cliente';

    let textoRecibido = '';
    if (tipo === 'text') {
      textoRecibido = msg.text?.body || '';
    } else {
      textoRecibido = `[Mensaje de tipo: ${tipo}]`;
    }

    console.log(`📩 WhatsApp de ${nombre} (${from}): ${textoRecibido}`);

    // Responder con IA (Claude) si hay token configurado
    if (WA_TOKEN && WA_PHONE_ID) {
      const respuesta = await generarRespuestaIA(textoRecibido, nombre, from);
      await enviarMensaje(from, respuesta);
    }

  } catch (err) {
    console.error('Error procesando webhook WhatsApp:', err.message);
  }
});

// ── Generar respuesta con Claude IA ──────────────────────────────────────────
async function generarRespuestaIA(mensaje, nombre, telefono) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_KEY) {
    return `Hola ${nombre}, gracias por escribirnos a GPS Tracker Panamá 📡\nEn breve un asesor te atenderá.`;
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: `Eres el asistente virtual de GPS Tracker Panamá, empresa de venta,
alquiler e instalación de rastreadores GPS en Panamá.
Respondes por WhatsApp de forma amable, breve y profesional.
Si el cliente pregunta precios, dile que un asesor le confirmará los detalles.
Si quiere una cotización, pídele: cantidad de vehículos, tipo (carro/moto/camión) y zona en Panamá.
Si tiene problema técnico con su GPS, pregunta el número IMEI y el síntoma.
Siempre responde en español, máximo 3 párrafos cortos. Usa emojis con moderación.
NUNCA inventes precios ni datos que no tengas.`,
      messages: [
        { role: 'user', content: `Cliente llamado ${nombre} dice: "${mensaje}"` }
      ]
    });

    return response.content[0].text;

  } catch (err) {
    console.error('Error Claude IA:', err.message);
    return `Hola ${nombre}, gracias por escribirnos 📡 Un asesor de GPS Tracker Panamá te atenderá pronto.`;
  }
}

// ── Enviar mensaje por WhatsApp Cloud API ────────────────────────────────────
async function enviarMensaje(para, texto) {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.log('⚠️ Sin credenciales WA — mensaje no enviado:', texto);
    return;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: para,
          type: 'text',
          text: { body: texto }
        })
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error('Error enviando WA:', JSON.stringify(data));
    } else {
      console.log(`✅ Mensaje enviado a ${para}`);
    }
  } catch (err) {
    console.error('Error fetch WA:', err.message);
  }
}

module.exports = router;
