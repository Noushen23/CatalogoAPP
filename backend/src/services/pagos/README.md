# Integración de Wompi - Pasarela de Pagos

## Descripción

Este módulo contiene la integración completa con Wompi, la pasarela de pagos de Bancolombia para Colombia. Permite procesar pagos con tarjeta de crédito/débito, PSE, Nequi y transferencias de Bancolombia.

## Estructura

```
servicios/pagos/
├── wompiService.js    # Servicio principal de integración con Wompi
└── README.md          # Esta documentación
```

## Configuración

### Variables de Entorno

Agregar las siguientes variables al archivo `.env` del backend:

```env
# Configuración de Wompi
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

### Obtener Credenciales de Wompi

1. **Registrarse en Wompi**: Visita https://wompi.co y crea una cuenta de comercio
2. **Ambiente de Pruebas**: 
   - Accede al panel de pruebas (sandbox)
   - Obtén tus claves de prueba
   - Usa `WOMPI_AMBIENTE=pruebas`
3. **Ambiente de Producción**:
   - Completa el proceso de verificación
   - Obtén tus claves de producción
   - Usa `WOMPI_AMBIENTE=produccion`

### Configuración de Webhooks

1. En el panel de Wompi, configura la URL del webhook:
   ```
   https://tu-dominio.com/api/v1/pagos/webhook
   ```
2. Wompi enviará notificaciones cuando cambie el estado de una transacción
3. El webhook valida la firma usando `WOMPI_CLAVE_INTEGRIDAD`

## Uso

### Crear una Transacción

```javascript
const wompiService = require('./services/pagos/wompiService');

const resultado = await wompiService.crearTransaccion({
  referencia: 'PED-12345-1234567890',
  monto: 100000, // En centavos (100000 = $1,000.00 COP)
  moneda: 'COP',
  cliente: {
    email: 'cliente@example.com',
    nombre: 'Juan Pérez',
    telefono: '+573001234567',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '1234567890'
  },
  metodoPago: {
    tipo: 'CARD', // 'CARD', 'PSE', 'NEQUI', 'BANCOLOMBIA_TRANSFER'
    tokenTarjeta: 'tok_test_xxxxx', // Solo para tarjeta
    cuotas: 1
  },
  urlRedireccion: 'https://tu-app.com/pago-exitoso',
  urlRedireccionError: 'https://tu-app.com/pago-error'
});
```

### Consultar Estado de Transacción

```javascript
const resultado = await wompiService.consultarTransaccion('id_transaccion_wompi');
```

### Procesar Webhook

El webhook se procesa automáticamente en la ruta `/api/v1/pagos/webhook`. El controlador valida la firma y actualiza el estado del pedido.

## Métodos de Pago Soportados

1. **Tarjeta de Crédito/Débito (CARD)**
   - Requiere token de tarjeta (generado por Wompi Widget en frontend)
   - Soporta cuotas

2. **PSE (Pagos Seguros en Línea)**
   - Requiere banco y tipo de persona
   - Redirige al banco para completar el pago

3. **Nequi**
   - Pago desde la app de Nequi
   - Requiere número de teléfono

4. **Transferencia Bancolombia**
   - Transferencia directa desde cuenta Bancolombia

## Estados de Transacción

- `PENDING`: Pago pendiente
- `APPROVED`: Pago aprobado
- `DECLINED`: Pago rechazado
- `VOIDED`: Transacción anulada

## Seguridad

- Las claves privadas nunca se exponen al frontend
- Los webhooks se validan con firma SHA256
- Todas las transacciones se registran en la base de datos
- Los montos se validan (mínimo 1000 COP)

## Notas Importantes

1. **Monto en Centavos**: Wompi espera el monto en centavos. Ejemplo: $100,000 COP = 10000000 centavos
2. **Referencias Únicas**: Cada transacción debe tener una referencia única
3. **Webhooks**: Configurar correctamente la URL del webhook en el panel de Wompi
4. **Ambiente**: Usar `pruebas` para desarrollo y `produccion` para producción

## Troubleshooting

### Error: "Clave privada inválida"
- Verificar que `WOMPI_CLAVE_PRIVADA` esté correctamente configurada
- Asegurarse de usar la clave del ambiente correcto (pruebas vs producción)

### Error: "Firma de webhook inválida"
- Verificar que `WOMPI_CLAVE_INTEGRIDAD` esté correctamente configurada
- La clave de integridad es diferente a la clave privada

### Error: "Monto mínimo no alcanzado"
- Wompi requiere un monto mínimo de 1000 COP (100000 centavos)

## Referencias

- [Documentación Oficial de Wompi](https://docs.wompi.co/)
- [Panel de Wompi](https://comercios.wompi.co/)
