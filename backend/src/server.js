const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

// Importar configuración
const config = require('./config/env');
const { initDatabase } = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const profileRoutes = require('./routes/profile');
const shippingAddressRoutes = require('./routes/shippingAddresses');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notificationRoutes');
const searchRoutes = require('./routes/searchRoutes');
const reviewRoutes = require('./routes/reviews');
const favoriteRoutes = require('./routes/favorites');
// const advisorRoutes = require('./routes/advisor'); // COMENTADO - MÓDULO DE ASESOR NO EN USO
const deliveryRoutes = require('./routes/delivery');
const rutasRoutes = require('./routes/rutas');
// const reportsRoutes = require('./routes/reportsold');
const repartidoresRoutes = require('./routes/repartidores');
const pagosRoutes = require('./routes/pagos');
const pagoRedirectController = require('./controllers/pagoRedirectController');

// const { initAdvisorModule } = require('./services/advisorService'); // COMENTADO - MÓDULO DE ASESOR NO EN USO
const { ensureDeliveryTables } = require('./services/deliveryService');
const usersRoutes = require('./routes/users');

// Crear aplicación Express
const app = express();

// Middleware de seguridad
app.use(helmet());

// Middleware de compresión
app.use(compression());

// Middleware de logging
app.use(config.nodeEnv === 'development' ? morgan('dev') : morgan('combined'));

// Middleware de rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: config.rateLimit.message
  }
});
app.use(limiter);

// Middleware CORS global
app.use(cors(config.cors));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para servir archivos estáticos con CORS
const staticWithCors = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Cache-Control", "public, max-age=31536000");

  // 👇 Claves para que el navegador no bloquee recursos
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  res.header("Cross-Origin-Embedder-Policy", "unsafe-none");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
};

// Rutas estáticas centralizadas con mejor configuración
app.use('/uploads', staticWithCors, express.static(config.uploads.path, {
  maxAge: '1y', // Cache por 1 año
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
}));

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: config.app.version
  });
});

// Rutas públicas de redirección de pagos (antes de las rutas de API)
// Estas rutas son públicas y no requieren autenticación
app.get('/pago-exitoso', pagoRedirectController.pagoExitoso);
app.get('/pago-error', pagoRedirectController.pagoError);

// Ruta de prueba para verificar imágenes
app.get('/test-images', (req, res) => {
  try {
    const uploadsPath = config.uploads.path;
    
    // Verificar que el directorio existe
    if (!fs.existsSync(uploadsPath)) {
      return res.status(404).json({
        success: false,
        message: 'Directorio de uploads no encontrado',
        path: uploadsPath
      });
    }

    // Obtener archivos de muestra
    const files = fs.readdirSync(uploadsPath);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );

    res.json({
      success: true,
      message: 'Directorio de imágenes accesible',
      uploadsPath: uploadsPath,
      totalFiles: files.length,
      imageFiles: imageFiles.length,
      sampleUrls: imageFiles.slice(0, 3).map(file => `${config.apiBaseUrl}/uploads/${file}`),
      testUrl: `${config.apiBaseUrl}/uploads/products/`
    });
  } catch (error) {
    console.error('Error en test-images:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar imágenes',
      error: error.message
    });
  }
});

// Rutas de la API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/shipping-addresses', shippingAddressRoutes);
app.use('/api/v1/admin/dashboard', dashboardRoutes);
app.use('/api/v1/admin/users', usersRoutes);
app.use('/api/v1/notifications', notificationRoutes);
// app.use('/api/v1/advisor', advisorRoutes); // COMENTADO - MÓDULO DE ASESOR NO EN USO
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/rutas', rutasRoutes);
// app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/repartidores', repartidoresRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/pagos', pagosRoutes);

// Rutas de compatibilidad (sin v1)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/shipping-addresses', shippingAddressRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/notifications', notificationRoutes);
// app.use('/api/advisor', advisorRoutes); // COMENTADO - MÓDULO DE ASESOR NO EN USO
app.use('/api/delivery', deliveryRoutes);
app.use('/api/rutas', rutasRoutes);
// app.use('/api/reports', reportsRoutes);
app.use('/api/repartidores', repartidoresRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/pagos', pagosRoutes);

// Ruta raíz de la API
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'API de Tienda Móvil',
    version: config.app.version,
    environment: config.nodeEnv,
    endpoints: {
      auth: '/api/v1/auth',
      products: '/api/v1/products',
      categories: '/api/v1/categories',
      orders: '/api/v1/orders',
      cart: '/api/v1/cart',
      profile: '/api/v1/profile',
      shippingAddresses: '/api/v1/shipping-addresses',
      reviews: '/api/v1/reviews',
      favorites: '/api/v1/favorites',
      pagos: '/api/v1/pagos',
      health: '/health'
    }
  });
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Middleware global de manejo de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'JSON inválido' });
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'Archivo demasiado grande' });
  }

  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'development' ? error.message : 'Error interno del servidor'
  });
});

// Función para iniciar el servidor
const startServer = async () => {
  try {
    await initDatabase();
    console.log('✅ Base de datos inicializada');

    // await initAdvisorModule(); // COMENTADO - MÓDULO DE ASESOR NO EN USO
    // console.log('🧭 Módulo de asesor preparado');

    await ensureDeliveryTables();
    console.log('🚚 Módulo de delivery preparado');

    // Iniciar worker de notificaciones
    const notificationWorker = require('./workers/notificationWorker');
    notificationWorker.start();

    // Iniciar worker de timeout de pagos

    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log('🚀 Servidor iniciado');
      console.log(`📡 Puerto: ${config.port}`);
      console.log(`🌍 Entorno: ${config.nodeEnv}`);
      console.log(`🔗 URL App: ${config.app.url}`);
      console.log(`🖼️  URL Base Imágenes (IP PÚBLICA): ${config.apiBaseUrl}`);
      console.log(`📊 Health Check: ${config.app.url}/health`);
      console.log(`🔐 API Auth: ${config.app.url}/api/v1/auth`);
      console.log(`🛍️  API Products: ${config.app.url}/api/v1/products`);
      console.log(`📂 API Categories: ${config.app.url}/api/v1/categories`);
      console.log(`🛒 API Cart: ${config.app.url}/api/v1/cart`);
      console.log(`📋 API Orders: ${config.app.url}/api/v1/orders`);
      console.log(`👤 API Profile: ${config.app.url}/api/v1/profile`);
      console.log(`📍 API Shipping Addresses: ${config.app.url}/api/v1/shipping-addresses`);
      console.log(`🔔 API Notifications: ${config.app.url}/api/v1/notifications`);
    });

    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor...`);
      server.close(async () => {
        console.log('🔌 Servidor HTTP cerrado');
        
        // Detener worker de notificaciones
        const notificationWorker = require('./workers/notificationWorker');
        notificationWorker.stop();
        
        try {
          const { closeDatabase } = require('./config/database');
          await closeDatabase();
          console.log('✅ Base de datos cerrada');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error al cerrar base de datos:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
