-- Migración: agregar columna plataforma a dispositivos
-- Ejecutar una sola vez en producción (Railway console)
ALTER TABLE dispositivos
  ADD COLUMN IF NOT EXISTS plataforma VARCHAR(50) NULL DEFAULT NULL
  COMMENT 'Plataforma GPS: sinotrack, gpspos, yogu, otra'
  AFTER notas;

-- Índice para filtrado por plataforma
CREATE INDEX IF NOT EXISTS idx_plataforma ON dispositivos (plataforma);
