-- Base de datos TiendaMovil para aplicación de tienda móvil
-- Tablas con nombres en español

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS TiendaMovil CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE TiendaMovil;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    rol ENUM('cliente', 'admin', 'vendedor') DEFAULT 'cliente',
    email_verificado BOOLEAN DEFAULT FALSE,
    codigo_verificacion VARCHAR(6),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP NULL,
    CONSTRAINT email_format CHECK (email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
);

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS perfiles_usuario (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    avatar_url VARCHAR(500),
    fecha_nacimiento DATE,
    genero ENUM('masculino', 'femenino', 'otro', 'no_especificar'),
    preferencias_notificaciones JSON DEFAULT ('{}'),
    configuracion_privacidad JSON DEFAULT ('{}'),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de categorías de productos
CREATE TABLE IF NOT EXISTS categorias (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    imagen_url VARCHAR(500),
    activa BOOLEAN DEFAULT TRUE,
    orden INT DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS productos (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    precio_oferta DECIMAL(10,2) CHECK (precio_oferta >= 0),
    categoria_id CHAR(36),
    stock INT DEFAULT 0 CHECK (stock >= 0),
    stock_minimo INT DEFAULT 5 CHECK (stock_minimo >= 0),
    activo BOOLEAN DEFAULT TRUE,
    destacado BOOLEAN DEFAULT FALSE,
    peso DECIMAL(8,2) CHECK (peso >= 0),
    dimensiones JSON,
    etiquetas JSON,
    codigo_barras VARCHAR(50) UNIQUE,
    sku VARCHAR(100) UNIQUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT precio_oferta_valido CHECK (precio_oferta IS NULL OR precio_oferta < precio),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);

-- Tabla de imágenes de productos
CREATE TABLE IF NOT EXISTS imagenes_producto (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    producto_id CHAR(36) NOT NULL,
    url_imagen VARCHAR(500) NOT NULL,
    orden INT DEFAULT 0,
    es_principal BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Tabla de carritos de compra
CREATE TABLE IF NOT EXISTS carritos (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de items del carrito
CREATE TABLE IF NOT EXISTS items_carrito (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    carrito_id CHAR(36) NOT NULL,
    producto_id CHAR(36) NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_carrito_producto (carrito_id, producto_id),
    FOREIGN KEY (carrito_id) REFERENCES carritos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Tabla de direcciones de envío
CREATE TABLE IF NOT EXISTS direcciones_envio (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    nombre_destinatario VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(20),
    pais VARCHAR(100) DEFAULT 'Colombia',
    es_principal BOOLEAN DEFAULT FALSE,
    activa BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de órdenes/pedidos
CREATE TABLE IF NOT EXISTS ordenes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    numero_orden VARCHAR(50) UNIQUE NOT NULL,
    usuario_id CHAR(36) NOT NULL,
    direccion_envio_id CHAR(36),
    estado ENUM('pendiente', 'confirmada', 'en_proceso', 'enviada', 'entregada', 'cancelada', 'reembolsada') DEFAULT 'pendiente',
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    descuento DECIMAL(10,2) DEFAULT 0 CHECK (descuento >= 0),
    costo_envio DECIMAL(10,2) DEFAULT 0 CHECK (costo_envio >= 0),
    impuestos DECIMAL(10,2) DEFAULT 0 CHECK (impuestos >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    metodo_pago VARCHAR(50),
    referencia_pago VARCHAR(100),
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    fecha_entrega_estimada TIMESTAMP NULL,
    fecha_entrega_real TIMESTAMP NULL,
    CONSTRAINT total_calculado CHECK (total = subtotal - descuento + costo_envio + impuestos),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (direccion_envio_id) REFERENCES direcciones_envio(id) ON DELETE SET NULL
);

-- Tabla de items de órdenes
CREATE TABLE IF NOT EXISTS items_orden (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    orden_id CHAR(36) NOT NULL,
    producto_id CHAR(36) NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT subtotal_calculado CHECK (subtotal = cantidad * precio_unitario),
    FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Tabla de favoritos
CREATE TABLE IF NOT EXISTS favoritos (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    producto_id CHAR(36) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_usuario_producto (usuario_id, producto_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Tabla de reseñas
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
    UNIQUE KEY unique_usuario_producto_orden (usuario_id, producto_id, orden_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (orden_id) REFERENCES ordenes(id) ON DELETE SET NULL
);

-- Tabla de tokens de autenticación (para logout)
CREATE TABLE IF NOT EXISTS tokens_autenticacion (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expira_en TIMESTAMP NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);


-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    usuario_id CHAR(36) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo ENUM('info', 'success', 'warning', 'error', 'promocion') NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla de historial de precios
CREATE TABLE IF NOT EXISTS historial_precios (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    producto_id CHAR(36) NOT NULL,
    precio_anterior DECIMAL(10,2) NOT NULL CHECK (precio_anterior >= 0),
    precio_nuevo DECIMAL(10,2) NOT NULL CHECK (precio_nuevo >= 0),
    motivo VARCHAR(255),
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Tabla de configuración de la aplicación
CREATE TABLE IF NOT EXISTS configuracion_app (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_productos_destacado ON productos(destacado);
CREATE INDEX idx_productos_sku ON productos(sku);
CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX idx_carritos_usuario ON carritos(usuario_id);
CREATE INDEX idx_carritos_activo ON carritos(activo);
CREATE INDEX idx_ordenes_usuario ON ordenes(usuario_id);
CREATE INDEX idx_ordenes_estado ON ordenes(estado);
CREATE INDEX idx_ordenes_fecha ON ordenes(fecha_creacion);
CREATE INDEX idx_ordenes_numero ON ordenes(numero_orden);
CREATE INDEX idx_tokens_usuario ON tokens_autenticacion(usuario_id);
CREATE INDEX idx_tokens_activo ON tokens_autenticacion(activo);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX idx_historial_producto ON historial_precios(producto_id);
CREATE INDEX idx_configuracion_clave ON configuracion_app(clave);

-- Datos iniciales
INSERT INTO categorias (nombre, descripcion, activa, orden) VALUES
('Electrónicos', 'Dispositivos electrónicos y tecnología', TRUE, 1),
('Ropa', 'Ropa para hombre, mujer y niños', TRUE, 2),
('Hogar', 'Artículos para el hogar y decoración', TRUE, 3),
('Deportes', 'Artículos deportivos y fitness', TRUE, 4),
('Libros', 'Libros y material educativo', TRUE, 5)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Usuario administrador por defecto (contraseña: admin123)
INSERT INTO usuarios (email, nombre_completo, contrasena, rol, activo, email_verificado) VALUES
('admin@tienda.com', 'Administrador', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE, TRUE)
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Configuración inicial de la aplicación
INSERT INTO configuracion_app (clave, valor, descripcion, tipo) VALUES
('nombre_tienda', 'Mi Tienda Móvil', 'Nombre de la tienda', 'string'),
('moneda', 'COP', 'Moneda principal', 'string'),
('impuestos_porcentaje', '19', 'Porcentaje de impuestos', 'number'),
('costo_envio_gratis', '100000', 'Monto mínimo para envío gratis', 'number'),
('costo_envio_estandar', '8000', 'Costo de envío estándar', 'number'),
('limite_productos_carrito', '50', 'Límite de productos en carrito', 'number'),
('tiempo_sesion_horas', '24', 'Tiempo de sesión en horas', 'number'),
('notificaciones_email', 'true', 'Habilitar notificaciones por email', 'boolean'),
('mantenimiento', 'false', 'Modo mantenimiento', 'boolean')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED') DEFAULT 'PENDING',
    shipping_address JSON,
    payment_method ENUM('cash', 'card', 'transfer', 'pse') DEFAULT 'cash',
    payment_status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    notes TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_fecha_creacion (fecha_creacion)
);

-- Tabla de items de pedidos
CREATE TABLE IF NOT EXISTS pedido_items (
    id VARCHAR(36) PRIMARY KEY,
    pedido_id VARCHAR(36) NOT NULL,
    producto_id VARCHAR(36) NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    INDEX idx_pedido_id (pedido_id),
    INDEX idx_producto_id (producto_id)
);

