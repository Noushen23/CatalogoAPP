-- Agregar columna instrucciones a la tabla direcciones_envio
ALTER TABLE direcciones_envio 
ADD COLUMN instrucciones TEXT NULL 
AFTER codigo_postal;
