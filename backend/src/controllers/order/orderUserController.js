const Order = require('../../models/Order');
const Cart = require('../../models/Cart');

const { query } = require('../../config/database');
const notificationService = require('../../services/notificationService');

class OrderUserController {
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

      console.log('📦 [getUserOrder] Obteniendo pedido:', id, 'para usuario:', userId);

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

      console.log('✅ [getUserOrder] Pedido obtenido - Estado:', order.estado, 'ID:', id);

      const orderData = order.toPublicObject();
      console.log('📋 [getUserOrder] Datos enviados - Estado:', orderData.estado);

      res.json({
        success: true,
        message: 'Pedido obtenido exitosamente',
        data: orderData
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

  // Calcular costo de envío
  static async calcularCostoEnvio(req, res) {
    try {
      const userId = req.user.id;
      const { subtotal, direccionEnvioId } = req.body;

      if (!subtotal || subtotal < 0) {
        return res.status(400).json({
          success: false,
          message: 'El subtotal es requerido y debe ser mayor o igual a 0'
        });
      }

      let ciudadEnvio = null;
      if (direccionEnvioId) {
        const direccionesSql = `
          SELECT ciudad 
          FROM direcciones_envio 
          WHERE id = ? AND usuario_id = ? AND activa = true
        `;
        const direcciones = await query(direccionesSql, [direccionEnvioId, userId]);
        
        if (direcciones.length > 0) {
          ciudadEnvio = direcciones[0].ciudad;
        }
      }

      const costoEnvio = Order.calcularCostoEnvio(parseFloat(subtotal), ciudadEnvio);
      
      // Determinar zona para información adicional
      let zona = 'Resto';
      if (ciudadEnvio) {
        const ciudadNormalizada = ciudadEnvio.toLowerCase().trim();
        if (['cúcuta', 'cucuta'].includes(ciudadNormalizada)) {
          zona = 'Zona Urbana (Cúcuta)';
        } else if (['el zulia', 'san cayetano', 'villa del rosario', 'villa del rosario de cúcuta'].includes(ciudadNormalizada)) {
          zona = 'Municipios Cercanos';
        }
      }

      res.json({
        success: true,
        data: {
          mensaje: 'El costo de envío se ha calculado exitosamente',
          costoEnvio,
          subtotal: parseFloat(subtotal),
          total: parseFloat(subtotal) + costoEnvio,
          zona: ciudadEnvio ? zona : 'No especificada',
          ciudad: ciudadEnvio || null,
          envioGratis: parseFloat(subtotal) >= 300000
        }
      });
    } catch (error) {
      console.error('Error al calcular costo de envío:', error);
      res.status(500).json({
        success: false,
        message: 'Error al calcular el costo de envío',
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
        metodoPago, 
        referenciaPago = null, 
        notas = null 
      } = req.body;

      // Validar que se proporcione un método de pago válido de Wompi
      const metodosPermitidos = ['tarjeta', 'pse', 'nequi', 'bancolombia_transfer'];
      if (!metodoPago || !metodosPermitidos.includes(metodoPago.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Método de pago inválido. Métodos permitidos: ${metodosPermitidos.join(', ')}`
        });
      }

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

      // 5. ENVIAR NOTIFICACIÓN DE PEDIDO CREADO
      try {
        await notificationService.sendOrderStatusUpdateNotification(
          userId,
          {
            id: order.id,
            numeroOrden: order.numeroOrden
          },
          'pendiente'
        );
        
        // Registrar en historial
        await notificationService.logNotification(
          userId,
          'order_status_update',
          '⏳ Estado del pedido actualizado',
          `Tu pedido #${order.numeroOrden} está siendo procesado`,
          {
            type: 'order_status_update',
            orderId: order.id,
            orderNumber: order.numeroOrden,
            newStatus: 'pendiente',
            timestamp: new Date().toISOString()
          },
          true
        );
      } catch (notifError) {
        console.error('⚠️ Error al enviar notificación de pedido creado:', notifError);
        // No fallar la creación del pedido si falla la notificación
      }

      // 6. RESPUESTA EXITOSA
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

      // Verificar que el pedido esté en estado 'pendiente' antes de intentar cancelar
      if (order.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: `No se puede cancelar el pedido. Solo se pueden cancelar pedidos en estado 'pendiente'. El pedido actual está en estado '${order.estado}'.`
        });
      }

      // Cancelar pedido y restaurar stock
      await order.cancel(reason, true); // true = restaurar stock

      res.json({
        success: true,
        message: 'Pedido cancelado exitosamente',
        data: order.toPublicObject()
      });
    } catch (error) {
      console.error('Error al cancelar pedido:', error);
      
      if (error.message.includes('No se puede cancelar') || 
          error.message.includes('ya está cancelado') ||
          error.message.includes('Solo se pueden cancelar')) {
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
}

module.exports = OrderUserController;
