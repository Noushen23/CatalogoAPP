const { query, getConnection } = require('../config/database');
const Order = require('../models/Order');
const notificationService = require('./notifications/notificationService');

/**
 * Servicio de Órdenes
 * 
 * Maneja la lógica de negocio relacionada con órdenes/pedidos,
 * separando la responsabilidad de los controladores.
 */
class OrderService {
  /**
   * Confirmar checkout y crear pedido
   * 
   * Se llama cuando un pago es aprobado (APPROVED) para crear el pedido.
   * 
   * @param {string} checkoutIntentId - ID de la intención de checkout
   * @returns {Promise<Object>} Pedido creado
   */
  static async confirmCheckout(checkoutIntentId) {
    const connection = await getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Obtener datos de la intención de checkout
      const intentSql = `
        SELECT id, usuario_id, carrito_id, direccion_envio_id, metodo_pago, notas,
               datos_carrito, datos_usuario, datos_envio, referencia_pago
        FROM checkout_intents
        WHERE id = ? AND estado_transaccion = 'APPROVED'
      `;
      
      const intents = await query(intentSql, [checkoutIntentId]);
      
      if (intents.length === 0) {
        throw new Error(`Intención de checkout no encontrada o no aprobada: ${checkoutIntentId}`);
      }

      const intent = intents[0];

      // 2. Verificar que el pedido no haya sido creado ya
      const pedidoExistenteSql = `
        SELECT id FROM ordenes WHERE referencia_pago = ?
      `;
      const pedidosExistentes = await query(pedidoExistenteSql, [intent.referencia_pago]);
      
      if (pedidosExistentes.length > 0) {
        console.log('⚠️ [OrderService] Pedido ya existe para esta referencia:', intent.referencia_pago);
        await connection.rollback();
        return await Order.findById(pedidosExistentes[0].id);
      }

      // 3. Parsear datos guardados
      const datosCarrito = JSON.parse(intent.datos_carrito);
      const datosUsuario = JSON.parse(intent.datos_usuario);
      const datosEnvio = intent.datos_envio ? JSON.parse(intent.datos_envio) : null;

      // 4. Preparar datos para crear el pedido
      const orderData = {
        usuarioId: intent.usuario_id,
        cartId: intent.carrito_id,
        direccionEnvioId: intent.direccion_envio_id || null,
        metodoPago: intent.metodo_pago,
        referenciaPago: intent.referencia_pago,
        notas: intent.notas || null,
        items: datosCarrito.items
      };

      // 5. Crear el pedido desde el carrito
      // ⚠️ IMPORTANTE: Order.createFromCart crea el pedido con estado "pendiente"
      const pedido = await Order.createFromCart(orderData);

      console.log('✅ [OrderService] Pedido creado desde confirmCheckout:', {
        pedidoId: pedido.id,
        numeroOrden: pedido.numeroOrden,
        estado: pedido.estado, // Debe ser "pendiente"
        checkoutIntentId: checkoutIntentId,
        referenciaPago: intent.referencia_pago
      });

      // 6. Enviar notificación de pedido creado
      try {
        await notificationService.sendOrderStatusUpdateNotification(
          intent.usuario_id,
          {
            id: pedido.id,
            numeroOrden: pedido.numeroOrden
          },
          'pendiente'
        );
        
        // Registrar en historial
        await notificationService.logNotification(
          intent.usuario_id,
          'order_status_update',
          '⏳ Estado del pedido actualizado',
          `Tu pedido #${pedido.numeroOrden} está siendo procesado`,
          {
            type: 'order_status_update',
            orderId: pedido.id,
            orderNumber: pedido.numeroOrden,
            newStatus: 'pendiente',
            timestamp: new Date().toISOString()
          },
          true
        );
      } catch (notifError) {
        console.error('⚠️ [OrderService] Error al enviar notificación de pedido creado:', notifError);
        // No fallar la creación del pedido si falla la notificación
      }

      await connection.commit();
      return pedido;

    } catch (error) {
      await connection.rollback();
      console.error('❌ [OrderService] Error en confirmCheckout:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtener intención de checkout por referencia de pago
   * 
   * @param {string} referenciaPago - Referencia de pago de Wompi
   * @returns {Promise<Object|null>} Intención de checkout o null
   */
  static async getCheckoutIntentByReference(referenciaPago) {
    const intentSql = `
      SELECT * FROM checkout_intents
      WHERE referencia_pago = ?
    `;
    
    const intents = await query(intentSql, [referenciaPago]);
    return intents.length > 0 ? intents[0] : null;
  }

  /**
   * Actualizar estado de intención de checkout
   * 
   * @param {string} checkoutIntentId - ID de la intención
   * @param {string} estadoTransaccion - Nuevo estado (APPROVED, DECLINED, etc.)
   * @param {string} idTransaccionWompi - ID de transacción en Wompi (opcional)
   * @returns {Promise<void>}
   */
  static async updateCheckoutIntentStatus(checkoutIntentId, estadoTransaccion, idTransaccionWompi = null) {
    const updateSql = `
      UPDATE checkout_intents
      SET estado_transaccion = ?,
          id_transaccion_wompi = ?,
          fecha_actualizacion = NOW()
      WHERE id = ?
    `;
    
    await query(updateSql, [estadoTransaccion, idTransaccionWompi, checkoutIntentId]);
  }
}

module.exports = OrderService;
