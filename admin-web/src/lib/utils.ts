import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea una fecha a una cadena legible.
 * @param dateInput La fecha a formatear (Date, string, number).
 * @param formatStr Formato de la fecha (por defecto: 'dd/MM/yyyy HH:mm').
 * @returns La fecha formateada.
 */
export function formatDateTime(
  dateInput: Date | string | number,
  formatStr: string = 'dd/MM/yyyy HH:mm'
): string {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    return format(date, formatStr, { locale: es });
  } catch (error) {
    return 'Fecha inválida';
  }
}

/**
 * Formatea una fecha simple sin hora.
 * @param dateInput La fecha a formatear.
 * @returns La fecha formateada.
 */
export function formatDate(
  dateInput: Date | string | number
): string {
  return formatDateTime(dateInput, 'dd/MM/yyyy');
}

/**
 * Formatea un número como moneda colombiana (COP).
 * @param amount El monto a formatear.
 * @returns El monto formateado como moneda.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea un número con separadores de miles.
 * @param value El número a formatear.
 * @returns El número formateado.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO').format(value);
}