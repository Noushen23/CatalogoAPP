import React, { useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';

interface WompiCheckoutWebViewProps {
  url: string; // URL del Web Checkout de Wompi
  onPaymentSuccess?: (data: any) => void;
  onPaymentError?: (error: any) => void;
  onClose?: () => void;
}

export const WompiCheckoutWebView: React.FC<WompiCheckoutWebViewProps> = ({
  url,
  onPaymentSuccess,
  onPaymentError,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // 🔍 DEBUG: Log de la URL recibida
  React.useEffect(() => {
    console.log('🔍 [Wompi WebView] URL recibida como prop:', {
      url,
      urlLength: url?.length,
      urlPrefix: url?.substring(0, 200),
      urlSuffix: url?.substring(Math.max(0, url.length - 100)),
      hasSignature: url?.includes('signature:integrity'),
      hasEncodedPlus: url?.includes('%2B'),
      hasPlus: url?.includes('+'),
      isWompiDomain: url?.includes('checkout.wompi.co'),
      paramCount: url?.split('&').length || 0
    });
  }, [url]);

  // Manejar navegación de la WebView
  // 🔥 Wompi Web Checkout redirige a nuestras URLs de éxito/error
  // El estado real SIEMPRE viene por webhook, esto es solo informativo
  const handleNavigationStateChange = (navState: any) => {
    const { url: currentUrl, title } = navState;

    console.log('🔍 [Wompi WebView] Navegación detectada:', {
      url: currentUrl,
      urlLength: currentUrl?.length,
      title: title,
      isWompiDomain: currentUrl?.includes('checkout.wompi.co'),
      isRedirectUrl: currentUrl?.includes('pago-exitoso') || currentUrl?.includes('pago-error'),
      isErrorPage: currentUrl?.includes('error') || currentUrl?.includes('declined'),
      isSuccessPage: currentUrl?.includes('pago-exitoso') || currentUrl?.includes('success')
    });

    // Detectar si Wompi muestra "Página no disponible"
    if (title && (title.includes('no disponible') || title.includes('not available') || title.includes('error'))) {
      console.error('❌ [Wompi WebView] Página no disponible detectada:', {
        title,
        url: currentUrl,
        possibleCauses: [
          'URL malformada',
          'Parámetros faltantes o incorrectos',
          'Signature inválida',
          'Referencia duplicada',
          'URL decodificada incorrectamente'
        ]
      });
      
      if (onPaymentError) {
        onPaymentError({
          message: 'Wompi no pudo cargar la página de pago. Verifica los parámetros de la transacción.',
          url: currentUrl,
          title: title
        });
      }
    }

    // Detectar URLs de redirección de Wompi (solo informativo, webhook es la fuente de verdad)
    if (currentUrl.includes('pago-exitoso') || currentUrl.includes('success')) {
      // Extraer parámetros de la URL de forma segura (sin new URL que puede crashear en Android)
      const pedidoId = extractQueryParam(currentUrl, 'pedido') || extractQueryParam(currentUrl, 'order');
      const referencia = extractQueryParam(currentUrl, 'referencia') || extractQueryParam(currentUrl, 'reference');
      
      console.log('✅ [Wompi WebView] Pago exitoso detectado:', { pedidoId, referencia });
      
      if (onPaymentSuccess) {
        onPaymentSuccess({
          pedidoId,
          referencia,
          url: currentUrl,
        });
      }
    }

    if (currentUrl.includes('pago-error') || currentUrl.includes('error') || currentUrl.includes('declined')) {
      const errorMessage = extractQueryParam(currentUrl, 'message') || 'Error al procesar el pago';
      
      console.error('❌ [Wompi WebView] Error de pago detectado:', { errorMessage, url: currentUrl });
      
      if (onPaymentError) {
        onPaymentError({
          message: errorMessage,
          url: currentUrl,
        });
      }
    }
  };

  // Helper para extraer parámetros de query de forma segura (sin new URL)
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

  // Manejar errores de carga
  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('❌ [Wompi WebView] Error detectado:', {
      code: nativeEvent.code,
      description: nativeEvent.description,
      domain: nativeEvent.domain,
      url: nativeEvent.url,
      urlLength: nativeEvent.url?.length,
      urlPrefix: nativeEvent.url?.substring(0, 200),
      isWompiDomain: nativeEvent.url?.includes('checkout.wompi.co'),
      hasSignature: nativeEvent.url?.includes('signature:integrity'),
      hasEncodedPlus: nativeEvent.url?.includes('%2B'),
      fullError: JSON.stringify(nativeEvent, null, 2)
    });
    setError(`Error al cargar el checkout de Wompi: ${nativeEvent.description || 'Error desconocido'}`);
    setLoading(false);
    
    if (onPaymentError) {
      onPaymentError({
        message: 'Error al cargar el checkout de Wompi',
        error: nativeEvent,
      });
    }
  };

  // Manejar cuando la página termina de cargar
  const handleLoadEnd = (navState: any) => {
    setLoading(false);
    console.log('✅ [Wompi WebView] Carga completada:', {
      url: navState.url,
      urlLength: navState.url?.length,
      title: navState.title,
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward
    });
    
    // Verificar si la página muestra "Página no disponible"
    if (navState.url && navState.url.includes('checkout.wompi.co')) {
      console.log('🔍 [Wompi WebView] Verificando contenido de la página...');
      // El contenido se verificará cuando se detecte el error
    }
  };

  // Manejar cuando la página comienza a cargar
  const handleLoadStart = (navState: any) => {
    setLoading(true);
    setError(null);
    console.log('🔍 [Wompi WebView] Iniciando carga:', {
      url: navState.url || url,
      urlLength: (navState.url || url)?.length,
      urlPrefix: (navState.url || url)?.substring(0, 200),
      hasSignature: (navState.url || url)?.includes('signature:integrity'),
      hasEncodedPlus: (navState.url || url)?.includes('%2B'),
      isWompiDomain: (navState.url || url)?.includes('checkout.wompi.co')
    });
  };

  // 🔥 Wompi Web Checkout NO envía eventos JS confiables
  // El estado real SIEMPRE viene por:
  // 1. Webhook (fuente de verdad)
  // 2. Redirección final (solo informativo)
  // Por eso eliminamos injectedJavaScript y polling de URL

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Cargando checkout de Wompi...</ThemedText>
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        originWhitelist={['*']} // 🔥 OBLIGATORIO: Wompi no funciona con whitelist estricta en mobile
        javaScriptEnabled={true}
        domStorageEnabled={true}
        setSupportMultipleWindows={false} // 🔥 CLAVE PARA Wompi: previene problemas en Android/Expo
        startInLoadingState={true}
        scalesPageToFit={true}
        onNavigationStateChange={handleNavigationStateChange}
        onError={handleError}
        onLoadEnd={handleLoadEnd}
        onLoadStart={handleLoadStart}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
});
