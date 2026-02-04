-- Migración: Agregar partes del nombre a la tabla usuarios
-- Fecha: Febrero 2026
-- Descripción: Agregar nombre, segundo_nombre, primer_apellido, segundo_apellido

-- Verificar si las columnas ya existen antes de agregarlas
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'usuarios' 
     AND COLUMN_NAME = 'nombre') = 0,
    'ALTER TABLE usuarios ADD COLUMN nombre VARCHAR(50) DEFAULT NULL',
    'SELECT "Columna nombre ya existe" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'usuarios' 
     AND COLUMN_NAME = 'segundo_nombre') = 0,
    'ALTER TABLE usuarios ADD COLUMN segundo_nombre VARCHAR(50) DEFAULT NULL',
    'SELECT "Columna segundo_nombre ya existe" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'usuarios' 
     AND COLUMN_NAME = 'primer_apellido') = 0,
    'ALTER TABLE usuarios ADD COLUMN primer_apellido VARCHAR(50) DEFAULT NULL',
    'SELECT "Columna primer_apellido ya existe" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'usuarios' 
     AND COLUMN_NAME = 'segundo_apellido') = 0,
    'ALTER TABLE usuarios ADD COLUMN segundo_apellido VARCHAR(50) DEFAULT NULL',
    'SELECT "Columna segundo_apellido ya existe" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar comentarios a las columnas
ALTER TABLE usuarios MODIFY COLUMN nombre VARCHAR(50) DEFAULT NULL COMMENT 'Primer nombre del usuario';
ALTER TABLE usuarios MODIFY COLUMN segundo_nombre VARCHAR(50) DEFAULT NULL COMMENT 'Segundo nombre del usuario';
ALTER TABLE usuarios MODIFY COLUMN primer_apellido VARCHAR(50) DEFAULT NULL COMMENT 'Primer apellido del usuario';
ALTER TABLE usuarios MODIFY COLUMN segundo_apellido VARCHAR(50) DEFAULT NULL COMMENT 'Segundo apellido del usuario';

-- Mostrar resultado
SELECT 'Migración completada: Partes del nombre agregadas a la tabla usuarios' as resultado;
