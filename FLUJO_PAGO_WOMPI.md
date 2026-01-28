# 🔄 Flujo de Pago con Wompi - Lógica Completa

## 📋 Resumen del Flujo

```
1. Usuario confirma compra → NO se crea pedido aún
2. Backend guarda datos en checkout_intents
3. Usuario paga en Wompi
4. Wompi envía webhook → Backend registra evento
5. Webhook llama a OrderService.confirmCheckout()
6. Si APPROVED → OrderService crea pedido con estado "pendiente"
7. Si DECLINED/ERROR → NO se crea pedido
```

---

## 🔵 CASO 1: PAGO APROBADO (APPROVED)

### Flujo Completo:

#### 1️⃣ **Usuario confirma compra** (`checkout.tsx`)
```typescript
// NO se crea pedido, solo se crea transacción
const transaccionResult = await crearTransaccionMutation.mutateAsync({
  metodoPago: 'tarjeta',
  direccionEnvioId: '...',
  notas: '...'
});
```

#### 2️⃣ **Backend guarda intención de checkout** (`pagoController.js:crearTransaccion`)
```javascript
// Línea ~250: Guarda en checkout_intents
INSERT INTO checkout_intents (
  id, referencia_pago, usuario_id, carrito_id,
  direccion_envio_id, metodo_pago, datos_carrito,
  datos_usuario, datos_envio, estado_transaccion
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
```

**Estado**: `PENDING` (intención de checkout pendiente, NO hay pedido aún)

#### 3️⃣ **Usuario completa pago en Wompi**
- Wompi procesa el pago
- Wompi redirige a `/pago-exitoso?id=TRANSACCION_ID`
- Wompi envía webhook a `/api/v1/pagos/webhook`

#### 4️⃣ **Webhook registra el evento** (`pagoController.js:procesarWebhook`)

**Línea 460-500**: Registro del evento

```javascript
// 1. Validar firma del webhook (seguridad)
const resultado = wompiService.procesarWebhook(req.body, firma);

// 2. Buscar intención de checkout por referencia
const OrderService = require('../services/orderService');
const checkoutIntent = await OrderService.getCheckoutIntentByReference(referencia);

// 3. 🔄 REGISTRAR EVENTO: Actualizar estado de la intención
await OrderService.updateCheckoutIntentStatus(
  checkoutIntent.id,
  estadoTransaccion,
  idTransaccionWompi
);

console.log('📝 Evento registrado en intención de checkout');
```

**Línea 501-530**: Si el estado es `APPROVED` - Confirmar checkout

```javascript
if (estadoTransaccion === 'APPROVED') {
  // ✅ CONFIRMAR CHECKOUT Y CREAR PEDIDO
  
  // Llamar al servicio de órdenes (separación de responsabilidades)
  const pedido = await OrderService.confirmCheckout(checkoutIntent.id);
  
  // OrderService.confirmCheckout() hace:
  // 1. Parsear datos guardados
  // 2. Crear pedido con Order.createFromCart()
  // 3. Enviar notificación al usuario
  // 4. Retornar pedido creado
  
  console.log('✅ Pedido creado desde webhook (pago aprobado)');
}
```

**Resultado**:
- ✅ Pedido creado con estado `"pendiente"`
- ✅ Stock descontado del inventario
- ✅ Carrito limpiado
- ✅ Notificación enviada al usuario

---

## 🔴 CASO 2: PAGO RECHAZADO (DECLINED/ERROR/VOIDED)

### Flujo Completo:

#### 1️⃣-3️⃣ **Igual que el caso anterior**
- Usuario confirma compra
- Backend guarda en `transacciones_pendientes`
- Usuario intenta pagar en Wompi

#### 4️⃣ **Webhook procesa el rechazo** (`pagoController.js:procesarWebhook`)

**Línea 531-550**: Si el estado es `DECLINED`, `VOIDED` o `ERROR`

```javascript
else if (estadoTransaccion === 'DECLINED' || 
         estadoTransaccion === 'VOIDED' || 
         estadoTransaccion === 'ERROR') {
  
  // ❌ NO CREAR EL PEDIDO
  
  // El estado ya fue registrado en updateCheckoutIntentStatus()
  // Solo registrar el rechazo en logs
  console.log('❌ Pago rechazado - NO se creará pedido:', {
    checkoutIntentId: checkoutIntent.id,
    estadoTransaccion: estadoTransaccion,
    referencia: referencia,
    mensaje: resultado.datos.mensaje
  });
  
  // NO hacer nada más:
  // - NO crear pedido
  // - NO descontar stock
  // - NO limpiar carrito
  // - El usuario puede intentar nuevamente
}
```

**Resultado**:
- ❌ NO se crea pedido
- ✅ Stock NO se descuenta (porque no hay pedido)
- ✅ Carrito permanece intacto (usuario puede reintentar)
- ✅ Transacción marcada como `DECLINED`/`ERROR` en `transacciones_pendientes`

---

## 🔄 CASO 3: PAGO PENDIENTE (PENDING)

### Flujo:

**Línea 591-600**: Si el estado es `PENDING`

```javascript
else if (estadoTransaccion === 'PENDING') {
  // ⏳ Transacción aún pendiente - esperar siguiente evento
  
  // 1. Actualizar estado
  UPDATE transacciones_pendientes
  SET estado_transaccion = 'PENDING',
      id_transaccion_wompi = ?
  WHERE id = ?
  
  // 2. NO hacer nada más
  // Wompi enviará otro webhook cuando cambie el estado
  console.log('⏳ Transacción pendiente, esperando siguiente evento');
}
```

**Resultado**:
- ⏳ Transacción sigue en `PENDING`
- ⏳ NO se crea pedido aún
- ⏳ Wompi enviará otro webhook cuando el estado cambie

---

## 📊 Estados de Transacción vs Estados de Pedido

### Estados de Transacción (Wompi):
- `PENDING` → Pago en proceso
- `APPROVED` → Pago aprobado ✅
- `DECLINED` → Pago rechazado ❌
- `VOIDED` → Pago anulado ❌
- `ERROR` → Error en el pago ❌

### Estados de Pedido (Sistema):
- `pendiente` → Pedido creado, esperando procesamiento
- `confirmada` → Pedido confirmado (se actualiza después)
- `cancelada` → Pedido cancelado
- `en_proceso` → Pedido en preparación
- `enviada` → Pedido enviado
- `entregada` → Pedido entregado

### Mapeo:
```
Wompi APPROVED → Sistema crea pedido con estado "pendiente"
Wompi DECLINED → Sistema NO crea pedido
Wompi ERROR → Sistema NO crea pedido
Wompi VOIDED → Sistema NO crea pedido
Wompi PENDING → Sistema espera siguiente webhook
```

---

## 🔐 Seguridad del Webhook

### Validación de Firma (`wompiService.js:procesarWebhook`)

```javascript
// 1. Wompi envía firma en header
const firma = req.headers['x-event-checksum'];

// 2. Backend valida la firma
const firmaOk = this.validarFirmaWebhook(payload, firma);

// 3. Solo procesar si la firma es válida
if (!firmaOk) {
  return { exito: false, error: 'Firma de webhook inválida' };
}
```

**¿Por qué es importante?**
- Previene webhooks falsos
- Asegura que solo Wompi puede actualizar el estado
- Protege contra ataques de manipulación

---

## 📱 Redirección del Usuario

### Página de Éxito (`pagoRedirectController.js:pagoExitoso`)

```javascript
// GET /pago-exitoso?id=TRANSACCION_ID
// Wompi redirige aquí después del pago

// 1. Consultar estado en Wompi
const resultado = await wompiService.consultarTransaccion(id);

// 2. Buscar pedido (si ya fue creado por webhook)
const pedido = await query(`
  SELECT * FROM ordenes 
  WHERE referencia_pago = ?
`, [referencia]);

// 3. Mostrar página HTML con deep link
// Deep link: tienda-bomberos://pago-exitoso?pedido={pedidoId}
```

**Nota importante**: La redirección es solo informativa. El webhook es la fuente de verdad.

---

## 🔄 Reintentos

### Si el pago es rechazado:

1. **Usuario puede reintentar**:
   - El carrito sigue intacto
   - Puede volver a `checkout.tsx`
   - Crear nueva transacción con nueva referencia

2. **Nueva transacción**:
   - Nueva referencia única (Wompi no permite reutilizar)
   - Nuevo registro en `transacciones_pendientes`
   - Nueva URL de checkout

---

## 📝 Resumen de Archivos Clave

### Backend:
- `backend/src/controllers/pagoController.js`:
  - `crearTransaccion()` → Guarda en `checkout_intents`
  - `procesarWebhook()` → **Solo registra eventos**, llama a `OrderService.confirmCheckout()` si APPROVED

- `backend/src/services/orderService.js`:
  - `confirmCheckout()` → **Lógica de negocio**: Crea pedido cuando pago es aprobado
  - `getCheckoutIntentByReference()` → Obtiene intención de checkout
  - `updateCheckoutIntentStatus()` → Actualiza estado de intención

- `backend/src/models/Order.js`:
  - `createFromCart()` → Crea pedido con estado `"pendiente"` (llamado desde OrderService)

- `backend/src/services/pagos/wompiService.js`:
  - `procesarWebhook()` → Valida firma y extrae datos
  - `validarFirmaWebhook()` → Valida seguridad

### Frontend:
- `app/(customer)/checkout.tsx`:
  - NO crea pedido, solo llama a `crearTransaccion`

- `app/(customer)/wompi-checkout.tsx`:
  - Muestra WebView de Wompi
  - Detecta redirecciones

---

## ✅ Checklist de Implementación

- [x] Tabla `transacciones_pendientes` creada
- [x] `crearTransaccion` guarda en tabla temporal
- [x] `procesarWebhook` crea pedido si APPROVED
- [x] `procesarWebhook` NO crea pedido si DECLINED/ERROR
- [x] Pedido creado con estado `"pendiente"`
- [x] Validación de firma del webhook
- [x] Frontend NO crea pedido antes del pago

---

## 🎯 Puntos Clave a Recordar

1. **El pedido NO se crea hasta que el pago sea aprobado**
2. **El webhook solo registra eventos** (separación de responsabilidades)
3. **OrderService.confirmCheckout() maneja la lógica de negocio** (crear pedido)
4. **Si el pago es rechazado, NO se crea pedido** (usuario puede reintentar)
5. **El pedido se crea con estado "pendiente"** (no "confirmada")
6. **La firma del webhook debe validarse** (seguridad)
7. **checkout_intents almacena intenciones de checkout** (mejor nomenclatura)
