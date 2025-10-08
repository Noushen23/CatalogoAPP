-- Migración: Sistema de Notificaciones Avanzadas
-- Fecha: 2025-01-07
-- Descripción: Agrega soporte para notificaciones push avanzadas

USE tienda_online;

-- 1. Agregar columna push_token a usuarios si no existe
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS push_token VARCHAR(255) NULL,
ADD INDEX IF NOT EXISTS idx_push_token (push_token);

-- 2. Tabla de suscripciones de notificaciones de productos en stock
CREATE TABLE IF NOT EXISTS notificaciones_stock (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    producto_id CHAR(36) NOT NULL,
    activa BOOLEAN DEFAULT TRUE,
    notificado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_notificacion TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario_producto (usuario_id, producto_id),
    INDEX idx_producto_activa (producto_id, activa),
    INDEX idx_usuario_activa (usuario_id, activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de suscripciones de notificaciones de baja de precio
CREATE TABLE IF NOT EXISTS notificaciones_precio (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    producto_id CHAR(36) NOT NULL,
    precio_objetivo DECIMAL(10,2) NOT NULL COMMENT 'Precio objetivo para notificar',
    precio_original DECIMAL(10,2) NOT NULL COMMENT 'Precio cuando se suscribió',
    activa BOOLEAN DEFAULT TRUE,
    notificado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_notificacion TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario_producto (usuario_id, producto_id),
    INDEX idx_producto_activa (producto_id, activa),
    INDEX idx_usuario_activa (usuario_id, activa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de historial de notificaciones enviadas
CREATE TABLE IF NOT EXISTS historial_notificaciones (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    tipo_notificacion ENUM('order_status', 'stock_available', 'price_drop', 'cart_reminder', 'new_order_admin', 'other') NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    datos_adicionales JSON NULL COMMENT 'Datos extra de la notificación',
    exitosa BOOLEAN DEFAULT FALSE,
    mensaje_error TEXT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_tipo (usuario_id, tipo_notificacion),
    INDEX idx_fecha (fecha_envio),
    INDEX idx_tipo (tipo_notificacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla para tracking de carritos abandonados
CREATE TABLE IF NOT EXISTS carritos_abandonados_tracking (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    carrito_id CHAR(36) NOT NULL,
    fecha_ultimo_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notificado BOOLEAN DEFAULT FALSE,
    fecha_notificacion TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (carrito_id) REFERENCES carritos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario_carrito (usuario_id, carrito_id),
    INDEX idx_fecha_cambio (fecha_ultimo_cambio),
    INDEX idx_no_notificado (notificado, fecha_ultimo_cambio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Vista para carritos abandonados (más de 24 horas sin modificar)
CREATE OR REPLACE VIEW v_carritos_abandonados AS
SELECT 
    cat.id as tracking_id,
    cat.usuario_id,
    cat.carrito_id,
    u.nombre_completo,
    u.email,
    u.push_token,
    cat.fecha_ultimo_cambio,
    TIMESTAMPDIFF(HOUR, cat.fecha_ultimo_cambio, NOW()) as horas_abandonado,
    COUNT(DISTINCT ic.id) as cantidad_productos,
    SUM(ic.cantidad * p.precio) as valor_total
FROM carritos_abandonados_tracking cat
INNER JOIN usuarios u ON cat.usuario_id = u.id
INNER JOIN carritos c ON cat.carrito_id = c.id
INNER JOIN items_carrito ic ON c.id = ic.carrito_id
INNER JOIN productos p ON ic.producto_id = p.id
WHERE cat.notificado = FALSE
    AND TIMESTAMPDIFF(HOUR, cat.fecha_ultimo_cambio, NOW()) >= 24
    AND u.push_token IS NOT NULL
    AND c.activo = TRUE
GROUP BY cat.id, cat.usuario_id, cat.carrito_id, u.nombre_completo, u.email, u.push_token, cat.fecha_ultimo_cambio;

-- 7. Trigger para actualizar tracking de carritos al modificar items
DELIMITER //

CREATE TRIGGER IF NOT EXISTS trg_actualizar_carrito_tracking_insert
AFTER INSERT ON items_carrito
FOR EACH ROW
BEGIN
    DECLARE v_usuario_id CHAR(36);
    DECLARE v_tracking_id CHAR(36);
    
    -- Obtener el usuario_id del carrito
    SELECT usuario_id INTO v_usuario_id
    FROM carritos
    WHERE id = NEW.carrito_id;
    
    -- Verificar si ya existe un tracking
    SELECT id INTO v_tracking_id
    FROM carritos_abandonados_tracking
    WHERE usuario_id = v_usuario_id AND carrito_id = NEW.carrito_id;
    
    IF v_tracking_id IS NULL THEN
        -- Crear nuevo tracking
        INSERT INTO carritos_abandonados_tracking (id, usuario_id, carrito_id, fecha_ultimo_cambio)
        VALUES (UUID(), v_usuario_id, NEW.carrito_id, NOW());
    ELSE
        -- Actualizar tracking existente
        UPDATE carritos_abandonados_tracking
        SET fecha_ultimo_cambio = NOW(), notificado = FALSE
        WHERE id = v_tracking_id;
    END IF;
END//

CREATE TRIGGER IF NOT EXISTS trg_actualizar_carrito_tracking_update
AFTER UPDATE ON items_carrito
FOR EACH ROW
BEGIN
    UPDATE carritos_abandonados_tracking
    SET fecha_ultimo_cambio = NOW(), notificado = FALSE
    WHERE carrito_id = NEW.carrito_id;
END//

CREATE TRIGGER IF NOT EXISTS trg_actualizar_carrito_tracking_delete
AFTER DELETE ON items_carrito
FOR EACH ROW
BEGIN
    UPDATE carritos_abandonados_tracking
    SET fecha_ultimo_cambio = NOW(), notificado = FALSE
    WHERE carrito_id = OLD.carrito_id;
END//

DELIMITER ;

-- Comentarios para documentación
ALTER TABLE notificaciones_stock COMMENT = 'Suscripciones para alertas de productos en stock';
ALTER TABLE notificaciones_precio COMMENT = 'Suscripciones para alertas de baja de precio';
ALTER TABLE historial_notificaciones COMMENT = 'Registro de todas las notificaciones enviadas';
ALTER TABLE carritos_abandonados_tracking COMMENT = 'Tracking de carritos para recordatorios';

SELECT '✅ Migración 006: Sistema de notificaciones avanzadas creado exitosamente' as status;


