import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { 
  profileApi, 
  Profile, 
  ProfileStats, 
  UpdateUserInfoData, 
  NotificationPreferences, 
  PrivacySettings 
} from '@/core/api/profileApi';

// Constantes para configuración de cache - Optimizados para carga rápida
const CACHE_TIMES = {
  PROFILE: { 
    staleTime: 2 * 60 * 1000, // 2 minutos (reducido de 5)
    gcTime: 10 * 60 * 1000, // 10 minutos para mantener en caché
  },
  STATS: { 
    staleTime: 5 * 60 * 1000, // 5 minutos (reducido de 10)
    gcTime: 15 * 60 * 1000, // 15 minutos para mantener en caché
  },
} as const;

// Query keys centralizados
export const PROFILE_QUERY_KEYS = {
  PROFILE: ['profile'] as const,
  STATS: ['profile', 'stats'] as const,
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

// Hook para obtener estadísticas del perfil
export const useProfileStats = () => {
  return useQuery({
    queryKey: PROFILE_QUERY_KEYS.STATS,
    queryFn: async () => {
      const response = await profileApi.getProfileStats();
      
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al cargar estadísticas');
      }
      
      return response.data;
    },
    ...CACHE_TIMES.STATS,
    retry: 0, // Sin reintentos para stats (no es crítico)
    refetchOnMount: false, // No recargar en cada mount
  });
};

// Hook optimizado para actualizar información del usuario
export const useUpdateUserInfo = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: UpdateUserInfoData) => {
      const response = await profileApi.updateUserInfo(data);
      return response.data;
    },
    onSuccess: useCallback((data: any) => {
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
      
      Alert.alert('✅ Éxito', 'Información actualizada correctamente');
    }, [queryClient]),
    onError: useCallback((error: any) => {
      console.error('Error al actualizar información:', error);
      Alert.alert('❌ Error', error.response?.data?.message || 'Error al actualizar información');
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
    queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.STATS });
  }, [queryClient]);
};

// Hook para obtener datos combinados del perfil (optimizado)
export const useProfileData = () => {
  const profileQuery = useProfile();
  const statsQuery = useProfileStats();

  return useMemo(() => ({
    profile: profileQuery.data,
    stats: statsQuery.data,
    isLoading: profileQuery.isLoading || statsQuery.isLoading,
    isError: profileQuery.isError || statsQuery.isError,
    error: profileQuery.error || statsQuery.error,
    refetch: () => Promise.all([profileQuery.refetch(), statsQuery.refetch()]),
  }), [profileQuery, statsQuery]);
};