import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { OrderDetail } from '@/presentation/orders/components/OrderDetail';
import { useUserOrder, useCancelUserOrder } from '@/presentation/orders/hooks/useOrders';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tintColor = useThemeColor({}, 'tint');
  
  const { 
    data: order, 
    isLoading: orderLoading, 
    error: orderError 
  } = useUserOrder(id!);
  
  const cancelOrderMutation = useCancelUserOrder();

  const handleCancelOrder = (orderId: string, reason?: string) => {
    cancelOrderMutation.mutate({ orderId, data: { reason } });
  };

  if (orderLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Cargando pedido...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (orderError || !order) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorTitle}>Error</ThemedText>
          <ThemedText style={styles.errorText}>
            No se pudo cargar el pedido. Verifica que el ID sea correcto.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <OrderDetail 
        order={order} 
        onCancelOrder={handleCancelOrder}
        showCancelButton={true}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});




























