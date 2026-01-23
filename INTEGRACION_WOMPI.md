# Integración de Wompi - Resumen

## ✅ Implementación Completada

Se ha integrado exitosamente Wompi como pasarela de pagos en el sistema de e-commerce. La integración incluye:

### Backend

1. **Servicio de Wompi** (`backend/src/services/pagos/wompiService.js`)
   - Crear transacciones de pago
   - Consultar estado de transacciones
   - Procesar webhooks
   - Validar firmas de seguridad
   - Obtener bancos para PSE

2. **Controlador de Pagos** (`backend/src/controllers/pagoController.js`)
   - Endpoint para crear transacciones
   - Endpoint para consultar transacciones
   - Endpoint para procesar webhooks
   - Endpoint para obtener bancos PSE
   - Endpoint para obtener configuración pública

3. **Rutas de Pagos** (`backend/src/routes/pagos.js`)
   - `POST /api/v1/pagos/crear` - Crear transacción
   - `GET /api/v1/pagos/consultar/:idTransaccion` - Consultar transacción
   - `POST /api/v1/pagos/webhook` - Webhook de Wompi
   - `GET /api/v1/pagos/bancos-pse` - Obtener bancos PSE
   - `GET /api/v1/pagos/configuracion` - Configuración pública

4. **Rutas de Redirección** (`backend/src/controllers/pagoRedirectController.js`)
   - `GET /pago-exitoso` - Página de redirección después de pago exitoso (pública)
   - `GET /pago-error` - Página de redirección después de error en pago (pública)

5. **Configuración** (`backend/src/config/env.js`)
   - Variables de entorno en español
   - Configuración de ambiente (pruebas/producción)
   - URLs de redirección

### Frontend

1. **API Client** (`core/api/pagosApi.ts`)
   - Interfaces TypeScript
   - Funciones para comunicarse con el backend

2. **Hooks de React Query** (`presentation/pagos/hooks/usePagos.ts`)
   - `useCrearTransaccion` - Hook para crear transacciones
   - `useConsultarTransaccion` - Hook para consultar estado
   - `useBancosPSE` - Hook para obtener bancos
   - `useConfiguracionWompi` - Hook para configuración

3. **Integración en Checkout** (`app/(customer)/checkout.tsx`)
   - Detección automática de métodos que requieren Wompi
   - Creación de pedido y transacción
   - Redirección a pasarela de pago
   - Manejo de errores

## 📋 Variables de Entorno Requeridas

Agregar al archivo `.env` del backend:

```env
# Wompi - Pasarela de Pagos
WOMPI_URL_BASE=https://production.wompi.co/v1
WOMPI_URL_BASE_PRUEBAS=https://sandbox.wompi.co/v1
WOMPI_CLAVE_PUBLICA=pub_test_xxxxxxxxxxxxx
WOMPI_CLAVE_PRIVADA=prv_test_xxxxxxxxxxxxx
WOMPI_CLAVE_INTEGRIDAD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOMPI_AMBIENTE=pruebas
WOMPI_MONEDA=COP
WOMPI_URL_REDIRECCION=http://tu-dominio.com/pago-exitoso
WOMPI_URL_REDIRECCION_ERROR=http://tu-dominio.com/pago-error
```

## 🔄 Flujo de Pago

1. **Usuario selecciona método de pago** (tarjeta o PSE)
2. **Se crea el pedido** en estado "pendiente"
3. **Se crea la transacción en Wompi** con los datos del pedido
4. **Usuario es redirigido** a la pasarela de Wompi
5. **Usuario completa el pago** en Wompi
6. **Wompi envía webhook** al backend
7. **Backend actualiza el pedido** a estado "confirmada"
8. **Usuario es redirigido** de vuelta a la app

## 🎯 Métodos de Pago Soportados

- ✅ **Tarjeta de Crédito/Débito** (CARD)
- ✅ **PSE** (Pagos Seguros en Línea)
- ✅ **Nequi** (implementado)
- ✅ **Transferencia Bancolombia** (implementado)
- ✅ **Efectivo** (no requiere Wompi)
- ✅ **Transferencia** (no requiere Wompi)

### 📱 Números de Prueba para Sandbox

#### Nequi
- `3991111111` → Transacción **APROBADA** (APPROVED)
- `3992222222` → Transacción **DECLINADA** (DECLINED)
- Cualquier otro número → **ERROR**

#### PSE
- `financial_institution_code: "1"` → Transacción **APROBADA** (APPROVED)
- `financial_institution_code: "2"` → Transacción **DECLINADA** (DECLINED)

#### Bancolombia
- No requiere números especiales en Sandbox
- Después de crear la transacción, usar `async_payment_url` para redirigir al usuario

## 🔔 Webhooks y Eventos

### Estructura del Webhook

Wompi envía webhooks con la siguiente estructura:

```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "1234-1610641025-49201",
      "amount_in_cents": 4490000,
      "reference": "MZQ3X2DE2SMX",
      "customer_email": "juan.perez@gmail.com",
      "currency": "COP",
      "payment_method_type": "NEQUI",
      "status": "APPROVED",
      "redirect_url": "https://mitienda.com.co/pagos/redireccion",
      "shipping_address": null,
      "payment_link_id": null,
      "payment_source_id": null
    }
  },
  "environment": "prod",
  "signature": {
    "properties": [
      "transaction.id",
      "transaction.status",
      "transaction.amount_in_cents"
    ],
    "checksum": "3476DDA50F64CD7CBD160689640506FEBEA93239BC524FC0469B2C68A3CC8BD0"
  },
  "timestamp": 1530291411,
  "sent_at": "2018-07-20T16:45:05.000Z"
}
```

### Tipos de Eventos

- `transaction.updated` - El estado de una transacción cambió (APPROVED, VOIDED, DECLINED, ERROR)
- `nequi_token.updated` - El estado de un token de Nequi cambió
- `bancolombia_transfer_token.updated` - El estado de un token de Bancolombia cambió

### Validación de Firma

La firma se valida siguiendo el algoritmo oficial de Wompi:

1. **Paso 1**: Concatenar los valores de `signature.properties` en orden
   - Ejemplo: `"1234-1610641025-49201APPROVED4490000"`

2. **Paso 2**: Concatenar el `timestamp` (número entero)
   - Ejemplo: `"1234-1610641025-49201APPROVED44900001530291411"`

3. **Paso 3**: Concatenar el **Secreto de Eventos** (`WOMPI_CLAVE_INTEGRIDAD`)
   - ⚠️ **IMPORTANTE**: El "Secreto de Eventos" es diferente a la Llave Privada y Llave Pública
   - Se encuentra en: Dashboard > Mi cuenta > Secretos para integración técnica
   - Ejemplo: `"1234-1610641025-49201APPROVED44900001530291411prod_events_..."`

4. **Paso 4**: Aplicar SHA256 al string concatenado
   - Resultado: `SHA256(cadena_concatenada).toUpperCase()`

La firma puede venir en:
- Header HTTP: `X-Event-Checksum`
- Body: `signature.checksum`

### Configuración de URL de Eventos

- **Sandbox**: Configura una URL diferente para pruebas
- **Producción**: Configura una URL diferente para producción
- **Requisitos**: HTTPS, método POST, responder con HTTP 200
- **Reintentos**: Wompi reintentará hasta 3 veces si no recibe HTTP 200

## 📁 Estructura de Archivos

```
backend/
├── src/
│   ├── services/
│   │   └── pagos/
│   │       ├── wompiService.js
│   │       └── README.md
│   ├── controllers/
│   │   └── pagoController.js
│   ├── routes/
│   │   └── pagos.js
│   └── config/
│       └── env.js (actualizado)

frontend/
├── core/
│   └── api/
│       └── pagosApi.ts
├── presentation/
│   └── pagos/
│       └── hooks/
│           └── usePagos.ts
└── app/
    └── (customer)/
        └── checkout.tsx (actualizado)
```

## 🔐 Seguridad

- ✅ Claves privadas nunca expuestas al frontend
- ✅ Validación de firmas en webhooks
- ✅ Validación de montos mínimos
- ✅ Referencias únicas por transacción
- ✅ Autenticación requerida en todos los endpoints (excepto webhook)

## 📝 Próximos Pasos

1. **Configurar credenciales de Wompi** en el archivo `.env`
2. **Configurar webhook** en el panel de Wompi:
   - URL: `https://tu-dominio.com/api/v1/pagos/webhook`
3. **Configurar URLs de redirección** en el archivo `.env`:
   - `WOMPI_URL_REDIRECCION`: URL HTTP/HTTPS válida (ej: `https://tu-ngrok.ngrok-free.dev/pago-exitoso`)
   - `WOMPI_URL_REDIRECCION_ERROR`: URL HTTP/HTTPS válida (ej: `https://tu-ngrok.ngrok-free.dev/pago-error`)
4. **Rutas de redirección creadas**:
   - `GET /pago-exitoso` - Página HTML que intenta abrir la app móvil después de un pago exitoso
   - `GET /pago-error` - Página HTML que intenta abrir la app móvil después de un error en el pago
5. **Probar en ambiente de pruebas** con tarjetas de prueba
6. **Implementar widget de Wompi** en frontend para pagos con tarjeta (opcional)

## 📚 Documentación Adicional

- Ver `backend/src/services/pagos/README.md` para documentación detallada del servicio
- [Documentación Oficial de Wompi](https://docs.wompi.co/)

## ⚠️ Notas Importantes

1. **Monto en Centavos**: Wompi espera el monto en centavos. El sistema convierte automáticamente.
2. **Monto Mínimo**: $1,000 COP (100,000 centavos)
3. **Ambiente**: Usar `pruebas` para desarrollo, `produccion` para producción
4. **Webhooks**: Es crítico configurar correctamente la URL del webhook

## 🐛 Troubleshooting

Si encuentras problemas:

1. Verificar que las variables de entorno estén correctamente configuradas
2. Revisar los logs del backend para ver errores de Wompi
3. Verificar que el webhook esté configurado en el panel de Wompi
4. Asegurarse de usar las claves del ambiente correcto (pruebas vs producción)
