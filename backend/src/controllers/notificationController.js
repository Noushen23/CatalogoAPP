const { query } = require('../config/database');
const notificationService = require('../services/notificationService');

/**
 * Controlador para gestionar notificaciones y suscripciones
 */
class NotificationController {
  /**
   * Suscribirse a notificaciones de stock de un producto
   * POST /api/v1/notifications/subscribe/stock/:productId
   */
  async subscribeToStockAlert(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      // Verificar que el producto existe
      const [product] = await query(
        'SELECT id, nombre, stock FROM productos WHERE id = ? AND activo = TRUE',
        [productId]
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Si el producto ya tiene stock, no tiene sentido suscribirse
      if (product.stock > 0) {
        return res.status(400).json({
          success: false,
          message: 'El producto ya está disponible en stock'
        });
      }

      // Verificar si ya existe una suscripción activa
      const [existing] = await query(
        'SELECT id, activa FROM notificaciones_stock WHERE usuario_id = ? AND producto_id = ?',
        [userId, productId]
      );

      if (existing) {
        if (existing.activa) {
          return res.status(400).json({
            success: false,
            message: 'Ya estás suscrito a las notificaciones de este producto'
          });
        } else {
          // Reactivar suscripción existente
          await query(
            'UPDATE notificaciones_stock SET activa = TRUE, notificado = FALSE WHERE id = ?',
            [existing.id]
          );

          return res.status(200).json({
            success: true,
            message: 'Suscripción reactivada exitosamente',
            data: {
              subscriptionId: existing.id,
              productId,
              productName: product.nombre
            }
          });
        }
      }

      // Crear nueva suscripción
      const subscriptionId = require('crypto').randomUUID();
      await query(
        `INSERT INTO notificaciones_stock (id, usuario_id, producto_id, activa, notificado)
         VALUES (?, ?, ?, TRUE, FALSE)`,
        [subscriptionId, userId, productId]
      );

      console.log(`✅ Usuario ${userId} suscrito a notificaciones de stock del producto ${productId}`);

      return res.status(201).json({
        success: true,
        message: 'Te notificaremos cuando este producto esté disponible',
        data: {
          subscriptionId,
          productId,
          productName: product.nombre
        }
      });

    } catch (error) {
      console.error('❌ Error al suscribirse a notificaciones de stock:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la suscripción',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cancelar suscripción a notificaciones de stock
   * DELETE /api/v1/notifications/unsubscribe/stock/:productId
   */
  async unsubscribeFromStockAlert(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      const result = await query(
        'UPDATE notificaciones_stock SET activa = FALSE WHERE usuario_id = ? AND producto_id = ?',
        [userId, productId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró suscripción activa'
        });
      }

      console.log(`✅ Usuario ${userId} canceló suscripción de stock del producto ${productId}`);

      return res.status(200).json({
        success: true,
        message: 'Suscripción cancelada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al cancelar suscripción de stock:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cancelar la suscripción',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Suscribirse a notificaciones de baja de precio
   * POST /api/v1/notifications/subscribe/price/:productId
   */
  async subscribeToPriceAlert(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;
      const { targetPrice } = req.body;

      // Validar precio objetivo
      if (!targetPrice || targetPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Debes especificar un precio objetivo válido'
        });
      }

      // Verificar que el producto existe
      const [product] = await query(
        'SELECT id, nombre, precio FROM productos WHERE id = ? AND activo = TRUE',
        [productId]
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Validar que el precio objetivo sea menor al actual
      if (targetPrice >= product.precio) {
        return res.status(400).json({
          success: false,
          message: `El precio objetivo debe ser menor al precio actual ($${product.precio.toLocaleString()})`
        });
      }

      // Verificar si ya existe una suscripción activa
      const [existing] = await query(
        'SELECT id, activa FROM notificaciones_precio WHERE usuario_id = ? AND producto_id = ?',
        [userId, productId]
      );

      if (existing) {
        if (existing.activa) {
          // Actualizar precio objetivo
          await query(
            `UPDATE notificaciones_precio 
             SET precio_objetivo = ?, precio_original = ?, notificado = FALSE 
             WHERE id = ?`,
            [targetPrice, product.precio, existing.id]
          );

          return res.status(200).json({
            success: true,
            message: 'Alerta de precio actualizada exitosamente',
            data: {
              subscriptionId: existing.id,
              productId,
              productName: product.nombre,
              currentPrice: product.precio,
              targetPrice
            }
          });
        } else {
          // Reactivar suscripción
          await query(
            `UPDATE notificaciones_precio 
             SET activa = TRUE, precio_objetivo = ?, precio_original = ?, notificado = FALSE 
             WHERE id = ?`,
            [targetPrice, product.precio, existing.id]
          );

          return res.status(200).json({
            success: true,
            message: 'Suscripción reactivada exitosamente',
            data: {
              subscriptionId: existing.id,
              productId,
              productName: product.nombre,
              currentPrice: product.precio,
              targetPrice
            }
          });
        }
      }

      // Crear nueva suscripción
      const subscriptionId = require('crypto').randomUUID();
      await query(
        `INSERT INTO notificaciones_precio 
         (id, usuario_id, producto_id, precio_objetivo, precio_original, activa, notificado)
         VALUES (?, ?, ?, ?, ?, TRUE, FALSE)`,
        [subscriptionId, userId, productId, targetPrice, product.precio]
      );

      console.log(`✅ Usuario ${userId} suscrito a alertas de precio del producto ${productId}`);

      return res.status(201).json({
        success: true,
        message: `Te notificaremos cuando el precio baje a $${targetPrice.toLocaleString()} o menos`,
        data: {
          subscriptionId,
          productId,
          productName: product.nombre,
          currentPrice: product.precio,
          targetPrice
        }
      });

    } catch (error) {
      console.error('❌ Error al suscribirse a alertas de precio:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la suscripción',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cancelar suscripción a notificaciones de precio
   * DELETE /api/v1/notifications/unsubscribe/price/:productId
   */
  async unsubscribeFromPriceAlert(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      const result = await query(
        'UPDATE notificaciones_precio SET activa = FALSE WHERE usuario_id = ? AND producto_id = ?',
        [userId, productId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró suscripción activa'
        });
      }

      console.log(`✅ Usuario ${userId} canceló suscripción de precio del producto ${productId}`);

      return res.status(200).json({
        success: true,
        message: 'Suscripción cancelada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error al cancelar suscripción de precio:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cancelar la suscripción',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener todas las suscripciones del usuario
   * GET /api/v1/notifications/subscriptions
   */
  async getUserSubscriptions(req, res) {
    try {
      const userId = req.user.id;

      // Obtener suscripciones de stock
      const stockSubscriptions = await query(`
        SELECT 
          ns.id,
          ns.producto_id,
          p.nombre as producto_nombre,
          p.precio,
          p.stock,
          ns.fecha_creacion,
          'stock' as tipo
        FROM notificaciones_stock ns
        INNER JOIN productos p ON ns.producto_id = p.id
        WHERE ns.usuario_id = ? AND ns.activa = TRUE
        ORDER BY ns.fecha_creacion DESC
      `, [userId]);

      // Obtener suscripciones de precio
      const priceSubscriptions = await query(`
        SELECT 
          np.id,
          np.producto_id,
          p.nombre as producto_nombre,
          p.precio as precio_actual,
          np.precio_objetivo,
          np.precio_original,
          np.fecha_creacion,
          'price' as tipo
        FROM notificaciones_precio np
        INNER JOIN productos p ON np.producto_id = p.id
        WHERE np.usuario_id = ? AND np.activa = TRUE
        ORDER BY np.fecha_creacion DESC
      `, [userId]);

      return res.status(200).json({
        success: true,
        data: {
          stockAlerts: stockSubscriptions.map(s => ({
            id: s.id,
            productId: s.producto_id,
            productName: s.producto_nombre,
            currentPrice: s.precio,
            currentStock: s.stock,
            createdAt: s.fecha_creacion,
            type: 'stock'
          })),
          priceAlerts: priceSubscriptions.map(s => ({
            id: s.id,
            productId: s.producto_id,
            productName: s.producto_nombre,
            currentPrice: s.precio_actual,
            targetPrice: s.precio_objetivo,
            originalPrice: s.precio_original,
            createdAt: s.fecha_creacion,
            type: 'price'
          })),
          total: stockSubscriptions.length + priceSubscriptions.length
        }
      });

    } catch (error) {
      console.error('❌ Error al obtener suscripciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener suscripciones',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Verificar si el usuario está suscrito a un producto
   * GET /api/v1/notifications/subscriptions/:productId
   */
  async checkProductSubscription(req, res) {
    try {
      const userId = req.user.id;
      const { productId } = req.params;

      const [stockSub] = await query(
        'SELECT id FROM notificaciones_stock WHERE usuario_id = ? AND producto_id = ? AND activa = TRUE',
        [userId, productId]
      );

      const [priceSub] = await query(
        'SELECT id, precio_objetivo FROM notificaciones_precio WHERE usuario_id = ? AND producto_id = ? AND activa = TRUE',
        [userId, productId]
      );

      return res.status(200).json({
        success: true,
        data: {
          subscribedToStock: !!stockSub,
          subscribedToPrice: !!priceSub,
          targetPrice: priceSub?.precio_objetivo || null
        }
      });

    } catch (error) {
      console.error('❌ Error al verificar suscripción:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar suscripción',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Obtener historial de notificaciones del usuario
   * GET /api/v1/notifications/history
   */
  async getNotificationHistory(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      const notifications = await query(`
        SELECT 
          id,
          tipo_notificacion,
          titulo,
          mensaje,
          datos_adicionales,
          exitosa,
          fecha_envio
        FROM historial_notificaciones
        WHERE usuario_id = ?
        ORDER BY fecha_envio DESC
        LIMIT ? OFFSET ?
      `, [userId, parseInt(limit), parseInt(offset)]);

      const [countResult] = await query(
        'SELECT COUNT(*) as total FROM historial_notificaciones WHERE usuario_id = ?',
        [userId]
      );

      return res.status(200).json({
        success: true,
        data: {
          notifications: notifications.map(n => ({
            id: n.id,
            type: n.tipo_notificacion,
            title: n.titulo,
            message: n.mensaje,
            data: n.datos_adicionales ? JSON.parse(n.datos_adicionales) : null,
            success: !!n.exitosa,
            sentAt: n.fecha_envio
          })),
          pagination: {
            total: countResult.total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + parseInt(limit)) < countResult.total
          }
        }
      });

    } catch (error) {
      console.error('❌ Error al obtener historial de notificaciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener historial',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Procesar todas las notificaciones pendientes (endpoint admin)
   * POST /api/v1/notifications/process
   */
  async processNotifications(req, res) {
    try {
      // Verificar que el usuario sea admin
      if (req.user.rol !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción'
        });
      }

      console.log('🚀 Procesando notificaciones manualmente...');
      const result = await notificationService.processAllNotifications();

      return res.status(200).json({
        success: true,
        message: 'Notificaciones procesadas exitosamente',
        data: result
      });

    } catch (error) {
      console.error('❌ Error al procesar notificaciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar notificaciones',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new NotificationController();
