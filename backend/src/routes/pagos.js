const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const PagoController = require('../controllers/pagoController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Validaciones para crear transacción
// NOTA: NO se requiere pedidoId - el pedido se creará cuando el pago sea aprobado
const validateCrearTransaccion = [
  body('metodoPago')
    .optional()
    .isIn(['wompi'])
    .withMessage('Método de pago inválido. Solo se permite Wompi'),
  body('direccionEnvioId')
    .optional()
    .isUUID()
    .withMessage('ID de dirección de envío inválido'),
  body('notas')
    .optional()
    .isString()
    .withMessage('Las notas deben ser una cadena de texto'),
  handleValidationErrors
];

// Validaciones para consultar transacción
const validateConsultarTransaccion = [
  param('idTransaccion')
    .notEmpty()
    .withMessage('ID de transacción es requerido'),
  handleValidationErrors
];

// Validaciones para reintentar pago
const validateReintentarPago = [
  param('pedidoId')
    .isUUID()
    .withMessage('ID de pedido inválido'),
  handleValidationErrors
];

/**
 * @route   POST /api/v1/pagos/webhook
 * @desc    Procesar webhook de Wompi (NO requiere autenticación, usa firma)
 * @access  Public (validado por firma de Wompi)
 */
router.post('/webhook', PagoController.procesarWebhook);

/**
 * @route   GET /api/v1/pagos/debug-public-key
 * @desc    Endpoint temporal de debug para validar la clave pública de Wompi (SIN autenticación)
 * @access  Public (solo para debugging)
 */
router.get('/debug-public-key', PagoController.debugPublicKey);

// Rutas privadas (requieren autenticación)
router.use(authenticateToken);

/**
 * @route   POST /api/v1/pagos/crear
 * @desc    Crear una transacción de pago para un pedido
 * @access  Private (Usuario autenticado)
 */
router.post('/crear', validateCrearTransaccion, PagoController.crearTransaccion);

/**
 * @route   POST /api/v1/pagos/reintentar/:pedidoId
 * @desc    Reintentar el pago de un pedido cancelado por pago fallido
 * @access  Private (Usuario autenticado)
 */
router.post('/reintentar/:pedidoId', validateReintentarPago, PagoController.reintentarPago);

/**
 * @route   GET /api/v1/pagos/consultar/:idTransaccion
 * @desc    Consultar el estado de una transacción de pago
 * @access  Private (Usuario autenticado)
 */
router.get('/consultar/:idTransaccion', validateConsultarTransaccion, PagoController.consultarTransaccion);

/**
 * @route   GET /api/v1/pagos/configuracion
 * @desc    Obtener configuración pública de Wompi (para frontend)
 * @access  Private (Usuario autenticado)
 */
router.get('/configuracion', PagoController.obtenerConfiguracion);

/**
 * @route   GET /api/v1/pagos/tiempo-restante/:pedidoId
 * @desc    Verificar tiempo restante para completar el pago de un pedido
 * @access  Private (Usuario autenticado)
 */
router.get('/tiempo-restante/:pedidoId', PagoController.verificarTiempoRestante);

module.exports = router;
