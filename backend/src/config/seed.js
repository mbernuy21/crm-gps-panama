// Script para insertar datos de prueba con hashes bcrypt reales
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'crm_gps_panama',
      port: parseInt(process.env.DB_PORT) || 3306
    });

    const passwordHash = await bcrypt.hash('Admin2024!', 10);

    // Usuarios
    await conn.query(`
      INSERT IGNORE INTO usuarios (nombre, email, password_hash, rol, activo) VALUES
      ('Administrador Principal', 'admin@gpstrackerpanama.com', ?, 'admin', 1),
      ('Juan González', 'juan@gpstrackerpanama.com', ?, 'admin', 1),
      ('María López', 'maria@gpstrackerpanama.com', ?, 'admin', 1)
    `, [passwordHash, passwordHash, passwordHash]);
    console.log('✅ Usuarios creados');

    // Plantillas WhatsApp
    await conn.query(`
      INSERT IGNORE INTO plantillas_whatsapp (nombre, tipo, contenido, variables_json, activa) VALUES
      (
        'Recordatorio de Pago', 'recordatorio',
        'Estimado/a [nombre_cliente], le recordamos cordialmente que su pago de B/.[monto] con GPS Tracker Panamá vence el [fecha_vencimiento]. Para realizar su pago o consultas, estamos a su disposición. Gracias por su preferencia.',
        '["nombre_cliente","monto","fecha_vencimiento"]', 1
      ),
      (
        'Aviso de Mora', 'mora',
        'Estimado/a [nombre_cliente], le informamos que su cuenta presenta un saldo pendiente de B/.[monto] con [dias_mora] días de mora. Le solicitamos amablemente regularizar su situación para evitar la suspensión del servicio. Quedamos atentos.',
        '["nombre_cliente","monto","dias_mora"]', 1
      ),
      (
        'Aviso de Suspensión', 'suspension',
        'Estimado/a [nombre_cliente], lamentamos informarle que debido a la falta de pago de B/.[monto], procederemos a la suspensión temporal de su servicio GPS. Para reactivarlo, realice su pago y comuníquese con nosotros. Estamos para servirle.',
        '["nombre_cliente","monto"]', 1
      ),
      (
        'Reactivación de Servicio', 'reactivacion',
        'Estimado/a [nombre_cliente], nos complace informarle que su servicio GPS ha sido reactivado exitosamente. El saldo pendiente registrado es de B/.[monto]. Agradecemos su preferencia y quedamos a su disposición para cualquier consulta.',
        '["nombre_cliente","monto"]', 1
      )
    `);
    console.log('✅ Plantillas WhatsApp insertadas');

    // Configuración
    await conn.query(`
      INSERT IGNORE INTO configuracion (clave, valor, descripcion) VALUES
      ('dias_alerta_pago', '5', 'Días antes del vencimiento para enviar alerta de pago'),
      ('dias_moroso', '3', 'Días de atraso para marcar cliente como moroso'),
      ('whatsapp_empresa_1', '50766431330', 'WhatsApp comercial principal'),
      ('whatsapp_empresa_2', '50762164006', 'WhatsApp comercial secundario'),
      ('email_alertas', 'ventas@gpstrackerpanama.com', 'Email para recibir alertas del sistema'),
      ('nombre_empresa', 'GPS Tracker Panamá', 'Nombre de la empresa para plantillas'),
      ('prefijo_factura', 'GPS-', 'Prefijo para numeración de facturas'),
      ('siguiente_numero_factura', '1001', 'Próximo número de factura a generar')
    `);
    console.log('✅ Configuración insertada');

    // Clientes de prueba
    const [clientesResult] = await conn.query(`
      INSERT IGNORE INTO clientes (nombre_razon_social, tipo_cliente, ruc, telefono_principal, whatsapp, email, direccion, provincia, estado) VALUES
      ('Carlos Rodríguez', 'natural', '8-123-456', '6789-0001', '50767890001', 'carlos@email.com', 'Calle 50, Ciudad de Panamá', 'Panamá', 'activo'),
      ('Empresa Logística S.A.', 'juridica', '155-789-1', '264-1234', '50764641234', 'logistica@empresa.com', 'Zona Industrial, Colón', 'Colón', 'activo'),
      ('Pedro Morales', 'natural', '4-567-890', '6543-0002', '50765430002', 'pedro@email.com', 'David, Chiriquí', 'Chiriquí', 'moroso'),
      ('Transportes Rápidos S.A.', 'juridica', '255-321-2', '232-5678', '50762325678', 'transportes@rapidos.com', 'Ave. Brasil, Panamá', 'Panamá', 'activo'),
      ('Ana Martínez', 'natural', '9-234-567', '6678-0003', '50766780003', 'ana@email.com', 'Santiago, Veraguas', 'Veraguas', 'suspendido')
    `);
    console.log('✅ Clientes de prueba insertados');

    // Dispositivos de prueba
    await conn.query(`
      INSERT IGNORE INTO dispositivos (cliente_id, serial_gps, simcard, placa_vehiculo, modelo_auto, tipo_producto, modalidad, valor_equipo_usd, estado, fecha_asignacion) VALUES
      (1, 'GPS-2024-001', '507-6789-001', 'PV-1234', 'Toyota Hilux 2022', 'fijo', 'alquiler', 150.00, 'asignado', '2024-01-15'),
      (1, 'GPS-2024-002', '507-6789-002', 'PV-5678', 'Honda Civic 2021', 'fijo', 'alquiler', 150.00, 'asignado', '2024-01-15'),
      (2, 'GPS-2024-003', '507-6789-003', 'PCA-001', 'Freightliner 2020', 'fijo', 'alquiler', 150.00, 'asignado', '2024-02-01'),
      (2, 'GPS-2024-004', '507-6789-004', 'PCA-002', 'Kenworth T680', 'fijo', 'alquiler', 150.00, 'asignado', '2024-02-01'),
      (3, 'GPS-2024-005', '507-6543-001', 'CHR-321', 'Mitsubishi L200', 'fijo', 'alquiler', 150.00, 'asignado', '2024-03-10'),
      (NULL, 'GPS-2024-006', NULL, NULL, NULL, 'fijo', 'alquiler', 150.00, 'disponible', NULL),
      (NULL, 'GPS-2024-007', NULL, NULL, NULL, 'portatil', 'venta', 95.00, 'disponible', NULL)
    `);
    console.log('✅ Dispositivos de prueba insertados');

    // Contratos de prueba
    await conn.query(`
      INSERT IGNORE INTO contratos (cliente_id, frecuencia, monto_total, fecha_inicio, fecha_proximo_pago, dias_alerta, estado) VALUES
      (1, 'mensual', 60.00, '2024-01-15', '2024-07-01', 5, 'activo'),
      (2, 'mensual', 120.00, '2024-02-01', '2024-07-01', 5, 'activo'),
      (3, 'mensual', 30.00, '2024-03-10', '2024-05-10', 5, 'suspendido'),
      (4, 'semestral', 180.00, '2024-01-01', '2024-07-01', 5, 'activo'),
      (5, 'mensual', 30.00, '2024-02-15', '2024-05-15', 5, 'suspendido')
    `);
    console.log('✅ Contratos de prueba insertados');

    // Leads de prueba
    await conn.query(`
      INSERT IGNORE INTO leads (nombre, telefono, whatsapp, email, tipo_gps_consultado, provincia, fecha_contacto, atendido_por, estado, notas) VALUES
      ('Roberto Silva', '6701-1234', '50767011234', 'roberto@email.com', 'GPS Fijo', 'Panamá', '2024-06-01', 1, 'nuevo', 'Interesado en 2 GPS para flota familiar'),
      ('Constructora Norte S.A.', '264-9876', '50764649876', 'constructora@norte.com', 'GPS Fijo x5', 'Colón', '2024-05-28', 1, 'interesado', 'Necesitan monitorear 5 excavadoras'),
      ('Luisa Herrera', '6822-5555', '50768225555', 'luisa@email.com', 'GPS Portátil', 'Chiriquí', '2024-05-25', 2, 'contactado', 'Quiere GPS portátil para su camioneta')
    `);
    console.log('✅ Leads de prueba insertados');

    // Catálogo de productos GPS Tracker Panamá
    await conn.query(`
      INSERT IGNORE INTO catalogo_productos (id, nombre, descripcion, precio) VALUES
      (1, 'Venta e Instalación de GPS', 'Localizadores de GPS para todo tipo de vehículo incluye:\n* Equipo de localización\n* Incluye instalación\n* Garantía de 3 años.', 65.00),
      (2, 'Alquiler e Instalación de GPS', 'Alquiler de Equipo GPS para todo tipo de vehículo incluye:\n* Equipo de localización GPS\n* Instalación', 25.00),
      (3, 'Plataforma Web + App + SIM Card (mensual)', 'Plataforma Web, App y Sim Card con data roaming Internacional.\nMensualidad B/.14.00 | Precio Promocional B/.12.00\nDescuento por Pago Oportuno o Pronto Pago (pago antes de 5 días del corte).\nAnualidad B/.120.00 — 2 meses gratis por unidad.\nReportes guardados por 1 año.', 14.00),
      (4, 'Mensualidad Alquiler GPS + SIM Card', 'Plataforma Virtual Web, APP, Sim Card con data roaming Internacional y Alquiler del equipo GPS.\nPrecio Regular B/.18.00 | Precio Promocional B/.16.00\nDescuento por Pago Oportuno (pago antes de 5 días del corte).\nReportes guardados por 1 año.', 18.00),
      (5, 'Anualidad del Servicio GPS', 'Pago anual por Plataforma Web y Aplicación + Simcard con data y roaming Internacional.\n2 meses de servicio GRATIS por cada unidad. Reportes guardados por 1 año.', 120.00),
      (6, 'Anualidad de Alquiler de GPS', 'Pago anual por concepto de Conectividad data (Simcard) + Plataforma Web + App + Alquiler del equipo GPS.', 150.00),
      (7, 'Anualidad de servicio GPS (2 meses gratis)', 'Anualidad de Servicio GPS con 2 meses de servicio gratis incluidos.', 144.00),
      (8, 'GPS Portátil', 'Equipo GPS portátil para vehículos, incluye instalación y configuración.', 105.00),
      (9, 'Instalación a domicilio', 'Servicio de instalación de GPS a domicilio en área metropolitana.', 8.00),
      (10, 'Viático de transporte', 'Viático de transporte para instalación fuera de la ciudad de Panamá.', 40.00),
      (11, 'Reposición de SIM Card', 'Colocación de SIM Card nuevo por duplicado o pérdida del original.', 0.00),
      (12, 'Depósito de Garantía', 'Depósito de Garantía reembolsable al momento de devolver el equipo GPS.', 80.00)
    `);
    console.log('✅ Catálogo de productos insertado');

    console.log('\n🎉 Seed completado exitosamente');
    console.log('Usuario de prueba: admin@gpstrackerpanama.com / Admin2024!');

  } catch (err) {
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

seed();
