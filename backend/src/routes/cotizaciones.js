// Rutas de cotizaciones — GPS Tracker Panamá
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Ruta al logo de la empresa
const LOGO_PATH = path.join(__dirname, '../public/logo.png');

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
    // MySQL2 puede retornar JSON columns ya parseadas o como string — manejar ambos casos
    const rawItems = cotizacion.items_json;
    if (Array.isArray(rawItems)) {
      cotizacion.items = rawItems;
    } else if (typeof rawItems === 'string') {
      try { cotizacion.items = JSON.parse(rawItems); } catch { cotizacion.items = []; }
    } else if (rawItems && typeof rawItems === 'object') {
      cotizacion.items = Array.isArray(rawItems) ? rawItems : [];
    } else {
      cotizacion.items = [];
    }
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
  const margen = 50;
  const anchoUtil = 495; // 595 - 2*50
  const tieneItems = items && items.length > 0;

  // ── ENCABEZADO: Logo real + datos empresa ────────────────────────
  const yTop = 40;

  // Logo de la empresa (imagen real) — izquierda
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, margen, yTop, { width: 130, height: 60 });
  } else {
    // Fallback si no está el logo
    doc.rect(margen, yTop, 130, 60).fill('#4F6EF7');
    doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
      .text('GPS TRACKER', margen + 5, yTop + 12, { width: 120, align: 'center' });
    doc.fontSize(8).font('Helvetica')
      .text('P A N A M A', margen + 5, yTop + 32, { width: 120, align: 'center' });
  }

  // Datos de la empresa — derecha
  doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold')
    .text('GPS Tracker Panamá', margen + 130, yTop, { width: anchoUtil - 130, align: 'right' });
  doc.fontSize(8.5).font('Helvetica').fillColor('#4b5563')
    .text('Zona Industrial, Costa del Este, Ciudad de Panamá', margen + 130, yTop + 17, { width: anchoUtil - 130, align: 'right' })
    .text('RUC: E-8-120869 DV 0', margen + 130, yTop + 29, { width: anchoUtil - 130, align: 'right' })
    .text('Cel: 6643-1330 / 6115-1500', margen + 130, yTop + 41, { width: anchoUtil - 130, align: 'right' });

  // Línea azul divisora
  const yLinea = yTop + 68;
  doc.moveTo(margen, yLinea).lineTo(margen + anchoUtil, yLinea).strokeColor('#4F6EF7').lineWidth(2.5).stroke();

  // ── SECCIÓN: Título + Número ─────────────────────────────────────
  const yTit = yLinea + 10;
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#4F6EF7')
    .text('ESTIMACIÓN', margen, yTit);

  // Caja número/fecha — derecha
  doc.rect(390, yTit - 2, 155, 52).fill('#f8faff');
  doc.rect(390, yTit - 2, 155, 52).stroke('#e0e7ff');
  doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
    .text('NUMERO', 396, yTit + 4)
    .text('EMITIDO', 396, yTit + 22);
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827')
    .text(String(cotizacion.numero).padStart(4, '0'), 396, yTit + 4, { width: 143, align: 'right' });
  const fechaEmision = cotizacion.created_at
    ? new Date(cotizacion.created_at).toLocaleDateString('es-PA')
    : new Date().toLocaleDateString('es-PA');
  doc.text(fechaEmision, 396, yTit + 22, { width: 143, align: 'right' });
  if (cotizacion.fecha_vencimiento) {
    doc.fontSize(8.5).font('Helvetica').fillColor('#dc2626')
      .text('Válido hasta: ' + new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-PA'), 396, yTit + 38, { width: 143, align: 'right' });
  }

  // ── SECCIÓN: Facturar a ──────────────────────────────────────────
  const yCliente = yTit + 62;
  doc.rect(margen, yCliente, 310, 14).fill('#f1f5f9');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b')
    .text('FACTURAR A', margen + 6, yCliente + 3);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827')
    .text(cotizacion.nombre_cliente || '', margen, yCliente + 18, { width: 310 });

  let yDatosCliente = yCliente + 36;
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563');
  if (cotizacion.email_cliente)    { doc.text('Email: ' + cotizacion.email_cliente,       margen, yDatosCliente); yDatosCliente += 13; }
  if (cotizacion.telefono_cliente) { doc.text('Tel: ' + cotizacion.telefono_cliente,       margen, yDatosCliente); yDatosCliente += 13; }
  if (cotizacion.whatsapp_cliente) { doc.text('WhatsApp: ' + cotizacion.whatsapp_cliente,  margen, yDatosCliente); yDatosCliente += 13; }

  // ── TABLA DE PRODUCTOS ───────────────────────────────────────────
  const yTablaInicio = Math.max(yDatosCliente + 14, yCliente + 70);

  // Encabezado tabla
  const thH = 24;
  doc.rect(margen, yTablaInicio, anchoUtil, thH).fill('#4F6EF7');
  doc.fillColor('white').fontSize(8.5).font('Helvetica-Bold')
    .text('PROPUESTA DE SISTEMA DE LOCALIZACION GPS', margen + 6, yTablaInicio + 8, { width: 270 })
    .text('PRECIO', margen + 290, yTablaInicio + 8, { width: 60, align: 'right' })
    .text('CANTIDAD', margen + 355, yTablaInicio + 8, { width: 50, align: 'center' })
    .text('DESCUENTO', margen + 408, yTablaInicio + 8, { width: 55, align: 'right' })
    .text('IMPORTE', margen + 466, yTablaInicio + 8, { width: 55, align: 'right' });

  let yFila = yTablaInicio + thH;

  if (!tieneItems) {
    doc.rect(margen, yFila, anchoUtil, 30).fill('#f9fafb');
    doc.fontSize(9).font('Helvetica').fillColor('#9ca3af')
      .text('Sin productos', margen + 6, yFila + 10, { width: anchoUtil - 12, align: 'center' });
    yFila += 30;
  } else {
    items.forEach((item, i) => {
      const precio    = parseFloat(item.precio)    || 0;
      const cantidad  = parseFloat(item.cantidad)  || 1;
      const descuento = parseFloat(item.descuento) || 0;
      const importe   = (precio * cantidad) - descuento;
      const nombre    = item.nombre || '';
      const descripcion = item.descripcion || '';

      const altDesc = descripcion
        ? doc.heightOfString(descripcion, { width: 265, size: 8 })
        : 0;
      const filaH = Math.max(32, 18 + altDesc + 8);

      doc.rect(margen, yFila, anchoUtil, filaH).fill(i % 2 === 0 ? '#f8faff' : 'white');

      doc.fillColor('#111827').fontSize(9.5).font('Helvetica-Bold')
        .text(nombre, margen + 6, yFila + 8, { width: 270 });
      if (descripcion) {
        doc.font('Helvetica').fontSize(8).fillColor('#6b7280')
          .text(descripcion, margen + 6, yFila + 20, { width: 270 });
      }
      doc.font('Helvetica').fontSize(9).fillColor('#374151')
        .text(`B/. ${precio.toFixed(2)}`,   margen + 290, yFila + 8, { width: 60, align: 'right' })
        .text(cantidad.toString(),            margen + 355, yFila + 8, { width: 50, align: 'center' })
        .text(descuento > 0 ? `B/. ${descuento.toFixed(2)}` : '—', margen + 408, yFila + 8, { width: 55, align: 'right' })
        .text(`B/. ${importe.toFixed(2)}`,   margen + 466, yFila + 8, { width: 55, align: 'right' });

      // Línea separadora suave entre filas
      doc.moveTo(margen, yFila + filaH).lineTo(margen + anchoUtil, yFila + filaH)
        .strokeColor('#e5e7eb').lineWidth(0.5).stroke();

      yFila += filaH;
    });
  }

  // ── TOTALES ──────────────────────────────────────────────────────
  yFila += 8;
  const xLbl = 390; const xVal2 = 540;

  doc.fontSize(9).font('Helvetica').fillColor('#4b5563')
    .text('Subtotal:', xLbl, yFila, { width: 95, align: 'right' })
    .text(`B/. ${(cotizacion.subtotal || 0).toFixed(2)}`, xLbl + 100, yFila, { align: 'right' });
  yFila += 16;

  if ((cotizacion.descuento_global || 0) > 0) {
    doc.text('Descuento:', xLbl, yFila, { width: 95, align: 'right' })
      .text(`- B/. ${(cotizacion.descuento_global || 0).toFixed(2)}`, xLbl + 100, yFila, { align: 'right' });
    yFila += 16;
  }

  doc.moveTo(xLbl, yFila - 2).lineTo(margen + anchoUtil, yFila - 2).strokeColor('#4F6EF7').lineWidth(1).stroke();
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827')
    .text('Total general', xLbl, yFila + 4, { width: 95, align: 'right' })
    .text(`B/. ${(cotizacion.total || 0).toFixed(2)}`, xLbl + 100, yFila + 4, { align: 'right' });
  yFila += 28;

  // ── NOTAS ────────────────────────────────────────────────────────
  if (cotizacion.notas) {
    yFila += 10;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#374151').text('Notas:', margen, yFila);
    yFila += 13;
    doc.font('Helvetica').fillColor('#4b5563').text(cotizacion.notas, margen, yFila, { width: anchoUtil });
    yFila += doc.heightOfString(cotizacion.notas, { width: anchoUtil }) + 8;
  }

  // ── TÉRMINOS ─────────────────────────────────────────────────────
  yFila += 8;
  doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
    .text('Esta estimación es válida por 15 días a partir de su emisión. Los precios están en Balboas panameños (B/.) equivalentes a USD.', margen, yFila, { width: anchoUtil });
  yFila += 20;

  // ── FOOTER — posición dinámica, nunca encima del contenido ───────
  const yFooter = Math.max(yFila + 10, 730);
  doc.moveTo(margen, yFooter).lineTo(margen + anchoUtil, yFooter).strokeColor('#4F6EF7').lineWidth(1.5).stroke();
  doc.rect(margen, yFooter + 3, anchoUtil, 28).fill('#f0f4ff');
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#4F6EF7')
    .text('GPS Tracker Panamá', margen + 6, yFooter + 10, { width: 180 });
    .text('gpstrackerpanama.com  •  RUC: E-8-120869 DV 0', margen + 6, yFooter + 18, { width: 260 });
  doc.fillColor('#4b5563')
    .text('Cel: 6643-1330 / 6115-1500', margen + 270, yFooter + 10, { width: 219, align: 'right' })
    .text('Ciudad de Panama, Republica de Panama', margen + 270, yFooter + 18, { width: 219, align: 'right' });
}

// GET /api/cotizaciones/:id/pdf — generar y descargar PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const [[cotizacion]] = await db.query('SELECT * FROM cotizaciones WHERE id = ?', [req.params.id]);
    if (!cotizacion) return res.status(404).json({ success: false, message: 'No encontrada' });

    // Parsear items de forma segura
    let items = [];
    try { items = JSON.parse(cotizacion.items_json || '[]'); } catch { items = []; }
    // Normalizar campos para evitar errores en construirPDF
    cotizacion.subtotal = parseFloat(cotizacion.subtotal) || 0;
    cotizacion.descuento_global = parseFloat(cotizacion.descuento_global) || 0;
    cotizacion.total = parseFloat(cotizacion.total) || 0;
    cotizacion.created_at = cotizacion.created_at || new Date();

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
