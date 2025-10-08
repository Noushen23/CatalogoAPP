import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configuración de API para tienda online React Native
export const API_CONFIG = {
  // Stage actual (dev, prod, etc)
  STAGE: Constants.expoConfig?.extra?.EXPO_PUBLIC_STAGE || 'dev',

  // URL base de la API según plataforma
  get API_URL(): string {
    // Emulador Android usa 10.0.2.2, dispositivos físicos deben usar la IP local de la PC
    if (Platform.OS === 'android') {
      return 'http://192.168.3.104:3001/api/v1';
    }
    // Cambia la IP por la de tu red local si usas dispositivo físico o simulador iOS
    return 'http://192.168.3.104:3001/api/v1';
  },

  // URL sugerida para dispositivos físicos Android (modifica según tu red)
  get ANDROID_DEVICE_URL(): string {
    return 'http://192.168.3.104:3001/api/v1';
  },

  // Función para obtener la URL local de la API (puede usarse para lógica avanzada)
  async getLocalApiUrl(): Promise<string> {
    if (Platform.OS === 'android') {
      return 'http://192.168.3.104:3001/api/v1';
    }
    return 'http://192.168.3.104:3001/api/v1';
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
