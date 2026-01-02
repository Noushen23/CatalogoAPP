const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware para manejar errores de validación
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: errors.array()
    });
  }
  next();
};

// Validaciones para autenticación
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('nombreCompleto')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Nombre completo debe tener entre 2 y 255 caracteres'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  body('telefono')
    .optional()
    .isLength({ min: 7, max: 15 })
    .withMessage('Teléfono debe tener entre 7 y 15 caracteres')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Teléfono solo puede contener números, espacios, guiones, paréntesis y signo +'),
  body('direccion')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Dirección no puede exceder 500 caracteres'),
  body('tipo_identificacion')
    .optional()
    .isIn(['CC', 'NIT', 'CE', 'TR'])
    .withMessage('Tipo de identificación inválido. Valores permitidos: CC, NIT, CE, PAS.'),
  body('numero_identificacion')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Número de identificación debe tener entre 5 y 20 caracteres')
    .matches(/^[a-zA-Z0-9\-]+$/).withMessage('Número de identificación contiene caracteres inválidos.'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('Contraseña requerida'),
  handleValidationErrors
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual requerida'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nueva contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nueva contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  handleValidationErrors
];

// Validaciones para productos
const validateProduct = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Nombre debe tener entre 2 y 255 caracteres'),
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Descripción no puede exceder 1000 caracteres'),
  body('precio')
    .isFloat({ min: 0 })
    .withMessage('Precio debe ser un número positivo'),
  body('precioOferta')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Precio de oferta debe ser un número positivo'),
  body('categoriaId')
    .optional()
    .isUUID()
    .withMessage('ID de categoría inválido'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock debe ser un número entero no negativo'),
  body('stockMinimo')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock mínimo debe ser un número entero no negativo'),
  body('peso')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Peso debe ser un número positivo'),
  body('codigoBarras')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Código de barras no puede exceder 50 caracteres'),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('SKU no puede exceder 100 caracteres'),
  body('tipo_identificacion')
    .optional()
    .isIn(['CC', 'NIT', 'CE', 'TR'])
    .withMessage('Tipo de identificación inválido. Valores permitidos: CC, NIT, CE, TR.'),
  body('numero_identificacion')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('Número de identificación debe tener entre 5 y 20 caracteres')
    .matches(/^[a-zA-Z0-9\-]+$/).withMessage('Número de identificación contiene caracteres inválidos.'),
  handleValidationErrors
];

const validateProductId = [
  param('id')
    .isUUID()
    .withMessage('ID de producto inválido'),
  handleValidationErrors
];

// Validación específica para productId en rutas de reseñas
const validateReviewProductId = [
  param('productId')
    .isUUID()
    .withMessage('ID de producto inválido'),
  handleValidationErrors
];

const validateStockUpdate = [
  param('id')
    .isUUID()
    .withMessage('ID de producto inválido'),
  body('cantidad')
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser un número entero positivo'),
  body('operacion')
    .optional()
    .isIn(['suma', 'resta'])
    .withMessage('Operación debe ser "suma" o "resta"'),
  handleValidationErrors
];

// Validaciones para categorías
const validateCategory = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Nombre debe tener entre 2 y 255 caracteres'),
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descripción no puede exceder 500 caracteres'),
  body('imagenUrl')
    .optional()
    .custom((value) => {
      // Permitir URLs válidas, datos base64 de imagen, o null/string vacío
      if (value === null || value === '') {
        return true;
      }
      if (typeof value === 'string') {
        // Si es una URL válida
        if (value.startsWith('http://') || value.startsWith('https://')) {
          return true;
        }
        // Si es un data URL de imagen (base64)
        if (value.startsWith('data:image/')) {
          return true;
        }
        // Si es una ruta local de imagen
        if (value.startsWith('/uploads/')) {
          return true;
        }
      }
      return false;
    })
    .withMessage('URL de imagen inválida o formato de imagen no soportado'),
  body('orden')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Orden debe ser un número entero no negativo'),
  body('activa')
    .optional()
    .isBoolean()
    .withMessage('Activa debe ser un valor booleano'),
  handleValidationErrors
];

// Validación para actualización parcial de categorías
const validateCategoryUpdate = [
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Nombre debe tener entre 2 y 255 caracteres'),
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descripción no puede exceder 500 caracteres'),
  body('imagenUrl')
    .optional()
    .custom((value) => {
      // Permitir URLs válidas, datos base64 de imagen, o null/string vacío
      if (value === null || value === '') {
        return true;
      }
      if (typeof value === 'string') {
        // Si es una URL válida
        if (value.startsWith('http://') || value.startsWith('https://')) {
          return true;
        }
        // Si es un data URL de imagen (base64)
        if (value.startsWith('data:image/')) {
          return true;
        }
        // Si es una ruta local de imagen
        if (value.startsWith('/uploads/')) {
          return true;
        }
      }
      return false;
    })
    .withMessage('URL de imagen inválida o formato de imagen no soportado'),
  body('orden')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Orden debe ser un número entero no negativo'),
  body('activa')
    .optional()
    .isBoolean()
    .withMessage('Activa debe ser un valor booleano'),
  handleValidationErrors
];

// Validación para cambio de estado de categoría
const validateCategoryStatus = [
  body('activa')
    .isBoolean()
    .withMessage('El campo activa es requerido y debe ser un valor booleano'),
  handleValidationErrors
];

// Validación para reordenar categorías
const validateCategoryReorder = [
  body('categoryOrders')
    .isArray({ min: 1 })
    .withMessage('categoryOrders debe ser un array con al menos un elemento'),
  body('categoryOrders.*.id')
    .isUUID()
    .withMessage('ID de categoría inválido'),
  body('categoryOrders.*.orden')
    .isInt({ min: 0 })
    .withMessage('Orden debe ser un número entero no negativo'),
  handleValidationErrors
];

const validateCategoryId = [
  param('id')
    .isUUID()
    .withMessage('ID de categoría inválido'),
  handleValidationErrors
];

// Validaciones para consultas
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entre 1 y 100'),
  query('orderBy')
    .optional()
    .isIn(['fecha_creacion', 'nombre', 'precio', 'stock'])
    .withMessage('Campo de ordenamiento inválido'),
  query('orderDir')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Dirección de ordenamiento debe ser ASC o DESC'),
  handleValidationErrors
];

const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Término de búsqueda debe tener entre 1 y 100 caracteres'),
  ...validatePagination
];

// Validaciones para reseñas
const validateReview = [
  body('calificacion')
    .isInt({ min: 1, max: 5 })
    .withMessage('La calificación debe ser un número entero entre 1 y 5'),
  body('comentario')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('El comentario no puede exceder 1000 caracteres'),
  body('ordenId')
    .optional()
    .isUUID()
    .withMessage('ID de orden inválido'),
  handleValidationErrors
];

const validateReviewId = [
  param('reviewId')
    .isUUID()
    .withMessage('ID de reseña inválido'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateProduct,
  validateProductId,
  validateReviewProductId,
  validateStockUpdate,
  validateCategory,
  validateCategoryUpdate,
  validateCategoryStatus,
  validateCategoryReorder,
  validateCategoryId,
  validatePagination,
  validateSearch,
  validateReview,
  validateReviewId
};
