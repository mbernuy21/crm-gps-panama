// Rutas de cotizaciones — GPS Tracker Panamá
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

router.use(authMiddleware);

// Obtener siguiente número de cotización
async function siguienteNumero() {
  const [[r]] = await db.query('SELECT COALESCE(MAX(numero), 1000) + 1 AS siguiente FROM cotizaciones');
  return r.siguiente;
}

// GET /api/cotizaciones — listar cotizaciones
router.get('/', async (req, res) => {
  try {
    const [cotizaciones] = await db.query(`
      SELECT c.*,
        cl.nombre_razon_social AS cliente_nombre_crm,
        l.nombre AS lead_nombre,
        u.nombre AS creado_por_nombre
      FROM cotizaciones c
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      LEFT JOIN leads l ON l.id = c.lead_id
      LEFT JOIN usuarios u ON u.id = c.creado_por
      ORDER BY c.created_at DESC
    `);
    res.json({ success: true, data: cotizaciones });
  } catch (err) {
    console.error('Error obteniendo cotizaciones:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo cotizaciones' });
  }
});

// GET /api/cotizaciones/:id — obtener una cotización
router.get('/:id', async (req, res) => {
  try {
    const [[cotizacion]] = await db.query(`
      SELECT c.*,
        cl.nombre_razon_social AS cliente_nombre_crm,
        cl.email AS cliente_email_crm,
        cl.whatsapp AS cliente_whatsapp_crm,
        l.nombre AS lead_nombre,
        l.email AS lead_email,
        l.whatsapp AS lead_whatsapp,
        u.nombre AS creado_por_nombre
      FROM cotizaciones c
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      LEFT JOIN leads l ON l.id = c.lead_id
      LEFT JOIN usuarios u ON u.id = c.creado_por
      WHERE c.id = ?
    `, [req.params.id]);
    if (!cotizacion) return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
    cotizacion.items = JSON.parse(cotizacion.items_json || '[]');
    res.json({ success: true, data: cotizacion });
  } catch (err) {
    console.error('Error obteniendo cotización:', err);
    res.status(500).json({ success: false, message: 'Error obteniendo cotización' });
  }
});

// POST /api/cotizaciones — crear cotización
router.post('/', async (req, res) => {
  try {
    const {
      cliente_id, lead_id, nombre_cliente, email_cliente,
      telefono_cliente, whatsapp_cliente, items,
      subtotal, descuento_global, total, notas, fecha_vencimiento
    } = req.body;

    if (!nombre_cliente) return res.status(400).json({ success: false, message: 'El nombre del cliente es requerido' });
    if (!items || !items.length) return res.status(400).json({ success: false, message: 'Debe agregar al menos un producto' });

    const numero = await siguienteNumero();
    const [r] = await db.query(`
      INSERT INTO cotizaciones
        (numero, cliente_id, lead_id, nombre_cliente, email_cliente, telefono_cliente,
         whatsapp_cliente, items_json, subtotal, descuento_global, total, notas,
         fecha_vencimiento, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      numero,
      cliente_id || null, lead_id || null,
      nombre_cliente, email_cliente || null, telefono_cliente || null, whatsapp_cliente || null,
      JSON.stringify(items),
      parseFloat(subtotal) || 0, parseFloat(descuento_global) || 0, parseFloat(total) || 0,
      notas || null, fecha_vencimiento || null,
      req.usuario.id
    ]);
    const [[nueva]] = await db.query('SELECT * FROM cotizaciones WHERE id = ?', [r.insertId]);
    res.json({ success: true, data: nueva, message: `Cotización #${numero} creada` });
  } catch (err) {
    console.error('Error creando cotización:', err);
    res.status(500).json({ success: false, message: 'Error creando cotización' });
  }
});

// PUT /api/cotizaciones/:id — actualizar cotización
router.put('/:id', async (req, res) => {
  try {
    const {
      nombre_cliente, email_cliente, telefono_cliente, whatsapp_cliente,
      items, subtotal, descuento_global, total, notas, fecha_vencimiento, estado
    } = req.body;

    await db.query(`
      UPDATE cotizaciones SET
        nombre_cliente=?, email_cliente=?, telefono_cliente=?, whatsapp_cliente=?,
        items_json=?, subtotal=?, descuento_global=?, total=?, notas=?,
        fecha_vencimiento=?, estado=?
      WHERE id=?
    `, [
      nombre_cliente, email_cliente || null, telefono_cliente || null, whatsapp_cliente || null,
      JSON.stringify(items || []),
      parseFloat(subtotal) || 0, parseFloat(descuento_global) || 0, parseFloat(total) || 0,
      notas || null, fecha_vencimiento || null, estado || 'borrador',
      req.params.id
    ]);
    res.json({ success: true, message: 'Cotización actualizada' });
  } catch (err) {
    console.error('Error actualizando cotización:', err);
    res.status(500).json({ success: false, message: 'Error actualizando cotización' });
  }
});

// PATCH /api/cotizaciones/:id/estado — cambiar estado
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body;
    const estados = ['borrador', 'enviada', 'vista', 'aceptada', 'rechazada'];
    if (!estados.includes(estado)) return res.status(400).json({ success: false, message: 'Estado inválido' });
    await db.query('UPDATE cotizaciones SET estado = ? WHERE id = ?', [estado, req.params.id]);
    res.json({ success: true, message: `Estado actualizado a: ${estado}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error actualizando estado' });
  }
});

// POST /api/cotizaciones/:id/convertir-cliente — convertir lead a cliente
router.post('/:id/convertir-cliente', async (req, res) => {
  try {
    const [[cotizacion]] = await db.query('SELECT * FROM cotizaciones WHERE id = ?', [req.params.id]);
    if (!cotizacion) return res.status(404).json({ success: false, message: 'Cotización no encontrada' });
    if (cotizacion.cliente_id) return res.status(400).json({ success: false, message: 'Ya está vinculada a un cliente' });

    const [r] = await db.query(`
      INSERT INTO clientes (nombre_razon_social, tipo_cliente, email, telefono_principal, whatsapp, estado)
      VALUES (?, 'natural', ?, ?, ?, 'activo')
    `, [cotizacion.nombre_cliente, cotizacion.email_cliente, cotizacion.telefono_cliente, cotizacion.whatsapp_cliente]);

    await db.query('UPDATE cotizaciones SET cliente_id = ?, estado = "aceptada" WHERE id = ?', [r.insertId, cotizacion.id]);
    if (cotizacion.lead_id) {
      await db.query('UPDATE leads SET estado = "cerrado" WHERE id = ?', [cotizacion.lead_id]);
    }
    res.json({ success: true, data: { cliente_id: r.insertId }, message: 'Cliente creado exitosamente' });
  } catch (err) {
    console.error('Error convirtiendo a cliente:', err);
    res.status(500).json({ success: false, message: 'Error convirtiendo a cliente' });
  }
});

// ── Función reutilizable: construir el PDF de una cotización ─────────────
function construirPDF(doc, cotizacion, items) {
  // ── Logo / Encabezado de empresa ─────────────────────────────────
  // Rectángulo azul de logo (izquierda)
  doc.rect(50, 40, 120, 50).fill('#4F6EF7');
  doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
    .text('GPS TRACKER', 55, 48, { width: 110, align: 'center' });
  doc.fontSize(8).font('Helvetica')
    .text('P A N A M Á', 55, 64, { width: 110, align: 'center', characterSpacing: 2 });
  // Pequeña barra decorativa
  doc.rect(50, 90, 120, 3).fill('#1a1a2e');

  // Datos de la empresa (derecha)
  doc.fillColor('#1a1a2e').fontSize(11).font('Helvetica-Bold')
    .text('GPS Tracker Panamá', 200, 40, { width: 345, align: 'right' });
  doc.fontSize(8.5).font('Helvetica').fillColor('#555')
    .text('Zona Industrial, Costa del Este, Ciudad de Panamá', 200, 55, { width: 345, align: 'right' })
    .text('RUC: En trámite  •  Tel: 208-4205  •  Cel: 6643-1330', 200, 67, { width: 345, align: 'right' })
    .text('6216-4006  •  ventas@gpstrackerpanama.com', 200, 79, { width: 345, align: 'right' })
    .text('www.gpstrackerpanama.com', 200, 91, { width: 345, align: 'right' });

  // ── Línea divisoria ─────────────────────────────────────────────
  doc.moveTo(50, 102).lineTo(545, 102).strokeColor('#4F6EF7').lineWidth(2).stroke();

  // ── Título ESTIMACIÓN ───────────────────────────────────────────
  const yTitulo = 112;
  doc.rect(50, yTitulo, 495, 30).fill('#f0f4ff');
  doc.fillColor('#4F6EF7').fontSize(16).font('Helvetica-Bold')
    .text('ESTIMACIÓN / COTIZACIÓN', 58, yTitulo + 8, { width: 250 });

  doc.fillColor('#374151').fontSize(9).font('Helvetica')
    .text(`N°  ${String(cotizacion.numero).padStart(4, '0')}`, 400, yTitulo + 5, { width: 140, align: 'right' })
    .text(`Fecha: ${new Date(cotizacion.created_at).toLocaleDateString('es-PA')}`, 400, yTitulo + 17, { width: 140, align: 'right' });
  if (cotizacion.fecha_vencimiento) {
    doc.fillColor('#dc2626').fontSize(8.5)
      .text(`Válida hasta: ${new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-PA')}`, 400, yTitulo + 29, { width: 140, align: 'right' });
  }

  // ── Datos del cliente ───────────────────────────────────────────
  const yCliente0 = yTitulo + 40;
  doc.moveTo(50, yCliente0).lineTo(545, yCliente0).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#6b7280')
    .text('FACTURAR A:', 50, yCliente0 + 8);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e')
    .text(cotizacion.nombre_cliente, 50, yCliente0 + 20);
  doc.font('Helvetica').fontSize(9).fillColor('#555');
  let yCD = yCliente0 + 35;
  if (cotizacion.email_cliente) { doc.text(`Email: ${cotizacion.email_cliente}`, 50, yCD); yCD += 13; }
  if (cotizacion.telefono_cliente) { doc.text(`Tel: ${cotizacion.telefono_cliente}`, 50, yCD); yCD += 13; }
  if (cotizacion.whatsapp_cliente) { doc.text(`WhatsApp: ${cotizacion.whatsapp_cliente}`, 50, yCD); yCD += 13; }

  // ── Título de la sección ────────────────────────────────────────
  const yTabla = Math.max(yCD + 12, yCliente0 + 60);
  doc.moveTo(50, yTabla - 6).lineTo(545, yTabla - 6).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151')
    .text('Propuesta de Sistema de Localización GPS Vehicular', 50, yTabla);

  // ── Encabezado tabla ────────────────────────────────────────────
  const yTHead = yTabla + 18;
  doc.rect(50, yTHead, 495, 22).fill('#4F6EF7');
  doc.fillColor('white').fontSize(8.5).font('Helvetica-Bold')
    .text('DESCRIPCIÓN', 58, yTHead + 7)
    .text('CANT.', 330, yTHead + 7, { width: 40, align: 'center' })
    .text('PRECIO', 375, yTHead + 7, { width: 60, align: 'right' })
    .text('DESC.', 440, yTHead + 7, { width: 45, align: 'right' })
    .text('IMPORTE', 487, yTHead + 7, { width: 55, align: 'right' });

  // ── Filas de productos ──────────────────────────────────────────
  let yFila = yTHead + 22;
  items.forEach((item, i) => {
    const bgColor = i % 2 === 0 ? '#f9fafb' : 'white';
    const precio = parseFloat(item.precio) || 0;
    const cantidad = parseFloat(item.cantidad) || 1;
    const descuento = parseFloat(item.descuento) || 0;
    const importe = (precio * cantidad) - descuento;

    const descHeight = item.descripcion
      ? doc.heightOfString(item.descripcion, { width: 265, fontSize: 8 })
      : 0;
    const filaH = Math.max(38, 20 + descHeight + 6);

    doc.rect(50, yFila, 495, filaH).fill(bgColor);
    doc.fillColor('#1a1a2e').fontSize(9).font('Helvetica-Bold')
      .text(item.nombre, 58, yFila + 7, { width: 265 });
    if (item.descripcion) {
      doc.font('Helvetica').fontSize(8).fillColor('#6b7280')
        .text(item.descripcion, 58, yFila + 19, { width: 265 });
    }
    doc.font('Helvetica').fontSize(9).fillColor('#374151')
      .text(cantidad.toString(), 330, yFila + 7, { width: 40, align: 'center' })
      .text(`B/. ${precio.toFixed(2)}`, 375, yFila + 7, { width: 60, align: 'right' })
      .text(descuento > 0 ? `B/. ${descuento.toFixed(2)}` : '—', 440, yFila + 7, { width: 45, align: 'right' })
      .text(`B/. ${importe.toFixed(2)}`, 487, yFila + 7, { width: 55, align: 'right' });

    yFila += filaH;
  });

  // Línea cierre tabla
  doc.moveTo(50, yFila).lineTo(545, yFila).strokeColor('#4F6EF7').lineWidth(1).stroke();

  // ── Totales ─────────────────────────────────────────────────────
  yFila += 12;
  const xLabel = 390;
  const xVal = 485;

  doc.fontSize(9).font('Helvetica').fillColor('#555')
    .text('Subtotal:', xLabel, yFila, { width: 85, align: 'right' })
    .text(`B/. ${parseFloat(cotizacion.subtotal).toFixed(2)}`, xVal, yFila, { width: 60, align: 'right' });
  yFila += 15;

  if (parseFloat(cotizacion.descuento_global) > 0) {
    doc.text('Descuento:', xLabel, yFila, { width: 85, align: 'right' })
      .text(`- B/. ${parseFloat(cotizacion.descuento_global).toFixed(2)}`, xVal, yFila, { width: 60, align: 'right' });
    yFila += 15;
  }

  doc.rect(380, yFila - 3, 165, 24).fill('#4F6EF7');
  doc.fontSize(11).font('Helvetica-Bold').fillColor('white')
    .text('TOTAL:', xLabel, yFila + 4, { width: 85, align: 'right' })
    .text(`B/. ${parseFloat(cotizacion.total).toFixed(2)}`, xVal, yFila + 4, { width: 60, align: 'right' });
  yFila += 32;

  // ── Notas ────────────────────────────────────────────────────────
  if (cotizacion.notas) {
    yFila += 8;
    doc.rect(50, yFila, 495, 14).fill('#f9fafb');
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#374151').text('Notas:', 58, yFila + 3);
    yFila += 16;
    doc.font('Helvetica').fillColor('#555').text(cotizacion.notas, 50, yFila, { width: 495 });
    yFila += 20;
  }

  // ── Términos ─────────────────────────────────────────────────────
  yFila += 8;
  doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
    .text('Esta estimación es válida por 15 días a partir de su emisión. Los precios están en Balboas panameños (B/.) equivalentes a USD.', 50, yFila, { width: 495 });

  // ── Footer ───────────────────────────────────────────────────────
  const yFooter = 750;
  doc.moveTo(50, yFooter).lineTo(545, yFooter).strokeColor('#4F6EF7').lineWidth(1.5).stroke();
  doc.rect(50, yFooter + 4, 495, 30).fill('#f0f4ff');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#4F6EF7')
    .text('GPS Tracker Panamá', 58, yFooter + 10, { width: 150 });
  doc.font('Helvetica').fillColor('#555')
    .text('gpstrackerpanama.com  •  ventas@gpstrackerpanama.com', 58, yFooter + 21, { width: 250 });
  doc.fillColor('#555')
    .text('Tel: 208-4205  •  WhatsApp: 6643-1330 / 6216-4006', 300, yFooter + 10, { width: 290, align: 'right' })
    .text('Ciudad de Panamá, República de Panamá', 300, yFooter + 21, { width: 290, align: 'right' });
}

// GET /api/cotizaciones/:id/pdf — generar y descargar PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const [[cotizacion]] = await db.query('SELECT * FROM cotizaciones WHERE id = ?', [req.params.id]);
    if (!cotizacion) return res.status(404).json({ success: false, message: 'No encontrada' });

    const items = JSON.parse(cotizacion.items_json || '[]');

    // Generar PDF en memoria para evitar conflicto entre streaming y catch
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      construirPDF(doc, cotizacion, items);
      doc.end();
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cotizacion-${cotizacion.numero}.pdf"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);

    // Marcar como enviada si estaba en borrador (no bloquea la respuesta)
    db.query(
      'UPDATE cotizaciones SET estado = "enviada" WHERE id = ? AND estado = "borrador"',
      [req.params.id]
    ).catch(e => console.error('Error actualizando estado PDF:', e));
  } catch (err) {
    console.error('Error generando PDF:', err);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Error generando PDF: ' + err.message });
  }
});

// POST /api/cotizaciones/:id/email — enviar por email
router.post('/:id/email', async (req, res) => {
  try {
    const [[cotizacion]] = await db.query('SELECT * FROM cotizaciones WHERE id = ?', [req.params.id]);
    if (!cotizacion) return res.status(404).json({ success: false, message: 'No encontrada' });

    const emailDestino = req.body.email || cotizacion.email_cliente;
    if (!emailDestino) return res.status(400).json({ success: false, message: 'No hay email de destino' });

    const items = JSON.parse(cotizacion.items_json || '[]');

    // Generar PDF en memoria usando la misma función del endpoint GET
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      construirPDF(doc, cotizacion, items);
      doc.end();
    });

    // Enviar email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: `GPS Tracker Panamá <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: emailDestino,
      subject: `Estimación #${cotizacion.numero} — GPS Tracker Panamá`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#4F6EF7;padding:24px;text-align:center">
            <h2 style="color:white;margin:0">GPS Tracker Panamá</h2>
          </div>
          <div style="padding:24px;background:#f9fafb">
            <p>Estimado/a <strong>${cotizacion.nombre_cliente}</strong>,</p>
            <p>Adjunto encontrará la estimación <strong>#${cotizacion.numero}</strong> por un total de <strong>B/. ${parseFloat(cotizacion.total).toFixed(2)}</strong>.</p>
            <p>Para cualquier consulta estamos a su disposición:</p>
            <p>📞 Tel: 208-4205 | Cel: 6643-1330<br>
               💬 WhatsApp: 6643-1330 / 6216-4006<br>
               ✉️ ventas@gpstrackerpanama.com</p>
            <p>Gracias por su preferencia.</p>
            <p><strong>GPS Tracker Panamá</strong></p>
          </div>
        </div>
      `,
      attachments: [{ filename: `cotizacion-${cotizacion.numero}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
    });

    await db.query('UPDATE cotizaciones SET estado = "enviada" WHERE id = ? AND estado = "borrador"', [req.params.id]);
    res.json({ success: true, message: `Cotización enviada a ${emailDestino}` });
  } catch (err) {
    console.error('Error enviando email:', err);
    res.status(500).json({ success: false, message: 'Error enviando email: ' + err.message });
  }
});

// DELETE /api/cotizaciones/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM cotizaciones WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Cotización eliminada' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error eliminando cotización' });
  }
});

module.exports = router;
