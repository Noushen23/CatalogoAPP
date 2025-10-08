const cron = require('node-cron');
const notificationService = require('../services/notificationService');
const { query } = require('../config/database');

/**
 * Worker para procesar notificaciones automáticamente
 * Ejecuta tareas programadas para enviar notificaciones push
 */
class NotificationWorker {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Iniciar todos los workers
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Workers de notificaciones ya están ejecutándose');
      return;
    }

    console.log('🚀 Iniciando workers de notificaciones...');

    // Job 1: Procesar notificaciones de stock cada 15 minutos
    const stockJob = cron.schedule('*/15 * * * *', async () => {
      try {
        console.log('🔄 [CRON] Procesando notificaciones de stock...');
        const result = await notificationService.processStockNotifications();
        console.log(`✅ [CRON] Stock notifications: ${result.sent} enviadas, ${result.failed} fallidas`);
      } catch (error) {
        console.error('❌ [CRON] Error en job de stock:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/Bogota" // Ajusta según tu zona horaria
    });

    // Job 2: Procesar notificaciones de precio cada 30 minutos
    const priceJob = cron.schedule('*/30 * * * *', async () => {
      try {
        console.log('🔄 [CRON] Procesando notificaciones de precio...');
        const result = await notificationService.processPriceDropNotifications();
        console.log(`✅ [CRON] Price notifications: ${result.sent} enviadas, ${result.failed} fallidas`);
      } catch (error) {
        console.error('❌ [CRON] Error en job de precio:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/Bogota"
    });

    // Job 3: Procesar carritos abandonados cada 2 horas
    const cartJob = cron.schedule('0 */2 * * *', async () => {
      try {
        console.log('🔄 [CRON] Procesando carritos abandonados...');
        const result = await notificationService.processAbandonedCartNotifications();
        console.log(`✅ [CRON] Cart reminders: ${result.sent} enviados, ${result.failed} fallidos`);
      } catch (error) {
        console.error('❌ [CRON] Error en job de carritos:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/Bogota"
    });

    // Job 4: Limpiar notificaciones antiguas del historial (diariamente a las 3 AM)
    const cleanupJob = cron.schedule('0 3 * * *', async () => {
      try {
        console.log('🔄 [CRON] Limpiando historial de notificaciones antiguas...');
        await this.cleanupOldNotifications();
        console.log('✅ [CRON] Limpieza de historial completada');
      } catch (error) {
        console.error('❌ [CRON] Error en job de limpieza:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/Bogota"
    });

    // Job 5: Resetear suscripciones notificadas (diariamente a las 4 AM)
    // Esto permite que si un producto vuelve a agotarse y luego vuelve a stock,
    // se notifique nuevamente
    const resetJob = cron.schedule('0 4 * * *', async () => {
      try {
        console.log('🔄 [CRON] Reseteando suscripciones antiguas...');
        await this.resetOldSubscriptions();
        console.log('✅ [CRON] Reset de suscripciones completado');
      } catch (error) {
        console.error('❌ [CRON] Error en job de reset:', error);
      }
    }, {
      scheduled: true,
      timezone: "America/Bogota"
    });

    this.jobs = [stockJob, priceJob, cartJob, cleanupJob, resetJob];
    this.isRunning = true;

    console.log('✅ Workers de notificaciones iniciados:');
    console.log('   📦 Stock: cada 15 minutos');
    console.log('   💰 Precio: cada 30 minutos');
    console.log('   🛒 Carritos: cada 2 horas');
    console.log('   🧹 Limpieza: diaria a las 3 AM');
    console.log('   🔄 Reset: diario a las 4 AM');
  }

  /**
   * Detener todos los workers
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Workers de notificaciones no están ejecutándose');
      return;
    }

    console.log('🛑 Deteniendo workers de notificaciones...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('✅ Workers de notificaciones detenidos');
  }

  /**
   * Limpiar notificaciones antiguas del historial (mayores a 90 días)
   */
  async cleanupOldNotifications() {
    try {
      const result = await query(`
        DELETE FROM historial_notificaciones
        WHERE fecha_envio < DATE_SUB(NOW(), INTERVAL 90 DAY)
      `);

      console.log(`🧹 Eliminadas ${result.affectedRows} notificaciones antiguas del historial`);
      return { deleted: result.affectedRows };

    } catch (error) {
      console.error('❌ Error al limpiar notificaciones:', error);
      throw error;
    }
  }

  /**
   * Resetear suscripciones que fueron notificadas hace más de 7 días
   * Esto permite volver a notificar si el patrón se repite
   */
  async resetOldSubscriptions() {
    try {
      // Resetear suscripciones de stock que fueron notificadas hace más de 7 días
      // y el producto está nuevamente sin stock
      const stockResult = await query(`
        UPDATE notificaciones_stock ns
        INNER JOIN productos p ON ns.producto_id = p.id
        SET ns.notificado = FALSE
        WHERE ns.notificado = TRUE
          AND ns.fecha_notificacion < DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND p.stock = 0
          AND p.activo = TRUE
      `);

      // Resetear suscripciones de precio que fueron notificadas hace más de 7 días
      // y el precio volvió a subir por encima del objetivo
      const priceResult = await query(`
        UPDATE notificaciones_precio np
        INNER JOIN productos p ON np.producto_id = p.id
        SET np.notificado = FALSE, np.precio_original = p.precio
        WHERE np.notificado = TRUE
          AND np.fecha_notificacion < DATE_SUB(NOW(), INTERVAL 7 DAY)
          AND p.precio > np.precio_objetivo
          AND p.activo = TRUE
      `);

      console.log(`🔄 Reseteadas ${stockResult.affectedRows} suscripciones de stock y ${priceResult.affectedRows} de precio`);
      
      return {
        stockReset: stockResult.affectedRows,
        priceReset: priceResult.affectedRows
      };

    } catch (error) {
      console.error('❌ Error al resetear suscripciones:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  async getStats() {
    try {
      const [stockStats] = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN notificado = TRUE THEN 1 ELSE 0 END) as notificadas,
          SUM(CASE WHEN activa = TRUE THEN 1 ELSE 0 END) as activas
        FROM notificaciones_stock
      `);

      const [priceStats] = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN notificado = TRUE THEN 1 ELSE 0 END) as notificadas,
          SUM(CASE WHEN activa = TRUE THEN 1 ELSE 0 END) as activas
        FROM notificaciones_precio
      `);

      const [cartStats] = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN notificado = TRUE THEN 1 ELSE 0 END) as notificados
        FROM carritos_abandonados_tracking
      `);

      const [historyStats] = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN exitosa = TRUE THEN 1 ELSE 0 END) as exitosas,
          SUM(CASE WHEN exitosa = FALSE THEN 1 ELSE 0 END) as fallidas
        FROM historial_notificaciones
        WHERE fecha_envio >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      return {
        stock: stockStats,
        price: priceStats,
        cart: cartStats,
        history: historyStats,
        workerStatus: {
          isRunning: this.isRunning,
          activeJobs: this.jobs.length
        }
      };

    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * Ejecutar un proceso manual de todas las notificaciones
   */
  async runManualProcess() {
    console.log('🔧 Ejecutando proceso manual de notificaciones...');
    
    try {
      const result = await notificationService.processAllNotifications();
      console.log('✅ Proceso manual completado:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en proceso manual:', error);
      throw error;
    }
  }
}

// Exportar una instancia singleton
const worker = new NotificationWorker();

module.exports = worker;
