// Script para agregar índices que mejoran el rendimiento de las queries
// Ejecutar una sola vez en Railway: node src/config/migrate_indices.js

const db = require('./database');

const indices = [
  // Clientes — más consultados por estado y nombre
  `ALTER TABLE clientes ADD INDEX idx_clientes_estado (estado)`,
  `ALTER TABLE clientes ADD INDEX idx_clientes_nombre (nombre_razon_social)`,

  // Dispositivos — consultados por cliente y estado
  `ALTER TABLE dispositivos ADD INDEX idx_dispositivos_cliente (cliente_id)`,
  `ALTER TABLE dispositivos ADD INDEX idx_dispositivos_estado (estado)`,

  // Contratos — consultados por cliente y fecha_proximo_pago
  `ALTER TABLE contratos ADD INDEX idx_contratos_cliente (cliente_id)`,
  `ALTER TABLE contratos ADD INDEX idx_contratos_estado (estado)`,
  `ALTER TABLE contratos ADD INDEX idx_contratos_fecha_pago (fecha_proximo_pago)`,

  // Pagos — consultados por cliente y contrato
  `ALTER TABLE pagos ADD INDEX idx_pagos_cliente (cliente_id)`,
  `ALTER TABLE pagos ADD INDEX idx_pagos_contrato (contrato_id)`,
  `ALTER TABLE pagos ADD INDEX idx_pagos_fecha (fecha_pago)`,

  // Facturas — consultadas por cliente y estado
  `ALTER TABLE facturas ADD INDEX idx_facturas_cliente (cliente_id)`,
  `ALTER TABLE facturas ADD INDEX idx_facturas_estado (estado)`,

  // Leads — consultados por estado
  `ALTER TABLE leads ADD INDEX idx_leads_estado (estado)`,

  // Alertas — consultadas por estado y tipo
  `ALTER TABLE alertas ADD INDEX idx_alertas_estado (estado)`,
  `ALTER TABLE alertas ADD INDEX idx_alertas_cliente (cliente_id)`,
];

async function migrar() {
  console.log('🔧 Creando índices para optimizar rendimiento...');
  let ok = 0;
  let skip = 0;

  for (const sql of indices) {
    try {
      await db.query(sql);
      const nombre = sql.match(/idx_\w+/)?.[0] || 'índice';
      console.log(`  ✅ ${nombre}`);
      ok++;
    } catch (err) {
      if (err.message.includes('Duplicate key name') || err.message.includes('already exists')) {
        skip++;
      } else if (err.message.includes("doesn't exist")) {
        // Tabla no existe aún — skip silencioso
        skip++;
      } else {
        console.warn(`  ⚠️  ${err.message.substring(0, 80)}`);
        skip++;
      }
    }
  }

  console.log(`\n✅ Índices: ${ok} creados, ${skip} ya existían o skipped`);
  process.exit(0);
}

migrar().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
