const { body } = require('express-validator');

/**
 * Validador para crear pedido desde carrito
 */
const validateCreateOrderFromCart = [
  body('direccionEnvioId')
    .optional()
    .isUUID()
    .withMessage('ID de dirección de envío debe ser un UUID válido'),
  
  body('metodoPago')
    .optional()
    .isIn(['efectivo', 'tarjeta', 'transferencia', 'pse'])
    .withMessage('Método de pago debe ser uno de: efectivo, tarjeta, transferencia, pse'),
  
  body('referenciaPago')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Referencia de pago no puede exceder 100 caracteres')
    .trim(),
  
  body('notas')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
    .trim()
];

/**
 * Validador para cancelar pedido
 */
const validateCancelOrder = [
  body('reason')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Razón de cancelación no puede exceder 200 caracteres')
    .trim()
];

/**
 * Validador para actualizar estado de pedido (admin)
 */
const validateUpdateOrderStatus = [
  body('estado')
    .isIn(['pendiente', 'confirmada', 'en_proceso', 'enviada', 'entregada', 'cancelada', 'reembolsada'])
    .withMessage('Estado debe ser uno de: pendiente, confirmada, en_proceso, enviada, entregada, cancelada, reembolsada'),
  
  body('notas')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
    .trim()
];

module.exports = {
  validateCreateOrderFromCart,
  validateCancelOrder,
  validateUpdateOrderStatus
};













