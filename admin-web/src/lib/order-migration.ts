import { migrationApiClient } from './migration-api-client';

/**
 * Tipos de datos para la migración de órdenes a TNS
 */
export interface OrderMigrationDetails {
  orden: {
    id: string;
    numero_orden: string;
    estado: string;
    total: number;
    fecha_creacion: string;
    tns_kardex_id?: number;
    tns_numero?: string;
    tns_sincronizado?: 'pendiente' | 'sincronizado' | 'error';
    tns_fecha_sincronizacion?: string;
    tns_error_message?: string;
    CLIENTE_NOMBRE?: string;
    CLIENTE_NIT?: string;
  };
  items: Array<{
    id: string;
    producto_id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    tns_dekardex_id?: number;
    tns_matid?: number;
    tns_codigo_material?: string;
    tns_nombre_material?: string;
    tns_precio_tns?: number;
    tns_sincronizado?: 'pendiente' | 'sincronizado' | 'error';
    MATERIAL_CODIGO_TNS?: string;
    MATERIAL_NOMBRE_TNS?: string;
  }>;
  migrationStatus: {
    ordenSincronizada: boolean;
    itemsSincronizados: number;
    totalItems: number;
    tieneErrores: boolean;
  };
}

export interface MigrationResult {
  ordenId: string;
  tnsKardexId: number;
  tnsNumero: string;
  terceroId: number;
  vendedorId: number;
  total: number;
  itemsCount: number;
  dekardexIds: number[];
  estado: 'MIGRADO_PENDIENTE' | 'MIGRADO_EXITOSO';
}

export interface MigrationOptions {
  usuario?: string;
  codprefijo?: string;
  codcomp?: string;
  sucid?: number;
}

export interface MigrationStatusItem {
  id: string;
  numero_orden: string;
  estado: string;
  total: number;
  fecha_creacion: string;
  tns_kardex_id?: number;
  tns_numero?: string;
  tns_sincronizado?: 'pendiente' | 'sincronizado' | 'error';
  tns_fecha_sincronizacion?: string;
  tns_error_message?: string;
}

export interface MigrationStatusResponse {
  data: MigrationStatusItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Servicio para migración de órdenes a TNS
 */
export const OrderMigrationService = {
  /**
   * Obtiene los detalles de una orden y su estado de migración
   */
  async getOrderMigrationDetails(orderId: string): Promise<ApiResponse<OrderMigrationDetails>> {
    const response = await migrationApiClient.get<ApiResponse<OrderMigrationDetails>>(`/orders/${orderId}/detail`);
    return response.data;
  },

  /**
   * Solo migra una orden a TNS sin iniciar preparación
   */
  async migrateOrder(orderId: string, options?: MigrationOptions): Promise<ApiResponse<MigrationResult>> {
    const response = await migrationApiClient.post<ApiResponse<MigrationResult>>(
      `/orders/${orderId}/migrate`,
      options || {}
    );
    return response.data;
  },

  /**
   * Obtiene el estado de migración de múltiples órdenes
   */
  async getMigrationStatus(filters?: {
    estado?: 'pendiente' | 'sincronizado' | 'error';
    limit?: number;
    page?: number;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<ApiResponse<MigrationStatusResponse>> {
    
    const params = new URLSearchParams();
    if (filters?.estado) params.append('estado', filters.estado);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
    if (filters?.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
    
    const queryString = params.toString();
    const url = queryString ? `/orders/migration-status?${queryString}` : '/orders/migration-status';
    
    const response = await migrationApiClient.get<ApiResponse<MigrationStatusResponse>>(url);
    return response.data;
  },

  /**
   * Reintenta la migración de una orden que tuvo errores
   */
  async retryMigration(orderId: string, options?: MigrationOptions): Promise<ApiResponse<MigrationResult>> {
    const response = await migrationApiClient.put<ApiResponse<MigrationResult>>(
      `/orders/${orderId}/retry-migration`,
      options || {}
    );
    return response.data;
  },
};
