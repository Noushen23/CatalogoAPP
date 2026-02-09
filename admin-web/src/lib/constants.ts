// Constantes de estado de producto
export const PRODUCT_STATUS_OPTIONS = [
  { value: 'active', label: 'Activo', color: 'text-green-600 bg-green-100' },
  { value: 'inactive', label: 'Inactivo', color: 'text-red-600 bg-red-100' },
] as const

// Constantes de filtros de precio
export const PRICE_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los precios' },
  { value: 'lt100', label: 'Menos de $100' },
  { value: '100-500', label: '$100 - $500' },
  { value: '500-1000', label: '$500 - $1000' },
  { value: 'gt1000', label: 'Más de $1000' },
] as const

// Constantes de filtros de stock
export const STOCK_FILTER_OPTIONS = [
  { value: 'all', label: 'Todo el stock' },
  { value: 'in_stock', label: 'En stock (>10)' },
  { value: 'low_stock', label: 'Stock bajo (1-10)' },
  { value: 'out_of_stock', label: 'Sin stock (0)' },
] as const

// Constantes de filtros de estado
export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
] as const

// Constantes de paginación
export const PAGINATION_OPTIONS = [
  { value: 10, label: '10 por página' },
  { value: 25, label: '25 por página' },
  { value: 50, label: '50 por página' },
  { value: 100, label: '100 por página' },
] as const

// Constantes de ordenamiento
export const SORT_OPTIONS = [
  { value: 'title-asc', label: 'Nombre (A-Z)' },
  { value: 'title-desc', label: 'Nombre (Z-A)' },
  { value: 'price-asc', label: 'Precio (Menor a Mayor)' },
  { value: 'price-desc', label: 'Precio (Mayor a Menor)' },
  { value: 'stock-asc', label: 'Stock (Menor a Mayor)' },
  { value: 'stock-desc', label: 'Stock (Mayor a Menor)' },
  { value: 'created-asc', label: 'Fecha de creación (Más reciente)' },
  { value: 'created-desc', label: 'Fecha de creación (Más antiguo)' },
] as const

// Constantes de tipos de archivo permitidos
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const

// Constantes de tamaños de archivo
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
} as const

// Constantes de mensajes de error
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Este campo es obligatorio',
  INVALID_EMAIL: 'Ingresa un email válido',
  INVALID_URL: 'Ingresa una URL válida',
  INVALID_NUMBER: 'Ingresa un número válido',
  MIN_LENGTH: (min: number) => `Mínimo ${min} caracteres`,
  MAX_LENGTH: (max: number) => `Máximo ${max} caracteres`,
  MIN_VALUE: (min: number) => `Valor mínimo: ${min}`,
  MAX_VALUE: (max: number) => `Valor máximo: ${max}`,
  FILE_TOO_LARGE: (maxSize: string) => `El archivo es demasiado grande. Máximo: ${maxSize}`,
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido',
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
  UNAUTHORIZED: 'No tienes permisos para realizar esta acción',
  NOT_FOUND: 'Recurso no encontrado',
} as const

// Constantes de mensajes de éxito
export const SUCCESS_MESSAGES = {
  PRODUCT_CREATED: 'Producto creado exitosamente',
  PRODUCT_UPDATED: 'Producto actualizado exitosamente',
  PRODUCT_DELETED: 'Producto eliminado exitosamente',
  CATEGORY_CREATED: 'Categoría creada exitosamente',
  CATEGORY_UPDATED: 'Categoría actualizada exitosamente',
  CATEGORY_DELETED: 'Categoría eliminada exitosamente',
  IMAGE_UPLOADED: 'Imagen subida exitosamente',
  IMAGE_DELETED: 'Imagen eliminada exitosamente',
} as const

// Constantes de validación
export const VALIDATION_RULES = {
  PRODUCT_TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  PRODUCT_DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 1000,
  },
  PRODUCT_PRICE: {
    MIN: 0,
    MAX: 999999.99,
  },
  PRODUCT_STOCK: {
    MIN: 0,
    MAX: 9999,
  },
  CATEGORY_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  TAG_LENGTH: {
    MIN: 2,
    MAX: 20,
  },
  MAX_TAGS: 10,
} as const

// Constantes de colores para gráficos
export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
] as const

