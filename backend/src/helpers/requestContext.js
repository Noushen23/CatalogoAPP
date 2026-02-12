const { AsyncLocalStorage } = require('async_hooks');

// Almacén de contexto por request para acceder a datos sin pasar req explícitamente
const requestContext = new AsyncLocalStorage();

/**
 * Construye el baseUrl usando los headers del request (host/proto).
 * Esto permite devolver URLs correctas según el origen del cliente.
 */
const getBaseUrlFromRequest = (req) => {
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  if (!host) {
    return null;
  }

  const proto =
    req?.headers?.['x-forwarded-proto'] ||
    req?.protocol ||
    'http';

  return `${proto}://${host}`;
};

/**
 * Middleware para guardar el contexto del request.
 * Se usa AsyncLocalStorage para que cualquier helper pueda leer baseUrl.
 */
const requestContextMiddleware = (req, res, next) => {
  const baseUrl = getBaseUrlFromRequest(req);

  requestContext.run({ baseUrl }, () => {
    next();
  });
};

/**
 * Lee el baseUrl del contexto actual (si existe).
 */
const getRequestBaseUrl = () => {
  const store = requestContext.getStore();
  return store?.baseUrl || null;
};

module.exports = {
  requestContextMiddleware,
  getRequestBaseUrl,
  getBaseUrlFromRequest
};
