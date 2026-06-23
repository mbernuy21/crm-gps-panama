// Servidor principal Express para CRM GPS Tracker Panamá
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware — CORS: siempre permite crm.gpstrackerpanama.com + localhost
const origenesPermitidos = [
  'https://crm.gpstrackerpanama.com',
  'http://crm.gpstrackerpanama.com',
  'http://localhost:3000',
  'http://localhost:3100',
  'http://localhost:3001',
];
if (process.env.FRONTEND_URL) origenesPermitidos.push(process.env.FRONTEND_URL);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origen (Postman, Railway health checks, etc.)
    if (!origin) return callback(null, true);
    if (origenesPermitidos.includes(origin)) return callback(null, true);
    // En desarrollo o si no está configurado, permitir todo
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error('CORS: origen no permitido — ' + origin));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos subidos (comprobantes, PDFs)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/dispositivos', require('./routes/dispositivos'));
app.use('/api/contratos', require('./routes/contratos'));
app.use('/api/pagos', require('./routes/pagos'));
app.use('/api/facturas', require('./routes/facturas'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/alertas', require('./routes/alertas'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/plantillas', require('./routes/plantillas'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/configuracion', require('./routes/configuracion'));
app.use('/api/exportar', require('./routes/exportar'));
app.use('/api/cotizaciones', require('./routes/cotizaciones'));
app.use('/api/catalogo', require('./routes/catalogo'));
app.use('/api/tareas', require('./routes/tareas'));
app.use('/api/asistente', require('./routes/asistente'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/importar', require('./routes/importar'));
app.use('/api/auditoria', require('./routes/auditoria'));
app.use('/api/simcards', require('./routes/simcards'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CRM GPS Tracker Panamá API funcionando', timestamp: new Date() });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor CRM GPS corriendo en puerto ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);

  // Auto-ping cada 4 minutos para evitar que Railway duerma el servidor
  // Railway duerme procesos inactivos en planes gratuitos — esto los mantiene despiertos
  if (process.env.NODE_ENV === 'production') {
    const https = require('https');
    const SELF_URL = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/api/health`
      : null;

    if (SELF_URL) {
      setInterval(() => {
        https.get(SELF_URL, res => {
          console.log(`🏓 Keep-alive ping OK (${res.statusCode})`);
        }).on('error', () => {
          // Silencioso — no bloquear si falla
        });
      }, 2 * 60 * 1000); // cada 2 minutos
      console.log(`🏓 Keep-alive activo → ${SELF_URL}`);
    }
  }
});

module.exports = app;
