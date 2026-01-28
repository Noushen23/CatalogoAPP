const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const CheckoutService = require('../../services/checkoutService');
const notificationService = require('../../services/notificationService');

class OrderUserController {

  /* =====================================================
   * OBTENER PEDIDOS DEL USUARIO
   * ===================================================== */
  static async getUserOrders(req, res) {
    try {
      const userId = req.user.id;
      const { estado, limit = 20, offset = 0 } = req.query;

      const orders = await Order.findByUserId(userId, {
        estado: estado || null,
        limit: Number(limit),
        offset: Number(offset)
      });

      res.json({
        success: true,
        data: {
          orders: orders.map(o => o.toPublicObjectSimple()),
          pagination: {
            limit: Number(limit),
            offset: Number(offset),
            total: orders.length
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /* =====================================================
   * OBTENER PEDIDO ESPECÍFICO
   * ===================================================== */
  static async getUserOrder(req, res) {
    try {
      const userId = req.user.id;
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
      }

      if (order.usuarioId !== userId) {
        return res.status(403).json({ success: false, message: 'Acceso denegado' });
      }

      res.json({
        success: true,
        data: order.toPublicObject()
      });
    } catch {
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  /* =====================================================
   * OBTENER PEDIDO POR REFERENCIA DE PAGO
   * ===================================================== */
  static async getUserOrderByReference(req, res) {
    try {
      const userId = req.user.id;
      const referencia = req.query.referencia;

      if (!referencia) {
        return res.status(400).json({
          success: false,
          message: 'Referencia requerida'
        });
      }

      const order = await Order.findByReference(referencia, userId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      return res.json({
        success: true,
        data: order.toPublicObject()
      });
    } catch (error) {
      console.error('Error al obtener pedido por referencia:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /* =====================================================
   * CALCULAR COSTO DE ENVÍO (OK)
   * ===================================================== */
  static async calcularCostoEnvio(req, res) {
    try {
      const { subtotal } = req.body;

      if (subtotal == null || subtotal < 0) {
        return res.status(400).json({ success: false, message: 'Subtotal inválido' });
      }

      const costoEnvio = Order.calcularCostoEnvio(Number(subtotal));

      res.json({
        success: true,
        data: {
          subtotal: Number(subtotal),
          costoEnvio,
          total: Number(subtotal) + costoEnvio,
          envioGratis: Number(subtotal) >= 300000
        }
      });
    } catch {
      res.status(500).json({ success: false, message: 'Error al calcular envío' });
    }
  }

  /* =====================================================
   * INICIAR CHECKOUT (NO CREA PEDIDO)
   * ===================================================== */
  static async createOrderFromCart(req, res) {
    try {
      const userId = req.user.id;
      const { direccionEnvioId, metodoPago, notas } = req.body;

      const cart = await Cart.findActiveCartByUser(userId);
      if (!cart || !cart.items.length) {
        return res.status(400).json({ success: false, message: 'Carrito vacío' });
      }

      const validation = await cart.validateForCheckout();
      if (!validation.isValid) {
        return res.status(400).json({ success: false, errors: validation.errors });
      }

      /* 🔐 Crear intención de checkout */
      const intent = await CheckoutService.crearIntencion({
        referenciaPago: null,
        usuarioId: userId,
        carritoId: cart.id,
        direccionEnvioId,
        metodoPago,
        notas,
        datosCarrito: { items: cart.items },
        datosUsuario: { id: userId },
        datosEnvio: null
      });

      res.status(201).json({
        success: true,
        message: 'Checkout iniciado',
        data: {
          checkoutIntentId: intent.id,
          estado: intent.estado
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al iniciar checkout'
      });
    }
  }

  /* =====================================================
   * CANCELAR PEDIDO
   * ===================================================== */
  static async cancelUserOrder(req, res) {
    try {
      const userId = req.user.id;
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
      }

      if (order.usuarioId !== userId) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }

      if (order.estado !== 'pendiente') {
        return res.status(400).json({ success: false, message: 'Pedido no cancelable' });
      }

      await order.cancel(req.body.reason, true);

      res.json({
        success: true,
        data: order.toPublicObject()
      });
    } catch {
      res.status(500).json({ success: false, message: 'Error al cancelar pedido' });
    }
  }
}

module.exports = OrderUserController;
