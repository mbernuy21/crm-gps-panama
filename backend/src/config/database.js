// Conexión a MySQL usando pool de conexiones
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'crm_gps_panama',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '-05:00', // Zona horaria Panamá (UTC-5, sin cambio de horario)
  charset: 'utf8mb4'
});

// Verificar conexión al iniciar
async function verificarConexion() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conexión a MySQL establecida');
    conn.release();
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  }
}

verificarConexion();

module.exports = pool;
