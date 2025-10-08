const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const ShippingAddressController = require('../controllers/shippingAddressController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Validaciones para direcciones de envío
const validateCreateAddress = [
  body('nombreDestinatario')
    .notEmpty()
    .withMessage('El nombre del destinatario es requerido')
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre del destinatario debe tener entre 2 y 255 caracteres'),
  body('telefono')
    .optional()
    .isLength({ min: 10, max: 20 })
    .withMessage('El teléfono debe tener entre 10 y 20 caracteres'),
  body('direccion')
    .notEmpty()
    .withMessage('La dirección es requerida')
    .isLength({ min: 5, max: 500 })
    .withMessage('La dirección debe tener entre 5 y 500 caracteres'),
  body('ciudad')
    .notEmpty()
    .withMessage('La ciudad es requerida')
    .isLength({ min: 2, max: 100 })
    .withMessage('La ciudad debe tener entre 2 y 100 caracteres'),
  body('departamento')
    .notEmpty()
    .withMessage('El departamento es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El departamento debe tener entre 2 y 100 caracteres'),
  body('codigoPostal')
    .optional()
    .isLength({ max: 20 })
    .withMessage('El código postal no puede exceder 20 caracteres'),
  body('pais')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El país no puede exceder 100 caracteres'),
  body('esPrincipal')
    .optional()
    .isBoolean()
    .withMessage('esPrincipal debe ser un valor booleano'),
  handleValidationErrors
];

const validateUpdateAddress = [
  param('id')
    .isUUID()
    .withMessage('ID de dirección inválido'),
  body('nombreDestinatario')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre del destinatario debe tener entre 2 y 255 caracteres'),
  body('telefono')
    .optional()
    .isLength({ min: 10, max: 20 })
    .withMessage('El teléfono debe tener entre 10 y 20 caracteres'),
  body('direccion')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('La dirección debe tener entre 5 y 500 caracteres'),
  body('ciudad')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('La ciudad debe tener entre 2 y 100 caracteres'),
  body('departamento')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El departamento debe tener entre 2 y 100 caracteres'),
  body('codigoPostal')
    .optional()
    .isLength({ max: 20 })
    .withMessage('El código postal no puede exceder 20 caracteres'),
  body('pais')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El país no puede exceder 100 caracteres'),
  body('esPrincipal')
    .optional()
    .isBoolean()
    .withMessage('esPrincipal debe ser un valor booleano'),
  body('activa')
    .optional()
    .isBoolean()
    .withMessage('activa debe ser un valor booleano'),
  handleValidationErrors
];

const validateAddressId = [
  param('id')
    .isUUID()
    .withMessage('ID de dirección inválido'),
  handleValidationErrors
];

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener direcciones del usuario autenticado
router.get('/', ShippingAddressController.getUserAddresses);

// Obtener dirección principal del usuario
router.get('/primary', ShippingAddressController.getPrimaryAddress);

// Obtener dirección específica del usuario
router.get('/:id', validateAddressId, ShippingAddressController.getUserAddress);

// Crear nueva dirección de envío
router.post('/', validateCreateAddress, ShippingAddressController.createAddress);

// Actualizar dirección de envío
router.put('/:id', validateUpdateAddress, ShippingAddressController.updateAddress);

// Eliminar dirección de envío
router.delete('/:id', validateAddressId, ShippingAddressController.deleteAddress);

// Establecer dirección como principal
router.put('/:id/set-primary', validateAddressId, ShippingAddressController.setPrimaryAddress);

module.exports = router;






















