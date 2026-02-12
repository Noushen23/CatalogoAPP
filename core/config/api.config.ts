import Constants from 'expo-constants';

// Configuración de API para tienda online React Native
const REQUEST_TIMEOUT_MS = 1500;
let resolvedApiUrl: string | undefined;
let resolvedApiBaseUrl: string | undefined;

const normalizeBaseFromApiUrl = (apiUrl: string) => {
  return apiUrl.replace(/\/api\/v1\/?$/, '');
};

const isReachable = async (baseUrl: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
};

export const API_CONFIG = {
  // Stage actual (dev, prod, etc)
  STAGE: Constants.expoConfig?.extra?.EXPO_PUBLIC_STAGE || 'dev',

  // URL base de la API - lee desde variables de entorno
  get API_URL(): string {
    const stage = this.STAGE;
    const publicUrl =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL_PUBLIC ||
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
      'http://181.49.225.69:3001/api/v1';
    const localUrl =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL_LOCAL ||
      'http://192.168.1.120:3001/api/v1';

    if (stage === 'local') return localUrl;
    if (stage === 'production' || stage === 'public') return publicUrl;

    return Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || publicUrl;
  },

  // URL base sin /api/v1
  get API_BASE_URL(): string {
    const stage = this.STAGE;
    const publicBaseUrl =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL_PUBLIC ||
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL ||
      'http://181.49.225.69:3001';
    const localBaseUrl =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL_LOCAL ||
      'http://192.168.1.120:3001';

    if (stage === 'local') return localBaseUrl;
    if (stage === 'production' || stage === 'public') return publicBaseUrl;

    return Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL || publicBaseUrl;
  },

  // URL sugerida para dispositivos físicos Android
  get ANDROID_DEVICE_URL(): string {
    return this.API_URL;
  },

  // Función para obtener la URL de la API
  async getLocalApiUrl(): Promise<string> {
    return this.getResolvedApiUrl();
  },

  // Resolver automáticamente la mejor URL (local si responde, si no pública)
  async getResolvedApiUrl(): Promise<string> {
    if (resolvedApiUrl) return resolvedApiUrl;

    const stage = this.STAGE;
    const localBaseUrl =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL_LOCAL ||
      'http://192.168.1.120:3001';
    const publicApiUrl =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL_PUBLIC ||
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
      'http://181.49.225.69:3001/api/v1';
    const localApiUrl =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL_LOCAL ||
      'http://192.168.1.120:3001/api/v1';

    const finalize = (apiUrl: string) => {
      resolvedApiUrl = apiUrl;
      resolvedApiBaseUrl = normalizeBaseFromApiUrl(apiUrl);
      return apiUrl;
    };

    if (stage === 'local') {
      return finalize(localApiUrl);
    }

    if (stage === 'production' || stage === 'public') {
      return finalize(publicApiUrl);
    }

    if (stage === 'auto') {
      const localOk = await isReachable(localBaseUrl);
      return finalize(localOk ? localApiUrl : publicApiUrl);
    }

    return finalize(Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || publicApiUrl);
  },

  async getResolvedApiBaseUrl(): Promise<string> {
    if (resolvedApiBaseUrl) return resolvedApiBaseUrl;
    const apiUrl = await this.getResolvedApiUrl();
    resolvedApiBaseUrl = normalizeBaseFromApiUrl(apiUrl);
    return resolvedApiBaseUrl;
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
