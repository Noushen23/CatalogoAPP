/**
 * Utilidades para manejar los estados de pedidos
 * Centraliza la lógica de colores, textos e iconos para evitar duplicación
 */

import { Ionicons } from '@expo/vector-icons';

/**
 * Estados válidos de un pedido
 */
export type OrderStatus = 
  | 'pendiente'
  | 'confirmada'
  | 'en_proceso'
  | 'enviada'
  | 'entregada'
  | 'cancelada'
  | 'reembolsada';

/**
 * Información completa del estado del pedido
 */
export interface OrderStatusInfo {
  color: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  borderColor: string;
}

/**
 * Configuración de colores para cada estado
 */
const STATUS_COLORS: Record<OrderStatus, string> = {
  pendiente: '#FF9800',    // Naranja
  confirmada: '#2196F3',   // Azul
  en_proceso: '#9C27B0',   // Púrpura
  enviada: '#3F51B5',      // Azul índigo
  entregada: '#4CAF50',    // Verde
  cancelada: '#F44336',    // Rojo
  reembolsada: '#607D8B',  // Gris azulado
};

/**
 * Configuración de textos legibles para cada estado
 */
const STATUS_TEXTS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_proceso: 'En Proceso',
  enviada: 'Enviada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
  reembolsada: 'Reembolsada',
};

/**
 * Configuración de iconos para cada estado
 */
const STATUS_ICONS: Record<OrderStatus, keyof typeof Ionicons.glyphMap> = {
  pendiente: 'time-outline',
  confirmada: 'checkmark-circle-outline',
  en_proceso: 'construct-outline',
  enviada: 'car-outline',
  entregada: 'checkmark-done-outline',
  cancelada: 'close-circle-outline',
  reembolsada: 'refresh-outline',
};

/**
 * Obtiene el color asociado a un estado de pedido
 * 
 * @param status - Estado del pedido
 * @returns Color hexadecimal del estado
 * 
 * @example
 * ```ts
 * getOrderStatusColor('entregada') // '#4CAF50'
 * getOrderStatusColor('cancelada') // '#F44336'
 * ```
 */
export function getOrderStatusColor(status: string): string {
  return STATUS_COLORS[status as OrderStatus] || '#666';
}

/**
 * Obtiene el texto legible de un estado de pedido
 * 
 * @param status - Estado del pedido
 * @returns Texto formateado del estado
 * 
 * @example
 * ```ts
 * getOrderStatusText('en_proceso') // 'En Proceso'
 * getOrderStatusText('entregada') // 'Entregada'
 * ```
 */
export function getOrderStatusText(status: string): string {
  return STATUS_TEXTS[status as OrderStatus] || status;
}

/**
 * Obtiene el icono asociado a un estado de pedido
 * 
 * @param status - Estado del pedido
 * @returns Nombre del icono de Ionicons
 * 
 * @example
 * ```ts
 * getOrderStatusIcon('enviada') // 'car-outline'
 * getOrderStatusIcon('entregada') // 'checkmark-done-outline'
 * ```
 */
export function getOrderStatusIcon(status: string): keyof typeof Ionicons.glyphMap {
  return STATUS_ICONS[status as OrderStatus] || 'help-circle-outline';
}

/**
 * Obtiene toda la información del estado en un solo objeto
 * Útil cuando necesitas múltiples propiedades del estado
 * 
 * @param status - Estado del pedido
 * @returns Objeto con color, texto, icono y colores derivados
 * 
 * @example
 * ```ts
 * const statusInfo = getOrderStatusInfo('entregada');
 * // {
 * //   color: '#4CAF50',
 * //   text: 'Entregada',
 * //   icon: 'checkmark-done-outline',
 * //   backgroundColor: '#4CAF5020',
 * //   borderColor: '#4CAF5040'
 * // }
 * ```
 */
export function getOrderStatusInfo(status: string): OrderStatusInfo {
  const color = getOrderStatusColor(status);
  const text = getOrderStatusText(status);
  const icon = getOrderStatusIcon(status);

  return {
    color,
    text,
    icon,
    backgroundColor: `${color}20`, // 20% de opacidad
    borderColor: `${color}40`,     // 40% de opacidad
  };
}

/**
 * Verifica si un estado es final (no puede cambiar)
 * 
 * @param status - Estado del pedido
 * @returns true si el estado es final
 * 
 * @example
 * ```ts
 * isOrderStatusFinal('entregada') // true
 * isOrderStatusFinal('cancelada') // true
 * isOrderStatusFinal('en_proceso') // false
 * ```
 */
export function isOrderStatusFinal(status: string): boolean {
  const finalStatuses: OrderStatus[] = ['entregada', 'cancelada', 'reembolsada'];
  return finalStatuses.includes(status as OrderStatus);
}

/**
 * Verifica si un estado permite cancelación
 * 
 * @param status - Estado del pedido
 * @returns true si el pedido puede ser cancelado
 * 
 * @example
 * ```ts
 * canCancelOrder('pendiente') // true
 * canCancelOrder('entregada') // false
 * ```
 */
export function canCancelOrder(status: string): boolean {
  const cancelableStatuses: OrderStatus[] = ['pendiente', 'confirmada'];
  return cancelableStatuses.includes(status as OrderStatus);
}

/**
 * Obtiene el siguiente estado posible de un pedido
 * Útil para workflows de estado
 * 
 * @param status - Estado actual del pedido
 * @returns Siguiente estado o null si es final
 * 
 * @example
 * ```ts
 * getNextOrderStatus('pendiente') // 'confirmada'
 * getNextOrderStatus('confirmada') // 'en_proceso'
 * getNextOrderStatus('entregada') // null
 * ```
 */
export function getNextOrderStatus(status: string): OrderStatus | null {
  const statusFlow: Record<OrderStatus, OrderStatus | null> = {
    pendiente: 'confirmada',
    confirmada: 'en_proceso',
    en_proceso: 'enviada',
    enviada: 'entregada',
    entregada: null,
    cancelada: null,
    reembolsada: null,
  };

  return statusFlow[status as OrderStatus] || null;
}

/**
 * Obtiene todos los estados disponibles
 * 
 * @returns Array con todos los estados de pedidos
 */
export function getAllOrderStatuses(): OrderStatus[] {
  return Object.keys(STATUS_COLORS) as OrderStatus[];
}

