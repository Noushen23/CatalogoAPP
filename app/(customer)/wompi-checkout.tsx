import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { WebView } from 'react-native-webview';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { FullScreenLoader } from '@/presentation/theme/components/FullScreenLoader';
import { ErrorDisplay } from '@/presentation/theme/components/ErrorDisplay';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { SafeAreaView } from 'react-native-safe-area-context';


const WOMPI_DEEP_LINK_PREFIX = 'tienda-bomberos://';

const pickFirstParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const getPedidoIdFromUrl = (url: string) => {
  const parsed = Linking.parse(url);
  const pedido = parsed?.queryParams?.pedido;
  return typeof pedido === 'string' ? pedido : undefined;
};

export default function WompiCheckoutScreen() {
  const params = useLocalSearchParams<{
    transaccionId?: string | string[];
    urlCheckout?: string | string[];
    referencia?: string | string[];
    pedidoId?: string | string[];
  }>();

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = '#e0e0e0';
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const webViewRef = useRef<WebView>(null);
  const redirectHandledRef = useRef(false);

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [referencia, setReferencia] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isHandlingRedirect, setIsHandlingRedirect] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  const transaccionId = useMemo(
    () => pickFirstParam(params.transaccionId),
    [params.transaccionId]
  );

  const pedidoId = useMemo(
    () => pickFirstParam(params.pedidoId),
    [params.pedidoId]
  );

  const loadCheckoutData = useCallback(async () => {
    setIsRestoring(true);
    try {
      const urlParam = pickFirstParam(params.urlCheckout);
      const refParam = pickFirstParam(params.referencia);
      const storedUrl = await SecureStore.getItemAsync('wompi_checkout_url');
      const storedRef = await SecureStore.getItemAsync('wompi_checkout_ref');

      setCheckoutUrl(urlParam || storedUrl || null);
      setReferencia(refParam || storedRef || null);
    } finally {
      setIsRestoring(false);
    }
  }, [params.urlCheckout, params.referencia]);

  useEffect(() => {
    loadCheckoutData();
  }, [loadCheckoutData]);

  const clearCheckoutStorage = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('wompi_checkout_url');
      await SecureStore.deleteItemAsync('wompi_checkout_ref');
    } catch (error) {
      console.warn('⚠️ [Wompi] No se pudo limpiar SecureStore:', error);
    }
  }, []);

  const handleExitToCatalog = useCallback(async () => {
    redirectHandledRef.current = true;
    await clearCheckoutStorage();
    router.replace({
      pathname: '/(customer)/catalog',
      params: {
        pendingPayment: '1',
        pedidoId: pedidoId || undefined,
      },
    });
  }, [clearCheckoutStorage, pedidoId]);

  const handleExit = useCallback(() => {
    if (redirectHandledRef.current || isHandlingRedirect) {
      return;
    }

    Alert.alert(
      '¿Volver al catálogo?',
      'Tu pedido seguirá pendiente de pago. Puedes retomarlo desde Mis pedidos.',
      [
        { text: 'Continuar pago', style: 'cancel' },
        {
          text: 'Volver a catálogo',
          style: 'destructive',
          onPress: handleExitToCatalog,
        },
      ]
    );
  }, [isHandlingRedirect, handleExitToCatalog]);

  const handlePagoExitoso = useCallback(
    async (url: string) => {
      if (redirectHandledRef.current) return;
      redirectHandledRef.current = true;
      setIsHandlingRedirect(true);
      await clearCheckoutStorage();

      const pedidoId = getPedidoIdFromUrl(url);
      if (pedidoId) {
        router.replace({
          pathname: '/(customer)/order-confirmation/[id]',
          params: { id: pedidoId },
        });
        return;
      }

      Alert.alert(
        'Pago recibido',
        'Estamos confirmando tu compra. Puedes revisar el estado en tus pedidos.',
        [
          {
            text: 'Ver pedidos',
            onPress: () => router.replace('/(customer)/orders' as any),
          },
          {
            text: 'Volver al catálogo',
            onPress: () => router.replace('/(customer)/catalog'),
          },
        ]
      );
    },
    [clearCheckoutStorage]
  );

  const handlePagoError = useCallback(
    async (url: string) => {
      if (redirectHandledRef.current) return;
      redirectHandledRef.current = true;
      setIsHandlingRedirect(true);
      await clearCheckoutStorage();

      const pedidoId = getPedidoIdFromUrl(url);
      Alert.alert(
        'Pago no completado',
        'No fue posible procesar el pago. Puedes intentarlo nuevamente.',
        [
          {
            text: 'Reintentar',
            onPress: () => router.replace('/(customer)/checkout' as any),
          },
          {
            text: pedidoId ? 'Ver pedido' : 'Ver pedidos',
            onPress: () => {
              if (pedidoId) {
                router.replace({
                  pathname: '/(customer)/order-confirmation/[id]',
                  params: { id: pedidoId },
                });
              } else {
                router.replace('/(customer)/orders' as any);
              }
            },
          },
        ]
      );
    },
    [clearCheckoutStorage]
  );

  const handleDeepLink = useCallback(
    (url: string) => {
      if (url.startsWith(`${WOMPI_DEEP_LINK_PREFIX}pago-exitoso`)) {
        handlePagoExitoso(url);
        return true;
      }

      if (url.startsWith(`${WOMPI_DEEP_LINK_PREFIX}pago-error`)) {
        handlePagoError(url);
        return true;
      }

      return false;
    },
    [handlePagoExitoso, handlePagoError]
  );

  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      const { url } = request;
      if (url.startsWith(WOMPI_DEEP_LINK_PREFIX)) {
        handleDeepLink(url);
        return false;
      }
      return true;
    },
    [handleDeepLink]
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isFocused) {
        return;
      }
      if (redirectHandledRef.current || isHandlingRedirect) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        '¿Volver al catálogo?',
        'Tu pedido seguirá pendiente de pago. Puedes retomarlo desde Mis pedidos.',
        [
          { text: 'Continuar pago', style: 'cancel' },
          {
            text: 'Volver a catálogo',
            style: 'destructive',
            onPress: handleExitToCatalog,
          }
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isHandlingRedirect, handleExitToCatalog, isFocused]);

  useEffect(() => {
    const parentNavigation = navigation.getParent();
    if (!parentNavigation) return;

    const unsubscribe = (parentNavigation as any).addListener('tabPress', (e: any) => {
      if (!isFocused) {
        return;
      }
      if (redirectHandledRef.current || isHandlingRedirect) {
        return;
      }

      e.preventDefault?.();

      const parentState = parentNavigation.getState();
      const targetRoute = parentState?.routes?.find(route => route.key === e.target);

      Alert.alert(
        '¿Volver al catálogo?',
        'Tu pedido seguirá pendiente de pago. Puedes retomarlo desde Mis pedidos.',
        [
          { text: 'Continuar pago', style: 'cancel' },
          {
            text: 'Volver a catálogo',
            style: 'destructive',
            onPress: handleExitToCatalog,
          }
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isHandlingRedirect, handleExitToCatalog, isFocused]);

  if (isRestoring) {
    return <FullScreenLoader message="Preparando pago..." />;
  }

  if (!checkoutUrl) {
    return (
      <ErrorDisplay
        title="No pudimos abrir el pago"
        message="No se encontró la URL del checkout. Intenta nuevamente desde el carrito."
        onRetry={async () => {
          await loadCheckoutData();
          setWebViewKey(prev => prev + 1);
        }}
        retryText="Reintentar"
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
       <SafeAreaView edges={['top']} style={{ backgroundColor }}>
    <View
      style={[
        styles.header,
        { backgroundColor, borderBottomColor: borderColor || '#eee' },
      ]}
    >
        <TouchableOpacity
          onPress={() => {
            if (canGoBack) {
              webViewRef.current?.goBack();
              return;
            }
            handleExit();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name={canGoBack ? 'arrow-back' : 'close'} size={24} color="#333" />
        </TouchableOpacity>

        <ThemedText style={styles.headerTitle}>Pago seguro</ThemedText>

        <TouchableOpacity onPress={handleExit} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>
        </SafeAreaView>

      <View style={styles.notice}>
        <Ionicons name="lock-closed-outline" size={18} color={tintColor} />
        <ThemedText style={styles.noticeText}>
          Procesando pago con Wompi. No cierres esta pantalla hasta terminar.
        </ThemedText>
      </View>

      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          key={webViewKey}
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            if (navState.url?.startsWith(WOMPI_DEEP_LINK_PREFIX)) {
              handleDeepLink(navState.url);
            }
          }}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText style={styles.loadingText}>Cargando checkout...</ThemedText>
            </View>
          )}
          renderError={() => (
            <View style={styles.loadingContainer}>
              <Ionicons name="alert-circle-outline" size={40} color="#F44336" />
              <ThemedText style={styles.loadingText}>
                Ocurrió un problema cargando el checkout.
              </ThemedText>
            </View>
          )}
          javaScriptEnabled
          domStorageEnabled
          onError={() => {
            Alert.alert(
              'Error en el pago',
              'No se pudo cargar el checkout. Intenta nuevamente.',
              [
                {
                  text: 'Reintentar',
                  onPress: () => setWebViewKey(prev => prev + 1),
                },
                {
                  text: 'Salir',
                  onPress: handleExit,
                  style: 'destructive',
                },
              ]
            );
          }}
        />
      </View>

      {isHandlingRedirect && (
        <View style={styles.redirectOverlay}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.redirectText}>
            Confirmando pago...
          </ThemedText>
        </View>
      )}

      {!!transaccionId && (
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Referencia: {referencia || transaccionId}
          </ThemedText>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,



  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,

  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
  },
  webviewContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  redirectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  redirectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },
});
