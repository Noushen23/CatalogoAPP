# Documentación de Endpoints de Pedidos

## Información General

Los endpoints de pedidos permiten gestionar órdenes de compra de los usuarios, incluyendo creación desde carrito, consulta, cancelación y seguimiento de estados.

**Base URL:** `/api/v1/orders`

## Autenticación

Todos los endpoints requieren autenticación mediante token Bearer, excepto los endpoints de administrador que requieren rol de admin.

## Endpoints de Usuario

### 1. Obtener Pedidos del Usuario

**GET** `/my-orders`

Obtiene la lista de pedidos del usuario autenticado.

#### Parámetros de Query

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `estado` | string | No | Filtrar por estado: `pendiente`, `confirmada`, `en_proceso`, `enviada`, `entregada`, `cancelada`, `reembolsada` |
| `limit` | number | No | Límite de resultados (default: 20, max: 100) |
| `offset` | number | No | Offset para paginación (default: 0) |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Pedidos obtenidos exitosamente",
  "data": {
    "orders": [
      {
        "id": "uuid",
        "numeroOrden": "ORD-20241201-001",
        "estado": "pendiente",
        "total": 50000,
        "fechaCreacion": "2024-12-01T10:00:00Z",
        "fechaActualizacion": "2024-12-01T10:00:00Z",
        "itemsCount": 3,
        "metodoPago": "efectivo"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 1
    }
  }
}
```

### 2. Obtener Pedido Específico

**GET** `/my-orders/{id}`

Obtiene los detalles completos de un pedido específico del usuario.

#### Parámetros de Ruta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | UUID | Sí | ID del pedido |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Pedido obtenido exitosamente",
  "data": {
    "id": "uuid",
    "numeroOrden": "ORD-20241201-001",
    "usuarioId": "uuid",
    "direccionEnvioId": "uuid",
    "estado": "pendiente",
    "subtotal": 45000,
    "descuento": 0,
    "costoEnvio": 5000,
    "impuestos": 0,
    "total": 50000,
    "metodoPago": "efectivo",
    "referenciaPago": "REF-001",
    "notas": "Pedido de prueba",
    "fechaCreacion": "2024-12-01T10:00:00Z",
    "fechaActualizacion": "2024-12-01T10:00:00Z",
    "fechaEntregaEstimada": null,
    "fechaEntregaReal": null,
    "usuario": {
      "email": "usuario@example.com",
      "nombreCompleto": "Juan Pérez"
    },
    "direccionEnvio": {
      "nombreDestinatario": "Juan Pérez",
      "telefono": "3001234567",
      "direccion": "Calle 123 #45-67",
      "ciudad": "Bogotá",
      "departamento": "Cundinamarca"
    },
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "productName": "Producto 1",
        "productDescription": "Descripción del producto",
        "quantity": 2,
        "unitPrice": 15000,
        "subtotal": 30000,
        "imageUrl": "https://example.com/image.jpg"
      }
    ]
  }
}
```

### 3. Crear Pedido desde Carrito

**POST** `/create-from-cart`

Crea un nuevo pedido a partir de los productos en el carrito del usuario.

#### Cuerpo de la Petición

```json
{
  "direccionEnvioId": "uuid",
  "metodoPago": "efectivo",
  "referenciaPago": "REF-001",
  "notas": "Notas adicionales del pedido"
}
```

#### Parámetros del Cuerpo

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `direccionEnvioId` | UUID | No | ID de la dirección de envío |
| `metodoPago` | string | No | Método de pago: `efectivo`, `tarjeta`, `transferencia`, `pse` (default: `efectivo`) |
| `referenciaPago` | string | No | Referencia del pago (máx: 100 caracteres) |
| `notas` | string | No | Notas adicionales (máx: 500 caracteres) |

#### Respuesta Exitosa (201)

```json
{
  "success": true,
  "message": "Pedido creado exitosamente",
  "data": {
    "id": "uuid",
    "numeroOrden": "ORD-20241201-001",
    "estado": "pendiente",
    "total": 50000,
    "items": [...],
    "fechaCreacion": "2024-12-01T10:00:00Z"
  }
}
```

#### Errores Posibles

- **400**: Carrito vacío
- **400**: Error de validación del carrito
- **500**: Error interno del servidor

### 4. Cancelar Pedido

**PUT** `/my-orders/{id}/cancel`

Cancela un pedido del usuario (solo si está en estado `pendiente` o `confirmada`).

#### Parámetros de Ruta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | UUID | Sí | ID del pedido |

#### Cuerpo de la Petición

```json
{
  "reason": "Motivo de la cancelación"
}
```

#### Parámetros del Cuerpo

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `reason` | string | No | Motivo de la cancelación (máx: 200 caracteres) |

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Pedido cancelado exitosamente",
  "data": {
    "id": "uuid",
    "numeroOrden": "ORD-20241201-001",
    "estado": "cancelada",
    "notas": "Pedido cancelado: Motivo de la cancelación",
    "fechaActualizacion": "2024-12-01T10:30:00Z"
  }
}
```

#### Errores Posibles

- **400**: No se puede cancelar un pedido ya entregado
- **400**: El pedido ya está cancelado
- **403**: No tienes permisos para cancelar este pedido
- **404**: Pedido no encontrado

### 5. Obtener Estadísticas de Pedidos

**GET** `/my-stats`

Obtiene estadísticas de pedidos del usuario autenticado.

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "totalOrders": 10,
    "pendingOrders": 2,
    "confirmedOrders": 1,
    "shippedOrders": 3,
    "deliveredOrders": 3,
    "cancelledOrders": 1,
    "totalSpent": 250000,
    "averageOrderValue": 25000
  }
}
```

## Endpoints de Administrador

### 6. Obtener Todos los Pedidos

**GET** `/`

Obtiene todos los pedidos del sistema (requiere rol de admin).

#### Parámetros de Query

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `estado` | string | No | Filtrar por estado |
| `usuarioId` | UUID | No | Filtrar por usuario |
| `fechaDesde` | date | No | Filtrar desde fecha (YYYY-MM-DD) |
| `fechaHasta` | date | No | Filtrar hasta fecha (YYYY-MM-DD) |
| `limit` | number | No | Límite de resultados (default: 50) |
| `offset` | number | No | Offset para paginación |
| `orderBy` | string | No | Campo de ordenamiento (default: `fecha_creacion`) |
| `orderDir` | string | No | Dirección de ordenamiento: `ASC` o `DESC` (default: `DESC`) |

### 7. Actualizar Estado de Pedido

**PUT** `/{id}/status`

Actualiza el estado de un pedido (requiere rol de admin).

#### Parámetros de Ruta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | UUID | Sí | ID del pedido |

#### Cuerpo de la Petición

```json
{
  "estado": "confirmada",
  "notas": "Pedido confirmado por el administrador"
}
```

#### Parámetros del Cuerpo

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `estado` | string | Sí | Nuevo estado: `pendiente`, `confirmada`, `en_proceso`, `enviada`, `entregada`, `cancelada`, `reembolsada` |
| `notas` | string | No | Notas adicionales (máx: 500 caracteres) |

### 8. Obtener Estadísticas Generales

**GET** `/stats`

Obtiene estadísticas generales de todos los pedidos (requiere rol de admin).

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "totalOrders": 150,
    "pendingOrders": 10,
    "confirmedOrders": 15,
    "shippedOrders": 25,
    "deliveredOrders": 90,
    "cancelledOrders": 10,
    "totalRevenue": 1500000,
    "averageOrderValue": 10000
  }
}
```

## Estados de Pedidos

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Pedido creado, esperando confirmación |
| `confirmada` | Pedido confirmado por el administrador |
| `en_proceso` | Pedido en proceso de preparación |
| `enviada` | Pedido enviado al cliente |
| `entregada` | Pedido entregado exitosamente |
| `cancelada` | Pedido cancelado |
| `reembolsada` | Pedido reembolsado |

## Métodos de Pago

| Método | Descripción |
|--------|-------------|
| `efectivo` | Pago en efectivo |
| `tarjeta` | Pago con tarjeta de crédito/débito |
| `transferencia` | Transferencia bancaria |
| `pse` | Pago con PSE |

## Códigos de Error Comunes

| Código | Descripción |
|--------|-------------|
| 400 | Solicitud malformada o datos inválidos |
| 401 | No autenticado |
| 403 | Sin permisos para realizar la acción |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

## Ejemplos de Uso

### Crear Pedido desde Carrito

```javascript
const response = await fetch('/api/v1/orders/create-from-cart', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    direccionEnvioId: 'uuid-direccion',
    metodoPago: 'efectivo',
    notas: 'Entregar en horario de oficina'
  })
});

const result = await response.json();
if (result.success) {
  console.log('Pedido creado:', result.data.numeroOrden);
}
```

### Obtener Pedidos con Filtro

```javascript
const response = await fetch('/api/v1/orders/my-orders?estado=pendiente&limit=10', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const result = await response.json();
if (result.success) {
  console.log('Pedidos pendientes:', result.data.orders);
}
```

### Cancelar Pedido

```javascript
const response = await fetch('/api/v1/orders/my-orders/uuid/cancel', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    reason: 'Cambio de opinión'
  })
});

const result = await response.json();
if (result.success) {
  console.log('Pedido cancelado exitosamente');
}
```




























