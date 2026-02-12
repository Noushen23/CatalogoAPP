/* COMENTADO - Módulo de reportes deshabilitado
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  GenerarReportePayload,
  ReportsService,
  TipoReporte,
} from '@/lib/reports';

export function useReportes(params?: {
  page?: number;
  limit?: number;
  tipo?: TipoReporte;
  repartidor_id?: string;
}) {
  return useQuery({
    queryKey: ['reportes', params],
    queryFn: () =>
      ReportsService.obtenerReportes({
        page: params?.page,
        limit: params?.limit,
        tipo: params?.tipo,
        repartidor_id: params?.repartidor_id,
      }),
    keepPreviousData: true,
  });
}

export function useReporte(id: string | null) {
  return useQuery({
    queryKey: ['reporte', id],
    queryFn: () => (id ? ReportsService.obtenerReporte(id) : null),
    enabled: !!id,
  });
}

export function useGenerarReporte() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GenerarReportePayload) => ReportsService.generarReporte(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes'] });
      toast.success('Reporte generado correctamente');
    },
    onError: (error: unknown) => {
      toast.error(error.response?.data?.message || 'Error al generar reporte');
    },
  });
}
*/

// Hooks comentados - módulo de reportes deshabilitado
import { useQuery } from '@tanstack/react-query';
import { TipoReporte } from '@/lib/reports';

export function useReportes(params?: {
  page?: number;
  limit?: number;
  tipo?: TipoReporte;
  repartidor_id?: string;
}) {
  return useQuery({
    queryKey: ['reportes', params],
    queryFn: () => Promise.resolve({ data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } }),
    enabled: false,
  });
}

export function useReporte(id: string | null) {
  return useQuery({
    queryKey: ['reporte', id],
    queryFn: () => Promise.resolve(null),
    enabled: false,
  });
}

export function useGenerarReporte() {
  return {
    mutateAsync: async () => {
      throw new Error('Módulo de reportes deshabilitado');
    },
    isPending: false,
  };
}
