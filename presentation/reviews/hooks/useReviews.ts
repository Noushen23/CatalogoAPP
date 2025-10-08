import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { 
  reviewsApi, 
  CreateReviewRequest, 
  UpdateReviewRequest, 
  ReviewFilters,
  Review,
  ReviewSimple,
  ReviewStats,
  CanReviewResponse
} from '@/core/api/reviewsApi';
import { CACHE_TIMES } from '@/constants/App';

// Claves de query para consistencia
const REVIEWS_QUERY_KEY = ['reviews'];
const REVIEW_STATS_QUERY_KEY = ['review-stats'];

// Hook para obtener reseñas de un producto con paginación infinita
export const useProductReviews = (productId: string, filters: Omit<ReviewFilters, 'page'> = {}) => {
  return useInfiniteQuery({
    queryKey: [...REVIEWS_QUERY_KEY, 'product', productId, filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await reviewsApi.getReviewsByProduct(productId, {
        ...filters,
        page: pageParam as number,
        limit: filters.limit || 10
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar las reseñas');
      }
      
      return {
        ...response.data!,
        nextPage: response.data!.pagination.has_next_page ? pageParam + 1 : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    enabled: !!productId,
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Hook para obtener reseñas de un producto (versión simple sin paginación infinita)
export const useProductReviewsSimple = (productId: string, filters: ReviewFilters = {}) => {
  return useQuery({
    queryKey: [...REVIEWS_QUERY_KEY, 'product', 'simple', productId, filters],
    queryFn: async () => {
      const response = await reviewsApi.getReviewsByProduct(productId, filters);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar las reseñas');
      }
      
      return response.data;
    },
    enabled: !!productId,
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Hook para obtener estadísticas de reseñas de un producto
export const useProductReviewStats = (productId: string, includeInactive = false) => {
  return useQuery({
    queryKey: [...REVIEW_STATS_QUERY_KEY, 'product', productId, includeInactive],
    queryFn: async () => {
      const response = await reviewsApi.getProductReviewStats(productId, includeInactive);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar las estadísticas de reseñas');
      }
      
      return response.data;
    },
    enabled: !!productId,
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Hook para verificar si el usuario puede reseñar un producto
export const useCanUserReviewProduct = (productId: string) => {
  return useQuery({
    queryKey: [...REVIEWS_QUERY_KEY, 'can-review', productId],
    queryFn: async () => {
      const response = await reviewsApi.canUserReviewProduct(productId);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al verificar si puede reseñar');
      }
      
      return response.data;
    },
    enabled: !!productId,
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
  });
};

// Hook para obtener reseñas del usuario autenticado
export const useUserReviews = (filters: ReviewFilters = {}) => {
  return useQuery({
    queryKey: [...REVIEWS_QUERY_KEY, 'user', filters],
    queryFn: async () => {
      const response = await reviewsApi.getUserReviews(filters);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar las reseñas del usuario');
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Hook para crear una reseña
export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, data }: { productId: string; data: CreateReviewRequest }) => {
      console.log('🌟 Creando reseña para producto:', productId, 'con datos:', data);
      
      const response = await reviewsApi.createReview(productId, data);
      
      if (!response.success) {
        const error = new Error(response.message || 'Error al crear la reseña');
        error.name = 'ReviewCreationError';
        throw error;
      }
      
      return response.data;
    },
    onSuccess: (reviewData, variables) => {
      if (!reviewData) return;
      
      console.log('✅ Reseña creada exitosamente:', reviewData.id);
      
      const { productId } = variables;
      
      // Invalidar queries relacionadas a reseñas del producto
      queryClient.invalidateQueries({ queryKey: [...REVIEWS_QUERY_KEY, 'product', productId] });
      queryClient.invalidateQueries({ queryKey: [...REVIEW_STATS_QUERY_KEY, 'product', productId] });
      queryClient.invalidateQueries({ queryKey: [...REVIEWS_QUERY_KEY, 'can-review', productId] });
      
      // Invalidar reseñas del usuario
      queryClient.invalidateQueries({ queryKey: [...REVIEWS_QUERY_KEY, 'user'] });
      
      // Opcional: Agregar la nueva reseña al cache para evitar refetch inmediato
      queryClient.setQueryData(
        [...REVIEWS_QUERY_KEY, 'user', reviewData.id], 
        reviewData
      );
      
      console.log(`🎉 Reseña creada exitosamente para el producto ${productId}!`);
    },
    onError: (error) => {
      console.error('❌ Error al crear reseña:', error);
      
      if (error.name === 'ReviewCreationError') {
        console.error('💡 Detalles del error de creación de reseña:', {
          message: error.message,
          stack: error.stack
        });
      }
    },
  });
};

// Hook para actualizar una reseña
export const useUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, data }: { reviewId: string; data: UpdateReviewRequest }) => {
      console.log('📝 Actualizando reseña:', reviewId, 'con datos:', data);
      
      const response = await reviewsApi.updateReview(reviewId, data);
      
      if (!response.success) {
        const error = new Error(response.message || 'Error al actualizar la reseña');
        error.name = 'ReviewUpdateError';
        throw error;
      }
      
      return response.data;
    },
    onSuccess: (reviewData) => {
      if (!reviewData) return;
      
      console.log('✅ Reseña actualizada exitosamente:', reviewData.id);
      
      const productId = reviewData.productoId;
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [...REVIEWS_QUERY_KEY, 'product', productId] });
      queryClient.invalidateQueries({ queryKey: [...REVIEW_STATS_QUERY_KEY, 'product', productId] });
      queryClient.invalidateQueries({ queryKey: [...REVIEWS_QUERY_KEY, 'user'] });
      
      // Actualizar la reseña específica en el cache
      queryClient.setQueryData(
        [...REVIEWS_QUERY_KEY, 'user', reviewData.id], 
        reviewData
      );
      
      console.log(`🔄 Reseña ${reviewData.id} actualizada exitosamente!`);
    },
    onError: (error) => {
      console.error('❌ Error al actualizar reseña:', error);
      
      if (error.name === 'ReviewUpdateError') {
        console.error('💡 Detalles del error de actualización:', {
          message: error.message,
          stack: error.stack
        });
      }
    },
  });
};

// Hook para eliminar una reseña
export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, productId }: { reviewId: string; productId: string }) => {
      console.log('🗑️ Eliminando reseña:', reviewId);
      
      const response = await reviewsApi.deleteReview(reviewId);
      
      if (!response.success) {
        const error = new Error(response.message || 'Error al eliminar la reseña');
        error.name = 'ReviewDeletionError';
        throw error;
      }
      
      return { reviewId, productId };
    },
    onSuccess: (data) => {
      console.log('✅ Reseña eliminada exitosamente:', data.reviewId);
      
      const { reviewId, productId } = data;
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [...REVIEWS_QUERY_KEY, 'product', productId] });
      queryClient.invalidateQueries({ queryKey: [...REVIEW_STATS_QUERY_KEY, 'product', productId] });
      queryClient.invalidateQueries({ queryKey: [...REVIEWS_QUERY_KEY, 'user'] });
      queryClient.invalidateQueries({ queryKey: [...REVIEWS_QUERY_KEY, 'can-review', productId] });
      
      // Remover la reseña del cache
      queryClient.removeQueries({ queryKey: [...REVIEWS_QUERY_KEY, 'user', reviewId] });
      
      console.log(`🗑️ Reseña ${reviewId} eliminada exitosamente!`);
    },
    onError: (error) => {
      console.error('❌ Error al eliminar reseña:', error);
      
      if (error.name === 'ReviewDeletionError') {
        console.error('💡 Detalles del error de eliminación:', {
          message: error.message,
          stack: error.stack
        });
      }
    },
  });
};

// Hook para obtener una reseña específica
export const useReview = (reviewId: string) => {
  return useQuery({
    queryKey: [...REVIEWS_QUERY_KEY, 'single', reviewId],
    queryFn: async () => {
      if (!reviewId) {
        throw new Error('ID de reseña requerido');
      }

      const response = await reviewsApi.getReview(reviewId);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar la reseña');
      }
      
      return response.data;
    },
    enabled: !!reviewId,
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
  });
};

// Hook de conveniencia para refrescar todas las reseñas
export const useRefreshReviews = () => {
  const queryClient = useQueryClient();

  return () => {
    console.log('🔄 Refrescando todas las reseñas...');
    
    // Invalidar todas las queries relacionadas con reseñas
    queryClient.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: REVIEW_STATS_QUERY_KEY });
    
    console.log('✅ Reseñas refrescadas');
  };
};

// Hook para obtener las últimas reseñas de un producto (conveniencia)
export const useLatestProductReviews = (productId: string, limit = 3) => {
  return useProductReviewsSimple(productId, { limit });
};

// Hook para obtener reseñas con alta calificación (conveniencia)
export const useHighRatedReviews = (productId: string, minRating = 4) => {
  return useProductReviewsSimple(productId, { limit: 10 });
};