const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { query } = require('../config/database');
const notificationService = require('../services/notificationService');

class OrderController {
  // Obtener pedidos del usuario autenticado
  static async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { estado, limit = 20, offset = 0 } = req.query;

      const orders = await Order.findByUserId(userId, {
        estado: estado || null,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        message: 'Pedidos obtenidos exitosamente',
        data: {
          orders: orders.map(order => order.toPublicObjectSimple()),
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: orders.length
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener pedidos del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener pedido específico del usuario
  static async getUserOrder(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Verificar que el pedido pertenece al usuario
      if (order.usuarioId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este pedido'
        });
      }

      res.json({
        success: true,
        message: 'Pedido obtenido exitosamente',
        data: order.toPublicObject()
      });
    } catch (error) {
      console.error('Error al obtener pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Crear pedido desde carrito
  static async createOrderFromCart(req, res) {
    try {
      const userId = req.user.id;
      const { 
        direccionEnvioId, 
        metodoPago = 'efectivo', 
        referenciaPago = null, 
        notas = null 
      } = req.body;

      // 1. OBTENER CARRITO DEL USUARIO
      const cart = await Cart.findActiveCartByUser(userId);
      
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El carrito está vacío'
        });
      }

      // 2. VALIDAR CARRITO ANTES DE CREAR PEDIDO
      const validation = await cart.validateForCheckout();
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación del carrito',
          errors: validation.errors
        });
      }

      // 3. PREPARAR DATOS PARA CREAR PEDIDO
      const orderData = {
        usuarioId: userId,
        cartId: cart.id, // Necesario para limpiar el carrito
        direccionEnvioId: direccionEnvioId || null,
        metodoPago,
        referenciaPago: referenciaPago || null,
        notas: notas || null,
        items: cart.items.map(item => ({
          productId: item.productoId,
          productName: item.productoNombre,
          productDescription: item.productoDescripcion,
          cantidad: item.cantidad, // Cambiar quantity por cantidad para coincidir con el modelo
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
          imageUrl: item.imagenPrincipal
        }))
      };

      // 4. CREAR PEDIDO DESDE CARRITO (CON TRANSACCIÓN)
      const order = await Order.createFromCart(orderData);

      // 5. RESPUESTA EXITOSA
      res.status(201).json({
        success: true,
        message: 'Pedido creado exitosamente',
        data: {
          id: order.id,
          numeroOrden: order.numeroOrden,
          estado: order.estado,
          total: order.total,
          items: order.items,
          fechaCreacion: order.fechaCreacion
        }
      });

    } catch (error) {
      console.error('Error al crear pedido:', error);
      
      // Manejar errores específicos
      if (error.message.includes('Stock insuficiente') || 
          error.message.includes('no encontrado') || 
          error.message.includes('no disponible') ||
          error.message.includes('precio ha cambiado')) {
        return res.status(400).json({
          success: false,
          message: 'Error de validación del carrito',
          error: error.message
        });
      }

      // Error interno del servidor
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error al procesar el pedido'
      });
    }
  }

  // Cancelar pedido del usuario
  static async cancelUserOrder(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Verificar que el pedido pertenece al usuario
      if (order.usuarioId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para cancelar este pedido'
        });
      }

      // Cancelar pedido
      await order.cancel(reason);

      res.json({
        success: true,
        message: 'Pedido cancelado exitosamente',
        data: order.toPublicObject()
      });
    } catch (error) {
      console.error('Error al cancelar pedido:', error);
      
      if (error.message.includes('No se puede cancelar') || error.message.includes('ya está cancelado')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener estadísticas de pedidos del usuario
  static async getUserOrderStats(req, res) {
    try {
      const userId = req.user.id;

      const stats = await Order.getStats(userId);

      res.json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          totalOrders: parseInt(stats.total_orders),
          pendingOrders: parseInt(stats.pending_orders),
          confirmedOrders: parseInt(stats.confirmed_orders),
          shippedOrders: parseInt(stats.shipped_orders),
          deliveredOrders: parseInt(stats.delivered_orders),
          cancelledOrders: parseInt(stats.cancelled_orders),
          totalSpent: parseFloat(stats.total_spent || 0),
          averageOrderValue: parseFloat(stats.average_order_value || 0)
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener todos los pedidos (admin)
  static async getAllOrders(req, res) {
    try {
      const { 
        estado, 
        usuarioId, 
        fechaDesde, 
        fechaHasta, 
        limit = 50, 
        offset = 0,
        orderBy = 'fecha_creacion',
        orderDir = 'DESC'
      } = req.query;

      let sql = `
        SELECT o.*, 
               u.email as usuario_email, u.nombre_completo as usuario_nombre
        FROM ordenes o
        LEFT JOIN usuarios u ON o.usuario_id = u.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (estado) {
        sql += ' AND o.estado = ?';
        params.push(estado);
      }
      
      if (usuarioId) {
        sql += ' AND o.usuario_id = ?';
        params.push(usuarioId);
      }
      
      if (fechaDesde) {
        sql += ' AND DATE(o.fecha_creacion) >= ?';
        params.push(fechaDesde);
      }
      
      if (fechaHasta) {
        sql += ' AND DATE(o.fecha_creacion) <= ?';
        params.push(fechaHasta);
      }
      
      sql += ` ORDER BY o.${orderBy} ${orderDir} LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const orders = await query(sql, params);
      
      const ordersWithItems = await Promise.all(orders.map(async (orderData) => {
        const items = await Order.getOrderItems(orderData.id);
        return new Order({
          ...orderData,
          usuario: {
            email: orderData.usuario_email,
            nombreCompleto: orderData.usuario_nombre
          },
          items
        }).toPublicObjectSimple();
      }));

      res.json({
        success: true,
        message: 'Pedidos obtenidos exitosamente',
        data: {
          orders: ordersWithItems,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: ordersWithItems.length
          }
        }
      });
    } catch (error) {
      console.error('Error al obtener todos los pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Actualizar estado de pedido (admin)
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { estado, notas = null } = req.body;

      const order = await Order.findById(id);
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Actualizar estado
      await order.updateStatus(estado);

      // Actualizar notas si se proporcionan
      if (notas) {
        const updateNotesSql = 'UPDATE ordenes SET notas = ?, fecha_actualizacion = NOW() WHERE id = ?';
        await query(updateNotesSql, [notas, id]);
        order.notas = notas;
      }

      res.json({
        success: true,
        message: 'Estado del pedido actualizado exitosamente',
        data: order.toPublicObject()
      });
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
      
      if (error.message.includes('Estado de pedido inválido')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener estadísticas generales (admin)
  static async getOrderStats(req, res) {
    try {
      const stats = await Order.getStats();

      res.json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: {
          totalOrders: parseInt(stats.total_orders),
          pendingOrders: parseInt(stats.pending_orders),
          confirmedOrders: parseInt(stats.confirmed_orders),
          shippedOrders: parseInt(stats.shipped_orders),
          deliveredOrders: parseInt(stats.delivered_orders),
          cancelledOrders: parseInt(stats.cancelled_orders),
          totalRevenue: parseFloat(stats.total_spent || 0),
          averageOrderValue: parseFloat(stats.average_order_value || 0)
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = OrderController;