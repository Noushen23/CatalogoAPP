import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '../config/api.config';
import * as SecureStore from 'expo-secure-store';

// Tipos para las respuestas de la API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
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
        return Promise.reject(error);
      }
    );

    // Interceptor de response para manejar errores
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token expirado o inválido - limpiar silenciosamente
          await this.clearToken();
          // No propagar el error para evitar logs innecesarios
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
      await SecureStore.setItemAsync('auth_token', token);
      console.log('✅ Token guardado en SecureStore');
    } catch (error) {
      console.error('❌ Error al guardar token:', error);
    }
  }

  // Obtener token guardado
  async loadToken() {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        this.token = token;
        console.log('✅ Token cargado desde SecureStore');
      } else {
        console.log('⚠️  No hay token guardado en SecureStore');
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
      await SecureStore.deleteItemAsync('auth_token');
    } catch (error) {
      console.error('Error al eliminar token:', error);
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
