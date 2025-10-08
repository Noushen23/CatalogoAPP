-- Migración: Agregar sistema de votos e imágenes para reseñas
-- Fecha: 2025-01-07

USE tienda_online;

-- Tabla de imágenes de reseñas
CREATE TABLE IF NOT EXISTS imagenes_resena (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    resena_id CHAR(36) NOT NULL,
    url_imagen VARCHAR(500) NOT NULL,
    orden INT DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resena_id) REFERENCES resenas(id) ON DELETE CASCADE,
    INDEX idx_resena_id (resena_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de votos de reseñas (útil / no útil)
CREATE TABLE IF NOT EXISTS votos_resena (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    resena_id CHAR(36) NOT NULL,
    usuario_id CHAR(36) NOT NULL,
    es_util BOOLEAN NOT NULL, -- TRUE = útil, FALSE = no útil
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_usuario_resena (usuario_id, resena_id),
    FOREIGN KEY (resena_id) REFERENCES resenas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_resena_id (resena_id),
    INDEX idx_usuario_id (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar columnas para contadores de votos en resenas (para optimización)
ALTER TABLE resenas 
ADD COLUMN IF NOT EXISTS votos_utiles INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS votos_no_utiles INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_votos INT DEFAULT 0;

-- Índices para mejorar rendimiento de consultas de reseñas ordenadas por utilidad
ALTER TABLE resenas 
ADD INDEX IF NOT EXISTS idx_producto_votos (producto_id, votos_utiles DESC, fecha_creacion DESC);

-- Comentarios para documentación
ALTER TABLE imagenes_resena COMMENT = 'Almacena imágenes adjuntas a las reseñas de productos';
ALTER TABLE votos_resena COMMENT = 'Almacena votos de utilidad de los usuarios sobre las reseñas';

-- Vistas para consultas optimizadas
CREATE OR REPLACE VIEW v_resenas_con_votos AS
SELECT 
    r.*,
    COALESCE(r.votos_utiles, 0) as votos_utiles,
    COALESCE(r.votos_no_utiles, 0) as votos_no_utiles,
    COALESCE(r.total_votos, 0) as total_votos,
    COUNT(DISTINCT ir.id) as cantidad_imagenes
FROM resenas r
LEFT JOIN imagenes_resena ir ON r.id = ir.resena_id
GROUP BY r.id;

SELECT '✅ Migración 005: Tablas de votos e imágenes de reseñas creadas exitosamente' as status;

