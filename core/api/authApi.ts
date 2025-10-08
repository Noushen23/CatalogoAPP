import { apiClient, ApiResponse } from './apiClient';

// Interfaces para autenticación
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  nombreCompleto: string;
  password: string;
  telefono?: string;
  direccion?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface User {
  id: string;
  email: string;
  nombreCompleto: string;
  telefono?: string;
  direccion?: string;
  rol: 'cliente' | 'admin' | 'vendedor';
  emailVerificado: boolean;
  fechaCreacion: string;
  ultimoAcceso?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

// Servicios de autenticación
export const authApi = {
  // Registrar usuario
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    
    // Guardar token automáticamente (para autenticación inmediata después del registro)
    if (response.success && response.data?.token) {
      await apiClient.setToken(response.data.token);
    }
    
    return response;
  },

  // Iniciar sesión
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    
    // Guardar token automáticamente
    if (response.success && response.data?.token) {
      await apiClient.setToken(response.data.token);
    }
    
    return response;
  },

  // Cerrar sesión
  async logout(): Promise<ApiResponse> {
    // Verificar si hay token antes de hacer la petición
    const token = await apiClient.loadToken();
    if (!token) {
      // No hay token, solo limpiar localmente
      await apiClient.clearToken();
      return { success: true, message: 'Sesión cerrada localmente' };
    }

    try {
      const response = await apiClient.post('/auth/logout');
      
      // Limpiar token automáticamente
      await apiClient.clearToken();
      
      return response;
    } catch (error) {
      // Si hay error (token expirado), solo limpiar localmente
      await apiClient.clearToken();
      return { success: true, message: 'Sesión cerrada localmente' };
    }
  },

  // Verificar estado de autenticación
  async getStatus(): Promise<ApiResponse<User>> {
    return await apiClient.get<User>('/auth/status');
  },

  // Renovar token
  async refreshToken(data: RefreshTokenRequest): Promise<ApiResponse<RefreshTokenResponse>> {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh-token', data);
    
    // Guardar nuevo token automáticamente
    if (response.success && response.data?.token) {
      await apiClient.setToken(response.data.token);
    }
    
    return response;
  },

  // Cambiar contraseña
  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse> {
    return await apiClient.post('/auth/change-password', data);
  },

  // Cargar token guardado
  async loadStoredToken(): Promise<string | null> {
    return await apiClient.loadToken();
  },

  // Verificar si hay token guardado
  async hasStoredToken(): Promise<boolean> {
    const token = await apiClient.loadToken();
    return token !== null;
  },

  // Validar token básico (sin hacer petición al servidor)
  validateTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Verificar que el token tenga el formato básico de JWT (3 partes separadas por puntos)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    return true;
  }
};
