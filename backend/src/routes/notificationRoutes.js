const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Rutas para gestión de notificaciones y suscripciones
 * Base: /api/v1/notifications
 */

// --- Suscripciones de Stock ---

// Suscribirse a notificaciones de stock de un producto
router.post(
  '/subscribe/stock/:productId',
  authenticateToken,
  notificationController.subscribeToStockAlert
);

// Cancelar suscripción de stock
router.delete(
  '/unsubscribe/stock/:productId',
  authenticateToken,
  notificationController.unsubscribeFromStockAlert
);

// --- Suscripciones de Precio ---

// Suscribirse a notificaciones de precio
router.post(
  '/subscribe/price/:productId',
  authenticateToken,
  notificationController.subscribeToPriceAlert
);

// Cancelar suscripción de precio
router.delete(
  '/unsubscribe/price/:productId',
  authenticateToken,
  notificationController.unsubscribeFromPriceAlert
);

// --- Gestión de Suscripciones ---

// Obtener todas las suscripciones del usuario
router.get(
  '/subscriptions',
  authenticateToken,
  notificationController.getUserSubscriptions
);

// Verificar suscripción a un producto específico
router.get(
  '/subscriptions/:productId',
  authenticateToken,
  notificationController.checkProductSubscription
);

// --- Historial ---

// Obtener historial de notificaciones
router.get(
  '/history',
  authenticateToken,
  notificationController.getNotificationHistory
);

// --- Admin ---

// Procesar notificaciones manualmente (solo admin)
router.post(
  '/process',
  authenticateToken,
  notificationController.processNotifications
);

module.exports = router;
