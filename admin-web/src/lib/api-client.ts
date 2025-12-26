import axios, { AxiosError, AxiosResponse } from 'axios'

// 192.168.3.6: Servidor local (API principal)
// 181.49.225.64: IP pública (producción)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.3.6:3001/api'

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 3,
  validateStatus: (status) => status < 500,
})

// Interceptor de request para agregar token de auth
apiClient.interceptors.request.use(
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
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (process.env.NODE_ENV === 'development') {
      const errorData = error.response?.data || {};
      console.error('API Error:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
        data: errorData,
        responseData: error.response?.data,
      })
    }

    const status = error.response?.status

    if (status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      delete apiClient.defaults.headers.common['Authorization']
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
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



