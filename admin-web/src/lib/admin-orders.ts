import { apiClient } from './api-client';

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
  metodoPago: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  usuario: {
    email: string;
    nombreCompleto: string;
  };
  itemsCount: number;
}

export type OrderStatus = AdminOrder['estado'];

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

/**
 * Servicio para gestionar los pedidos desde el panel de administración
 */
export const AdminOrdersService = {
  /**
   * Obtiene todos los pedidos del sistema.
   * @returns Una promesa que se resuelve con la lista de pedidos.
   */
  async getAllOrders(): Promise<ApiResponse<PaginatedOrders>> {
    console.log('📦 [AdminOrdersService] Obteniendo todos los pedidos...');
    const response = await apiClient.get<ApiResponse<PaginatedOrders>>('/orders');
    console.log('✅ [AdminOrdersService] Pedidos recibidos:', response.data.data.pagination.total);
    console.log('📊 [AdminOrdersService] Respuesta completa:', response.data);
    return response.data; // Retornar solo los datos, no el AxiosResponse completo
  },

  /**
   * Actualiza el estado de un pedido.
   * @param orderId - El ID del pedido a actualizar.
   * @param newStatus - El nuevo estado para el pedido.
   * @returns Una promesa que se resuelve con el pedido actualizado.
   */
  async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<ApiResponse<AdminOrder>> {
    console.log(`🔄 [AdminOrdersService] Actualizando pedido ${orderId} a estado: ${newStatus}`);
    const response = await apiClient.put<ApiResponse<AdminOrder>>(
      `/orders/${orderId}/status`,
      { estado: newStatus }
    );
    console.log(`✅ [AdminOrdersService] Pedido ${orderId} actualizado.`);
    return response.data; // Retornar solo los datos, no el AxiosResponse completo
  },
};