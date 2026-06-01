-- ============================================================
-- CRM GPS Tracker Panamá — Datos de prueba (seed)
-- ============================================================
USE crm_gps_panama;

-- ------------------------------------------------------------
-- Usuarios administradores
-- Contraseña para todos: Admin2024!
-- Hash bcrypt generado con saltRounds=10
-- ------------------------------------------------------------
INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES
('Administrador Principal', 'admin@gpstrackerpanama.com', '$2b$10$YourHashHere', 'admin', 1),
('Juan González', 'juan@gpstrackerpanama.com', '$2b$10$YourHashHere', 'admin', 1),
('María López', 'maria@gpstrackerpanama.com', '$2b$10$YourHashHere', 'admin', 1);

-- Nota: Los hashes reales se generan en el script seed.js de Node.js

-- ------------------------------------------------------------
-- Plantillas WhatsApp
-- ------------------------------------------------------------
INSERT INTO plantillas_whatsapp (nombre, tipo, contenido, variables_json, activa) VALUES
(
  'Recordatorio de Pago',
  'recordatorio',
  'Estimado/a [nombre_cliente], le recordamos cordialmente que su pago de B/.[monto] con GPS Tracker Panamá vence el [fecha_vencimiento]. Para realizar su pago o consultas, estamos a su disposición. Gracias por su preferencia.',
  '["nombre_cliente","monto","fecha_vencimiento"]',
  1
),
(
  'Aviso de Mora',
  'mora',
  'Estimado/a [nombre_cliente], le informamos que su cuenta presenta un saldo pendiente de B/.[monto] con [dias_mora] días de mora. Le solicitamos amablemente regularizar su situación para evitar la suspensión del servicio. Quedamos atentos.',
  '["nombre_cliente","monto","dias_mora"]',
  1
),
(
  'Aviso de Suspensión',
  'suspension',
  'Estimado/a [nombre_cliente], lamentamos informarle que debido a la falta de pago de B/.[monto], procederemos a la suspensión temporal de su servicio GPS. Para reactivarlo, realice su pago y comuníquese con nosotros. Estamos para servirle.',
  '["nombre_cliente","monto"]',
  1
),
(
  'Reactivación de Servicio',
  'reactivacion',
  'Estimado/a [nombre_cliente], nos complace informarle que su servicio GPS ha sido reactivado exitosamente. El saldo pendiente registrado es de B/.[monto]. Agradecemos su preferencia y quedamos a su disposición para cualquier consulta.',
  '["nombre_cliente","monto"]',
  1
);

-- ------------------------------------------------------------
-- Configuración del sistema
-- ------------------------------------------------------------
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('dias_alerta_pago', '5', 'Días antes del vencimiento para enviar alerta de pago'),
('dias_moroso', '3', 'Días de atraso para marcar cliente como moroso'),
('whatsapp_empresa_1', '50766431330', 'WhatsApp comercial principal'),
('whatsapp_empresa_2', '50762164006', 'WhatsApp comercial secundario'),
('email_alertas', 'ventas@gpstrackerpanama.com', 'Email para recibir alertas del sistema'),
('nombre_empresa', 'GPS Tracker Panamá', 'Nombre de la empresa para plantillas'),
('prefijo_factura', 'GPS-', 'Prefijo para numeración de facturas'),
('siguiente_numero_factura', '1001', 'Próximo número de factura a generar');
