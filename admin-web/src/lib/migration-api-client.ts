import axios, { AxiosError, AxiosResponse } from 'axios'

// Cliente API específico para migración de órdenes (ApiPedidoVenta)
// 192.168.3.6: Servidor local
// 192.168.3.104: Base de datos TNS (si la migración se hace desde Apimaterial)
const MIGRATION_API_URL = process.env.NEXT_PUBLIC_MIGRATION_API_URL || 'http://192.168.3.6:51250/api'

export const migrationApiClient = axios.create({
  baseURL: MIGRATION_API_URL,
  timeout: 30000, // 30 segundos para operaciones de migración
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 3,
  validateStatus: (status) => status < 500,
})

// Interceptor de request para agregar token de auth (si es necesario)
migrationApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor de response para manejo de errores específicos de migración
migrationApiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Migration API Error:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data,
      })
    }

    const status = error.response?.status
    const errorData = error.response?.data as any

    // Manejo específico de errores de migración
    if (status === 400) {
      // Errores de validación específicos de migración
      if (errorData?.error === 'TNS_ENTITY_NOT_FOUND') {
        console.error('🚨 Entidad TNS no encontrada:', errorData.message)
      } else if (errorData?.error === 'INVALID_CLIENT') {
        console.error('🚨 Cliente inválido:', errorData.message)
      } else if (errorData?.error === 'VALIDATION_ERROR') {
        console.error('🚨 Error de validación:', errorData.message)
      }
    } else if (status === 404) {
      console.error('🚨 Orden no encontrada para migración')
    } else if (status === 503) {
      console.error('🚨 Servicio de migración no disponible')
    } else if (typeof status === 'number' && status >= 500) {
      console.error('🚨 Error interno del servidor de migración')
    }

    return Promise.reject(error)
  }
)

export default migrationApiClient
