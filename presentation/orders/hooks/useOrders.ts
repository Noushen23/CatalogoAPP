import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { 
  ordersApi, 
  CreateOrderFromCartRequest, 
  CancelOrderRequest, 
  OrderFilters,
  Order,
  OrderSimple,
  OrderStats
} from '@/core/api/ordersApi';
import { CACHE_TIMES } from '@/constants/App';

// Claves de query para consistencia
const ORDERS_QUERY_KEY = ['orders'];
const ORDER_STATS_QUERY_KEY = ['order-stats'];

// Hook para obtener pedidos del usuario autenticado con paginación infinita
export const useUserOrders = (filters: OrderFilters = {}) => {
  return useInfiniteQuery({
    queryKey: [...ORDERS_QUERY_KEY, 'user', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await ordersApi.getUserOrders({
        ...filters,
        limit: filters.limit || 20,
        offset: pageParam * (filters.limit || 20)
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar los pedidos');
      }
      
      return {
        ...response.data,
        nextPage: response.data.orders.length === (filters.limit || 20) ? pageParam + 1 : undefined
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Hook para obtener pedidos del usuario autenticado (versión simple sin paginación infinita)
export const useUserOrdersSimple = (filters: OrderFilters = {}) => {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, 'user', 'simple', filters],
    queryFn: async () => {
      const response = await ordersApi.getUserOrders(filters);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar los pedidos');
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Hook para obtener pedido específico del usuario
export const useUserOrder = (orderId: string) => {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, 'user', orderId],
    queryFn: async () => {
      if (!orderId) {
        throw new Error('ID de pedido requerido');
      }

      const response = await ordersApi.getUserOrder(orderId);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar el pedido');
      }
      
      return response.data;
    },
    enabled: !!orderId,
    staleTime: CACHE_TIMES.TEN_MINUTES,
    retry: 1,
  });
};

// Hook para obtener estadísticas de pedidos del usuario
export const useUserOrderStats = () => {
  return useQuery({
    queryKey: ORDER_STATS_QUERY_KEY,
    queryFn: async () => {
      const response = await ordersApi.getUserOrderStats();
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar las estadísticas de pedidos');
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.TEN_MINUTES,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Hook para crear pedido desde carrito
export const useCreateOrderFromCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrderFromCartRequest) => {
      console.log('🚀 Creando pedido desde carrito con datos:', data);
      
      const response = await ordersApi.createOrderFromCart(data);
      
      if (!response.success) {
        // Crear un error más específico con el mensaje del backend
        const error = new Error(response.message || 'Error al crear el pedido');
        error.name = 'OrderCreationError';
        throw error;
      }
      
      return response.data;
    },
    onSuccess: (orderData) => {
      console.log('✅ Pedido creado exitosamente:', orderData);
      
      // Invalidar queries relacionadas al carrito (ya que se vaciará)
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'summary'] });
      
      // Invalidar el historial de pedidos para que aparezca la nueva orden
      queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, 'user'] });
      
      // Invalidar estadísticas de pedidos
      queryClient.invalidateQueries({ queryKey: ORDER_STATS_QUERY_KEY });
      
      // Opcional: Agregar el nuevo pedido al cache para evitar refetch inmediato
      if (orderData?.id) {
        queryClient.setQueryData(
          [...ORDERS_QUERY_KEY, 'user', orderData.id], 
          orderData
        );
      }
      
      // Mostrar notificación de éxito (opcional)
      if (orderData?.numeroOrden) {
        console.log(`🎉 Pedido ${orderData.numeroOrden} creado exitosamente!`);
      }
    },
    onError: (error) => {
      console.error('❌ Error al crear pedido:', error);
      
      // Log específico para debugging
      if (error.name === 'OrderCreationError') {
        console.error('💡 Detalles del error de creación de pedido:', {
          message: error.message,
          stack: error.stack
        });
      }
    },
  });
};

// Hook para cancelar pedido del usuario
export const useCancelUserOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: CancelOrderRequest }) => {
      console.log('🚫 Cancelando pedido:', orderId, 'con razón:', data.reason);
      
      const response = await ordersApi.cancelUserOrder(orderId, data);
      
      if (!response.success) {
        const error = new Error(response.message || 'Error al cancelar el pedido');
        error.name = 'OrderCancellationError';
        throw error;
      }
      
      return response.data;
    },
    onSuccess: (orderData) => {
      if (orderData?.numeroOrden) {
        console.log('✅ Pedido cancelado exitosamente:', orderData.numeroOrden);
      }
      
      // Invalidar queries relacionadas a pedidos
      queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, 'user'] });
      queryClient.invalidateQueries({ queryKey: ORDER_STATS_QUERY_KEY });
      
      // Actualizar el pedido específico en el cache
      if (orderData?.id) {
        queryClient.setQueryData(
          [...ORDERS_QUERY_KEY, 'user', orderData.id], 
          orderData
        );
      }
      
      if (orderData?.numeroOrden) {
        console.log(`🔄 Pedido ${orderData.numeroOrden} cancelado exitosamente!`);
      }
    },
    onError: (error) => {
      console.error('❌ Error al cancelar pedido:', error);
      
      if (error.name === 'OrderCancellationError') {
        console.error('💡 Detalles del error de cancelación:', {
          message: error.message,
          stack: error.stack
        });
      }
    },
  });
};

// Hook para obtener todos los pedidos (admin)
export const useAllOrders = (filters: OrderFilters = {}) => {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, 'all', filters],
    queryFn: async () => {
      const response = await ordersApi.getAllOrders(filters);
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar todos los pedidos');
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Hook para actualizar estado de pedido (admin)
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: any }) => {
      console.log('📝 Actualizando estado del pedido:', orderId, 'a:', data.estado);
      
      const response = await ordersApi.updateOrderStatus(orderId, data);
      
      if (!response.success) {
        const error = new Error(response.message || 'Error al actualizar el estado del pedido');
        error.name = 'OrderStatusUpdateError';
        throw error;
      }
      
      return response.data;
    },
    onSuccess: (orderData) => {
      if (orderData?.numeroOrden && orderData?.estado) {
        console.log('✅ Estado del pedido actualizado:', orderData.numeroOrden, '->', orderData.estado);
      }
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ORDER_STATS_QUERY_KEY });
      
      // Actualizar el pedido específico en el cache
      if (orderData?.id) {
        queryClient.setQueryData(
          [...ORDERS_QUERY_KEY, 'user', orderData.id], 
          orderData
        );
      }
      
      if (orderData?.numeroOrden && orderData?.estado) {
        console.log(`🔄 Estado del pedido ${orderData.numeroOrden} actualizado a ${orderData.estado}!`);
      }
    },
    onError: (error) => {
      console.error('❌ Error al actualizar estado del pedido:', error);
      
      if (error.name === 'OrderStatusUpdateError') {
        console.error('💡 Detalles del error de actualización:', {
          message: error.message,
          stack: error.stack
        });
      }
    },
  });
};

// Hook para obtener estadísticas generales (admin)
export const useOrderStats = () => {
  return useQuery({
    queryKey: [...ORDER_STATS_QUERY_KEY, 'admin'],
    queryFn: async () => {
      const response = await ordersApi.getOrderStats();
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar las estadísticas de pedidos');
      }
      
      return response.data;
    },
    staleTime: CACHE_TIMES.TEN_MINUTES,
    retry: 1,
    refetchOnWindowFocus: true,
  });
};

// Hook de conveniencia para refrescar todos los datos de pedidos
export const useRefreshOrders = () => {
  const queryClient = useQueryClient();

  return () => {
    console.log('🔄 Refrescando todos los datos de pedidos...');
    
    // Invalidar todas las queries relacionadas con pedidos
    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ORDER_STATS_QUERY_KEY });
    
    console.log('✅ Datos de pedidos refrescados');
  };
};

// Hook para obtener pedidos pendientes (conveniencia)
export const usePendingOrders = () => {
  return useUserOrdersSimple({ estado: 'pendiente' });
};

// Hook para obtener pedidos entregados (conveniencia)
export const useDeliveredOrders = () => {
  return useUserOrdersSimple({ estado: 'entregada' });
};

// Hook para obtener el último pedido del usuario
export const useLatestOrder = () => {
  return useQuery({
    queryKey: [...ORDERS_QUERY_KEY, 'user', 'latest'],
    queryFn: async () => {
      const response = await ordersApi.getUserOrders({ limit: 1 });
      
      if (!response.success) {
        throw new Error(response.message || 'Error al cargar el último pedido');
      }
      
      return response.data?.orders?.[0] || null;
    },
    staleTime: CACHE_TIMES.FIVE_MINUTES,
    retry: 1,
  });
};