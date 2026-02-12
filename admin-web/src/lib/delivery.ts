import { apiAlt } from './api';

export interface Ubicacion {
  latitud: number;
  longitud: number;
  precision_metros?: number;
  velocidad_kmh?: number;
  direccion_grados?: number;
  bateria_porcentaje?: number;
  conectado?: number | boolean;
}


export interface Entrega {
  id: string;
  orden_id: string;
  repartidor_id: string;
  estado: 'asignada' | 'en_camino' | 'llegada' | 'entregada' | 'cancelada' | 'fallida';
  fecha_asignacion: string;
  fecha_salida?: string;
  fecha_llegada?: string;
  fecha_entrega?: string;
  fecha_cancelacion?: string;
  distancia_km?: number;
  tiempo_minutos?: number;
  observaciones?: string;
  firma_cliente?: string;
  foto_entrega?: string;
  numero_orden?: string;
  orden_estado?: string;
  repartidor_nombre?: string;
  direccion?: string;
  ciudad?: string;
  nombre_destinatario?: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
  latitud_llegada?: number;
  longitud_llegada?: number;
}

export interface RutaCalculada {
  distancia_km: number;
  tiempo_minutos: number;
  polilinea: string;
  pasos?: Array<{
    distancia_km: number;
    tiempo_minutos: number;
    instrucciones: string[];
  }>;
}

export const DeliveryService = {


  /**
   * Obtener entregas del repartidor
   */
  async obtenerMisEntregas(estado?: string): Promise<Entrega[]> {
    const params = estado ? { estado } : {};
    const response = await apiAlt.get('/delivery/entregas', { params });
    return response.data.data || [];
  },

  /**
   * Obtener entrega por ID
   */
  async obtenerEntrega(id: string): Promise<Entrega> {
    const response = await apiAlt.get(`/delivery/entregas/${id}`);
    return response.data.data;
  },

  /**
   * Iniciar entrega
   */
  async iniciarEntrega(id: string): Promise<Entrega> {
    const response = await apiAlt.post(`/delivery/entregas/${id}/iniciar`);
    return response.data.data;
  },

  /**
   * Registrar llegada
   */
  async registrarLlegada(id: string, latitud: number, longitud: number): Promise<Entrega> {
    const response = await apiAlt.post(`/delivery/entregas/${id}/llegada`, {
      latitud,
      longitud,
    });
    return response.data.data;
  },

  /**
   * Completar entrega
   */
  async completarEntrega(
    id: string,
    datos: {
      firma_cliente?: string;
      foto_entrega?: string;
      observaciones?: string;
    }
  ): Promise<Entrega> {
    const response = await apiAlt.post(`/delivery/entregas/${id}/completar`, datos);
    return response.data.data;
  },

  /**
   * Cancelar entrega
   */
  async cancelarEntrega(
    id: string,
    motivo: string,
    motivoDetalle?: string
  ): Promise<{ success: boolean; reasignado: boolean; nueva_entrega_id?: string; repartidor_nuevo?: unknown }> {
    const response = await apiAlt.post(`/delivery/entregas/${id}/cancelar`, {
      motivo,
      motivo_detalle: motivoDetalle,
    });
    return response.data.data;
  },

  /**
   * Obtener coordenadas desde dirección
   */
  async obtenerCoordenadas(direccion: string): Promise<{ latitud: number; longitud: number }> {
    const response = await apiAlt.get('/delivery/mapas/coordenadas', {
      params: { direccion },
    });
    return response.data.data;
  },

  /**
   * Calcular ruta entre dos puntos
   */
  async calcularRuta(
    origen: { latitud: number; longitud: number },
    destino: { latitud: number; longitud: number },
    waypoints?: Array<{ latitud: number; longitud: number }>
  ): Promise<RutaCalculada> {
    const response = await apiAlt.post('/delivery/mapas/ruta', {
      origen,
      destino,
      waypoints: waypoints || [],
    });
    return response.data.data;
  },

  /**
   * Obtener repartidores disponibles
   */
  async obtenerRepartidoresDisponibles(ordenId?: string): Promise<RepartidorDisponible[]> {
    const params = ordenId ? { orden_id: ordenId } : {};
    const response = await apiAlt.get('/repartidores/disponibles', { params });
    return response.data.data || [];
  },

  /**
   * Asignar pedido a repartidor
   */
  async asignarPedidoARepartidor(
    ordenId: string,
    repartidorId: string,
    motivoReasignacion?: string
  ): Promise<{ success: boolean; entrega: Entrega; repartidor: unknown; reasignado?: boolean }> {
    const response = await apiAlt.post('/delivery/pedidos/asignar-repartidor', {
      orden_id: ordenId,
      repartidor_id: repartidorId,
      motivo_reasignacion: motivoReasignacion || undefined,
    });
    return response.data.data;
  },

  /**
   * Obtener todos los pedidos asignados a repartidores (vista administrativa)
   */
  async obtenerTodosPedidosAsignados(filtros?: {
    estado?: string;
    repartidor_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    orden_estado?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    pedidos: PedidoAsignadoAdmin[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.repartidor_id) params.append('repartidor_id', filtros.repartidor_id);
    if (filtros?.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
    if (filtros?.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
    if (filtros?.orden_estado) params.append('orden_estado', filtros.orden_estado);
    if (filtros?.limit) params.append('limit', filtros.limit.toString());
    if (filtros?.offset) params.append('offset', filtros.offset.toString());

    const queryString = params.toString();
    const url = queryString
      ? `/delivery/pedidos/asignados?${queryString}`
      : '/delivery/pedidos/asignados';

    try {
      const response = await apiAlt.get(url);
      const data = response.data?.data;
      
      // Asegurar que siempre retornamos un objeto válido
      if (!data) {
        console.warn('⚠️ obtenerTodosPedidosAsignados: respuesta sin data, retornando valores por defecto');
        return {
          pedidos: [],
          total: 0,
          limit: filtros?.limit || 25,
          offset: filtros?.offset || 0,
        };
      }

      // Validar estructura de respuesta
      return {
        pedidos: Array.isArray(data.pedidos) ? data.pedidos : [],
        total: typeof data.total === 'number' ? data.total : 0,
        limit: typeof data.limit === 'number' ? data.limit : (filtros?.limit || 25),
        offset: typeof data.offset === 'number' ? data.offset : (filtros?.offset || 0),
      };
    } catch (error) {
      console.error('❌ Error en obtenerTodosPedidosAsignados:', error);
      // Retornar valores por defecto en caso de error
      return {
        pedidos: [],
        total: 0,
        limit: filtros?.limit || 25,
        offset: filtros?.offset || 0,
      };
    }
  },

  /**
   * Marcar pedido como montado al carro
   */
  async marcarPedidoMontadoAlCarro(ordenId: string): Promise<{
    success: boolean;
    estadoActualizado: boolean;
    mensaje: string;
  condiciones?: unknown;
    razon?: string;
  }> {
    const response = await apiAlt.post('/delivery/pedidos/marcar-montado-carro', {
      orden_id: ordenId,
    });
    return response.data.data;
  },

  /**
   * Verificar y actualizar estado a en_proceso
   */
  async verificarYActualizarEstadoEnProceso(ordenId: string): Promise<{
    actualizado: boolean;
    nuevoEstado?: string;
  condiciones?: unknown;
    razon?: string;
  }> {
    const response = await apiAlt.post('/delivery/pedidos/verificar-estado-proceso', {
      orden_id: ordenId,
    });
    return response.data.data;
  },
};

export interface RepartidorDisponible {
  id: string;
  nombre_completo: string;
  email: string;
  telefono?: string;
  entregas_en_curso: number;
  ultima_latitud?: number;
  ultima_longitud?: number;
  ultima_ubicacion_fecha?: string;
  distancia_km?: number | null;
}

export interface PedidoAsignadoAdmin {
  ruta_id?: string | null;
  ruta_nombre?: string | null;
  ruta_estado?: 'planificada' | 'activa' | 'en_curso' | 'completada' | 'cancelada' | null;
  id: string;
  numero_orden: string;
  orden_estado: string;
  total: number;
  subtotal?: number;
  costo_envio?: number;
  descuento?: number;
  impuestos?: number;
  metodo_pago: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fecha_entrega_estimada?: string;
  fecha_entrega_real?: string;
  usuario_id: string;
  usuario_email: string;
  usuario_nombre: string;
  direccion_id?: string;
  nombre_destinatario?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  codigo_postal?: string;
  pais?: string;
  entrega_id: string;
  entrega_estado: string;
  fecha_asignacion: string;
  fecha_salida?: string;
  fecha_llegada?: string;
  fecha_entrega?: string;
  repartidor_id: string;
  repartidor_nombre: string;
  repartidor_email?: string;
  repartidor_telefono?: string;
  prioridad?: string;
  fecha_programada?: string;
  items_count?: number;
  latitud?: number;
  longitud?: number;
}

