# Diagrama de Base de Datos - Tienda Móvil

## 📊 Estructura de Tablas

### 👥 Gestión de Usuarios
```
usuarios
├── id (UUID, PK)
├── email (VARCHAR, UNIQUE)
├── nombre_completo (VARCHAR)
├── contrasena (VARCHAR)
├── telefono (VARCHAR)
├── direccion (TEXT)
├── activo (BOOLEAN)
├── rol (ENUM: cliente, admin, vendedor)
├── email_verificado (BOOLEAN)
├── codigo_verificacion (VARCHAR)
├── fecha_creacion (TIMESTAMP)
├── fecha_actualizacion (TIMESTAMP)
└── ultimo_acceso (TIMESTAMP)

perfiles_usuario
├── id (UUID, PK)
├── usuario_id (UUID, FK → usuarios.id)
├── avatar_url (VARCHAR)
├── fecha_nacimiento (DATE)
├── genero (ENUM: masculino, femenino, otro, no_especificar)
├── preferencias_notificaciones (JSONB)
├── configuracion_privacidad (JSONB)
├── fecha_creacion (TIMESTAMP)
└── fecha_actualizacion (TIMESTAMP)
```

### 🛍️ Catálogo de Productos
```
categorias
├── id (UUID, PK)
├── nombre (VARCHAR)
├── descripcion (TEXT)
├── imagen_url (VARCHAR)
├── activa (BOOLEAN)
├── orden (INTEGER)
├── fecha_creacion (TIMESTAMP)
└── fecha_actualizacion (TIMESTAMP)

productos
├── id (UUID, PK)
├── nombre (VARCHAR)
├── descripcion (TEXT)
├── precio (DECIMAL)
├── precio_oferta (DECIMAL)
├── categoria_id (UUID, FK → categorias.id)
├── stock (INTEGER)
├── stock_minimo (INTEGER)
├── activo (BOOLEAN)
├── destacado (BOOLEAN)
├── peso (DECIMAL)
├── dimensiones (JSONB)
├── etiquetas (TEXT[])
├── codigo_barras (VARCHAR, UNIQUE)
├── sku (VARCHAR, UNIQUE)
├── fecha_creacion (TIMESTAMP)
└── fecha_actualizacion (TIMESTAMP)

imagenes_producto
├── id (UUID, PK)
├── producto_id (UUID, FK → productos.id)
├── url_imagen (VARCHAR)
├── orden (INTEGER)
├── es_principal (BOOLEAN)
└── fecha_creacion (TIMESTAMP)
```

### 🛒 Carrito y Compras
```
carritos
├── id (UUID, PK)
├── usuario_id (UUID, FK → usuarios.id)
├── activo (BOOLEAN)
├── fecha_creacion (TIMESTAMP)
└── fecha_actualizacion (TIMESTAMP)

items_carrito
├── id (UUID, PK)
├── carrito_id (UUID, FK → carritos.id)
├── producto_id (UUID, FK → productos.id)
├── cantidad (INTEGER)
├── precio_unitario (DECIMAL)
├── subtotal (DECIMAL, GENERATED)
├── fecha_creacion (TIMESTAMP)
└── fecha_actualizacion (TIMESTAMP)
```

### 📦 Órdenes y Envíos
```
direcciones_envio
├── id (UUID, PK)
├── usuario_id (UUID, FK → usuarios.id)
├── nombre_destinatario (VARCHAR)
├── telefono (VARCHAR)
├── direccion (TEXT)
├── ciudad (VARCHAR)
├── departamento (VARCHAR)
├── codigo_postal (VARCHAR)
├── pais (VARCHAR)
├── es_principal (BOOLEAN)
├── activa (BOOLEAN)
├── fecha_creacion (TIMESTAMP)
└── fecha_actualizacion (TIMESTAMP)

ordenes
├── id (UUID, PK)
├── numero_orden (VARCHAR, UNIQUE)
├── usuario_id (UUID, FK → usuarios.id)
├── direccion_envio_id (UUID, FK → direcciones_envio.id)
├── estado (ENUM: pendiente, confirmada, en_proceso, enviada, entregada, cancelada, reembolsada)
├── subtotal (DECIMAL)
├── descuento (DECIMAL)
├── costo_envio (DECIMAL)
├── impuestos (DECIMAL)
├── total (DECIMAL)
├── metodo_pago (VARCHAR)
├── referencia_pago (VARCHAR)
├── notas (TEXT)
├── fecha_creacion (TIMESTAMP)
├── fecha_actualizacion (TIMESTAMP)
├── fecha_entrega_estimada (TIMESTAMP)
└── fecha_entrega_real (TIMESTAMP)

items_orden
├── id (UUID, PK)
├── orden_id (UUID, FK → ordenes.id)
├── producto_id (UUID, FK → productos.id)
├── cantidad (INTEGER)
├── precio_unitario (DECIMAL)
├── subtotal (DECIMAL)
└── fecha_creacion (TIMESTAMP)
```

### ❤️ Favoritos y Reseñas
```
favoritos
├── id (UUID, PK)
├── usuario_id (UUID, FK → usuarios.id)
├── producto_id (UUID, FK → productos.id)
└── fecha_creacion (TIMESTAMP)

resenas
├── id (UUID, PK)
├── usuario_id (UUID, FK → usuarios.id)
├── producto_id (UUID, FK → productos.id)
├── orden_id (UUID, FK → ordenes.id)
├── calificacion (INTEGER, 1-5)
├── comentario (TEXT)
├── activa (BOOLEAN)
├── fecha_creacion (TIMESTAMP)
└── fecha_actualizacion (TIMESTAMP)
```


### 🔔 Notificaciones y Sistema
```
notificaciones
├── id (UUID, PK)
├── usuario_id (UUID, FK → usuarios.id)
├── titulo (VARCHAR)
├── mensaje (TEXT)
├── tipo (ENUM: info, success, warning, error, promocion)
├── leida (BOOLEAN)
├── fecha_creacion (TIMESTAMP)
└── fecha_lectura (TIMESTAMP)

tokens_autenticacion
├── id (UUID, PK)
├── usuario_id (UUID, FK → usuarios.id)
├── token_hash (VARCHAR)
├── expira_en (TIMESTAMP)
├── activo (BOOLEAN)
└── fecha_creacion (TIMESTAMP)

historial_precios
├── id (UUID, PK)
├── producto_id (UUID, FK → productos.id)
├── precio_anterior (DECIMAL)
├── precio_nuevo (DECIMAL)
├── motivo (VARCHAR)
└── fecha_cambio (TIMESTAMP)

configuracion_app
├── id (UUID, PK)
├── clave (VARCHAR, UNIQUE)
├── valor (TEXT)
├── descripcion (TEXT)
├── tipo (ENUM: string, number, boolean, json)
├── fecha_creacion (TIMESTAMP)
└── fecha_actualizacion (TIMESTAMP)
```

## 🔗 Relaciones Principales

1. **usuarios** → **perfiles_usuario** (1:1)
2. **usuarios** → **carritos** (1:N)
3. **usuarios** → **ordenes** (1:N)
4. **usuarios** → **direcciones_envio** (1:N)
5. **usuarios** → **favoritos** (1:N)
6. **usuarios** → **resenas** (1:N)
7. **usuarios** → **notificaciones** (1:N)
8. **categorias** → **productos** (1:N)
9. **productos** → **imagenes_producto** (1:N)
10. **productos** → **items_carrito** (1:N)
11. **productos** → **items_orden** (1:N)
12. **productos** → **favoritos** (1:N)
13. **productos** → **resenas** (1:N)
14. **productos** → **historial_precios** (1:N)
15. **carritos** → **items_carrito** (1:N)
16. **ordenes** → **items_orden** (1:N)
17. **ordenes** → **direcciones_envio** (1:1)

## 📈 Características Destacadas

### ✅ Validaciones y Restricciones
- **Constraints CHECK** para validar rangos de precios, cantidades, fechas
- **Constraints UNIQUE** para códigos, SKUs, emails
- **Constraints FOREIGN KEY** con CASCADE y SET NULL apropiados
- **Validación de formato de email** con regex
- **Campos calculados** (subtotal) con GENERATED ALWAYS AS

### 🚀 Optimización de Rendimiento
- **Índices** en campos de búsqueda frecuente
- **Índices compuestos** para consultas complejas
- **Índices únicos** para campos de integridad

### 🔄 Automatización
- **Triggers** para actualizar fecha_actualizacion automáticamente
- **Campos calculados** para subtotales
- **Valores por defecto** inteligentes

### 🌍 Internacionalización
- **Nombres en español** para todas las tablas y campos
- **Configuración flexible** de moneda y regiones
- **Soporte para múltiples idiomas** (preparado)

### 🔒 Seguridad
- **Soft deletes** con campos activo
- **Auditoría** con fechas de creación y actualización
- **Tokens de autenticación** con expiración
- **Verificación de email** opcional

## 📊 Datos Iniciales

La base de datos incluye:
- **5 categorías** predefinidas
- **1 usuario administrador** por defecto
- **9 configuraciones** de aplicación

## 📊 Estructura Final:
- **13 tablas principales** con nombres en español
- **Relaciones bien definidas** con CASCADE apropiados
- **Índices optimizados** para consultas rápidas
- **Triggers automáticos** para mantenimiento
- **Validaciones robustas** en todos los niveles
