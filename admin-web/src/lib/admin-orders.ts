import { apiAlt } from './api';

/**
 * Tipos de datos para los pedidos en el panel de administración
 * Basado en la documentación del backend: backend/docs/ORDERS_ENDPOINTS.md
 */
export interface AdminOrder {
  id: string;
  numeroOrden: string;
  usuarioId: string;
  estado: 'pendiente' | 'confirmada' | 'en_proceso' | 'enviada' | 'entregada' | 'cancelada' | 'reembolsada';
  total: number;
  subtotal?: number;
  descuento?: number;
  costoEnvio?: number;
  impuestos?: number;
  metodoPago: string;
  referenciaPago?: string;
  notas?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaEntregaEstimada?: string;
  fechaEntregaReal?: string;
  direccionEnvioId?: string;
  direccionEnvio?: {
    id: string;
    nombreDestinatario: string;
    telefono: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    codigoPostal?: string;
    pais?: string;
  };
  usuario: {
    email: string;
    nombreCompleto: string;
    tipoIdentificacion?: string;
    numeroIdentificacion?: string;
  };
  itemsCount?: number;
  zona?: string;
  prioridad?: 'alta' | 'media' | 'baja';
  fechaProgramadaEntrega?: string | null;
  fechaLimiteConfirmacion?: string | null;
  horaProgramada?: string | null;
  estadoLogistico?: 'pendiente' | 'en_transito' | 'entregado' | 'rechazado' | string;
  tiempoRestanteMinutos?: number;
  coordenadasEntrega?: {
    latitud: number;
    longitud: number;
  } | null;
  observacionesLogistica?: string[];
  // observacionesAsesor?: string[]; // COMENTADO - MÓDULO DE ASESOR NO EN USO
  confirmadoPor?: {
    id: string;
    nombre: string;
    fecha: string;
  } | null;
  repartidor?: {
    id: string;
    nombre: string;
    entregaId?: string;
    estadoEntrega?: string;
  } | null;
  // Campos TNS
  tns_kardex_id?: number | null;
  tercero_id?: number | null;
  montado_carro?: number;
}

export interface AdminOrderDetail extends AdminOrder {
  usuario: { 
    email: string;
    nombreCompleto: string;
    tipoIdentificacion?: string;
    numeroIdentificacion?: string;
  };
  direccionEnvio?: {
    id: string;
    nombreDestinatario: string;
    telefono: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    codigoPostal?: string;
    pais?: string;
    referencias?: string;
  };
  items: OrderItem[];
  // Información de sincronización con ApiTercero
  terceroSincronizado?: boolean;
  terceroId?: number;
  terceroNombre?: string;
  terceroExistia?: boolean;
  historialEstados?: Array<{
    estado: string;
    fecha: string;
    usuario?: string;
    notas?: string;
  }>;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productDescription?: string;
  productSku?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  imageUrl?: string;
}

export type OrderStatus = AdminOrder['estado'];
export type PaymentMethod = 'tarjeta' | 'pse' | 'nequi' | 'bancolombia_transfer';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PaginatedOrders {
  orders: AdminOrder[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface OrderFilters {
  estado?: OrderStatus;
  usuarioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  metodoPago?: PaymentMethod;
  migradoTNS?: boolean; // true = solo migrados, false = solo no migrados, undefined = todos
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

/**
 * Servicio para gestionar los pedidos desde el panel de administración
 */
export const AdminOrdersService = {
  /**
   * Obtiene todos los pedidos del sistema con filtros opcionales.
   * @param filters - Filtros opcionales para la búsqueda de pedidos.
   * @returns Una promesa que se resuelve con la lista de pedidos.
   */
  async getAllOrders(filters?: OrderFilters): Promise<ApiResponse<PaginatedOrders>> {
    
    const params = new URLSearchParams();
    
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.usuarioId) params.append('usuarioId', filters.usuarioId);
    if (filters?.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
    if (filters?.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
    if (filters?.metodoPago) params.append('metodoPago', filters.metodoPago);
    if (filters?.migradoTNS !== undefined) params.append('migradoTNS', filters.migradoTNS.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    if (filters?.orderBy) params.append('orderBy', filters.orderBy);
    if (filters?.orderDir) params.append('orderDir', filters.orderDir);
    
    const queryString = params.toString();
    const url = queryString ? `/orders?${queryString}` : '/orders';
    
    const response = await apiAlt.get<ApiResponse<PaginatedOrders>>(url);
    return response.data;
  },

  /**
   * Obtiene un pedido específico por ID con todos sus detalles.
   * @param orderId - El ID del pedido a obtener.
   * @returns Una promesa que se resuelve con los detalles del pedido.
   */
  async getOrderById(orderId: string): Promise<ApiResponse<AdminOrderDetail>> {
    const response = await apiAlt.get<ApiResponse<AdminOrderDetail>>(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Actualiza el estado de un pedido.
   * @param orderId - El ID del pedido a actualizar.
   * @param newStatus - El nuevo estado para el pedido.
   * @param notas - Notas adicionales opcionales.
   * @returns Una promesa que se resuelve con el pedido actualizado.
   */
  async updateOrderStatus(
    orderId: string, 
    newStatus: OrderStatus, 
    notas?: string,
    forceSyncTercero?: boolean
  ): Promise<ApiResponse<AdminOrderDetail>> {
    const response = await apiAlt.put<ApiResponse<AdminOrderDetail>>(
      `/orders/${orderId}/status`,
      { estado: newStatus, notas, forceSyncTercero }
    );
    return response.data;
  },

  /**
   * Obtiene las estadísticas generales de todos los pedidos.
   * @returns Una promesa que se resuelve con las estadísticas.
   */
  async getOrderStats(): Promise<ApiResponse<OrderStats>> {
    const response = await apiAlt.get<ApiResponse<OrderStats>>('/orders/stats');
    return response.data;
  },

  /**
   * Obtiene los pedidos recientes (para el dashboard).
   * @param limit - Número de pedidos a obtener (por defecto 5).
   * @returns Una promesa que se resuelve con los pedidos recientes.
   */
  async getRecentOrders(limit: number = 5): Promise<ApiResponse<PaginatedOrders>> {
    return this.getAllOrders({ limit, orderBy: 'fecha_creacion', orderDir: 'DESC' });
  },
};