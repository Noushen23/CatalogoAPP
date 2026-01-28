import { apiClient, ApiResponse } from './apiClient';

// Interfaces para pagos con Wompi (Web Checkout)

export interface CrearTransaccionRequest {
  direccionEnvioId?: string;
  notas?: string;
}

export interface ConsultarTransaccionResponse {
  id: string;
  referencia: string;
  estado: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'PENDING' | 'ERROR';
  monto: number;
  moneda: string;
  metodoPago?: string;
  fechaCreacion?: string;
  fechaFinalizacion?: string;
  mensaje?: string;
}

export interface CrearTransaccionResponse {
  urlCheckout: string;
  referencia: string;
  urlRedireccion?: string;
  urlRedireccionError?: string;
  metodoPago: string;
  monto: number;
  moneda: string;
  transaccionId: string;
}

export interface CheckoutStatusResponse {
  tieneTimeout: boolean;
  tiempoRestante: number | null;
  tiempoTranscurrido: number;
  expirado?: boolean;
  estado: string;
  minutosRestantes?: number;
  segundosRestantes?: number;
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
  async crearTransaccion(data: CrearTransaccionRequest): Promise<ApiResponse<CrearTransaccionResponse>> {
    return await apiClient.post<CrearTransaccionResponse>('/pagos/crear', data);
  },

  /**
   * Obtener configuración pública de Wompi (para frontend)
   */
  async obtenerConfiguracion(): Promise<ApiResponse<ConfiguracionWompi>> {
    return await apiClient.get<ConfiguracionWompi>('/pagos/configuracion');
  },

  /**
   * Verificar tiempo restante para completar el pago de un pedido
   */
  async verificarTiempoRestante(pedidoId: string): Promise<ApiResponse<CheckoutStatusResponse>> {
    return await apiClient.get<CheckoutStatusResponse>(`/pagos/tiempo-restante/${pedidoId}`);
  },

  /**
   * Consultar el estado de una transacción en Wompi
   */
  async consultarTransaccion(idTransaccion: string): Promise<ApiResponse<ConsultarTransaccionResponse>> {
    return await apiClient.get<ConsultarTransaccionResponse>(`/pagos/consultar/${idTransaccion}`);
  },
};
