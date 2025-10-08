const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const ProfileController = require('../controllers/profileController');
const FavoriteController = require('../controllers/favoriteController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Middleware de autenticación para todas las rutas del perfil
router.use(authenticateToken);

// Validaciones para el perfil
const validateProfileData = [
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('URL del avatar inválida'),
  body('fechaNacimiento')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('genero')
    .optional()
    .isIn(['masculino', 'femenino', 'otro', 'no_especificar'])
    .withMessage('Género inválido'),
  body('preferenciasNotificaciones')
    .optional()
    .isObject()
    .withMessage('Preferencias de notificaciones deben ser un objeto'),
  body('configuracionPrivacidad')
    .optional()
    .isObject()
    .withMessage('Configuración de privacidad debe ser un objeto'),
  handleValidationErrors
];

const validatePersonalInfo = [
  body('fechaNacimiento')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('genero')
    .optional()
    .isIn(['masculino', 'femenino', 'otro', 'no_especificar'])
    .withMessage('Género inválido'),
  handleValidationErrors
];

const validateUserInfo = [
  body('nombreCompleto')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre completo debe tener entre 2 y 255 caracteres'),
  body('telefono')
    .optional()
    .isLength({ min: 7, max: 15 })
    .withMessage('El teléfono debe tener entre 7 y 15 caracteres'),
  body('direccion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
  handleValidationErrors
];

const validateNotificationPreferences = [
  body('email')
    .optional()
    .isBoolean()
    .withMessage('Preferencia de email debe ser booleana'),
  body('push')
    .optional()
    .isBoolean()
    .withMessage('Preferencia de push debe ser booleana'),
  body('sms')
    .optional()
    .isBoolean()
    .withMessage('Preferencia de SMS debe ser booleana'),
  body('marketing')
    .optional()
    .isBoolean()
    .withMessage('Preferencia de marketing debe ser booleana'),
  handleValidationErrors
];

const validatePrivacySettings = [
  body('profileVisibility')
    .optional()
    .isIn(['public', 'private', 'friends'])
    .withMessage('Visibilidad del perfil inválida'),
  body('orderHistory')
    .optional()
    .isBoolean()
    .withMessage('Configuración de historial de pedidos debe ser booleana'),
  body('dataSharing')
    .optional()
    .isBoolean()
    .withMessage('Configuración de compartir datos debe ser booleana'),
  handleValidationErrors
];

const validatePushToken = [
  body('push_token')
    .notEmpty()
    .withMessage('Token de push es requerido')
    .isLength({ min: 10, max: 200 })
    .withMessage('Token de push debe tener entre 10 y 200 caracteres')
    .custom((value) => {
      // Validar formato básico de token de Expo
      if (!value.startsWith('ExponentPushToken[') && !value.startsWith('ExpoPushToken[')) {
        throw new Error('Token de push debe tener formato válido de Expo');
      }
      return true;
    }),
  handleValidationErrors
];

const validateAvatar = [
  body('avatarUrl')
    .notEmpty()
    .isURL()
    .withMessage('URL del avatar es requerida y debe ser válida'),
  handleValidationErrors
];

const validateUserId = [
  param('userId')
    .isUUID()
    .withMessage('ID de usuario inválido'),
  handleValidationErrors
];

// Validaciones para favoritos
const validateAddFavorite = [
  body('producto_id')
    .notEmpty()
    .isUUID()
    .withMessage('ID de producto es requerido y debe ser válido'),
  handleValidationErrors
];

const validateProductId = [
  param('productId')
    .isUUID()
    .withMessage('ID de producto inválido'),
  handleValidationErrors
];

const validateFavoritesQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entero entre 1 y 100'),
  query('include_details')
    .optional()
    .isBoolean()
    .withMessage('include_details debe ser booleano'),
  handleValidationErrors
];

// Rutas del perfil

// Obtener perfil del usuario autenticado
router.get('/', ProfileController.getProfile);

// Crear o actualizar perfil completo
router.post('/', validateProfileData, ProfileController.createOrUpdateProfile);

// Actualizar información básica del usuario
router.put('/user-info', validateUserInfo, ProfileController.updateUserInfo);

// Actualizar avatar
router.put('/avatar', validateAvatar, ProfileController.updateAvatar);

// Actualizar información personal del perfil
router.put('/personal-info', validatePersonalInfo, ProfileController.updatePersonalInfo);

// Actualizar preferencias de notificaciones
router.put('/notifications', validateNotificationPreferences, ProfileController.updateNotificationPreferences);

// Actualizar configuración de privacidad
router.put('/privacy', validatePrivacySettings, ProfileController.updatePrivacySettings);

// Obtener estadísticas del perfil
router.get('/stats', ProfileController.getProfileStats);

// Registrar token de push para notificaciones
router.post('/push-token', validatePushToken, ProfileController.registerPushToken);

// Eliminar token de push
router.delete('/push-token', ProfileController.removePushToken);

// Eliminar perfil
router.delete('/', ProfileController.deleteProfile);

// Obtener perfil público de otro usuario
router.get('/public/:userId', validateUserId, ProfileController.getPublicProfile);

// ===== RUTAS DE FAVORITOS =====

// Obtener lista de favoritos del usuario autenticado
router.get('/favorites', validateFavoritesQuery, FavoriteController.getFavorites);

// Añadir producto a favoritos
router.post('/favorites', validateAddFavorite, FavoriteController.addFavorite);

// Eliminar producto de favoritos
router.delete('/favorites/:productId', validateProductId, FavoriteController.removeFavorite);

// Verificar si un producto está en favoritos
router.get('/favorites/check/:productId', validateProductId, FavoriteController.checkFavorite);

// Obtener estadísticas de favoritos
router.get('/favorites/stats', FavoriteController.getFavoriteStats);

// Eliminar todos los favoritos del usuario
router.delete('/favorites', FavoriteController.removeAllFavorites);

module.exports = router;
