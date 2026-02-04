import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { OrderSimple } from '@/core/api/ordersApi';
import { formatDate, formatCurrency } from '@/presentation/utils';
import { getOrderStatusColor, getOrderStatusText, getOrderStatusIcon } from '@/presentation/orders/utils';
import { useReintentarPago } from '@/presentation/pagos/hooks/usePagos';

interface OrderItemProps {
  order: OrderSimple;
  onPress: (orderId: string) => void;
  showActions?: boolean;
}

export const OrderItem: React.FC<OrderItemProps> = ({ 
  order, 
  onPress,
  showActions = true,
}) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const router = useRouter();
  const reintentarPagoMutation = useReintentarPago();

  // Usar utilidades centralizadas para los estados
  const statusColor = getOrderStatusColor(order.estado);
  const statusText = getOrderStatusText(order.estado);
  const statusIcon = getOrderStatusIcon(order.estado);
  const estadoNormalizado = (order.estado || '').toString().trim().toLowerCase();
  const showRetryPayment = [
    'cancelada',
    'cancelado',
    'canceled',
    'cancelled',
    'pago_fallido',
    'fallido',
    'error',
    'failed',
  ].includes(estadoNormalizado);

  const handleRetryPayment = async () => {
    try {
      const transaccionResult = await reintentarPagoMutation.mutateAsync({
        pedidoId: order.id,
      });

      if (transaccionResult?.urlCheckout) {
        try {
          await SecureStore.setItemAsync('wompi_checkout_url', transaccionResult.urlCheckout);
          if (transaccionResult.referencia) {
            await SecureStore.setItemAsync('wompi_checkout_ref', transaccionResult.referencia);
          }
        } catch (storeError) {
          console.warn('⚠️ [Pago] No se pudo guardar URL en SecureStore:', storeError);
        }

        router.push({
          pathname: '/(customer)/wompi-checkout',
          params: {
            transaccionId: transaccionResult.transaccionId,
            urlCheckout: transaccionResult.urlCheckout,
            referencia: transaccionResult.referencia,
            pedidoId: transaccionResult.pedidoId,
          },
        });
      } else {
        throw new Error('No se recibió URL de checkout de Wompi');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo reintentar el pago';
      Alert.alert('Error al Reintentar Pago', errorMessage, [{ text: 'Entendido' }]);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: cardBackground }]}
      onPress={() => onPress(order.id)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.orderInfo}>
          <ThemedText style={styles.orderNumber}>{order.numeroOrden}</ThemedText>
          <ThemedText style={styles.orderDate}>{formatDate(order.fechaCreacion, { format: 'long' })}</ThemedText>
        </View>
        
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={statusIcon as any} size={16} color={statusColor} />
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </ThemedText>
          </View>
          
          {/* Indicador de urgencia */}
          {order.estado === 'pendiente' && (
            <View style={styles.urgencyIndicator}>
              <Ionicons name="time-outline" size={12} color="#F59E0B" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.itemsInfo}>
          <Ionicons name="cube-outline" size={16} color="#666" />
          <ThemedText style={styles.itemsText}>
            {order.itemsCount} {order.itemsCount === 1 ? 'producto' : 'productos'}
          </ThemedText>
        </View>

        <View style={styles.paymentInfo}>
          <Ionicons name="card-outline" size={16} color="#666" />
          <ThemedText style={styles.paymentText}>
            Wompi
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.totalLabel}>Total:</ThemedText>
        <ThemedText style={[styles.totalAmount, { color: tintColor }]}>
          {formatCurrency(order.total)}
        </ThemedText>
      </View>
      {showRetryPayment && (
        <TouchableOpacity
          style={[styles.retryPaymentButton, { backgroundColor: tintColor }]}
          onPress={(event) => {
            event.stopPropagation();
            handleRetryPayment();
          }}
          disabled={reintentarPagoMutation.isPending}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={14} color="white" />
          <ThemedText style={styles.retryPaymentButtonText}>
            Reintentar pago
          </ThemedText>
        </TouchableOpacity>
      )}

      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    marginHorizontal: 16,
    marginTop: 2,
    borderRadius: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    textAlign: 'left',
    letterSpacing: 0.5,
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 0.5,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  urgencyIndicator: {
    marginTop: 4,
    padding: 2,
    borderRadius: 8,
    backgroundColor: '#F59E0B20',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryPaymentButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 6,
  },
  retryPaymentButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  arrowContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
});
