import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Dimensions,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { Order } from '@/core/api/ordersApi';
import { formatDateTime, formatCurrency } from '@/presentation/utils';
import { getOrderStatusColor, getOrderStatusText, getOrderStatusIcon } from '@/presentation/orders/utils';
import { useReintentarPago } from '@/presentation/pagos/hooks/usePagos';

const { width } = Dimensions.get('window');

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
  const router = useRouter();
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const reintentarPagoMutation = useReintentarPago();
  
  const [showFullDescription, setShowFullDescription] = useState<Record<string, boolean>>({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Log para depuración - verificar el estado del pedido
  React.useEffect(() => {
    if (order) {
      console.log('📦 [OrderDetail] Pedido cargado - ID:', order.id, 'Estado:', order.estado);
    }
  }, [order]);

  // Funciones de utilidad
  const openMaps = () => {
    if (order.direccionEnvio?.direccion) {
      const address = encodeURIComponent(
        `${order.direccionEnvio.direccion}, ${order.direccionEnvio.ciudad}, ${order.direccionEnvio.departamento}`
      );
      Linking.openURL(`https://maps.google.com/maps?q=${address}`);
    }
  };

  const handleCancelOrder = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Cancelar Pedido',
        '¿Estás seguro de que quieres cancelar este pedido? (Opcional: explica el motivo)',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Sí, Cancelar', 
            style: 'destructive',
            onPress: (reason: any) => {
              if (onCancelOrder) {
                onCancelOrder(order.id, reason || undefined);
              }
            }
          }
        ],
        'plain-text',
        ''
      );
      return;
    }

    setCancelReason('');
    setShowCancelModal(true);
  };

  // Solo se puede cancelar si el pedido está en estado 'pendiente' y no está pagado
  const canCancelOrder = order.estado === 'pendiente' && !order.referenciaPago;
  
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

  // Calcular estadísticas del pedido
  const orderStats = useMemo(() => {
    const totalItems = order.items?.length || 0;
    const totalQuantity = order.items?.reduce((sum, item) => sum + (item.cantidad || item.quantity || 0), 0) || 0;
    const averageItemPrice = totalQuantity > 0 ? order.subtotal / totalQuantity : 0;
    
    return {
      totalItems,
      totalQuantity,
      averageItemPrice,
      hasDiscount: order.descuento > 0,
      hasShipping: order.costoEnvio > 0,
      hasTaxes: order.impuestos > 0,
    };
  }, [order]);

  // Timeline de estados
  const orderTimeline = useMemo(() => {
    const timeline = [
      {
        status: 'pendiente',
        label: 'Pedido Recibido',
        description: 'El pedido ha sido recibido y está pendiente de confirmación',
        icon: 'time-outline' as const,
        color: '#F59E0B',
      },
      {
        status: 'confirmada',
        label: 'Pedido Confirmado',
        description: 'El pedido ha sido confirmado y está siendo procesado',
        icon: 'checkmark-circle-outline' as const,
        color: '#3B82F6',
      },
      {
        status: 'en_proceso',
        label: 'En Preparación',
        description: 'El pedido está siendo preparado para el envío',
        icon: 'refresh-outline' as const,
        color: '#8B5CF6',
      },
      {
        status: 'enviada',
        label: 'Enviado',
        description: 'El pedido ha sido enviado y está en camino',
        icon: 'car-outline' as const,
        color: '#6366F1',
      },
      {
        status: 'entregada',
        label: 'Entregado',
        description: 'El pedido ha sido entregado exitosamente',
        icon: 'checkmark-circle' as const,
        color: '#10B981',
      },
    ];

    const currentIndex = timeline.findIndex(item => item.status === order.estado);
    
    return timeline.map((item, index) => ({
      ...item,
      isActive: index === currentIndex,
      isCompleted: index < currentIndex,
      isCancelled: order.estado === 'cancelada' || order.estado === 'reembolsada',
    }));
  }, [order.estado]);

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
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header del pedido mejorado */}
      <ThemedView style={styles.header}>
        <View style={styles.orderInfo}>
          <View style={styles.orderNumberContainer}>
            <ThemedText style={styles.orderNumber}>{order.numeroOrden}</ThemedText>
          </View>
          <ThemedText style={styles.orderDate}>{formatDateTime(order.fechaCreacion)}</ThemedText>
        </View>
        
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusColor + '30' }]}>
              <Ionicons name={statusIcon as any} size={16} color={statusColor} />
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
          {showRetryPayment && (
            <TouchableOpacity
              style={[styles.retryPaymentButton, { backgroundColor: tintColor }]}
              onPress={handleRetryPayment}
              disabled={reintentarPagoMutation.isPending}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color="white" />
              <ThemedText style={styles.retryPaymentButtonText}>
                Reintentar pago
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Estadísticas rápidas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: tintColor }]}>{orderStats.totalItems}</ThemedText>
            <ThemedText style={styles.statLabel}>Productos</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: '#10B981' }]}>{orderStats.totalQuantity}</ThemedText>
            <ThemedText style={styles.statLabel}>Cantidad</ThemedText>
          </View>
          {/* <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: '#8B5CF6' }]}>
              {formatCurrency(orderStats.averageItemPrice)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Promedio</ThemedText>
          </View> */}
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: '#F59E0B' }]}>
              {formatCurrency(order.total)}
            </ThemedText>
            <ThemedText style={styles.statLabel}>Total</ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Información de envío mejorada */}
      {order.direccionEnvio && (
        <ThemedView style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Dirección de Envío</ThemedText>
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={openMaps} style={styles.actionButton}>
                <Ionicons name="map-outline" size={16} color={tintColor} />
              </TouchableOpacity>
            </View>
          </View>
          
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

      {/* Productos del pedido mejorados */}
      <ThemedView style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Productos</ThemedText>
          <View style={styles.productCountBadge}>
            <ThemedText style={styles.productCountText}>{order.items.length}</ThemedText>
          </View>
        </View>
        {order.items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.productItem, index === order.items.length - 1 && styles.lastProductItem]}
            onPress={() => {
              if (item.productId) {
                router.push(`/(customer)/product/${item.productId}` as any);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.productImageContainer}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
              ) : (
                <View style={styles.placeholderImageContainer}>
                  <Ionicons name="cube-outline" size={32} color="#999" />
                </View>
              )}
            </View>
            
            <View style={styles.productInfo}>
              <ThemedText style={styles.productName} numberOfLines={2}>
                {item.nombreProducto || item.productName}
              </ThemedText>
              {item.productDescription && (
                <>
                  <ThemedText 
                    style={styles.productDescription} 
                    numberOfLines={showFullDescription[item.id] ? undefined : 2}
                  >
                    {item.productDescription}
                  </ThemedText>
                  {item.productDescription.length > 80 && (
                    <TouchableOpacity 
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowFullDescription(prev => ({
                          ...prev, 
                          [item.id]: !prev[item.id]
                        }));
                      }}
                    >
                      <ThemedText style={[styles.readMoreText, { color: tintColor }]}>
                        {showFullDescription[item.id] ? '▲ Ver menos' : '▼ Ver más'}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </>
              )}
              <View style={styles.productDetails}>
                <View style={styles.quantityBadge}>
                  <Ionicons name="cube-outline" size={12} color="#666" />
                  <ThemedText style={styles.productQuantity}>
                    {item.cantidad || item.quantity}
                  </ThemedText>
                </View>
                <ThemedText style={styles.productPrice}>
                  {formatCurrency(item.precioUnitario || item.unitPrice || 0)} c/u
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.productSubtotal}>
              <ThemedText style={styles.subtotalLabel}>Total</ThemedText>
              <ThemedText style={[styles.subtotalAmount, { color: tintColor }]}>
                {formatCurrency(item.subtotal)}
              </ThemedText>
            </View>
          </TouchableOpacity>
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
            {order.metodoPago === 'wompi' ? 'Wompi' : 'Wompi'}
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
          <ThemedText style={styles.sectionTitle}>Notassssss</ThemedText>
          <ThemedText style={styles.notesText}>{order.notas}</ThemedText>
        </ThemedView>
      )}

      {/* Timeline del pedido */}
      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Timeline del Pedido</ThemedText>
        <View style={styles.timelineContainer}>
          {orderTimeline.map((step, index) => (
            <View key={step.status} style={styles.timelineItem}>
              <View style={styles.timelineIconContainer}>
                <View
                  style={[
                    styles.timelineIcon,
                    {
                      backgroundColor: step.isCancelled
                        ? '#9CA3AF'
                        : step.isActive
                        ? step.color
                        : step.isCompleted
                        ? '#10B981'
                        : '#E5E7EB',
                    },
                  ]}
                >
                  <Ionicons
                    name={step.icon}
                    size={20}
                    color={
                      step.isCancelled
                        ? '#FFFFFF'
                        : step.isActive
                        ? '#FFFFFF'
                        : step.isCompleted
                        ? '#FFFFFF'
                        : '#9CA3AF'
                    }
                  />
                </View>
                {index < orderTimeline.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      {
                        backgroundColor: step.isCompleted && !step.isCancelled ? '#10B981' : '#E5E7EB',
                      },
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <ThemedText
                  style={[
                    styles.timelineTitle,
                    {
                      color: step.isCancelled
                        ? '#9CA3AF'
                        : step.isActive
                        ? step.color
                        : step.isCompleted
                        ? '#10B981'
                        : '#9CA3AF',
                    },
                  ]}
                >
                  {step.label}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.timelineDescription,
                    {
                      color: step.isCancelled
                        ? '#9CA3AF'
                        : step.isActive
                        ? '#374151'
                        : step.isCompleted
                        ? '#10B981'
                        : '#9CA3AF',
                    },
                  ]}
                >
                  {step.description}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </ThemedView>

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
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackground }]}>
            <ThemedText style={styles.modalTitle}>Cancelar Pedido</ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              ¿Estás seguro de que quieres cancelar este pedido? (Opcional: explica el motivo)
            </ThemedText>
            <TextInput
              style={styles.modalInput}
              placeholder="Motivo (opcional)"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCancelModal(false)}
              >
                <ThemedText style={styles.modalCancelText}>No</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: '#F44336' }]}
                onPress={() => {
                  setShowCancelModal(false);
                  if (onCancelOrder) {
                    const reason = cancelReason.trim();
                    onCancelOrder(order.id, reason || undefined);
                  }
                }}
              >
                <ThemedText style={styles.modalConfirmText}>Sí, Cancelar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    marginBottom: 32,
    marginHorizontal: 16,
    marginTop: 22,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    // elevation: 1,
  },
  orderInfo: {
    marginBottom: 12,
  },
  orderNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    flex: 1,
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 0.5,
  },
  statLabel: {
    fontSize: 11,
    color: '#777',
    textAlign: 'center',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    // elevation: 3,
  },
  statusIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  retryPaymentButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  retryPaymentButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  section: {
    padding: 18,
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    // elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // elevation: 1,
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  shippingText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  lastProductItem: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.3,
  },
  productImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  placeholderImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
    lineHeight: 20,
  },
  productDescription: {
    fontSize: 12,
    color: '#777',
    marginBottom: 8,
    lineHeight: 18,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  quantityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  productQuantity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  productPrice: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  productSubtotal: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subtotalLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  productCountBadge: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 2,
  },
  priceLabel: {
    fontSize: 14,
    color: '#777',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 12,
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    marginHorizontal: -18,
    paddingHorizontal: 18,
    paddingBottom: 6,
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  paymentText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 10,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    fontWeight: '400',
    paddingVertical: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F44336',
    backgroundColor: '#FEE2E2',
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // elevation: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 70,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  modalConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  timelineContainer: {
    marginTop: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // elevation: 2,
  },
  timelineLine: {
    width: 3,
    height: 44,
    marginTop: 6,
    borderRadius: 2,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 10,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 5,
    letterSpacing: 0.3,
  },
  timelineDescription: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.85,
  },
});
