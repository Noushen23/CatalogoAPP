/**
 * Application Constants
 * Centralized configuration and constants for the app
 */

export const APP_CONFIG = {
  NAME: 'Products App',
  VERSION: '1.0.0',
  AUTHOR: 'React Native Team',
  DESCRIPTION: 'Modern e-commerce mobile application',
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  PRODUCT_DETAIL_LIMIT: 50,
} as const;

export const CACHE_TIMES = {
  ONE_HOUR: 1000 * 60 * 60,
  THIRTY_MINUTES: 1000 * 60 * 30,
  TEN_MINUTES: 1000 * 60 * 10,
  FIVE_MINUTES: 1000 * 60 * 5,
  TWO_MINUTES: 1000 * 60 * 2,
} as const;

export const TIMEOUTS = {
  API_TIMEOUT: 10000,
  RETRY_DELAY: 1000,
  RETRY_ATTEMPTS: 2,
} as const;

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
} as const;

export const ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
  },
  CUSTOMER: {
    CATALOG: '/(customer)/catalog',
    CART: '/(customer)/cart',
    PROFILE: '/(customer)/profile',
    ORDERS: '/(customer)/orders',
    CHECKOUT: '/(customer)/checkout',
  },
  MODE_SELECTION: '/mode-selection',
} as const;

export const STORAGE_KEYS = {
  THEME: 'theme',
} as const;
