const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const CartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Middleware de autenticación para todas las rutas del carrito
router.use(authenticateToken);

// Validaciones para el carrito
const validateAddItem = [
  body('productId')
    .isUUID()
    .withMessage('ID de producto inválido'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero mayor a 0'),
  handleValidationErrors
];

const validateUpdateItem = [
  param('itemId')
    .isUUID()
    .withMessage('ID de item inválido'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero mayor a 0'),
  handleValidationErrors
];

const validateItemId = [
  param('itemId')
    .isUUID()
    .withMessage('ID de item inválido'),
  handleValidationErrors
];

const validateCartHistory = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Límite debe ser un número entre 1 y 50'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset debe ser un número no negativo'),
  handleValidationErrors
];

// Obtener carrito del usuario
router.get('/', CartController.getCart);

// Obtener resumen del carrito
router.get('/summary', CartController.getCartSummary);

// Validar carrito para checkout
router.get('/validate', CartController.validateCart);

// Obtener historial de carritos
router.get('/history', validateCartHistory, CartController.getCartHistory);

// Agregar producto al carrito
router.post('/items', validateAddItem, CartController.addItem);

// Actualizar cantidad de un item
router.put('/items/:itemId', validateUpdateItem, CartController.updateItemQuantity);

// Eliminar item del carrito
router.delete('/items/:itemId', validateItemId, CartController.removeItem);

// Limpiar carrito completo
router.delete('/clear', CartController.clearCart);

module.exports = router;
