-- Migración para agregar campos necesarios para recuperación de contraseña con verificación
-- Ejecutar este script en la base de datos MySQL
-- IMPORTANTE: Verificar si los campos ya existen antes de ejecutar

-- Verificar y agregar codigo_recuperacion_password si no existe
SET @dbname = DATABASE();
SET @tablename = 'usuarios';
SET @columnname = 'codigo_recuperacion_password';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT "Columna codigo_recuperacion_password ya existe" as message',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(6) NULL AFTER codigo_cambio_email')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verificar y agregar fecha_codigo_recuperacion_password si no existe
SET @columnname = 'fecha_codigo_recuperacion_password';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT "Columna fecha_codigo_recuperacion_password ya existe" as message',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DATETIME NULL AFTER codigo_recuperacion_password')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Mostrar resultado
SELECT 'Migración completada: Campos de recuperación de contraseña agregados a la tabla usuarios' as resultado;
