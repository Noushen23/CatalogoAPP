import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { OrderSimple } from '@/core/api/ordersApi';
import { formatDate, formatCurrency } from '@/presentation/utils';
import { getOrderStatusColor, getOrderStatusText, getOrderStatusIcon } from '@/presentation/orders/utils';

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

  // Usar utilidades centralizadas para los estados
  const statusColor = getOrderStatusColor(order.estado);
  const statusText = getOrderStatusText(order.estado);
  const statusIcon = getOrderStatusIcon(order.estado);

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
            {order.metodoPago === 'tarjeta' ? 'Tarjeta' :
             order.metodoPago === 'pse' ? 'PSE' :
             order.metodoPago === 'nequi' ? 'Nequi' :
             order.metodoPago === 'bancolombia_transfer' ? 'Bancolombia' :
             order.metodoPago ? order.metodoPago.charAt(0).toUpperCase() + order.metodoPago.slice(1).replace('_', ' ') : 'No especificado'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.totalLabel}>Total:</ThemedText>
        <ThemedText style={[styles.totalAmount, { color: tintColor }]}>
          {formatCurrency(order.total)}
        </ThemedText>
      </View>

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
  arrowContainer: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
});
