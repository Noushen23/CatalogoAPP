# Backend - Tienda Móvil API

Backend API para la aplicación de tienda móvil desarrollada con Node.js, Express y MySQL.

## 🚀 Características

- **Base de datos MySQL** con esquema completo para e-commerce
- **Autenticación JWT** con refresh tokens
- **API RESTful** para productos, categorías y usuarios
- **Validación de datos** con express-validator
- **Seguridad** con helmet, CORS y rate limiting
- **Logging** con morgan
- **Compresión** de respuestas
- **Manejo de errores** centralizado

## 📋 Requisitos Previos

- **Node.js** (versión 18 o superior)
- **MySQL** (versión 8.0 o superior)
- **npm** o **yarn**

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd React-ExpoS/backend
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar archivo .env con tus credenciales
nano .env
```

### 4. Configurar base de datos
```bash
# Crear base de datos y tablas
npm run db:migrate

# Poblar con datos de ejemplo
npm run db:seed
```

### 5. Iniciar servidor
```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

## 🔧 Configuración

### Variables de Entorno (.env)

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=TiendaMovil
DB_USER=root
DB_PASSWORD=tu_password

# Servidor
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
```

## 📚 API Endpoints

### Autenticación
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/login` - Iniciar sesión
- `POST /api/v1/auth/logout` - Cerrar sesión
- `GET /api/v1/auth/status` - Verificar estado
- `POST /api/v1/auth/refresh-token` - Renovar token
- `POST /api/v1/auth/change-password` - Cambiar contraseña

### Productos
- `GET /api/v1/products` - Listar productos
- `GET /api/v1/products/:id` - Obtener producto
- `GET /api/v1/products/search` - Buscar productos
- `GET /api/v1/products/featured` - Productos destacados
- `POST /api/v1/products` - Crear producto (admin/vendedor)
- `PUT /api/v1/products/:id` - Actualizar producto (admin/vendedor)
- `DELETE /api/v1/products/:id` - Eliminar producto (admin/vendedor)
- `PATCH /api/v1/products/:id/stock` - Actualizar stock (admin/vendedor)

### Categorías
- `GET /api/v1/categories` - Listar categorías
- `GET /api/v1/categories/:id` - Obtener categoría
- `GET /api/v1/categories/:id/products` - Productos de categoría
- `POST /api/v1/categories` - Crear categoría (admin)
- `PUT /api/v1/categories/:id` - Actualizar categoría (admin)
- `DELETE /api/v1/categories/:id` - Eliminar categoría (admin)
- `PATCH /api/v1/categories/reorder` - Reordenar categorías (admin)

### Health Check
- `GET /health` - Estado del servidor

## 🗄️ Base de Datos

### Esquema Principal
- **usuarios** - Información de usuarios
- **perfiles_usuario** - Perfiles extendidos
- **categorias** - Categorías de productos
- **productos** - Catálogo de productos
- **imagenes_producto** - Imágenes de productos
- **carritos** - Carritos de compra
- **items_carrito** - Items en carrito
- **ordenes** - Pedidos/órdenes
- **items_orden** - Items de órdenes
- **favoritos** - Productos favoritos
- **resenas** - Reseñas de productos
- **direcciones_envio** - Direcciones de envío
- **tokens_autenticacion** - Tokens JWT
- **notificaciones** - Notificaciones
- **historial_precios** - Historial de precios
- **configuracion_app** - Configuración de la app

## 🧪 Pruebas

### Probar conexión
```bash
# Desde el directorio raíz del proyecto
npm run test:backend
```

### Probar endpoints manualmente
```bash
# Health check
curl http://localhost:3001/health

# Listar productos
curl http://localhost:3001/api/v1/products

# Listar categorías
curl http://localhost:3001/api/v1/categories
```

## 📝 Scripts Disponibles

```bash
npm start          # Iniciar servidor en producción
npm run dev        # Iniciar servidor en desarrollo
npm run test       # Ejecutar pruebas
npm run db:migrate # Ejecutar migración de BD
npm run db:seed    # Poblar BD con datos de ejemplo
npm run db:reset   # Resetear BD (eliminar y recrear)
```

## 🔒 Seguridad

- **Helmet** para headers de seguridad
- **CORS** configurado para dominios específicos
- **Rate Limiting** para prevenir abuso
- **JWT** para autenticación
- **Validación** de datos de entrada
- **Sanitización** de inputs
- **Hashing** de contraseñas con bcrypt

## 🚀 Despliegue

### Variables de Producción
```env
NODE_ENV=production
DB_HOST=tu-servidor-mysql
DB_PASSWORD=password-seguro
JWT_SECRET=secret-muy-seguro-y-largo
CORS_ORIGIN=https://tu-dominio.com
```

### Comandos de Despliegue
```bash
# Instalar dependencias de producción
npm ci --only=production

# Ejecutar migraciones
npm run db:migrate

# Iniciar servidor
npm start
```

## 📊 Monitoreo

El servidor incluye:
- **Logging** con morgan
- **Health check** endpoint
- **Manejo de errores** centralizado
- **Métricas** de rendimiento

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

---

**Desarrollado con ❤️ para la aplicación de tienda móvil**

