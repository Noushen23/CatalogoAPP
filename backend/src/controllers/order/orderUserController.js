const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const CheckoutService = require('../../services/pagos/checkoutService');
const notificationService = require('../../services/notificationService');
const { query } = require('../../config/database');
const { getPriceListByCity } = require('../../utils/shippingCost');
const { v4: uuidv4 } = require('uuid');

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
      const userId = req.user.id;
      const { subtotal, direccionEnvioId, ciudadEnvio } = req.body;

      if (subtotal == null || subtotal < 0) {
        return res.status(400).json({ success: false, message: 'Subtotal inválido' });
      }

      // Resolver ciudad desde la dirección guardada o usar la enviada directamente
      let ciudad = ciudadEnvio || null;
      if (!ciudad && direccionEnvioId) {
        const direcciones = await query(
          'SELECT ciudad FROM direcciones_envio WHERE id = ? AND usuario_id = ? AND activa = true',
          [direccionEnvioId, userId]
        );
        ciudad = direcciones?.[0]?.ciudad || null;
      }

      // Calcular costo con lista de precios por ciudad (fallback a lista 5)
      const costoEnvio = await Order.calcularCostoEnvio(Number(subtotal), ciudad);
      const listaPrecio = getPriceListByCity(ciudad);

      res.json({
        success: true,
        data: {
          subtotal: Number(subtotal),
          costoEnvio,
          total: Number(subtotal) + costoEnvio,
          ciudad: ciudad,
          listaPrecio,
          envioGratis: costoEnvio === 0
        }
      });
    } catch {
      res.status(500).json({ success: false, message: 'Error al calcular envío' });
    }
  }

  /* =====================================================
   * INICIAR CHECKOUT (CREA PEDIDO PENDIENTE DE PAGO)
   * ===================================================== */
  static async createOrderFromCart(req, res) {
    let pedidoCreado = null;
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

      // Generar referencia única compatible con Wompi (máximo 40 caracteres)
      const transaccionId = uuidv4();
      const transaccionIdCorto = transaccionId.replace(/-/g, '').substring(0, 8);
      const timestamp = Date.now();
      const referencia = `PED-${transaccionIdCorto}-${timestamp}`;

      if (referencia.length > 40) {
        throw new Error(`Referencia excede el límite de Wompi: ${referencia}`);
      }

      // Mapear items al formato esperado por la orden
      const orderItems = cart.items.map(item => ({
        productId: item.productoId || item.productId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal
      }));

      // Crear pedido desde el inicio con estado pendiente
      pedidoCreado = await Order.createFromCart({
        usuarioId: userId,
        cartId: cart.id,
        direccionEnvioId,
        metodoPago,
        referenciaPago: referencia,
        notas,
        items: orderItems,
        estado: 'pendiente'
      });

      /* 🔐 Crear intención de checkout */
      const intent = await CheckoutService.crearIntencion({
        referenciaPago: referencia,
        usuarioId: userId,
        carritoId: cart.id,
        direccionEnvioId,
        metodoPago,
        notas,
        datosCarrito: { items: orderItems },
        datosUsuario: { id: userId },
        datosEnvio: null
      });

      res.status(201).json({
        success: true,
        message: 'Checkout iniciado',
        data: {
          checkoutIntentId: intent.id,
          estado: intent.estado,
          pedidoId: pedidoCreado.id,
          numeroOrden: pedidoCreado.numeroOrden,
          referenciaPago: referencia
        }
      });

    } catch (error) {
      if (pedidoCreado?.id) {
        try {
          await Order.markPaymentFailed(pedidoCreado.id, 'Error al iniciar el checkout');
        } catch (cleanupError) {
          console.error('❌ [Order] Error al revertir pedido tras fallo de checkout:', cleanupError);
        }
      }
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

      if (order.estado === 'cancelada') {
        return res.json({
          success: true,
          data: order.toPublicObject()
        });
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
