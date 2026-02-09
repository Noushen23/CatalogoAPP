import { apiAlt } from './api';

export interface Ruta {
  id: string;
  repartidor_id: string;
  repartidor_nombre?: string;
  repartidor_email?: string;
  repartidor_telefono?: string;
  nombre: string;
  descripcion?: string;
  capacidad_maxima: number;
  pedidos_asignados: number;
  estado: 'planificada' | 'activa' | 'en_curso' | 'completada' | 'cancelada';
  distancia_total_km?: number;
  tiempo_estimado_minutos?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  creado_por_id?: string;
  pedidos?: RutaPedido[];
  ruta_alternativa?: RutaAlternativa;
}

export interface RutaPedido {
  id: string;
  ruta_id: string;
  orden_id: string;
  entrega_id?: string;
  orden_secuencia: number;
  distancia_desde_anterior_km?: number;
  tiempo_desde_anterior_minutos?: number;
  estado: 'pendiente' | 'en_camino' | 'entregado' | 'no_entregado' | 'cancelado';
  numero_orden?: string;
  orden_estado?: string;
  total?: number;
  entrega_estado?: string;
  fecha_asignacion?: string;
  fecha_salida?: string;
  fecha_llegada?: string;
  fecha_entrega?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  nombre_destinatario?: string;
  telefono?: string;
}

export interface RutaAlternativa {
  id: string;
  ruta_id: string;
  repartidor_id: string;
  orden_secuencia_modificada: Array<{ orden_id: string; secuencia: number }>;
  motivo?: string;
  activa: boolean;
  fecha_creacion: string;
}

export interface CrearRutaPayload {
  repartidor_id: string;
  nombre: string;
  descripcion?: string;
  capacidad_maxima?: number;
  pedidos_ids: string[];
}

export interface CambiarOrdenRutaPayload {
  ruta_id: string;
  nuevo_orden: Array<{ orden_id: string; secuencia: number }>;
  motivo?: string;
}

export interface FinalizarRutaPayload {
  ruta_id: string;
  pedidos_entregados: string[];
  pedidos_no_entregados: string[];
}

export const RutasService = {
  /**
   * Crear una nueva ruta (admin/moderator)
   */
  async crearRuta(payload: CrearRutaPayload): Promise<{ ruta_id: string }> {
    const response = await apiAlt.post('/rutas/crear', payload);
    return response.data.data;
  },

  /**
   * Obtener ruta activa del repartidor autenticado
   */
  async obtenerMiRuta(): Promise<Ruta> {
    const response = await apiAlt.get('/rutas/mi-ruta');
    return response.data.data;
  },

  /**
   * Cambiar orden de pedidos en la ruta (repartidor)
   */
  async cambiarOrdenRuta(payload: CambiarOrdenRutaPayload): Promise<{ ruta_alternativa_id: string }> {
    const response = await apiAlt.post('/rutas/cambiar-orden', payload);
    return response.data.data;
  },

  /**
   * Activar/desactivar ruta alternativa
   */
  async toggleRutaAlternativa(rutaId: string, activar: boolean): Promise<void> {
    await apiAlt.post('/rutas/toggle-alternativa', {
      ruta_id: rutaId,
      activar,
    });
  },

  /**
   * Iniciar ruta (repartidor)
   */
  async iniciarRuta(rutaId: string): Promise<void> {
    await apiAlt.post('/rutas/iniciar', { ruta_id: rutaId });
  },

  /**
   * Finalizar ruta (repartidor)
   */
  async finalizarRuta(payload: FinalizarRutaPayload): Promise<void> {
    await apiAlt.post('/rutas/finalizar', payload);
  },

  /**
   * Obtener todas las rutas (admin/moderator)
   */
  async obtenerTodasRutas(filtros?: {
    repartidor_id?: string;
    estado?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ rutas: Ruta[]; total: number }> {
    const params = new URLSearchParams();
    if (filtros?.repartidor_id) params.append('repartidor_id', filtros.repartidor_id);
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.limit) params.append('limit', filtros.limit.toString());
    if (filtros?.offset) params.append('offset', filtros.offset.toString());

    const queryString = params.toString();
    const url = queryString ? `/rutas?${queryString}` : '/rutas';

    const response = await apiAlt.get(url);
    // El backend devuelve: { success: true, message: ..., data: { rutas: [...], total: ... } }
    const responseData = response.data.data || response.data;
    console.log('Respuesta de obtenerTodasRutas:', responseData);
    return responseData;
  },
};
