# API de Carrito de Compras

Este documento describe los endpoints disponibles para el manejo del carrito de compras en la API de la tienda móvil.

## Autenticación

Todos los endpoints del carrito requieren autenticación mediante JWT token en el header `Authorization`:

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Obtener Carrito

**GET** `/api/v1/cart`

Obtiene el carrito activo del usuario autenticado. Si no existe un carrito activo, se crea uno nuevo.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Carrito obtenido exitosamente",
  "data": {
    "id": "uuid",
    "usuarioId": "uuid",
    "activo": true,
    "fechaCreacion": "2024-01-01T00:00:00.000Z",
    "fechaActualizacion": "2024-01-01T00:00:00.000Z",
    "items": [
      {
        "id": "uuid",
        "productoId": "uuid",
        "productoNombre": "Producto Ejemplo",
        "productoDescripcion": "Descripción del producto",
        "cantidad": 2,
        "precioUnitario": 25.99,
        "subtotal": 51.98,
        "precioOriginal": 29.99,
        "precioOferta": 25.99,
        "stock": 10,
        "productoActivo": true,
        "categoriaNombre": "Categoría",
        "imagenPrincipal": "url",
        "fechaCreacion": "2024-01-01T00:00:00.000Z",
        "fechaActualizacion": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 51.98,
    "totalItems": 2
  }
}
```

### 2. Obtener Resumen del Carrito

**GET** `/api/v1/cart/summary`

Obtiene un resumen rápido del carrito sin los detalles de los items.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Resumen del carrito obtenido exitosamente",
  "data": {
    "totalItems": 2,
    "total": 51.98,
    "isEmpty": false,
    "itemCount": 1
  }
}
```

### 3. Agregar Producto al Carrito

**POST** `/api/v1/cart/items`

Agrega un producto al carrito o actualiza la cantidad si ya existe.

**Body:**
```json
{
  "productId": "uuid",
  "quantity": 2
}
```

**Validaciones:**
- `productId`: UUID válido (requerido)
- `quantity`: Número entero mayor a 0 (opcional, default: 1)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Producto agregado al carrito exitosamente",
  "data": {
    // Datos completos del carrito actualizado
  }
}
```

**Errores posibles:**
- `400`: Producto no encontrado, producto no disponible, stock insuficiente
- `401`: Token de acceso requerido
- `403`: Token inválido o expirado

### 4. Actualizar Cantidad de Item

**PUT** `/api/v1/cart/items/:itemId`

Actualiza la cantidad de un item específico en el carrito.

**Parámetros:**
- `itemId`: UUID del item en el carrito

**Body:**
```json
{
  "quantity": 3
}
```

**Validaciones:**
- `itemId`: UUID válido (requerido)
- `quantity`: Número entero mayor a 0 (requerido)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Cantidad actualizada exitosamente",
  "data": {
    // Datos completos del carrito actualizado
  }
}
```

**Errores posibles:**
- `400`: Item no encontrado, stock insuficiente
- `404`: Item no encontrado en el carrito

### 5. Eliminar Item del Carrito

**DELETE** `/api/v1/cart/items/:itemId`

Elimina un item específico del carrito.

**Parámetros:**
- `itemId`: UUID del item en el carrito

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Producto eliminado del carrito exitosamente",
  "data": {
    // Datos completos del carrito actualizado
  }
}
```

**Errores posibles:**
- `404`: Item no encontrado en el carrito

### 6. Limpiar Carrito

**DELETE** `/api/v1/cart/clear`

Elimina todos los items del carrito.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Carrito limpiado exitosamente",
  "data": {
    // Datos completos del carrito vacío
  }
}
```

### 7. Validar Carrito para Checkout

**GET** `/api/v1/cart/validate`

Valida el carrito antes de proceder al checkout, verificando stock y disponibilidad.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Validación completada",
  "data": {
    "isValid": true,
    "errors": [],
    "cart": {
      // Datos completos del carrito
    }
  }
}
```

**Respuesta con errores (200):**
```json
{
  "success": true,
  "message": "Validación completada",
  "data": {
    "isValid": false,
    "errors": [
      "Stock insuficiente para 'Producto X'. Disponible: 5, solicitado: 10",
      "El producto 'Producto Y' ya no está disponible"
    ],
    "cart": {
      // Datos completos del carrito
    }
  }
}
```

### 8. Obtener Historial de Carritos

**GET** `/api/v1/cart/history`

Obtiene el historial de carritos del usuario.

**Query Parameters:**
- `limit`: Número de carritos a retornar (opcional, default: 10, max: 50)
- `offset`: Número de carritos a omitir (opcional, default: 0)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Historial de carritos obtenido exitosamente",
  "data": [
    {
      "id": "uuid",
      "activo": false,
      "fechaCreacion": "2024-01-01T00:00:00.000Z",
      "fechaActualizacion": "2024-01-01T00:00:00.000Z",
      "totalItems": 3,
      "total": 75.97
    }
  ]
}
```

## Códigos de Estado HTTP

- `200`: Operación exitosa
- `400`: Datos de entrada inválidos o error de validación
- `401`: Token de acceso requerido
- `403`: Token inválido o expirado
- `404`: Recurso no encontrado
- `500`: Error interno del servidor

## Notas Importantes

1. **Carrito Único**: Cada usuario tiene un solo carrito activo a la vez.

2. **Precios**: Los precios se calculan automáticamente considerando ofertas y se almacenan al momento de agregar el item.

3. **Stock**: Se valida el stock disponible antes de agregar o actualizar items.

4. **Transacciones**: Todas las operaciones de modificación del carrito se realizan en transacciones para mantener la consistencia.

5. **Validación**: El endpoint de validación es recomendado antes de proceder al checkout.

6. **Historial**: Los carritos se mantienen en el historial incluso después de ser desactivados (al completar una orden).

## Ejemplo de Uso Completo

```javascript
// 1. Obtener carrito
const cart = await fetch('/api/v1/cart', {
  headers: { 'Authorization': 'Bearer ' + token }
});

// 2. Agregar producto
await fetch('/api/v1/cart/items', {
  method: 'POST',
  headers: { 
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: 'product-uuid',
    quantity: 2
  })
});

// 3. Validar antes del checkout
const validation = await fetch('/api/v1/cart/validate', {
  headers: { 'Authorization': 'Bearer ' + token }
});

if (validation.isValid) {
  // Proceder al checkout
} else {
  // Mostrar errores al usuario
}
```

