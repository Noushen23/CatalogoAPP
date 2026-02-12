import { useQuery } from '@tanstack/react-query';
import { RepartidoresService, FiltrosRepartidores } from '@/lib/repartidores';

/**
 * Hook para obtener lista de repartidores con filtros
 */
export function useRepartidores(filtros?: FiltrosRepartidores) {
  return useQuery({
    queryKey: ['repartidores', filtros],
    queryFn: () => RepartidoresService.obtenerRepartidores(filtros),
  });
}

/**
 * Hook para obtener un repartidor por ID
 */
export function useRepartidor(id: string | null) {
  return useQuery({
    queryKey: ['repartidor', id],
    queryFn: () => RepartidoresService.obtenerRepartidorPorId(id!),
    enabled: !!id,
  });
}

/**
 * Hook para obtener estadísticas de repartidores
 */
export function useEstadisticasRepartidores() {
  return useQuery({
    queryKey: ['estadisticas-repartidores'],
    queryFn: () => RepartidoresService.obtenerEstadisticas(),
  });
}


















