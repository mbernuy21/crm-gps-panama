// Migración: sistema de sub-agentes (roles con datos aislados)
// Agrega: creado_por en tablas principales + asignado_a_agente en simcards
// Ejecutar: node src/config/migrate_sub_agente.js

const db = require('./database');
const bcrypt = require('bcryptjs');

async function migrar() {
  console.log('🔧 Migrando sistema de sub-agentes...\n');

  const cambios = [
    // creado_por en cada tabla principal
    { sql: `ALTER TABLE clientes ADD COLUMN creado_por INT NULL AFTER notas_internas`, nombre: 'clientes.creado_por' },
    { sql: `ALTER TABLE dispositivos ADD COLUMN creado_por INT NULL AFTER notas`, nombre: 'dispositivos.creado_por' },
    { sql: `ALTER TABLE contratos ADD COLUMN creado_por INT NULL AFTER updated_at`, nombre: 'contratos.creado_por' },
    { sql: `ALTER TABLE pagos ADD COLUMN creado_por INT NULL AFTER notas`, nombre: 'pagos.creado_por' },
    { sql: `ALTER TABLE leads ADD COLUMN creado_por INT NULL AFTER updated_at`, nombre: 'leads.creado_por' },
    // asignado_a_agente en simcards — admin pre-asigna SIMs al sub-agente
    { sql: `ALTER TABLE simcards ADD COLUMN asignado_a_agente INT NULL AFTER estado`, nombre: 'simcards.asignado_a_agente' },
    // Índices para performance
    { sql: `ALTER TABLE clientes ADD INDEX idx_clientes_creado_por (creado_por)`, nombre: 'idx clientes.creado_por' },
    { sql: `ALTER TABLE dispositivos ADD INDEX idx_dispositivos_creado_por (creado_por)`, nombre: 'idx dispositivos.creado_por' },
    { sql: `ALTER TABLE simcards ADD INDEX idx_simcards_agente (asignado_a_agente)`, nombre: 'idx simcards.asignado_a_agente' },
  ];

  for (const { sql, nombre } of cambios) {
    try {
      await db.query(sql);
      console.log(`  ✅ ${nombre}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' ||
          err.message.includes('Duplicate column') || err.message.includes('Duplicate key')) {
        console.log(`  ⚠️  ${nombre} — ya existe, omitido`);
      } else {
        console.warn(`  ❌ ${nombre}: ${err.message.substring(0, 100)}`);
      }
    }
  }

  // Crear usuario Jean Pierre si no existe
  console.log('\n👤 Verificando usuario sub-agente Jean Pierre...');
  try {
    const [[existe]] = await db.query(
      `SELECT id FROM usuarios WHERE email = 'jeanpierre@gpstrackerpanama.com'`
    );
    if (!existe) {
      const hash = await bcrypt.hash('CRM2024jp!', 10);
      await db.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
         VALUES (?, ?, ?, 'sub_agente', 1)`,
        ['Jean Pierre', 'jeanpierre@gpstrackerpanama.com', hash]
      );
      console.log('  ✅ Usuario creado: jeanpierre@gpstrackerpanama.com / CRM2024jp!');
      console.log('  ⚠️  IMPORTANTE: Cambia la contraseña en el primer login.');
    } else {
      console.log('  ✅ Usuario Jean Pierre ya existe (id=' + existe.id + ')');
    }
  } catch (err) {
    console.warn('  ❌ Error creando usuario:', err.message);
  }

  console.log('\n✅ Migración sub-agentes completada');
  process.exit(0);
}

migrar().catch(err => { console.error(err.message); process.exit(1); });
