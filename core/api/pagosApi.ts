import { apiClient, ApiResponse } from './apiClient';

// Interfaces para pagos con Wompi
export interface DatosTarjeta {
  tokenTarjeta: string;
  cuotas?: number;
}

export interface DatosPSE {
  banco: string;
  tipoPersona: 'PERSON' | 'COMPANY';
  tipoIdentificacion?: string;
  numeroIdentificacion?: string;
}

export interface CrearTransaccionRequest {
  pedidoId: string;
  metodoPago: 'tarjeta' | 'pse' | 'nequi' | 'bancolombia_transfer';
  datosTarjeta?: DatosTarjeta;
  datosPSE?: DatosPSE;
  urlRedireccion?: string;
  urlRedireccionError?: string;
}

export interface Transaccion {
  idTransaccion: string;
  referencia: string;
  estado: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'PENDING';
  urlRedireccion?: string;
  metodoPago: string;
  monto: number;
  moneda: string;
  pedidoId: string;
  numeroOrden: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  fechaFinalizacion?: string;
  mensaje?: string;
}

export interface BancoPSE {
  financial_institution_code: string;
  financial_institution_name: string;
}

export interface ConfiguracionWompi {
  ambiente: 'produccion' | 'pruebas';
  clavePublica: string;
  moneda: string;
  urlBase: string;
}

// Servicios de pagos
export const pagosApi = {
  /**
   * Crear una transacción de pago para un pedido
   */
  async crearTransaccion(data: CrearTransaccionRequest): Promise<ApiResponse<Transaccion>> {
    return await apiClient.post<Transaccion>('/pagos/crear', data);
  },

  /**
   * Consultar el estado de una transacción de pago
   */
  async consultarTransaccion(idTransaccion: string): Promise<ApiResponse<Transaccion>> {
    return await apiClient.get<Transaccion>(`/pagos/consultar/${idTransaccion}`);
  },

  /**
   * Obtener lista de bancos disponibles para PSE
   */
  async obtenerBancosPSE(): Promise<ApiResponse<{ bancos: BancoPSE[] }>> {
    return await apiClient.get<{ bancos: BancoPSE[] }>('/pagos/bancos-pse');
  },

  /**
   * Obtener configuración pública de Wompi (para frontend)
   */
  async obtenerConfiguracion(): Promise<ApiResponse<ConfiguracionWompi>> {
    return await apiClient.get<ConfiguracionWompi>('/pagos/configuracion');
  },
};
