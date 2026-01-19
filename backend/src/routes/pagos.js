const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const PagoController = require('../controllers/pagoController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Validaciones para crear transacción
const validateCrearTransaccion = [
  body('pedidoId')
    .notEmpty()
    .withMessage('El ID del pedido es requerido')
    .isUUID()
    .withMessage('ID de pedido inválido'),
  body('metodoPago')
    .notEmpty()
    .withMessage('El método de pago es requerido')
    .isIn(['tarjeta', 'pse', 'nequi', 'bancolombia_transfer'])
    .withMessage('Método de pago inválido'),
  body('datosTarjeta')
    .optional()
    .isObject()
    .withMessage('Datos de tarjeta deben ser un objeto'),
  body('datosTarjeta.tokenTarjeta')
    .if(body('metodoPago').equals('tarjeta'))
    .notEmpty()
    .withMessage('Token de tarjeta es requerido para pagos con tarjeta'),
  body('datosPSE')
    .optional()
    .isObject()
    .withMessage('Datos PSE deben ser un objeto'),
  body('datosPSE.banco')
    .if(body('metodoPago').equals('pse'))
    .notEmpty()
    .withMessage('Banco es requerido para pagos PSE'),
  body('datosPSE.tipoPersona')
    .if(body('metodoPago').equals('pse'))
    .isIn(['PERSON', 'COMPANY'])
    .withMessage('Tipo de persona debe ser PERSON o COMPANY'),
  body('urlRedireccion')
    .optional()
    .isURL()
    .withMessage('URL de redirección inválida'),
  body('urlRedireccionError')
    .optional()
    .isURL()
    .withMessage('URL de redirección de error inválida'),
  handleValidationErrors
];

// Validaciones para consultar transacción
const validateConsultarTransaccion = [
  param('idTransaccion')
    .notEmpty()
    .withMessage('ID de transacción es requerido'),
  handleValidationErrors
];

// Todas las rutas requieren autenticación
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
 * @route   POST /api/v1/pagos/webhook
 * @desc    Procesar webhook de Wompi (NO requiere autenticación, usa firma)
 * @access  Public (validado por firma de Wompi)
 */
router.post('/webhook', PagoController.procesarWebhook);

module.exports = router;
