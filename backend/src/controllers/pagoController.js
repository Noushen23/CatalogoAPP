const wompiService = require('../services/pagos/wompiService');
const Order = require('../models/Order');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const normalizeCountryCode = (pais) => {
  let paisCode = (pais || 'CO').toString().trim();
  const paisLower = paisCode.toLowerCase();
  if (paisLower === 'colombia' || paisLower === 'col' || paisLower === 'co') {
    paisCode = 'CO';
  } else if (paisCode.length !== 2) {
    paisCode = 'CO';
  }
  return paisCode.toUpperCase();
};

const mapDireccionEnvio = (direccionRow) => {
  if (!direccionRow) return { direccionEnvio: null, datosEnvio: null, ciudadEnvio: null };
  const paisCode = normalizeCountryCode(direccionRow.pais);
  return {
    ciudadEnvio: direccionRow.ciudad,
    direccionEnvio: {
      nombreDestinatario: direccionRow.nombre_destinatario,
      telefono: direccionRow.telefono,
      direccion: direccionRow.direccion,
      ciudad: direccionRow.ciudad,
      departamento: direccionRow.departamento,
      codigoPostal: direccionRow.codigo_postal,
      pais: paisCode,
      instrucciones: direccionRow.instrucciones || null
    },
    datosEnvio: {
      direccionEnvioId: direccionRow.id,
      nombreDestinatario: direccionRow.nombre_destinatario,
      telefono: direccionRow.telefono,
      direccion: direccionRow.direccion,
      ciudad: direccionRow.ciudad,
      departamento: direccionRow.departamento,
      codigoPostal: direccionRow.codigo_postal,
      pais: paisCode,
      instrucciones: direccionRow.instrucciones || null
    }
  };
};

/**
 * Este archivo define un controlador de pagos (PagoController) para una API en Node.js + Express,
 * encargado de todo el ciclo de vida de un pago con Wompi:
 *
 * - Crear una transacción de pago
 * - Generar la URL de Web Checkout
 * - Registrar la intención de pago
 * - Procesar webhooks de Wompi
 * - Confirmar pedidos
 * - Consultar pagos manualmente
 * - Manejar fallos de webhooks
 * - Exponer configuración pública al frontend
 * - Controlar tiempos de espera de pago
 * - Depurar la clave pública de Wompi
 */
class PagoController {
  /**
   * Crear una transacción de pago para un pedido
   * POST /api/v1/pagos/crear
   */
  static async crearTransaccion(req, res) {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const userId = req.user.id;
      const {
        direccionEnvioId,
        notas = null
        // NOTA: urlRedireccion y urlRedireccionError NO se extraen del body
        // El backend siempre usa las URLs configuradas en variables de entorno (WOMPI_URL_REDIRECCION, WOMPI_URL_REDIRECCION_ERROR)
      } = req.body;

      // Único flujo soportado: Web Checkout
      const metodoPago = 'checkout';

      console.log('🔍 [Pago] Crear transacción:', { userId, direccionEnvioId });

      // Obtener el carrito del usuario
      const Cart = require('../models/Cart');
      const cart = await Cart.findActiveCartByUser(userId);
      
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El carrito está vacío'
        });
      }

      // Validar carrito antes de continuar
      const validation = await cart.validateForCheckout();
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación del carrito',
          errors: validation.errors
        });
      }

      // Calcular totales del carrito
      const subtotal = cart.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      
      let direccionEnvio = null;
      let datosEnvio = null;
      let ciudadEnvio = null;
      if (direccionEnvioId) {
        const direccionSql = `
          SELECT id, nombre_destinatario, telefono, direccion, ciudad,
                 departamento, codigo_postal, pais, instrucciones
          FROM direcciones_envio
          WHERE id = ? AND usuario_id = ? AND activa = true
        `;
        const direcciones = await query(direccionSql, [direccionEnvioId, userId]);
        if (direcciones.length > 0) {
          const mapped = mapDireccionEnvio(direcciones[0]);
          direccionEnvio = mapped.direccionEnvio;
          datosEnvio = mapped.datosEnvio;
          ciudadEnvio = mapped.ciudadEnvio;
        }
      }

      const costoEnvio = Order.calcularCostoEnvio(subtotal, ciudadEnvio);
      const impuestos = 0;
      const descuento = 0;
      const total = subtotal - descuento + costoEnvio + impuestos;

      // Obtener datos del usuario para la transacción
      const usuarioSql = `
        SELECT email, nombre_completo, telefono, tipo_identificacion, numero_identificacion
        FROM usuarios
        WHERE id = ?
      `;
      
      const usuarios = await query(usuarioSql, [userId]);
      
      const usuario = usuarios && usuarios.length > 0 ? usuarios[0] : null;

      if (!usuario) {
        console.error('❌ [Pago] Usuario no encontrado en BD:', { userId });
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Preparar datos del cliente
      const cliente = {
        email: usuario.email,
        nombre: usuario.nombre_completo || usuario.email,
        telefono: usuario.telefono || '',
        tipoIdentificacion: usuario.tipo_identificacion || 'CC',
        numeroIdentificacion: usuario.numero_identificacion || ''
      };

      // Generar referencia única para la transacción (máximo 40 caracteres)
      const transaccionId = uuidv4();
      const transaccionIdCorto = transaccionId.replace(/-/g, '').substring(0, 8);
      const timestamp = Date.now();
      const referencia = `PED-${transaccionIdCorto}-${timestamp}`;
      
      // Validar que la referencia no exceda 40 caracteres (límite oficial de Wompi)
      if (referencia.length > 40) {
        throw new Error(`La referencia generada excede el límite de 40 caracteres de Wompi: ${referencia.length} caracteres. Referencia: ${referencia}`);
      }
      
      console.log('🔄 [Pago] Referencia generada:', { referencia });

      // Convertir monto a centavos (Wompi espera el monto en centavos)
      const montoEnCentavos = Math.round(total * 100);
      
      // Preparar datos del carrito para guardar en tabla temporal
      const datosCarrito = {
        items: cart.items.map(item => ({
          productId: item.productoId,
          productName: item.productoNombre,
          productDescription: item.productoDescripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
          imageUrl: item.imagenPrincipal
        })),
        subtotal,
        costoEnvio,
        impuestos,
        descuento,
        total
      };
      
      // Preparar datos del usuario
      const datosUsuario = {
        email: usuario.email,
        nombreCompleto: usuario.nombre_completo,
        telefono: usuario.telefono,
        tipoIdentificacion: usuario.tipo_identificacion,
        numeroIdentificacion: usuario.numero_identificacion
      };
      
      // Guardar intención de checkout en tabla temporal
      const checkoutIntentSql = `
        INSERT INTO checkout_intents (
          id, referencia_pago, usuario_id, carrito_id, direccion_envio_id,
          metodo_pago, notas, datos_carrito, datos_usuario, datos_envio,
          estado_transaccion, fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())
      `;
      
      await query(checkoutIntentSql, [
        transaccionId,
        referencia,
        userId,
        cart.id,
        direccionEnvioId || null,
        metodoPago,
        notas,
        JSON.stringify(datosCarrito),
        JSON.stringify(datosUsuario),
        datosEnvio ? JSON.stringify(datosEnvio) : null
      ]);
      
      console.log('✅ [Pago] Intención de checkout guardada:', { referencia });

      // IMPORTANTE: No usar URLs del frontend
      // El backend siempre usa las URLs configuradas en variables de entorno (WOMPI_URL_REDIRECCION, WOMPI_URL_REDIRECCION_ERROR)
      // Estas URLs apuntan a las rutas del backend (/pago-exitoso, /pago-error) que luego manejan los deep links
      // Si el frontend envía URLs, las ignoramos para evitar problemas con deep links
      const urlRedireccionFinal = undefined; // Siempre usar configuración del backend
      const urlRedireccionErrorFinal = undefined; // Siempre usar configuración del backend

      // Generar URL de Web Checkout de Wompi
      const resultadoCheckout = await wompiService.generarUrlWebCheckout({
        referencia,
        monto: montoEnCentavos,
        moneda: 'COP',
        cliente,
        metodoPago: null, // En Web Checkout, el usuario elige el método en la interfaz de Wompi
        urlRedireccion: urlRedireccionFinal,
        urlRedireccionError: urlRedireccionErrorFinal,
        direccionEnvio: direccionEnvio, // Agregar dirección de envío si está disponible
        impuestos: null // Puede agregarse en el futuro si se requiere detallar impuestos
      });

      if (!resultadoCheckout.exito) {
        return res.status(400).json({
          success: false,
          message: 'Error al generar URL de Web Checkout de Wompi',
          error: resultadoCheckout.error,
          detalles: resultadoCheckout.detalles
        });
      }

      console.log('✅ [Pago] URL de Web Checkout generada:', { referencia });

      const urlCheckoutFinal = resultadoCheckout.datos.urlCheckout;

      // Respuesta exitosa con URL de checkout
      res.status(201).json({
        success: true,
        message: 'URL de Web Checkout generada exitosamente',
        data: {
          urlCheckout: urlCheckoutFinal,
          referencia: referencia,
          urlRedireccion: resultadoCheckout.datos.redirectUrl,
          urlRedireccionError: resultadoCheckout.datos.redirectUrlError,
          metodoPago: metodoPago,
          monto: total,
          moneda: 'COP',
          transaccionId: transaccionId,
          referencia: referencia
        }
      });
    } catch (error) {
      console.error('❌ [Pago] Error al crear transacción:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar el pago'
      });
    }
  }

  /**
   * Consultar el estado de una transacción de pago
   * GET /api/v1/pagos/consultar/:idTransaccion
   */
  static async consultarTransaccion(req, res) {
    try {
      const userId = req.user.id;
      const { idTransaccion } = req.params;

      if (!idTransaccion) {
        return res.status(400).json({
          success: false,
          message: 'ID de transacción es requerido'
        });
      }

      // Consultar transacción en Wompi
      const resultado = await wompiService.consultarTransaccion(idTransaccion);

      if (!resultado.exito) {
        return res.status(400).json({
          success: false,
          message: 'Error al consultar la transacción',
          error: resultado.error
        });
      }

      // Si la transacción está aprobada, actualizar/crear el pedido (fallback si el webhook falló)
      if (resultado.datos.estado === 'APPROVED') {
        const CheckoutService = require('../services/pagos/checkoutService');
        const referenciaPago = resultado.datos.referencia;

        // Sincronizar intención y crear pedido si aún no existe
        const checkoutIntent = await CheckoutService.obtenerIntencionPorReferencia(referenciaPago);
        if (checkoutIntent) {
          await CheckoutService.actualizarEstado(
            checkoutIntent.id,
            'APPROVED',
            resultado.datos.id || idTransaccion
          );
          await CheckoutService.confirmarCheckout(checkoutIntent.id);
        }

        // Buscar pedido por referencia
        const pedidoSql = `
          SELECT id, estado, referencia_pago
          FROM ordenes
          WHERE referencia_pago = ? AND usuario_id = ?
        `;
        const pedidos = await query(pedidoSql, [referenciaPago, userId]);

        if (pedidos.length > 0) {
          const pedido = pedidos[0];
          
          // Si el pedido aún está pendiente, actualizarlo a confirmada
          if (pedido.estado === 'pendiente') {
            const actualizarPedidoSql = `
              UPDATE ordenes
              SET estado = 'confirmada',
                  fecha_actualizacion = NOW()
              WHERE id = ?
            `;
            await query(actualizarPedidoSql, [pedido.id]);
            
            console.log('✅ [Pago] Pedido actualizado a confirmada:', pedido.id);
          }
        }
      }

      res.json({
        success: true,
        message: 'Transacción consultada exitosamente',
        data: resultado.datos
      });
    } catch (error) {
      console.error('❌ [Pago] Error al consultar transacción:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al consultar el pago'
      });
    }
  }

  /**
   * Procesar webhook de Wompi
   * POST /api/v1/pagos/webhook
   */
  static async procesarWebhook(req, res) {
    try {
      // Obtener firma del webhook
      // Wompi puede enviar la firma en dos lugares:
      // 1. Header HTTP: X-Event-Checksum (preferido)
      // 2. Body: signature.checksum
      const firma = req.headers['x-event-checksum'] || 
                    req.headers['X-Event-Checksum'] ||
                    req.body?.signature?.checksum || 
                    null;

      // Log del webhook recibido para depuración
      console.log('📥 [Pago] Webhook recibido de Wompi:', {
        evento: req.body?.event,
        environment: req.body?.environment,
        tieneFirma: !!firma,
        tieneSignature: !!req.body?.signature
      });

      // Procesar webhook (la validación de firma se hace dentro del servicio)
      const resultado = wompiService.procesarWebhook(req.body, firma);

      if (!resultado.exito) {
        return res.status(400).json({
          success: false,
          message: 'Error al procesar webhook',
          error: resultado.error
        });
      }

      // Buscar intención de checkout por referencia
      const referencia = resultado.datos.referencia;
      const CheckoutService = require('../services/pagos/checkoutService');
      const checkoutIntent = await CheckoutService.obtenerIntencionPorReferencia(referencia);

      if (!checkoutIntent) {
        console.warn('⚠️ [Pago] Intención de checkout no encontrada para referencia:', referencia);
        // Responder 200 para que Wompi no reintente
        return res.json({
          success: true,
          message: 'Webhook procesado (intención de checkout no encontrada)'
        });
      }

      const estadoTransaccion = resultado.datos.estado;
      const evento = resultado.evento;
      const idTransaccionWompi = resultado.datos.idTransaccion;
      
      // 🔄 REGISTRAR EVENTO: Actualizar estado de la intención de checkout
      await CheckoutService.actualizarEstado(
        checkoutIntent.id,
        estadoTransaccion,
        idTransaccionWompi
      );
      
      console.log('📝 [Pago] Evento registrado en intención de checkout:', {
        checkoutIntentId: checkoutIntent.id,
        referencia: referencia,
        evento: evento,
        estadoTransaccion: estadoTransaccion,
        idTransaccionWompi: idTransaccionWompi
      });
      
      // Procesar solo eventos de transacciones finalizadas
      if (evento === 'transaction.updated' || evento === 'transaction.created') {
        if (estadoTransaccion === 'APPROVED') {
          // Transacción aprobada - Confirmar checkout y crear pedido
          try {
            const pedido = await CheckoutService.confirmarCheckout(checkoutIntent.id);
            
            console.log('✅ [Pago] Pedido creado desde webhook (pago aprobado):', {
              pedidoId: pedido.id,
              numeroOrden: pedido.numeroOrden,
              estado: pedido.estado, // Debe ser "pendiente"
              checkoutIntentId: checkoutIntent.id,
              idTransaccion: idTransaccionWompi,
              referencia: referencia,
              evento: evento
            });
            
            // Responder 200 para confirmar a Wompi que recibimos el webhook
            return res.json({
              success: true,
              message: 'Webhook procesado exitosamente - Pedido creado',
              pedidoId: pedido.id,
              estado: pedido.estado
            });
          } catch (errorCreacion) {
            console.error('❌ [Pago] Error al confirmar checkout desde webhook:', errorCreacion);
            // Responder 200 para que Wompi no reintente, pero registrar el error
            return res.status(200).json({
              success: false,
              message: 'Error al crear pedido (pero webhook recibido)',
              error: process.env.NODE_ENV === 'development' ? errorCreacion.message : 'Error interno'
            });
          }
        } else if (estadoTransaccion === 'DECLINED' || estadoTransaccion === 'VOIDED' || estadoTransaccion === 'ERROR') {
          // Transacción rechazada, anulada o con error
          // NO crear el pedido, solo registrar el rechazo (ya registrado arriba)
          console.log('❌ [Pago] Pago rechazado - NO se creará pedido:', {
            checkoutIntentId: checkoutIntent.id,
            estadoTransaccion: estadoTransaccion,
            referencia: referencia,
            mensaje: resultado.datos.mensaje || 'Pago rechazado o fallido'
          });
          
          // Responder 200 para confirmar a Wompi que recibimos el webhook
          return res.json({
            success: true,
            message: 'Webhook procesado exitosamente - Pago rechazado, pedido no creado',
            estadoTransaccion: estadoTransaccion
          });
        } else if (estadoTransaccion === 'PENDING') {
          // Transacción aún pendiente - no hacer nada, esperar siguiente evento
          console.log('⏳ [Pago] Transacción pendiente, esperando siguiente evento:', {
            checkoutIntentId: checkoutIntent.id,
            idTransaccion: idTransaccionWompi
          });
          
          return res.json({
            success: true,
            message: 'Webhook procesado - Transacción pendiente',
            estadoTransaccion: estadoTransaccion
          });
        }
      } else {
        console.log('ℹ️ [Pago] Evento recibido pero no procesado:', {
          evento: evento,
          estado: estadoTransaccion,
          checkoutIntentId: checkoutIntent.id
        });
      }

      // Responder 200 para confirmar a Wompi que recibimos el webhook
      res.json({
        success: true,
        message: 'Webhook procesado exitosamente',
        checkoutIntentId: checkoutIntent.id,
        estadoTransaccion: estadoTransaccion
      });
    } catch (error) {
      console.error('❌ [Pago] Error al procesar webhook:', error);
      // Responder 200 para que Wompi no reintente en caso de error interno
      res.status(200).json({
        success: false,
        message: 'Error al procesar webhook (pero recibido)',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  
  /**
   * Obtener configuración pública de Wompi (para frontend)
   * GET /api/v1/pagos/configuracion
   */
  static async obtenerConfiguracion(req, res) {
    try {
      const configuracion = wompiService.obtenerConfiguracionPublica();

      res.json({
        success: true,
        message: 'Configuración obtenida exitosamente',
        data: configuracion
      });
    } catch (error) {
      console.error('❌ [Pago] Error al obtener configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al obtener configuración'
      });
    }
  }

  /**
   * Verificar tiempo restante para completar el pago de un pedido
   * GET /api/v1/pagos/tiempo-restante/:pedidoId
   */
  static async verificarTiempoRestante(req, res) {
    try {
      const { pedidoId } = req.params;
      const userId = req.user.id;

      if (!pedidoId) {
        return res.status(400).json({
          success: false,
          message: 'ID de pedido es requerido'
        });
      }

      // Verificar que el pedido pertenece al usuario
      const pedidoSql = `
        SELECT 
          id,
          numero_orden,
          estado,
          referencia_pago,
          fecha_creacion,
          TIMESTAMPDIFF(SECOND, fecha_creacion, NOW()) as segundos_transcurridos
        FROM ordenes
        WHERE id = ? AND usuario_id = ?
      `;
      const pedidos = await query(pedidoSql, [pedidoId, userId]);

      if (pedidos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      const pedido = pedidos[0];

      // Si el pedido no está pendiente o no tiene referencia de pago, no hay timeout
      if (pedido.estado !== 'pendiente' || !pedido.referencia_pago) {
        return res.json({
          success: true,
          data: {
            tieneTimeout: false,
            tiempoRestante: null,
            tiempoTranscurrido: pedido.segundos_transcurridos,
            estado: pedido.estado
          }
        });
      }

      const TIMEOUT_SECONDS = 2 * 60; // 2 minutos en segundos
      const segundosTranscurridos = pedido.segundos_transcurridos || 0;
      const segundosRestantes = Math.max(0, TIMEOUT_SECONDS - segundosTranscurridos);
      const expirado = segundosRestantes === 0;

      return res.json({
        success: true,
        data: {
          tieneTimeout: true,
          tiempoRestante: segundosRestantes,
          tiempoTranscurrido: segundosTranscurridos,
          expirado: expirado,
          estado: pedido.estado,
          minutosRestantes: Math.ceil(segundosRestantes / 60),
          segundosRestantes: segundosRestantes % 60
        }
      });

    } catch (error) {
      console.error('❌ [Pago] Error al verificar tiempo restante:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar tiempo restante',
        error: error.message
      });
    }
  }

  /**
   * Endpoint temporal de debug para validar la clave pública
   * GET /api/v1/pagos/debug-public-key
   */
  static async debugPublicKey(req, res) {
    console.log('🔍 [Debug] Endpoint debug-public-key llamado (SIN autenticación)');
    try {
      // wompiService ya es una instancia, no una clase
      const service = wompiService;
      
      const clavePublicaRaw = service.configuracion.clavePublica;
      const clavePublicaTrimmed = clavePublicaRaw?.trim() || '';
      
      // Análisis detallado
      const analisis = {
        valorRaw: clavePublicaRaw,
        valorTrimmed: clavePublicaTrimmed,
        longitud: clavePublicaTrimmed.length,
        tipo: typeof clavePublicaRaw,
        tieneEspacios: clavePublicaRaw?.includes(' ') || false,
        tieneComillas: clavePublicaRaw?.includes('"') || clavePublicaRaw?.includes("'") || false,
        tieneSaltosLinea: clavePublicaRaw?.includes('\n') || clavePublicaRaw?.includes('\r') || false,
        primerosCaracteres: clavePublicaTrimmed.substring(0, 20),
        ultimosCaracteres: clavePublicaTrimmed.substring(Math.max(0, clavePublicaTrimmed.length - 10)),
        caracteresDetallados: Array.from(clavePublicaTrimmed.substring(0, 20)).map((char, index) => ({
          index,
          char,
          code: char.charCodeAt(0),
          hex: char.charCodeAt(0).toString(16),
          isValid: /[a-zA-Z0-9_]/.test(char)
        })),
        empiezaConPubTest: clavePublicaTrimmed.startsWith('pub_test_'),
        empiezaConPubProd: clavePublicaTrimmed.startsWith('pub_prod_'),
        formatoValido: /^pub_(test|prod)_[a-zA-Z0-9_]+$/.test(clavePublicaTrimmed),
        longitudValida: clavePublicaTrimmed.length >= 30
      };
      
      // Generar URL mínima de prueba (sin signature, solo para verificar la clave pública)
      const urlMinima = `https://checkout.wompi.co/p?public-key=${clavePublicaTrimmed}&currency=COP&amount-in-cents=100000&reference=TEST-${Date.now()}`;
      
      // Generar URL con signature (para comparar)
      const crypto = require('crypto');
      const claveIntegridad = service.configuracion.claveIntegridad?.trim() || '';
      const referenciaTest = `TEST-${Date.now()}`;
      const montoTest = 100000;
      const monedaTest = 'COP';
      const cadenaFirma = `${referenciaTest}${montoTest}${monedaTest}${claveIntegridad}`;
      const signatureTest = crypto.createHash('sha256').update(cadenaFirma).digest('hex');
      const urlConSignature = `https://checkout.wompi.co/p?public-key=${clavePublicaTrimmed}&currency=COP&amount-in-cents=${montoTest}&reference=${referenciaTest}&signature:integrity=${signatureTest}`;
      
      res.status(200).json({
        success: true,
        analisis,
        recomendaciones: analisis.formatoValido && analisis.longitudValida 
          ? ['✅ La clave pública parece estar correcta']
          : [
              analisis.empiezaConPubTest || analisis.empiezaConPubProd 
                ? null 
                : '❌ La clave pública debe empezar con "pub_test_" o "pub_prod_"',
              analisis.longitudValida 
                ? null 
                : '❌ La clave pública debe tener al menos 30 caracteres',
              analisis.tieneEspacios 
                ? '⚠️ La clave pública tiene espacios. Elimínalos del archivo .env' 
                : null,
              analisis.tieneComillas 
                ? '⚠️ La clave pública tiene comillas. Elimínalas del archivo .env' 
                : null,
              analisis.tieneSaltosLinea 
                ? '⚠️ La clave pública tiene saltos de línea. Elimínalos del archivo .env' 
                : null
            ].filter(Boolean),
        urlsPrueba: {
          urlMinima: urlMinima,
          urlConSignature: urlConSignature,
          instrucciones: [
            '1. Copia la URL mínima y ábrela en Chrome',
            '2. Si funciona, la clave pública es válida',
            '3. Si no funciona, la clave pública podría no ser válida o estar deshabilitada',
            '4. Prueba también la URL con signature para verificar la firma'
          ]
        }
      });
    } catch (error) {
      console.error('❌ [Debug] Error al analizar clave pública:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = PagoController;
