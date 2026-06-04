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

// GET /api/cotizaciones/:id/pdf — generar y descargar PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const [[cotizacion]] = await db.query('SELECT * FROM cotizaciones WHERE id = ?', [req.params.id]);
    if (!cotizacion) return res.status(404).json({ success: false, message: 'No encontrada' });

    const items = JSON.parse(cotizacion.items_json || '[]');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cotizacion-${cotizacion.numero}.pdf"`);
    doc.pipe(res);

    // ── Encabezado ──────────────────────────────────────────
    // Bloque empresa (derecha)
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text('GPS Tracker Panamá', 350, 50, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor('#555')
      .text('Zona Industrial, Costa del Este, PA', 350, 70, { align: 'right' })
      .text('Marco Bernuy  •  Tel: 208-4205  •  Cel: 6643-1330', 350, 82, { align: 'right' })
      .text('ventas@gpstrackerpanama.com', 350, 94, { align: 'right' });

    // Título cotización
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#4F6EF7')
      .text('ESTIMACIÓN', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#555')
      .text(`# ${cotizacion.numero}`, 50, 76)
      .text(`Fecha: ${new Date(cotizacion.created_at).toLocaleDateString('es-PA')}`, 50, 90);
    if (cotizacion.fecha_vencimiento) {
      doc.text(`Válida hasta: ${new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-PA')}`, 50, 104);
    }

    // Línea separadora
    doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // ── Datos del cliente ───────────────────────────────────
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151')
      .text('FACTURAR A:', 50, 140);
    doc.font('Helvetica').fillColor('#1a1a2e').fontSize(12).font('Helvetica-Bold')
      .text(cotizacion.nombre_cliente, 50, 154);
    doc.font('Helvetica').fontSize(9).fillColor('#555');
    let yCliente = 170;
    if (cotizacion.email_cliente) { doc.text(cotizacion.email_cliente, 50, yCliente); yCliente += 13; }
    if (cotizacion.telefono_cliente) { doc.text(cotizacion.telefono_cliente, 50, yCliente); yCliente += 13; }

    // ── Título sección ──────────────────────────────────────
    const yTabla = Math.max(yCliente + 15, 210);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#374151')
      .text('Propuesta de Sistema de Localización GPS', 50, yTabla);

    // ── Encabezado tabla ────────────────────────────────────
    const yTHead = yTabla + 20;
    doc.rect(50, yTHead, 495, 22).fill('#4F6EF7');
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
      .text('DESCRIPCIÓN', 58, yTHead + 7)
      .text('CANT.', 340, yTHead + 7, { width: 40, align: 'center' })
      .text('PRECIO', 390, yTHead + 7, { width: 55, align: 'right' })
      .text('DESC.', 450, yTHead + 7, { width: 40, align: 'right' })
      .text('IMPORTE', 490, yTHead + 7, { width: 55, align: 'right' });

    // ── Filas de productos ──────────────────────────────────
    let yFila = yTHead + 22;
    items.forEach((item, i) => {
      const bgColor = i % 2 === 0 ? '#f9fafb' : 'white';
      const precio = parseFloat(item.precio) || 0;
      const cantidad = parseFloat(item.cantidad) || 1;
      const descuento = parseFloat(item.descuento) || 0;
      const importe = (precio * cantidad) - descuento;

      // Calcular altura de fila según descripción
      const descHeight = item.descripcion
        ? doc.heightOfString(item.descripcion, { width: 270, fontSize: 8 })
        : 0;
      const filaH = Math.max(40, 22 + descHeight + 6);

      doc.rect(50, yFila, 495, filaH).fill(bgColor);
      doc.fillColor('#1a1a2e').fontSize(9).font('Helvetica-Bold')
        .text(item.nombre, 58, yFila + 7, { width: 275 });
      if (item.descripcion) {
        doc.font('Helvetica').fontSize(8).fillColor('#6b7280')
          .text(item.descripcion, 58, yFila + 19, { width: 275 });
      }
      doc.font('Helvetica').fontSize(9).fillColor('#374151')
        .text(cantidad.toString(), 340, yFila + 7, { width: 40, align: 'center' })
        .text(`B/. ${precio.toFixed(2)}`, 390, yFila + 7, { width: 55, align: 'right' })
        .text(descuento > 0 ? `B/. ${descuento.toFixed(2)}` : '—', 450, yFila + 7, { width: 40, align: 'right' })
        .text(`B/. ${importe.toFixed(2)}`, 490, yFila + 7, { width: 55, align: 'right' });

      yFila += filaH;
    });

    // Línea cierre tabla
    doc.moveTo(50, yFila).lineTo(545, yFila).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

    // ── Totales ─────────────────────────────────────────────
    yFila += 10;
    const xLabel = 400;
    const xVal = 490;

    doc.fontSize(9).font('Helvetica').fillColor('#555')
      .text('Subtotal:', xLabel, yFila, { width: 80, align: 'right' })
      .text(`B/. ${parseFloat(cotizacion.subtotal).toFixed(2)}`, xVal, yFila, { width: 55, align: 'right' });
    yFila += 15;

    if (parseFloat(cotizacion.descuento_global) > 0) {
      doc.text('Descuento:', xLabel, yFila, { width: 80, align: 'right' })
        .text(`- B/. ${parseFloat(cotizacion.descuento_global).toFixed(2)}`, xVal, yFila, { width: 55, align: 'right' });
      yFila += 15;
    }

    doc.rect(390, yFila - 2, 155, 22).fill('#f3f4f6');
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e')
      .text('TOTAL:', xLabel, yFila + 4, { width: 80, align: 'right' })
      .text(`B/. ${parseFloat(cotizacion.total).toFixed(2)}`, xVal, yFila + 4, { width: 55, align: 'right' });
    yFila += 30;

    // ── Notas ───────────────────────────────────────────────
    if (cotizacion.notas) {
      yFila += 10;
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('Notas:', 50, yFila);
      doc.font('Helvetica').fillColor('#555').text(cotizacion.notas, 50, yFila + 13, { width: 495 });
      yFila += 30;
    }

    // ── Footer ──────────────────────────────────────────────
    doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
      .text('GPS Tracker Panamá  •  gpstrackerpanama.com  •  WhatsApp: 6643-1330 / 6216-4006', 50, 780, { align: 'center', width: 495 });

    doc.end();

    // Marcar como enviada si estaba en borrador
    await db.query(
      'UPDATE cotizaciones SET estado = "enviada" WHERE id = ? AND estado = "borrador"',
      [req.params.id]
    );
  } catch (err) {
    console.error('Error generando PDF:', err);
    res.status(500).json({ success: false, message: 'Error generando PDF' });
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

    // Generar PDF en memoria
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Mismo diseño que el endpoint PDF
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a2e')
        .text('GPS Tracker Panamá', 350, 50, { align: 'right' });
      doc.fontSize(9).font('Helvetica').fillColor('#555')
        .text('Zona Industrial, Costa del Este, PA', 350, 70, { align: 'right' })
        .text('Marco Bernuy  •  Tel: 208-4205  •  Cel: 6643-1330', 350, 82, { align: 'right' })
        .text('ventas@gpstrackerpanama.com', 350, 94, { align: 'right' });
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#4F6EF7').text('ESTIMACIÓN', 50, 50);
      doc.fontSize(10).font('Helvetica').fillColor('#555')
        .text(`# ${cotizacion.numero}`, 50, 76)
        .text(`Fecha: ${new Date(cotizacion.created_at).toLocaleDateString('es-PA')}`, 50, 90);
      doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('FACTURAR A:', 50, 140);
      doc.font('Helvetica').fillColor('#1a1a2e').fontSize(12).font('Helvetica-Bold').text(cotizacion.nombre_cliente, 50, 154);

      const yTHead = 220;
      doc.rect(50, yTHead, 495, 22).fill('#4F6EF7');
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
        .text('DESCRIPCIÓN', 58, yTHead + 7)
        .text('CANT.', 340, yTHead + 7, { width: 40, align: 'center' })
        .text('PRECIO', 390, yTHead + 7, { width: 55, align: 'right' })
        .text('IMPORTE', 490, yTHead + 7, { width: 55, align: 'right' });

      let yFila = yTHead + 22;
      items.forEach((item, i) => {
        const bgColor = i % 2 === 0 ? '#f9fafb' : 'white';
        const precio = parseFloat(item.precio) || 0;
        const cantidad = parseFloat(item.cantidad) || 1;
        const descuento = parseFloat(item.descuento) || 0;
        const importe = (precio * cantidad) - descuento;
        const filaH = item.descripcion ? Math.max(40, 22 + doc.heightOfString(item.descripcion, { width: 270 }) + 6) : 35;
        doc.rect(50, yFila, 495, filaH).fill(bgColor);
        doc.fillColor('#1a1a2e').fontSize(9).font('Helvetica-Bold').text(item.nombre, 58, yFila + 7, { width: 275 });
        if (item.descripcion) doc.font('Helvetica').fontSize(8).fillColor('#6b7280').text(item.descripcion, 58, yFila + 19, { width: 275 });
        doc.font('Helvetica').fontSize(9).fillColor('#374151')
          .text(cantidad.toString(), 340, yFila + 7, { width: 40, align: 'center' })
          .text(`B/. ${precio.toFixed(2)}`, 390, yFila + 7, { width: 55, align: 'right' })
          .text(`B/. ${importe.toFixed(2)}`, 490, yFila + 7, { width: 55, align: 'right' });
        yFila += filaH;
      });

      doc.moveTo(50, yFila).lineTo(545, yFila).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      yFila += 15;
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a2e')
        .text('TOTAL:', 400, yFila, { width: 80, align: 'right' })
        .text(`B/. ${parseFloat(cotizacion.total).toFixed(2)}`, 490, yFila, { width: 55, align: 'right' });
      doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
        .text('GPS Tracker Panamá  •  gpstrackerpanama.com  •  WhatsApp: 6643-1330', 50, 780, { align: 'center', width: 495 });
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
