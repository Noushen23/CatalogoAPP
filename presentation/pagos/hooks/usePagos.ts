import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pagosApi, CrearTransaccionRequest, Transaccion, ConfiguracionWompi } from '@/core/api/pagosApi';

// Query keys para pagos
export const PAGOS_QUERY_KEY = ['pagos'] as const;

/**
 * Hook para crear una transacción de pago
 */
export const useCrearTransaccion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CrearTransaccionRequest) => {
      console.log('💳 [Pago] Creando transacción con datos:', data);
      
      const response = await pagosApi.crearTransaccion(data);
      
      if (!response.success) {
        const error = new Error(response.message || 'Error al crear la transacción de pago');
        error.name = 'PagoCreationError';
        throw error;
      }
      
      return response.data;
    },
    onSuccess: (transaccion) => {
      console.log('✅ [Pago] Transacción creada exitosamente:', transaccion);
      
      // Invalidar queries relacionadas al pedido
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'user'] });
      
      // Opcional: Agregar la transacción al cache
      if (transaccion?.idTransaccion) {
        queryClient.setQueryData(
          [...PAGOS_QUERY_KEY, transaccion.idTransaccion],
          transaccion
        );
      }
    },
    onError: (error) => {
      console.error('❌ [Pago] Error al crear transacción:', error);
    }
  });
};

/**
 * Hook para reintentar el pago de un pedido
 */
export const useReintentarPago = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { pedidoId: string; data?: CrearTransaccionRequest }) => {
      const { pedidoId, data = {} } = payload;
      console.log('🔁 [Pago] Reintentando pago para pedido:', pedidoId);

      const response = await pagosApi.reintentarPago(pedidoId, data);

      if (!response.success) {
        const error = new Error(response.message || 'Error al reintentar el pago');
        error.name = 'PagoRetryError';
        throw error;
      }

      return response.data;
    },
    onSuccess: (transaccion) => {
      console.log('✅ [Pago] Reintento iniciado:', transaccion);

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'user'] });
    },
    onError: (error) => {
      console.error('❌ [Pago] Error al reintentar pago:', error);
    }
  });
};

/**
 * Hook para consultar el estado de una transacción
 */
export const useConsultarTransaccion = (idTransaccion: string | null) => {
  return useQuery({
    queryKey: [...PAGOS_QUERY_KEY, 'transaccion', idTransaccion],
    queryFn: async () => {
      if (!idTransaccion) {
        throw new Error('ID de transacción es requerido');
      }
      
      throw new Error('Consultar transacción no aplica para Web Checkout. Usa el webhook como fuente de verdad.');
    },
    enabled: !!idTransaccion,
    refetchInterval: false
  });
};

/**
 * Hook para obtener configuración pública de Wompi
 */
export const useConfiguracionWompi = () => {
  return useQuery({
    queryKey: [...PAGOS_QUERY_KEY, 'configuracion'],
    queryFn: async () => {
      const response = await pagosApi.obtenerConfiguracion();
      
      if (!response.success) {
        throw new Error(response.message || 'Error al obtener configuración de Wompi');
      }
      
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // Cache por 1 hora
  });
};

/**
 * Hook para obtener tiempo restante de checkout
 */
export const useCheckoutStatus = (pedidoId: string | null, enabled = true) => {
  return useQuery({
    queryKey: [...PAGOS_QUERY_KEY, 'tiempo-restante', pedidoId],
    queryFn: async () => {
      if (!pedidoId) {
        throw new Error('ID de pedido es requerido');
      }

      const response = await pagosApi.verificarTiempoRestante(pedidoId);

      if (!response.success) {
        throw new Error(response.message || 'Error al obtener tiempo restante');
      }

      return response.data;
    },
    enabled: !!pedidoId && enabled,
    refetchInterval: enabled ? 30000 : false
  });
};
