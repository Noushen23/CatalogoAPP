import { apiClient } from './apiClient';

export interface Profile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileStats {
  totalOrders: number;
  totalSpent: number;
  favoriteProducts: number;
  totalReviews: number;
}

export interface UpdateUserInfoData {
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  promotions: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private';
  showEmail: boolean;
  showPhone: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}

export const profileApi = {
  // Obtener perfil del usuario
  getProfile: async (): Promise<ApiResponse<Profile>> => {
    const response = await apiClient.get('/profile');
    return response.data;
  },

  // Obtener estadísticas del perfil
  getProfileStats: async (): Promise<ApiResponse<ProfileStats>> => {
    const response = await apiClient.get('/profile/stats');
    return response.data;
  },

  // Actualizar información del usuario
  updateProfile: async (data: UpdateUserInfoData): Promise<ApiResponse<Profile>> => {
    const response = await apiClient.put('/profile', data);
    return response.data;
  },

  // Actualizar avatar
  updateAvatar: async (avatar: string): Promise<ApiResponse<Profile>> => {
    const response = await apiClient.put('/profile/avatar', { avatar });
    return response.data;
  },

  // Obtener preferencias de notificaciones
  getNotificationPreferences: async (): Promise<ApiResponse<NotificationPreferences>> => {
    const response = await apiClient.get('/profile/notifications');
    return response.data;
  },

  // Actualizar preferencias de notificaciones
  updateNotificationPreferences: async (preferences: NotificationPreferences): Promise<ApiResponse<NotificationPreferences>> => {
    const response = await apiClient.put('/profile/notifications', preferences);
    return response.data;
  },

  // Obtener configuración de privacidad
  getPrivacySettings: async (): Promise<ApiResponse<PrivacySettings>> => {
    const response = await apiClient.get('/profile/privacy');
    return response.data;
  },

  // Actualizar configuración de privacidad
  updatePrivacySettings: async (settings: PrivacySettings): Promise<ApiResponse<PrivacySettings>> => {
    const response = await apiClient.put('/profile/privacy', settings);
    return response.data;
  },

  // Cambiar contraseña
  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.put('/profile/password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  // Eliminar cuenta
  deleteAccount: async (password: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete('/profile/account', {
      data: { password }
    });
    return response.data;
  }
};