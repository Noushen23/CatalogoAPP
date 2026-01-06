import axios, { AxiosError, AxiosResponse } from 'axios'
import { getMigrationApiUrl } from './config'

// Cliente API específico para migración de órdenes (ApiPedidoVenta)
// Usar configuración centralizada
const MIGRATION_API_URL = getMigrationApiUrl()





// Log de la URL en desarrollo para verificación
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 Migration API Client inicializado con URL:', MIGRATION_API_URL)
}








export const migrationApiClient = axios.create({
  baseURL: MIGRATION_API_URL,
  timeout: 30000, // 30 segundos para operaciones de migración
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 3,
  validateStatus: (status) => status < 500,
})


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
