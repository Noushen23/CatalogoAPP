const wompiService = require('../services/pagos/wompiService');
const Order = require('../models/Order');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Controlador de Pagos
 * 
 * Maneja todas las operaciones relacionadas con pagos a través de Wompi:
 * - Crear transacciones de pago
 * - Consultar estado de pagos
 * - Procesar webhooks de Wompi
 * - Actualizar pedidos con información de pago
 */
class PagoController {
  /**
   * Crear una transacción de pago para un pedido
   * POST /api/v1/pagos/crear
   */
  static async crearTransaccion(req, res) {
    try {
      const userId = req.user.id;
      const {
        pedidoId,
        metodoPago,
        datosTarjeta, // Solo para pagos con tarjeta (token se genera en frontend)
        datosPSE, // Solo para pagos PSE
        urlRedireccion,
        urlRedireccionError
      } = req.body;

      // Validar que se proporcione el ID del pedido
      if (!pedidoId) {
        return res.status(400).json({
          success: false,
          message: 'El ID del pedido es requerido'
        });
      }

      // Validar método de pago
      const metodosPermitidos = ['tarjeta', 'pse', 'nequi', 'bancolombia_transfer'];
      if (!metodoPago || !metodosPermitidos.includes(metodoPago.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Método de pago inválido. Métodos permitidos: ${metodosPermitidos.join(', ')}`
        });
      }

      // Obtener el pedido
      const pedido = await Order.findById(pedidoId);
      
      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Verificar que el pedido pertenece al usuario
      if (pedido.usuarioId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para pagar este pedido'
        });
      }

      // Verificar que el pedido esté en estado pendiente
      if (pedido.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: `El pedido no puede ser pagado. Estado actual: ${pedido.estado}`
        });
      }

      // Verificar que el pedido no tenga ya una referencia de pago
      if (pedido.referenciaPago) {
        return res.status(400).json({
          success: false,
          message: 'Este pedido ya tiene una transacción de pago asociada'
        });
      }

      // Obtener datos del usuario para la transacción
      const usuarioSql = `
        SELECT email, nombre_completo, telefono, tipo_identificacion, numero_identificacion
        FROM usuarios
        WHERE id = ?
      `;
      const [usuarios] = await query(usuarioSql, [userId]);
      const usuario = usuarios[0];

      if (!usuario) {
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

      // Preparar método de pago para Wompi
      let metodoPagoWompi = {
        tipo: metodoPago.toUpperCase() === 'TARJETA' ? 'CARD' : 
              metodoPago.toUpperCase() === 'PSE' ? 'PSE' :
              metodoPago.toUpperCase() === 'NEQUI' ? 'NEQUI' :
              metodoPago.toUpperCase() === 'BANCOLOMBIA_TRANSFER' ? 'BANCOLOMBIA_TRANSFER' : 'CARD',
        cuotas: 1
      };

      // Agregar datos específicos según el método
      if (metodoPago.toLowerCase() === 'tarjeta' && datosTarjeta) {
        if (!datosTarjeta.tokenTarjeta) {
          return res.status(400).json({
            success: false,
            message: 'Se requiere el token de la tarjeta para pagos con tarjeta'
          });
        }
        metodoPagoWompi.tokenTarjeta = datosTarjeta.tokenTarjeta;
        metodoPagoWompi.cuotas = datosTarjeta.cuotas || 1;
      } else if (metodoPago.toLowerCase() === 'pse' && datosPSE) {
        if (!datosPSE.banco || !datosPSE.tipoPersona) {
          return res.status(400).json({
            success: false,
            message: 'Se requiere banco y tipo de persona para pagos PSE'
          });
        }
        metodoPagoWompi.banco = datosPSE.banco;
        metodoPagoWompi.tipoPersona = datosPSE.tipoPersona; // 'PERSON' o 'COMPANY'
        metodoPagoWompi.tipoIdentificacion = datosPSE.tipoIdentificacion || cliente.tipoIdentificacion;
        metodoPagoWompi.numeroIdentificacion = datosPSE.numeroIdentificacion || cliente.numeroIdentificacion;
      }

      // Generar referencia única para la transacción
      const referencia = `PED-${pedido.numeroOrden}-${Date.now()}`;

      // Convertir monto a centavos (Wompi espera el monto en centavos)
      const montoEnCentavos = Math.round(pedido.total * 100);

      // Crear transacción en Wompi
      const resultadoTransaccion = await wompiService.crearTransaccion({
        referencia,
        monto: montoEnCentavos,
        moneda: 'COP',
        cliente,
        metodoPago: metodoPagoWompi,
        urlRedireccion: urlRedireccion || `${process.env.APP_URL || 'http://192.168.3.104:3001'}/pago-exitoso?pedido=${pedidoId}`,
        urlRedireccionError: urlRedireccionError || `${process.env.APP_URL || 'http://192.168.3.104:3001'}/pago-error?pedido=${pedidoId}`
      });

      if (!resultadoTransaccion.exito) {
        return res.status(400).json({
          success: false,
          message: 'Error al crear la transacción en Wompi',
          error: resultadoTransaccion.error,
          detalles: resultadoTransaccion.detalles
        });
      }

      // Guardar información de la transacción en la base de datos
      const idTransaccionWompi = resultadoTransaccion.datos.idTransaccion;
      
      // Actualizar el pedido con la referencia de pago
      const actualizarPedidoSql = `
        UPDATE ordenes
        SET referencia_pago = ?,
            metodo_pago = ?,
            fecha_actualizacion = NOW()
        WHERE id = ?
      `;
      await query(actualizarPedidoSql, [referencia, metodoPago, pedidoId]);

      // Guardar registro de la transacción (opcional: crear tabla transacciones_pagos)
      // Por ahora, guardamos la información en el pedido

      console.log('✅ [Pago] Transacción creada exitosamente:', {
        pedidoId,
        referencia,
        idTransaccionWompi,
        metodoPago
      });

      // Respuesta exitosa
      res.status(201).json({
        success: true,
        message: 'Transacción de pago creada exitosamente',
        data: {
          idTransaccion: idTransaccionWompi,
          referencia: referencia,
          estado: resultadoTransaccion.datos.estado,
          urlRedireccion: resultadoTransaccion.datos.urlRedireccion,
          metodoPago: metodoPago,
          monto: pedido.total,
          moneda: 'COP',
          pedidoId: pedidoId,
          numeroOrden: pedido.numeroOrden
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

      // Si la transacción está aprobada, actualizar el pedido
      if (resultado.datos.estado === 'APPROVED') {
        // Buscar pedido por referencia
        const pedidoSql = `
          SELECT id, estado, referencia_pago
          FROM ordenes
          WHERE referencia_pago = ? AND usuario_id = ?
        `;
        const [pedidos] = await query(pedidoSql, [resultado.datos.referencia, userId]);

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
      // Obtener firma del header
      const firma = req.headers['signature'] || req.headers['x-signature'];

      if (!firma) {
        console.warn('⚠️ [Pago] Webhook recibido sin firma');
        return res.status(400).json({
          success: false,
          message: 'Firma de webhook no proporcionada'
        });
      }

      // Procesar webhook
      const resultado = wompiService.procesarWebhook(req.body, firma);

      if (!resultado.exito) {
        return res.status(400).json({
          success: false,
          message: 'Error al procesar webhook',
          error: resultado.error
        });
      }

      // Buscar pedido por referencia
      const referencia = resultado.datos.referencia;
      const pedidoSql = `
        SELECT id, estado, usuario_id
        FROM ordenes
        WHERE referencia_pago = ?
      `;
      const [pedidos] = await query(pedidoSql, [referencia]);

      if (pedidos.length === 0) {
        console.warn('⚠️ [Pago] Pedido no encontrado para referencia:', referencia);
        // Responder 200 para que Wompi no reintente
        return res.json({
          success: true,
          message: 'Webhook procesado (pedido no encontrado)'
        });
      }

      const pedido = pedidos[0];

      // Actualizar estado del pedido según el estado de la transacción
      if (resultado.datos.estado === 'APPROVED' && pedido.estado === 'pendiente') {
        const actualizarPedidoSql = `
          UPDATE ordenes
          SET estado = 'confirmada',
              fecha_actualizacion = NOW()
          WHERE id = ?
        `;
        await query(actualizarPedidoSql, [pedido.id]);
        
        console.log('✅ [Pago] Pedido actualizado a confirmada desde webhook:', pedido.id);
      } else if (resultado.datos.estado === 'DECLINED' || resultado.datos.estado === 'VOIDED') {
        // Opcional: actualizar pedido a cancelada si el pago fue rechazado
        // Por ahora, dejamos el pedido en pendiente para que el usuario pueda intentar otro método
        console.log('⚠️ [Pago] Pago rechazado para pedido:', pedido.id);
      }

      // Responder 200 para confirmar a Wompi que recibimos el webhook
      res.json({
        success: true,
        message: 'Webhook procesado exitosamente',
        pedidoId: pedido.id,
        estadoAnterior: pedido.estado,
        estadoNuevo: resultado.datos.estado === 'APPROVED' ? 'confirmada' : pedido.estado
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
   * Obtener lista de bancos disponibles para PSE
   * GET /api/v1/pagos/bancos-pse
   */
  static async obtenerBancosPSE(req, res) {
    try {
      const resultado = await wompiService.obtenerBancosPSE();

      if (!resultado.exito) {
        return res.status(400).json({
          success: false,
          message: 'Error al obtener bancos PSE',
          error: resultado.error
        });
      }

      res.json({
        success: true,
        message: 'Bancos obtenidos exitosamente',
        data: {
          bancos: resultado.bancos
        }
      });
    } catch (error) {
      console.error('❌ [Pago] Error al obtener bancos PSE:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al obtener bancos'
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
}

module.exports = PagoController;
