import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configuración de API para tienda online React Native
export const API_CONFIG = {
  // Stage actual (dev, prod, etc)
  STAGE: Constants.expoConfig?.extra?.EXPO_PUBLIC_STAGE || 'dev',

  // URL base de la API - lee desde variables de entorno
  get API_URL(): string {
    return Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'http://192.168.3.104:3001/api/v1';
  },

  // URL base sin /api/v1
  get API_BASE_URL(): string {
    return Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.3.104:3001';
  },

  // URL sugerida para dispositivos físicos Android
  get ANDROID_DEVICE_URL(): string {
    return this.API_URL;
  },

  // Función para obtener la URL de la API
  async getLocalApiUrl(): Promise<string> {
    return this.API_URL;
  },

  // Timeout de requests (ms)
  TIMEOUT: 10000,

  // Headers por defecto para peticiones
  get DEFAULT_HEADERS(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  },
};

// Debug solo en desarrollo
if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('🔧 API Config:', {
    STAGE: API_CONFIG.STAGE,
    API_URL: API_CONFIG.API_URL,
    TIMEOUT: API_CONFIG.TIMEOUT,
  });
}
