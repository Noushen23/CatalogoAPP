-- Migration 009: Sistema de Tracking y Gestión de Entregas
-- Date: 2025-01-XX
-- Purpose: Agregar tablas para tracking en tiempo real, reasignaciones y reportes

USE TiendaMovil;

-- Tabla de tracking de ubicaciones de repartidores
CREATE TABLE IF NOT EXISTS repartidor_ubicaciones (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  repartidor_id CHAR(36) NOT NULL,
  ruta_id CHAR(36) NULL,
  latitud DECIMAL(10, 7) NOT NULL,
  longitud DECIMAL(10, 7) NOT NULL,
  precision_metros DECIMAL(8, 2) NULL,
  velocidad_kmh DECIMAL(6, 2) NULL,
  direccion_grados DECIMAL(5, 2) NULL,
  bateria_porcentaje TINYINT NULL,
  conectado TINYINT(1) DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_repartidor (repartidor_id),
  INDEX idx_ruta (ruta_id),
  INDEX idx_fecha (fecha_creacion),
  INDEX idx_ubicacion (latitud, longitud),
  CONSTRAINT fk_repartidor_ubicacion_usuario
    FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_repartidor_ubicacion_ruta
    FOREIGN KEY (ruta_id) REFERENCES rutas_logisticas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de estados de entrega de pedidos
CREATE TABLE IF NOT EXISTS entregas (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  orden_id CHAR(36) NOT NULL,
  repartidor_id CHAR(36) NOT NULL,
  ruta_id CHAR(36) NULL,
  estado ENUM('asignada', 'en_camino', 'llegada', 'entregada', 'cancelada', 'fallida') DEFAULT 'asignada',
  fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_salida DATETIME NULL,
  fecha_llegada DATETIME NULL,
  fecha_entrega DATETIME NULL,
  fecha_cancelacion DATETIME NULL,
  latitud_llegada DECIMAL(10, 7) NULL,
  longitud_llegada DECIMAL(10, 7) NULL,
  distancia_km DECIMAL(8, 2) NULL,
  tiempo_minutos INT NULL,
  observaciones TEXT NULL,
  firma_cliente TEXT NULL,
  foto_entrega VARCHAR(500) NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orden (orden_id),
  INDEX idx_repartidor (repartidor_id),
  INDEX idx_ruta (ruta_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha_asignacion (fecha_asignacion),
  CONSTRAINT fk_entrega_orden
    FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE,
  CONSTRAINT fk_entrega_repartidor
    FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_entrega_ruta
    FOREIGN KEY (ruta_id) REFERENCES rutas_logisticas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de reasignaciones de pedidos
CREATE TABLE IF NOT EXISTS reasignaciones (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  orden_id CHAR(36) NOT NULL,
  entrega_anterior_id CHAR(36) NULL,
  repartidor_anterior_id CHAR(36) NULL,
  repartidor_nuevo_id CHAR(36) NOT NULL,
  motivo ENUM('cancelacion_repartidor', 'reasignacion_manual', 'repartidor_no_disponible', 'optimizacion_ruta', 'otro') NOT NULL,
  motivo_detalle TEXT NULL,
  reasignado_por_id CHAR(36) NULL,
  fecha_reasignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orden (orden_id),
  INDEX idx_repartidor_anterior (repartidor_anterior_id),
  INDEX idx_repartidor_nuevo (repartidor_nuevo_id),
  INDEX idx_fecha (fecha_reasignacion),
  CONSTRAINT fk_reasignacion_orden
    FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE,
  CONSTRAINT fk_reasignacion_entrega_anterior
    FOREIGN KEY (entrega_anterior_id) REFERENCES entregas(id) ON DELETE SET NULL,
  CONSTRAINT fk_reasignacion_repartidor_anterior
    FOREIGN KEY (repartidor_anterior_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_reasignacion_repartidor_nuevo
    FOREIGN KEY (repartidor_nuevo_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_reasignacion_por
    FOREIGN KEY (reasignado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de rutas generadas automáticamente
CREATE TABLE IF NOT EXISTS rutas_automaticas (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  repartidor_id CHAR(36) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  tipo ENUM('optimizada', 'secuencial', 'manual') DEFAULT 'optimizada',
  origen_latitud DECIMAL(10, 7) NOT NULL,
  origen_longitud DECIMAL(10, 7) NOT NULL,
  destino_latitud DECIMAL(10, 7) NULL,
  destino_longitud DECIMAL(10, 7) NULL,
  distancia_total_km DECIMAL(8, 2) NULL,
  tiempo_estimado_minutos INT NULL,
  polilinea TEXT NULL,
  waypoints JSON NULL,
  estado ENUM('generada', 'activa', 'completada', 'cancelada') DEFAULT 'generada',
  fecha_inicio DATETIME NULL,
  fecha_fin DATETIME NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_repartidor (repartidor_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha_creacion (fecha_creacion),
  CONSTRAINT fk_ruta_automatica_repartidor
    FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de pedidos en ruta automática
CREATE TABLE IF NOT EXISTS rutas_automaticas_pedidos (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  ruta_automatica_id CHAR(36) NOT NULL,
  orden_id CHAR(36) NOT NULL,
  orden_secuencia INT NOT NULL,
  distancia_desde_anterior_km DECIMAL(8, 2) NULL,
  tiempo_desde_anterior_minutos INT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_ruta_pedido (ruta_automatica_id, orden_id),
  INDEX idx_ruta (ruta_automatica_id),
  INDEX idx_orden (orden_id),
  INDEX idx_secuencia (ruta_automatica_id, orden_secuencia),
  CONSTRAINT fk_ruta_automatica_pedido_ruta
    FOREIGN KEY (ruta_automatica_id) REFERENCES rutas_automaticas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ruta_automatica_pedido_orden
    FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de reportes de entregas
CREATE TABLE IF NOT EXISTS reportes_entregas (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tipo_reporte ENUM('diario', 'semanal', 'mensual', 'personalizado') NOT NULL,
  fecha_inicio DATETIME NOT NULL,
  fecha_fin DATETIME NOT NULL,
  repartidor_id CHAR(36) NULL,
  ruta_id CHAR(36) NULL,
  zona VARCHAR(120) NULL,
  total_entregas INT DEFAULT 0,
  entregas_exitosas INT DEFAULT 0,
  entregas_fallidas INT DEFAULT 0,
  entregas_canceladas INT DEFAULT 0,
  tiempo_promedio_minutos DECIMAL(8, 2) NULL,
  distancia_total_km DECIMAL(10, 2) NULL,
  reasignaciones_totales INT DEFAULT 0,
  datos_detallados JSON NULL,
  generado_por_id CHAR(36) NULL,
  fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tipo (tipo_reporte),
  INDEX idx_fecha_inicio (fecha_inicio),
  INDEX idx_fecha_fin (fecha_fin),
  INDEX idx_repartidor (repartidor_id),
  INDEX idx_ruta (ruta_id),
  CONSTRAINT fk_reporte_generado_por
    FOREIGN KEY (generado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_reporte_repartidor
    FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_reporte_ruta
    FOREIGN KEY (ruta_id) REFERENCES rutas_logisticas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Agregar columnas adicionales a ordenes_logistica para tracking (solo si no existen)
-- Nota: Ejecutar estas queries manualmente si las columnas ya existen
-- ALTER TABLE ordenes_logistica
-- ADD COLUMN repartidor_id CHAR(36) NULL,
-- ADD COLUMN entrega_id CHAR(36) NULL,
-- ADD COLUMN ruta_automatica_id CHAR(36) NULL,
-- ADD COLUMN fecha_salida DATETIME NULL,
-- ADD COLUMN fecha_llegada DATETIME NULL,
-- ADD COLUMN fecha_entrega DATETIME NULL;

-- Agregar índices (solo si no existen)
-- CREATE INDEX idx_repartidor ON ordenes_logistica(repartidor_id);
-- CREATE INDEX idx_entrega ON ordenes_logistica(entrega_id);
-- CREATE INDEX idx_ruta_automatica ON ordenes_logistica(ruta_automatica_id);

-- Agregar foreign keys (solo si no existen)
-- ALTER TABLE ordenes_logistica
-- ADD CONSTRAINT fk_orden_logistica_repartidor
--   FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
-- ADD CONSTRAINT fk_orden_logistica_entrega
--   FOREIGN KEY (entrega_id) REFERENCES entregas(id) ON DELETE SET NULL,
-- ADD CONSTRAINT fk_orden_logistica_ruta_automatica
--   FOREIGN KEY (ruta_automatica_id) REFERENCES rutas_automaticas(id) ON DELETE SET NULL;

-- Agregar columnas a rutas_logisticas para tracking (solo si no existen)
-- ALTER TABLE rutas_logisticas
-- ADD COLUMN repartidor_id CHAR(36) NULL,
-- ADD COLUMN estado_ruta ENUM('planificada', 'en_curso', 'completada', 'cancelada') DEFAULT 'planificada',
-- ADD COLUMN fecha_inicio DATETIME NULL,
-- ADD COLUMN fecha_fin DATETIME NULL,
-- ADD COLUMN distancia_total_km DECIMAL(8, 2) NULL,
-- ADD COLUMN tiempo_total_minutos INT NULL;

-- Agregar índices (solo si no existen)
-- CREATE INDEX idx_repartidor ON rutas_logisticas(repartidor_id);
-- CREATE INDEX idx_estado_ruta ON rutas_logisticas(estado_ruta);

-- Agregar foreign key (solo si no existe)
-- ALTER TABLE rutas_logisticas
-- ADD CONSTRAINT fk_ruta_logistica_repartidor
--   FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE SET NULL;

COMMIT;

