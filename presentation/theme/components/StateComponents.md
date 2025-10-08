# Componentes de Estado

Esta carpeta contiene componentes reutilizables para manejar diferentes estados de la UI de forma consistente en toda la aplicación.

## 🎯 Componentes Disponibles

### 1. FullScreenLoader

Muestra un indicador de carga a pantalla completa con mensaje opcional.

**Props:**
- `message?: string` - Mensaje a mostrar (default: "Cargando...")
- `size?: 'small' | 'large'` - Tamaño del indicador (default: 'large')
- `color?: string` - Color personalizado del indicador
- `style?: ViewStyle` - Estilos adicionales

**Ejemplo:**
```tsx
if (isLoading) {
  return <FullScreenLoader message="Cargando productos..." />;
}
```

### 2. ErrorDisplay

Muestra errores de forma consistente con opción de reintentar.

**Props:**
- `title?: string` - Título del error (default: "Error al cargar")
- `message?: string` - Mensaje descriptivo
- `error?: Error | unknown` - Objeto de error
- `onRetry?: () => void` - Función de reintentar
- `retryText?: string` - Texto del botón (default: "Reintentar")
- `iconSize?: number` - Tamaño del icono (default: 60)
- `iconName?: IconName` - Icono personalizado
- `iconColor?: string` - Color del icono (default: "#F44336")
- `style?: ViewStyle` - Estilos adicionales

**Ejemplo:**
```tsx
if (error) {
  return (
    <ErrorDisplay
      title="Error al cargar productos"
      error={error}
      onRetry={() => refetch()}
    />
  );
}
```

### 3. EmptyState

Muestra estados vacíos con opción de acción.

**Props:**
- `icon?: IconName` - Icono a mostrar (default: "cube-outline")
- `iconSize?: number` - Tamaño del icono (default: 80)
- `iconColor?: string` - Color del icono (default: "#ccc")
- `title?: string` - Título (default: "No hay elementos")
- `description?: string` - Descripción
- `actionText?: string` - Texto del botón de acción
- `onAction?: () => void` - Función del botón
- `actionIcon?: IconName` - Icono del botón (default: "add-circle-outline")
- `style?: ViewStyle` - Estilos adicionales

**Ejemplo:**
```tsx
if (items.length === 0) {
  return (
    <EmptyState
      icon="cart-outline"
      title="Carrito vacío"
      description="Agrega productos para continuar"
      actionText="Ver productos"
      onAction={() => router.push('/products')}
    />
  );
}
```

## 📦 Uso

### Importación Individual

```tsx
import { FullScreenLoader } from '@/presentation/theme/components/FullScreenLoader';
import { ErrorDisplay } from '@/presentation/theme/components/ErrorDisplay';
import { EmptyState } from '@/presentation/theme/components/EmptyState';
```

### Patrón Común

```tsx
import { FullScreenLoader } from '@/presentation/theme/components/FullScreenLoader';
import { ErrorDisplay } from '@/presentation/theme/components/ErrorDisplay';
import { EmptyState } from '@/presentation/theme/components/EmptyState';

export default function MyScreen() {
  const { data, isLoading, error, refetch } = useMyData();

  // Estado de carga
  if (isLoading) {
    return <FullScreenLoader message="Cargando datos..." />;
  }

  // Estado de error
  if (error) {
    return (
      <ErrorDisplay
        title="Error al cargar datos"
        error={error}
        onRetry={refetch}
      />
    );
  }

  // Estado vacío
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="folder-outline"
        title="No hay datos"
        description="Comienza agregando elementos"
        actionText="Agregar"
        onAction={() => /* ... */}
      />
    );
  }

  // Estado con datos
  return (
    <View>
      {/* Tu contenido */}
    </View>
  );
}
```

## 🎨 Personalización

### FullScreenLoader con Color Personalizado

```tsx
<FullScreenLoader
  message="Procesando pago..."
  color="#4CAF50"
  size="small"
/>
```

### ErrorDisplay con Icono Personalizado

```tsx
<ErrorDisplay
  title="Sin conexión"
  message="Verifica tu conexión a internet"
  iconName="wifi-outline"
  iconColor="#FF9800"
  onRetry={handleRetry}
/>
```

### EmptyState sin Botón de Acción

```tsx
<EmptyState
  icon="search-outline"
  title="Sin resultados"
  description="No se encontraron productos"
  // Sin actionText ni onAction
/>
```

## ✨ Beneficios

1. **Consistencia**: UI uniforme en toda la app
2. **DRY**: No repetir código de estados
3. **Mantenibilidad**: Un solo lugar para actualizar
4. **Type Safety**: Props totalmente tipadas
5. **Personalización**: Altamente configurable
6. **Accesibilidad**: Mensajes claros y útiles

## 📊 Uso en la Aplicación

Estos componentes se usan en:

| Pantalla | Componentes Usados |
|----------|-------------------|
| `cart.tsx` | FullScreenLoader, ErrorDisplay, EmptyState |
| `orders/index.tsx` | FullScreenLoader, ErrorDisplay, EmptyState |
| `favorites.tsx` | FullScreenLoader, ErrorDisplay, EmptyState |
| `checkout.tsx` | ErrorDisplay |
| Próximamente... | Más pantallas |

## 🔧 Mejores Prácticas

1. **Usa mensajes descriptivos**: "Cargando productos..." en lugar de "Cargando..."
2. **Siempre proporciona onRetry** para errores recuperables
3. **Usa iconos relevantes** para el contexto
4. **Mantén descripciones concisas** pero informativas
5. **Proporciona acciones** cuando sea apropiado

## 🚀 Antes y Después

### Antes ❌

```tsx
if (isLoading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={tintColor} />
      <ThemedText style={styles.loadingText}>Cargando...</ThemedText>
    </View>
  );
}

if (error) {
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={60} color="#F44336" />
      <ThemedText style={styles.errorText}>Error</ThemedText>
      <ThemedText>{error.message}</ThemedText>
    </View>
  );
}

if (items.length === 0) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder" size={80} color="#ccc" />
      <ThemedText>No hay elementos</ThemedText>
      <TouchableOpacity onPress={handleAdd}>
        <Text>Agregar</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Después ✅

```tsx
if (isLoading) {
  return <FullScreenLoader message="Cargando..." />;
}

if (error) {
  return <ErrorDisplay error={error} onRetry={refetch} />;
}

if (items.length === 0) {
  return (
    <EmptyState
      title="No hay elementos"
      actionText="Agregar"
      onAction={handleAdd}
    />
  );
}
```

**Reducción de código**: ~70% menos líneas por pantalla!

