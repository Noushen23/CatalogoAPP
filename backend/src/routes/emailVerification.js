const express = require('express');
const router = express.Router();
const emailVerificationController = require('../controllers/emailVerificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * Rutas para verificación de email
 * Base: /api/v1/auth
 */

// Reenviar código de verificación
// POST /api/v1/auth/resend-verification
router.post('/resend-verification', authMiddleware, emailVerificationController.resendVerificationEmail);

// Verificar email con código
// POST /api/v1/auth/verify-email
router.post('/verify-email', authMiddleware, emailVerificationController.verifyEmail);

// Obtener estado de verificación
// GET /api/v1/auth/verification-status
router.get('/verification-status', authMiddleware, emailVerificationController.getVerificationStatus);

module.exports = router;








