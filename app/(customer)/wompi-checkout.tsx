import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { ordersApi } from '@/core/api/ordersApi';

export default function WompiCheckoutScreen() {
  const params = useLocalSearchParams<{
    urlCheckout?: string | string[];
    transaccionId?: string | string[];
    referencia?: string | string[];
  }>();

  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showWebView, setShowWebView] = useState(true);
  const [referenciaState, setReferenciaState] = useState<string | null>(null);

  const hasOpenedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const tintColor = useThemeColor({}, 'tint');
  const queryClient = useQueryClient();

  const urlFromParams = useMemo(() => {
    if (!params.urlCheckout) return null;
    return Array.isArray(params.urlCheckout) ? params.urlCheckout[0] : params.urlCheckout;
  }, [params.urlCheckout]);

  const transaccionId = useMemo(() => {
    if (!params.transaccionId) return null;
    return Array.isArray(params.transaccionId) ? params.transaccionId[0] : params.transaccionId;
  }, [params.transaccionId]);

  const referencia = useMemo(() => {
    if (!params.referencia) return null;
    return Array.isArray(params.referencia) ? params.referencia[0] : params.referencia;
  }, [params.referencia]);

  useEffect(() => {
    let isActive = true;

    const loadCheckoutUrl = async () => {
      let finalUrl = urlFromParams || null;
      let finalReferencia = referencia || null;

      if (!finalUrl) {
        finalUrl = await SecureStore.getItemAsync('wompi_checkout_url');
      }
      if (!finalReferencia) {
        finalReferencia = await SecureStore.getItemAsync('wompi_checkout_ref');
      }

      if (!isActive) return;

      if (!finalUrl) {
        setErrorMessage('No se encontró la URL de Wompi. Vuelve a intentar desde el checkout.');
        return;
      }

      setCheckoutUrl(finalUrl);
      setReferenciaState(finalReferencia);
      setErrorMessage(null);

      if (!hasOpenedRef.current) {
        hasOpenedRef.current = true;
        setIsLoading(true);
      }
    };

    void loadCheckoutUrl();

    return () => {
      isActive = false;
    };
  }, [urlFromParams]);

  const handleNavigation = useCallback((navState: WebViewNavigation) => {
    const url = navState.url || '';

    // Evitar falsos positivos: la URL inicial de Wompi trae redirect-url en query
    if (
      !url ||
      url.startsWith('about:') ||
      url.includes('checkout.wompi.co')
    ) {
      return;
    }

    let pathname = '';
    try {
      pathname = new URL(url).pathname || '';
    } catch {
      return;
    }

    if (hasCompletedRef.current) {
      return;
    }

    if (pathname.endsWith('/pago-exitoso')) {
      hasCompletedRef.current = true;
      setShowWebView(false);
      setIsConfirming(true);
    }
    if (pathname.endsWith('/pago-error')) {
      hasCompletedRef.current = true;
      setErrorMessage('El pago no se completó. Intenta nuevamente.');
      setShowWebView(false);
    }
  }, []);

  useEffect(() => {
    const referenciaPago = referencia || referenciaState;
    if (!referenciaPago || !isConfirming) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30;

    const intervalId = setInterval(async () => {
      if (cancelled) return;
      attempts += 1;

      try {
        const response = await ordersApi.getUserOrderByReference(referenciaPago);
        if (response.success && response.data?.id) {
          await queryClient.invalidateQueries({ queryKey: ['cart'] });
          await queryClient.invalidateQueries({ queryKey: ['cart', 'summary'] });
          setIsConfirming(false);
          router.replace(`/(customer)/orders/${response.data.id}`);
          clearInterval(intervalId);
        }
      } catch (error: any) {
        const status = error?.response?.status;
        if (status && status !== 404) {
          setErrorMessage('No se pudo confirmar el pedido. Intenta nuevamente.');
          setIsConfirming(false);
          clearInterval(intervalId);
        }
      }

      if (attempts >= maxAttempts) {
        setIsConfirming(false);
        setErrorMessage('Estamos confirmando tu pago. Revisa tus pedidos en unos minutos.');
        clearInterval(intervalId);
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [referencia, referenciaState, isConfirming, queryClient]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Pago con Wompi</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {errorMessage && (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={20} color="#D32F2F" />
            <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
          </View>
        )}

        <View style={styles.webviewContainer}>
          {showWebView ? (
            checkoutUrl ? (
              <WebView
                source={{ uri: checkoutUrl }}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onNavigationStateChange={handleNavigation}
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={tintColor} />
                    <ThemedText style={styles.loadingText}>Cargando Wompi...</ThemedText>
                  </View>
                )}
                cacheEnabled={false}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['https://*', 'http://*']}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <ThemedText style={styles.loadingText}>
                  No se encontró la URL de Wompi.
                </ThemedText>
              </View>
            )
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={tintColor} />
              <ThemedText style={styles.loadingText}>
                Estamos confirmando tu pago...
              </ThemedText>
            </View>
          )}
          {(isLoading && showWebView) || isConfirming ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={tintColor} />
              {isConfirming ? (
                <ThemedText style={styles.loadingText}>Confirmando pago...</ThemedText>
              ) : null}
            </View>
          ) : null}
        </View>

      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  headerRight: {
    minWidth: 22,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  webviewContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 320,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#666',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    flex: 1,
  },
  
});