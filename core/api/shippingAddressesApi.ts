import { apiClient, ApiResponse } from './apiClient';

// Interfaces para direcciones de envío
export interface ShippingAddress {
  id: string;
  usuarioId: string;
  nombreDestinatario: string;
  telefono?: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  codigoPostal?: string;
  pais: string;
  esPrincipal: boolean;
  activa: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
  coordenadas?: {
    latitud: number;
    longitud: number;
  };
  instrucciones?: string;
}

export interface CreateShippingAddressRequest {
  nombreDestinatario: string;
  telefono?: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  codigoPostal?: string;
  pais?: string;
  esPrincipal?: boolean;
  coordenadas?: {
    latitud: number;
    longitud: number;
  };
  instrucciones?: string;
}

export interface UpdateShippingAddressRequest {
  nombreDestinatario?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  codigoPostal?: string;
  pais?: string;
  esPrincipal?: boolean;
  activa?: boolean;
  coordenadas?: {
    latitud: number;
    longitud: number;
  };
  instrucciones?: string;
}

// Servicios de direcciones de envío
export const shippingAddressesApi = {
  // Obtener direcciones del usuario autenticado
  async getUserAddresses(): Promise<ApiResponse<ShippingAddress[]>> {
    return await apiClient.get<ShippingAddress[]>('/shipping-addresses');
  },

  // Obtener dirección específica del usuario
  async getUserAddress(addressId: string): Promise<ApiResponse<ShippingAddress>> {
    return await apiClient.get<ShippingAddress>(`/shipping-addresses/${addressId}`);
  },

  // Crear nueva dirección de envío
  async createAddress(data: CreateShippingAddressRequest): Promise<ApiResponse<ShippingAddress>> {
    return await apiClient.post<ShippingAddress>('/shipping-addresses', data);
  },

  // Actualizar dirección de envío
  async updateAddress(addressId: string, data: UpdateShippingAddressRequest): Promise<ApiResponse<ShippingAddress>> {
    return await apiClient.put<ShippingAddress>(`/shipping-addresses/${addressId}`, data);
  },

  // Eliminar dirección de envío
  async deleteAddress(addressId: string): Promise<ApiResponse<void>> {
    return await apiClient.delete<void>(`/shipping-addresses/${addressId}`);
  },

  // Establecer dirección como principal
  async setPrimaryAddress(addressId: string): Promise<ApiResponse<ShippingAddress>> {
    return await apiClient.put<ShippingAddress>(`/shipping-addresses/${addressId}/set-primary`);
  },

  // Obtener dirección principal del usuario
  async getPrimaryAddress(): Promise<ApiResponse<ShippingAddress | null>> {
    return await apiClient.get<ShippingAddress | null>('/shipping-addresses/primary');
  },
};











