# 📊 Endpoints del Dashboard - Documentación

## 🎯 Resumen de Endpoints

### **Productos** (`/api/products`)
| Método | Endpoint | Descripción | Parámetros |
|--------|----------|-------------|------------|
| GET | `/api/products` | Lista todos los productos | `limit`, `page`, `activo`, `destacado` |
| GET | `/api/products/top` | Productos populares/destacados | `limit` |
| GET | `/api/products/stats` | Estadísticas de productos | - |
| GET | `/api/products/featured` | Productos destacados | `limit` |
| GET | `/api/products/search` | Buscar productos | `q`, `categoriaId`, `precioMin`, `precioMax` |
| GET | `/api/products/:id` | Obtener producto por ID | - |

### **Pedidos** (`/api/orders`)
| Método | Endpoint | Descripción | Parámetros |
|--------|----------|-------------|------------|
| GET | `/api/orders` | Lista todos los pedidos | `limit`, `status`, `userId`, `dateFrom`, `dateTo` |
| GET | `/api/orders/recent` | Pedidos recientes | `limit` |
| GET | `/api/orders/stats` | Estadísticas de pedidos | - |
| GET | `/api/orders/:id` | Obtener pedido por ID | - |
| POST | `/api/orders` | Crear nuevo pedido | `userId`, `total`, `items`, `shippingAddress` |
| PUT | `/api/orders/:id` | Actualizar pedido (admin) | `status`, `paymentStatus` |

### **Categorías** (`/api/categories`)
| Método | Endpoint | Descripción | Parámetros |
|--------|----------|-------------|------------|
| GET | `/api/categories` | Lista todas las categorías | `limit`, `activa` |
| GET | `/api/categories/stats` | Estadísticas de categorías | - |
| GET | `/api/categories/:id` | Obtener categoría por ID | - |
| GET | `/api/categories/:id/products` | Productos de una categoría | `limit`, `activo`, `destacado` |
| GET | `/api/categories/:id/stats` | Estadísticas de categoría específica | - |

## 🔧 Componentes del Dashboard

### **DashboardStats.tsx**
**Endpoints utilizados:**
- `GET /api/products` - Para obtener total de productos y productos activos
- `GET /api/orders` - Para obtener total de pedidos e ingresos

**Datos esperados:**
```typescript
{
  totalProducts: number,
  activeProducts: number,
  totalOrders: number,
  totalRevenue: number,
  lowStockProducts: number
}
```

### **RecentOrders.tsx**
**Endpoints utilizados:**
- `GET /api/orders/recent?limit=5` - Para obtener pedidos recientes

**Datos esperados:**
```typescript
{
  data: {
    orders: [
      {
        id: string,
        user: { fullName: string, email: string },
        total: number,
        status: string
      }
    ]
  }
}
```

### **TopProducts.tsx**
**Endpoints utilizados:**
- `GET /api/products/top?limit=3` - Para obtener productos populares

**Datos esperados:**
```typescript
{
  data: {
    products: [
      {
        id: string,
        title: string,
        stock: number,
        price: number
      }
    ]
  }
}
```

## 🚨 Problemas Identificados y Solucionados

### **1. Conflicto de Rutas**
**Problema:** Las rutas específicas (`/stats`, `/recent`) estaban después de `/:id`
**Solución:** Reordenar las rutas para que las específicas vayan antes

### **2. Mapeo de Campos**
**Problema:** Frontend esperaba `isActive` y `title`, backend usaba `activo` y `nombre`
**Solución:** Agregar campos de compatibilidad en el modelo

### **3. Estructura de Respuesta**
**Problema:** Frontend esperaba arrays directos, backend devolvía objetos con `data`
**Solución:** Actualizar frontend para manejar la estructura correcta

## ✅ Estado Actual

### **Rutas Funcionando:**
- ✅ `/api/products` - Lista de productos
- ✅ `/api/products/top` - Productos populares
- ✅ `/api/products/stats` - Estadísticas de productos
- ✅ `/api/products/featured` - Productos destacados
- ✅ `/api/orders` - Lista de pedidos
- ✅ `/api/orders/recent` - Pedidos recientes
- ✅ `/api/orders/stats` - Estadísticas de pedidos
- ✅ `/api/categories` - Lista de categorías

### **Compatibilidad:**
- ✅ Rutas con y sin `/v1`
- ✅ Campos de compatibilidad (`isActive`, `title`)
- ✅ Estructura de respuesta consistente

## 🧪 Pruebas

Para probar los endpoints:

```bash
# Insertar datos de prueba
cd backend
node scripts/insert_test_data.js

# Probar endpoints
node scripts/test_dashboard_endpoints.js
```

## 📝 Notas Importantes

1. **Orden de rutas:** Las rutas específicas deben ir antes de `/:id`
2. **Compatibilidad:** Se mantienen ambos formatos de campos para compatibilidad
3. **Estructura:** Todas las respuestas siguen el formato `{ success, message, data }`
4. **Validación:** Todos los endpoints tienen validación de parámetros
5. **Autenticación:** Algunos endpoints requieren autenticación de admin
