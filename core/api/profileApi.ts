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
  // Propiedades adicionales para información personal
  fechaNacimiento?: string;
  genero?: 'masculino' | 'femenino' | 'otro' | 'no_especificar';
  usuario?: {
    telefono?: string;
    direccion?: string;
    nombreCompleto?: string;
    email?: string;
    fechaCreacion?: string;
    emailVerificado?: boolean;
  };
}

// export interface ProfileStats {
//   totalOrders: number;
//   totalSpent: number;
//   favoriteProducts: number;
//   totalReviews: number;
// }

export interface UpdateUserInfoData {
  nombreCompleto?: string;
  telefono?: string;
  direccion?: string;
  tipoIdentificacion?: 'CC' | 'NIT' | 'CE' | 'TR';
  numeroIdentificacion?: string;
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

  // Actualizar información del usuario
  updateProfile: async (data: UpdateUserInfoData): Promise<ApiResponse<Profile>> => {
    const response = await apiClient.put('/profile', data);
    return response.data;
  },

  // Actualizar información básica del usuario
  updateUserInfo: async (data: UpdateUserInfoData): Promise<ApiResponse<any>> => {
    const response = await apiClient.put('/profile/user-info', data);
    return response.data;
  },

  // Actualizar avatar
  updateAvatar: async (avatar: string): Promise<ApiResponse<Profile>> => {
    const response = await apiClient.put('/profile/avatar', { avatar });
    return response.data;
  },

  // Actualizar información personal (fecha de nacimiento, género)
  updatePersonalInfo: async (data: {
    fechaNacimiento?: string;
    genero?: 'masculino' | 'femenino' | 'otro' | 'no_especificar';
  }): Promise<ApiResponse<Profile>> => {
    const response = await apiClient.put('/profile/personal-info', data);
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
    return response; // apiClient.put ya retorna response.data, no necesitamos .data nuevamente
  },

  // Solicitar cambio de email (enviar código de verificación)
  requestChangeEmail: async (newEmail: string): Promise<ApiResponse<{ email: string }>> => {
    const response = await apiClient.post('/profile/email/request-change', {
      newEmail
    });
    return response;
  },

  // Verificar código y cambiar email
  verifyChangeEmail: async (code: string): Promise<ApiResponse<{ oldEmail: string; newEmail: string }>> => {
    const response = await apiClient.post('/profile/email/verify-change', {
      code
    });
    return response;
  },

  // Eliminar cuenta
  deleteAccount: async (password: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete('/profile/account', {
      data: { password }
    });
    return response.data;
  }
};