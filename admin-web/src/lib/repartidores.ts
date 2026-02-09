import { apiAlt } from './api';

export interface Repartidor {
  id: string;
  nombre_completo: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
  rol: string;
  activo: boolean;
  email_verificado: boolean;
  fecha_creacion: string;
  ultimo_acceso: string | null;
  total_entregas: number;
  entregas_en_curso: number;
  entregas_completadas: number;
  entregas_canceladas: number;
}

export interface RepartidorDetalle extends Repartidor {
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  estadisticas: {
    total_entregas: number;
    entregas_en_curso: number;
    entregas_completadas: number;
    entregas_canceladas: number;
    entregas_fallidas: number;
  };
  ultima_ubicacion: null;
}

export interface EstadisticasRepartidores {
  total_repartidores: number;
  repartidores_activos: number;
  repartidores_inactivos: number;
  total_entregas: number;
  entregas_en_curso: number;
  entregas_completadas: number;
  repartidores_con_ubicacion: number;
}

export interface FiltrosRepartidores {
  search?: string;
  activo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedRepartidores {
  repartidores: Repartidor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const RepartidoresService = {
  /**
   * Obtener lista de repartidores con filtros y paginación
   */
  async obtenerRepartidores(filtros?: FiltrosRepartidores): Promise<PaginatedRepartidores> {
    const params = new URLSearchParams();
    if (filtros?.search) params.append('search', filtros.search);
    if (filtros?.activo !== undefined) params.append('activo', filtros.activo);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.limit) params.append('limit', filtros.limit.toString());
    if (filtros?.sortBy) params.append('sortBy', filtros.sortBy);
    if (filtros?.sortOrder) params.append('sortOrder', filtros.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `/repartidores?${queryString}` : '/repartidores';
    const response = await apiAlt.get<{ success: boolean; data: PaginatedRepartidores }>(url);
    return response.data.data;
  },

  /**
   * Obtener un repartidor por ID
   */
  async obtenerRepartidorPorId(id: string): Promise<RepartidorDetalle> {
    const response = await apiAlt.get<{ success: boolean; data: RepartidorDetalle }>(`/repartidores/${id}`);
    return response.data.data;
  },

  /**
   * Obtener estadísticas de repartidores
   */
  async obtenerEstadisticas(): Promise<EstadisticasRepartidores> {
    const response = await apiAlt.get<{ success: boolean; data: EstadisticasRepartidores }>('/repartidores/estadisticas');
    return response.data.data;
  },
};


















