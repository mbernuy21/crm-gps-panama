-- ============================================================
-- CRM GPS Tracker Panamá — Schema completo de base de datos
-- ============================================================

CREATE DATABASE IF NOT EXISTS crm_gps_panama CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crm_gps_panama;

-- ------------------------------------------------------------
-- Tabla: usuarios (administradores del CRM)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'sub_agente') NOT NULL DEFAULT 'admin',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  reset_token VARCHAR(255) NULL,
  reset_token_expiry DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Tabla: clientes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_razon_social VARCHAR(200) NOT NULL,
  tipo_cliente ENUM('natural', 'juridica') NOT NULL DEFAULT 'natural',
  ruc VARCHAR(50),
  telefono_principal VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(150),
  direccion TEXT,
  provincia VARCHAR(100),
  distrito VARCHAR(100),
  contacto_secundario_nombre VARCHAR(150),
  contacto_secundario_telefono VARCHAR(20),
  estado ENUM('activo', 'inactivo', 'moroso', 'suspendido', 'cortado') NOT NULL DEFAULT 'activo',
  notas_internas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estado (estado),
  INDEX idx_provincia (provincia)
);

-- ------------------------------------------------------------
-- Tabla: dispositivos (GPS vinculados a clientes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispositivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT,
  serial_gps VARCHAR(100) NOT NULL,
  simcard VARCHAR(50),
  placa_vehiculo VARCHAR(20),
  modelo_auto VARCHAR(100),
  tipo_producto ENUM('fijo', 'portatil') NOT NULL DEFAULT 'fijo',
  modalidad ENUM('venta', 'alquiler') NOT NULL DEFAULT 'alquiler',
  valor_equipo_usd DECIMAL(10,2) DEFAULT 0.00,
  estado ENUM('asignado', 'disponible', 'devuelto', 'perdido', 'duplicado') NOT NULL DEFAULT 'disponible',
  fecha_asignacion DATE,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  INDEX idx_cliente_id (cliente_id),
  INDEX idx_estado (estado),
  INDEX idx_serial (serial_gps)
);

-- ------------------------------------------------------------
-- Tabla: historial_dispositivos (reasignaciones entre clientes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_dispositivos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dispositivo_id INT NOT NULL,
  cliente_id INT,
  accion VARCHAR(100) NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notas TEXT,
  FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- Tabla: contratos (un contrato por cliente)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contratos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  frecuencia ENUM('mensual', 'semestral', 'anual') NOT NULL DEFAULT 'mensual',
  monto_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  fecha_inicio DATE NOT NULL,
  fecha_proximo_pago DATE NOT NULL,
  dias_alerta INT NOT NULL DEFAULT 5,
  estado ENUM('activo', 'suspendido', 'cancelado') NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  INDEX idx_cliente_id (cliente_id),
  INDEX idx_fecha_proximo_pago (fecha_proximo_pago),
  INDEX idx_estado (estado)
);

-- ------------------------------------------------------------
-- Tabla: pagos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contrato_id INT NOT NULL,
  cliente_id INT NOT NULL,
  fecha_pago DATE NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  metodo ENUM('transferencia', 'yappy', 'efectivo', 'cheque') NOT NULL DEFAULT 'transferencia',
  link_comprobante VARCHAR(500),
  registrado_por INT,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (registrado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_cliente_id (cliente_id),
  INDEX idx_fecha_pago (fecha_pago)
);

-- ------------------------------------------------------------
-- Tabla: facturas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  numero_factura VARCHAR(20) NOT NULL UNIQUE,
  fecha_emision DATE NOT NULL,
  items_json JSON NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  estado ENUM('borrador', 'enviada', 'pagada', 'anulada') NOT NULL DEFAULT 'borrador',
  xml_dgi TEXT DEFAULT NULL COMMENT 'Reservado para integración futura con DGI Panamá',
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  INDEX idx_cliente_id (cliente_id),
  INDEX idx_numero_factura (numero_factura)
);

-- ------------------------------------------------------------
-- Tabla: leads (prospectos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(150),
  tipo_gps_consultado VARCHAR(100),
  provincia VARCHAR(100),
  fecha_contacto DATE NOT NULL,
  atendido_por INT,
  estado ENUM('nuevo', 'contactado', 'interesado', 'cerrado', 'perdido') NOT NULL DEFAULT 'nuevo',
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (atendido_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_estado (estado),
  INDEX idx_fecha_contacto (fecha_contacto)
);

-- ------------------------------------------------------------
-- Tabla: plantillas_whatsapp
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plantillas_whatsapp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  tipo ENUM('recordatorio', 'mora', 'suspension', 'reactivacion') NOT NULL,
  contenido TEXT NOT NULL,
  variables_json JSON,
  activa TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Tabla: configuracion (parámetros del sistema)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clave VARCHAR(100) NOT NULL UNIQUE,
  valor VARCHAR(500) NOT NULL,
  descripcion VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Tabla: catalogo_productos (artículos para cotizaciones)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL DEFAULT 0,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Tabla: cotizaciones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cotizaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero INT NOT NULL,
  cliente_id INT NULL,
  lead_id INT NULL,
  nombre_cliente VARCHAR(200) NOT NULL,
  email_cliente VARCHAR(200),
  telefono_cliente VARCHAR(30),
  whatsapp_cliente VARCHAR(30),
  items_json JSON NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  descuento_global DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notas TEXT,
  fecha_vencimiento DATE,
  estado ENUM('borrador','enviada','vista','aceptada','rechazada') NOT NULL DEFAULT 'borrador',
  creado_por INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_estado (estado),
  INDEX idx_numero (numero)
);

-- ------------------------------------------------------------
-- Tabla: tareas (pendientes del equipo, con o sin cliente)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tareas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(300) NOT NULL,
  descripcion TEXT,
  cliente_id INT NULL,
  creada_por INT NULL,
  fecha_limite DATE,
  prioridad ENUM('baja', 'media', 'alta') NOT NULL DEFAULT 'media',
  estado ENUM('pendiente', 'en_progreso', 'completada') NOT NULL DEFAULT 'pendiente',
  alerta_enviada TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (creada_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_estado (estado),
  INDEX idx_fecha_limite (fecha_limite)
);


-- ------------------------------------------------------------
-- Tabla: auditoria (registro de quién crea/edita/elimina cada dato)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  usuario_nombre VARCHAR(150),
  accion ENUM('crear', 'editar', 'eliminar', 'cambiar_estado') NOT NULL,
  entidad VARCHAR(50) NOT NULL,
  entidad_id INT,
  descripcion VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_entidad (entidad, entidad_id),
  INDEX idx_created (created_at)
);

-- ------------------------------------------------------------
-- Tabla: simcards (líneas/SIM con contrato, asignables a dispositivos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simcards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(30) NOT NULL,
  operador VARCHAR(50),
  iccid VARCHAR(50),
  plan VARCHAR(100),
  estado ENUM('disponible', 'asignada', 'suspendida', 'duplicada', 'baja') NOT NULL DEFAULT 'disponible',
  dispositivo_id INT NULL,
  cliente_id INT NULL,
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE SET NULL,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  INDEX idx_estado (estado),
  INDEX idx_numero (numero)
);

-- Permitir plantillas WhatsApp personalizadas (amplía el ENUM tipo)
ALTER TABLE plantillas_whatsapp MODIFY COLUMN tipo VARCHAR(40) NOT NULL DEFAULT 'personalizada';
