import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  favoritesApi, 
  FavoritesQueryParams, 
  Favorite, 
  FavoriteCheckResponse 
} from '@/core/api/favoritesApi';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';

// Claves de consulta para React Query
export const favoritesKeys = {
  all: ['favorites'] as const,
  userFavorites: (userId?: string) => [...favoritesKeys.all, 'user', userId] as const,
  userFavoriteIds: (userId?: string) => [...favoritesKeys.all, 'user-ids', userId] as const,
  favoriteCheck: (productId: string, userId?: string) => [...favoritesKeys.all, 'check', productId, userId] as const,
  favoriteStats: (userId?: string) => [...favoritesKeys.all, 'stats', userId] as const,
};

// Hook para obtener la lista completa de favoritos del usuario
export const useUserFavorites = (params: FavoritesQueryParams = {}) => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: favoritesKeys.userFavorites(user?.id),
    queryFn: () => favoritesApi.getFavorites(params),
    enabled: !!user?.id, // Solo ejecutar si el usuario está autenticado
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: (failureCount, error: any) => {
      // No reintentar si el token está expirado (401)
      if (error?.message?.includes('Token inválido') || error?.message?.includes('expirado')) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Hook para obtener solo los IDs de productos favoritos (para verificación rápida)
export const useUserFavoriteIds = () => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: favoritesKeys.userFavoriteIds(user?.id),
    queryFn: () => favoritesApi.getFavoriteProductIds(),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos (más frecuente para verificación rápida)
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: (failureCount, error: any) => {
      // No reintentar si el error es de datos inválidos o autenticación
      if (error?.message?.includes('Datos de entrada inválidos') || 
          error?.message?.includes('Token inválido') || 
          error?.message?.includes('expirado')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
  });
};

// Hook para verificar si un producto específico es favorito
export const useFavoriteCheck = (productId: string) => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: favoritesKeys.favoriteCheck(productId, user?.id),
    queryFn: () => favoritesApi.checkFavorite(productId),
    enabled: !!user?.id && !!productId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para obtener estadísticas de favoritos
export const useFavoriteStats = () => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: favoritesKeys.favoriteStats(user?.id),
    queryFn: () => favoritesApi.getFavoriteStats(),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000, // 20 minutos
  });
};

// Hook para añadir un producto a favoritos
export const useAddFavorite = () => {
  const queryClient = useQueryClient();  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: (productId: string) => favoritesApi.addFavorite(productId),
    onSuccess: (data, productId) => {
      // Invalidar y refrescar todas las consultas relacionadas con favoritos
      queryClient.invalidateQueries({ queryKey: favoritesKeys.userFavorites(user?.id) });
      queryClient.invalidateQueries({ queryKey: favoritesKeys.userFavoriteIds(user?.id) });
      queryClient.invalidateQueries({ queryKey: favoritesKeys.favoriteCheck(productId, user?.id) });
      queryClient.invalidateQueries({ queryKey: favoritesKeys.favoriteStats(user?.id) });
      
      // Actualizar optimísticamente la lista de IDs de favoritos
      queryClient.setQueryData(
        favoritesKeys.userFavoriteIds(user?.id),
        (oldData: any) => {
          if (oldData?.success && oldData?.data) {
            return {
              ...oldData,
              data: {
                product_ids: [...oldData.data.product_ids, productId]
              }
            };
          }
          return oldData;
        }
      );
    },
    onError: (error: any) => {
      // Si el error es que ya está en favoritos, no mostrar error
      if (error?.message?.includes('ya está en tus favoritos')) {
        console.log('Producto ya está en favoritos');
        return;
      }
      console.error('Error adding favorite:', error);
    },
  });
};

// Hook para eliminar un producto de favoritos
export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: (productId: string) => favoritesApi.removeFavorite(productId),
    onSuccess: (data, productId) => {
      // Invalidar y refrescar todas las consultas relacionadas con favoritos
      queryClient.invalidateQueries({ queryKey: favoritesKeys.userFavorites(user?.id) });
      queryClient.invalidateQueries({ queryKey: favoritesKeys.userFavoriteIds(user?.id) });
      queryClient.invalidateQueries({ queryKey: favoritesKeys.favoriteCheck(productId, user?.id) });
      queryClient.invalidateQueries({ queryKey: favoritesKeys.favoriteStats(user?.id) });
      
      // Actualizar optimísticamente la lista de IDs de favoritos
      queryClient.setQueryData(
        favoritesKeys.userFavoriteIds(user?.id),
        (oldData: any) => {
          if (oldData?.success && oldData?.data) {
            return {
              ...oldData,
              data: {
                product_ids: oldData.data.product_ids.filter((id: string) => id !== productId)
              }
            };
          }
          return oldData;
        }
      );
    },
    onError: (error) => {
      console.error('Error removing favorite:', error);
    },
  });
};

// Hook para eliminar todos los favoritos
export const useRemoveAllFavorites = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: () => favoritesApi.removeAllFavorites(),
    onSuccess: () => {
      // Invalidar todas las consultas relacionadas con favoritos
      queryClient.invalidateQueries({ queryKey: favoritesKeys.userFavorites(user?.id) });
      queryClient.invalidateQueries({ queryKey: favoritesKeys.userFavoriteIds(user?.id) });
      queryClient.invalidateQueries({ queryKey: favoritesKeys.favoriteStats(user?.id) });
      
      // Limpiar todas las consultas de verificación de favoritos
      queryClient.removeQueries({ queryKey: favoritesKeys.all });
    },
    onError: (error) => {
      console.error('Error removing all favorites:', error);
    },
  });
};

// Hook personalizado para verificar múltiples productos de una vez
export const useMultipleFavoriteCheck = (productIds: string[]) => {
  const { data: favoriteIds } = useUserFavoriteIds();
  
  return useQuery({
    queryKey: ['favorites', 'multiple-check', productIds],
    queryFn: async () => {
      if (!favoriteIds?.success) {
        return {};
      }
      const result = await favoritesApi.checkMultipleFavorites(productIds);
      return result?.success ? result.data || {} : {};
    },
    enabled: !!favoriteIds && favoriteIds.success && productIds.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook helper para verificar si un producto específico es favorito (más eficiente)
export const useIsFavorite = (productId: string) => {
  const { data: favoriteIds } = useUserFavoriteIds();
  
  const isFavorite = favoriteIds?.success 
    ? favoriteIds.data?.product_ids?.includes(productId) || false
    : false;
  
  return {
    isFavorite,
    isLoading: !favoriteIds,
    error: favoriteIds?.success === false ? favoriteIds?.message || 'Error loading favorites' : null
  };
};

// Hook para alternar el estado de favorito de un producto
export const useToggleFavorite = () => {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  
  return {
    toggle: (productId: string, isCurrentlyFavorite: boolean) => {
      if (isCurrentlyFavorite) {
        return removeFavorite.mutate(productId);
      } else {
        return addFavorite.mutate(productId);
      }
    },
    isAdding: addFavorite.isPending,
    isRemoving: removeFavorite.isPending,
    isPending: addFavorite.isPending || removeFavorite.isPending,
    error: addFavorite.error || removeFavorite.error
  };
};
