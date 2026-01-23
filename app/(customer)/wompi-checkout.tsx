import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';

const WOMPI_URL_STORAGE_KEY = 'wompi_checkout_url';

export default function WompiCheckoutScreen() {
  const { transaccionId, urlCheckout } = useLocalSearchParams<{
    transaccionId?: string;
    urlCheckout?: string;
  }>();

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Cargar URL de checkout
  useEffect(() => {
    const loadCheckoutUrl = async () => {
      try {
        let url = urlCheckout;

        // Si no viene en los parámetros, intentar obtenerla de SecureStore
        if (!url) {
          const storedUrl = await SecureStore.getItemAsync(WOMPI_URL_STORAGE_KEY);
          if (storedUrl) {
            url = storedUrl;
            // Limpiar el SecureStore después de usarlo
            await SecureStore.deleteItemAsync(WOMPI_URL_STORAGE_KEY);
          }
        }

        if (!url) {
          throw new Error('No se recibió URL de checkout de Wompi');
        }

        console.log('🔍 [Wompi Checkout] URL cargada:', {
          urlLength: url.length,
          urlPrefix: url.substring(0, 200),
          hasSignature: url.includes('signature:integrity'),
          isWompiDomain: url.includes('checkout.wompi.co'),
        });

        setCheckoutUrl(url);
        setLoading(false);
      } catch (err) {
        console.error('❌ [Wompi Checkout] Error al cargar URL:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setLoading(false);
      }
    };

    loadCheckoutUrl();
  }, [urlCheckout]);

  // Manejar navegación de la WebView
  const handleNavigationStateChange = (navState: any) => {
    const { url: currentUrl, title } = navState;

    console.log('🔍 [Wompi Checkout] Navegación detectada:', {
      url: currentUrl,
      title,
      isLoading: navState.loading,
    });

    // Detectar si Wompi muestra error
    if (title?.includes('Página no disponible') || title?.includes('Error')) {
      console.error('❌ [Wompi Checkout] Error detectado en Wompi:', { title, url: currentUrl });
      setError('Wompi no pudo procesar la solicitud. Por favor, intenta nuevamente.');
    }

    // Detectar URLs de redirección de Wompi (pago-exitoso o pago-error)
    // Estas URLs vienen del backend y contienen información sobre el resultado del pago
    if (currentUrl.includes('pago-exitoso') || currentUrl.includes('pago-error')) {
      console.log('✅ [Wompi Checkout] Redirección detectada:', currentUrl);

      // Extraer parámetros de la URL
      const extractQueryParam = (url: string, param: string): string | null => {
        try {
          const regex = new RegExp(`[?&]${param}=([^&]*)`);
          const match = url.match(regex);
          return match ? decodeURIComponent(match[1]) : null;
        } catch (error) {
          console.error(`Error al extraer parámetro ${param}:`, error);
          return null;
        }
      };

      const idTransaccion = extractQueryParam(currentUrl, 'id');
      const referencia = extractQueryParam(currentUrl, 'referencia');

      if (currentUrl.includes('pago-exitoso')) {
        // Pago exitoso - redirigir a confirmación de pedido
        Alert.alert(
          'Pago procesado',
          'Tu pago está siendo procesado. Serás redirigido a la confirmación del pedido.',
          [
            {
              text: 'Ver pedidos',
              onPress: () => {
                // El pedido se creará cuando el pago sea aprobado
                // Redirigir a la lista de pedidos para que el usuario vea su pedido cuando esté listo
                router.replace('/(customer)/orders');
              },
            },
          ]
        );
      } else if (currentUrl.includes('pago-error')) {
        // Error en el pago
        Alert.alert(
          'Error en el pago',
          'Hubo un problema al procesar tu pago. Por favor, intenta nuevamente.',
          [
            {
              text: 'Volver',
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      }
    }
  };

  // Manejar errores de carga
  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ [Wompi Checkout] Error en WebView:', nativeEvent);
    setError('Error al cargar la página de pago. Por favor, verifica tu conexión a internet.');
  };

  // Manejar cuando la página termina de cargar
  const handleLoadEnd = () => {
    setLoading(false);
    console.log('✅ [Wompi Checkout] Página cargada completamente');
  };

  // Abrir en navegador externo como alternativa
  const handleOpenInBrowser = async () => {
    if (!checkoutUrl) return;

    try {
      const canOpen = await Linking.canOpenURL(checkoutUrl);
      if (canOpen) {
        await Linking.openURL(checkoutUrl);
        Alert.alert(
          'Abierto en navegador',
          'El pago se abrió en tu navegador. Una vez completes el pago, regresa a la aplicación.',
          [
            {
              text: 'Entendido',
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo abrir el navegador');
      }
    } catch (err) {
      console.error('Error al abrir en navegador:', err);
      Alert.alert('Error', 'No se pudo abrir el navegador');
    }
  };

  if (loading && !checkoutUrl) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Cargando checkout de Wompi...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error && !checkoutUrl) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <ThemedText style={styles.errorTitle}>Error al cargar el checkout</ThemedText>
          <ThemedText style={styles.errorMessage}>{error}</ThemedText>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: tintColor }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.buttonText}>Volver</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  if (!checkoutUrl) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <ThemedText style={styles.errorTitle}>URL no disponible</ThemedText>
          <ThemedText style={styles.errorMessage}>
            No se recibió la URL de checkout de Wompi.
          </ThemedText>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: tintColor }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.buttonText}>Volver</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header con botón de cerrar y opción de abrir en navegador */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            Alert.alert(
              'Cancelar pago',
              '¿Estás seguro de que quieres cancelar el proceso de pago?',
              [
                {
                  text: 'Continuar',
                  style: 'cancel',
                },
                {
                  text: 'Cancelar pago',
                  style: 'destructive',
                  onPress: () => router.back(),
                },
              ]
            );
          }}
        >
          <Ionicons name="close" size={24} color={tintColor} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Procesando pago</ThemedText>
        <TouchableOpacity style={styles.browserButton} onPress={handleOpenInBrowser}>
          <Ionicons name="open-outline" size={24} color={tintColor} />
        </TouchableOpacity>
      </View>

      {/* WebView para mostrar el checkout de Wompi */}
      <WebView
        ref={webViewRef}
        source={{ uri: checkoutUrl }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onNavigationStateChange={handleNavigationStateChange}
        onError={handleError}
        onLoadEnd={handleLoadEnd}
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        mixedContentMode="always"
        thirdPartyCookiesEnabled={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={tintColor} />
            <ThemedText style={styles.loadingText}>Cargando checkout de Wompi...</ThemedText>
          </View>
        )}
      />

      {/* Indicador de carga */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Cargando...</ThemedText>
        </View>
      )}

      {/* Mensaje de error si hay */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#F44336" />
          <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
  },
  browserButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFEBEE',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F44336',
  },
  errorBannerText: {
    marginLeft: 8,
    color: '#C62828',
    fontSize: 14,
  },
});
