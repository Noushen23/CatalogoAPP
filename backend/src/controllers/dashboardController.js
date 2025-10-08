const { query } = require('../config/database');
const notificationService = require('../services/notificationService');

class DashboardController {
  /**
   * Obtener estadísticas del dashboard para administradores
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async getDashboardStats(req, res) {
    try {
      console.log('📊 Obteniendo estadísticas del dashboard...');

      // Ejecutar todas las consultas en paralelo para mejor rendimiento
      const [
        salesStats,
        userStats,
        productStats,
        recentOrders,
        topProducts,
        weeklySales,
        monthlySales
      ] = await Promise.all([
        getSalesStatistics(),
        getUserStatistics(),
        getProductStatistics(),
        getRecentOrders(),
        getTopProducts(),
        getWeeklySalesData(),
        getMonthlySalesData()
      ]);

      const dashboardData = {
        overview: {
          totalRevenue: salesStats.total_revenue || 0,
          totalOrders: salesStats.total_orders || 0,
          averageOrderValue: salesStats.average_order_value || 0,
          newUsersThisWeek: userStats.new_users_week || 0,
          newUsersThisMonth: userStats.new_users_month || 0,
          totalUsers: userStats.total_users || 0,
          totalProducts: productStats.total_products || 0,
          lowStockProducts: productStats.low_stock_products || 0,
          outOfStockProducts: productStats.out_of_stock_products || 0
        },
        charts: {
          weeklySales: weeklySales,
          monthlySales: monthlySales
        },
        recentOrders: recentOrders,
        topProducts: topProducts,
        generatedAt: new Date().toISOString()
      };

      console.log('✅ Estadísticas del dashboard obtenidas exitosamente');

      res.json({
        success: true,
        message: 'Estadísticas del dashboard obtenidas exitosamente',
        data: dashboardData
      });

    } catch (error) {
      console.error('❌ Error al obtener estadísticas del dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * Obtener métricas de rendimiento del sistema
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async getSystemMetrics(req, res) {
    try {
      console.log('⚡ Obteniendo métricas del sistema...');

      const [
        activeUsers,
        pendingOrders,
        systemHealth
      ] = await Promise.all([
        getActiveUsersCount(),
        getPendingOrdersCount(),
        getSystemHealthMetrics()
      ]);

      const metrics = {
        performance: {
          activeUsers: activeUsers,
          pendingOrders: pendingOrders,
          systemHealth: systemHealth
        },
        generatedAt: new Date().toISOString()
      };

      console.log('✅ Métricas del sistema obtenidas exitosamente');

      res.json({
        success: true,
        message: 'Métricas del sistema obtenidas exitosamente',
        data: metrics
      });

    } catch (error) {
      console.error('❌ Error al obtener métricas del sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

// Funciones auxiliares para obtener estadísticas

/**
 * Obtener estadísticas de ventas
 */
async function getSalesStatistics() {
  try {
    const salesQuery = `
      SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(AVG(total), 0) as average_order_value
      FROM ordenes 
      WHERE estado != 'cancelada' 
      AND estado != 'cancelado'
    `;

    const [result] = await query(salesQuery);
    return result;

  } catch (error) {
    console.error('Error al obtener estadísticas de ventas:', error);
    return { total_revenue: 0, total_orders: 0, average_order_value: 0 };
  }
}

/**
 * Obtener estadísticas de usuarios
 */
async function getUserStatistics() {
  try {
    const userQuery = `
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN fecha_creacion >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as new_users_week,
        SUM(CASE WHEN fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_users_month
      FROM usuarios 
      WHERE rol = 'user'
    `;

    const [result] = await query(userQuery);
    return result;

  } catch (error) {
    console.error('Error al obtener estadísticas de usuarios:', error);
    return { total_users: 0, new_users_week: 0, new_users_month: 0 };
  }
}

/**
 * Obtener estadísticas de productos
 */
async function getProductStatistics() {
  try {
    const productQuery = `
      SELECT 
        COUNT(*) as total_products,
        SUM(CASE WHEN stock <= 10 AND stock > 0 THEN 1 ELSE 0 END) as low_stock_products,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock_products
      FROM productos 
      WHERE activo = 1
    `;

    const [result] = await query(productQuery);
    return result;

  } catch (error) {
    console.error('Error al obtener estadísticas de productos:', error);
    return { total_products: 0, low_stock_products: 0, out_of_stock_products: 0 };
  }
}

/**
 * Obtener pedidos recientes
 */
async function getRecentOrders(limit = 10) {
  try {
    const recentOrdersQuery = `
      SELECT 
        o.id,
        o.numero_orden,
        o.total,
        o.estado,
        o.fecha_creacion,
        u.nombre_completo as customer_name,
        u.email as customer_email
      FROM ordenes o
      JOIN usuarios u ON o.usuario_id = u.id
      ORDER BY o.fecha_creacion DESC
      LIMIT ?
    `;

    const results = await query(recentOrdersQuery, [limit]);
    return results.map(order => ({
      id: order.id,
      numeroOrden: order.numero_orden,
      total: parseFloat(order.total),
      estado: order.estado,
      fechaCreacion: order.fecha_creacion,
      customerName: order.customer_name,
      customerEmail: order.customer_email
    }));

  } catch (error) {
    console.error('Error al obtener pedidos recientes:', error);
    return [];
  }
}

/**
 * Obtener productos más vendidos
 */
async function getTopProducts(limit = 10) {
  try {
    const topProductsQuery = `
      SELECT 
        p.id,
        p.nombre,
        p.precio,
        p.stock,
        SUM(oi.cantidad) as total_sold,
        SUM(oi.cantidad * p.precio) as total_revenue
      FROM productos p
      JOIN items_orden oi ON p.id = oi.producto_id
      JOIN ordenes o ON oi.orden_id = o.id
      WHERE o.estado != 'cancelada' 
      AND o.estado != 'cancelado'
      AND p.activo = 1
      GROUP BY p.id, p.nombre, p.precio, p.stock
      ORDER BY total_sold DESC
      LIMIT ?
    `;

    const results = await query(topProductsQuery, [limit]);
    return results.map(product => ({
      id: product.id,
      nombre: product.nombre,
      precio: parseFloat(product.precio),
      stock: product.stock,
      totalSold: parseInt(product.total_sold),
      totalRevenue: parseFloat(product.total_revenue)
    }));

  } catch (error) {
    console.error('Error al obtener productos más vendidos:', error);
    return [];
  }
}

/**
 * Obtener datos de ventas semanales
 */
async function getWeeklySalesData() {
  try {
    const weeklySalesQuery = `
      SELECT 
        DATE(fecha_creacion) as date,
        COUNT(*) as orders_count,
        COALESCE(SUM(total), 0) as revenue
      FROM ordenes 
      WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND estado != 'cancelada' 
      AND estado != 'cancelado'
      GROUP BY DATE(fecha_creacion)
      ORDER BY date ASC
    `;

    const results = await query(weeklySalesQuery);
    
    // Crear array de 7 días, llenando con 0 los días sin ventas
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = results.find(r => r.date.toISOString().split('T')[0] === dateStr);
      last7Days.push({
        date: dateStr,
        orders: dayData ? parseInt(dayData.orders_count) : 0,
        revenue: dayData ? parseFloat(dayData.revenue) : 0
      });
    }

    return last7Days;

  } catch (error) {
    console.error('Error al obtener datos de ventas semanales:', error);
    return [];
  }
}

/**
 * Obtener datos de ventas mensuales
 */
async function getMonthlySalesData() {
  try {
    const monthlySalesQuery = `
      SELECT 
        DATE_FORMAT(fecha_creacion, '%Y-%m') as month,
        COUNT(*) as orders_count,
        COALESCE(SUM(total), 0) as revenue
      FROM ordenes 
      WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      AND estado != 'cancelada' 
      AND estado != 'cancelado'
      GROUP BY DATE_FORMAT(fecha_creacion, '%Y-%m')
      ORDER BY month ASC
    `;

    const results = await query(monthlySalesQuery);
    return results.map(month => ({
      month: month.month,
      orders: parseInt(month.orders_count),
      revenue: parseFloat(month.revenue)
    }));

  } catch (error) {
    console.error('Error al obtener datos de ventas mensuales:', error);
    return [];
  }
}

/**
 * Obtener conteo de usuarios activos
 */
async function getActiveUsersCount() {
  try {
    const activeUsersQuery = `
      SELECT COUNT(*) as count
      FROM usuarios 
      WHERE fecha_actualizacion >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      AND rol = 'user'
    `;

    const [result] = await query(activeUsersQuery);
    return parseInt(result.count);

  } catch (error) {
    console.error('Error al obtener usuarios activos:', error);
    return 0;
  }
}

/**
 * Obtener conteo de pedidos pendientes
 */
async function getPendingOrdersCount() {
  try {
    const pendingOrdersQuery = `
      SELECT COUNT(*) as count
      FROM ordenes 
      WHERE estado IN ('pendiente', 'confirmada', 'en_proceso')
    `;

    const [result] = await query(pendingOrdersQuery);
    return parseInt(result.count);

  } catch (error) {
    console.error('Error al obtener pedidos pendientes:', error);
    return 0;
  }
}

/**
 * Obtener métricas de salud del sistema
 */
async function getSystemHealthMetrics() {
  try {
    // Verificar conexión a la base de datos
    const dbHealth = await query('SELECT 1 as health');
    const dbStatus = dbHealth.length > 0 ? 'healthy' : 'unhealthy';

    // Verificar servicio de notificaciones
    const notificationTokens = await notificationService.getAllPushTokens();
    const notificationStatus = notificationTokens.length > 0 ? 'active' : 'inactive';

    return {
      database: dbStatus,
      notifications: notificationStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error al obtener métricas de salud:', error);
    return {
      database: 'unhealthy',
      notifications: 'inactive',
      uptime: 0,
      memory: {},
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = DashboardController;
