const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Middleware de autenticación y autorización para todas las rutas
router.use(authenticateToken);
router.use(authorize('admin'));

// Ruta para obtener estadísticas del dashboard
router.get('/stats', DashboardController.getDashboardStats);

// Ruta para obtener métricas del sistema
router.get('/metrics', DashboardController.getSystemMetrics);

module.exports = router;
