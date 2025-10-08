require('dotenv').config();

const config = {
  // Configuración del servidor
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Configuración de la base de datos
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'TiendaMovil',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  
  // Configuración JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'tu_jwt_secret_muy_seguro_aqui_cambiar_en_produccion',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // Configuración CORS
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
      'http://localhost:3000', 
      'http://localhost:8081',
      'http://localhost:19006', // Expo web
      'http://192.168.3.104:3000', // Admin web
      'http://192.168.3.104:3001',   // Android emulator
      'http://192.168.3.104:3001', // IP local para dispositivos físicos
      /^http:\/\/192\.168\.\d+\.\d+:3000$/, // Patrón para Admin Web en IPs locales
      /^http:\/\/192\.168\.\d+\.\d+:3001$/, // Patrón para API en IPs locales
      /^http:\/\/10\.0\.2\.\d+:3001$/, // Patrón para Android emulator
      /^http:\/\/localhost:\d+$/, // Cualquier puerto localhost
      /^http:\/\/127\.0\.0\.1:\d+$/ // Cualquier puerto 127.0.0.1
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type', 'Cache-Control']
  },
  
  // Configuración de la aplicación
  app: {
    name: process.env.APP_NAME || 'Tienda Móvil',
    version: process.env.APP_VERSION || '1.0.0',
    url: process.env.APP_URL || 'http://localhost:3001'
  },
  
  // Configuración de email (opcional)
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@tiendamovil.com',
    supportEmail: process.env.SUPPORT_EMAIL || process.env.SMTP_USER || 'support@tiendamovil.com',
    enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  },
  
  // Configuración de archivos
  uploads: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    path: process.env.UPLOADS_PATH || './uploads'
  },

  // URL base para construir URLs de imágenes
  apiBaseUrl: process.env.API_BASE_URL || 'http://192.168.3.104:3001',
  
  // Configuración de rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // máximo 1000 requests por IP por ventana (aumentado para desarrollo)
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  }
};

// Validar configuración crítica
const validateConfig = () => {
  const errors = [];
  
  if (!config.database.host) {
    errors.push('DB_HOST es requerido');
  }
  
  if (!config.database.name) {
    errors.push('DB_NAME es requerido');
  }
  
  if (!config.database.user) {
    errors.push('DB_USER es requerido');
  }
  
  if (config.jwt.secret === 'tu_jwt_secret_muy_seguro_aqui_cambiar_en_produccion') {
    console.warn('⚠️  ADVERTENCIA: JWT_SECRET está usando el valor por defecto. Cambia esto en producción.');
  }
  
  if (errors.length > 0) {
    throw new Error(`Errores de configuración: ${errors.join(', ')}`);
  }
};

// Validar configuración al cargar
if (config.nodeEnv === 'production') {
  validateConfig();
}

module.exports = config;
