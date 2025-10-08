import { apiClient, ApiResponse } from './apiClient';

// Interfaces para el carrito
export interface CartItem {
  id: string;
  productoId: string;
  productoNombre: string;
  productoDescripcion?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  precioOriginal: number;
  precioOferta?: number;
  stock: number;
  productoActivo: boolean;
  categoriaNombre?: string;
  imagenPrincipal?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface Cart {
  id: string;
  usuarioId: string;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
  items: CartItem[];
  total: number;
  totalItems: number;
}

export interface CartSummary {
  totalItems: number;
  total: number;
  isEmpty: boolean;
  itemCount: number;
}

export interface CartValidation {
  isValid: boolean;
  errors: string[];
  cart: Cart;
}

export interface AddItemRequest {
  productId: string;
  quantity?: number;
}

export interface UpdateItemRequest {
  quantity: number;
}

export interface CartHistoryItem {
  id: string;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
  totalItems: number;
  total: number;
}

// Servicios del carrito
export const cartApi = {
  // Obtener carrito del usuario
  async getCart(): Promise<ApiResponse<Cart>> {
    return await apiClient.get<Cart>('/cart');
  },

  // Obtener resumen del carrito
  async getCartSummary(): Promise<ApiResponse<CartSummary>> {
    return await apiClient.get<CartSummary>('/cart/summary');
  },

  // Agregar producto al carrito
  async addItem(data: AddItemRequest): Promise<ApiResponse<Cart>> {
    return await apiClient.post<Cart>('/cart/items', data);
  },

  // Actualizar cantidad de un item
  async updateItemQuantity(itemId: string, data: UpdateItemRequest): Promise<ApiResponse<Cart>> {
    return await apiClient.put<Cart>(`/cart/items/${itemId}`, data);
  },

  // Eliminar item del carrito
  async removeItem(itemId: string): Promise<ApiResponse<Cart>> {
    return await apiClient.delete<Cart>(`/cart/items/${itemId}`);
  },

  // Limpiar carrito completo
  async clearCart(): Promise<ApiResponse<Cart>> {
    return await apiClient.delete<Cart>('/cart/clear');
  },

  // Validar carrito para checkout
  async validateCart(): Promise<ApiResponse<CartValidation>> {
    return await apiClient.get<CartValidation>('/cart/validate');
  },

  // Obtener historial de carritos
  async getCartHistory(params?: { limit?: number; offset?: number }): Promise<ApiResponse<CartHistoryItem[]>> {
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    const url = queryString ? `?${queryString}` : '';
    
    return await apiClient.get<CartHistoryItem[]>(`/cart/history${url}`);
  }
};

