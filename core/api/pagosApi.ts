import { apiClient, ApiResponse } from './apiClient';

// Interfaces para pagos con Wompi
// Web Checkout: NO usamos tokenTarjeta, acceptance_token, ni creación de transacción por API directa.
export interface DatosPSE {
  // Solo para pre-llenar customer-data en el Web Checkout (opcional)
  tipoIdentificacion?: 'CC' | 'CE' | 'NIT' | 'PP' | 'TI' | 'DNI' | 'RG' | 'OTHER';
  numeroIdentificacion?: string;
}

export interface DatosNequi {
  // Solo para pre-llenar customer-data:phone-number (opcional)
  telefono?: string;
}

export interface DatosBancolombia {
  // Solo informativo en la app (opcional). En Web Checkout no se envía como payment_description por URL.
  descripcionPago?: string;
}

export interface CrearTransaccionRequest {
  // NO se requiere pedidoId - el pedido se creará cuando el pago sea aprobado
  metodoPago: 'tarjeta' | 'pse' | 'nequi' | 'bancolombia_transfer';
  direccionEnvioId?: string;
  notas?: string;
  datosPSE?: DatosPSE;
  datosNequi?: DatosNequi;
  datosBancolombia?: DatosBancolombia;
  // NOTA: urlRedireccion y urlRedireccionError NO deben enviarse desde el frontend
  // El backend usa las URLs configuradas en variables de entorno (WOMPI_URL_REDIRECCION, WOMPI_URL_REDIRECCION_ERROR)
  // Estas URLs apuntan a las rutas del backend que luego manejan los deep links en la app
  // @deprecated - No usar, el backend maneja las URLs automáticamente
  // urlRedireccion?: string;
  // urlRedireccionError?: string;
}

export interface Transaccion {
  urlCheckout: string; // URL del Web Checkout de Wompi (obligatorio)
  referencia: string;
  urlRedireccion?: string;
  urlRedireccionError?: string;
  metodoPago: string;
  monto: number;
  moneda: string;
  transaccionId: string; // ID de la transacción pendiente (no es el pedido aún)
  // Campos deprecados (mantener por compatibilidad temporal)
  pedidoId?: string; // Solo estará disponible después de que el pago sea aprobado
  numeroOrden?: string; // Solo estará disponible después de que el pago sea aprobado
  idTransaccion?: string;
  estado?: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'PENDING';
  asyncPaymentUrl?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  fechaFinalizacion?: string;
  mensaje?: string;
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
   * Obtener configuración pública de Wompi (para frontend)
   */
  async obtenerConfiguracion(): Promise<ApiResponse<ConfiguracionWompi>> {
    return await apiClient.get<ConfiguracionWompi>('/pagos/configuracion');
  },

  /**
   * Verificar tiempo restante para completar el pago de un pedido
   */
  async verificarTiempoRestante(pedidoId: string): Promise<ApiResponse<{
    tieneTimeout: boolean;
    tiempoRestante: number | null;
    tiempoTranscurrido: number;
    expirado?: boolean;
    estado: string;
    minutosRestantes?: number;
    segundosRestantes?: number;
  }>> {
    return await apiClient.get(`/pagos/tiempo-restante/${pedidoId}`);
  },
};
