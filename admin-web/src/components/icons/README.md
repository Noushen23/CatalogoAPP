# Sistema de Iconos

Este directorio contiene todos los componentes de iconos SVG utilizados en el panel de administración.

## 🎯 Arquitectura

```
icons/
├── types.ts              # Tipos compartidos y props base
├── Icon.tsx              # Componente wrapper para renderizar por nombre
├── index.ts              # Punto de entrada para importaciones
├── HomeIcon.tsx          # Icono individual
├── CubeIcon.tsx          # Icono individual
├── TagIcon.tsx           # Icono individual
├── DocumentTextIcon.tsx  # Icono individual
└── README.md             # Esta documentación
```

## 📦 Uso

### Opción 1: Componente Wrapper (Recomendado)

```tsx
import { Icon } from '@/components/icons/Icon';

function MyComponent() {
  return <Icon name="home" size={20} className="text-blue-500" />;
}
```

**Ventajas:**
- Código más limpio y conciso
- Fácil de cambiar iconos dinámicamente
- Type-safe con TypeScript

### Opción 2: Importación Directa

```tsx
import { HomeIcon } from '@/components/icons';

function MyComponent() {
  return <HomeIcon size={24} className="text-gray-600" />;
}
```

**Ventajas:**
- Tree-shaking automático
- Menor overhead en tiempo de ejecución
- Mejor para casos específicos

## 🎨 Props Disponibles

Todos los iconos aceptan las siguientes props:

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `size` | `number` | `24` | Tamaño del icono en píxeles |
| `className` | `string` | `''` | Clases CSS adicionales |
| Cualquier prop SVG | `SVGProps` | - | Props nativas de SVG |

## ➕ Agregar Nuevos Iconos

1. **Crear el componente del icono:**

```tsx
// NewIcon.tsx
import { IconProps, defaultIconProps } from './types';

export function NewIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      {...defaultIconProps}
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Tu path SVG aquí */}
      <path d="..." />
    </svg>
  );
}
```

2. **Exportar en `index.ts`:**

```tsx
export { NewIcon } from './NewIcon';
```

3. **Agregar al wrapper `Icon.tsx` (opcional):**

```tsx
import { NewIcon } from './NewIcon';

export type IconName = 'home' | 'cube' | 'tag' | 'document-text' | 'new-icon';

const iconMap = {
  // ... otros iconos
  'new-icon': NewIcon,
} as const;
```

## 🎯 Iconos Disponibles

| Nombre | Componente | Uso |
|--------|-----------|-----|
| `home` | `HomeIcon` | Dashboard principal |
| `cube` | `CubeIcon` | Sección de productos |
| `tag` | `TagIcon` | Sección de categorías |
| `document-text` | `DocumentTextIcon` | Kardex/Reportes |

## 💡 Mejores Prácticas

1. **Usa nombres descriptivos** para los iconos que reflejen su propósito
2. **Mantén consistencia** en el estilo de los SVG (stroke, fill, viewBox)
3. **Documenta el propósito** de cada icono con JSDoc
4. **Usa TypeScript** para aprovechar el autocompletado y type checking
5. **Optimiza los SVG** antes de agregarlos (elimina metadata innecesaria)

## 🔧 Configuración

Los iconos usan las siguientes configuraciones por defecto:

```tsx
{
  fill: 'none',
  viewBox: '0 0 24 24',
  strokeWidth: 1.5,
  stroke: 'currentColor'
}
```

Esto permite que los iconos hereden el color del texto usando `currentColor`.

## 📚 Ejemplos

### Icono con Tamaño Personalizado

```tsx
<Icon name="home" size={32} />
```

### Icono con Clases Tailwind

```tsx
<Icon 
  name="cube" 
  className="text-blue-500 hover:text-blue-700 transition-colors" 
/>
```

### Icono con Props SVG Personalizadas

```tsx
<HomeIcon 
  size={20} 
  strokeWidth={2} 
  className="text-red-500" 
/>
```

### Renderizar Icono Dinámicamente

```tsx
function NavItem({ iconName, label }: { iconName: IconName; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name={iconName} size={20} />
      <span>{label}</span>
    </div>
  );
}
```

## 🚀 Beneficios de Esta Arquitectura

1. **Mantenibilidad**: Cada icono está en su propio archivo
2. **Reutilización**: Componentes pueden usarse en toda la aplicación
3. **Type Safety**: TypeScript previene errores de nombres incorrectos
4. **Tree Shaking**: Webpack/Vite solo incluye los iconos que usas
5. **Consistencia**: Props estandarizadas para todos los iconos
6. **Documentación**: Fácil de documentar y entender

## 🔄 Migración desde SVG Inline

**Antes:**
```tsx
const renderIcon = (iconName: string) => {
  switch (iconName) {
    case 'home':
      return <svg ...><path d="..." /></svg>
    // ...
  }
}
```

**Ahora:**
```tsx
<Icon name="home" size={20} className="text-blue-500" />
```

**Reducción de código**: ~70% menos líneas en componentes que usan iconos

