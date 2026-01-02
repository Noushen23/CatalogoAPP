-- Migration 018: Sistema de Rutas para Repartidores
-- Date: 2025-01-XX
-- Purpose: Sistema completo de gestión de rutas para repartidores con capacidad de modificación

USE TiendaMovil;

-- Tabla principal de rutas
CREATE TABLE IF NOT EXISTS rutas (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  repartidor_id CHAR(36) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT NULL,
  capacidad_maxima INT NOT NULL DEFAULT 10 COMMENT 'Número máximo de pedidos que puede llevar',
  pedidos_asignados INT DEFAULT 0 COMMENT 'Número actual de pedidos en la ruta',
  estado ENUM('planificada', 'activa', 'en_curso', 'completada', 'cancelada') DEFAULT 'planificada',
  distancia_total_km DECIMAL(10, 2) NULL,
  tiempo_estimado_minutos INT NULL,
  fecha_inicio DATETIME NULL,
  fecha_fin DATETIME NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  creado_por_id CHAR(36) NULL COMMENT 'Admin que creó la ruta',
  INDEX idx_repartidor (repartidor_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha_creacion (fecha_creacion),
  CONSTRAINT fk_ruta_repartidor
    FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_ruta_creado_por
    FOREIGN KEY (creado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de pedidos en ruta (ruta principal)
CREATE TABLE IF NOT EXISTS ruta_pedidos (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  ruta_id CHAR(36) NOT NULL,
  orden_id CHAR(36) NOT NULL,
  entrega_id CHAR(36) NULL,
  orden_secuencia INT NOT NULL COMMENT 'Orden de entrega en la ruta',
  distancia_desde_anterior_km DECIMAL(8, 2) NULL,
  tiempo_desde_anterior_minutos INT NULL,
  estado ENUM('pendiente', 'en_camino', 'entregado', 'no_entregado', 'cancelado') DEFAULT 'pendiente',
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_ruta_orden (ruta_id, orden_id),
  INDEX idx_ruta (ruta_id),
  INDEX idx_orden (orden_id),
  INDEX idx_entrega (entrega_id),
  INDEX idx_secuencia (ruta_id, orden_secuencia),
  INDEX idx_estado (estado),
  CONSTRAINT fk_ruta_pedido_ruta
    FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ruta_pedido_orden
    FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE,
  CONSTRAINT fk_ruta_pedido_entrega
    FOREIGN KEY (entrega_id) REFERENCES entregas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de rutas alternativas (cambios del repartidor)
CREATE TABLE IF NOT EXISTS ruta_alternativa (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  ruta_id CHAR(36) NOT NULL COMMENT 'Ruta principal',
  repartidor_id CHAR(36) NOT NULL,
  orden_secuencia_modificada JSON NOT NULL COMMENT 'Nuevo orden de pedidos [{"orden_id": "...", "secuencia": 1}, ...]',
  motivo TEXT NULL COMMENT 'Razón del cambio de ruta',
  activa TINYINT(1) DEFAULT 1 COMMENT 'Si la ruta alternativa está activa',
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ruta (ruta_id),
  INDEX idx_repartidor (repartidor_id),
  INDEX idx_activa (activa),
  CONSTRAINT fk_ruta_alternativa_ruta
    FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ruta_alternativa_repartidor
    FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Agregar/actualizar columna ruta_id a entregas
-- Primero eliminar la foreign key antigua si existe (puede apuntar a rutas_logisticas)
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'entregas' 
  AND CONSTRAINT_NAME = 'fk_entrega_ruta'
);

-- Eliminar foreign key antigua si existe
SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE entregas DROP FOREIGN KEY fk_entrega_ruta',
  'SELECT "Foreign key fk_entrega_ruta no existe, continuando..." AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar columna ruta_id si no existe
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'entregas' 
  AND COLUMN_NAME = 'ruta_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE entregas ADD COLUMN ruta_id CHAR(36) NULL',
  'SELECT "Columna ruta_id ya existe en entregas" AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar índice si no existe
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'entregas' 
  AND INDEX_NAME = 'idx_ruta'
);

SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_ruta ON entregas(ruta_id)',
  'SELECT "Índice idx_ruta ya existe en entregas" AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar nuevamente si la foreign key existe (por si acaso)
SET @fk_exists_after = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'entregas' 
  AND CONSTRAINT_NAME = 'fk_entrega_ruta'
);

-- Crear nueva foreign key que apunta a la tabla rutas (solo si no existe)
SET @sql = IF(@fk_exists_after = 0,
  'ALTER TABLE entregas ADD CONSTRAINT fk_entrega_ruta FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE SET NULL',
  'SELECT "Foreign key fk_entrega_ruta ya existe" AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

COMMIT;

