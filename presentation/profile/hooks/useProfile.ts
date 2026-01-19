import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { 
  profileApi, 
  Profile, 
  UpdateUserInfoData, 
  NotificationPreferences, 
  PrivacySettings 
} from '@/core/api/profileApi';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';

// Constantes para configuración de cache - Optimizados para carga rápida
const CACHE_TIMES = {
  PROFILE: { 
    staleTime: 2 * 60 * 1000, // 2 minutos (reducido de 5)
    gcTime: 10 * 60 * 1000, // 10 minutos para mantener en caché
  },
} as const;

// Query keys centralizados
export const PROFILE_QUERY_KEYS = {
  PROFILE: ['profile'] as const,
} as const;

// Hook para obtener perfil con optimizaciones
export const useProfile = () => {
  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.PROFILE,
    queryFn: async () => {
      const response = await profileApi.getProfile();
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al cargar perfil');
      }
      
      return response.data;
    },
    ...CACHE_TIMES.PROFILE,
    retry: 1, // Reducido de 3 a 1 para carga más rápida
    retryDelay: 500, // Delay fijo más corto
  });
};

// Hook optimizado para actualizar información del usuario
export const useUpdateUserInfo = () => {
  const queryClient = useQueryClient();
  const { user, checkStatus } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async (data: UpdateUserInfoData) => {
      const response = await profileApi.updateUserInfo(data);
      return response.data;
    },
    onSuccess: useCallback(async (data: any) => {
      // Actualizar cache del perfil de forma optimizada
      queryClient.setQueryData(PROFILE_QUERY_KEYS.PROFILE, (oldData: any) => {
        if (!oldData?.profile) return oldData;
        
        return {
          ...oldData,
          profile: {
            ...oldData.profile,
            usuario: {
              ...oldData.profile.usuario,
              ...data
            }
          }
        };
      });

      // Recargar estado del usuario desde el servidor para reflejar los cambios
      await checkStatus();
      
      Alert.alert('✅ Éxito', 'Información actualizada correctamente');
    }, [queryClient, user, checkStatus]),
    onError: useCallback((error: any) => {
      console.error('Error al actualizar información:', error);
      Alert.alert('❌ Error', error.response?.data?.message || error.message || 'Error al actualizar información');
    }, []),
  });

  return mutation;
};

// Hook optimizado para actualizar avatar
export const useUpdateAvatar = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (avatarUrl: string) => {
      const response = await profileApi.updateAvatar(avatarUrl);
      return response.data;
    },
    onSuccess: useCallback((data: any) => {
      queryClient.setQueryData(PROFILE_QUERY_KEYS.PROFILE, (oldData: any) => {
        if (!oldData?.profile) return oldData;
        
        return {
          ...oldData,
          profile: {
            ...oldData.profile,
            avatarUrl: data?.avatarUrl
          }
        };
      });
      
      Alert.alert('✅ Éxito', 'Avatar actualizado correctamente');
    }, [queryClient]),
    onError: useCallback((error: any) => {
      console.error('Error al actualizar avatar:', error);
      Alert.alert('❌ Error', error.response?.data?.message || 'Error al actualizar avatar');
    }, []),
  });

  return mutation;
};

// Hook optimizado para actualizar información personal
export const useUpdatePersonalInfo = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: {
      fechaNacimiento?: string;
      genero?: 'masculino' | 'femenino' | 'otro' | 'no_especificar';
    }) => {
      const response = await profileApi.updatePersonalInfo(data);
      return response.data;
    },
    onSuccess: useCallback((data: any) => {
      queryClient.setQueryData(PROFILE_QUERY_KEYS.PROFILE, (oldData: any) => {
        if (!oldData?.profile) return oldData;
        
        return {
          ...oldData,
          profile: {
            ...oldData.profile,
            fechaNacimiento: data?.fechaNacimiento,
            genero: data?.genero
          }
        };
      });
      
      Alert.alert('✅ Éxito', 'Información personal actualizada correctamente');
    }, [queryClient]),
    onError: useCallback((error: any) => {
      console.error('Error al actualizar información personal:', error);
      Alert.alert('❌ Error', error.response?.data?.message || 'Error al actualizar información personal');
    }, []),
  });

  return mutation;
};

// Hook optimizado para actualizar preferencias de notificaciones
export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      const response = await profileApi.updateNotificationPreferences(preferences);
      return response.data;
    },
    onSuccess: useCallback((data: any) => {
      queryClient.setQueryData(PROFILE_QUERY_KEYS.PROFILE, (oldData: any) => {
        if (!oldData?.profile) return oldData;
        
        return {
          ...oldData,
          profile: {
            ...oldData.profile,
            preferenciasNotificaciones: data?.preferenciasNotificaciones
          }
        };
      });
      
      Alert.alert('✅ Éxito', 'Preferencias de notificaciones actualizadas correctamente');
    }, [queryClient]),
    onError: useCallback((error: any) => {
      console.error('Error al actualizar preferencias:', error);
      Alert.alert('❌ Error', error.response?.data?.message || 'Error al actualizar preferencias');
    }, []),
  });

  return mutation;
};

// Hook optimizado para actualizar configuración de privacidad
export const useUpdatePrivacySettings = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (settings: Partial<PrivacySettings>) => {
      const response = await profileApi.updatePrivacySettings(settings);
      return response.data;
    },
    onSuccess: useCallback((data: any) => {
      queryClient.setQueryData(PROFILE_QUERY_KEYS.PROFILE, (oldData: any) => {
        if (!oldData?.profile) return oldData;
        
        return {
          ...oldData,
          profile: {
            ...oldData.profile,
            configuracionPrivacidad: data?.configuracionPrivacidad
          }
        };
      });
      
      Alert.alert('✅ Éxito', 'Configuración de privacidad actualizada correctamente');
    }, [queryClient]),
    onError: useCallback((error: any) => {
      console.error('Error al actualizar configuración de privacidad:', error);
      Alert.alert('❌ Error', error.response?.data?.message || 'Error al actualizar configuración de privacidad');
    }, []),
  });

  return mutation;
};

// Hook para invalidar cache del perfil
export const useInvalidateProfile = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.PROFILE });
  }, [queryClient]);
};

// Hook para cambiar contraseña
export const useChangePassword = () => {
  const mutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await profileApi.changePassword(data.currentPassword, data.newPassword);
      
      // Si la respuesta no tiene success, lanzar error
      if (!response || !response.success) {
        throw new Error(response?.message || 'Error al cambiar contraseña');
      }
      
      return response.data;
    },
    onSuccess: useCallback(() => {
      Alert.alert('✅ Éxito', 'Contraseña cambiada exitosamente');
    }, []),
    onError: useCallback((error: any) => {
      // Extraer mensaje de error de manera robusta
      // El error puede venir directamente de handleError de apiClient o del backend
      const errorMessage = error?.message || 
                          error?.response?.data?.message || 
                          'Error al cambiar contraseña';
      
      // Solo loggear errores inesperados, no errores de validación esperados
      if (!errorMessage.includes('Contraseña actual incorrecta')) {
        console.error('Error al cambiar contraseña:', errorMessage);
      }
      
      Alert.alert('❌ Error', errorMessage);
    }, []),
    retry: false, // No reintentar mutaciones - especialmente importante para cambios de contraseña
  });

  return mutation;
};

// Hook para solicitar cambio de email
export const useRequestChangeEmail = () => {
  const mutation = useMutation({
    mutationFn: async (newEmail: string) => {
      const response = await profileApi.requestChangeEmail(newEmail);
      
      if (!response || !response.success) {
        throw new Error(response?.message || 'Error al solicitar cambio de email');
      }
      
      return response.data;
    },
    onSuccess: useCallback((data: { email: string } | undefined) => {
      Alert.alert(
        '📧 Código Enviado',
        `Hemos enviado un código de verificación a ${data?.email || 'tu nuevo email'}. Por favor, revisa tu bandeja de entrada.`
      );
    }, []),
    onError: useCallback((error: any) => {
      const errorMessage = error?.message || 
                          error?.response?.data?.message || 
                          'Error al solicitar cambio de email';
      
      // No loggear como error crítico si es una validación esperada
      const isValidationError = errorMessage.includes('ya está en uso') || 
                               errorMessage.includes('diferente al email actual') ||
                               errorMessage.includes('formato del email');
      
      if (!isValidationError) {
        console.error('Error al solicitar cambio de email:', errorMessage);
      } else {
        console.log('ℹ️ Validación de cambio de email:', errorMessage);
      }
      
      Alert.alert('⚠️ Validación', errorMessage);
    }, []),
    retry: false,
  });

  return mutation;
};

// Hook para verificar código y cambiar email
export const useVerifyChangeEmail = () => {
  const queryClient = useQueryClient();
  const { checkStatus } = useAuthStore();

  const mutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await profileApi.verifyChangeEmail(code);
      
      if (!response || !response.success) {
        throw new Error(response?.message || 'Error al verificar código de cambio de email');
      }
      
      return response.data;
    },
    onSuccess: useCallback(async (data: { oldEmail: string; newEmail: string } | undefined) => {
      // Invalidar queries del perfil para refrescar datos
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.PROFILE });
      
      // Actualizar estado de autenticación para refrescar el email del usuario
      await checkStatus();
      
      Alert.alert(
        '✅ Email Cambiado',
        `Tu email ha sido cambiado exitosamente de ${data?.oldEmail || ''} a ${data?.newEmail || ''}.`
      );
    }, [queryClient, checkStatus]),
    onError: useCallback((error: any) => {
      const errorMessage = error?.message || 
                          error?.response?.data?.message || 
                          'Error al verificar código de cambio de email';
      
      console.error('Error al verificar cambio de email:', errorMessage);
      Alert.alert('❌ Error', errorMessage);
    }, []),
    retry: false,
  });

  return mutation;
};

// Hook para obtener datos del perfil (optimizado)
export const useProfileData = () => {
  const profileQuery = useProfile();

  return useMemo(() => ({
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,
    error: profileQuery.error,
    refetch: () => profileQuery.refetch(),
  }), [profileQuery]);
};