import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { Order } from '@/core/api/ordersApi';
import { formatDateTime, formatCurrency } from '@/presentation/utils';
import { getOrderStatusColor, getOrderStatusText, getOrderStatusIcon } from '@/presentation/orders/utils';

interface OrderDetailProps {
  order: Order;
  onCancelOrder?: (orderId: string, reason?: string) => void;
  showCancelButton?: boolean;
}

export const OrderDetail: React.FC<OrderDetailProps> = ({ 
  order, 
  onCancelOrder,
  showCancelButton = true 
}) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');

  const handleCancelOrder = () => {
    Alert.prompt(
      'Cancelar Pedido',
      '¿Estás seguro de que quieres cancelar este pedido? (Opcional: explica el motivo)',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, Cancelar', 
          style: 'destructive',
          onPress: (reason) => {
            if (onCancelOrder) {
              onCancelOrder(order.id, reason || undefined);
            }
          }
        }
      ],
      'plain-text',
      ''
    );
  };

  const canCancelOrder = ['pendiente', 'confirmada'].includes(order.estado);
  
  // Usar utilidades centralizadas para los estados
  const statusColor = getOrderStatusColor(order.estado);
  const statusText = getOrderStatusText(order.estado);
  const statusIcon = getOrderStatusIcon(order.estado);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header del pedido */}
      <ThemedView style={styles.header}>
        <View style={styles.orderInfo}>
          <ThemedText style={styles.orderNumber}>{order.numeroOrden}</ThemedText>
          <ThemedText style={styles.orderDate}>{formatDateTime(order.fechaCreacion)}</ThemedText>
        </View>
        
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusColor + '30' }]}>
              <Ionicons name={statusIcon as any} size={18} color={statusColor} />
            </View>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </ThemedText>
          </View>
          
          {/* Información adicional del estado */}
          <View style={styles.statusInfo}>
            <ThemedText style={[styles.statusSubtitle, { color: statusColor }]}>
              {order.estado === 'pendiente' && 'Esperando confirmación'}
              {order.estado === 'confirmada' && 'Pedido confirmado y procesando'}
              {order.estado === 'en_proceso' && 'Preparando tu pedido'}
              {order.estado === 'enviada' && 'En camino a tu dirección'}
              {order.estado === 'entregada' && 'Pedido entregado exitosamente'}
              {order.estado === 'cancelada' && 'Pedido cancelado'}
              {order.estado === 'reembolsada' && 'Reembolso procesado'}
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Información de envío */}
      {order.direccionEnvio && (
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Dirección de Envío</ThemedText>
          <View style={styles.shippingInfo}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <ThemedText style={styles.shippingText}>{order.direccionEnvio.nombreDestinatario}</ThemedText>
          </View>
          {order.direccionEnvio.telefono && (
            <View style={styles.shippingInfo}>
              <Ionicons name="call-outline" size={16} color="#666" />
              <ThemedText style={styles.shippingText}>{order.direccionEnvio.telefono}</ThemedText>
            </View>
          )}
          <View style={styles.shippingInfo}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <ThemedText style={styles.shippingText}>
              {order.direccionEnvio.direccion}, {order.direccionEnvio.ciudad}, {order.direccionEnvio.departamento}
            </ThemedText>
          </View>
        </ThemedView>
      )}

      {/* Productos del pedido */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Productos ({order.items.length})</ThemedText>
        {order.items.map((item) => (
          <View key={item.id} style={styles.productItem}>
            <View style={styles.productImageContainer}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
              ) : (
                <Ionicons name="image-outline" size={40} color="#ccc" />
              )}
            </View>
            
            <View style={styles.productInfo}>
              <ThemedText style={styles.productName} numberOfLines={2}>
                {item.nombreProducto || item.productName}
              </ThemedText>
              {item.productDescription && (
                <ThemedText style={styles.productDescription} numberOfLines={2}>
                  {item.productDescription}
                </ThemedText>
              )}
              <View style={styles.productDetails}>
                <ThemedText style={styles.productQuantity}>
                  Cantidad: {item.cantidad || item.quantity}
                </ThemedText>
                <ThemedText style={styles.productPrice}>
                  {formatCurrency(item.precioUnitario || item.unitPrice || 0)} c/u
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.productSubtotal}>
              <ThemedText style={styles.subtotalAmount}>
                {formatCurrency(item.subtotal)}
              </ThemedText>
            </View>
          </View>
        ))}
      </ThemedView>

      {/* Resumen de precios */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Resumen de Precios</ThemedText>
        
        <View style={styles.priceRow}>
          <ThemedText style={styles.priceLabel}>Subtotal:</ThemedText>
          <ThemedText style={styles.priceValue}>{formatCurrency(order.subtotal)}</ThemedText>
        </View>
        
        {order.descuento > 0 && (
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceLabel}>Descuento:</ThemedText>
            <ThemedText style={[styles.priceValue, { color: '#4CAF50' }]}>
              -{formatCurrency(order.descuento)}
            </ThemedText>
          </View>
        )}
        
        {order.costoEnvio > 0 && (
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceLabel}>Envío:</ThemedText>
            <ThemedText style={styles.priceValue}>{formatCurrency(order.costoEnvio)}</ThemedText>
          </View>
        )}
        
        {order.impuestos > 0 && (
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceLabel}>Impuestos:</ThemedText>
            <ThemedText style={styles.priceValue}>{formatCurrency(order.impuestos)}</ThemedText>
          </View>
        )}
        
        <View style={[styles.priceRow, styles.totalRow]}>
          <ThemedText style={styles.totalLabel}>Total:</ThemedText>
          <ThemedText style={[styles.totalValue, { color: tintColor }]}>
            {formatCurrency(order.total)}
          </ThemedText>
        </View>
      </ThemedView>

      {/* Información de pago */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Información de Pago</ThemedText>
        <View style={styles.paymentInfo}>
          <Ionicons name="card-outline" size={16} color="#666" />
          <ThemedText style={styles.paymentText}>
            {order.metodoPago === 'efectivo' ? 'Efectivo' : 
             order.metodoPago === 'tarjeta' ? 'Tarjeta' :
             order.metodoPago === 'transferencia' ? 'Transferencia' :
             order.metodoPago === 'pse' ? 'PSE' : order.metodoPago}
          </ThemedText>
        </View>
        {order.referenciaPago && (
          <View style={styles.paymentInfo}>
            <Ionicons name="receipt-outline" size={16} color="#666" />
            <ThemedText style={styles.paymentText}>Ref: {order.referenciaPago}</ThemedText>
          </View>
        )}
      </ThemedView>

      {/* Notas */}
      {order.notas && (
        <ThemedView style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Notas</ThemedText>
          <ThemedText style={styles.notesText}>{order.notas}</ThemedText>
        </ThemedView>
      )}

      {/* Botón de cancelar */}
      {showCancelButton && canCancelOrder && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelOrder}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle-outline" size={20} color="#F44336" />
          <ThemedText style={styles.cancelButtonText}>Cancelar Pedido</ThemedText>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderInfo: {
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusSection: {
    alignItems: 'flex-start',
  },
  statusInfo: {
    marginTop: 8,
  },
  statusSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  section: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shippingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productQuantity: {
    fontSize: 12,
    color: '#666',
  },
  productPrice: {
    fontSize: 12,
    color: '#666',
  },
  productSubtotal: {
    alignItems: 'flex-end',
  },
  subtotalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
    backgroundColor: '#F4433610',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F44336',
    marginLeft: 8,
  },
});
