/**
 * Middleware de autenticación para ApiPedidoVenta
 * 
 * NOTA: ApiPedidoVenta NO utiliza autenticación JWT.
 * Las rutas son públicas y no requieren token.
 * 
 * Este archivo se mantiene por compatibilidad pero no se usa actualmente.
 * Si en el futuro se requiere autenticación, se puede implementar aquí.
 */

// Middleware vacío - no hace nada, solo pasa la petición
const optionalAuth = (req, res, next) => {
  // No se verifica token, se permite acceso directo
  req.user = null;
  next();
};

// Middleware de autenticación requerida - no implementado
const authenticateToken = (req, res, next) => {
  // No se requiere autenticación en ApiPedidoVenta
  next();
};

// Middleware de autorización - no implementado
const authorize = (...roles) => {
  return (req, res, next) => {
    // No se verifica roles en ApiPedidoVenta
    next();
  };
};

module.exports = {
  authenticateToken,
  authorize,
  optionalAuth
};

