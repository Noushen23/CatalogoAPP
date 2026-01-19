# Utilidades de Pedidos

Este directorio contiene funciones de utilidad reutilizables para manejar la lógica relacionada con los pedidos.

## 📦 Contenido

### `orderStatusUtils.ts`

Funciones centralizadas para manejar los estados de pedidos, evitando duplicación de código.

## 🎨 Estados de Pedidos

Los pedidos pueden tener los siguientes estados:

| Estado | Color | Icono | Descripción |
|--------|-------|-------|-------------|
| **pendiente** | 🟠 Naranja (`#FF9800`) | `time-outline` | Pedido recibido, esperando confirmación |
| **confirmada** | 🔵 Azul (`#2196F3`) | `checkmark-circle-outline` | Pedido confirmado, en preparación |
| **en_proceso** | 🟣 Púrpura (`#9C27B0`) | `construct-outline` | Pedido en proceso de preparación |
| **enviada** | 🔷 Índigo (`#3F51B5`) | `car-outline` | Pedido enviado al cliente |
| **entregada** | 🟢 Verde (`#4CAF50`) | `checkmark-done-outline` | Pedido entregado exitosamente |
| **cancelada** | 🔴 Rojo (`#F44336`) | `close-circle-outline` | Pedido cancelado |
| **reembolsada** | ⚫ Gris (`#607D8B`) | `refresh-outline` | Pedido reembolsado |

## 🔧 Funciones Principales

### `getOrderStatusColor(status)`

Obtiene el color asociado a un estado de pedido.

```typescript
import { getOrderStatusColor } from '@/presentation/orders/utils';

const color = getOrderStatusColor('entregada'); // '#4CAF50'
```

### `getOrderStatusText(status)`

Obtiene el texto legible de un estado de pedido.

```typescript
import { getOrderStatusText } from '@/presentation/orders/utils';

const text = getOrderStatusText('en_proceso'); // 'En Proceso'
```

### `getOrderStatusIcon(status)`

Obtiene el icono (de Ionicons) asociado a un estado de pedido.

```typescript
import { getOrderStatusIcon } from '@/presentation/orders/utils';

const icon = getOrderStatusIcon('enviada'); // 'car-outline'
```

### `getOrderStatusInfo(status)`

Obtiene toda la información del estado en un solo objeto.

```typescript
import { getOrderStatusInfo } from '@/presentation/orders/utils';

const info = getOrderStatusInfo('entregada');
// {
//   color: '#4CAF50',
//   text: 'Entregada',
//   icon: 'checkmark-done-outline',
//   backgroundColor: '#4CAF5020', // 20% opacidad
//   borderColor: '#4CAF5040'       // 40% opacidad
// }
```

## 🔍 Funciones de Validación

### `isOrderStatusFinal(status)`

Verifica si un estado es final (no puede cambiar).

```typescript
import { isOrderStatusFinal } from '@/presentation/orders/utils';

isOrderStatusFinal('entregada');  // true
isOrderStatusFinal('en_proceso'); // false
```

### `canCancelOrder(status, referenciaPago?)`

Verifica si un pedido puede ser cancelado. Un pedido no puede ser cancelado si:
- No está en estado 'pendiente'
- Tiene una referencia de pago (está pagado)

```typescript
import { canCancelOrder } from '@/presentation/orders/utils';

canCancelOrder('pendiente');  // true
canCancelOrder('pendiente', 'REF-123');  // false (está pagado)
canCancelOrder('entregada');  // false
```

### `getNextOrderStatus(status)`

Obtiene el siguiente estado posible en el flujo del pedido.

```typescript
import { getNextOrderStatus } from '@/presentation/orders/utils';

getNextOrderStatus('pendiente');  // 'confirmada'
getNextOrderStatus('entregada');  // null (estado final)
```

## 🎯 Uso en Componentes

### Ejemplo Básico

```typescript
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { getOrderStatusColor, getOrderStatusText, getOrderStatusIcon } from '@/presentation/orders/utils';

interface OrderStatusBadgeProps {
  status: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const color = getOrderStatusColor(status);
  const text = getOrderStatusText(status);
  const icon = getOrderStatusIcon(status);

  return (
    <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={16} color={color} />
      <ThemedText style={{ color }}>{text}</ThemedText>
    </View>
  );
};
```

### Ejemplo Avanzado (Usando `getOrderStatusInfo`)

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { getOrderStatusInfo } from '@/presentation/orders/utils';

interface OrderCardProps {
  order: Order;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  // Obtener toda la información del estado de una vez
  const statusInfo = getOrderStatusInfo(order.estado);

  return (
    <View style={styles.card}>
      <View style={[styles.statusBadge, { 
        backgroundColor: statusInfo.backgroundColor,
        borderColor: statusInfo.borderColor 
      }]}>
        <Ionicons 
          name={statusInfo.icon} 
          size={20} 
          color={statusInfo.color} 
        />
        <ThemedText style={{ color: statusInfo.color }}>
          {statusInfo.text}
        </ThemedText>
      </View>
      
      <ThemedText>Pedido #{order.numeroOrden}</ThemedText>
      <ThemedText>${order.total}</ThemedText>
    </View>
  );
};
```

## 📝 Componentes Refactorizados

Los siguientes componentes fueron refactorizados para usar estas utilidades:

- ✅ `presentation/orders/components/OrderItem.tsx`
- ✅ `presentation/orders/components/OrderDetail.tsx`
- ✅ `app/(customer)/order-confirmation/[id].tsx`

**Código eliminado**: ~180 líneas de funciones duplicadas

## 💡 Beneficios

### 1. **DRY (Don't Repeat Yourself)**
- Las funciones de estado están centralizadas en un solo lugar
- No más copiar/pegar las mismas funciones en múltiples componentes

### 2. **Consistencia**
- Todos los componentes muestran los mismos colores para cada estado
- Los textos e iconos son consistentes en toda la aplicación

### 3. **Mantenibilidad**
- Cambiar un color o icono se hace en un solo lugar
- Fácil agregar nuevos estados al sistema

### 4. **Tipado Fuerte**
- Tipos TypeScript para todos los estados
- Autocompletado en el IDE para nombres de estados

### 5. **Validación de Negocio**
- Funciones de validación como `canCancelOrder` centralizan las reglas de negocio
- Flujo de estados definido en `getNextOrderStatus`

## 🔮 Extensibilidad

### Agregar un Nuevo Estado

Para agregar un nuevo estado al sistema:

1. Actualizar el tipo `OrderStatus`:
```typescript
export type OrderStatus = 
  | 'pendiente'
  | 'confirmada'
  // ... estados existentes
  | 'nuevo_estado'; // ✨ Nuevo estado
```

2. Agregar configuración del estado:
```typescript
const STATUS_COLORS: Record<OrderStatus, string> = {
  // ... estados existentes
  nuevo_estado: '#YOUR_COLOR',
};

const STATUS_TEXTS: Record<OrderStatus, string> = {
  // ... estados existentes
  nuevo_estado: 'Texto Descriptivo',
};

const STATUS_ICONS: Record<OrderStatus, keyof typeof Ionicons.glyphMap> = {
  // ... estados existentes
  nuevo_estado: 'icon-name',
};
```

3. Actualizar el flujo de estados si es necesario:
```typescript
const statusFlow: Record<OrderStatus, OrderStatus | null> = {
  // ... flujos existentes
  nuevo_estado: 'siguiente_estado',
};
```

¡Eso es todo! El cambio se reflejará automáticamente en todos los componentes que usen estas utilidades.

## 🌍 Internacionalización (i18n)

Para soportar múltiples idiomas en el futuro, puedes modificar `getOrderStatusText` para usar un sistema de traducciones:

```typescript
import i18n from '@/i18n';

export function getOrderStatusText(status: string): string {
  return i18n.t(`order.status.${status}`);
}
```

## 📚 Referencias

- [Ionicons](https://ionic.io/ionicons) - Iconos utilizados
- [Material Design Colors](https://m2.material.io/design/color/) - Paleta de colores
- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) - Tipos de utilidad

