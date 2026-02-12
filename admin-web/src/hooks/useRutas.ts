import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RutasService, CrearRutaPayload, CambiarOrdenRutaPayload, FinalizarRutaPayload } from '@/lib/rutas';
import toast from 'react-hot-toast';

/**
 * Hook para obtener la ruta activa del repartidor
 */
export function useMiRuta() {
  return useQuery({
    queryKey: ['ruta', 'mi-ruta'],
    queryFn: () => RutasService.obtenerMiRuta(),
    retry: 1,
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });
}

/**
 * Hook para crear una ruta (admin/moderator)
 */
export function useCrearRuta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CrearRutaPayload) => RutasService.crearRuta(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rutas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-asignados-admin'] });
      toast.success('Ruta creada exitosamente');
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al crear la ruta';
      toast.error(message);
    },
  });
}

/**
 * Hook para cambiar el orden de una ruta (repartidor)
 */
export function useCambiarOrdenRuta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CambiarOrdenRutaPayload) => RutasService.cambiarOrdenRuta(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ruta', 'mi-ruta'] });
      queryClient.invalidateQueries({ queryKey: ['rutas'] });
      toast.success('Orden de ruta modificado exitosamente. La ruta alternativa está activa.');
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al modificar el orden de la ruta';
      toast.error(message);
    },
  });
}

/**
 * Hook para activar/desactivar ruta alternativa (repartidor)
 */
export function useToggleRutaAlternativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruta_id, activar }: { ruta_id: string; activar: boolean }) =>
      RutasService.toggleRutaAlternativa(ruta_id, activar),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ruta', 'mi-ruta'] });
      toast.success(
        variables.activar
          ? 'Ruta alternativa activada. Se mostrará el orden modificado.'
          : 'Ruta alternativa desactivada. Se usa la ruta principal.'
      );
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al cambiar estado de la ruta alternativa';
      toast.error(message);
    },
  });
}

/**
 * Hook para iniciar una ruta (repartidor)
 */
export function useIniciarRuta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rutaId: string) => RutasService.iniciarRuta(rutaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ruta', 'mi-ruta'] });
      queryClient.invalidateQueries({ queryKey: ['rutas'] });
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-asignados-admin'] });
      toast.success('Ruta iniciada exitosamente');
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al iniciar la ruta';
      toast.error(message);
    },
  });
}

/**
 * Hook para finalizar una ruta (repartidor)
 */
export function useFinalizarRuta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FinalizarRutaPayload) => RutasService.finalizarRuta(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ruta', 'mi-ruta'] });
      queryClient.invalidateQueries({ queryKey: ['rutas'] });
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-asignados-admin'] });
      toast.success('Ruta finalizada. Pedidos no entregados han sido liberados.');
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al finalizar la ruta';
      toast.error(message);
    },
  });
}

/**
 * Hook para obtener todas las rutas (admin/moderator)
 */
export function useRutas(filtros?: {
  repartidor_id?: string;
  estado?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['rutas', filtros],
    queryFn: () => RutasService.obtenerTodasRutas(filtros),
    refetchInterval: 30000,
  });
}

