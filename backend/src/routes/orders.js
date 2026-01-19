const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const OrderController = require('../controllers/orderController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Validaciones para pedidos
const validateCreateOrder = [
  body('direccionEnvioId')
    .optional()
    .isUUID()
    .withMessage('ID de dirección de envío inválido'),
  body('metodoPago')
    .optional()
    .isIn(['efectivo', 'tarjeta', 'transferencia', 'pse'])
    .withMessage('Método de pago inválido'),
  body('referenciaPago')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Referencia de pago no puede exceder 100 caracteres'),
  body('notas')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres'),
  handleValidationErrors
];

const validateOrderId = [
  param('id')
    .isUUID()
    .withMessage('ID de pedido inválido'),
  handleValidationErrors
];

const validateCancelOrder = [
  param('id')
    .isUUID()
    .withMessage('ID de pedido inválido'),
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Razón de cancelación no puede exceder 200 caracteres'),
  handleValidationErrors
];

const validateUpdateStatus = [
  param('id')
    .isUUID()
    .withMessage('ID de pedido inválido'),
  body('estado')
    .isIn(['pendiente', 'confirmada', 'en_proceso', 'enviada', 'entregada', 'cancelada', 'reembolsada'])
    .withMessage('Estado de pedido inválido'),
  body('notas')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres'),
  handleValidationErrors
];

const validateCreateOrderFromCart = [
  body('direccionEnvioId')
    .optional()
    .isUUID()
    .withMessage('ID de dirección de envío inválido'),
  body('metodoPago')
    .optional()
    .isIn(['efectivo', 'tarjeta', 'transferencia', 'pse'])
    .withMessage('Método de pago inválido'),
  body('referenciaPago')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Referencia de pago no puede exceder 100 caracteres'),
  body('notas')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres'),
  handleValidationErrors
];

const validateUpdateOrderStatus = [
  param('id')
    .isUUID()
    .withMessage('ID de pedido inválido'),
  body('estado')
    .isIn(['pendiente', 'confirmada', 'en_proceso', 'enviada', 'entregada', 'cancelada', 'reembolsada'])
    .withMessage('Estado de pedido inválido'),
  body('notas')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres'),
  handleValidationErrors
];

const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entre 1 y 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset debe ser un número no negativo'),
  query('estado')
    .optional()
    .isIn(['pendiente', 'confirmada', 'en_proceso', 'enviada', 'entregada', 'cancelada', 'reembolsada'])
    .withMessage('Estado de pedido inválido'),
  handleValidationErrors
];

// Rutas públicas (sin autenticación)
// Ninguna ruta de pedidos es pública

// Rutas de usuario autenticado
router.use(authenticateToken);

// Obtener pedidos del usuario autenticado
router.get('/my-orders', validatePagination, OrderController.getUserOrders);

// Obtener estadísticas de pedidos del usuario
router.get('/my-stats', OrderController.getUserOrderStats);

// Obtener pedido específico del usuario
router.get('/my-orders/:id', validateOrderId, OrderController.getUserOrder);

// Calcular costo de envío
router.post('/calcular-costo-envio', OrderController.calcularCostoEnvio);

// Crear pedido desde carrito
router.post('/create-from-cart', validateCreateOrderFromCart, handleValidationErrors, OrderController.createOrderFromCart);

// Cancelar pedido del usuario
router.put('/my-orders/:id/cancel', validateCancelOrder, handleValidationErrors, OrderController.cancelUserOrder);

// Rutas de administrador
router.use(authorize('admin'));

// Obtener todos los pedidos (admin)
router.get('/', validatePagination, OrderController.getAllOrders);

// Obtener estadísticas generales (admin)
router.get('/stats', OrderController.getOrderStats);

// Obtener pedido específico (admin) - debe ir antes de /:id/status
router.get('/:id', validateOrderId, OrderController.getOrderById);

// Actualizar estado de pedido (admin)
router.put('/:id/status', validateUpdateOrderStatus, handleValidationErrors, OrderController.updateOrderStatus);

module.exports = router;