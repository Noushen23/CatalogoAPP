import { useQuery } from '@tanstack/react-query';
import { DeliveryService, PedidoAsignadoAdmin } from '@/lib/delivery';

interface FiltrosPedidosAsignados {
  estado?: string;
  repartidor_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  limit?: number;
  offset?: number;
}

export function usePedidosAsignados(filtros?: FiltrosPedidosAsignados) {
  return useQuery({
    queryKey: ['pedidos-asignados-admin', filtros],
    queryFn: async () => {
      try {
        const result = await DeliveryService.obtenerTodosPedidosAsignados(filtros);
        // Asegurar que siempre retornamos un valor válido
        if (!result) {
          console.warn('⚠️ usePedidosAsignados: resultado undefined, retornando valores por defecto');
          return {
            pedidos: [],
            total: 0,
            limit: filtros?.limit || 25,
            offset: filtros?.offset || 0,
          };
        }
        return result;
      } catch (error: any) {
        console.error('❌ Error en usePedidosAsignados:', error);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
        // Retornar valores por defecto en caso de error
        throw error; // Re-lanzar para que React Query maneje el error
      }
    },
    refetchInterval: 30000,
    retry: 1,
  });
}

