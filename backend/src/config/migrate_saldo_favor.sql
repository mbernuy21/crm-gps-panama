-- Migración: agregar saldo a favor en contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS saldo_favor DECIMAL(10,2) NOT NULL DEFAULT 0.00
  COMMENT 'Saldo a favor del cliente (pagos en exceso)';
