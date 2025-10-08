import * as React from 'react';
import { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { CartItem as CartItemType } from '@/core/api/cartApi';
import { useUpdateCartItem, useRemoveFromCart } from '../hooks/useCart';
import { ProductImage } from './ProductImage';
import { formatCurrency } from '@/presentation/utils';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange?: () => void;
}

export const CartItem: React.FC<CartItemProps> = ({ item, onQuantityChange }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = '#e0e0e0';

  // Debug: Log de datos del item
  console.log('🛒 CartItem data:', {
    id: item.id,
    productoNombre: item.productoNombre,
    imagenPrincipal: item.imagenPrincipal,
    cantidad: item.cantidad,
    hasImage: !!item.imagenPrincipal,
    imageType: typeof item.imagenPrincipal
  });

  const updateItemMutation = useUpdateCartItem();
  const removeItemMutation = useRemoveFromCart();

  const handleQuantityChange = async (newQuantity: number) => {
    // Evitar múltiples llamadas simultáneas
    if (isUpdating) return;
    
    if (newQuantity === item.cantidad) return;
    
    // Verificar si el producto está disponible
    if (!item.productoActivo) {
      Alert.alert(
        'Producto no disponible',
        'Este producto ya no está disponible. Se eliminará del carrito.',
        [
          { text: 'Entendido', onPress: () => handleRemove() }
        ]
      );
      return;
    }
    
    if (newQuantity <= 0) {
      Alert.alert(
        'Eliminar producto',
        '¿Estás seguro de que quieres eliminar este producto del carrito?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => handleRemove() }
        ]
      );
      return;
    }

    if (newQuantity > item.stock) {
      Alert.alert('Stock insuficiente', `Solo hay ${item.stock} unidades disponibles`);
      return;
    }

    setIsUpdating(true);
    try {
      await updateItemMutation.mutateAsync({
        itemId: item.id,
        data: { quantity: newQuantity }
      });
      
      // Llamar callback después de éxito
      setTimeout(() => {
        onQuantityChange?.();
      }, 100);
      
    } catch (error) {
      console.error('Error updating cart item quantity:', error);
      
      // Manejar diferentes tipos de errores
      let errorMessage = 'No se pudo actualizar la cantidad. Inténtalo de nuevo.';
      
      if (error instanceof Error) {
        if (error.message.includes('ya no está disponible') || error.message.includes('no está disponible')) {
          errorMessage = 'Este producto ya no está disponible. Se eliminará del carrito.';
          // Eliminar el producto del carrito automáticamente
          setTimeout(() => {
            handleRemove();
          }, 2000);
        } else if (error.message.includes('Stock insuficiente')) {
          errorMessage = 'Stock insuficiente. No se puede aumentar la cantidad.';
        } else if (error.message.includes('cantidad')) {
          errorMessage = 'Cantidad inválida. Verifica el valor ingresado.';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    // Evitar múltiples llamadas simultáneas
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await removeItemMutation.mutateAsync(item.id);
      
      // Llamar callback después de éxito
      setTimeout(() => {
        onQuantityChange?.();
      }, 100);
      
    } catch (error) {
      console.error('Error removing cart item:', error);
      Alert.alert('Error', 'No se pudo eliminar el producto del carrito. Inténtalo de nuevo.');
    } finally {
      setIsUpdating(false);
    }
  };

  const precioFinal = item.precioOferta && item.precioOferta < item.precioOriginal 
    ? item.precioOferta 
    : item.precioOriginal;

  const isEnOferta = item.precioOferta && item.precioOferta < item.precioOriginal;

  return (
    <ThemedView style={[
      styles.container, 
      { backgroundColor, borderColor },
      !item.productoActivo && styles.unavailableContainer
    ]}>
      {/* Imagen del producto */}
      <View style={styles.imageContainer}>
        <ProductImage
          imageUrl={item.imagenPrincipal}
          productName={item.productoNombre}
          style={[
            styles.productImage,
            !item.productoActivo && styles.unavailableImage
          ]}
        />
        {!item.productoActivo && (
          <View style={styles.unavailableOverlay}>
            <Ionicons name="ban" size={24} color="#FF9800" />
            <ThemedText style={styles.unavailableText}>No disponible</ThemedText>
          </View>
        )}
      </View>

      {/* Información del producto */}
      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={2}>
          {item.productoNombre}
        </ThemedText>
        
        {item.categoriaNombre && (
          <View style={styles.categoryContainer}>
            <Ionicons name="folder-outline" size={12} color="#666" />
            <ThemedText style={styles.categoryText}>
              {item.categoriaNombre}
            </ThemedText>
          </View>
        )}

        {/* Precio */}
        <View style={styles.priceContainer}>
          {isEnOferta ? (
            <>
              <ThemedText style={styles.originalPrice}>
                {formatCurrency(item.precioOriginal)}
              </ThemedText>
              <ThemedText style={[styles.finalPrice, { color: tintColor }]}>
                {formatCurrency(precioFinal)}
              </ThemedText>
            </>
          ) : (
            <ThemedText style={[styles.finalPrice, { color: tintColor }]}>
              {formatCurrency(precioFinal)}
            </ThemedText>
          )}
        </View>

        {/* Stock */}
        <View style={styles.stockContainer}>
          <Ionicons 
            name={!item.productoActivo ? "ban" : item.stock > 0 ? "checkmark-circle" : "close-circle"} 
            size={12} 
            color={!item.productoActivo ? "#FF9800" : item.stock > 0 ? "#4CAF50" : "#F44336"} 
          />
          <ThemedText style={[
            styles.stockText,
            { color: !item.productoActivo ? "#FF9800" : item.stock > 0 ? "#4CAF50" : "#F44336" }
          ]}>
            {!item.productoActivo ? 'No disponible' : item.stock > 0 ? `${item.stock} disponibles` : 'Agotado'}
          </ThemedText>
        </View>
      </View>

      {/* Controles de cantidad */}
      <View style={styles.controlsContainer}>
        {/* Botón eliminar */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemove}
          disabled={isUpdating}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color="#F44336" />
        </TouchableOpacity>

        {/* Controles de cantidad */}
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={[
              styles.quantityButton,
              (item.cantidad <= 1 || isUpdating || !item.productoActivo) && styles.quantityButtonDisabled
            ]}
            onPress={() => {
              if (!isUpdating && item.cantidad > 1 && item.productoActivo) {
                handleQuantityChange(item.cantidad - 1);
              }
            }}
            disabled={isUpdating || item.cantidad <= 1 || !item.productoActivo}
            activeOpacity={0.7}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Ionicons 
                name="remove" 
                size={18} 
                color={(item.cantidad <= 1 || isUpdating || !item.productoActivo) ? "#ccc" : "#333"} 
              />
            )}
          </TouchableOpacity>
          
          <View style={styles.quantityDisplay}>
            <ThemedText style={styles.quantityText}>
              {item.cantidad}
            </ThemedText>
          </View>
          
          <TouchableOpacity
            style={[
              styles.quantityButton,
              (item.cantidad >= item.stock || isUpdating || !item.productoActivo) && styles.quantityButtonDisabled
            ]}
            onPress={() => {
              if (!isUpdating && item.cantidad < item.stock && item.productoActivo) {
                handleQuantityChange(item.cantidad + 1);
              }
            }}
            disabled={isUpdating || item.cantidad >= item.stock || !item.productoActivo}
            activeOpacity={0.7}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Ionicons 
                name="add" 
                size={18} 
                color={(item.cantidad >= item.stock || isUpdating || !item.productoActivo) ? "#ccc" : "#333"} 
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Subtotal */}
        <View style={styles.subtotalContainer}>
          <ThemedText style={styles.subtotalLabel}>Subtotal:</ThemedText>
          <ThemedText style={[styles.subtotalAmount, { color: tintColor }]}>
            {formatCurrency(item.subtotal)}
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  imageContainer: {
    width: 80,
    height: 80,
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  finalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  controlsContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 80,
  },
  removeButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#ffebee',
    marginBottom: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  quantityButtonDisabled: {
    backgroundColor: '#f5f5f5',
    elevation: 0,
  },
  quantityDisplay: {
    minWidth: 44,
    height: 36,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtotalContainer: {
    alignItems: 'center',
  },
  subtotalLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  subtotalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Estilos para productos no disponibles
  unavailableContainer: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  unavailableImage: {
    opacity: 0.5,
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  unavailableText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 4,
    textAlign: 'center',
  },
});
