// Servicio de generación de PDF para facturas usando PDFKit
const PDFDocument = require('pdfkit');

function formatFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function generarPDFFactura(factura, stream) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(stream);

  // Colores de marca
  const azul = '#4F6EF7';
  const gris = '#666666';
  const negro = '#1a1a1a';

  // Encabezado con fondo azul
  doc.rect(0, 0, doc.page.width, 100).fill(azul);
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('GPS Tracker Panamá', 50, 30);
  doc.fontSize(10).font('Helvetica').text('gpstrackerpanama.com  |  ventas@gpstrackerpanama.com', 50, 58);
  doc.text('WhatsApp: 6643-1330 / 6216-4006', 50, 72);

  // Número de factura (esquina derecha del encabezado)
  doc.fontSize(18).font('Helvetica-Bold').text(factura.numero_factura, 350, 35, { align: 'right', width: 200 });
  doc.fontSize(10).font('Helvetica').text('FACTURA', 350, 62, { align: 'right', width: 200 });

  doc.moveDown(3);

  // Datos del cliente
  doc.fillColor(negro).fontSize(12).font('Helvetica-Bold').text('FACTURAR A:', 50, 120);
  doc.fontSize(11).font('Helvetica').fillColor(negro);
  doc.text(factura.cliente_nombre || '', 50, 138);
  if (factura.cliente_ruc) doc.text(`RUC: ${factura.cliente_ruc}`, 50, 153);
  if (factura.cliente_direccion) doc.text(factura.cliente_direccion, 50, 168);
  if (factura.cliente_email) doc.text(factura.cliente_email, 50, 183);

  // Fecha de emisión (esquina derecha)
  doc.fontSize(11).fillColor(gris).text('Fecha de emisión:', 350, 138, { width: 200, align: 'right' });
  doc.fillColor(negro).font('Helvetica-Bold').text(formatFecha(factura.fecha_emision), 350, 153, { width: 200, align: 'right' });
  doc.fontSize(10).font('Helvetica').fillColor(gris).text(`Estado: ${factura.estado?.toUpperCase() || ''}`, 350, 170, { width: 200, align: 'right' });

  // Línea separadora
  doc.moveTo(50, 210).lineTo(doc.page.width - 50, 210).strokeColor('#dddddd').lineWidth(1).stroke();

  // Encabezado de tabla
  const tableTop = 225;
  doc.rect(50, tableTop, doc.page.width - 100, 22).fill(azul);
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold');
  doc.text('Descripción', 60, tableTop + 6);
  doc.text('Cant.', 340, tableTop + 6, { width: 50, align: 'center' });
  doc.text('Precio Unit.', 390, tableTop + 6, { width: 80, align: 'right' });
  doc.text('Total', 470, tableTop + 6, { width: 75, align: 'right' });

  // Filas de items
  let y = tableTop + 30;
  const items = Array.isArray(factura.items_json) ? factura.items_json : [];

  items.forEach((item, i) => {
    if (i % 2 === 0) {
      doc.rect(50, y - 4, doc.page.width - 100, 22).fill('#f9f9f9');
    }

    const itemTotal = (parseFloat(item.precio || 0) * parseInt(item.cantidad || 1)).toFixed(2);
    doc.fillColor(negro).fontSize(10).font('Helvetica');
    doc.text(item.descripcion || '', 60, y, { width: 275 });
    doc.text(String(item.cantidad || 1), 340, y, { width: 50, align: 'center' });
    doc.text(`B/. ${parseFloat(item.precio || 0).toFixed(2)}`, 390, y, { width: 80, align: 'right' });
    doc.text(`B/. ${itemTotal}`, 470, y, { width: 75, align: 'right' });

    y += 25;
  });

  // Línea separadora
  doc.moveTo(50, y + 5).lineTo(doc.page.width - 50, y + 5).strokeColor('#dddddd').lineWidth(1).stroke();

  // Totales
  y += 20;
  doc.fillColor(gris).fontSize(11).font('Helvetica').text('Subtotal:', 380, y, { width: 85, align: 'right' });
  doc.fillColor(negro).font('Helvetica-Bold').text(`B/. ${parseFloat(factura.subtotal).toFixed(2)}`, 465, y, { width: 80, align: 'right' });

  // Nota sobre ITBMS (Panamá no cobra ITBMS a servicios básicos de telecomunicación GPS)
  y += 18;
  doc.fillColor(gris).fontSize(9).font('Helvetica').text('ITBMS (7%): Exento', 330, y, { width: 135, align: 'right' });

  y += 18;
  doc.rect(370, y - 5, doc.page.width - 420, 28).fill(azul);
  doc.fillColor('white').fontSize(13).font('Helvetica-Bold').text('TOTAL:', 380, y, { width: 75, align: 'right' });
  doc.text(`B/. ${parseFloat(factura.total).toFixed(2)}`, 455, y, { width: 90, align: 'right' });

  // Nota al pie
  y += 55;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#dddddd').lineWidth(0.5).stroke();
  y += 12;
  doc.fillColor(gris).fontSize(9).font('Helvetica');
  doc.text('Métodos de pago: Transferencia bancaria, Yappy, Efectivo, Cheque', 50, y);
  doc.text('Este documento es una factura interna. Para factura electrónica DGI, consulte con su ejecutivo.', 50, y + 14);

  doc.end();
}

module.exports = { generarPDFFactura };
