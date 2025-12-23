require('dotenv').config();

// Log de variables de entorno relacionadas con URLs (solo al cargar el módulo)
console.log('🔍 [Config] Variables de entorno detectadas:', {
  API_BASE_URL: process.env.API_BASE_URL || 'NO CONFIGURADA',
  APP_URL: process.env.APP_URL || 'NO CONFIGURADA',
  NODE_ENV: process.env.NODE_ENV || 'NO CONFIGURADA'
});

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
    origin: function (origin, callback) {
      // IMPORTANTE: Las apps móviles (React Native/Expo) NO envían origin header
      // Por lo tanto, siempre permitir requests sin origin
      if (!origin) {
        return callback(null, true);
      }
      
      const allowedOrigins = [
        'http://localhost:3000', 
        'http://localhost:8081', // Expo web
        'http://localhost:8082', // Expo web alternativo
        'http://192.168.3.104:3000', // Admin web específico
        'http://192.168.3.104:3001', // Android emulator
        'http://192.168.1.106:3000', // Admin web IP pública
        'http://192.168.1.106:3001', // API IP pública
        'http://181.49.225.64:3000', // Admin web servidor remoto
        'http://181.49.225.64:3001', // API servidor remoto
      ];
      
      // Patrones para IPs locales, públicas y servidor remoto
      const patterns = [
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Cualquier IP local 192.168.x.x con cualquier puerto
        /^http:\/\/181\.49\.225\.\d+:\d+$/, // IP del servidor remoto con cualquier puerto
        /^http:\/\/10\.0\.2\.\d+:\d+$/, // Android emulator
        /^http:\/\/localhost:\d+$/, // Cualquier puerto localhost
        /^http:\/\/127\.0\.0\.1:\d+$/ // Cualquier puerto 127.0.0.1
      ];
      
      // Verificar origins específicos
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Verificar patrones
      for (const pattern of patterns) {
        if (pattern.test(origin)) {
          return callback(null, true);
        }
      }
      
      // En desarrollo, permitir cualquier origin
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      // En producción, por seguridad, solo permitir origins conocidos
      // PERO las apps móviles no tienen origin, así que ya fueron permitidas arriba
      console.warn('⚠️ CORS: Origin no permitido:', origin);
      callback(new Error('No permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'Content-Type', 'Cache-Control'],
    optionsSuccessStatus: 200
  },
  
  // Configuración de la aplicación
  app: {
    name: process.env.APP_NAME || 'Tienda Móvil',
    version: process.env.APP_VERSION || '1.0.0',
    url: process.env.APP_URL || process.env.API_BASE_URL || 'http://181.49.225.64:3001'
  },
  
  // Configuración de email (opcional)
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || 'angeldavidcapa@gmail.com',
    pass: process.env.SMTP_PASS || 'idot czou irjt pouq',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'angeldavidcapa@gmail.com',
    supportEmail: process.env.SUPPORT_EMAIL || process.env.SMTP_USER || 'angeldavidcapa@gmail.com',
    enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  },
  // Configuración de archivos
  uploads: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    path: process.env.UPLOADS_PATH || './uploads'
  },

  // URL base para construir URLs de imágenes (SIEMPRE usar IP pública)
  // FORZAR IP pública para que las imágenes sean accesibles desde cualquier lugar
  apiBaseUrl: (() => {
    // IP pública del servidor (siempre usar esta para imágenes)
    const IP_PUBLICA = '181.49.225.64';
    const PUERTO = process.env.PORT || 3001;
    const apiBaseUrl = `http://${IP_PUBLICA}:${PUERTO}`;
    
    console.log('🔧 [Config] Configurando apiBaseUrl (FORZADO a IP pública):', {
      API_BASE_URL_ENV: process.env.API_BASE_URL || 'NO CONFIGURADA',
      APP_URL_ENV: process.env.APP_URL || 'NO CONFIGURADA',
      IP_PUBLICA_FORZADA: IP_PUBLICA,
      PUERTO: PUERTO,
      valorFinal: apiBaseUrl,
      nota: 'Las imágenes siempre usarán la IP pública para ser accesibles desde cualquier red'
    });
    
    return apiBaseUrl;
  })(),
  
  // Configuración de rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // máximo 1000 requests por IP por ventana (aumentado para desarrollo)
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  },

  

  // Configuración de la API de Terceros
  terceroApi: {
    url: process.env.TERCERO_API_URL || 'http://localhost:51255',
    token: process.env.TERCERO_API_TOKEN || 'angeldavidcapa2025'
  },

  // Configuración de APIs de Mapas
  maps: {
    provider: process.env.MAPS_PROVIDER || 'google', // 'google' o 'mapbox'
    google: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY || ''
    },
    mapbox: {
      accessToken: process.env.MAPBOX_ACCESS_TOKEN || ''
    }
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
