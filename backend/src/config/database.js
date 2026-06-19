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
  connectTimeout: 30000,      // 30 segundos de timeout
  timezone: '-05:00',          // Zona horaria Panamá (UTC-5, sin cambio de horario)
  charset: 'utf8mb4'
});

// Verificar conexión al iniciar con reintentos automáticos (no-bloqueante)
async function verificarConexion(intentos = 10, espera = 5000) {
  for (let i = 1; i <= intentos; i++) {
    try {
      const conn = await pool.getConnection();
      console.log('✅ Conexión a MySQL establecida');
      conn.release();
      return;
    } catch (err) {
      console.error(`❌ Intento ${i}/${intentos} — Error: ${err.message}`);
      if (i < intentos) {
        console.log(`⏳ Reintentando en ${espera / 1000}s...`);
        await new Promise(r => setTimeout(r, espera));
      } else {
        console.warn('⚠️ No se pudo conectar a MySQL. El servidor iniciará en modo degradado.');
        // No hacemos process.exit(1) — la app continúa y reintenta conectar
        return;
      }
    }
  }
}

verificarConexion().catch(err => {
  console.error('Error inesperado en verificación de BD:', err.message);
  // Continuamos de todas formas
});

module.exports = pool;
