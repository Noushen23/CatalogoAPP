const { query } = require('../../config/database');
const wompiService = require('./wompiService');
const CheckoutService = require('./checkoutService');
const Order = require('../../models/Order');
const emailService = require('../emailService');

let isRunning = false;

class CheckoutReconciliationService {
  static async reconcilePendingCheckoutIntents() {
    if (isRunning) {
      console.warn('⏳ [Reconciliation] Job ya está en ejecución. Saltando...');
      return;
    }

    isRunning = true;
    try {
      console.log('🔄 [Reconciliation] Iniciando conciliación de checkout_intents...');

      const intents = await query(
        `
        SELECT id, referencia_pago, id_transaccion_wompi, estado_transaccion, fecha_creacion, fecha_expiracion
        FROM checkout_intents
        WHERE estado_transaccion = 'PENDING'
          AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY fecha_creacion ASC
        LIMIT 200
        `
      );

      for (const intent of intents) {
        const referencia = intent.referencia_pago;
        const idTransaccionWompi = intent.id_transaccion_wompi || null;
        let resultado = null;

        if (intent.id_transaccion_wompi) {
          resultado = await wompiService.consultarTransaccion(intent.id_transaccion_wompi);
        } else {
          resultado = await wompiService.consultarTransaccionPorReferencia(referencia);
        }

        const ahora = new Date();
        const expirado = intent.fecha_expiracion ? new Date(intent.fecha_expiracion) <= ahora : false;

        if (!resultado?.exito) {
          console.warn('⚠️ [Reconciliation] No se pudo consultar transacción:', {
            referencia,
            error: resultado?.error,
            expirado
          });

          if (expirado) {
            await CheckoutService.actualizarEstado(intent.id, 'ERROR', idTransaccionWompi);
            const pedidos = await query(
              `SELECT id, estado FROM ordenes WHERE referencia_pago = ? LIMIT 1`,
              [referencia]
            );
            if (pedidos.length > 0 && pedidos[0].estado === 'pendiente') {
              const estadoAnterior = pedidos[0].estado;
              await Order.markPaymentFailed(pedidos[0].id, 'Pago expirado');
              const pedidoActualizado = await Order.findById(pedidos[0].id);
              if (pedidoActualizado?.usuario?.email) {
                await emailService.sendOrderStatusUpdateEmail(
                  pedidoActualizado.usuario.email,
                  pedidoActualizado.usuario.nombreCompleto || 'Usuario',
                  pedidoActualizado.numeroOrden,
                  pedidoActualizado.estado,
                  estadoAnterior,
                  pedidoActualizado.total,
                  pedidoActualizado.fechaCreacion
                );
              }
            }
          }
          continue;
        }

        const estado = resultado.datos.estado;
        const idTransaccionWompiFinal = resultado.datos.id || idTransaccionWompi;

        if (estado === 'APPROVED') {
          try {
            const pedidoPrevio = await query(
              `SELECT id, estado FROM ordenes WHERE referencia_pago = ? LIMIT 1`,
              [referencia]
            );
            const estadoAnterior = pedidoPrevio.length ? pedidoPrevio[0].estado : 'pendiente';

            await CheckoutService.actualizarEstado(intent.id, 'APPROVED', idTransaccionWompiFinal);
            const pedido = await CheckoutService.confirmarCheckout(intent.id);
            if (estadoAnterior !== 'confirmada' && pedido?.usuario?.email) {
              await emailService.sendOrderStatusUpdateEmail(
                pedido.usuario.email,
                pedido.usuario.nombreCompleto || 'Usuario',
                pedido.numeroOrden,
                pedido.estado,
                estadoAnterior,
                pedido.total,
                pedido.fechaCreacion
              );
            }
            console.log('✅ [Reconciliation] Pedido confirmado por conciliación:', {
              intentId: intent.id,
              referencia,
              idTransaccionWompi: idTransaccionWompiFinal
            });
            continue;
          } catch (error) {
            const message = error?.message || 'Error al crear pedido';
            await CheckoutService.actualizarEstado(intent.id, 'ERROR', idTransaccionWompiFinal);
            console.error('❌ [Reconciliation] Error al crear pedido desde intent:', {
              intentId: intent.id,
              referencia,
              idTransaccionWompi: idTransaccionWompiFinal,
              error: message
            });
            continue;
          }
        }

        if (['DECLINED', 'VOIDED', 'ERROR'].includes(estado)) {
          await CheckoutService.actualizarEstado(intent.id, estado, idTransaccionWompiFinal);

          const pedidos = await query(
            `SELECT id, estado FROM ordenes WHERE referencia_pago = ? LIMIT 1`,
            [referencia]
          );
          if (pedidos.length > 0 && pedidos[0].estado === 'pendiente') {
            const estadoAnterior = pedidos[0].estado;
            await Order.markPaymentFailed(pedidos[0].id, 'Pago rechazado o fallido');
            const pedidoActualizado = await Order.findById(pedidos[0].id);
            if (pedidoActualizado?.usuario?.email) {
              await emailService.sendOrderStatusUpdateEmail(
                pedidoActualizado.usuario.email,
                pedidoActualizado.usuario.nombreCompleto || 'Usuario',
                pedidoActualizado.numeroOrden,
                pedidoActualizado.estado,
                estadoAnterior,
                pedidoActualizado.total,
                pedidoActualizado.fechaCreacion
              );
            }
          }

          console.log('❌ [Reconciliation] Intent marcado como rechazado:', {
            intentId: intent.id,
            referencia,
            estado
          });
        }

        if (estado === 'PENDING' && expirado) {
          await CheckoutService.actualizarEstado(intent.id, 'ERROR', idTransaccionWompiFinal);
          const pedidos = await query(
            `SELECT id, estado FROM ordenes WHERE referencia_pago = ? LIMIT 1`,
            [referencia]
          );
          if (pedidos.length > 0 && pedidos[0].estado === 'pendiente') {
            const estadoAnterior = pedidos[0].estado;
            await Order.markPaymentFailed(pedidos[0].id, 'Pago expirado');
            const pedidoActualizado = await Order.findById(pedidos[0].id);
            if (pedidoActualizado?.usuario?.email) {
              await emailService.sendOrderStatusUpdateEmail(
                pedidoActualizado.usuario.email,
                pedidoActualizado.usuario.nombreCompleto || 'Usuario',
                pedidoActualizado.numeroOrden,
                pedidoActualizado.estado,
                estadoAnterior,
                pedidoActualizado.total,
                pedidoActualizado.fechaCreacion
              );
            }
          }
        }
      }

      console.log('✅ [Reconciliation] Conciliación finalizada.');
    } catch (error) {
      console.error('❌ [Reconciliation] Error en conciliación:', error);
    } finally {
      isRunning = false;
    }
  }
}

module.exports = CheckoutReconciliationService;
