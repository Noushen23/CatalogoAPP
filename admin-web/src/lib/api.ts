import axios, { AxiosError, AxiosResponse } from 'axios'

// 192.168.3.6: Servidor local (API principal)
// 181.49.225.64: IP pública (producción)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.3.6:3001/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 3,
  validateStatus: (status) => status < 500,
})

// Interceptor de request para agregar token de auth
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor de response para manejo de errores
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
      })
    }

    const status = error.response?.status

    if (status === 401) {
      console.log('⚠️ API: Error 401 - Token inválido o expirado')
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      delete api.defaults.headers.common['Authorization']
      // Solo redirigir si no estamos ya en la página de login
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        console.log('🔄 API: Redirigiendo al login desde:', window.location.pathname)
        window.location.href = '/'
      }
    } else if (status === 403) {
      if (typeof window !== 'undefined') {
        alert('No tienes permisos para realizar esta acción')
      }
    } else if (typeof status === 'number' && status >= 500) {
      if (typeof window !== 'undefined') {
        alert('Error del servidor. Por favor, intenta más tarde.')
      }
    }

    return Promise.reject(error)
  }
)