import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useClearCart, useValidateCart } from '../hooks/useCart';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { formatCurrency } from '@/presentation/utils';

interface CartSummaryProps {
  total: number;
  totalItems: number;
  onCheckout?: () => void;
  onClearCart?: () => void;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  total,
  totalItems,
  onCheckout,
  onClearCart,
}) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = '#e0e0e0';

  // Hook para obtener usuario autenticado
  const { user } = useAuthStore();

  const clearCartMutation = useClearCart();
  const validateCartQuery = useValidateCart();

  // Calcular valores directamente
  const subtotal = parseFloat(total as any) || 0;
  const shipping = subtotal >= 300000 ? 0 : 15000; // Envío gratis si >= $300.000
  const totalWithShipping = subtotal + shipping;

  const handleClearCart = () => {
    Alert.alert(
      'Limpiar carrito',
      '¿Estás seguro de que quieres eliminar todos los productos del carrito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpiar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCartMutation.mutateAsync();
              onClearCart?.();
            } catch (error) {
              Alert.alert('Error', 'No se pudo limpiar el carrito');
            }
          }
        }
      ]
    );
  };

  const handleCheckout = async () => {
    // Validar que el email esté verificado
    if (!user?.emailVerificado) {
      Alert.alert(
        '📧 Email no verificado',
        'Debes verificar tu correo electrónico antes de realizar una compra. Por favor revisa tu bandeja de entrada y haz clic en el enlace de verificación.',
        [
          {
            text: 'Entendido',
            style: 'default',
          },
          {
            text: 'Ir a Verificar',
            onPress: () => {
              router.push('/auth/verify-email' as any);
            },
            style: 'default',
          },
        ]
      );
      return;
    }

    try {
      // Validar carrito antes del checkout
      const validation = await validateCartQuery.refetch();
      
      if (validation.data?.isValid) {
        // Navegar a la pantalla de checkout
        router.push('/(customer)/checkout');
        onCheckout?.();
      } else {
        const errors = validation.data?.errors || [];
        Alert.alert(
          'Carrito no válido',
          errors.join('\n'),
          [{ text: 'Entendido' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo validar el carrito');
    }
  };

  if (totalItems === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor, borderColor }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={48} color="#ccc" />
          <ThemedText style={styles.emptyText}>
            Tu carrito está vacío
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Agrega algunos productos para continuar
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor, borderColor }]}>
      {/* Resumen de productos */}
      <View style={styles.summaryHeader}>
        <ThemedText style={styles.summaryTitle}>Resumen del pedido</ThemedText>
        <View style={styles.itemCountContainer}>
          <Ionicons name="cube-outline" size={16} color="#666" />
          <ThemedText style={styles.itemCount}>
            {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
          </ThemedText>
        </View>
      </View>

      {/* Detalles del total */}
      <View style={styles.totalContainer}>
        <View style={styles.totalRow}>
         <ThemedText style={styles.totalLabel}>Subtotal:</ThemedText>
         <ThemedText style={styles.totalValue}>
          {formatCurrency(Math.round(subtotal))}
         </ThemedText>
        </View>
        
        <View style={styles.totalRow}>
          <ThemedText style={styles.totalLabel}>Envío:</ThemedText>
          <ThemedText style={styles.totalValue}>
            {shipping === 0 ? 'Gratis' : formatCurrency(Math.round(shipping))}
          </ThemedText>
        </View>
        
        <View style={[styles.totalRow, styles.finalTotalRow]}>
          <ThemedText style={styles.finalTotalLabel}>Total:</ThemedText>
          <ThemedText style={[styles.finalTotalValue, { color: tintColor }]}>
            {formatCurrency(Math.round(totalWithShipping))}
          </ThemedText>
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearCart}
          disabled={clearCartMutation.isPending}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color="#F44336" />
          <ThemedText style={styles.clearButtonText}>
            Limpiar carrito
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCheckout}
          disabled={validateCartQuery.isLoading}
          style={[styles.checkoutButton, { backgroundColor: tintColor }]}
          activeOpacity={0.8}
        >
          <Ionicons name="card-outline" size={20} color="white" style={{ marginRight: 8 }} />
          <ThemedText style={styles.checkoutButtonText}>
            Proceder al pago
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Información adicional */}
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#4CAF50" />
          <ThemedText style={styles.infoText}>
            Compra segura y protegida
          </ThemedText>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons name="refresh-outline" size={16} color="#2196F3" />
          <ThemedText style={styles.infoText}>
            Devoluciones fáciles
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  itemCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  totalContainer: {
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  finalTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  finalTotalLabel: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  finalTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  actionsContainer: {
    flexDirection: 'row',
    columnGap: 14,
    marginBottom: 18,
  },
  clearButton: {
    flex:2,
    flexDirection: 'row',
    columnGap: 4,
    rowGap: 4,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 0,
    borderRadius: 9,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#f87171',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F44336',
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlign: 'center',
    letterSpacing: 0.1,
    
  },
  checkoutButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    minHeight:36,
  },
  checkoutButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 0,
    paddingHorizontal: 0,
    paddingVertical: 2,
    
  },
});
