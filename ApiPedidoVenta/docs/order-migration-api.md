# API de Migración de Órdenes a TNS

## Descripción
API para migrar órdenes desde las tablas `ordenes` e `items_orden` al sistema TNS, incluyendo el proceso de `orderDetail`.

## Base URL
```
http://localhost:51250/api/orders
```

## Endpoints Disponibles

### 1. Obtener Detalles de Orden
**GET** `/api/orders/:id/detail`

Obtiene los detalles de una orden y su estado de migración a TNS.

#### Parámetros
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | ID único de la orden (UUID) |

#### Respuesta Exitosa
```json
{
  "success": true,
  "data": {
    "orden": {
      "id": "uuid-123",
      "numero_orden": "ORD-001",
      "estado": "confirmada",
      "total": 25000.00,
      "fecha_creacion": "2025-01-15T10:30:00Z",
      "tns_kardex_id": 170671,
      "tns_numero": "00000034",
      "tns_sincronizado": "sincronizado",
      "tns_fecha_sincronizacion": "2025-01-15T14:30:00Z",
      "tns_error_message": null,
      "CLIENTE_NOMBRE": "Cliente Ejemplo",
      "CLIENTE_NIT": "12345678"
    },
    "items": [
      {
        "id": "item-uuid-1",
        "producto_id": "SKU-001",
        "cantidad": 2,
        "precio_unitario": 10000.00,
        "subtotal": 20000.00,
        "tns_dekardex_id": 12345,
        "tns_matid": 1,
        "tns_codigo_material": "MAT001",
        "tns_nombre_material": "Material Ejemplo",
        "tns_precio_tns": 10000.00,
        "tns_sincronizado": "sincronizado",
        "MATERIAL_CODIGO_TNS": "MAT001",
        "MATERIAL_NOMBRE_TNS": "Material Ejemplo"
      }
    ],
    "migrationStatus": {
      "ordenSincronizada": true,
      "itemsSincronizados": 1,
      "totalItems": 1,
      "tieneErrores": false
    }
  }
}
```

### 2. Solo Migrar Orden
**POST** `/api/orders/:id/migrate`

Migra la orden a TNS sin iniciar preparación.

#### Payload
```json
{
  "usuario": "MOBILE_USER",
  "codprefijo": "PA",
  "codcomp": "PV",
  "sucid": 1
}
```

#### Respuesta Exitosa
```json
{
  "success": true,
  "message": "Orden migrada exitosamente a TNS",
  "data": {
    "ordenId": "uuid-123",
    "tnsKardexId": 170671,
    "tnsNumero": "00000034",
    "terceroId": 1453,
    "vendedorId": 17,
    "total": 25000.00,
    "itemsCount": 1,
    "dekardexIds": [12345],
    "estado": "MIGRADO_PENDIENTE"
  }
}
```

### 3. Estado de Migración
**GET** `/api/orders/migration-status`

Obtiene el estado de migración de múltiples órdenes.

#### Query Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `estado` | string | Filtrar por estado: 'pendiente', 'sincronizado', 'error' |
| `limit` | number | Límite de resultados (default: 50) |
| `page` | number | Página actual (default: 1) |
| `fechaDesde` | string | Fecha desde (YYYY-MM-DD) |
| `fechaHasta` | string | Fecha hasta (YYYY-MM-DD) |

#### Respuesta
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "numero_orden": "ORD-001",
      "estado": "confirmada",
      "total": 25000.00,
      "fecha_creacion": "2025-01-15T10:30:00Z",
      "tns_kardex_id": 170671,
      "tns_numero": "00000034",
      "tns_sincronizado": "sincronizado",
      "tns_fecha_sincronizacion": "2025-01-15T14:30:00Z",
      "tns_error_message": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

### 4. Reintentar Migración
**PUT** `/api/orders/:id/retry-migration`

Reintenta la migración de una orden que tuvo errores.

#### Payload
```json
{
  "usuario": "MOBILE_RETRY",
  "codprefijo": "PA",
  "codcomp": "PV",
  "sucid": 1
}
```

#### Respuesta Exitosa
```json
{
  "success": true,
  "message": "Migración reintentada exitosamente",
  "data": {
    "ordenId": "uuid-123",
    "tnsKardexId": 170671,
    "tnsNumero": "00000034",
    "estado": "MIGRADO_EXITOSO"
  }
}
```

## Flujo de Migración

### 1. Validaciones Previas
- ✅ Orden existe en tabla `ordenes`
- ✅ Items existen en tabla `items_orden`
- ✅ `tercero_id` existe en tabla `TERCEROS` de TNS
- ✅ Cliente es activo (`CLIENTE = 'S'`)
- ✅ Vendedor existe y es activo (`VENDED = 'S'`)
- ✅ SKUs de productos existen en tabla `MATERIAL` de TNS

### 2. Mapeo de Datos

#### Ordenes → KARDEX
| Campo Ordenes | Campo TNS | Descripción |
|---------------|-----------|-------------|
| `id` | - | UUID único móvil |
| `numero_orden` | `NUMERO` | Número de orden |
| `tercero_id` | `CLIENTE` | ID del cliente |
| `usuario_id` | `VENDEDOR` | ID del vendedor |
| `total` | `TOTAL` | Total del pedido |
| `fecha_creacion` | `FECHA` | Fecha de creación |
| `notas` | `OBSERV` | Observaciones |

#### Items_Orden → DEKARDEX
| Campo Items_Orden | Campo TNS | Descripción |
|-------------------|-----------|-------------|
| `orden_id` | `KARDEXID` | Referencia al pedido |
| `producto_id` (SKU) | `MATID` | ID del material |
| `cantidad` | `CANMAT` | Cantidad |
| `precio_unitario` | `PRECIOVTA` | Precio de venta |
| `subtotal` | `TOTAL` | Subtotal |

### 3. Proceso de Migración
1. **Validar datos**: Cliente, vendedor, materiales
2. **Crear KARDEX**: Encabezado del pedido
3. **Crear DEKARDEX**: Líneas del pedido
4. **Actualizar ordenes**: Campos TNS
5. **Actualizar items_orden**: Campos TNS

## Estados de Migración

### `tns_sincronizado`
- **`pendiente`**: Orden no migrada
- **`sincronizado`**: Migración exitosa
- **`error`**: Error en migración

### Estados de Orden
- **`MIGRADO_PENDIENTE`**: Migrado sin iniciar preparación
- **`MIGRADO_EXITOSO`**: Migración completada

## Ejemplos de Uso

### Obtener Detalles de Orden
```bash
curl "http://localhost:51250/api/orders/uuid-123/detail"
```

### Solo Migrar
```bash
curl -X POST "http://localhost:51250/api/orders/uuid-123/migrate" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "MOBILE_USER"
  }'
```

### Ver Estado de Migración
```bash
curl "http://localhost:51250/api/orders/migration-status?estado=pendiente&limit=10"
```

### Reintentar Migración
```bash
curl -X PUT "http://localhost:51250/api/orders/uuid-123/retry-migration" \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "MOBILE_RETRY"
  }'
```

## Códigos de Error

### Error de Orden No Encontrada (404)
```json
{
  "success": false,
  "error": "ORDER_NOT_FOUND",
  "message": "Orden uuid-123 no encontrada"
}
```

### Error de Entidad TNS No Encontrada (400)
```json
{
  "success": false,
  "error": "TNS_ENTITY_NOT_FOUND",
  "message": "Material con SKU SKU-001 no encontrado en TNS"
}
```

### Error de Cliente Inválido (400)
```json
{
  "success": false,
  "error": "INVALID_CLIENT",
  "message": "Tercero 1453 no es cliente activo en TNS"
}
```

### Error de Estado Inválido (400)
```json
{
  "success": false,
  "error": "INVALID_STATE",
  "message": "La orden no tiene errores de migración"
}
```

## Consideraciones Técnicas

### Transacciones
- Todas las operaciones de migración son transaccionales
- Rollback automático en caso de error
- Integridad de datos garantizada

### Validaciones
- Verificación de existencia de entidades TNS
- Validación de estados de cliente/vendedor
- Mapeo correcto de SKUs a materiales

### Performance
- Índices optimizados para consultas TNS
- Búsquedas eficientes por tercero_id y SKU
- Paginación en consultas de estado

### Logging
- Registro de todas las operaciones de migración
- Trazabilidad completa del proceso
- Manejo de errores detallado
