require('dotenv').config();

// Log de variables de entorno relacionadas con URLs (solo al cargar el módulo)
console.log('🔍 [Config] Variables de entorno detectadas:', {
  API_BASE_URL: process.env.API_BASE_URL || 'NO CONFIGURADA',
  TERCERO_API_URL: process.env.TERCERO_API_URL || 'NO CONFIGURADA',  
  APIMATERIAL_URL: process.env.APIMATERIAL_URL || 'NO CONFIGURADA',
  APP_URL: process.env.APP_URL || 'NO CONFIGURADA',
  NODE_ENV: process.env.NODE_ENV || 'NO CONFIGURADA',
  NGROK_URL: process.env.NGROK_URL || 'NO CONFIGURADA',
  WOMPI_NGROK_URL: process.env.WOMPI_NGROK_URL || 'NO CONFIGURADA',
  API_URL: process.env.API_URL || 'NO CONFIGURADA'
});

const config = {
  // Configuración del servidor
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
    
  // Configuración JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'angeldavidcapa2025',
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
        'http://192.168.1.120:3000', // Admin web específico
        'http://192.168.1.120:3001', // Android emulator
        'http://181.49.225.69:3000', // Admin web servidor remoto
        'http://181.49.225.69:3001', // API servidor remoto
      ];
      
      // Patrones para IPs locales, públicas y servidor remoto
      const patterns = [
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // 
        /^http:\/\/181\.49\.225\.\d+:\d+$/, // IP del servidor remoto con cualquier puerto
        /^http:\/\/10\.0\.2\.\d+:\d+$/, // Android emulator
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
    url: process.env.APP_URL || process.env.API_BASE_URL || 'http://181.49.225.69:3001'
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

  // URL base para construir URLs de imágenes (fallback si no hay request context)
  apiBaseUrl: (() => {
    const PUERTO = process.env.PORT || 3001;
    const envBaseUrl = process.env.API_BASE_URL || process.env.APP_URL;
    const defaultBaseUrl = `http://181.49.225.69:${PUERTO}`;
    const apiBaseUrl = envBaseUrl || defaultBaseUrl;
    
    console.log('🔧 [Config] Configurando apiBaseUrl (fallback):', {
      API_BASE_URL_ENV: process.env.API_BASE_URL || 'NO CONFIGURADA',
      APP_URL_ENV: process.env.APP_URL || 'NO CONFIGURADA',
      PUERTO: PUERTO,
      valorFinal: apiBaseUrl,
      nota: 'Se usa solo si no hay baseUrl dinámico por request'
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
    // El servidor ApiTercero debe escuchar en 0.0.0.0 para aceptar conexiones de la red
    url: (() => {
      const envUrl = process.env.TERCERO_API_URL;
      const isProduction = process.env.NODE_ENV === 'production';
      
      // En desarrollo, SIEMPRE usar  (ignorar variable de entorno si está mal configurada)
      const defaultUrl = isProduction
        ? 'http://181.49.225.69:51252'  
        : 'http://192.168.3.6:51252';  // IP del servidor en desarrollo
      
      // En desarrollo, SIEMPRE forzar el uso de (ignorar cualquier variable de entorno)
      let finalUrl = defaultUrl;
      if (isProduction && envUrl) {
        // En producción, usar variable de entorno si está configurada
        finalUrl = envUrl;
      }
      // En desarrollo, siempre usar defaultUrl sin importar la variable de entorno
      
      // Log de configuración
      console.log('🔧 Configuración ApiTercero:', {
        'TERCERO_API_URL (env)': envUrl || 'NO CONFIGURADA',
        'URL por defecto (forzada)': defaultUrl,
        'URL final utilizada': finalUrl,
        'NODE_ENV': process.env.NODE_ENV || 'development',
      });
      
      return finalUrl;
    })(),
    token: process.env.TERCERO_API_TOKEN || 'angeldavidcapa2025'
  },

  apimaterial: {
    url: process.env.APIMATERIAL_URL || 'http://192.168.3.6:51255',
    token: process.env.APIMATERIAL_TOKEN || 'angeldavidcapa2025',
    timeout: parseInt(process.env.APIMATERIAL_TIMEOUT, 10) || 10000
  },

  shipping: {
    domicilioMatId: process.env.DOMICILIO_MATID || 1553,
    domicilioCodigo: process.env.DOMICILIO_CODIGO || 'DOMICILIO'
  },



  // Configuración de Wompi (Pasarela de Pagos)
  wompi: {
    // URL base de producción
    urlBase: process.env.WOMPI_URL_BASE || 'https://production.wompi.co/v1',
    // URL base de pruebas/sandbox
    urlBasePruebas: process.env.WOMPI_URL_BASE_PRUEBAS || 'https://sandbox.wompi.co/v1',
    // Clave pública (para usar en frontend)
    clavePublica: process.env.WOMPI_CLAVE_PUBLICA || '',
    // Clave privada (solo backend, nunca exponer)
    clavePrivada: process.env.WOMPI_CLAVE_PRIVADA || '',
    // Clave de integridad (para validar webhooks)
    claveIntegridad: process.env.WOMPI_CLAVE_INTEGRIDAD || '',
    // Ambiente: 'produccion' o 'pruebas'
    ambiente: process.env.WOMPI_AMBIENTE || 'pruebas',
    // Moneda por defecto
    moneda: process.env.WOMPI_MONEDA || 'COP',
    // URL de redirección después del pago exitoso
    urlRedireccion: process.env.WOMPI_URL_REDIRECCION || '',
    // URL de redirección en caso de error
    urlRedireccionError: process.env.WOMPI_URL_REDIRECCION_ERROR || ''
  },

  checkoutReconciliation: {
    enabled: process.env.CHECKOUT_RECONCILIATION_ENABLED !== 'false',
    cron: process.env.CHECKOUT_RECONCILIATION_CRON || '*/5 * * * *'
  },

  // Configuración de timeouts de checkout por método de pago (en minutos)
  checkoutTimeouts: {
    defaultMinutes: parseInt(process.env.CHECKOUT_TIMEOUT_DEFAULT_MINUTES || '15', 10),
    tarjetaMinutes: parseInt(process.env.CHECKOUT_TIMEOUT_TARJETA_MINUTES || '15', 10),
    pseMinutes: parseInt(process.env.CHECKOUT_TIMEOUT_PSE_MINUTES || '15', 10),
    nequiMinutes: parseInt(process.env.CHECKOUT_TIMEOUT_NEQUI_MINUTES || '15', 10),
    bancolombiaMinutes: parseInt(process.env.CHECKOUT_TIMEOUT_BANCOLOMBIA_MINUTES || '15', 10)
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
  
  if (config.jwt.secret === 'angeldavidcapa2025') {
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
