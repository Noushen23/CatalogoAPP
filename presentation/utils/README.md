# Utilidades de Formateo

Este directorio contiene funciones de utilidad reutilizables para formatear datos en toda la aplicación.

## 📦 Contenido

### `formatters.ts`

Funciones de formateo para diferentes tipos de datos:

#### Fechas y Tiempo

- **`formatDate(dateString, options)`** - Formatea fechas en diferentes estilos
  ```typescript
  formatDate('2024-01-15T10:30:00Z') // "15 de enero de 2024"
  formatDate('2024-01-15', { format: 'short' }) // "15/01/2024"
  formatDate('2024-01-15', { format: 'medium' }) // "15 ene. 2024"
  formatDate('2024-01-15', { format: 'full' }) // "lunes, 15 de enero de 2024"
  ```

- **`formatDateTime(dateString, options)`** - Formatea fecha con hora
  ```typescript
  formatDateTime('2024-01-15T10:30:00Z') // "15/01/2024, 10:30"
  formatDateTime('2024-01-15T10:30:45Z', { includeSeconds: true }) // "15/01/2024, 10:30:45"
  ```

- **`getRelativeTime(dateString)`** - Tiempo relativo
  ```typescript
  getRelativeTime('2024-01-15T10:00:00Z') // "hace 2 horas"
  getRelativeTime('2024-01-14T10:00:00Z') // "hace 1 día"
  ```

#### Números y Moneda

- **`formatCurrency(amount, options)`** - Formatea moneda (COP por defecto)
  ```typescript
  formatCurrency(1234567) // "$1,234,567"
  formatCurrency(1234.56, { decimals: 2 }) // "$1,234.56"
  formatCurrency(1234, { showSymbol: false }) // "1,234"
  ```

- **`formatNumber(value, options)`** - Formatea números con separadores
  ```typescript
  formatNumber(1234567) // "1,234,567"
  formatNumber(1234.567, { decimals: 2 }) // "1,234.57"
  ```

- **`formatPercentage(value, options)`** - Formatea porcentajes
  ```typescript
  formatPercentage(0.15) // "15%"
  formatPercentage(0.1567, { decimals: 2 }) // "15.67%"
  ```

#### Texto

- **`truncateText(text, maxLength, ellipsis)`** - Trunca texto
  ```typescript
  truncateText('Este es un texto muy largo', 10) // "Este es..."
  ```

- **`capitalize(text)`** - Capitaliza cada palabra
  ```typescript
  capitalize('hola mundo') // "Hola Mundo"
  ```

#### Otros

- **`formatPhone(phone)`** - Formatea números de teléfono
  ```typescript
  formatPhone('3001234567') // "300 123 4567"
  formatPhone('6012345678') // "601 234 5678"
  ```

- **`formatFileSize(bytes, decimals)`** - Formatea tamaños de archivo
  ```typescript
  formatFileSize(1024) // "1 KB"
  formatFileSize(1048576) // "1 MB"
  ```

## 🎯 Uso

### Importación Simple

```typescript
import { formatCurrency, formatDate } from '@/presentation/utils';

// Usar en componentes
const price = formatCurrency(1234567); // "$1,234,567"
const date = formatDate('2024-01-15'); // "15 de enero de 2024"
```

### Importación Específica

```typescript
import { formatDate, formatDateTime } from '@/presentation/utils/formatters';
```

## 💡 Beneficios

### 1. **DRY (Don't Repeat Yourself)**
- Evita duplicación de código en múltiples componentes
- Funciones centralizadas que se pueden mantener en un solo lugar

### 2. **Consistencia**
- Todos los formatos de fecha, moneda y números son consistentes en toda la app
- Mismo locale (es-CO) y configuración para todas las vistas

### 3. **Mantenibilidad**
- Cambios en el formato se realizan en un solo lugar
- Fácil actualizar o agregar nuevas funciones de formateo

### 4. **Tipado Fuerte**
- Todas las funciones están completamente tipadas con TypeScript
- Autocompletado y validación en tiempo de desarrollo

### 5. **Documentación**
- Cada función tiene JSDoc con ejemplos
- Facilita el uso para nuevos desarrolladores

## 📝 Componentes Refactorizados

Los siguientes componentes fueron refactorizados para usar estas utilidades:

- ✅ `presentation/orders/components/OrderDetail.tsx`
- ✅ `presentation/orders/components/OrderItem.tsx`
- ✅ `presentation/profile/components/ProfileStats.tsx`
- ✅ `presentation/reviews/components/ReviewCard.tsx`
- ✅ `presentation/profile/components/PersonalInfo.tsx`
- ✅ `app/(customer)/order-confirmation/[id].tsx`

## 🔧 Agregar Nuevas Utilidades

Para agregar nuevas funciones de formateo:

1. Agregar la función a `formatters.ts` con documentación JSDoc
2. Exportarla en `index.ts`
3. Usar en componentes mediante `import { nuevaFuncion } from '@/presentation/utils'`

### Ejemplo:

```typescript
// En formatters.ts
/**
 * Formatea un código de producto
 * @param code - Código del producto
 * @returns Código formateado
 */
export function formatProductCode(code: string): string {
  return code.toUpperCase().replace(/\s/g, '-');
}

// En index.ts
export * from './formatters';

// En componentes
import { formatProductCode } from '@/presentation/utils';
const formatted = formatProductCode('abc 123'); // "ABC-123"
```

## 🌍 Internacionalización (i18n)

Actualmente las funciones usan el locale `es-CO` (Español - Colombia) por defecto.

Para soportar múltiples idiomas en el futuro:
- Las funciones ya aceptan un parámetro `locale` opcional
- Se puede integrar con una librería de i18n como `react-i18next`
- Actualizar el locale por defecto según las preferencias del usuario

## 📚 Referencias

- [Intl.NumberFormat - MDN](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [Intl.DateTimeFormat - MDN](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)
- [toLocaleString - MDN](https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString)

