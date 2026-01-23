# 🏦 Botón de Transferencia Bancolombia - Wompi

## 📋 Descripción

El Botón de Transferencia Bancolombia permite a los usuarios realizar pagos mediante transferencia bancaria desde su cuenta de Bancolombia.

---

## 🔧 Implementación

### Campos Requeridos

Para crear una transacción con Bancolombia, se requiere:

```json
{
  "payment_method": {
    "type": "BANCOLOMBIA_TRANSFER",
    "payment_description": "Pago a Tienda Wompi"  // Máximo 64 caracteres
  }
}
```

### Respuesta de la Transacción

Después de crear la transacción, Wompi devuelve:

```json
{
  "data": {
    "id": "11004-1718123303-80111",
    "payment_method_type": "BANCOLOMBIA_TRANSFER",
    "payment_method": {
      "type": "BANCOLOMBIA_TRANSFER",
      "extra": {
        "async_payment_url": "<<URL a cargar el paso de autenticación>>"
      },
      "payment_description": "Pago de pedido"
    }
  }
}
```

**Importante**: El campo `async_payment_url` contiene la URL que debes usar para redirigir al usuario a la autenticación de Bancolombia.

---

## 💻 Ejemplo de Uso

### Desde el Backend (Controlador)

```javascript
// Crear transacción con Bancolombia
const transaccionData = {
  pedidoId: 'pedido-id',
  metodoPago: 'bancolombia_transfer',
  datosBancolombia: {
    descripcionPago: 'Pago de pedido #12345' // Máximo 64 caracteres
  }
};

// La respuesta incluirá asyncPaymentUrl
const resultado = await crearTransaccion(transaccionData);
// resultado.data.asyncPaymentUrl contiene la URL de autenticación
```

### Desde el Frontend (React Native)

```typescript
// En el checkout, cuando el usuario selecciona Bancolombia
const transaccionData = {
  pedidoId: orderResult.id,
  metodoPago: 'bancolombia_transfer' as const,
  datosBancolombia: {
    descripcionPago: `Pedido ${orderResult.numeroOrden}`
  }
};

const resultado = await crearTransaccionMutation.mutateAsync(transaccionData);

// Usar asyncPaymentUrl para redirigir al usuario
if (resultado.asyncPaymentUrl) {
  // Abrir WebView con esta URL
  router.push({
    pathname: '/(customer)/wompi-checkout',
    params: {
      pedidoId: orderResult.id,
      metodoPago: 'bancolombia_transfer',
      checkoutUrl: resultado.asyncPaymentUrl // URL de autenticación
    },
  });
}
```

---

## 🔄 Flujo Completo

```
1. Usuario selecciona "Bancolombia" como método de pago
   ↓
2. Frontend crea transacción con payment_description
   ↓
3. Backend crea transacción en Wompi
   ↓
4. Wompi devuelve async_payment_url
   ↓
5. Frontend abre WebView con async_payment_url
   ↓
6. Usuario completa autenticación en Bancolombia
   ↓
7. Wompi envía webhook cuando cambia el estado
   ↓
8. Backend actualiza estado del pedido
   ↓
9. Frontend consulta estado y muestra resultado
```

---

## 📝 Campos Detallados

### `payment_description` (Descripción del Pago)
- **Requerido**: Sí
- **Tipo**: String
- **Máximo**: 64 caracteres
- **Descripción**: Nombre de lo que se está pagando
- **Ejemplo**: "Pago de pedido #12345"

### `async_payment_url` (URL de Autenticación)
- **Tipo**: String (URL)
- **Origen**: Devuelto por Wompi en la respuesta
- **Uso**: URL que debe abrirse en un WebView para que el usuario complete la autenticación
- **Ubicación**: `data.payment_method.extra.async_payment_url`

---

## ⚠️ Notas Importantes

1. **URL de Autenticación**: Siempre usa `async_payment_url` para redirigir al usuario, no `redirect_url`
2. **Descripción Limitada**: El `payment_description` tiene un máximo de 64 caracteres
3. **WebView Requerido**: El usuario debe completar la autenticación en un WebView
4. **Webhook**: Wompi enviará un webhook cuando el pago se complete o falle

---

## 🧪 Testing

En ambiente Sandbox, puedes probar el flujo completo:

```typescript
const transaccionData = {
  pedidoId: 'test-pedido-id',
  metodoPago: 'bancolombia_transfer',
  datosBancolombia: {
    descripcionPago: 'Pago de prueba'
  }
};
```

---

## 📚 Referencias

- [Documentación de Wompi - Bancolombia](https://docs.wompi.co/)
- [Panel de Wompi](https://comercios.wompi.co/)
