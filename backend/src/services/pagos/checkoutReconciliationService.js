const { query } = require('../config/database');
const wompiService = require('./pagos/wompiService');
const CheckoutService = require('./checkoutService');

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
        SELECT id, referencia_pago, id_transaccion_wompi, estado_transaccion, fecha_creacion
        FROM checkout_intents
        WHERE estado_transaccion = 'PENDING'
          AND fecha_creacion >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY fecha_creacion ASC
        LIMIT 200
        `
      );

      for (const intent of intents) {
        const referencia = intent.referencia_pago;
        let resultado = null;

        if (intent.id_transaccion_wompi) {
          resultado = await wompiService.consultarTransaccion(intent.id_transaccion_wompi);
        } else {
          resultado = await wompiService.consultarTransaccionPorReferencia(referencia);
        }

        if (!resultado?.exito) {
          console.warn('⚠️ [Reconciliation] No se pudo consultar transacción:', {
            referencia,
            error: resultado?.error
          });
          continue;
        }

        const estado = resultado.datos.estado;
        const idTransaccionWompi = resultado.datos.id || intent.id_transaccion_wompi || null;

        if (estado === 'APPROVED') {
          try {
            await CheckoutService.actualizarEstado(intent.id, 'APPROVED', idTransaccionWompi);
            await CheckoutService.confirmarCheckout(intent.id);
            console.log('✅ [Reconciliation] Pedido creado por conciliación:', {
              intentId: intent.id,
              referencia,
              idTransaccionWompi
            });
            continue;
          } catch (error) {
            const message = error?.message || 'Error al crear pedido';
            await CheckoutService.actualizarEstado(intent.id, 'ERROR', idTransaccionWompi);
            console.error('❌ [Reconciliation] Error al crear pedido desde intent:', {
              intentId: intent.id,
              referencia,
              idTransaccionWompi,
              error: message
            });
            continue;
          }
        }

        if (['DECLINED', 'VOIDED', 'ERROR'].includes(estado)) {
          await CheckoutService.actualizarEstado(intent.id, estado, idTransaccionWompi);
          console.log('❌ [Reconciliation] Intent marcado como rechazado:', {
            intentId: intent.id,
            referencia,
            estado
          });
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
