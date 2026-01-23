import { apiClient, ApiResponse } from './apiClient';

// Interfaces para pedidos
export interface OrderItem {
  id: string;
  productId: string;
  // Campos de la nueva API
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
  // Campos legacy para compatibilidad
  productName?: string;
  productDescription?: string;
  quantity?: number;
  unitPrice?: number;
  imageUrl?: string;
}

export interface ShippingAddress {
  id?: string; // UUID del backend
  nombreDestinatario: string;
  telefono?: string;
  direccion: string;
  ciudad: string;
  departamento: string;
}

export interface Order {
  id: string;
  numeroOrden: string;
  usuarioId: string;
  direccionEnvioId?: string;
  estado: 'pendiente' | 'confirmada' | 'en_proceso' | 'enviada' | 'entregada' | 'cancelada' | 'reembolsada';
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  impuestos: number;
  total: number;
  metodoPago: string;
  referenciaPago?: string;
  notas?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaEntregaEstimada?: string;
  fechaEntregaReal?: string;
  usuario?: {
    email: string;
    nombreCompleto: string;
  };
  direccionEnvio?: ShippingAddress;
  items: OrderItem[];
}

export interface OrderSimple {
  id: string;
  numeroOrden: string;
  estado: 'pendiente' | 'confirmada' | 'en_proceso' | 'enviada' | 'entregada' | 'cancelada' | 'reembolsada';
  total: number;
  fechaCreacion: string;
  fechaActualizacion: string;
  itemsCount: number;
  metodoPago: string;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalSpent: number;
  averageOrderValue: number;
}

export interface CreateOrderRequest {
  direccionEnvioId?: string;
  metodoPago?: 'tarjeta' | 'pse' | 'nequi' | 'bancolombia_transfer';
  referenciaPago?: string;
  notas?: string;
}

export interface CreateOrderFromCartRequest {
  direccionEnvioId?: string;
  metodoPago?: 'tarjeta' | 'pse' | 'nequi' | 'bancolombia_transfer';
  referenciaPago?: string;
  notas?: string;
}

export interface CancelOrderRequest {
  reason?: string;
}

export interface UpdateOrderStatusRequest {
  estado: 'pendiente' | 'confirmada' | 'en_proceso' | 'enviada' | 'entregada' | 'cancelada' | 'reembolsada';
  notas?: string;
}

export interface OrderFilters {
  estado?: 'pendiente' | 'confirmada' | 'en_proceso' | 'enviada' | 'entregada' | 'cancelada' | 'reembolsada';
  limit?: number;
  offset?: number;
}

export interface CalcularCostoEnvioRequest {
  subtotal: number;
  direccionEnvioId?: string;
}

export interface CalcularCostoEnvioResponse {
  costoEnvio: number;
  subtotal: number;
  total: number;
  zona: string;
  ciudad: string | null;
  envioGratis: boolean;
}

// Servicios de pedidos
export const ordersApi = {
  // Obtener pedidos del usuario autenticado
  async getUserOrders(filters: OrderFilters = {}): Promise<ApiResponse<{ orders: OrderSimple[]; pagination: any }>> {
    const params = new URLSearchParams();
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/orders/my-orders?${queryString}` : '/orders/my-orders';
    
    return await apiClient.get<{ orders: OrderSimple[]; pagination: any }>(url);
  },

  // Obtener pedido específico del usuario
  async getUserOrder(orderId: string): Promise<ApiResponse<Order>> {
    return await apiClient.get<Order>(`/orders/my-orders/${orderId}`);
  },

  // Crear pedido desde carrito
  async createOrderFromCart(data: CreateOrderFromCartRequest): Promise<ApiResponse<Order>> {
    return await apiClient.post<Order>('/orders/create-from-cart', data);
  },

  // Cancelar pedido del usuario
  async cancelUserOrder(orderId: string, data: CancelOrderRequest = {}): Promise<ApiResponse<Order>> {
    return await apiClient.put<Order>(`/orders/my-orders/${orderId}/cancel`, data);
  },

  // Obtener estadísticas de pedidos del usuario
  async getUserOrderStats(): Promise<ApiResponse<OrderStats>> {
    return await apiClient.get<OrderStats>('/orders/my-stats');
  },

  // Calcular costo de envío
  async calcularCostoEnvio(data: CalcularCostoEnvioRequest): Promise<ApiResponse<CalcularCostoEnvioResponse>> {
    return await apiClient.post<CalcularCostoEnvioResponse>('/orders/calcular-costo-envio', data);
  },

  // Obtener todos los pedidos (admin)
  async getAllOrders(filters: OrderFilters = {}): Promise<ApiResponse<{ orders: OrderSimple[]; pagination: any }>> {
    const params = new URLSearchParams();
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
    
    const queryString = params.toString();
    const url = queryString ? `/orders?${queryString}` : '/orders';
    
    return await apiClient.get<{ orders: OrderSimple[]; pagination: any }>(url);
  },

  // Actualizar estado de pedido (admin)
  async updateOrderStatus(orderId: string, data: UpdateOrderStatusRequest): Promise<ApiResponse<Order>> {
    return await apiClient.put<Order>(`/orders/${orderId}/status`, data);
  },

  // Obtener estadísticas generales (admin)
  async getOrderStats(): Promise<ApiResponse<OrderStats>> {
    return await apiClient.get<OrderStats>('/orders/stats');
  },
};
