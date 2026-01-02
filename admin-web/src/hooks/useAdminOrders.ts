import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminOrdersService, OrderFilters, OrderStatus } from '@/lib/admin-orders';
import toast from 'react-hot-toast';

/**
 * Hook para obtener todos los pedidos con filtros opcionales y cache inteligente
 */
export function useAdminOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['admin-orders', filters],
    queryFn: () => AdminOrdersService.getAllOrders(filters),
    staleTime: 1000 * 60 * 3, // 3 minutos - menos tiempo que el individual porque cambia más
    gcTime: 1000 * 60 * 8, // 8 minutos
    refetchOnWindowFocus: false, // No refetch al cambiar de ventana
    refetchOnMount: false, // No refetch al montar si ya tenemos datos
    refetchOnReconnect: true, // Solo refetch al reconectar
  });
}

/**
 * Hook para obtener un pedido específico por ID con cache inteligente
 */
export function useAdminOrder(orderId: string) {
  return useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: () => AdminOrdersService.getOrderById(orderId),
    enabled: !!orderId,
    staleTime: 1000 * 60 * 5, // 5 minutos - más tiempo para evitar refetch innecesario
    gcTime: 1000 * 60 * 10, // 10 minutos - mantener en cache más tiempo
    refetchOnWindowFocus: false, // No refetch al cambiar de ventana
    refetchOnMount: false, // No refetch al montar si ya tenemos datos
    refetchOnReconnect: true, // Solo refetch al reconectar
  });
}

/**
 * Hook para obtener estadísticas de pedidos con cache inteligente
 */
export function useOrderStats() {
  return useQuery({
    queryKey: ['admin-orders-stats'],
    queryFn: () => AdminOrdersService.getOrderStats(),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}

/**
 * Hook para obtener pedidos recientes con cache inteligente
 */
export function useRecentOrders(limit: number = 5) {
  return useQuery({
    queryKey: ['admin-orders-recent', limit],
    queryFn: () => AdminOrdersService.getRecentOrders(limit),
    staleTime: 1000 * 60 * 2, // 2 minutos - más frecuente porque es para dashboard
    gcTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}

/**
 * Hook para actualizar el estado de un pedido con actualización optimista
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      newStatus,
      notas,
    }: {
      orderId: string;
      newStatus: OrderStatus;
      notas?: string;
    }) => AdminOrdersService.updateOrderStatus(orderId, newStatus, notas),
    
    // Actualización optimista - actualiza la UI inmediatamente
    onMutate: async ({ orderId, newStatus, notas }) => {
      // Cancelar cualquier refetch en progreso para evitar conflictos
      await queryClient.cancelQueries({ queryKey: ['admin-order', orderId] });
      await queryClient.cancelQueries({ queryKey: ['admin-orders'] });

      // Obtener el pedido actual del cache
      const previousOrder = queryClient.getQueryData(['admin-order', orderId]);
      const previousOrders = queryClient.getQueryData(['admin-orders']);

      // Actualizar optimistamente el pedido individual
      if (previousOrder) {
        queryClient.setQueryData(['admin-order', orderId], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              estado: newStatus,
              fechaActualizacion: new Date().toISOString(),
              notas: notas || old.data.notas,
            },
          };
        });
      }

      // Actualizar optimistamente la lista de pedidos
      if (previousOrders) {
        queryClient.setQueryData(['admin-orders'], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: {
              ...old.data,
              orders: old.data.orders.map((order: any) =>
                order.id === orderId
                  ? {
                      ...order,
                      estado: newStatus,
                      fechaActualizacion: new Date().toISOString(),
                    }
                  : order
              ),
            },
          };
        });
      }

      // Retornar contexto para rollback en caso de error
      return { previousOrder, previousOrders };
    },
    
    onSuccess: (response, variables) => {
      // Actualizar con los datos reales del servidor
      queryClient.setQueryData(['admin-order', variables.orderId], response);
      
      // Invalidar queries relacionadas de forma más selectiva
      queryClient.invalidateQueries({ 
        queryKey: ['admin-orders'],
        exact: false,
        refetchType: 'none' // No hacer refetch automático, solo invalidar
      });
      queryClient.invalidateQueries({ 
        queryKey: ['admin-orders-stats'],
        refetchType: 'none'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['admin-orders-recent'],
        refetchType: 'none'
      });
      
      const data = response?.data;
      const statusLabels: Record<OrderStatus, string> = {
        pendiente: 'Pendiente',
        confirmada: 'Confirmada',
        en_proceso: 'En Proceso',
        enviada: 'Enviada',
        entregada: 'Entregada',
        cancelada: 'Cancelada',
        reembolsada: 'Reembolsada',
      };
      
      // Notificación principal de éxito - SIMPLE Y CLARA
      if (variables.newStatus === 'confirmada') {
        toast.success('✅ Pedido confirmado exitosamente', {
          duration: 3000,
          position: 'top-right',
        });
      } else {
        toast.success(`✅ Pedido actualizado a: ${statusLabels[variables.newStatus]}`, {
          duration: 3000,
          position: 'top-right',
        });
      }
      
      // Si se confirmó el pedido y se sincronizó con ApiTercero
      if (variables.newStatus === 'confirmada' && data?.terceroSincronizado) {
        toast.success(
          `🎯 Cliente sincronizado con TNS${data.terceroNombre ? `: ${data.terceroNombre}` : ''}`,
          {
            duration: 4000,
            position: 'top-right',
            icon: '🔗',
          }
        );
      }
      
    },

    // Rollback en caso de error
    onError: (error: any, variables, context) => {
      // Restaurar el estado anterior
      if (context?.previousOrder) {
        queryClient.setQueryData(['admin-order', variables.orderId], context.previousOrder);
      }
      if (context?.previousOrders) {
        queryClient.setQueryData(['admin-orders'], context.previousOrders);
      }
      
      console.error('❌ Error al actualizar el estado del pedido:', error);
      
      // Acceder al objeto de error completo de axios
      const statusCode = error?.response?.status;
      const errorMessage = error?.response?.data?.message || error?.message || 'Error desconocido';
      const errorDetails = error?.response?.data?.details;
      const errorData = error?.response?.data?.error;
      
      // ⚠️ ERROR 503: Fallo de Sincronización con TNS/ApiTercero
      if (statusCode === 503) {
        console.error('🚨 ERROR 503: Fallo de sincronización con ApiTercero');
        console.error('Detalles:', { errorMessage, errorDetails, errorData });
        
        // Notificación principal con título y mensaje claro
        toast.error(
          '🚨 Fallo de Sincronización con TNS\n\nNo se pudo validar/crear el cliente en el sistema externo. El pedido NO fue confirmado.\n\nRevise la conexión con ApiTercero y vuelva a intentarlo.',
          {
            duration: 10000, // 10 segundos para leer el mensaje completo
            position: 'top-right',
            style: {
              minWidth: '400px',
              maxWidth: '500px',
              whiteSpace: 'pre-line',
              lineHeight: '1.5',
            },
            icon: '⚠️',
          }
        );
        
        // Si hay detalles técnicos adicionales, mostrarlos en un segundo toast
        if (errorDetails || errorData) {
          setTimeout(() => {
            toast.error(
              `💡 Información técnica: ${errorDetails || errorData}`,
              {
                duration: 8000,
                position: 'top-right',
                style: {
                  fontSize: '13px',
                },
              }
            );
          }, 500);
        }
        
        // IMPORTANTE: NO actualizamos el estado del pedido en la UI
        // Las queries NO se invalidan, el pedido permanece "pendiente"
        console.warn('⚠️ El estado del pedido permanece sin cambios debido al error de sincronización.');
        
      } else if (statusCode === 400) {
        // Error de validación
        toast.error(
          `❌ Error de validación: ${errorMessage}`,
          {
            duration: 5000,
            position: 'top-right',
          }
        );
      } else if (statusCode === 404) {
        // Pedido no encontrado
        toast.error(
          '❌ Pedido no encontrado',
          {
            duration: 5000,
            position: 'top-right',
          }
        );
      } else if (statusCode >= 500) {
        // Error interno del servidor
        toast.error(
          '❌ Error interno del servidor. Por favor, intente nuevamente.',
          {
            duration: 6000,
            position: 'top-right',
          }
        );
      } else {
        // Cualquier otro error
        toast.error(
          `❌ No se pudo actualizar el estado del pedido: ${errorMessage}`,
          {
            duration: 5000,
            position: 'top-right',
          }
        );
      }
    },
  });
}

