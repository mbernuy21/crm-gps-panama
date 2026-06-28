// Migración: crear tabla ventas_cobros para cobros únicos (no recurrentes)
// Ejecutar: node src/config/migrate_ventas_cobros.js

const db = require('./database');

async function migrar() {
  console.log('🔧 Creando tabla ventas_cobros...');
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ventas_cobros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cliente_id INT NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        descripcion VARCHAR(255),
        cantidad DECIMAL(8,2) NOT NULL DEFAULT 1,
        precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
        total DECIMAL(10,2) NOT NULL DEFAULT 0,
        metodo ENUM('transferencia','yappy','efectivo','cheque') NOT NULL DEFAULT 'efectivo',
        fecha DATE NOT NULL,
        link_comprobante VARCHAR(500) NULL,
        notas TEXT NULL,
        registrado_por INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Tabla ventas_cobros creada correctamente');
    process.exit(0);
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('ℹ️  La tabla ventas_cobros ya existe — OK');
      process.exit(0);
    }
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

migrar();
