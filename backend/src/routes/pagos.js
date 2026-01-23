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
    .notEmpty()
    .withMessage('El método de pago es requerido')
    .isIn(['tarjeta', 'pse', 'nequi', 'bancolombia_transfer'])
    .withMessage('Método de pago inválido'),
  body('direccionEnvioId')
    .optional()
    .isUUID()
    .withMessage('ID de dirección de envío inválido'),
  body('notas')
    .optional()
    .isString()
    .withMessage('Las notas deben ser una cadena de texto'),
  // Web Checkout: datos* son opcionales y solo sirven para pre-llenar información (customer-data)
  body('datosPSE')
    .optional()
    .isObject()
    .withMessage('Datos PSE deben ser un objeto'),
  body('datosPSE.numeroIdentificacion')
    .optional()
    .isString()
    .withMessage('Número de identificación debe ser una cadena de texto'),
  body('datosPSE.descripcionPago')
    .optional()
    .isString()
    .isLength({ max: 30 })
    .withMessage('Descripción de pago no puede exceder 30 caracteres'),
  body('datosNequi')
    .optional()
    .isObject()
    .withMessage('Datos Nequi deben ser un objeto'),
  body('datosNequi.telefono')
    .optional()
    .isString()
    .withMessage('Teléfono debe ser una cadena de texto'),
  body('datosBancolombia')
    .optional()
    .isObject()
    .withMessage('Datos Bancolombia deben ser un objeto'),
  body('datosBancolombia.descripcionPago')
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage('Descripción de pago no puede exceder 64 caracteres'),
  handleValidationErrors
];

// Validaciones para consultar transacción
const validateConsultarTransaccion = [
  param('idTransaccion')
    .notEmpty()
    .withMessage('ID de transacción es requerido'),
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
 * @route   GET /api/v1/pagos/consultar/:idTransaccion
 * @desc    Consultar el estado de una transacción de pago
 * @access  Private (Usuario autenticado)
 */
router.get('/consultar/:idTransaccion', validateConsultarTransaccion, PagoController.consultarTransaccion);

/**
 * @route   GET /api/v1/pagos/bancos-pse
 * @desc    Obtener lista de bancos disponibles para PSE
 * @access  Private (Usuario autenticado)
 */
router.get('/bancos-pse', PagoController.obtenerBancosPSE);

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
