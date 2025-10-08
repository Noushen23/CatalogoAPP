-- Migración 002: Crear tabla de reseñas de productos
-- Fecha: 2024-01-15
-- Descripción: Crear tabla para manejar reseñas y calificaciones de productos

-- Crear tabla de reseñas si no existe
CREATE TABLE IF NOT EXISTS resenas (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    producto_id CHAR(36) NOT NULL,
    orden_id CHAR(36),
    calificacion INT NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
    comentario TEXT,
    activa BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Restricción única para evitar múltiples reseñas del mismo usuario para el mismo producto
    UNIQUE KEY unique_usuario_producto (usuario_id, producto_id),
    
    -- Claves foráneas
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE SET NULL
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_resenas_producto ON resenas(producto_id);
CREATE INDEX IF NOT EXISTS idx_resenas_usuario ON resenas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_resenas_orden ON resenas(orden_id);
CREATE INDEX IF NOT EXISTS idx_resenas_activa ON resenas(activa);
CREATE INDEX IF NOT EXISTS idx_resenas_calificacion ON resenas(calificacion);

-- Comentarios para documentación
ALTER TABLE resenas COMMENT = 'Tabla para almacenar reseñas y calificaciones de productos por usuarios';
