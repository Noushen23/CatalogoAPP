# Guía de Migración: MySQL 8.0.44 → MariaDB en Ubuntu

Esta guía te ayudará a migrar tu base de datos de MySQL a MariaDB en el servidor Ubuntu, manteniendo consistencia con tu entorno local (MariaDB 10.4.32).

## 📋 Requisitos Previos

- Acceso SSH al servidor Ubuntu
- Backup completo de la base de datos actual
- Acceso root o sudo en el servidor

## 🔄 Paso 1: Hacer Backup Completo de MySQL

```bash
# Conectarse al servidor
ssh -p 6723 desarrollador@181.49.225.64

# Crear directorio para backups
mkdir -p ~/backups
cd ~/backups

# Exportar la base de datos completa
mysqldump -u root -p --single-transaction --routines --triggers --events tiendamovil > tiendamovil_backup_$(date +%Y%m%d_%H%M%S).sql

# También exportar solo la estructura
mysqldump -u root -p --no-data --routines --triggers --events tiendamovil > tiendamovil_structure_$(date +%Y%m%d_%H%M%S).sql

# Exportar solo los datos
mysqldump -u root -p --no-create-info --single-transaction tiendamovil > tiendamovil_data_$(date +%Y%m%d_%H%M%S).sql
```

## 🛑 Paso 2: Detener el Backend y Servicios

```bash
# Detener el backend Node.js (si usas PM2)
pm2 stop backend
# o
pm2 stop all

# O si lo ejecutas directamente, detenerlo con Ctrl+C

# Detener MySQL (opcional, pero recomendado)
sudo systemctl stop mysql
```

## 📦 Paso 3: Instalar MariaDB

```bash
# Actualizar lista de paquetes
sudo apt update

# Instalar MariaDB Server
sudo apt install mariadb-server mariadb-client -y

# Iniciar MariaDB
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Verificar que está corriendo
sudo systemctl status mariadb
```

## 🔐 Paso 4: Configurar MariaDB

```bash
# Ejecutar script de configuración inicial (similar a mysql_secure_installation)
sudo mysql_secure_installation

# Durante la configuración:
# - Establecer contraseña para root (o dejarla vacía si prefieres)
# - Remover usuarios anónimos: Y
# - Deshabilitar login remoto de root: Y
# - Remover base de datos de prueba: Y
# - Recargar privilegios: Y
```

## 🔄 Paso 5: Crear Base de Datos y Usuario en MariaDB

```bash
# Acceder a MariaDB
sudo mysql -u root -p

# Dentro de MariaDB, ejecutar:
CREATE DATABASE IF NOT EXISTS tiendamovil CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Crear usuario (ajusta según tu configuración actual)
CREATE USER IF NOT EXISTS 'desarrollador'@'localhost' IDENTIFIED BY 'Bomberos2025#';
GRANT ALL PRIVILEGES ON tiendamovil.* TO 'desarrollador'@'localhost';
FLUSH PRIVILEGES;

# Salir
EXIT;
```

## 📥 Paso 6: Importar Datos a MariaDB

```bash
# Importar el backup completo
mysql -u root -p tiendamovil < ~/backups/tiendamovil_backup_*.sql

# O si prefieres importar estructura y datos por separado:
# mysql -u root -p tiendamovil < ~/backups/tiendamovil_structure_*.sql
# mysql -u root -p tiendamovil < ~/backups/tiendamovil_data_*.sql
```

## ✅ Paso 7: Verificar la Migración

```bash
# Acceder a MariaDB
mysql -u root -p

# Verificar bases de datos
SHOW DATABASES;

# Usar la base de datos
USE tiendamovil;

# Verificar tablas
SHOW TABLES;

# Verificar algunos registros
SELECT COUNT(*) FROM productos;
SELECT COUNT(*) FROM categorias;
SELECT COUNT(*) FROM imagenes_producto;

# Verificar versión
SELECT VERSION();

# Salir
EXIT;
```

## 🔧 Paso 8: Actualizar Variables de Entorno

```bash
# Editar el archivo .env del backend
cd ~/React-ExpoS/backend
nano .env

# Verificar que las credenciales sean correctas:
# DB_HOST=localhost (o 127.0.0.1)
# DB_PORT=3306
# DB_USER=tu_usuario
# DB_PASSWORD=tu_contraseña
# DB_NAME=tiendamovil
```

## 🚀 Paso 9: Reiniciar el Backend

```bash
# Si usas PM2
pm2 restart backend
# o
pm2 start backend

# Si no usas PM2
cd ~/React-ExpoS/backend
npm start
# o
node src/server.js
```

## 🧪 Paso 10: Probar la Aplicación

```bash
# Verificar logs del backend
pm2 logs backend
# o revisar la salida de la consola

# Probar endpoints
curl http://localhost:3001/api/v1/products
curl http://localhost:3001/api/v1/categories
```

## 🔄 Paso 11: (Opcional) Desinstalar MySQL

**⚠️ IMPORTANTE: Solo haz esto después de verificar que todo funciona correctamente**

```bash
# Detener MySQL (si aún está instalado)
sudo systemctl stop mysql

# Desinstalar MySQL
sudo apt remove --purge mysql-server mysql-client mysql-common mysql-server-core-* mysql-client-core-*
sudo apt autoremove
sudo apt autoclean

# Eliminar directorio de datos (¡CUIDADO! Esto elimina todo)
# sudo rm -rf /var/lib/mysql
# sudo rm -rf /etc/mysql
```

## 📝 Notas Importantes

1. **Compatibilidad**: MariaDB es compatible con MySQL, pero hay algunas diferencias menores. La mayoría de las aplicaciones funcionan sin cambios.

2. **Puerto**: MariaDB usa el mismo puerto (3306) que MySQL, así que no necesitas cambiar la configuración de conexión.

3. **Comandos**: Los comandos `mysql` y `mysqldump` funcionan igual con MariaDB.

4. **Diferencias conocidas**:
   - MariaDB puede tener mejor rendimiento en algunas consultas
   - Algunas funciones específicas de MySQL 8.0 pueden no estar disponibles
   - El formato de datos es compatible

## 🐛 Solución de Problemas

### Error: "Access denied for user"
```bash
# Verificar credenciales en .env
# Verificar que el usuario existe en MariaDB
mysql -u root -p -e "SELECT User, Host FROM mysql.user;"
```

### Error: "Table doesn't exist"
```bash
# Verificar que la importación se completó correctamente
mysql -u root -p tiendamovil -e "SHOW TABLES;"
```

### Error de conexión
```bash
# Verificar que MariaDB está corriendo
sudo systemctl status mariadb

# Verificar el puerto
sudo netstat -tlnp | grep 3306
```

## 📚 Recursos Adicionales

- [Documentación oficial de MariaDB](https://mariadb.com/kb/en/)
- [Guía de migración MySQL a MariaDB](https://mariadb.com/kb/en/migrating-from-mysql-to-mariadb/)

## ✅ Checklist de Migración

- [ ] Backup completo de MySQL realizado
- [ ] MariaDB instalado y configurado
- [ ] Base de datos y usuario creados en MariaDB
- [ ] Datos importados correctamente
- [ ] Variables de entorno actualizadas
- [ ] Backend reiniciado y funcionando
- [ ] Pruebas de endpoints exitosas
- [ ] Verificación de datos en tablas principales
- [ ] (Opcional) MySQL desinstalado

---

**Fecha de creación:** $(date)
**Versión:** 1.0






