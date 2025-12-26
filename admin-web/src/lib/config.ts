// Configuración centralizada del admin-web
export const CONFIG = {
  // API Configuration
  // 192.168.3.6: Servidor local (API principal)
  // 181.49.225.64: IP pública (producción)
  API: {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://192.168.3.6:3001/api/v1',
    TIMEOUT: 15000,
    MAX_RETRIES: 2,
  },
  
  // Apimaterial Configuration
  // 192.168.3.104: Base de datos TNS (Apimaterial)
  APIMATERIAL: {
    BASE_URL: process.env.NEXT_PUBLIC_APIMATERIAL_URL || 'http://192.168.3.104:51250',
    TOKEN: process.env.NEXT_PUBLIC_APIMATERIAL_TOKEN || 'angeldavidcapa2025',
    TIMEOUT: 10000,
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

// Tipos derivados de la configuración
export type CacheKey = typeof CONFIG.CACHE_KEYS[keyof typeof CONFIG.CACHE_KEYS]
export type Route = typeof CONFIG.ROUTES[keyof typeof CONFIG.ROUTES]
export type StorageKey = typeof CONFIG.STORAGE[keyof typeof CONFIG.STORAGE]

