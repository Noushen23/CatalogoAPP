const { query } = require('../config/database');

/**
 * Controlador para páginas de redirección de pagos
 * IMPORTANTE:
 * - NO consulta Wompi
 * - NO actualiza pedidos
 * - El webhook es la única fuente de verdad
 * - Esto es SOLO UX + deep link
 */
class PagoRedirectController {

  // --- helpers ---
  static escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, m =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])
    );
  }

  static async buscarPedidoPorReferencia(referencia) {
    if (!referencia) return null;

    const sql = `
      SELECT id, estado, numero_orden
      FROM ordenes
      WHERE referencia_pago = ?
      LIMIT 1
    `;
    const rows = await query(sql, [referencia]);
    return rows.length ? rows[0] : null;
  }

  /**
   * GET /pago-exitoso
   */
  static async pagoExitoso(req, res) {
    try {
      const { referencia, id } = req.query;
      const referenciaPago = referencia || id;

      console.log('✅ [Pago Redirect] pago-exitoso:', { referenciaPago });

      const pedido = await PagoRedirectController.buscarPedidoPorReferencia(referenciaPago);

      const pedidoId = pedido?.id || null;
      const estado = pedido?.estado || 'CONFIRMING';

      const deepLink = pedidoId
        ? `tienda-bomberos://pago-exitoso?pedido=${pedidoId}`
        : `tienda-bomberos://pago-exitoso`;

      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Pago exitoso</title>
<style>
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont;
  background: linear-gradient(135deg,#667eea,#764ba2);
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
}
.card {
  background:#fff;
  padding:40px;
  border-radius:20px;
  max-width:480px;
  width:100%;
  text-align:center;
  box-shadow:0 20px 60px rgba(0,0,0,.3);
}
.icon {
  width:80px;
  height:80px;
  border-radius:50%;
  background:#10b981;
  margin:0 auto 20px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#fff;
  font-size:48px;
}
.info {
  background:#f3f4f6;
  padding:15px;
  border-radius:10px;
  text-align:left;
  margin-top:20px;
  font-size:14px;
}
.btn {
  margin-top:20px;
  display:inline-block;
  padding:14px 26px;
  background:#667eea;
  color:#fff;
  text-decoration:none;
  border-radius:10px;
  font-weight:600;
}
</style>
<script>
  const deepLink = '${deepLink}';
  window.location.href = deepLink;
  setTimeout(() => {
    document.getElementById('fallback').style.display = 'block';
  }, 1500);
</script>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>¡Pago recibido!</h1>
    <p>Estamos confirmando tu pago y abriendo la app.</p>

    <div class="info">
      ${pedidoId ? `<div><strong>Pedido:</strong> ${pedidoId}</div>` : ''}
      <div><strong>Estado:</strong> ${PagoRedirectController.escapeHtml(estado)}</div>
    </div>

    <div id="fallback" style="display:none">
      <a class="btn" href="${deepLink}">Abrir aplicación</a>
    </div>
  </div>
</body>
</html>
      `;

      res.send(html);

    } catch (err) {
      console.error('❌ [Pago Redirect] pago-exitoso error:', err);
      res.status(500).send('Error procesando la redirección');
    }
  }

  /**
   * GET /pago-error
   */
  static async pagoError(req, res) {
    try {
      const { referencia, id, error } = req.query;
      const referenciaPago = referencia || id;

      console.log('❌ [Pago Redirect] pago-error:', { referenciaPago });

      const pedido = await PagoRedirectController.buscarPedidoPorReferencia(referenciaPago);
      const pedidoId = pedido?.id || null;

      const deepLink = pedidoId
        ? `tienda-bomberos://pago-error?pedido=${pedidoId}`
        : `tienda-bomberos://pago-error`;

      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Error de pago</title>
<style>
body {
  font-family: system-ui;
  background: linear-gradient(135deg,#f093fb,#f5576c);
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
}
.card {
  background:#fff;
  padding:40px;
  border-radius:20px;
  max-width:480px;
  width:100%;
  text-align:center;
  box-shadow:0 20px 60px rgba(0,0,0,.3);
}
.icon {
  width:80px;
  height:80px;
  border-radius:50%;
  background:#ef4444;
  margin:0 auto 20px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#fff;
  font-size:48px;
}
.error {
  background:#fef2f2;
  border-left:4px solid #ef4444;
  padding:15px;
  margin-top:20px;
  text-align:left;
  font-size:14px;
}
.btn {
  margin-top:20px;
  display:inline-block;
  padding:14px 26px;
  background:#ef4444;
  color:#fff;
  text-decoration:none;
  border-radius:10px;
  font-weight:600;
}
</style>
<script>
  const deepLink = '${deepLink}';
  window.location.href = deepLink;
  setTimeout(() => {
    document.getElementById('fallback').style.display = 'block';
  }, 1500);
</script>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h1>Error en el pago</h1>
    <p>No se pudo completar la transacción.</p>

    ${error ? `
    <div class="error">
      ${PagoRedirectController.escapeHtml(error)}
    </div>` : ''}

    <div id="fallback" style="display:none">
      <a class="btn" href="${deepLink}">Volver a la app</a>
    </div>
  </div>
</body>
</html>
      `;

      res.send(html);

    } catch (err) {
      console.error('❌ [Pago Redirect] pago-error error:', err);
      res.status(500).send('Error procesando la redirección');
    }
  }
}

module.exports = PagoRedirectController;
