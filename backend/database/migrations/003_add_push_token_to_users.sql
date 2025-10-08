-- Migración para añadir columna push_token a la tabla usuarios
-- Esta columna almacenará el token único de Expo para notificaciones push

ALTER TABLE usuarios
ADD COLUMN push_token VARCHAR(255) NULL DEFAULT NULL AFTER email_verificado_en;

-- Crear índice para optimizar búsquedas por push_token
CREATE INDEX idx_usuarios_push_token ON usuarios(push_token(255));

-- Agregar comentario a la columna
ALTER TABLE usuarios
MODIFY COLUMN push_token VARCHAR(255) NULL DEFAULT NULL COMMENT 'Token de Expo Push Notifications para el dispositivo del usuario';
