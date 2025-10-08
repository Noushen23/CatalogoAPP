import { api } from './api'
import { AuthResponse, User } from '@/types'

// Claves para localStorage
const TOKEN_KEY = 'admin_token'
const USER_KEY = 'admin_user'

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password })

      if (response.data.success && response.data.data) {
        const data = response.data.data
        const userData = data.user || data // Backend puede devolver user en un objeto anidado
        const token = data.token
        
        const user: User = {
          id: userData.id,
          email: userData.email,
          fullName: userData.nombreCompleto || userData.fullName, // Backend usa nombreCompleto
          isActive: userData.activo || userData.isActive, // Backend usa activo
          roles: userData.rol || userData.roles, // Backend usa rol
          createdAt: userData.fechaCreacion || userData.createdAt || new Date().toISOString(),
          updatedAt: userData.fechaActualizacion || userData.updatedAt || new Date().toISOString(),
        }
        
        if (!user || !token) {
          return null
        }

        // Guardar token y usuario en localStorage
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(USER_KEY, JSON.stringify(user))

        // Configurar token en las peticiones de API
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`

        return { user, token }
      }
      return null
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Login error:', error.message)
      }
      return null
    }
  },

  async checkStatus(): Promise<{ user: User; token: string } | null> {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const userStr = localStorage.getItem(USER_KEY)

      if (!token || !userStr) {
        return null
      }

      const user = JSON.parse(userStr) as User

      // Verificar que el token no haya expirado y el usuario sea admin
      if (user.roles === 'admin') {
        // Configurar token en las peticiones de API
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        return { user, token }
      }

      return null
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
      return user.roles === 'admin'
    } catch {
      return false
    }
  }
}
