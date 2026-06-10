// Script para ejecutar el schema SQL en la base de datos
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT) || 3306,
      multipleStatements: true
    });

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    console.log('🔄 Ejecutando migraciones...');

    // Ejecutar cada sentencia por separado para que un error no detenga todo
    // IMPORTANTE: primero quitar TODAS las líneas de comentario (--),
    // si no, las sentencias precedidas por comentarios se descartan por error.
    const schemaSinComentarios = schema
      .split('\n')
      .filter(linea => !linea.trim().startsWith('--'))
      .join('\n');

    const sentencias = schemaSinComentarios
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let ok = 0;
    let errores = 0;
    for (const sentencia of sentencias) {
      try {
        await conn.query(sentencia + ';');
        ok++;
      } catch (err) {
        // Ignorar errores de "ya existe" (código 1050 = tabla ya existe, 1060 = columna ya existe)
        if ([1050, 1060, 1061, 1062].includes(err.errno)) {
          console.log(`⚠️  Ya existe (ignorado): ${sentencia.substring(0, 60)}...`);
        } else {
          console.error(`❌ Error en sentencia: ${err.message}`);
          console.error(`   SQL: ${sentencia.substring(0, 100)}`);
          errores++;
        }
      }
    }

    console.log(`✅ Migración completada — ${ok} sentencias OK, ${errores} errores`);
    if (errores > 0) process.exit(1);
  } catch (err) {
    console.error('❌ Error conectando a la base de datos:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
