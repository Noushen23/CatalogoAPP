import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useUserOrder } from '@/presentation/orders/hooks/useOrders';
import { Order } from '@/core/api/ordersApi';
import { formatDateTime, formatCurrency } from '@/presentation/utils';
import { getOrderStatusColor, getOrderStatusText, getOrderStatusIcon } from '@/presentation/orders/utils';

export default function OrderConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Usar el hook para cargar el pedido
  const { data: order, isLoading, error } = useUserOrder(id || '');

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tintColor} />
        <ThemedText style={styles.loadingText}>Cargando pedido...</ThemedText>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <ThemedText style={styles.errorText}>
          {error?.message || 'Error al cargar el pedido'}
        </ThemedText>
        <ThemedText style={styles.errorSubtext}>
          No se pudo obtener la información del pedido
        </ThemedText>
        
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: tintColor }]}
          onPress={() => {
            // Llevar al usuario a un lugar seguro: la lista de pedidos
            router.replace('/(customer)/orders' as any);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="list-outline" size={20} color="white" />
          <ThemedText style={styles.retryButtonText}>
            Ver Mis Pedidos
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.secondaryRetryButton, { borderColor: tintColor }]}
          onPress={() => {
            // Opción secundaria: volver al catálogo
            router.replace('/(customer)/catalog');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="storefront-outline" size={20} color={tintColor} />
          <ThemedText style={[styles.secondaryRetryButtonText, { color: tintColor }]}>
            Volver al Catálogo
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor }]}>
        <TouchableOpacity onPress={() => router.replace('/(customer)/catalog')} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>Pedido Confirmado</ThemedText>
        
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Estado del Pedido */}
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIcon, { backgroundColor: getOrderStatusColor(order.estado) + '20' }]}>
              <Ionicons 
                name={getOrderStatusIcon(order.estado) as any} 
                size={32} 
                color={getOrderStatusColor(order.estado)} 
              />
            </View>
            
            <View style={styles.statusInfo}>
              <ThemedText style={styles.statusTitle}>
                ¡Pedido {getOrderStatusText(order.estado)}!
              </ThemedText>
              <ThemedText style={styles.statusSubtitle}>
                Número de orden: {order.numeroOrden}
              </ThemedText>
            </View>
          </View>

          <View style={styles.successMessage}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <ThemedText style={styles.successText}>
              Tu pedido ha sido procesado exitosamente. Te enviaremos una confirmación por correo electrónico.
            </ThemedText>
          </View>
        </View>

        {/* Información del Pedido */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Información del Pedido</ThemedText>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Fecha de Pedido</ThemedText>
              <ThemedText style={styles.infoValue}>
                {formatDateTime(order.fechaCreacion)}
              </ThemedText>
            </View>

            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Estado</ThemedText>
              <View style={styles.statusBadge}>
                <ThemedText style={[styles.statusBadgeText, { color: getOrderStatusColor(order.estado) }]}>
                  {getOrderStatusText(order.estado)}
                </ThemedText>
              </View>
            </View>

            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Método de Pago</ThemedText>
              <ThemedText style={styles.infoValue}>
                {order.metodoPago ? order.metodoPago.charAt(0).toUpperCase() + order.metodoPago.slice(1) : 'No especificado'}
              </ThemedText>
            </View>

            {order.referenciaPago && (
              <View style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>Referencia de Pago</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {order.referenciaPago}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Dirección de Envío */}
        {order.direccionEnvio && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Dirección de Envío</ThemedText>
            
            <View style={styles.addressContainer}>
              <View style={styles.addressHeader}>
                <Ionicons name="location-outline" size={20} color={tintColor} />
                <ThemedText style={styles.addressName}>
                  {order.direccionEnvio.nombreDestinatario}
                </ThemedText>
              </View>
              
              <ThemedText style={styles.addressText}>
                {order.direccionEnvio.direccion}
              </ThemedText>
              <ThemedText style={styles.addressText}>
                {order.direccionEnvio.ciudad}, {order.direccionEnvio.departamento}
              </ThemedText>
              
              {order.direccionEnvio.telefono && (
                <View style={styles.phoneContainer}>
                  <Ionicons name="call-outline" size={16} color="#666" />
                  <ThemedText style={styles.phoneText}>
                    {order.direccionEnvio.telefono}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Productos del Pedido */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Productos ({order.items.length})</ThemedText>
          
          <View style={styles.productsContainer}>
            {order.items.map((item, index) => (
              <View key={item.id || index} style={styles.productItem}>
                <View style={styles.productInfo}>
                  <ThemedText style={styles.productName}>
                    {item.nombreProducto}
                  </ThemedText>
                  {item.productDescription && (
                    <ThemedText style={styles.productDescription}>
                      {item.productDescription}
                    </ThemedText>
                  )}
                  <ThemedText style={styles.productQuantity}>
                    Cantidad: {item.cantidad || item.quantity || 1}
                  </ThemedText>
                </View>
                
                <View style={styles.productPrice}>
                  <ThemedText style={styles.productUnitPrice}>
                    {formatCurrency(item.precioUnitario || item.unitPrice || 0)} c/u
                  </ThemedText>
                  <ThemedText style={styles.productSubtotal}>
                    {formatCurrency(item.subtotal || 0)}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Resumen de Costos */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Resumen de Costos</ThemedText>
          
          <View style={styles.costSummary}>
            <View style={styles.costRow}>
              <ThemedText style={styles.costLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.costValue}>
                {formatCurrency(order.subtotal || 0)}
              </ThemedText>
            </View>

            {(order.descuento || 0) > 0 && (
              <View style={styles.costRow}>
                <ThemedText style={styles.costLabel}>Descuento</ThemedText>
                <ThemedText style={[styles.costValue, styles.discountValue]}>
                  -{formatCurrency(order.descuento || 0)}
                </ThemedText>
              </View>
            )}

            <View style={styles.costRow}>
              <ThemedText style={styles.costLabel}>Envío</ThemedText>
              <ThemedText style={styles.costValue}>
                {formatCurrency(order.costoEnvio || 0)}
              </ThemedText>
            </View>

            {(order.impuestos || 0) > 0 && (
              <View style={styles.costRow}>
                <ThemedText style={styles.costLabel}>Impuestos</ThemedText>
                <ThemedText style={styles.costValue}>
                  {formatCurrency(order.impuestos || 0)}
                </ThemedText>
              </View>
            )}

            <View style={[styles.costRow, styles.totalRow]}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>
                {formatCurrency(order.total || 0)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Notas */}
        {order.notas && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Notas</ThemedText>
            <ThemedText style={styles.notesText}>
              {order.notas}
            </ThemedText>
          </View>
        )}

        {/* Botones de Acción */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: tintColor }]}
            onPress={() => router.replace('/(customer)/orders' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="list-outline" size={20} color="white" />
            <ThemedText style={styles.primaryButtonText}>
              Ver Mis Pedidos
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.replace('/(customer)/catalog')}
            activeOpacity={0.8}
          >
            <Ionicons name="storefront-outline" size={20} color={tintColor} />
            <ThemedText style={[styles.secondaryButtonText, { color: tintColor }]}>
              Seguir Comprando
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  secondaryRetryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
  },
  successText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  statusBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addressContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  phoneText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  productsContainer: {
    gap: 12,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
  productQuantity: {
    fontSize: 12,
    color: '#666',
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  productUnitPrice: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  productSubtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  costSummary: {
    gap: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  discountValue: {
    color: '#4CAF50',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
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
    color: '#1a1a1a',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 32,
  },
});
