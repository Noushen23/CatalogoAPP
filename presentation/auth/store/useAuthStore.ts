import { create } from 'zustand';
import { User } from '@/core/auth/interface/user';
import { authApi, LoginRequest, RegisterRequest } from '@/core/api/authApi';

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'checking';

export interface AuthState {
  status: AuthStatus;
  token?: string;
  user?: User;
  error?: string;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  register: (nombreCompleto: string, nombre: string, segundoNombre: string | undefined, primerApellido: string, segundoApellido: string | undefined, email: string, password: string, telefono?: string, tipo_identificacion?: 'CC' | 'NIT' | 'CE' | 'TR', numero_identificacion?: string) => Promise<boolean>;
  checkStatus: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;

  changeStatus: (token?: string, user?: User) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  // Properties
  status: 'checking',
  token: undefined,
  user: undefined,
  error: undefined,
  isAuthenticated: false,

  // Actions
  changeStatus: async (token?: string, user?: User) => {
    if (!user || !token) {
      set({ status: 'unauthenticated', token: undefined, user: undefined, error: undefined, isAuthenticated: false });
      return false;
    }

    set({
      status: 'authenticated',
      token: token,
      user: user,
      error: undefined,
      isAuthenticated: true,
    });

    return true;
  },

  login: async (email: string, password: string) => {
    try {
      set({ status: 'checking', error: undefined, isAuthenticated: false });
      
      const loginData: LoginRequest = { email, password };
      const response = await authApi.login(loginData);
      
      if (response.success && response.data) {
        return await get().changeStatus(response.data.token, response.data.user);
      } else {
        set({ 
          status: 'unauthenticated', 
          error: response.message || 'Error en el login',
          isAuthenticated: false
        });
        return false;
      }
    } catch (error) {
      set({ 
        status: 'unauthenticated', 
        error: error instanceof Error ? error.message : 'Error de conexión',
        isAuthenticated: false
      });
      return false;
    }
  },

  register: async (nombreCompleto: string, nombre: string, segundoNombre: string | undefined, primerApellido: string, segundoApellido: string | undefined, email: string, password: string, telefono?: string, tipo_identificacion?: 'CC' | 'NIT' | 'CE' | 'TR', numero_identificacion?: string) => {
    try {
      set({ status: 'checking', error: undefined, isAuthenticated: false });
      
      const registerData: RegisterRequest = { 
        nombreCompleto,
        nombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        email, 
        password, 
        telefono,
        tipo_identificacion,
        numero_identificacion
      };
      const response = await authApi.register(registerData);
      
      if (response.success && response.data) {
        // Autenticar automáticamente después del registro
        console.log('✅ Registro exitoso. Autenticando usuario...');
        
        // Si hay una advertencia, loguearla
        if (response.warning) {
          console.log('⚠️ ADVERTENCIA:', response.warning);
        }
        
        return await get().changeStatus(response.data.token, response.data.user);
      } else {
        set({ 
          status: 'unauthenticated', 
          error: response.message || 'Error en el registro',
          isAuthenticated: false
        });
        return false;
      }
    } catch (error) {
      set({ 
        status: 'unauthenticated', 
        error: error instanceof Error ? error.message : 'Error de conexión',
        isAuthenticated: false
      });
      return false;
    }
  },

  checkStatus: async () => {
    try {
      set({ status: 'checking', error: undefined, isAuthenticated: false });
      
      // Cargar token guardado
      const token = await authApi.loadStoredToken();
      if (!token) {
        set({ status: 'unauthenticated', isAuthenticated: false });
        return;
      }

      // Validar formato del token antes de hacer petición al servidor
      if (!authApi.validateTokenFormat(token)) {
        set({ status: 'unauthenticated', isAuthenticated: false });
        await authApi.logout(); // Limpiar token con formato inválido
        return;
      }

      // Verificar estado con el servidor
      const response = await authApi.getStatus();
      
      if (response.success && response.data) {
        await get().changeStatus(token, response.data);
      } else {
        // Token inválido o expirado - limpiar sin mostrar error
        set({ status: 'unauthenticated', isAuthenticated: false });
        await authApi.logout(); // Limpiar token inválido
      }
    } catch (error) {
      // Token expirado o inválido - limpiar silenciosamente
      set({ status: 'unauthenticated', isAuthenticated: false });
      await authApi.logout(); // Limpiar token en caso de error
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      set({ status: 'unauthenticated', token: undefined, user: undefined, error: undefined, isAuthenticated: false });
    }
  },

  clearError: () => {
    set({ error: undefined });
  },
}));
