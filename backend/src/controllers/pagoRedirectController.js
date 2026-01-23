const wompiService = require('../services/pagos/wompiService');
const { query } = require('../config/database');

/**
 * Controlador para páginas de redirección de pagos
 * 
 * Maneja las redirecciones después de que Wompi procesa un pago.
 * Estas páginas intentan abrir la app móvil usando deep links.
 */
class PagoRedirectController {
  /**
   * Página de pago exitoso
   * GET /pago-exitoso
   * Wompi redirige aquí después de una transacción exitosa con el parámetro 'id' de la transacción
   * Ejemplo: /pago-exitoso?id=01-1531231271-19365
   */
  static async pagoExitoso(req, res) {
    try {
      const { referencia, id } = req.query;
      
      console.log('✅ [Pago Redirect] Pago exitoso:', { referencia, id });

      // Si hay un ID de transacción (Wompi siempre lo envía), consultar el estado
      let estadoTransaccion = null;
      let pedidoId = null;
      
      if (id) {
        // Wompi envía el ID de la transacción como parámetro 'id'
        console.log('🔍 [Pago Redirect] Consultando transacción en Wompi con ID:', id);
        
        const resultado = await wompiService.consultarTransaccion(id);
        if (resultado.exito) {
          estadoTransaccion = resultado.datos.estado;
          
          // Buscar el pedido asociado usando la referencia de la transacción
          if (resultado.datos.referencia) {
            const pedidoSql = `
              SELECT id, estado, numero_orden
              FROM ordenes
              WHERE referencia_pago = ?
            `;
            const pedidos = await query(pedidoSql, [resultado.datos.referencia]);
            if (pedidos.length > 0) {
              pedidoId = pedidos[0].id;
              
              // NOTA: No actualizamos el pedido aquí - el webhook es la fuente de verdad
              // Esta redirección es solo informativa para el usuario
              // El webhook de Wompi se encargará de actualizar el estado del pedido
              console.log('ℹ️ [Pago Redirect] Estado de transacción consultado (webhook actualizará el pedido):', estadoTransaccion);
            }
          }
        } else {
          console.warn('⚠️ [Pago Redirect] No se pudo consultar la transacción en Wompi:', resultado.error);
        }
      } else if (referencia) {
        // Fallback: buscar pedido por referencia si no hay ID
        const pedidoSql = `
          SELECT id, estado, numero_orden
          FROM ordenes
          WHERE referencia_pago = ?
        `;
        const pedidos = await query(pedidoSql, [referencia]);
        if (pedidos.length > 0) {
          pedidoId = pedidos[0].id;
        }
      }

      // Deep link para abrir la app
      const deepLink = pedidoId 
        ? `tienda-bomberos://pago-exitoso?pedido=${pedidoId}`
        : `tienda-bomberos://pago-exitoso${referencia ? `?referencia=${referencia}` : ''}`;

      // HTML con intento de abrir la app y fallback
      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pago Exitoso</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        .success-icon {
            width: 80px;
            height: 80px;
            background: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .success-icon::after {
            content: '✓';
            color: white;
            font-size: 50px;
            font-weight: bold;
        }
        h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 28px;
        }
        p {
            color: #6b7280;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .info {
            background: #f3f4f6;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: left;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .info-label {
            color: #6b7280;
            font-weight: 500;
        }
        .info-value {
            color: #1f2937;
            font-weight: 600;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 28px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            transition: background 0.3s;
            margin-top: 10px;
        }
        .button:hover {
            background: #5568d3;
        }
        .loading {
            color: #6b7280;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
    <script>
        // Intentar abrir la app inmediatamente
        const deepLink = '${deepLink}';
        const fallbackUrl = 'https://play.google.com/store/apps/details?id=com.tienda.bomberos';
        
        // Intentar abrir la app
        window.location.href = deepLink;
        
        // Si después de 2 segundos no se abrió la app, mostrar opción de descarga
        setTimeout(function() {
            document.getElementById('fallback').style.display = 'block';
        }, 2000);
    </script>
</head>
<body>
    <div class="container">
        <div class="success-icon"></div>
        <h1>¡Pago Exitoso!</h1>
        <p>Tu pago ha sido procesado correctamente. Redirigiendo a la aplicación...</p>
        
        ${referencia || pedidoId ? `
        <div class="info">
            ${referencia ? `<div class="info-item">
                <span class="info-label">Referencia:</span>
                <span class="info-value">${referencia}</span>
            </div>` : ''}
            ${pedidoId ? `<div class="info-item">
                <span class="info-label">Pedido ID:</span>
                <span class="info-value">${pedidoId}</span>
            </div>` : ''}
            ${estadoTransaccion ? `<div class="info-item">
                <span class="info-label">Estado:</span>
                <span class="info-value">${estadoTransaccion}</span>
            </div>` : ''}
        </div>
        ` : ''}
        
        <div id="fallback" style="display: none;">
            <p class="loading">Si no se abre la aplicación automáticamente:</p>
            <a href="${deepLink}" class="button">Abrir Aplicación</a>
        </div>
    </div>
</body>
</html>
      `;

      res.send(html);
    } catch (error) {
      console.error('❌ [Pago Redirect] Error en pago exitoso:', error);
      res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error al procesar la redirección</h1>
            <p>${error.message}</p>
          </body>
        </html>
      `);
    }
  }

  /**
   * Página de pago con error
   * GET /pago-error
   * Wompi puede redirigir aquí si hay un error, también con el parámetro 'id' de la transacción
   */
  static async pagoError(req, res) {
    try {
      const { referencia, id, error } = req.query;
      
      console.log('❌ [Pago Redirect] Pago con error:', { referencia, id, error });

      // Si hay un ID de transacción (Wompi puede enviarlo), consultar el estado
      let estadoTransaccion = null;
      let pedidoId = null;
      let idTransaccionWompi = null;
      
      if (id) {
        // Wompi puede enviar el ID de la transacción incluso en caso de error
        idTransaccionWompi = id;
        console.log('🔍 [Pago Redirect] Consultando transacción en Wompi con ID:', id);
        
        const resultado = await wompiService.consultarTransaccion(id);
        if (resultado.exito) {
          estadoTransaccion = resultado.datos.estado;
          
          // Buscar el pedido asociado
          if (resultado.datos.referencia) {
            const pedidoSql = `
              SELECT id, estado, numero_orden
              FROM ordenes
              WHERE referencia_pago = ?
            `;
            const pedidos = await query(pedidoSql, [resultado.datos.referencia]);
            if (pedidos.length > 0) {
              pedidoId = pedidos[0].id;
            }
          }
        } else {
          console.warn('⚠️ [Pago Redirect] No se pudo consultar la transacción en Wompi:', resultado.error);
        }
      } else if (referencia) {
        // Fallback: buscar pedido por referencia si no hay ID
        const pedidoSql = `
          SELECT id, estado, numero_orden
          FROM ordenes
          WHERE referencia_pago = ?
        `;
        const pedidos = await query(pedidoSql, [referencia]);
        if (pedidos.length > 0) {
          pedidoId = pedidos[0].id;
        }
      }

      // Deep link para abrir la app
      // Incluir el ID de transacción de Wompi si está disponible
      let deepLinkParams = [];
      if (pedidoId) deepLinkParams.push(`pedido=${pedidoId}`);
      if (idTransaccionWompi) deepLinkParams.push(`idTransaccion=${idTransaccionWompi}`);
      if (referencia) deepLinkParams.push(`referencia=${referencia}`);
      if (error) deepLinkParams.push(`error=${encodeURIComponent(error)}`);
      
      const deepLink = `tienda-bomberos://pago-error${deepLinkParams.length > 0 ? `?${deepLinkParams.join('&')}` : ''}`;

      // HTML con intento de abrir la app y fallback
      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error en el Pago</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        .error-icon {
            width: 80px;
            height: 80px;
            background: #ef4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .error-icon::after {
            content: '✕';
            color: white;
            font-size: 50px;
            font-weight: bold;
        }
        h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 28px;
        }
        p {
            color: #6b7280;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .error-message {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: left;
            color: #991b1b;
            font-size: 14px;
        }
        .info {
            background: #f3f4f6;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            text-align: left;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .info-label {
            color: #6b7280;
            font-weight: 500;
        }
        .info-value {
            color: #1f2937;
            font-weight: 600;
        }
        .button {
            display: inline-block;
            background: #ef4444;
            color: white;
            padding: 14px 28px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            transition: background 0.3s;
            margin-top: 10px;
        }
        .button:hover {
            background: #dc2626;
        }
        .button-secondary {
            background: #6b7280;
            margin-left: 10px;
        }
        .button-secondary:hover {
            background: #4b5563;
        }
        .loading {
            color: #6b7280;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
    <script>
        // Intentar abrir la app inmediatamente
        const deepLink = '${deepLink}';
        
        // Intentar abrir la app
        window.location.href = deepLink;
        
        // Si después de 2 segundos no se abrió la app, mostrar opción
        setTimeout(function() {
            document.getElementById('fallback').style.display = 'block';
        }, 2000);
    </script>
</head>
<body>
    <div class="container">
        <div class="error-icon"></div>
        <h1>Error en el Pago</h1>
        <p>Hubo un problema al procesar tu pago. Por favor, intenta nuevamente.</p>
        
        ${error ? `
        <div class="error-message">
            <strong>Detalle del error:</strong><br>
            ${error}
        </div>
        ` : ''}
        
        ${referencia || pedidoId ? `
        <div class="info">
            ${referencia ? `<div class="info-item">
                <span class="info-label">Referencia:</span>
                <span class="info-value">${referencia}</span>
            </div>` : ''}
            ${pedidoId ? `<div class="info-item">
                <span class="info-label">Pedido ID:</span>
                <span class="info-value">${pedidoId}</span>
            </div>` : ''}
            ${estadoTransaccion ? `<div class="info-item">
                <span class="info-label">Estado:</span>
                <span class="info-value">${estadoTransaccion}</span>
            </div>` : ''}
        </div>
        ` : ''}
        
        <div id="fallback" style="display: none;">
            <p class="loading">Si no se abre la aplicación automáticamente:</p>
            <a href="${deepLink}" class="button">Abrir Aplicación</a>
            <a href="tienda-bomberos://" class="button button-secondary">Volver a la App</a>
        </div>
    </div>
</body>
</html>
      `;

      res.send(html);
    } catch (error) {
      console.error('❌ [Pago Redirect] Error en pago error:', error);
      res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body>
            <h1>Error al procesar la redirección</h1>
            <p>${error.message}</p>
          </body>
        </html>
      `);
    }
  }
}

module.exports = PagoRedirectController;
