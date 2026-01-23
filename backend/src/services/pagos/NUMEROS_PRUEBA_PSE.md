# 🏦 Números de Prueba para PSE - Wompi Sandbox

## 🔢 Códigos de Banco para Pruebas

Cuando uses el ambiente **Sandbox** de Wompi, puedes usar estos códigos de banco (`financial_institution_code`) para probar diferentes escenarios de pago con PSE:

### ✅ Transacción Aprobada (APPROVED)
```
"1"
```
- Usa este código para generar una transacción que será **aprobada automáticamente**
- El estado final será `APPROVED`
- El pedido se actualizará a estado `confirmada`

### ❌ Transacción Declinada (DECLINED)
```
"2"
```
- Usa este código para generar una transacción que será **rechazada automáticamente**
- El estado final será `DECLINED`
- El pedido permanecerá en estado `pendiente`

---

## 📋 Campos Requeridos para PSE

### Estructura del `payment_method` para PSE:

```json
{
  "type": "PSE",
  "user_type": 0,  // 0 = Natural (persona), 1 = Jurídica (empresa)
  "user_legal_id_type": "CC",  // "CC" o "NIT"
  "user_legal_id": "1999888777",  // Número de documento
  "financial_institution_code": "1",  // Código del banco (en Sandbox: "1"=APPROVED, "2"=DECLINED)
  "payment_description": "Pago a Tienda Wompi"  // Máximo 30 caracteres
}
```

---

## 💻 Ejemplo de Uso

### Desde el Backend (Controlador)

```javascript
// Crear transacción con PSE - Transacción aprobada
const transaccionData = {
  pedidoId: 'pedido-id',
  metodoPago: 'pse',
  datosPSE: {
    banco: '1', // financial_institution_code - Transacción aprobada en Sandbox
    tipoPersona: 0, // 0 = Natural, 1 = Jurídica
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '1999888777',
    descripcionPago: 'Pago de pedido #12345' // Máximo 30 caracteres
  }
};

// Crear transacción con PSE - Transacción declinada
const transaccionData = {
  pedidoId: 'pedido-id',
  metodoPago: 'pse',
  datosPSE: {
    banco: '2', // financial_institution_code - Transacción declinada en Sandbox
    tipoPersona: 0,
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '1999888777',
    descripcionPago: 'Pago de pedido #12345'
  }
};
```

### Desde el Frontend (React Native)

```typescript
// En el checkout, cuando el usuario selecciona PSE
const transaccionData = {
  pedidoId: orderResult.id,
  metodoPago: 'pse' as const,
  datosPSE: {
    banco: '1', // Para pruebas en Sandbox
    tipoPersona: 0, // 0 = Natural, 1 = Jurídica
    tipoIdentificacion: 'CC',
    numeroIdentificacion: user.numeroIdentificacion,
    descripcionPago: `Pedido ${orderResult.numeroOrden}`
  }
};

await crearTransaccionMutation.mutateAsync(transaccionData);
```

---

## 📝 Campos Detallados

### `user_type` (Tipo de Persona)
- **0**: Natural (Persona)
- **1**: Jurídica (Empresa)

### `user_legal_id_type` (Tipo de Documento)
- **"CC"**: Cédula de Ciudadanía (para personas naturales)
- **"NIT"**: Número de Identificación Tributaria (para empresas)

### `user_legal_id` (Número de Identificación)
- Número de documento del usuario
- Ejemplo: "1999888777", "900123456-1"

### `financial_institution_code` (Código del Banco)
- Código del banco seleccionado
- En producción: código real del banco (obtenido de `/pse/financial_institutions`)
- En Sandbox: "1" (aprobada) o "2" (declinada)

### `payment_description` (Descripción del Pago)
- Descripción de lo que se está pagando
- **Máximo 30 caracteres**
- Ejemplo: "Pago de pedido #12345"

---

## 🔄 Flujo de Prueba

1. **Crear pedido** en la app
2. **Seleccionar PSE** como método de pago
3. **Proporcionar datos PSE**:
   - Banco: `"1"` (aprobada) o `"2"` (declinada)
   - Tipo de persona: `0` (Natural) o `1` (Jurídica)
   - Tipo de documento: `"CC"` o `"NIT"`
   - Número de documento: cualquier número válido
   - Descripción: texto de máximo 30 caracteres
4. **Completar pago** en el WebView de Wompi
5. **Verificar resultado**:
   - Si usaste `"1"`: El pedido debería actualizarse a `confirmada`
   - Si usaste `"2"`: El pedido permanecerá en `pendiente`

---

## 🧪 Testing

Puedes usar estos códigos en tus tests automatizados:

```javascript
// Test de transacción aprobada
const datosPSEAprobado = {
  metodoPago: {
    tipo: 'PSE',
    banco: '1',
    tipoPersona: 0,
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '1999888777',
    descripcionPago: 'Pago de prueba'
  }
};

// Test de transacción declinada
const datosPSEDeclinado = {
  metodoPago: {
    tipo: 'PSE',
    banco: '2',
    tipoPersona: 0,
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '1999888777',
    descripcionPago: 'Pago de prueba'
  }
};
```

---

## 📚 Referencias

- [Documentación de Wompi - PSE](https://docs.wompi.co/)
- [Panel de Wompi Sandbox](https://comercios.wompi.co/)
