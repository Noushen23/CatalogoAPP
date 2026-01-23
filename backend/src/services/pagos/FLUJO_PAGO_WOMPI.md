# 🔄 Flujo Completo de Pago con Wompi - Implementación

## 📋 Resumen del Flujo

Este documento describe el flujo completo de pago implementado con Wompi usando WebView en React Native.

---

## 🔄 Flujo Paso a Paso

### 1️⃣ **Usuario confirma su compra en la app**

**Archivo**: `app/(customer)/checkout.tsx`

- El usuario selecciona método de pago (tarjeta, PSE, Nequi, Bancolombia)
- Presiona "Confirmar Pedido"
- Se crea el pedido en la base de datos

```typescript
// Línea 167: Crear pedido
const orderResult = await createOrderMutation.mutateAsync(orderData);
```

---

### 2️⃣ **La app solicita al backend los datos del pago**

**Archivo**: `app/(customer)/checkout.tsx` → `core/api/pagosApi.ts`

- La app llama a `POST /api/v1/pagos/crear`
- El backend crea una transacción en Wompi
- El backend devuelve la URL de checkout de Wompi

```typescript
// Línea 185: Crear transacción
const transaccionResult = await crearTransaccionMutation.mutateAsync(transaccionData);

// Backend: backend/src/controllers/pagoController.js
// Línea 147: wompiService.crearTransaccion()
```

**Endpoint Backend**: `POST /api/v1/pagos/crear`
- **Controlador**: `backend/src/controllers/pagoController.js` → `crearTransaccion()`
- **Servicio**: `backend/src/services/pagos/wompiService.js` → `crearTransaccion()`

---

### 3️⃣ **La app abre el Checkout de Wompi dentro de un WebView**

**Archivo**: `app/(customer)/wompi-checkout.tsx`

- La app navega a la pantalla `wompi-checkout`
- Se muestra un WebView con la URL de checkout de Wompi
- El usuario puede pagar directamente dentro de la app

```typescript
// Navegación desde checkout.tsx
router.push({
  pathname: '/(customer)/wompi-checkout',
  params: {
    pedidoId: orderResult.id,
    metodoPago: paymentMethod,
  },
});

// Componente WebView
<WompiCheckoutWebView
  url={checkoutUrl}
  onPaymentSuccess={handlePaymentSuccess}
  onPaymentError={handlePaymentError}
/>
```

**Componente WebView**: `presentation/pagos/components/WompiCheckoutWebView.tsx`
- Maneja la navegación dentro del WebView
- Detecta URLs de éxito/error
- Intercepta mensajes de Wompi

---

### 4️⃣ **El usuario paga en Wompi**

- El usuario completa el pago dentro del WebView
- Wompi procesa el pago
- Wompi redirige a las URLs configuradas:
  - Éxito: `tienda-bomberos://pago-exitoso?pedido={pedidoId}`
  - Error: `tienda-bomberos://pago-error?pedido={pedidoId}`

**URLs de Redirección** (configuradas en backend):
```javascript
// backend/src/controllers/pagoController.js línea 153
urlRedireccion: `tienda-bomberos://pago-exitoso?pedido=${pedidoId}`
urlRedireccionError: `tienda-bomberos://pago-error?pedido=${pedidoId}`
```

---

### 5️⃣ **Wompi envía un webhook a tu backend**

**Endpoint**: `POST /api/v1/pagos/webhook` (público, validado por firma)

**Archivo**: `backend/src/controllers/pagoController.js` → `procesarWebhook()`

- Wompi envía un webhook cuando cambia el estado del pago
- El backend valida la firma del webhook (seguridad)
- El backend actualiza el estado del pedido en la base de datos

```javascript
// Línea 304: Procesar webhook
const resultado = wompiService.procesarWebhook(req.body, firma);

// Línea 335: Actualizar estado del pedido
if (resultado.datos.estado === 'APPROVED' && pedido.estado === 'pendiente') {
  // Actualizar pedido a 'confirmada'
  UPDATE ordenes SET estado = 'confirmada' WHERE id = ?
}
```

**Validación de Firma**:
- El webhook incluye una firma SHA256
- El backend valida la firma usando `WOMPI_CLAVE_INTEGRIDAD`
- Solo webhooks válidos se procesan

---

### 6️⃣ **El backend valida el pago**

**Archivo**: `backend/src/services/pagos/wompiService.js` → `procesarWebhook()`

- Valida la firma del webhook
- Extrae los datos de la transacción
- Actualiza el estado del pedido según el resultado:
  - `APPROVED` → Estado: `confirmada`
  - `DECLINED` → Estado: `pendiente` (usuario puede reintentar)
  - `VOIDED` → Estado: `pendiente`

---

### 7️⃣ **La app consulta el estado del pedido y muestra el resultado**

**Archivo**: `app/(customer)/order-confirmation/[id].tsx`

- Después del pago, la app navega a la pantalla de confirmación
- El hook `useUserOrder` consulta el estado del pedido
- Si el pedido está `pendiente`, hace refetch automático cada 3 segundos
- Cuando el webhook actualiza el estado, la UI se actualiza automáticamente

```typescript
// Hook con refetch automático
const { data: order } = useUserOrder(id, {
  refetchInterval: (query) => {
    const orderData = query.state.data;
    // Refetch cada 3 segundos si está pendiente
    if (orderData?.estado === 'pendiente') {
      return 3000;
    }
    return false;
  },
});
```

**Pantalla de Confirmación**: `app/(customer)/order-confirmation/[id].tsx`
- Muestra el estado actual del pedido
- Actualiza automáticamente cuando el webhook procesa el pago
- Muestra mensaje de éxito cuando el pago es aprobado

---

## 🔐 Seguridad

### Validación de Webhooks

1. **Firma SHA256**: Wompi envía una firma en el header `signature`
2. **Validación**: El backend calcula la firma esperada y la compara
3. **Protección**: Solo webhooks con firma válida se procesan

```javascript
// backend/src/services/pagos/wompiService.js línea 227
validarFirmaWebhook(datosWebhook, firma) {
  const datosString = JSON.stringify(datosWebhook);
  const firmaCalculada = crypto
    .createHash('sha256')
    .update(datosString + claveIntegridad)
    .digest('hex');
  return firmaCalculada === firma;
}
```

---

## 📱 Deep Linking

### Configuración en `app.json`

```json
{
  "expo": {
    "scheme": "tienda-bomberos"
  }
}
```

### URLs de Redirección

- **Éxito**: `tienda-bomberos://pago-exitoso?pedido={pedidoId}`
- **Error**: `tienda-bomberos://pago-error?pedido={pedidoId}`

El WebView detecta estas URLs y ejecuta los callbacks correspondientes.

---

## 🔄 Diagrama de Flujo

```
┌─────────────────┐
│  Usuario        │
│  Confirma Compra │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │
│  checkout.tsx   │
│  Crea Pedido    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend        │
│  POST /pagos/   │
│  crear          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  wompiService   │
│  crearTransaccion│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Wompi API      │
│  Crea Transacción│
└────────┬────────┘
         │
         │ URL de Checkout
         ▼
┌─────────────────┐
│  WebView        │
│  wompi-checkout │
│  Usuario Paga   │
└────────┬────────┘
         │
         │ Pago Completado
         ▼
┌─────────────────┐
│  Wompi          │
│  Envía Webhook  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend        │
│  POST /webhook  │
│  Valida Firma   │
│  Actualiza Estado│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │
│  order-confirmation│
│  Consulta Estado│
│  Muestra Resultado│
└─────────────────┘
```

---

## 📝 Archivos Clave

### Frontend

1. **`app/(customer)/checkout.tsx`**
   - Pantalla de checkout
   - Crea pedido y transacción
   - Navega a WebView

2. **`app/(customer)/wompi-checkout.tsx`**
   - Pantalla con WebView
   - Maneja el pago dentro de la app

3. **`presentation/pagos/components/WompiCheckoutWebView.tsx`**
   - Componente WebView
   - Detecta URLs de éxito/error
   - Intercepta mensajes de Wompi

4. **`app/(customer)/order-confirmation/[id].tsx`**
   - Pantalla de confirmación
   - Consulta estado del pedido
   - Refetch automático si está pendiente

### Backend

1. **`backend/src/controllers/pagoController.js`**
   - `crearTransaccion()`: Crea transacción en Wompi
   - `procesarWebhook()`: Procesa webhooks de Wompi

2. **`backend/src/services/pagos/wompiService.js`**
   - `crearTransaccion()`: Comunica con API de Wompi
   - `procesarWebhook()`: Procesa webhooks
   - `validarFirmaWebhook()`: Valida seguridad

3. **`backend/src/routes/pagos.js`**
   - Rutas de pagos
   - Webhook (público, validado por firma)

---

## ✅ Ventajas de esta Implementación

1. **Experiencia de Usuario Mejorada**
   - El usuario no sale de la app
   - Pago fluido dentro de la aplicación

2. **Seguridad**
   - Validación de firmas de webhook
   - No se exponen datos sensibles al frontend

3. **Confiabilidad**
   - Webhooks garantizan actualización del estado
   - Refetch automático si el webhook tarda

4. **Mantenibilidad**
   - Código organizado y separado
   - Fácil de debuggear y actualizar

---

## 🧪 Testing

Los 18 tests en `wompiService.test.js` validan:
- ✅ Creación de transacciones
- ✅ Validación de datos
- ✅ Procesamiento de webhooks
- ✅ Validación de firmas
- ✅ Manejo de errores

---

## 🚀 Próximos Pasos

1. **Configurar Webhook en Wompi**
   - URL: `https://tu-dominio.com/api/v1/pagos/webhook`
   - Configurar en el panel de Wompi

2. **Probar el Flujo Completo**
   - Crear pedido de prueba
   - Procesar pago en ambiente de pruebas
   - Verificar que el webhook actualiza el estado

3. **Monitoreo**
   - Logs de webhooks
   - Alertas si fallan webhooks
   - Dashboard de transacciones

---

## 📚 Referencias

- [Documentación de Wompi](https://docs.wompi.co/)
- [React Native WebView](https://github.com/react-native-webview/react-native-webview)
- [Expo Deep Linking](https://docs.expo.dev/guides/linking/)
