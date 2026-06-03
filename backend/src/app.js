// Servidor principal Express para CRM GPS Tracker Panamá
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware — CORS: acepta el frontend configurado o cualquier origen en Railway
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3100']
  : true; // true = cualquier origen (Railway development)

app.use(cors({
  origin: allowedOrigins,
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
});

module.exports = app;
