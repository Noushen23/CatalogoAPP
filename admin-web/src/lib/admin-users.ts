import { api } from './api'

// Tipos para usuarios
export interface AdminUser {
  id: string
  email: string
  nombreCompleto: string
  telefono?: string
  direccion?: string
  tipoIdentificacion?: string
  numeroIdentificacion?: string
  rol: 'cliente' | 'admin'
  emailVerificado: boolean
  activo: boolean
  fechaCreacion: string
  fechaActualizacion?: string
  ultimoAcceso?: string
}

interface BackendUser {
  id?: string
  email?: string
  nombre_completo?: string
  nombreCompleto?: string
  telefono?: string
  direccion?: string
  tipo_identificacion?: string
  tipoIdentificacion?: string
  numero_identificacion?: string
  numeroIdentificacion?: string
  rol?: string
  email_verificado?: boolean
  emailVerificado?: boolean
  activo?: boolean
  fecha_creacion?: string
  fechaCreacion?: string
  createdAt?: string
  fecha_actualizacion?: string
  fechaActualizacion?: string
  updatedAt?: string
  ultimo_acceso?: string
  ultimoAcceso?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface UserFilters {
  search?: string
  rol?: string
  emailVerificado?: boolean
  activo?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Servicio de usuarios para el admin
export const AdminUsersService = {
  // Obtener todos los usuarios con filtros y paginación
  getUsers: async (filters?: UserFilters): Promise<PaginatedResponse<AdminUser>> => {
    try {
      // Limpiar parámetros undefined
      const cleanParams = Object.fromEntries(
        Object.entries(filters || {}).filter(([_, value]) => value !== undefined && value !== '')
      )
      
      console.warn('📡 AdminUsersService - Llamando API con filters:', cleanParams)
      const response = await api.get('/admin/users', { params: cleanParams })
      console.warn('📡 AdminUsersService - Respuesta recibida:', response.data)
      
      // El backend devuelve: { success: true, data: { users: [...], pagination: {...} } }
      if (response.data?.success && response.data.data?.users) {
        const users = response.data.data.users
        const pagination = response.data.data.pagination
        
        const mappedUsers = users.map((u: BackendUser) => ({
          id: u.id,
          email: u.email,
          nombreCompleto: u.nombre_completo || u.nombreCompleto || '',
          telefono: u.telefono || undefined,
          direccion: u.direccion || undefined,
          tipoIdentificacion: u.tipo_identificacion || u.tipoIdentificacion || undefined,
          numeroIdentificacion: u.numero_identificacion || u.numeroIdentificacion || undefined,
          rol: u.rol || 'cliente',
          emailVerificado: Boolean(u.email_verificado || u.emailVerificado),
          activo: u.activo !== undefined ? u.activo : true,
          fechaCreacion: u.fecha_creacion || u.fechaCreacion || u.createdAt,
          fechaActualizacion: u.fecha_actualizacion || u.fechaActualizacion || u.updatedAt,
          ultimoAcceso: u.ultimo_acceso || u.ultimoAcceso || undefined
        }))
        
        return {
          data: mappedUsers,
          pagination: {
            currentPage: pagination?.page || filters?.page || 1,
            totalPages: pagination?.totalPages || 0,
            totalItems: pagination?.total || 0,
            itemsPerPage: pagination?.limit || filters?.limit || 25,
            hasNextPage: pagination?.hasNextPage || false,
            hasPrevPage: pagination?.hasPrevPage || false
          }
        }
      }
      
      console.warn('❌ AdminUsersService: Formato de respuesta inesperado')
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 25,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    } catch (error) {
      console.error('❌ AdminUsersService: Error fetching users:', error)
      throw error
    }
  },

  // Obtener un usuario por ID
  getUser: async (id: string) => {
    try {
      const response = await api.get(`/admin/users/${id}`)
      
      if (response.data && response.data.success && response.data.data && response.data.data.user) {
        const user = response.data.data.user
        
        const mappedUser = {
          id: user.id,
          email: user.email,
          nombreCompleto: user.nombre_completo || user.nombreCompleto || '',
          telefono: user.telefono || undefined,
          direccion: user.direccion || undefined,
          tipoIdentificacion: user.tipo_identificacion || user.tipoIdentificacion || undefined,
          numeroIdentificacion: user.numero_identificacion || user.numeroIdentificacion || undefined,
          rol: user.rol || 'cliente',
          emailVerificado: Boolean(user.email_verificado || user.emailVerificado),
          activo: user.activo !== undefined ? user.activo : true,
          fechaCreacion: user.fecha_creacion || user.fechaCreacion || user.createdAt,
          fechaActualizacion: user.fecha_actualizacion || user.fechaActualizacion || user.updatedAt,
          ultimoAcceso: user.ultimo_acceso || user.ultimoAcceso || undefined
        }
        
        return {
          success: true,
          data: mappedUser,
          message: response.data.message
        }
      }
      
      throw new Error('Formato de respuesta inesperado')
    } catch (error) {
      console.error('❌ AdminUsersService: Error fetching user:', error)
      throw error
    }
  },

  // Actualizar un usuario
  updateUser: async (id: string, data: Partial<AdminUser>) => {
    try {
      if (!id || typeof id !== 'string') {
        throw new Error('ID de usuario inválido')
      }
      
      const backendData: Record<string, string | boolean | undefined> = {}
      if (data.nombreCompleto !== undefined) backendData.nombre_completo = data.nombreCompleto
      if (data.telefono !== undefined) backendData.telefono = data.telefono
      if (data.direccion !== undefined) backendData.direccion = data.direccion
      if (data.tipoIdentificacion !== undefined) backendData.tipo_identificacion = data.tipoIdentificacion
      if (data.numeroIdentificacion !== undefined) backendData.numero_identificacion = data.numeroIdentificacion
      if (data.rol !== undefined) backendData.rol = data.rol
      if (data.activo !== undefined) backendData.activo = data.activo
      
      const response = await api.put(`/admin/users/${id}`, backendData)
      
      return response.data
    } catch (error) {
      console.error('❌ Error updating user:', error)
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (responseMessage) {
        throw new Error(responseMessage)
      } else if (error instanceof Error && error.message) {
        throw new Error(error.message)
      } else {
        throw new Error('Error desconocido al actualizar el usuario')
      }
    }
  },

  // Eliminar/desactivar un usuario
  deleteUser: async (id: string) => {
    try {
      const response = await api.delete(`/admin/users/${id}`)
      return response.data
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  },

  // Obtener estadísticas de usuarios
  getUserStats: async () => {
    try {
      const response = await api.get('/admin/users/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching user stats:', error)
      throw error
    }
  },
}

export default AdminUsersService
