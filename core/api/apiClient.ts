import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '../config/api.config';

// Detectar si estamos en web
const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Importar SecureStore solo si estamos en una plataforma nativa
let SecureStore: any = null;
if (!isWeb) {
  try {
    SecureStore = require('expo-secure-store');
  } catch (error) {
    console.warn('⚠️ expo-secure-store no disponible');
  }
}

// Tipos para las respuestas de la API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  warning?: string; // Advertencia opcional (ej: duplicado detectado pero continuó)
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Clase para manejar las peticiones HTTP
class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private baseUrlResolved = false;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.API_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: API_CONFIG.DEFAULT_HEADERS,
    });

    this.setupInterceptors();
  }

  // Configurar interceptores
  private setupInterceptors() {
    // Interceptor de request para agregar token
    this.client.interceptors.request.use(
      async (config) => {
        if (!this.baseUrlResolved) {
          const resolvedUrl = await API_CONFIG.getResolvedApiUrl();
          this.client.defaults.baseURL = resolvedUrl;
          config.baseURL = resolvedUrl;
          this.baseUrlResolved = true;
        }

	console.log('API Request:',{
	method: config.method?.toUpperCase(),
	url: config.url,
	baseURL: config.baseURL,
	fullURL: `${config.baseURL}${config.url}`,

	});
	
        // Si no hay token en memoria, intentar cargarlo desde SecureStore
        if (!this.token) {
          await this.loadToken();
        }
        
        // Agregar token al header si existe
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
	console.error('API Request Error:', error)
        return Promise.reject(error);
      }
    );

    // Interceptor de response para manejar errores
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {

	  console.log('✅ API Response:', {
          status: response.status,
          url: response.config.url,
        });


        return response;
      },
      async (error) => {
        // Ignorar errores 404 del carrito cuando no existe (es normal si el usuario no tiene carrito)
        const errorUrl = error.config?.url || '';
        const isCartEndpoint = errorUrl.includes('/cart') && !errorUrl.includes('/cart/history');
        const isCartNotFound = error.response?.status === 404 && 
                               error.response?.data?.message === 'Carrito no encontrado';
        
        if (isCartEndpoint && isCartNotFound) {
          // No loggear como error crítico, solo como warning
          console.warn('⚠️ Carrito no encontrado (esto es normal si el usuario no tiene carrito activo)');
          // Devolver un error más amigable
          return Promise.reject(new Error('Carrito vacío'));
        }

	  // Log detallado del error
        console.error(
          '❌ API Error:',
          JSON.stringify(error.response?.data, null, 2)
        );



        
        if (error.response?.status === 401) {
          const errorUrl = error.config?.url || '';
          const isAuthEndpoint = errorUrl.includes('/auth/login') || errorUrl.includes('/auth/register');
          
          // Si es un endpoint de autenticación (login/register), usar el mensaje del backend
          if (isAuthEndpoint) {
            const backendMessage = error.response?.data?.message || 'Credenciales inválidas';
            // Convertir mensaje genérico del backend a mensaje más específico
            if (backendMessage === 'Credenciales inválidas') {
              return Promise.reject(new Error('Contraseña o email incorrecto'));
            }
            return Promise.reject(new Error(backendMessage));
          }
          
          // Para otros endpoints, es un problema de token
          await this.clearToken();
          return Promise.reject(new Error('Token inválido o expirado'));
        }
        return Promise.reject(error);
      }
    );
  }

  // Establecer token de autenticación
  async setToken(token: string) {
    this.token = token;
    try {
      if (isWeb) {
        // Usar localStorage en web
        localStorage.setItem('auth_token', token);
        console.log('✅ Token guardado en localStorage');
      } else if (SecureStore) {
        // Usar SecureStore en móvil
        await SecureStore.setItemAsync('auth_token', token);
        console.log('✅ Token guardado en SecureStore');
      } else {
        console.warn('⚠️ No hay almacenamiento disponible para el token');
      }
    } catch (error) {
      console.error('❌ Error al guardar token:', error);
    }
  }

  // Obtener token guardado
  async loadToken() {
    try {
      let token: string | null = null;
      
      if (isWeb) {
        // Usar localStorage en web
        token = localStorage.getItem('auth_token');
        if (token) {
          this.token = token;
          console.log('✅ Token cargado desde localStorage');
        } else {
          console.log('⚠️  No hay token guardado en localStorage');
        }
      } else if (SecureStore) {
        // Usar SecureStore en móvil
        token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          this.token = token;
          console.log('✅ Token cargado desde SecureStore');
        } else {
          console.log('⚠️  No hay token guardado en SecureStore');
        }
      }
      
      return token;
    } catch (error) {
      console.error('❌ Error al cargar token:', error);
      return null;
    }
  }

  // Limpiar token
  async clearToken() {
    this.token = null;
    try {
      if (isWeb) {
        // Usar localStorage en web
        localStorage.removeItem('auth_token');
        console.log('✅ Token eliminado de localStorage');
      } else if (SecureStore) {
        // Usar SecureStore en móvil
        await SecureStore.deleteItemAsync('auth_token');
        console.log('✅ Token eliminado de SecureStore');
      }
    } catch (error) {
      console.error('❌ Error al eliminar token:', error);
    }
  }

  // Método genérico para peticiones GET
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método genérico para peticiones POST
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método genérico para peticiones PUT
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método genérico para peticiones PATCH
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Método genérico para peticiones DELETE
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Manejar errores de la API
  private handleError(error: any): Error {
    // Si el error ya es una instancia de Error (formateado por el interceptor), retornarlo directamente
    if (error instanceof Error && error.message) {
      return error;
    }
    
    if (error.response) {
      // Error de respuesta del servidor
      const { status, data } = error.response;
      const message = data?.message || `Error ${status}`;
      
      // No propagar errores de validación de favoritos como errores críticos
      if (message === 'Datos inválidos' && status === 400) {
        return new Error('Datos de entrada inválidos');
      }
      
      return new Error(message);
    } else if (error.request) {
      // Error de red - más específico
      if (error.code === 'ECONNREFUSED') {
        return new Error('No se puede conectar al servidor. Verifica que el backend esté ejecutándose en el puerto 3001.');
      } else if (error.code === 'ENOTFOUND') {
        return new Error('Servidor no encontrado. Verifica la configuración de red.');
      } else if (error.code === 'ETIMEDOUT') {
        return new Error('Timeout de conexión. El servidor tardó demasiado en responder.');
      } else {
        return new Error('Error de conexión. Verifica tu conexión a internet y que el backend esté ejecutándose.');
      }
    } else {
      // Error de configuración
      return new Error(error.message || 'Error desconocido');
    }
  }

  // Verificar estado de la API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

// Instancia singleton del cliente API
export const apiClient = new ApiClient();

// Exportar la clase para casos especiales
export default ApiClient;
