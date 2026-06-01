// Servicio de envío de alertas por email
const nodemailer = require('nodemailer');

function crearTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Enviar email de alerta según tipo (recordatorio/mora/suspension/reactivacion)
async function enviarEmailAlerta(cliente, tipo) {
  const transporter = crearTransporter();

  const asuntos = {
    recordatorio: 'Recordatorio de pago — GPS Tracker Panamá',
    mora: 'Aviso de mora — GPS Tracker Panamá',
    suspension: 'Aviso de suspensión de servicio — GPS Tracker Panamá',
    reactivacion: 'Servicio reactivado — GPS Tracker Panamá'
  };

  const htmlPorTipo = {
    recordatorio: `
      <p>Estimado/a <strong>${cliente.nombre_razon_social}</strong>,</p>
      <p>Le recordamos cordialmente que su pago de <strong>B/. ${cliente.monto_total}</strong> con GPS Tracker Panamá
      vence próximamente.</p>
      <p>Para realizar su pago o consultas, comuníquese con nosotros:</p>
      <ul>
        <li>WhatsApp: <a href="https://wa.me/50766431330">6643-1330</a></li>
        <li>Email: ventas@gpstrackerpanama.com</li>
      </ul>
      <p>Gracias por su preferencia.</p>
    `,
    mora: `
      <p>Estimado/a <strong>${cliente.nombre_razon_social}</strong>,</p>
      <p>Le informamos que su cuenta presenta un saldo pendiente de <strong>B/. ${cliente.monto_total}</strong>
      con <strong>${cliente.dias_mora} días de mora</strong>.</p>
      <p>Le solicitamos regularizar su situación para evitar la suspensión del servicio.</p>
      <p>Contacto: <a href="https://wa.me/50766431330">6643-1330</a> | ventas@gpstrackerpanama.com</p>
    `,
    suspension: `
      <p>Estimado/a <strong>${cliente.nombre_razon_social}</strong>,</p>
      <p>Lamentamos informarle que por falta de pago de <strong>B/. ${cliente.monto_total}</strong>,
      hemos procedido a la <strong>suspensión temporal</strong> de su servicio GPS.</p>
      <p>Para reactivar el servicio, realice su pago y comuníquese con nosotros.</p>
    `,
    reactivacion: `
      <p>Estimado/a <strong>${cliente.nombre_razon_social}</strong>,</p>
      <p>Nos complace informarle que su servicio GPS ha sido <strong>reactivado exitosamente</strong>.</p>
      <p>Gracias por regularizar su situación y por su preferencia con GPS Tracker Panamá.</p>
    `
  };

  const destinatario = cliente.email;
  const emailAlertasAdmin = process.env.EMAIL_FROM || 'ventas@gpstrackerpanama.com';

  const mailOptions = {
    from: `"GPS Tracker Panamá" <${emailAlertasAdmin}>`,
    to: destinatario || emailAlertasAdmin,
    subject: asuntos[tipo] || 'Notificación — GPS Tracker Panamá',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4F6EF7; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">GPS Tracker Panamá</h2>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          ${htmlPorTipo[tipo] || '<p>Notificación del sistema.</p>'}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #888; font-size: 12px;">
            GPS Tracker Panamá | gpstrackerpanama.com<br>
            WhatsApp: 6643-1330 / 6216-4006
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

// Enviar resumen de alertas del día al equipo
async function enviarResumenDiario(resumen) {
  const transporter = crearTransporter();
  const emailAdmin = process.env.EMAIL_FROM || 'ventas@gpstrackerpanama.com';

  const mailOptions = {
    from: `"CRM GPS Tracker" <${emailAdmin}>`,
    to: emailAdmin,
    subject: `Resumen de alertas del día — ${new Date().toLocaleDateString('es-PA')}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #4F6EF7;">Alertas del día</h2>
        <table style="width:100%; border-collapse:collapse;">
          <tr style="background:#4F6EF7; color:white;">
            <th style="padding:8px; text-align:left;">Tipo</th>
            <th style="padding:8px; text-align:center;">Cantidad</th>
          </tr>
          <tr><td style="padding:8px;">Próximos a vencer</td><td style="text-align:center;">${resumen.proximos}</td></tr>
          <tr style="background:#f5f5f5;"><td style="padding:8px;">Morosos</td><td style="text-align:center;">${resumen.morosos}</td></tr>
          <tr><td style="padding:8px;">Suspendidos</td><td style="text-align:center;">${resumen.suspendidos}</td></tr>
        </table>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { enviarEmailAlerta, enviarResumenDiario };
