// ============================================
// MÓDULO DE ASESOR - COMENTADO (NO EN USO)
// ============================================

const express = require('express');


const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);



module.exports = router;


