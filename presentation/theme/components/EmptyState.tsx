import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '../hooks/useThemeColor';

interface EmptyStateProps {
  /**
   * Nombre del icono de Ionicons
   * @default "cube-outline"
   */
  icon?: keyof typeof Ionicons.glyphMap;
  /**
   * Tamaño del icono
   * @default 80
   */
  iconSize?: number;
  /**
   * Color del icono
   * @default "#ccc"
   */
  iconColor?: string;
  /**
   * Título del estado vacío
   * @default "No hay elementos"
   */
  title?: string;
  /**
   * Descripción del estado vacío
   */
  description?: string;
  /**
   * Texto del botón de acción
   */
  actionText?: string;
  /**
   * Función a ejecutar cuando se presiona el botón de acción
   */
  onAction?: () => void;
  /**
   * Icono del botón de acción
   */
  actionIcon?: keyof typeof Ionicons.glyphMap;
  /**
   * Estilos adicionales para el contenedor
   */
  style?: ViewStyle;
}

/**
 * Componente para mostrar estados vacíos de forma consistente
 * con opción de botón de acción
 * 
 * @example
 * ```tsx
 * if (items.length === 0) {
 *   return (
 *     <EmptyState
 *       icon="cart-outline"
 *       title="Carrito vacío"
 *       description="Agrega productos para continuar"
 *       actionText="Ver productos"
 *       onAction={() => router.push('/products')}
 *     />
 *   );
 * }
 * ```
 */
export function EmptyState({
  icon = 'cube-outline',
  iconSize = 80,
  iconColor = '#ccc',
  title = 'No hay elementos',
  description,
  actionText,
  onAction,
  actionIcon = 'add-circle-outline',
  style,
}: EmptyStateProps) {
  const tintColor = useThemeColor({}, 'tint');

  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={iconSize} color={iconColor} />
      
      <ThemedText style={styles.title}>{title}</ThemedText>
      
      {description && (
        <ThemedText style={styles.description}>{description}</ThemedText>
      )}
      
      {actionText && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: tintColor }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Ionicons name={actionIcon} size={20} color="white" />
          <ThemedText style={styles.actionText}>{actionText}</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

