# 📱 Números de Prueba para Nequi - Wompi Sandbox

## 🔢 Números de Teléfono para Pruebas

Cuando uses el ambiente **Sandbox** de Wompi, puedes usar estos números de teléfono para probar diferentes escenarios de pago con Nequi:

### ✅ Transacción Aprobada (APPROVED)
```
3991111111
```
- Usa este número para generar una transacción que será **aprobada automáticamente**
- El estado final será `APPROVED`
- El pedido se actualizará a estado `confirmada`

### ❌ Transacción Declinada (DECLINED)
```
3992222222
```
- Usa este número para generar una transacción que será **rechazada automáticamente**
- El estado final será `DECLINED`
- El pedido permanecerá en estado `pendiente`

### ⚠️ Transacción con Error (ERROR)
```
Cualquier otro número
```
- Cualquier número diferente a los dos anteriores resultará en un **ERROR**
- El estado final será `ERROR`
- El pedido permanecerá en estado `pendiente`

---

## 💻 Ejemplo de Uso

### Desde el Backend (Controlador)

```javascript
// Crear transacción con Nequi - Transacción aprobada
const transaccionData = {
  pedidoId: 'pedido-id',
  metodoPago: 'nequi',
  datosNequi: {
    telefono: '3991111111' // Transacción aprobada
  }
};

// Crear transacción con Nequi - Transacción declinada
const transaccionData = {
  pedidoId: 'pedido-id',
  metodoPago: 'nequi',
  datosNequi: {
    telefono: '3992222222' // Transacción declinada
  }
};
```

### Desde el Frontend (React Native)

```typescript
// En el checkout, cuando el usuario selecciona Nequi
const transaccionData = {
  pedidoId: orderResult.id,
  metodoPago: 'nequi' as const,
  datosNequi: {
    telefono: '3991111111' // Para pruebas en Sandbox
    // En producción, usar el teléfono real del usuario
  }
};

await crearTransaccionMutation.mutateAsync(transaccionData);
```

---

## 📝 Notas Importantes

1. **Solo en Sandbox**: Estos números solo funcionan en el ambiente de pruebas (Sandbox)
2. **Producción**: En producción, debes usar números de teléfono reales de usuarios con Nequi
3. **Teléfono del Usuario**: Si no proporcionas `datosNequi.telefono`, se usará el teléfono del usuario registrado en la base de datos
4. **Validación**: El sistema valida que se proporcione un número de teléfono antes de crear la transacción

---

## 🔄 Flujo de Prueba

1. **Crear pedido** en la app
2. **Seleccionar Nequi** como método de pago
3. **Usar número de prueba**:
   - `3991111111` para verificar flujo de éxito
   - `3992222222` para verificar flujo de rechazo
4. **Completar pago** en el WebView de Wompi
5. **Verificar resultado**:
   - Si usaste `3991111111`: El pedido debería actualizarse a `confirmada`
   - Si usaste `3992222222`: El pedido permanecerá en `pendiente`

---

## 🧪 Testing

Puedes usar estos números en tus tests automatizados:

```javascript
// Test de transacción aprobada
const datosNequiAprobado = {
  metodoPago: {
    tipo: 'NEQUI',
    telefono: '3991111111'
  }
};

// Test de transacción declinada
const datosNequiDeclinado = {
  metodoPago: {
    tipo: 'NEQUI',
    telefono: '3992222222'
  }
};
```

---

## 📚 Referencias

- [Documentación de Wompi - Nequi](https://docs.wompi.co/)
- [Panel de Wompi Sandbox](https://comercios.wompi.co/)
