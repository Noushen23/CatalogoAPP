import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi, AddItemRequest, UpdateItemRequest } from '@/core/api/cartApi';
import { CACHE_TIMES } from '@/constants/App';

// Hook para obtener el carrito
export const useCart = () => {
  return useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await cartApi.getCart();
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
  });
};

// Hook para obtener resumen del carrito
export const useCartSummary = () => {
  return useQuery({
    queryKey: ['cart', 'summary'],
    queryFn: async () => {
      const response = await cartApi.getCartSummary();
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
  });
};

// Hook para agregar producto al carrito
export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddItemRequest) => {
      const response = await cartApi.addItem(data);
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas al carrito
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'summary'] });
    },
  });
};

// Hook para actualizar cantidad de item
export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateItemRequest }) => {
      const response = await cartApi.updateItemQuantity(itemId, data);
      
      if (!response.success) {
        // Crear un error más específico con el mensaje del backend
        const error = new Error(response.message);
        error.name = 'CartUpdateError';
        throw error;
      }
      
      return response.data;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas al carrito
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'summary'] });
    },
    onError: (error) => {
      console.error('Error updating cart item:', error);
    },
  });
};

// Hook para eliminar item del carrito
export const useRemoveFromCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await cartApi.removeItem(itemId);
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas al carrito
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'summary'] });
    },
  });
};

// Hook para limpiar carrito
export const useClearCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await cartApi.clearCart();
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas al carrito
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'summary'] });
    },
  });
};

// Hook para validar carrito
export const useValidateCart = () => {
  return useQuery({
    queryKey: ['cart', 'validate'],
    queryFn: async () => {
      const response = await cartApi.validateCart();
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
  });
};

// Hook para obtener historial de carritos
export const useCartHistory = (params?: { limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: ['cart', 'history', params],
    queryFn: async () => {
      const response = await cartApi.getCartHistory(params);
      
      if (!response.success) {
        throw new Error(response.message);
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.THIRTY_MINUTES,
    retry: 1,
  });
};

