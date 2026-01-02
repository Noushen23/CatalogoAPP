import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeliveryService } from '@/lib/delivery';
import toast from 'react-hot-toast';

/**
 * Hook para obtener entregas del repartidor
 */
export function useEntregas(estado?: string) {
  return useQuery({
    queryKey: ['entregas', estado],
    queryFn: () => DeliveryService.obtenerMisEntregas(estado),
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

/**
 * Hook para obtener entrega específica
 */
export function useEntrega(id: string | null) {
  return useQuery({
    queryKey: ['entrega', id],
    queryFn: () => (id ? DeliveryService.obtenerEntrega(id) : null),
    enabled: !!id,
    refetchInterval: 10000, // Refrescar cada 10 segundos
  });
}

/**
 * Hook para mutaciones de entrega
 */
export function useDeliveryMutations() {
  const queryClient = useQueryClient();

  const iniciarEntrega = useMutation({
    mutationFn: (id: string) => DeliveryService.iniciarEntrega(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['entrega'] });
      toast.success('Entrega iniciada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al iniciar entrega');
    },
  });

  const registrarLlegada = useMutation({
    mutationFn: ({ id, latitud, longitud }: { id: string; latitud: number; longitud: number }) =>
      DeliveryService.registrarLlegada(id, latitud, longitud),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['entrega'] });
      toast.success('Llegada registrada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al registrar llegada');
    },
  });

  const completarEntrega = useMutation({
    mutationFn: ({
      id,
      datos,
    }: {
      id: string;
      datos: { firma_cliente?: string; foto_entrega?: string; observaciones?: string };
    }) => DeliveryService.completarEntrega(id, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['entrega'] });
      toast.success('Entrega completada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al completar entrega');
    },
  });

  const cancelarEntrega = useMutation({
    mutationFn: ({
      id,
      motivo,
      motivoDetalle,
    }: {
      id: string;
      motivo: string;
      motivoDetalle?: string;
    }) => DeliveryService.cancelarEntrega(id, motivo, motivoDetalle),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['entrega'] });
      if (data.reasignado) {
        toast.success('Entrega cancelada y reasignada correctamente');
      } else {
        toast.success('Entrega cancelada. El pedido quedó pendiente de reasignación');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cancelar entrega');
    },
  });

  return {
    iniciarEntrega: iniciarEntrega.mutate,
    estaIniciando: iniciarEntrega.isPending,
    registrarLlegada: registrarLlegada.mutate,
    estaRegistrandoLlegada: registrarLlegada.isPending,
    completarEntrega: completarEntrega.mutate,
    estaCompletando: completarEntrega.isPending,
    cancelarEntrega: cancelarEntrega.mutate,
    estaCancelando: cancelarEntrega.isPending,
  };
}

/**
 * Hook para obtener repartidores disponibles
 */
export function useRepartidoresDisponibles(ordenId?: string) {
  return useQuery({
    queryKey: ['repartidoresDisponibles', ordenId],
    queryFn: () => DeliveryService.obtenerRepartidoresDisponibles(ordenId),
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // Refrescar cada minuto
  });
}

/**
 * Hook para asignar pedido a repartidor
 */
export function useAsignarPedidoARepartidor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ordenId,
      repartidorId,
      motivoReasignacion,
    }: {
      ordenId: string;
      repartidorId: string;
      motivoReasignacion?: string;
    }) => DeliveryService.asignarPedidoARepartidor(ordenId, repartidorId, motivoReasignacion),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['repartidoresDisponibles'] });
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-asignados-admin'] });
      const message = data?.reasignado 
        ? 'Pedido reasignado correctamente al repartidor'
        : 'Pedido asignado al repartidor correctamente';
      toast.success(message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al asignar pedido al repartidor');
    },
  });
}


