// Migración: ampliar campos de teléfono de VARCHAR(20) a VARCHAR(50)
// Ejecutar: node src/config/migrate_varchar_telefonos.js

const db = require('./database');

async function migrar() {
  const cambios = [
    `ALTER TABLE clientes MODIFY telefono_principal VARCHAR(50)`,
    `ALTER TABLE clientes MODIFY whatsapp VARCHAR(50)`,
    `ALTER TABLE clientes MODIFY contacto_secundario_telefono VARCHAR(50)`,
    `ALTER TABLE leads MODIFY telefono VARCHAR(50)`,
    `ALTER TABLE leads MODIFY whatsapp VARCHAR(50)`,
  ];

  console.log('🔧 Ampliando campos de teléfono a VARCHAR(50)...');
  for (const sql of cambios) {
    try {
      await db.query(sql);
      const col = sql.match(/MODIFY (\w+)/)?.[1];
      console.log(`  ✅ ${col}`);
    } catch (err) {
      console.warn(`  ⚠️  ${err.message.substring(0, 80)}`);
    }
  }
  console.log('✅ Migración completada');
  process.exit(0);
}

migrar().catch(err => { console.error(err.message); process.exit(1); });
