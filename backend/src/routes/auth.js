const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const emailVerificationController = require('../controllers/emailVerificationController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegister, validateLogin, validateChangePassword } = require('../middleware/validation');

// Rutas públicas
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// Rutas protegidas
router.get('/status', authenticateToken, AuthController.getStatus);
router.post('/logout', authenticateToken, AuthController.logout);
router.post('/change-password', authenticateToken, validateChangePassword, AuthController.changePassword);

// Rutas de verificación de email
router.get('/verification-status', authenticateToken, emailVerificationController.getVerificationStatus);
router.post('/verify-email', authenticateToken, emailVerificationController.verifyEmail);
router.post('/resend-verification', authenticateToken, emailVerificationController.resendVerificationEmail);

module.exports = router;
