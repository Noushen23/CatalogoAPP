const Order = require('../../models/Order');

class OrderStatsController {
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

module.exports = OrderStatsController;
