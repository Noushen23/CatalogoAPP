import { View, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '../hooks/useThemeColor';

interface FullScreenLoaderProps {
  /**
   * Mensaje a mostrar debajo del indicador
   * @default "Cargando..."
   */
  message?: string;
  /**
   * Tamaño del ActivityIndicator
   * @default "large"
   */
  size?: 'small' | 'large';
  /**
   * Color personalizado del indicador (sobrescribe el color del tema)
   */
  color?: string;
  /**
   * Estilos adicionales para el contenedor
   */
  style?: ViewStyle;
}

/**
 * Componente para mostrar un indicador de carga a pantalla completa
 * con mensaje opcional
 * 
 * @example
 * ```tsx
 * if (isLoading) {
 *   return <FullScreenLoader message="Cargando productos..." />;
 * }
 * ```
 */
export function FullScreenLoader({
  message = 'Cargando...',
  size = 'large',
  color,
  style,
}: FullScreenLoaderProps) {
  const tintColor = useThemeColor({}, 'tint');
  const loaderColor = color || tintColor;

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={loaderColor} />
      {message && (
        <ThemedText style={styles.message}>{message}</ThemedText>
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
  message: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
});

