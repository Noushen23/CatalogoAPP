

// ============================================
// Configuración de Servidores
// ============================================

// IPs y puertos base
const SERVER_CONFIG = {
  // Servidor local (API principal)
  LOCAL: {
    HOST: '192.168.3.104',
    PORT: 3001,
  },
  // Base de datos TNS (Apimaterial)
  TNS: {
    HOST: '192.168.3.104',
    PORT: 51255,
  },
  // IP pública (producción)
  PUBLIC: {
    HOST: '192.168.3.104',
    PORT: 3001,
  },
} as const

// Helper para construir URLs
const buildUrl = (host: string, port: number, path: string = '') => {
  return `http://${host}:${port}${path}`
}

// ============================================
// Configuración Principal
// ============================================
export const CONFIG = {
  // API Configuration
  API: {
    // URL base del servidor (sin /api/v1)
    BASE_SERVER: process.env.NEXT_PUBLIC_API_BASE_URL || buildUrl(SERVER_CONFIG.LOCAL.HOST, SERVER_CONFIG.LOCAL.PORT),
    // URL completa con /api/v1
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || buildUrl(SERVER_CONFIG.LOCAL.HOST, SERVER_CONFIG.LOCAL.PORT, '/api/v1'),
    // URL alternativa con /api (sin /v1)
    BASE_URL_ALT: process.env.NEXT_PUBLIC_API_URL_ALT || buildUrl(SERVER_CONFIG.LOCAL.HOST, SERVER_CONFIG.LOCAL.PORT, '/api'),
    TIMEOUT: 15000,
    MAX_RETRIES: 2,
  },
  
  // Apimaterial Configuration
  APIMATERIAL: {
    BASE_URL: process.env.NEXT_PUBLIC_APIMATERIAL_URL || buildUrl(SERVER_CONFIG.TNS.HOST, SERVER_CONFIG.TNS.PORT),
    TOKEN: process.env.NEXT_PUBLIC_APIMATERIAL_TOKEN || 'angeldavidcapa2025',
    TIMEOUT: 10000,
  },
  

  // Migration API Configuration
  // IMPORTANTE: ApiPedidoVenta corre en el puerto 51250, NO en 3001
  // URL: http://192.168.3.6:51250/api
  MIGRATION: {
    // Forzar URL correcta - ApiPedidoVenta en puerto 51250
    BASE_URL: process.env.NEXT_PUBLIC_MIGRATION_API_URL || `http://${SERVER_CONFIG.TNS.HOST}:${SERVER_CONFIG.TNS.PORT}/api`,
    TIMEOUT: 30000,
  },





// Nota: ApiTercero corre en el puerto 51255 para gestión de terceros/clientes
  TERCERO: {
    BASE_URL: process.env.NEXT_PUBLIC_TERCERO_API_URL || buildUrl(SERVER_CONFIG.LOCAL.HOST, 51255, '/api'),
    TOKEN: process.env.NEXT_PUBLIC_TERCERO_API_TOKEN || 'angeldavidcapa2025',
    TIMEOUT: 10000,
  },
  
  // Image Upload Configuration
  IMAGES: {
    // URL base para imágenes (uploads)
    UPLOAD_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || buildUrl(SERVER_CONFIG.LOCAL.HOST, SERVER_CONFIG.LOCAL.PORT),
    UPLOAD_PATH: '/uploads',
  },
  
  // React Query Configuration
  QUERY: {
    STALE_TIME: 5 * 60 * 1000, // 5 minutes
    GC_TIME: 10 * 60 * 1000, // 10 minutes
    RETRY_DELAY: 1000,
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
  },
  
  // File Upload
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    MAX_FILES: 10,
  },
  
  // Cache Keys
  CACHE_KEYS: {
    PRODUCTS: 'admin-products',
    CATEGORIES: 'admin-categories',
    DASHBOARD_STATS: 'dashboard-stats',
    TOP_PRODUCTS: 'top-products',
    RECENT_ORDERS: 'recent-orders',
  },
  
  // Routes
  ROUTES: {
    LOGIN: '/',
    DASHBOARD: '/dashboard',
    PRODUCTS: '/dashboard/products',
    CATEGORIES: '/dashboard/categories',
  },
  
  // Storage Keys
  STORAGE: {
    TOKEN: 'admin_token',
    USER: 'admin_user',
    THEME: 'admin_theme',
  },
} as const

// ============================================
// Funciones Helper para URLs
// ============================================

/**
 * Obtiene la URL base del servidor (sin /api/v1)
 * Útil para construir URLs de imágenes o recursos
 */
export const getApiBaseUrl = (): string => {
  return CONFIG.API.BASE_SERVER
}

/**
 * Obtiene la URL completa de la API (/api/v1)
 */
export const getApiUrl = (): string => {
  return CONFIG.API.BASE_URL
}

/**
 * Obtiene la URL alternativa de la API (/api)
 */
export const getApiUrlAlt = (): string => {
  return CONFIG.API.BASE_URL_ALT
}

/**
 * Construye una URL completa para una imagen
 */
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http')) return imagePath
  const baseUrl = CONFIG.IMAGES.UPLOAD_BASE_URL
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${baseUrl}${cleanPath}`
}

/**
 * Obtiene la URL de Apimaterial
 */
export const getApimaterialUrl = (): string => {
  return CONFIG.APIMATERIAL.BASE_URL
}





/**
 * Obtiene la URL de Migration API
 * IMPORTANTE: ApiPedidoVenta corre en puerto 51250, NO en 3001
 */
export const getMigrationApiUrl = (): string => {
  const url = CONFIG.MIGRATION.BASE_URL
  
  // Validación: asegurar que no esté usando el puerto incorrecto
  if (url.includes(':3001')) {
    console.warn('⚠️ ADVERTENCIA: URL de migración apunta al puerto 3001 (incorrecto). Debe ser 51250')
    // Forzar URL correcta
    return `http://${SERVER_CONFIG.TNS.HOST}:${SERVER_CONFIG.TNS.PORT}/api`
  }
  
  // Log en desarrollo para verificar URL
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 Migration API URL:', url)
  }
  
  return url
}



/**
 * Obtiene la URL de ApiTercero
 */
export const getTerceroApiUrl = (): string => {
  return CONFIG.TERCERO.BASE_URL
}

// Tipos derivados de la configuración
export type CacheKey = typeof CONFIG.CACHE_KEYS[keyof typeof CONFIG.CACHE_KEYS]
export type Route = typeof CONFIG.ROUTES[keyof typeof CONFIG.ROUTES]
export type StorageKey = typeof CONFIG.STORAGE[keyof typeof CONFIG.STORAGE]

