# Frontend del Carrito de Compras

Este documento describe la implementación del frontend del carrito de compras en la aplicación móvil React Native.

## Estructura de Archivos

```
core/api/cartApi.ts                    # API del carrito
presentation/cart/
├── hooks/
│   └── useCart.ts                     # Hooks para gestión del carrito
└── components/
    ├── CartItem.tsx                   # Componente de item del carrito
    ├── CartSummary.tsx                # Componente de resumen del carrito
    └── CartIndicator.tsx              # Indicador del carrito
app/(customer)/
├── cart.tsx                           # Pantalla principal del carrito
└── catalog.tsx                        # Catálogo con integración del carrito
```

## Componentes Implementados

### 1. CartItem
**Ubicación:** `presentation/cart/components/CartItem.tsx`

Componente que representa un item individual del carrito.

**Características:**
- Muestra imagen, nombre, categoría y precio del producto
- Controles para aumentar/disminuir cantidad
- Botón para eliminar item
- Validación de stock disponible
- Cálculo automático de subtotal
- Indicadores de ofertas y disponibilidad

**Props:**
```typescript
interface CartItemProps {
  item: CartItemType;
  onQuantityChange?: () => void;
}
```

### 2. CartSummary
**Ubicación:** `presentation/cart/components/CartSummary.tsx`

Componente que muestra el resumen del carrito y botones de acción.

**Características:**
- Resumen de productos y totales
- Botón para proceder al pago
- Botón para limpiar carrito
- Validación del carrito antes del checkout
- Información de seguridad y garantías

**Props:**
```typescript
interface CartSummaryProps {
  total: number;
  totalItems: number;
  onCheckout?: () => void;
  onClearCart?: () => void;
}
```

### 3. CartIndicator
**Ubicación:** `presentation/cart/components/CartIndicator.tsx`

Indicador compacto del carrito para usar en headers y navegación.

**Características:**
- Muestra cantidad de items con badge
- Muestra total del carrito
- Diferentes tamaños (small, medium, large)
- Opción de mostrar/ocultar texto
- Navegación al carrito

**Props:**
```typescript
interface CartIndicatorProps {
  onPress?: () => void;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}
```

## Hooks Implementados

### useCart
Hook principal para obtener el carrito completo.

```typescript
const { data: cart, isLoading, error, refetch } = useCart();
```

### useCartSummary
Hook para obtener resumen rápido del carrito.

```typescript
const { data: cartSummary } = useCartSummary();
```

### useAddToCart
Hook para agregar productos al carrito.

```typescript
const addToCartMutation = useAddToCart();
await addToCartMutation.mutateAsync({ productId, quantity });
```

### useUpdateCartItem
Hook para actualizar cantidad de items.

```typescript
const updateItemMutation = useUpdateCartItem();
await updateItemMutation.mutateAsync({ itemId, data: { quantity } });
```

### useRemoveFromCart
Hook para eliminar items del carrito.

```typescript
const removeItemMutation = useRemoveFromCart();
await removeItemMutation.mutateAsync(itemId);
```

### useClearCart
Hook para limpiar todo el carrito.

```typescript
const clearCartMutation = useClearCart();
await clearCartMutation.mutateAsync();
```

### useValidateCart
Hook para validar el carrito antes del checkout.

```typescript
const validateCartQuery = useValidateCart();
const validation = await validateCartQuery.refetch();
```

## Pantallas Implementadas

### Pantalla del Carrito
**Ubicación:** `app/(customer)/cart.tsx`

Pantalla principal que muestra el carrito completo del usuario.

**Características:**
- Lista de todos los items del carrito
- Resumen con totales y botones de acción
- Estados de carga y error
- Pull-to-refresh
- Carrito vacío con navegación al catálogo
- Validación antes del checkout

**Funcionalidades:**
- Ver todos los productos en el carrito
- Modificar cantidades
- Eliminar productos individuales
- Limpiar carrito completo
- Proceder al pago (preparado para implementación futura)

### Integración en el Catálogo
**Ubicación:** `app/(customer)/catalog.tsx`

El catálogo ahora incluye funcionalidad completa del carrito.

**Características:**
- Botón "Agregar al carrito" en cada producto
- Indicador del carrito en el header
- Navegación directa al carrito
- Feedback visual al agregar productos
- Validación de stock antes de agregar

## API Integration

### cartApi
**Ubicación:** `core/api/cartApi.ts`

Cliente API para todas las operaciones del carrito.

**Métodos disponibles:**
- `getCart()` - Obtener carrito completo
- `getCartSummary()` - Obtener resumen
- `addItem(data)` - Agregar producto
- `updateItemQuantity(itemId, data)` - Actualizar cantidad
- `removeItem(itemId)` - Eliminar item
- `clearCart()` - Limpiar carrito
- `validateCart()` - Validar carrito
- `getCartHistory(params)` - Obtener historial

## Estados y Manejo de Errores

### Estados de Carga
- Loading inicial del carrito
- Loading al agregar productos
- Loading al actualizar cantidades
- Loading al eliminar items

### Manejo de Errores
- Errores de red
- Errores de validación (stock insuficiente)
- Errores de autenticación
- Mensajes de error amigables al usuario

### Validaciones
- Stock disponible antes de agregar
- Cantidades mínimas y máximas
- Productos activos
- Carrito válido para checkout

## UX/UI Features

### Feedback Visual
- Animaciones de carga
- Confirmaciones de acciones
- Estados de éxito y error
- Indicadores de progreso

### Navegación
- Navegación fluida entre pantallas
- Breadcrumbs implícitos
- Botones de retroceso
- Deep linking preparado

### Responsive Design
- Adaptable a diferentes tamaños de pantalla
- Orientación portrait/landscape
- Accesibilidad mejorada

## Integración con Backend

### Autenticación
- Todos los endpoints requieren JWT token
- Manejo automático de tokens expirados
- Refresh automático de tokens

### Sincronización
- Cache inteligente con React Query
- Invalidación automática de cache
- Sincronización en tiempo real

### Offline Support
- Cache local para operaciones offline
- Sincronización al recuperar conexión
- Estados de conexión

## Próximas Implementaciones

### Checkout
- Pantalla de checkout completa
- Selección de método de pago
- Direcciones de envío
- Confirmación de pedido

### Notificaciones
- Push notifications para carrito abandonado
- Notificaciones de stock bajo
- Alertas de ofertas

### Analytics
- Tracking de eventos del carrito
- Métricas de conversión
- Análisis de comportamiento

## Testing

### Unit Tests
- Tests para todos los hooks
- Tests para componentes individuales
- Tests para funciones utilitarias

### Integration Tests
- Tests de flujo completo del carrito
- Tests de integración con API
- Tests de navegación

### E2E Tests
- Tests de usuario completo
- Tests de diferentes escenarios
- Tests de performance

## Performance

### Optimizaciones
- Lazy loading de componentes
- Memoización de componentes pesados
- Optimización de re-renders
- Bundle splitting

### Monitoring
- Métricas de performance
- Tracking de errores
- Análisis de uso
- Optimización continua




























