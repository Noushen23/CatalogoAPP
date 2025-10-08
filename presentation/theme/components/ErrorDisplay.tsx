import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '../hooks/useThemeColor';

interface ErrorDisplayProps {
  /**
   * Título del error
   * @default "Error al cargar"
   */
  title?: string;
  /**
   * Mensaje descriptivo del error
   */
  message?: string;
  /**
   * Objeto de error (se extraerá el mensaje automáticamente)
   */
  error?: Error | unknown;
  /**
   * Función a ejecutar cuando se presiona el botón de reintentar
   */
  onRetry?: () => void;
  /**
   * Texto del botón de reintentar
   * @default "Reintentar"
   */
  retryText?: string;
  /**
   * Tamaño del icono
   * @default 60
   */
  iconSize?: number;
  /**
   * Nombre del icono de Ionicons
   * @default "alert-circle-outline"
   */
  iconName?: keyof typeof Ionicons.glyphMap;
  /**
   * Color del icono
   * @default "#F44336"
   */
  iconColor?: string;
  /**
   * Estilos adicionales para el contenedor
   */
  style?: ViewStyle;
}

/**
 * Componente para mostrar errores de forma consistente
 * con opción de reintentar
 * 
 * @example
 * ```tsx
 * if (error) {
 *   return (
 *     <ErrorDisplay
 *       title="Error al cargar productos"
 *       error={error}
 *       onRetry={() => refetch()}
 *     />
 *   );
 * }
 * ```
 */
export function ErrorDisplay({
  title = 'Error al cargar',
  message,
  error,
  onRetry,
  retryText = 'Reintentar',
  iconSize = 60,
  iconName = 'alert-circle-outline',
  iconColor = '#F44336',
  style,
}: ErrorDisplayProps) {
  const tintColor = useThemeColor({}, 'tint');

  // Extraer mensaje del error si existe
  const errorMessage = message || (error instanceof Error ? error.message : 'Error desconocido');

  return (
    <View style={[styles.container, style]}>
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
      
      <ThemedText style={styles.title}>{title}</ThemedText>
      
      {errorMessage && (
        <ThemedText style={styles.message}>{errorMessage}</ThemedText>
      )}
      
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: tintColor }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={20} color="white" />
          <ThemedText style={styles.retryText}>{retryText}</ThemedText>
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
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    marginTop: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

