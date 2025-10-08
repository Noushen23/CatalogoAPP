/**
 * Utilidades de formateo para la aplicación
 * Centraliza funciones de formateo de fechas, monedas, números, etc.
 * para evitar duplicación de código y mantener consistencia
 */

/**
 * Formatea una fecha en formato legible
 * 
 * @param dateString - Fecha en formato ISO string
 * @param options - Opciones de formateo (locale y formato)
 * @returns Fecha formateada como string
 * 
 * @example
 * ```ts
 * formatDate('2024-01-15T10:30:00Z') // "15 de enero de 2024"
 * formatDate('2024-01-15', { format: 'short' }) // "15/01/2024"
 * formatDate('2024-01-15', { format: 'medium' }) // "15 ene. 2024"
 * ```
 */
export function formatDate(
  dateString: string | Date,
  options: {
    locale?: string;
    format?: 'short' | 'medium' | 'long' | 'full';
  } = {}
): string {
  const { locale = 'es-CO', format = 'long' } = options;

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return 'Fecha inválida';
    }

    switch (format) {
      case 'short':
        // 15/01/2024
        return date.toLocaleDateString(locale);
      
      case 'medium':
        // 15 ene. 2024
        return date.toLocaleDateString(locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      
      case 'long':
        // 15 de enero de 2024
        return date.toLocaleDateString(locale, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      
      case 'full':
        // lunes, 15 de enero de 2024
        return date.toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      
      default:
        return date.toLocaleDateString(locale);
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Fecha inválida';
  }
}

/**
 * Formatea una fecha con hora
 * 
 * @param dateString - Fecha en formato ISO string
 * @param options - Opciones de formateo
 * @returns Fecha y hora formateadas
 * 
 * @example
 * ```ts
 * formatDateTime('2024-01-15T10:30:00Z') // "15/01/2024, 10:30"
 * formatDateTime('2024-01-15T10:30:00Z', { includeSeconds: true }) // "15/01/2024, 10:30:45"
 * ```
 */
export function formatDateTime(
  dateString: string | Date,
  options: {
    locale?: string;
    includeSeconds?: boolean;
  } = {}
): string {
  const { locale = 'es-CO', includeSeconds = false } = options;

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }

    return date.toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds && { second: '2-digit' }),
    });
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Fecha inválida';
  }
}

/**
 * Formatea un número como moneda (pesos colombianos por defecto)
 * 
 * @param amount - Cantidad a formatear
 * @param options - Opciones de formateo
 * @returns Cantidad formateada como string
 * 
 * @example
 * ```ts
 * formatCurrency(1234567) // "$1,234,567"
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(1234, { showSymbol: false }) // "1,234"
 * formatCurrency(1234, { decimals: 2 }) // "$1,234.00"
 * ```
 */
export function formatCurrency(
  amount: number,
  options: {
    locale?: string;
    currency?: string;
    showSymbol?: boolean;
    decimals?: number;
  } = {}
): string {
  const { 
    locale = 'es-CO', 
    currency = 'COP', 
    showSymbol = true,
    decimals 
  } = options;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: showSymbol ? 'currency' : 'decimal',
      currency: showSymbol ? currency : undefined,
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 0,
    });

    return formatter.format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return showSymbol ? `$${amount}` : String(amount);
  }
}

/**
 * Formatea un número con separadores de miles
 * 
 * @param value - Número a formatear
 * @param options - Opciones de formateo
 * @returns Número formateado como string
 * 
 * @example
 * ```ts
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234.567, { decimals: 2 }) // "1,234.57"
 * ```
 */
export function formatNumber(
  value: number,
  options: {
    locale?: string;
    decimals?: number;
  } = {}
): string {
  const { locale = 'es-CO', decimals } = options;

  try {
    return value.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch (error) {
    console.error('Error formatting number:', error);
    return String(value);
  }
}

/**
 * Formatea un porcentaje
 * 
 * @param value - Valor del porcentaje (0.15 = 15%)
 * @param options - Opciones de formateo
 * @returns Porcentaje formateado
 * 
 * @example
 * ```ts
 * formatPercentage(0.15) // "15%"
 * formatPercentage(0.1567, { decimals: 2 }) // "15.67%"
 * ```
 */
export function formatPercentage(
  value: number,
  options: {
    locale?: string;
    decimals?: number;
  } = {}
): string {
  const { locale = 'es-CO', decimals = 0 } = options;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return `${(value * 100).toFixed(decimals)}%`;
  }
}

/**
 * Formatea un número de teléfono
 * 
 * @param phone - Número de teléfono
 * @returns Teléfono formateado
 * 
 * @example
 * ```ts
 * formatPhone('3001234567') // "300 123 4567"
 * formatPhone('6012345678') // "601 234 5678"
 * ```
 */
export function formatPhone(phone: string): string {
  // Eliminar caracteres no numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Formatear según longitud
  if (cleaned.length === 10) {
    // Celular: 300 123 4567
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 7) {
    // Fijo: 123 4567
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  
  return phone;
}

/**
 * Formatea un tamaño de archivo
 * 
 * @param bytes - Tamaño en bytes
 * @param decimals - Número de decimales
 * @returns Tamaño formateado
 * 
 * @example
 * ```ts
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1536, 2) // "1.50 KB"
 * formatFileSize(1048576) // "1 MB"
 * ```
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Obtiene el tiempo relativo (hace X tiempo)
 * 
 * @param dateString - Fecha a comparar
 * @returns Tiempo relativo como string
 * 
 * @example
 * ```ts
 * getRelativeTime('2024-01-15T10:00:00Z') // "hace 2 horas"
 * getRelativeTime('2024-01-14T10:00:00Z') // "hace 1 día"
 * ```
 */
export function getRelativeTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) {
      return 'hace unos segundos';
    } else if (diffMin < 60) {
      return `hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffHour < 24) {
      return `hace ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`;
    } else if (diffDay < 30) {
      return `hace ${diffDay} ${diffDay === 1 ? 'día' : 'días'}`;
    } else if (diffMonth < 12) {
      return `hace ${diffMonth} ${diffMonth === 1 ? 'mes' : 'meses'}`;
    } else {
      return `hace ${diffYear} ${diffYear === 1 ? 'año' : 'años'}`;
    }
  } catch (error) {
    console.error('Error getting relative time:', error);
    return 'fecha desconocida';
  }
}

/**
 * Trunca un texto a una longitud específica
 * 
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima
 * @param ellipsis - Texto a agregar al final
 * @returns Texto truncado
 * 
 * @example
 * ```ts
 * truncateText('Este es un texto muy largo', 10) // "Este es..."
 * truncateText('Corto', 10) // "Corto"
 * ```
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Capitaliza la primera letra de cada palabra
 * 
 * @param text - Texto a capitalizar
 * @returns Texto capitalizado
 * 
 * @example
 * ```ts
 * capitalize('hola mundo') // "Hola Mundo"
 * capitalize('HOLA MUNDO') // "Hola Mundo"
 * ```
 */
export function capitalize(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

