import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios'
import { CONFIG, getApiUrl, getApiUrlAlt } from './config'

const attachInterceptors = (client: AxiosInstance) => {
  // Interceptor de request para agregar token de auth
  client.interceptors.request.use(
    (config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem(CONFIG.STORAGE.TOKEN)
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Interceptor de response para manejo de errores
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (process.env.NODE_ENV === 'development') {
        const errorData = error.response?.data || {}
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
        if (typeof window !== 'undefined') {
          localStorage.removeItem(CONFIG.STORAGE.TOKEN)
          localStorage.removeItem(CONFIG.STORAGE.USER)
          delete client.defaults.headers.common['Authorization']
          // Solo redirigir si no estamos ya en la página de login
          if (!window.location.pathname.includes('/auth/login') && window.location.pathname !== '/') {
            window.location.href = '/'
          }
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
}

const createApiClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: CONFIG.API.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
    maxRedirects: 3,
    validateStatus: (status) => status >= 200 && status < 300,
  })

  attachInterceptors(client)
  return client
}

// Cliente principal (/api/v1)
export const api = createApiClient(getApiUrl())

// Cliente alterno (/api)
export const apiAlt = createApiClient(getApiUrlAlt())