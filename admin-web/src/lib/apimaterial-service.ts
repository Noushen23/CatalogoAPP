/**
 * Servicio para conectar con Apimaterial (TNS)
 * Integración con la base de datos Firebird de materiales
 */

import axios, { AxiosResponse } from 'axios'
import { CONFIG } from './config'

// Configuración de Apimaterial
const APIMATERIAL_CONFIG = {
  BASE_URL: CONFIG.APIMATERIAL.BASE_URL,
  TOKEN: CONFIG.APIMATERIAL.TOKEN,
  TIMEOUT: CONFIG.APIMATERIAL.TIMEOUT,
}

// Cliente axios para Apimaterial
const apimaterialApi = axios.create({
  baseURL: APIMATERIAL_CONFIG.BASE_URL,
  timeout: APIMATERIAL_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${APIMATERIAL_CONFIG.TOKEN}`,
  },
})

// Interceptor para manejo de errores
apimaterialApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    console.error('Apimaterial API Error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
    })
    return Promise.reject(error)
  }
)

// Tipos para materiales de TNS
export interface MaterialTNS {
  MATID: number
  CODIGO: string
  DESCRIP: string
  UNIDAD: string
  GRUPMATID: number
  TIPOIVAID: number
  INACTIVO: string
  OBSERV?: string
  SUCURSAL_NOMBRE?: string
  PRECIO1?: number
  PRECIO2?: number
  PRECIO3?: number
}

export interface MaterialesResponse {
  success: boolean
  data: MaterialTNS[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  message?: string
}

export interface MaterialFilters {
  page?: number
  limit?: number
  search?: string
  activo?: 'S' | 'N'
  conPrecios?: boolean
}

// Servicio de materiales TNS
export const ApimaterialService = {
  // Obtener todos los materiales
  getMateriales: async (filters?: MaterialFilters): Promise<MaterialesResponse> => {
    try {
      console.log('🔍 ApimaterialService: Obteniendo materiales...')
      console.log('📋 Filtros:', filters)
      
      const response = await apimaterialApi.get('/api/materiales', {
        params: {
          page: filters?.page || 1,
          limit: filters?.limit || 50,
          search: filters?.search,
          activo: filters?.activo,
          conPrecios: filters?.conPrecios || true,
        }
      })
      
      console.log('✅ ApimaterialService: Respuesta recibida:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ ApimaterialService: Error obteniendo materiales:', error)
      throw error
    }
  },

  // Obtener material por ID
  getMaterialById: async (id: number, conPrecios: boolean = true): Promise<MaterialesResponse> => {
    try {
      console.log(`🔍 ApimaterialService: Obteniendo material ID ${id}...`)
      
      const response = await apimaterialApi.get(`/api/materiales/${id}`, {
        params: { conPrecios }
      })
      
      console.log('✅ ApimaterialService: Material obtenido:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ ApimaterialService: Error obteniendo material:', error)
      throw error
    }
  },

  // Obtener material por código
  getMaterialByCodigo: async (codigo: string, conPrecios: boolean = true): Promise<MaterialesResponse> => {
    try {
      console.log(`🔍 ApimaterialService: Obteniendo material código ${codigo}...`)
      
      const response = await apimaterialApi.get(`/api/materiales/codigo/${codigo}`, {
        params: { conPrecios }
      })
      
      console.log('✅ ApimaterialService: Material obtenido:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ ApimaterialService: Error obteniendo material:', error)
      throw error
    }
  },

  // Verificar conexión con Apimaterial
  checkConnection: async (): Promise<boolean> => {
    try {
      console.log('🔍 ApimaterialService: Verificando conexión...')
      
      const response = await apimaterialApi.get('/health')
      console.log('✅ ApimaterialService: Conexión exitosa:', response.data)
      
      return response.data.success === true
    } catch (error) {
      console.error('❌ ApimaterialService: Error de conexión:', error)
      return false
    }
  },

  // Obtener información del sistema
  getSystemInfo: async () => {
    try {
      console.log('🔍 ApimaterialService: Obteniendo información del sistema...')
      
      const response = await apimaterialApi.get('/')
      console.log('✅ ApimaterialService: Info del sistema:', response.data)
      
      return response.data
    } catch (error) {
      console.error('❌ ApimaterialService: Error obteniendo info del sistema:', error)
      throw error
    }
  }
}


export default ApimaterialService
