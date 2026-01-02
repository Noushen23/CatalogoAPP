-- Migration 008: Add identification fields to usuarios table
-- Date: 2025-10-09
-- Purpose: Add tipo_identificacion and numero_identificacion for integration with ApiTercero

USE TiendaMovil;

-- Add tipo_identificacion and numero_identificacion to usuarios table
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS tipo_identificacion ENUM('CC', 'NIT', 'CE', 'TR') DEFAULT NULL COMMENT 'Tipo de identificación del usuario',
ADD COLUMN IF NOT EXISTS numero_identificacion VARCHAR(20) DEFAULT NULL COMMENT 'Número de identificación del usuario',
ADD COLUMN IF NOT EXISTS tercero_id INT DEFAULT NULL COMMENT 'ID del tercero en ApiTercero (TNS)';

-- Add index for faster searches by numero_identificacion
CREATE INDEX IF NOT EXISTS idx_numero_identificacion ON usuarios(numero_identificacion);

-- Add index for faster searches by tipo_identificacion
CREATE INDEX IF NOT EXISTS idx_tipo_identificacion ON usuarios(tipo_identificacion);

-- Add index for tercero_id
CREATE INDEX IF NOT EXISTS idx_tercero_id ON usuarios(tercero_id);

-- Add tercero_id to ordenes table
ALTER TABLE ordenes
ADD COLUMN IF NOT EXISTS tercero_id INT DEFAULT NULL COMMENT 'ID del tercero en ApiTercero (TNS)';

-- Add index for tercero_id in ordenes
CREATE INDEX IF NOT EXISTS idx_ordenes_tercero_id ON ordenes(tercero_id);

-- Add unique constraint for numero_identificacion (optional - uncomment if needed)
-- ALTER TABLE usuarios ADD UNIQUE INDEX IF NOT EXISTS unique_numero_identificacion (numero_identificacion);

COMMIT;

