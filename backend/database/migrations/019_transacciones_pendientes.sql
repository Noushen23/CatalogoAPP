-- Migration 019: Tabla para transacciones pendientes de pago
-- Date: 2025-01-22
-- Purpose: Guardar datos del pedido antes de que el pago sea aprobado

USE TiendaMovil;

-- Crear tabla para guardar datos del pedido antes de aprobación del pago
CREATE TABLE IF NOT EXISTS transacciones_pendientes (
    id CHAR(36) PRIMARY KEY,
    referencia_pago VARCHAR(40) NOT NULL UNIQUE COMMENT 'Referencia única de pago de Wompi',
    usuario_id CHAR(36) NOT NULL,
    carrito_id CHAR(36) NOT NULL COMMENT 'ID del carrito que se usó para crear el pedido',
    direccion_envio_id CHAR(36) NULL,
    metodo_pago VARCHAR(50) NOT NULL,
    notas TEXT NULL,
    datos_carrito JSON NOT NULL COMMENT 'Datos del carrito (items, totales, etc.)',
    datos_usuario JSON NULL COMMENT 'Datos del usuario al momento de la transacción',
    datos_envio JSON NULL COMMENT 'Datos de envío (dirección, ciudad, etc.)',
    estado_transaccion ENUM('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR') DEFAULT 'PENDING',
    id_transaccion_wompi VARCHAR(100) NULL COMMENT 'ID de la transacción en Wompi',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NULL COMMENT 'Fecha de expiración de la transacción',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (carrito_id) REFERENCES carritos(id) ON DELETE CASCADE,
    INDEX idx_referencia_pago (referencia_pago),
    INDEX idx_usuario_id (usuario_id),
    INDEX idx_estado_transaccion (estado_transaccion),
    INDEX idx_fecha_creacion (fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentarios en la tabla
ALTER TABLE transacciones_pendientes COMMENT = 'Tabla temporal para guardar datos del pedido antes de aprobación del pago';

COMMIT;
