import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { FullScreenLoader } from '@/presentation/theme/components/FullScreenLoader';
import { ErrorDisplay } from '@/presentation/theme/components/ErrorDisplay';
import { EmptyState } from '@/presentation/theme/components/EmptyState';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useCart, useClearCart } from '@/presentation/cart/hooks/useCart';
import { CartItem } from '@/presentation/cart/components/CartItem';
import { CartSummary } from '@/presentation/cart/components/CartSummary';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';

export default function CartScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Hook para obtener usuario autenticado
  const { user } = useAuthStore();

  const { data: cart, isLoading, error, refetch } = useCart();
  const clearCartMutation = useClearCart();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el carrito');
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuantityChange = () => {
    // Refrescar el carrito cuando cambie la cantidad
    refetch();
  };

  const handleClearCart = () => {
    // Refrescar el carrito después de limpiarlo
    refetch();
  };

  const handleCheckout = () => {
    // La navegación se maneja en CartSummary
    console.log('Checkout iniciado desde Cart');
  };

  if (isLoading && !refreshing) {
    return <FullScreenLoader message="Cargando carrito..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Error al cargar el carrito"
        error={error}
        onRetry={onRefresh}
      />
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>Mi Carrito</ThemedText>
        
        <View style={styles.headerRight}>
          {!isEmpty && (
            <TouchableOpacity
              onPress={() => {
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
                          refetch();
                        } catch (error) {
                          Alert.alert('Error', 'No se pudo limpiar el carrito');
                        }
                      }
                    }
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={22} color="#F44336" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isEmpty ? (
        /* Carrito vacío */
        <EmptyState
          icon="cart-outline"
          iconSize={80}
          title="Tu carrito está vacío"
          description="Agrega algunos productos para continuar con tu compra"
          actionText="Ir a comprar"
          actionIcon="storefront-outline"
          onAction={() => router.push('/(customer)/catalog')}
        />
      ) : (
        /* Carrito con productos */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Lista de productos */}
          <View style={styles.itemsContainer}>
            <ThemedText style={styles.sectionTitle}>
              Productos ({cart.totalItems})
            </ThemedText>
            
            {cart.items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onQuantityChange={handleQuantityChange}
              />
            ))}
          </View>

          {/* Resumen del carrito */}
          <CartSummary
            total={cart.total}
            totalItems={cart.totalItems}
            onCheckout={handleCheckout}
            onClearCart={handleClearCart}
          />
        </ScrollView>
      )}
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
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  itemsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
});