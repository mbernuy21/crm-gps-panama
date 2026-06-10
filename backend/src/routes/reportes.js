// Reportes automáticos y Estado de Cuenta — GPS Tracker Panamá
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware: auth } = require('../middleware/auth');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const PDFDocument = require('pdfkit');

function crearTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

// ─── ESTADO DE CUENTA ─────────────────────────────────────────────────────────

// GET /api/reportes/estado-cuenta/:clienteId/pdf
router.get('/estado-cuenta/:clienteId/pdf', auth, async (req, res) => {
  try {
    const datos = await obtenerDatosEstadoCuenta(req.params.clienteId);
    if (!datos) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="estado_cuenta_${datos.cliente.nombre_razon_social.replace(/\s+/g,'_')}.pdf"`);
    doc.pipe(res);

    const azul = '#4F6EF7';
    const gris = '#6b7280';
    const negro = '#111827';

    // Encabezado
    doc.rect(0, 0, doc.page.width, 80).fill(azul);
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold').text('GPS Tracker Panamá', 40, 20);
    doc.fontSize(11).font('Helvetica').text('Estado de Cuenta del Cliente', 40, 46);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PA')}`, 40, 62);

    doc.fillColor(negro).moveDown(3);

    // Datos del cliente
    const c = datos.cliente;
    doc.fontSize(14).font('Helvetica-Bold').fillColor(azul).text('Información del Cliente', 40, 100);
    doc.moveTo(40, 116).lineTo(555, 116).strokeColor(azul).lineWidth(1).stroke();

    const col1 = 40, col2 = 300;
    let y = 125;
    const campo = (label, valor, x, yPos) => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor(gris).text(label, x, yPos);
      doc.fontSize(10).font('Helvetica').fillColor(negro).text(valor || '—', x, yPos + 12);
    };

    campo('Nombre / Razón Social', c.nombre_razon_social, col1, y);
    campo('RUC', c.ruc, col2, y);
    y += 35;
    campo('Teléfono', c.telefono_principal, col1, y);
    campo('WhatsApp', c.whatsapp, col2, y);
    y += 35;
    campo('Email', c.email, col1, y);
    campo('Provincia', c.provincia, col2, y);
    y += 35;
    campo('Estado', c.estado?.toUpperCase(), col1, y);

    // Resumen financiero
    y += 50;
    doc.fontSize(14).font('Helvetica-Bold').fillColor(azul).text('Resumen Financiero', 40, y);
    doc.moveTo(40, y + 16).lineTo(555, y + 16).strokeColor(azul).lineWidth(1).stroke();
    y += 25;

    const contrato = datos.contrato;
    if (contrato) {
      // Caja de resumen
      doc.rect(40, y, 515, 70).fill('#f0f4ff').stroke('#dbeafe');
      doc.fontSize(11).font('Helvetica-Bold').fillColor(negro);
      doc.text(`Frecuencia de pago: ${contrato.frecuencia?.toUpperCase()}`, 55, y + 10);
      doc.text(`Monto del contrato: B/. ${parseFloat(contrato.monto_total).toFixed(2)}`, 55, y + 28);
      doc.text(`Próximo vencimiento: ${contrato.fecha_proximo_pago ? new Date(contrato.fecha_proximo_pago).toLocaleDateString('es-PA') : '—'}`, 300, y + 10);
      const diasMora = contrato.fecha_proximo_pago
        ? Math.max(0, Math.floor((new Date() - new Date(contrato.fecha_proximo_pago)) / 86400000))
        : 0;
      doc.fillColor(diasMora > 0 ? '#dc2626' : '#16a34a')
        .text(diasMora > 0 ? `⚠ ${diasMora} días de mora` : '✓ Al día', 300, y + 28);
      y += 85;
    }

    // Dispositivos GPS
    if (datos.dispositivos.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor(azul).text('Dispositivos GPS Asignados', 40, y);
      doc.moveTo(40, y + 16).lineTo(555, y + 16).strokeColor(azul).lineWidth(1).stroke();
      y += 25;

      // Cabecera tabla
      doc.rect(40, y, 515, 20).fill('#f3f4f6');
      doc.fontSize(9).font('Helvetica-Bold').fillColor(negro);
      doc.text('Serial GPS', 50, y + 6);
      doc.text('Placa', 170, y + 6);
      doc.text('Modelo', 250, y + 6);
      doc.text('Tipo', 370, y + 6);
      doc.text('Modalidad', 430, y + 6);
      doc.text('Desde', 490, y + 6);
      y += 22;

      datos.dispositivos.forEach((d, i) => {
        if (i % 2 === 0) doc.rect(40, y, 515, 18).fill('#fafafa');
        doc.fontSize(8).font('Helvetica').fillColor(negro);
        doc.text(d.serial_gps || '—', 50, y + 5);
        doc.text(d.placa_vehiculo || '—', 170, y + 5);
        doc.text(d.modelo_auto || '—', 250, y + 5);
        doc.text(d.tipo_producto || '—', 370, y + 5);
        doc.text(d.modalidad || '—', 430, y + 5);
        doc.text(d.fecha_asignacion ? new Date(d.fecha_asignacion).toLocaleDateString('es-PA') : '—', 490, y + 5);
        y += 20;
      });
      y += 10;
    }

    // Historial de pagos
    if (datos.pagos.length > 0) {
      if (y > 650) { doc.addPage(); y = 40; }
      doc.fontSize(14).font('Helvetica-Bold').fillColor(azul).text('Historial de Pagos', 40, y);
      doc.moveTo(40, y + 16).lineTo(555, y + 16).strokeColor(azul).lineWidth(1).stroke();
      y += 25;

      doc.rect(40, y, 515, 20).fill('#f3f4f6');
      doc.fontSize(9).font('Helvetica-Bold').fillColor(negro);
      doc.text('Fecha', 50, y + 6);
      doc.text('Monto', 160, y + 6);
      doc.text('Método', 250, y + 6);
      doc.text('Notas', 370, y + 6);
      y += 22;

      let totalPagado = 0;
      datos.pagos.forEach((p, i) => {
        if (y > 720) { doc.addPage(); y = 40; }
        if (i % 2 === 0) doc.rect(40, y, 515, 18).fill('#fafafa');
        doc.fontSize(8).font('Helvetica').fillColor(negro);
        doc.text(new Date(p.fecha_pago).toLocaleDateString('es-PA'), 50, y + 5);
        doc.text(`B/. ${parseFloat(p.monto).toFixed(2)}`, 160, y + 5);
        doc.text(p.metodo || '—', 250, y + 5);
        doc.text(p.notas ? p.notas.substring(0, 40) : '—', 370, y + 5);
        totalPagado += parseFloat(p.monto);
        y += 20;
      });

      y += 5;
      doc.rect(40, y, 515, 24).fill('#f0f4ff');
      doc.fontSize(10).font('Helvetica-Bold').fillColor(azul)
        .text(`Total pagado: B/. ${totalPagado.toFixed(2)}`, 50, y + 7);
    }

    // Pie de página
    doc.fontSize(8).font('Helvetica').fillColor(gris)
      .text('GPS Tracker Panamá — crm.gpstrackerpanama.com — WhatsApp: 6643-1330', 40, doc.page.height - 40, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error generando PDF' });
  }
});

// GET /api/reportes/estado-cuenta/:clienteId/excel
router.get('/estado-cuenta/:clienteId/excel', auth, async (req, res) => {
  try {
    const datos = await obtenerDatosEstadoCuenta(req.params.clienteId);
    if (!datos) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });

    const wb = XLSX.utils.book_new();
    const c = datos.cliente;

    // Hoja 1: Resumen del cliente
    const resumen = [
      ['GPS Tracker Panamá — Estado de Cuenta'],
      ['Generado:', new Date().toLocaleDateString('es-PA')],
      [],
      ['DATOS DEL CLIENTE'],
      ['Nombre/Razón Social:', c.nombre_razon_social],
      ['RUC:', c.ruc || '—'],
      ['Teléfono:', c.telefono_principal || '—'],
      ['WhatsApp:', c.whatsapp || '—'],
      ['Email:', c.email || '—'],
      ['Provincia:', c.provincia || '—'],
      ['Estado:', c.estado || '—'],
    ];
    if (datos.contrato) {
      resumen.push([], ['CONTRATO']);
      resumen.push(['Frecuencia:', datos.contrato.frecuencia]);
      resumen.push(['Monto:', `B/. ${parseFloat(datos.contrato.monto_total).toFixed(2)}`]);
      resumen.push(['Próximo vencimiento:', datos.contrato.fecha_proximo_pago ? new Date(datos.contrato.fecha_proximo_pago).toLocaleDateString('es-PA') : '—']);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

    // Hoja 2: Dispositivos GPS
    const dispRows = [['Serial GPS', 'Placa', 'Modelo', 'Tipo', 'Modalidad', 'Fecha Asignación', 'Estado']];
    datos.dispositivos.forEach(d => {
      dispRows.push([d.serial_gps, d.placa_vehiculo || '—', d.modelo_auto || '—',
        d.tipo_producto, d.modalidad, d.fecha_asignacion ? new Date(d.fecha_asignacion).toLocaleDateString('es-PA') : '—', d.estado]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dispRows), 'Dispositivos GPS');

    // Hoja 3: Historial de pagos
    const pagoRows = [['Fecha', 'Monto', 'Método', 'Notas']];
    let totalPagado = 0;
    datos.pagos.forEach(p => {
      pagoRows.push([new Date(p.fecha_pago).toLocaleDateString('es-PA'),
        parseFloat(p.monto).toFixed(2), p.metodo || '—', p.notas || '—']);
      totalPagado += parseFloat(p.monto);
    });
    pagoRows.push([], ['TOTAL PAGADO', totalPagado.toFixed(2)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pagoRows), 'Historial Pagos');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `estado_cuenta_${c.nombre_razon_social.replace(/\s+/g,'_')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error generando Excel' });
  }
});

// GET /api/reportes/estado-cuenta/:clienteId — datos JSON para vista previa
router.get('/estado-cuenta/:clienteId', auth, async (req, res) => {
  try {
    const datos = await obtenerDatosEstadoCuenta(req.params.clienteId);
    if (!datos) return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    res.json({ success: true, data: datos });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error' });
  }
});

async function obtenerDatosEstadoCuenta(clienteId) {
  const [[cliente]] = await db.query('SELECT * FROM clientes WHERE id=?', [clienteId]);
  if (!cliente) return null;

  const [[contrato]] = await db.query('SELECT * FROM contratos WHERE cliente_id=? LIMIT 1', [clienteId]);
  const [dispositivos] = await db.query('SELECT * FROM dispositivos WHERE cliente_id=? ORDER BY fecha_asignacion DESC', [clienteId]);
  const [pagos] = await db.query('SELECT * FROM pagos WHERE cliente_id=? ORDER BY fecha_pago DESC', [clienteId]);

  return { cliente, contrato: contrato || null, dispositivos, pagos };
}

// ─── REPORTE SEMANAL (CRON) ────────────────────────────────────────────────────

// POST /api/reportes/semanal — ejecutar manualmente también
router.post('/semanal', auth, async (req, res) => {
  try {
    await generarYEnviarReporteSemanal();
    res.json({ success: true, message: 'Reporte semanal enviado a ' + (process.env.EMAIL_BACKUP || process.env.EMAIL_FROM || 'tu correo') });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error generando reporte: ' + err.message });
  }
});

// GET /api/reportes/diagnostico-email — verifica si el SMTP está bien configurado
router.get('/diagnostico-email', auth, async (req, res) => {
  const faltantes = [];
  if (!process.env.SMTP_HOST) faltantes.push('SMTP_HOST');
  if (!process.env.SMTP_USER) faltantes.push('SMTP_USER');
  if (!process.env.SMTP_PASS) faltantes.push('SMTP_PASS');
  const destino = process.env.EMAIL_BACKUP || process.env.EMAIL_FROM || null;
  if (!destino) faltantes.push('EMAIL_BACKUP o EMAIL_FROM');

  if (faltantes.length) {
    return res.json({
      success: false,
      configurado: false,
      message: `Faltan variables en Railway: ${faltantes.join(', ')}. Por eso no llega el correo semanal.`,
      faltantes
    });
  }

  // Intentar conectar al servidor SMTP
  try {
    const transporter = crearTransporter();
    await transporter.verify();
    res.json({ success: true, configurado: true, message: `✅ Email configurado correctamente. Los reportes llegarán a: ${destino}` });
  } catch (err) {
    res.json({ success: false, configurado: false, message: `❌ Las credenciales SMTP no funcionan: ${err.message}. Revisa SMTP_USER/SMTP_PASS en Railway.` });
  }
});

async function generarYEnviarReporteSemanal() {
  const fechaStr = new Date().toLocaleDateString('es-PA');
  const wb = XLSX.utils.book_new();

  // Hoja 1: Clientes
  const [clientes] = await db.query(`
    SELECT c.id, c.nombre_razon_social, c.tipo_cliente, c.ruc, c.telefono_principal,
      c.whatsapp, c.email, c.provincia, c.estado,
      ct.frecuencia, ct.monto_total, ct.fecha_proximo_pago, ct.estado AS estado_contrato,
      (SELECT COUNT(*) FROM dispositivos WHERE cliente_id=c.id AND estado='asignado') AS gps_activos
    FROM clientes c
    LEFT JOIN contratos ct ON ct.cliente_id=c.id
    ORDER BY c.nombre_razon_social
  `);
  const clientesData = [
    ['ID', 'Nombre/Razón Social', 'Tipo', 'RUC', 'Teléfono', 'WhatsApp', 'Email',
     'Provincia', 'Estado', 'Frecuencia Pago', 'Monto Contrato', 'Próx. Vencimiento',
     'Estado Contrato', 'GPS Activos'],
    ...clientes.map(c => [
      c.id, c.nombre_razon_social, c.tipo_cliente, c.ruc || '', c.telefono_principal || '',
      c.whatsapp || '', c.email || '', c.provincia || '', c.estado,
      c.frecuencia || '', c.monto_total ? `B/. ${parseFloat(c.monto_total).toFixed(2)}` : '',
      c.fecha_proximo_pago ? new Date(c.fecha_proximo_pago).toLocaleDateString('es-PA') : '',
      c.estado_contrato || '', c.gps_activos
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clientesData), 'Clientes');

  // Hoja 2: Pagos del mes actual
  const [pagos] = await db.query(`
    SELECT p.id, c.nombre_razon_social AS cliente, p.fecha_pago, p.monto, p.metodo,
      p.notas, p.created_at
    FROM pagos p
    JOIN clientes c ON c.id=p.cliente_id
    WHERE YEAR(p.fecha_pago)=YEAR(CURDATE())
    ORDER BY p.fecha_pago DESC
  `);
  const pagosData = [
    ['ID', 'Cliente', 'Fecha Pago', 'Monto', 'Método', 'Notas', 'Registrado'],
    ...pagos.map(p => [
      p.id, p.cliente, new Date(p.fecha_pago).toLocaleDateString('es-PA'),
      parseFloat(p.monto).toFixed(2), p.metodo, p.notas || '',
      new Date(p.created_at).toLocaleDateString('es-PA')
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pagosData), 'Pagos Año Actual');

  // Hoja 3: Dispositivos GPS
  const [dispositivos] = await db.query(`
    SELECT d.*, c.nombre_razon_social AS cliente
    FROM dispositivos d
    LEFT JOIN clientes c ON c.id=d.cliente_id
    ORDER BY d.estado, d.serial_gps
  `);
  const gpsData = [
    ['ID', 'Serial GPS', 'SIM Card', 'Placa', 'Modelo', 'Tipo', 'Modalidad',
     'Estado', 'Cliente', 'Fecha Asignación', 'Valor USD'],
    ...dispositivos.map(d => [
      d.id, d.serial_gps, d.simcard || '', d.placa_vehiculo || '', d.modelo_auto || '',
      d.tipo_producto, d.modalidad, d.estado, d.cliente || 'Sin asignar',
      d.fecha_asignacion ? new Date(d.fecha_asignacion).toLocaleDateString('es-PA') : '',
      d.valor_equipo_usd
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gpsData), 'Dispositivos GPS');

  // Hoja 4: Resumen ejecutivo
  const [[stats]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM clientes WHERE estado='activo') AS activos,
      (SELECT COUNT(*) FROM clientes WHERE estado='moroso') AS morosos,
      (SELECT COUNT(*) FROM clientes WHERE estado='suspendido') AS suspendidos,
      (SELECT COALESCE(SUM(monto),0) FROM pagos WHERE MONTH(fecha_pago)=MONTH(CURDATE()) AND YEAR(fecha_pago)=YEAR(CURDATE())) AS cobros_mes,
      (SELECT COUNT(*) FROM dispositivos WHERE estado='asignado') AS gps_asignados,
      (SELECT COUNT(*) FROM dispositivos WHERE estado='disponible') AS gps_disponibles,
      (SELECT COUNT(*) FROM leads WHERE estado='nuevo') AS leads_nuevos
  `);
  const resumenData = [
    ['GPS Tracker Panamá — Reporte Semanal'],
    ['Fecha:', fechaStr],
    [],
    ['CLIENTES', ''],
    ['Activos:', stats.activos],
    ['Morosos:', stats.morosos],
    ['Suspendidos:', stats.suspendidos],
    [],
    ['FINANZAS', ''],
    ['Cobros este mes:', `B/. ${parseFloat(stats.cobros_mes).toFixed(2)}`],
    [],
    ['DISPOSITIVOS GPS', ''],
    ['Asignados:', stats.gps_asignados],
    ['Disponibles:', stats.gps_disponibles],
    [],
    ['LEADS', ''],
    ['Nuevos:', stats.leads_nuevos],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), 'Resumen');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `CRM_GPS_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;

  const transporter = crearTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'ventas@gpstrackerpanama.com',
    to: process.env.EMAIL_BACKUP || 'fiverr.marco21@gmail.com',
    subject: `📊 GPS Tracker CRM — Reporte Semanal ${fechaStr}`,
    text: `Adjunto encontrará el reporte semanal del CRM GPS Tracker Panamá.\n\nResumen:\n• Clientes activos: ${stats.activos}\n• Morosos: ${stats.morosos}\n• Cobros este mes: B/. ${parseFloat(stats.cobros_mes).toFixed(2)}\n• GPS asignados: ${stats.gps_asignados}\n\nEste reporte se genera automáticamente todos los domingos al mediodía.\n\nGPS Tracker Panamá`,
    attachments: [{ filename, content: buffer }]
  });
}

// ─── CRON JOB — Domingos a las 12:00 PM (hora Panamá = UTC-5 → 17:00 UTC)
cron.schedule('0 17 * * 0', async () => {
  console.log('📊 Ejecutando reporte semanal automático...');
  try {
    await generarYEnviarReporteSemanal();
    console.log('✅ Reporte semanal enviado exitosamente');
  } catch (err) {
    console.error('❌ Error en reporte semanal:', err.message);
  }
}, { timezone: 'America/Panama' });

// ─── CRON JOB — Diario a las 8 AM para alertas de tareas vencidas
cron.schedule('0 13 * * *', async () => {
  console.log('⏰ Verificando alertas de tareas...');
  try {
    const { enviarAlertasTareas } = require('./tareas');
    await enviarAlertasTareas();
  } catch (err) {
    console.error('❌ Error en alertas de tareas:', err.message);
  }
}, { timezone: 'America/Panama' });

module.exports = router;
