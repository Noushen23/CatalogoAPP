

const axios = require('axios'); //Libreria para hacer peticiones HTTP
const crypto = require('crypto'); //libreria para encriptar, generar hashes,firmas 
const config = require('../../config/env'); // Variable de configuracion

/**
 * Servicio de integración con Wompi
 * 
 * Wompi es la pasarela de pagos de Bancolombia para Colombia.
 * Este servicio maneja la comunicación con la API de Wompi para:
 * - Crear transacciones
 * - Verificar el estado de pagos
 * - Procesar webhooks
 * - Validar firmas de seguridad
 */
class WompiService {
  constructor() {
    // Configuración de Wompi desde variables de entorno
    this.configuracion = {
      // URL base de la API de Wompi
      urlBase: config.wompi?.urlBase || process.env.WOMPI_URL_BASE || 'https://production.wompi.co/v1',
      // URL base para ambiente de pruebas
      urlBasePruebas: config.wompi?.urlBasePruebas || process.env.WOMPI_URL_BASE_PRUEBAS || 'https://sandbox.wompi.co/v1',
      // Clave pública (para frontend)
      clavePublica: config.wompi?.clavePublica || process.env.WOMPI_CLAVE_PUBLICA || '',
      // Clave privada (solo backend)
      clavePrivada: config.wompi?.clavePrivada || process.env.WOMPI_CLAVE_PRIVADA || '',
      // Clave de integridad (para validar webhooks)
      claveIntegridad: config.wompi?.claveIntegridad || process.env.WOMPI_CLAVE_INTEGRIDAD || '',
      // Ambiente: 'produccion' o 'pruebas'
      ambiente: config.wompi?.ambiente || process.env.WOMPI_AMBIENTE || 'pruebas',
      // Moneda por defecto
      moneda: config.wompi?.moneda || process.env.WOMPI_MONEDA || 'COP',
      // URL de redirección después del pago
      urlRedireccion: config.wompi?.urlRedireccion || process.env.WOMPI_URL_REDIRECCION || '',
      // URL de redirección en caso de error
      urlRedireccionError: config.wompi?.urlRedireccionError || process.env.WOMPI_URL_REDIRECCION_ERROR || ''
    };

    // Determinar URL base según el ambiente
    this.urlBase = this.configuracion.ambiente === 'produccion' 
      ? this.configuracion.urlBase 
      : this.configuracion.urlBasePruebas;

    // Cliente HTTP configurado
    this.cliente = axios.create({
      baseURL: this.urlBase,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.configuracion.clavePrivada}`
      }
    });
  }

  /**
   * Crear una transacción en Wompi
   * @param {Object} datosTransaccion - Datos de la transacción
   * @param {string} datosTransaccion.referencia - Referencia única de la transacción
   * @param {number} datosTransaccion.monto - Monto en centavos (COP)
   * @param {string} datosTransaccion.moneda - Moneda (COP, USD, etc.)
   * @param {Object} datosTransaccion.cliente - Datos del cliente
   * @param {Object} datosTransaccion.metodoPago - Método de pago (tarjeta, PSE, etc.)
   * @param {string} datosTransaccion.urlRedireccion - URL de redirección después del pago
   * @returns {Promise<Object>} Respuesta de Wompi con la transacción creada
   */
  async crearTransaccion(datosTransaccion) {
    try {
      const {
        referencia,
        monto,
        moneda = this.configuracion.moneda,
        cliente,
        metodoPago,
        urlRedireccion = this.configuracion.urlRedireccion,
        urlRedireccionError = this.configuracion.urlRedireccionError
      } = datosTransaccion;

      // Validar datos requeridos
      if (!referencia || !monto || !cliente || !metodoPago) {
        throw new Error('Faltan datos requeridos para crear la transacción');
      }

      // Validar monto mínimo (Wompi requiere mínimo 1000 COP = 100000 centavos)
      // El monto ya viene en centavos, así que validamos 100000 centavos = $1,000 COP
      if (monto < 100000) {
        throw new Error('El monto mínimo es de 1000 COP (100000 centavos)');
      }

      // Preparar payload según el método de pago
      let payload = {
        amount_in_cents: Math.round(monto), // Wompi espera el monto en centavos
        currency: moneda,
        customer_email: cliente.email,
        payment_method: {
          type: metodoPago.tipo, // 'CARD', 'PSE', 'NEQUI', 'BANCOLOMBIA_TRANSFER', etc.
          installments: metodoPago.cuotas || 1
        },
        reference: referencia,
        redirect_url: urlRedireccion || `${this.configuracion.urlRedireccion}?referencia=${referencia}`,
        expiration_time: metodoPago.tiempoExpiracion || null // Opcional: tiempo de expiración en formato ISO
      };

      // Agregar datos específicos según el método de pago
      if (metodoPago.tipo === 'CARD') {
        // Para tarjeta, se necesita el token de la tarjeta (se obtiene del frontend)
        if (!metodoPago.tokenTarjeta) {
          throw new Error('Se requiere el token de la tarjeta para pagos con tarjeta');
        }
        payload.payment_method.token = metodoPago.tokenTarjeta;
      } else if (metodoPago.tipo === 'PSE') {
        // Para PSE, se necesita información bancaria
        if (!metodoPago.banco || !metodoPago.tipoPersona) {
          throw new Error('Se requiere banco y tipo de persona para pagos PSE');
        }
        payload.payment_method.user_type = metodoPago.tipoPersona; // 'PERSON' o 'COMPANY'
        payload.payment_method.user_legal_id_type = metodoPago.tipoIdentificacion || 'CC';
        payload.payment_method.user_legal_id = metodoPago.numeroIdentificacion;
        payload.payment_method.financial_institution_code = metodoPago.banco;
      }

      // Agregar datos del cliente
      if (cliente.nombre) {
        payload.customer_data = {
          email: cliente.email,
          full_name: cliente.nombre,
          phone_number: cliente.telefono || '',
          legal_id: cliente.numeroIdentificacion || '',
          legal_id_type: cliente.tipoIdentificacion || 'CC'
        };
      }

      console.log('🔄 [Wompi] Creando transacción:', {
        referencia,
        monto,
        moneda,
        metodoPago: metodoPago.tipo,
        ambiente: this.configuracion.ambiente
      });

      // Realizar petición a Wompi
      const respuesta = await this.cliente.post('/transactions', payload);

      console.log('✅ [Wompi] Transacción creada exitosamente:', {
        id: respuesta.data?.data?.id,
        referencia: respuesta.data?.data?.reference,
        estado: respuesta.data?.data?.status
      });

      return {
        exito: true,
        datos: {
          idTransaccion: respuesta.data?.data?.id,
          referencia: respuesta.data?.data?.reference,
          estado: respuesta.data?.data?.status,
          monto: respuesta.data?.data?.amount_in_cents,
          moneda: respuesta.data?.data?.currency,
          metodoPago: respuesta.data?.data?.payment_method_type,
          urlRedireccion: respuesta.data?.data?.redirect_url,
          fechaCreacion: respuesta.data?.data?.created_at,
          fechaActualizacion: respuesta.data?.data?.updated_at
        },
        respuestaCompleta: respuesta.data
      };
    } catch (error) {
      console.error('❌ [Wompi] Error al crear transacción:', error.response?.data || error.message);
      
      return {
        exito: false,
        error: error.response?.data?.error || error.message,
        detalles: error.response?.data || null
      };
    }
  }

  /**
   * Consultar el estado de una transacción
   * @param {string} idTransaccion - ID de la transacción en Wompi
   * @returns {Promise<Object>} Estado de la transacción
   */
  async consultarTransaccion(idTransaccion) {
    try {
      if (!idTransaccion) {
        throw new Error('ID de transacción es requerido');
      }

      console.log('🔍 [Wompi] Consultando transacción:', idTransaccion);

      const respuesta = await this.cliente.get(`/transactions/${idTransaccion}`);

      const datosTransaccion = respuesta.data?.data;

      return {
        exito: true,
        datos: {
          idTransaccion: datosTransaccion?.id,
          referencia: datosTransaccion?.reference,
          estado: datosTransaccion?.status, // 'APPROVED', 'DECLINED', 'VOIDED', 'PENDING'
          monto: datosTransaccion?.amount_in_cents,
          moneda: datosTransaccion?.currency,
          metodoPago: datosTransaccion?.payment_method_type,
          fechaCreacion: datosTransaccion?.created_at,
          fechaActualizacion: datosTransaccion?.updated_at,
          fechaFinalizacion: datosTransaccion?.finalized_at,
          mensaje: datosTransaccion?.status_message
        },
        respuestaCompleta: respuesta.data
      };
    } catch (error) {
      console.error('❌ [Wompi] Error al consultar transacción:', error.response?.data || error.message);
      
      return {
        exito: false,
        error: error.response?.data?.error || error.message,
        detalles: error.response?.data || null
      };
    }
  }

  /**
   * Validar la firma de un webhook de Wompi
   * @param {Object} datosWebhook - Datos del webhook
   * @param {string} firma - Firma recibida en el header
   * @returns {boolean} True si la firma es válida
   */
  validarFirmaWebhook(datosWebhook, firma) {
    try {
      if (!this.configuracion.claveIntegridad) {
        console.warn('⚠️ [Wompi] Clave de integridad no configurada, no se puede validar la firma');
        return false;
      }

      // Wompi envía la firma en el header 'signature'
      // La firma se calcula como: SHA256(JSON.stringify(datos) + claveIntegridad)
      const datosString = JSON.stringify(datosWebhook);
      const firmaCalculada = crypto
        .createHash('sha256')
        .update(datosString + this.configuracion.claveIntegridad)
        .digest('hex');

      const firmaValida = firmaCalculada === firma;

      if (!firmaValida) {
        console.error('❌ [Wompi] Firma de webhook inválida:', {
          firmaRecibida: firma,
          firmaCalculada: firmaCalculada
        });
      }

      return firmaValida;
    } catch (error) {
      console.error('❌ [Wompi] Error al validar firma:', error.message);
      return false;
    }
  }

  /**
   * Procesar webhook de Wompi
   * @param {Object} datosWebhook - Datos del webhook
   * @param {string} firma - Firma recibida
   * @returns {Object} Datos procesados del webhook
   */
  procesarWebhook(datosWebhook, firma) {
    try {
      // Validar firma
      if (!this.validarFirmaWebhook(datosWebhook, firma)) {
        throw new Error('Firma de webhook inválida');
      }

      const evento = datosWebhook?.event;
      const datos = datosWebhook?.data;

      console.log('📥 [Wompi] Webhook recibido:', {
        evento,
        idTransaccion: datos?.id,
        referencia: datos?.reference,
        estado: datos?.status
      });

      return {
        exito: true,
        evento, // 'transaction.updated', 'transaction.created', etc.
        datos: {
          idTransaccion: datos?.id,
          referencia: datos?.reference,
          estado: datos?.status,
          monto: datos?.amount_in_cents,
          moneda: datos?.currency,
          metodoPago: datos?.payment_method_type,
          fechaCreacion: datos?.created_at,
          fechaActualizacion: datos?.updated_at,
          fechaFinalizacion: datos?.finalized_at,
          mensaje: datos?.status_message
        }
      };
    } catch (error) {
      console.error('❌ [Wompi] Error al procesar webhook:', error.message);
      return {
        exito: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener lista de bancos disponibles para PSE
   * @returns {Promise<Object>} Lista de bancos
   */
  async obtenerBancosPSE() {
    try {
      const respuesta = await this.cliente.get('/pse/financial_institutions');

      return {
        exito: true,
        bancos: respuesta.data?.data || []
      };
    } catch (error) {
      console.error('❌ [Wompi] Error al obtener bancos PSE:', error.response?.data || error.message);
      return {
        exito: false,
        error: error.response?.data?.error || error.message,
        bancos: []
      };
    }
  }

  /**
   * Obtener información de la configuración (sin datos sensibles)
   * @returns {Object} Configuración pública
   */
  obtenerConfiguracionPublica() {
    return {
      ambiente: this.configuracion.ambiente,
      clavePublica: this.configuracion.clavePublica,
      moneda: this.configuracion.moneda,
      urlBase: this.urlBase
    };
  }
}

// Exportar instancia única del servicio
module.exports = new WompiService();
