import { apiClient } from './apiClient';

/**
 * Tipos de notificaciones
 */
export interface StockAlertSubscription {
  id: string;
  productId: string;
  productName: string;
  currentPrice: number;
  currentStock: number;
  createdAt: string;
  type: 'stock';
}

export interface PriceAlertSubscription {
  id: string;
  productId: string;
  productName: string;
  currentPrice: number;
  targetPrice: number;
  originalPrice: number;
  createdAt: string;
  type: 'price';
}

export interface NotificationHistoryItem {
  id: string;
  type: 'order_status' | 'stock_available' | 'price_drop' | 'cart_reminder' | 'new_order_admin' | 'other';
  title: string;
  message: string;
  data: any;
  success: boolean;
  sentAt: string;
}

export interface UserSubscriptions {
  stockAlerts: StockAlertSubscription[];
  priceAlerts: PriceAlertSubscription[];
  total: number;
}

export interface ProductSubscriptionStatus {
  subscribedToStock: boolean;
  subscribedToPrice: boolean;
  targetPrice: number | null;
}

/**
 * API de notificaciones y suscripciones
 */
export const notificationsApi = {
  /**
   * Suscribirse a notificaciones de stock de un producto
   */
  subscribeToStock: async (productId: string) => {
    const response = await apiClient.post(`/notifications/subscribe/stock/${productId}`, {});
    return response;
  },

  /**
   * Cancelar suscripción de stock
   */
  unsubscribeFromStock: async (productId: string) => {
    const response = await apiClient.delete(`/notifications/unsubscribe/stock/${productId}`);
    return response;
  },

  /**
   * Suscribirse a notificaciones de precio
   */
  subscribeToPrice: async (productId: string, targetPrice: number) => {
    const response = await apiClient.post(`/notifications/subscribe/price/${productId}`, {
      targetPrice,
    });
    return response;
  },

  /**
   * Cancelar suscripción de precio
   */
  unsubscribeFromPrice: async (productId: string) => {
    const response = await apiClient.delete(`/notifications/unsubscribe/price/${productId}`);
    return response;
  },

  /**
   * Obtener todas las suscripciones del usuario
   */
  getUserSubscriptions: async (): Promise<UserSubscriptions> => {
    const response = await apiClient.get('/notifications/subscriptions');
    return response.data;
  },

  /**
   * Verificar si el usuario está suscrito a un producto
   */
  checkProductSubscription: async (productId: string): Promise<ProductSubscriptionStatus> => {
    const response = await apiClient.get(`/notifications/subscriptions/${productId}`);
    return response.data;
  },

  /**
   * Obtener historial de notificaciones
   */
  getNotificationHistory: async (limit: number = 20, offset: number = 0) => {
    const response = await apiClient.get('/notifications/history', {
      params: { limit, offset },
    });
    return response;
  },
};
