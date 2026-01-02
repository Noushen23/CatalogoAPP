const express = require('express');
const deliveryController = require('../controllers/deliveryController');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);



// Rutas de entregas (repartidor)
router.get('/entregas', authorize('admin', 'moderator', 'repartidor'), deliveryController.obtenerMisEntregas);
router.get('/entregas/:id', authorize('admin', 'moderator', 'repartidor'), deliveryController.obtenerEntrega);
router.post('/entregas/:id/iniciar', authorize('admin', 'moderator', 'repartidor'), deliveryController.iniciarEntrega);
router.post('/entregas/:id/llegada', authorize('admin', 'moderator', 'repartidor'), deliveryController.registrarLlegada);
router.post('/entregas/:id/completar', authorize('admin', 'moderator', 'repartidor'), deliveryController.completarEntrega);
router.post('/entregas/:id/cancelar', authorize('admin', 'moderator', 'repartidor'), deliveryController.cancelarEntrega);


// Rutas de mapas (todos los roles autenticados)
router.get('/mapas/coordenadas', authorize('admin', 'moderator', 'repartidor'), deliveryController.obtenerCoordenadas);
router.post('/mapas/ruta', authorize('admin', 'moderator', 'repartidor'), deliveryController.calcularRuta);

// Rutas de asignación de pedidos a repartidores (solo admin y moderator)
// Nota: La gestión completa de repartidores está en /api/repartidores
router.post('/pedidos/asignar-repartidor', authorize('admin', 'moderator'), deliveryController.asignarPedidoARepartidor);

// Obtener todos los pedidos asignados (vista administrativa)
router.get('/pedidos/asignados', authorize('admin', 'moderator'), deliveryController.obtenerTodosPedidosAsignados);

// Rutas de gestión de estado de pedidos (solo admin y moderator)
router.post('/pedidos/marcar-montado-carro', authorize('admin', 'moderator'), deliveryController.marcarPedidoMontadoAlCarro);
router.post('/pedidos/verificar-estado-proceso', authorize('admin', 'moderator'), deliveryController.verificarYActualizarEstadoEnProceso);

module.exports = router;


