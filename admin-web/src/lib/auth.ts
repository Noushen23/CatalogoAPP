import { api } from './api'
import { AuthResponse, User } from '@/types'

// Claves para localStorage
const TOKEN_KEY = 'admin_token'
const USER_KEY = 'admin_user'

// Roles permitidos para acceder a admin-web
const ALLOWED_ROLES = ['admin', 'moderator', 'repartidor'] as const

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password })

      if (response.data.success && response.data.data) {
        const data = response.data.data
        const userData = data.user || data // Backend puede devolver user en un objeto anidado
        const token = data.token
        
        // Mapear datos del backend al formato del frontend
        // El backend devuelve: nombreCompleto, activo, rol, fechaCreacion, fechaActualizacion
        // El frontend espera: fullName, isActive, roles, createdAt, updatedAt
        const user: User = {
          id: userData.id,
          email: userData.email,
          fullName: userData.nombreCompleto ?? '',
          isActive: userData.activo ?? true,
          roles: userData.rol as User['roles'],
          createdAt: userData.fechaCreacion ?? new Date().toISOString(),
          updatedAt: userData.fechaActualizacion ?? new Date().toISOString(),
        }
        
        if (!user || !token) {
          console.error('❌ Login: Usuario o token faltante')
          return null
        }

        // Verificar que el usuario tenga un rol permitido antes de guardar
        if (!ALLOWED_ROLES.includes(user.roles as typeof ALLOWED_ROLES[number])) {
          console.error('❌ Login: Rol no permitido:', user.roles)
          return null
        }

        // Guardar token y usuario en localStorage
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(USER_KEY, JSON.stringify(user))

        // Configurar token en las peticiones de API
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`

        console.log('✅ Login exitoso:', { email: user.email, role: user.roles })
        return { user, token }
      }
      console.error('❌ Login: Respuesta inválida del servidor')
      return null
    } catch (error: any) {
      console.error('❌ Login error:', error.response?.data || error.message)
      return null
    }
  },

  async checkStatus(): Promise<{ user: User; token: string } | null> {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const userStr = localStorage.getItem(USER_KEY)

      if (!token || !userStr) {
        console.log('⚠️ checkStatus: No hay token o usuario en localStorage')
        return null
      }

      const user = JSON.parse(userStr) as User

      // Verificar que el usuario tenga un rol permitido
      if (!ALLOWED_ROLES.includes(user.roles as typeof ALLOWED_ROLES[number])) {
        console.error('❌ checkStatus: Rol no permitido:', user.roles, 'Roles permitidos:', ALLOWED_ROLES)
        return null
      }

      // Configurar token en las peticiones de API
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      console.log('✅ checkStatus: Usuario autenticado:', { email: user.email, role: user.roles })
      return { user, token }
    } catch (error) {
      console.error('❌ Error verificando estado:', error)
      return null
    }
  },

  logout(): void {
    // Limpiar localStorage
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    
    // Limpiar headers de autorización
    delete api.defaults.headers.common['Authorization']
    
    // Redirigir al login
    window.location.href = '/'
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem(TOKEN_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    
    if (!token || !userStr) {
      return false
    }

    try {
      const user = JSON.parse(userStr) as User
      return ALLOWED_ROLES.includes(user.roles as typeof ALLOWED_ROLES[number])
    } catch {
      return false
    }
  },

  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem(USER_KEY)
      if (!userStr) {
        return null
      }
      return JSON.parse(userStr) as User
    } catch {
      return null
    }
  },

  hasRole(...roles: string[]): boolean {
    const user = this.getCurrentUser()
    if (!user) {
      return false
    }
    return roles.includes(user.roles)
  },

  // isAdvisor(): boolean { // COMENTADO - MÓDULO DE ASESOR NO EN USO
  //   return this.hasRole('admin', 'moderator')
  // },

  isRepartidor(): boolean {
    return this.hasRole('repartidor', 'user')
  }
}
