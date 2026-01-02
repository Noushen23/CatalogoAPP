/* COMENTADO - Módulo de reportes deshabilitado
import { apiClient } from './api-client';

export type TipoReporte = 'diario' | 'semanal' | 'mensual' | 'personalizado';

export interface ReporteEntrega {
  id: string;
  tipo_reporte: TipoReporte;
  fecha_inicio: string;
  fecha_fin: string;
  repartidor_id?: string | null;
  repartidor_nombre?: string | null;
  ruta_id?: string | null;
  zona?: string | null;
  total_entregas: number;
  entregas_exitosas: number;
  entregas_fallidas: number;
  entregas_canceladas: number;
  tiempo_promedio_minutos?: number | null;
  distancia_total_km?: number | null;
  reasignaciones_totales: number;
  datos_detallados?: any;
  generado_por_id?: string | null;
  generado_por_nombre?: string | null;
  fecha_generacion: string;
}

export interface ReportesResponse {
  data: ReporteEntrega[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface GenerarReportePayload {
  tipo_reporte: TipoReporte;
  fecha_inicio: string;
  fecha_fin: string;
  repartidor_id?: string;
  ruta_id?: string;
  zona?: string;
}

export const ReportsService = {
  async generarReporte(payload: GenerarReportePayload): Promise<ReporteEntrega> {
    const response = await apiClient.post('/delivery/reportes/generar', payload);
    return response.data.data;
  },

  async obtenerReportes(params?: {
    page?: number;
    limit?: number;
    tipo?: TipoReporte;
    repartidor_id?: string;
  }): Promise<ReportesResponse> {
    const response = await apiClient.get('/delivery/reportes', { params });
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  },

  async obtenerReporte(id: string): Promise<ReporteEntrega> {
    const response = await apiClient.get(`/delivery/reportes/${id}`);
    return response.data.data;
  },
};
*/

// Tipos y servicios comentados - módulo de reportes deshabilitado
export type TipoReporte = 'diario' | 'semanal' | 'mensual' | 'personalizado';

export interface ReporteEntrega {
  id: string;
  tipo_reporte: TipoReporte;
  fecha_inicio: string;
  fecha_fin: string;
  repartidor_id?: string | null;
  repartidor_nombre?: string | null;
  ruta_id?: string | null;
  zona?: string | null;
  total_entregas: number;
  entregas_exitosas: number;
  entregas_fallidas: number;
  entregas_canceladas: number;
  tiempo_promedio_minutos?: number | null;
  distancia_total_km?: number | null;
  reasignaciones_totales: number;
  datos_detallados?: any;
  generado_por_id?: string | null;
  generado_por_nombre?: string | null;
  fecha_generacion: string;
}

export interface ReportesResponse {
  data: ReporteEntrega[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface GenerarReportePayload {
  tipo_reporte: TipoReporte;
  fecha_inicio: string;
  fecha_fin: string;
  repartidor_id?: string;
  ruta_id?: string;
  zona?: string;
}

export const ReportsService = {
  async generarReporte(): Promise<ReporteEntrega> {
    throw new Error('Módulo de reportes deshabilitado');
  },
  async obtenerReportes(): Promise<ReportesResponse> {
    throw new Error('Módulo de reportes deshabilitado');
  },
  async obtenerReporte(): Promise<ReporteEntrega> {
    throw new Error('Módulo de reportes deshabilitado');
  },
};
