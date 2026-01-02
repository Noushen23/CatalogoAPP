const { Expo } = require('expo-server-sdk');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class NotificationService {
  constructor() {
    // Crear una nueva instancia del cliente de Expo
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN, // Opcional, para mayor límite de requests
      useFcmV1: true, // Usar FCM v1 API para mejor compatibilidad
    });
  }

  /**
   * Verificar si un token es válido para Expo
   * @param {string} pushToken - El token de push a verificar
   * @returns {boolean} - True si el token es válido
   */
  isExpoPushToken(pushToken) {
    return Expo.isExpoPushToken(pushToken);
  }

  /**
   * Enviar notificación push a un token específico
   * @param {string} pushToken - Token del dispositivo
   * @param {string} title - Título de la notificación
   * @param {string} body - Cuerpo de la notificación
   * @param {object} data - Datos adicionales (opcional)
   * @param {object} options - Opciones adicionales (opcional)
   * @returns {Promise<object>} - Resultado del envío
   */
  async sendPushNotification(pushToken, title, body, data = {}, options = {}) {
    try {
      // Verificar que el token sea válido
      if (!this.isExpoPushToken(pushToken)) {
        console.error('❌ Token de push inválido:', pushToken);
        return {
          success: false,
          error: 'Token de push inválido',
          receiptId: null
        };
      }

      // Construir el mensaje de notificación
      const message = {
        to: pushToken,
        sound: options.sound || 'default',
        title: title,
        body: body,
        data: data,
        priority: options.priority || 'high',
        channelId: options.channelId || 'default',
        badge: options.badge,
        ttl: options.ttl || 86400, // 24 horas por defecto
        ...options
      };

      // Enviar la notificación
      const chunks = this.expo.chunkPushNotifications([message]);
      const receipts = [];

      for (const chunk of chunks) {
        try {
          const receipt = await this.expo.sendPushNotificationsAsync(chunk);
          receipts.push(...receipt);
        } catch (error) {
          console.error('❌ Error al enviar chunk de notificaciones:', error);
          throw error;
        }
      }

      // Procesar los receipts para verificar el estado
      const results = await this.processReceipts(receipts);

      return {
        success: true,
        receipts: results,
        receiptId: receipts[0]?.id || null
      };

    } catch (error) {
      console.error('❌ Error al enviar notificación push:', error);
      return {
        success: false,
        error: error.message,
        receiptId: null
      };
    }
  }

  /**
   * Enviar notificación a múltiples tokens
   * @param {string[]} pushTokens - Array de tokens
   * @param {string} title - Título de la notificación
   * @param {string} body - Cuerpo de la notificación
   * @param {object} data - Datos adicionales
   * @param {object} options - Opciones adicionales
   * @returns {Promise<object>} - Resultado del envío
   */
  async sendBulkPushNotification(pushTokens, title, body, data = {}, options = {}) {
    try {
      // Filtrar tokens válidos
      const validTokens = pushTokens.filter(token => this.isExpoPushToken(token));
      
      if (validTokens.length === 0) {
        console.warn('⚠️ No hay tokens válidos para enviar notificaciones');
        return {
          success: false,
          error: 'No hay tokens válidos',
          sent: 0,
          failed: pushTokens.length
        };
      }

      // Construir mensajes para todos los tokens
      const messages = validTokens.map(token => ({
        to: token,
        sound: options.sound || 'default',
        title: title,
        body: body,
        data: data,
        priority: options.priority || 'high',
        channelId: options.channelId || 'default',
        badge: options.badge,
        ttl: options.ttl || 86400,
        ...options
      }));

      // Enviar en chunks
      const chunks = this.expo.chunkPushNotifications(messages);
      const receipts = [];

      for (const chunk of chunks) {
        try {
          const receipt = await this.expo.sendPushNotificationsAsync(chunk);
          receipts.push(...receipt);
        } catch (error) {
          console.error('❌ Error al enviar chunk de notificaciones masivas:', error);
          throw error;
        }
      }

      // Procesar resultados
      const results = await this.processReceipts(receipts);
      const successful = results.filter(r => r.status === 'ok').length;
      const failed = results.filter(r => r.status === 'error').length;

      return {
        success: true,
        sent: successful,
        failed: failed,
        receipts: results
      };

    } catch (error) {
      console.error('❌ Error al enviar notificación masiva:', error);
      return {
        success: false,
        error: error.message,
        sent: 0,
        failed: pushTokens.length
      };
    }
  }

  /**
   * Procesar receipts para verificar el estado de las notificaciones
   * @param {Array} receipts - Array de receipts
   * @returns {Promise<Array>} - Array de resultados procesados
   */
  async processReceipts(receipts) {
    try {
      const receiptIds = receipts
        .filter(receipt => receipt.status === 'ok')
        .map(receipt => receipt.id);

      if (receiptIds.length === 0) {
        return receipts;
      }

      // Obtener el estado de los receipts
      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
      const results = [];

      for (const chunk of receiptIdChunks) {
        try {
          const receipt = await this.expo.getPushNotificationReceiptsAsync(chunk);
          results.push(...Object.values(receipt));
        } catch (error) {
          console.error('❌ Error al obtener receipts:', error);
        }
      }

      return results;

    } catch (error) {
      console.error('❌ Error al procesar receipts:', error);
      return receipts;
    }
  }

  /**
   * Obtener el push token de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<string|null>} - Push token o null
   */
  async getUserPushToken(userId) {
    try {
      const queryResult = await query(
        'SELECT push_token FROM usuarios WHERE id = ? AND push_token IS NOT NULL',
        [userId]
      );

      return queryResult.length > 0 ? queryResult[0].push_token : null;

    } catch (error) {
      console.error('❌ Error al obtener push token del usuario:', error);
      return null;
    }
  }

  /**
   * Obtener todos los push tokens activos
   * @returns {Promise<string[]>} - Array de tokens activos
   */
  async getAllPushTokens() {
    try {
      const queryResult = await query(
        'SELECT push_token FROM usuarios WHERE push_token IS NOT NULL'
      );

      return queryResult.map(row => row.push_token);

    } catch (error) {
      console.error('❌ Error al obtener todos los push tokens:', error);
      return [];
    }
  }

  /**
   * Enviar notificación de actualización de pedido
   * @param {string} userId - ID del usuario
   * @param {object} order - Datos del pedido
   * @param {string} newStatus - Nuevo estado del pedido
   * @returns {Promise<object>} - Resultado del envío
   */
  async sendOrderStatusUpdateNotification(userId, order, newStatus) {
    try {
      const pushToken = await this.getUserPushToken(userId);
      
      if (!pushToken) {
        console.log('⚠️ Usuario no tiene push token registrado:', userId);
        return {
          success: false,
          error: 'Usuario no tiene push token',
          sent: false
        };
      }

      // Mapear estados a mensajes amigables
      const statusMessages = {
        'pendiente': 'Tu pedido #{{orderNumber}} está siendo procesado',
        'confirmada': 'Tu pedido #{{orderNumber}} ha sido confirmado',
        'en_proceso': 'Tu pedido #{{orderNumber}} está en preparación',
        'enviada': '¡Tu pedido #{{orderNumber}} ha sido enviado!',
        'entregada': '¡Tu pedido #{{orderNumber}} ha sido entregado!',
        'cancelada': 'Tu pedido #{{orderNumber}} ha sido cancelado'
      };

      const statusEmojis = {
        'pendiente': '⏳',
        'confirmada': '✅',
        'en_proceso': '🔄',
        'enviada': '📦',
        'entregada': '🎉',
        'cancelada': '❌'
      };

      const title = `${statusEmojis[newStatus] || '📋'} Estado del pedido actualizado`;
      const body = (statusMessages[newStatus] || 'Tu pedido #{{orderNumber}} ha sido actualizado')
        .replace('{{orderNumber}}', order.numeroOrden || order.id);

      const data = {
        type: 'order_status_update',
        orderId: order.id,
        orderNumber: order.numeroOrden || order.id,
        newStatus: newStatus,
        timestamp: new Date().toISOString()
      };

      const options = {
        sound: 'default',
        priority: 'high',
        channelId: 'order_updates',
        badge: 1
      };

      const result = await this.sendPushNotification(pushToken, title, body, data, options);

      console.log(`📱 Notificación de pedido enviada para usuario ${userId}:`, result);

      return result;

    } catch (error) {
      console.error('❌ Error al enviar notificación de estado de pedido:', error);
      return {
        success: false,
        error: error.message,
        sent: false
      };
    }
  }

  /**
   * Enviar notificación de nuevo pedido (para administradores)
   * @param {object} order - Datos del pedido
   * @param {string} customerName - Nombre del cliente
   * @returns {Promise<object>} - Resultado del envío
   */
  async sendNewOrderNotificationToAdmins(order, customerName) {
    try {
      // Obtener tokens de administradores
      const adminTokens = await this.getAdminPushTokens();
      
      if (adminTokens.length === 0) {
        console.log('⚠️ No hay administradores con push tokens registrados');
        return {
          success: false,
          error: 'No hay administradores con push tokens',
          sent: 0
        };
      }

      const title = '🛒 Nuevo pedido recibido';
      const body = `Pedido #${order.numero_orden || order.id} de ${customerName}`;

      const data = {
        type: 'new_order',
        orderId: order.id,
        orderNumber: order.numero_orden || order.id,
        customerName: customerName,
        timestamp: new Date().toISOString()
      };

      const options = {
        sound: 'default',
        priority: 'high',
        channelId: 'admin_notifications',
        badge: 1
      };

      const result = await this.sendBulkPushNotification(adminTokens, title, body, data, options);

      console.log('📱 Notificación de nuevo pedido enviada a administradores:', result);

      return result;

    } catch (error) {
      console.error('❌ Error al enviar notificación de nuevo pedido a admins:', error);
      return {
        success: false,
        error: error.message,
        sent: 0
      };
    }
  }

  /**
   * Obtener push tokens de administradores
   * @returns {Promise<string[]>} - Array de tokens de administradores
   */
  async getAdminPushTokens() {
    try {
      const queryResult = await query(
        'SELECT push_token FROM usuarios WHERE rol = ? AND push_token IS NOT NULL',
        ['admin']
      );

      return queryResult.map(row => row.push_token);

    } catch (error) {
      console.error('❌ Error al obtener push tokens de administradores:', error);
      return [];
    }
  }

  /**
   * Enviar notificación de producto en stock
   * @param {string} userId - ID del usuario
   * @param {object} product - Datos del producto
   * @returns {Promise<object>} - Resultado del envío
   */
  async sendProductInStockNotification(userId, product) {
    try {
      const pushToken = await this.getUserPushToken(userId);
      
      if (!pushToken) {
        return { success: false, error: 'Usuario no tiene push token', sent: false };
      }

      const title = '✅ Producto disponible';
      const body = `¡${product.nombre} ya está en stock!`;

      const data = {
        type: 'stock_available',
        productId: product.id,
        productName: product.nombre,
        timestamp: new Date().toISOString()
      };

      const options = {
        sound: 'default',
        priority: 'high',
        channelId: 'product_notifications',
        badge: 1
      };

      const result = await this.sendPushNotification(pushToken, title, body, data, options);

      // Registrar en historial
      await this.logNotification(userId, 'stock_available', title, body, data, result.success);

      return result;

    } catch (error) {
      console.error('❌ Error al enviar notificación de stock:', error);
      return { success: false, error: error.message, sent: false };
    }
  }

  /**
   * Enviar notificación de baja de precio
   * @param {string} userId - ID del usuario
   * @param {object} product - Datos del producto
   * @param {number} oldPrice - Precio anterior
   * @param {number} newPrice - Precio nuevo
   * @returns {Promise<object>} - Resultado del envío
   */
  async sendPriceDropNotification(userId, product, oldPrice, newPrice) {
    try {
      const pushToken = await this.getUserPushToken(userId);
      
      if (!pushToken) {
        return { success: false, error: 'Usuario no tiene push token', sent: false };
      }

      const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
      const title = '🏷️ ¡Bajó de precio!';
      const body = `${product.nombre} ahora cuesta $${newPrice.toLocaleString()} (${discount}% menos)`;

      const data = {
        type: 'price_drop',
        productId: product.id,
        productName: product.nombre,
        oldPrice: oldPrice,
        newPrice: newPrice,
        discount: discount,
        timestamp: new Date().toISOString()
      };

      const options = {
        sound: 'default',
        priority: 'high',
        channelId: 'product_notifications',
        badge: 1
      };

      const result = await this.sendPushNotification(pushToken, title, body, data, options);

      // Registrar en historial
      await this.logNotification(userId, 'price_drop', title, body, data, result.success);

      return result;

    } catch (error) {
      console.error('❌ Error al enviar notificación de precio:', error);
      return { success: false, error: error.message, sent: false };
    }
  }

  /**
   * Enviar recordatorio de carrito abandonado
   * @param {string} userId - ID del usuario
   * @param {object} cart - Datos del carrito
   * @returns {Promise<object>} - Resultado del envío
   */
  async sendAbandonedCartNotification(userId, cart) {
    try {
      const pushToken = await this.getUserPushToken(userId);
      
      if (!pushToken) {
        return { success: false, error: 'Usuario no tiene push token', sent: false };
      }

      const itemCount = cart.cantidad_productos || 1;
      const title = '🛒 No olvides tu carrito';
      const body = itemCount > 1 
        ? `Tienes ${itemCount} productos esperándote. ¡Completa tu compra!`
        : '¡Completa tu compra antes de que se agoten!';

      const data = {
        type: 'cart_reminder',
        cartId: cart.carrito_id,
        itemCount: itemCount,
        totalValue: cart.valor_total,
        timestamp: new Date().toISOString()
      };

      const options = {
        sound: 'default',
        priority: 'default',
        channelId: 'cart_reminders',
        badge: 1
      };

      const result = await this.sendPushNotification(pushToken, title, body, data, options);

      // Registrar en historial
      await this.logNotification(userId, 'cart_reminder', title, body, data, result.success);

      return result;

    } catch (error) {
      console.error('❌ Error al enviar notificación de carrito:', error);
      return { success: false, error: error.message, sent: false };
    }
  }

  /**
   * Registrar notificación en el historial
   * @param {string} userId - ID del usuario
   * @param {string} type - Tipo de notificación
   * @param {string} title - Título
   * @param {string} body - Cuerpo
   * @param {object} data - Datos adicionales
   * @param {boolean} success - Si fue exitosa
   * @returns {Promise<void>}
   */
  async logNotification(userId, type, title, body, data, success, error = null) {
    try {
      const notificationId = uuidv4();
      await query(
        `INSERT INTO historial_notificaciones 
        (id, usuario_id, tipo_notificacion, titulo, mensaje, datos_adicionales, exitosa, mensaje_error, fecha_envio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          notificationId,
          userId,
          type,
          title,
          body,
          JSON.stringify(data),
          success,
          error
        ]
      );
    } catch (err) {
      console.error('❌ Error al registrar notificación:', err);
    }
  }

  /**
   * Procesar notificaciones de productos en stock
   * @returns {Promise<object>} - Resultado del procesamiento
   */
  async processStockNotifications() {
    try {
      console.log('📦 Procesando notificaciones de stock...');

      // Obtener productos que volvieron a tener stock y tienen suscriptores
      const stockNotifications = await query(`
        SELECT 
          ns.id as subscription_id,
          ns.usuario_id,
          ns.producto_id,
          p.nombre as producto_nombre,
          p.stock
        FROM notificaciones_stock ns
        INNER JOIN productos p ON ns.producto_id = p.id
        WHERE ns.activa = TRUE
          AND ns.notificado = FALSE
          AND p.stock > 0
          AND p.activo = TRUE
      `);

      console.log(`📊 ${stockNotifications.length} notificaciones de stock pendientes`);

      let sent = 0;
      let failed = 0;

      for (const notification of stockNotifications) {
        const result = await this.sendProductInStockNotification(
          notification.usuario_id,
          { id: notification.producto_id, nombre: notification.producto_nombre }
        );

        if (result.success) {
          // Marcar como notificado
          await query(
            'UPDATE notificaciones_stock SET notificado = TRUE, fecha_notificacion = NOW() WHERE id = ?',
            [notification.subscription_id]
          );
          sent++;
        } else {
          failed++;
        }
      }

      console.log(`✅ Stock notifications: ${sent} enviadas, ${failed} fallidas`);

      return { success: true, sent, failed };

    } catch (error) {
      console.error('❌ Error al procesar notificaciones de stock:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Procesar notificaciones de baja de precio
   * @returns {Promise<object>} - Resultado del procesamiento
   */
  async processPriceDropNotifications() {
    try {
      console.log('💰 Procesando notificaciones de baja de precio...');

      // Obtener productos cuyo precio bajó según las suscripciones
      const priceNotifications = await query(`
        SELECT 
          np.id as subscription_id,
          np.usuario_id,
          np.producto_id,
          np.precio_objetivo,
          np.precio_original,
          p.nombre as producto_nombre,
          p.precio as precio_actual
        FROM notificaciones_precio np
        INNER JOIN productos p ON np.producto_id = p.id
        WHERE np.activa = TRUE
          AND np.notificado = FALSE
          AND p.precio <= np.precio_objetivo
          AND p.activo = TRUE
      `);

      console.log(`📊 ${priceNotifications.length} notificaciones de precio pendientes`);

      let sent = 0;
      let failed = 0;

      for (const notification of priceNotifications) {
        const result = await this.sendPriceDropNotification(
          notification.usuario_id,
          { id: notification.producto_id, nombre: notification.producto_nombre },
          notification.precio_original,
          notification.precio_actual
        );

        if (result.success) {
          // Marcar como notificado
          await query(
            'UPDATE notificaciones_precio SET notificado = TRUE, fecha_notificacion = NOW() WHERE id = ?',
            [notification.subscription_id]
          );
          sent++;
        } else {
          failed++;
        }
      }

      console.log(`✅ Price notifications: ${sent} enviadas, ${failed} fallidas`);

      return { success: true, sent, failed };

    } catch (error) {
      console.error('❌ Error al procesar notificaciones de precio:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Procesar recordatorios de carrito abandonado
   * @returns {Promise<object>} - Resultado del procesamiento
   */
  async processAbandonedCartNotifications() {
    try {
      console.log('🛒 Procesando recordatorios de carrito...');

      // Usar la vista de carritos abandonados
      const abandonedCarts = await query(`
        SELECT * FROM v_carritos_abandonados
      `);

      console.log(`📊 ${abandonedCarts.length} carritos abandonados pendientes`);

      let sent = 0;
      let failed = 0;

      for (const cart of abandonedCarts) {
        const result = await this.sendAbandonedCartNotification(cart.usuario_id, cart);

        if (result.success) {
          // Marcar como notificado
          await query(
            'UPDATE carritos_abandonados_tracking SET notificado = TRUE, fecha_notificacion = NOW() WHERE id = ?',
            [cart.tracking_id]
          );
          sent++;
        } else {
          failed++;
        }
      }

      console.log(`✅ Cart reminders: ${sent} enviados, ${failed} fallidos`);

      return { success: true, sent, failed };

    } catch (error) {
      console.error('❌ Error al procesar recordatorios de carrito:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Procesar todas las notificaciones pendientes
   * @returns {Promise<object>} - Resultado del procesamiento
   */
  async processAllNotifications() {
    try {
      console.log('🚀 Iniciando procesamiento de todas las notificaciones...');

      const results = {
        stock: await this.processStockNotifications(),
        price: await this.processPriceDropNotifications(),
        cart: await this.processAbandonedCartNotifications()
      };

      console.log('✅ Procesamiento completo:', results);

      return { success: true, results };

    } catch (error) {
      console.error('❌ Error al procesar todas las notificaciones:', error);
      return { success: false, error: error.message };
    }
  }
}

// Exportar una instancia singleton del servicio
module.exports = new NotificationService();
