const express = require('express');
const repartidoresController = require('../controllers/repartidoresController');
const deliveryController = require('../controllers/deliveryController');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ============================================
// RUTAS DE CONSULTA DE REPARTIDORES (Admin/Moderator)
// ============================================

// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas dinámicas (/:id)

// Obtener lista de repartidores con filtros y paginación
router.get('/', authorize('admin', 'moderator'), repartidoresController.obtenerRepartidores);

// Obtener estadísticas de repartidores
router.get('/estadisticas', authorize('admin', 'moderator'), repartidoresController.obtenerEstadisticas);

// Obtener historial de pedidos asignados por repartidor
router.get('/historial', authorize('admin', 'moderator'), repartidoresController.obtenerHistorialPedidos);

// Obtener repartidores disponibles (para asignación de pedidos)
router.get('/disponibles', authorize('admin', 'moderator'), deliveryController.obtenerRepartidoresDisponibles);

// Obtener un repartidor por ID (debe ir al final para no interceptar rutas específicas)
router.get('/:id', authorize('admin', 'moderator'), repartidoresController.obtenerRepartidorPorId);

module.exports = router;

