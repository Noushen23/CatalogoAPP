import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProductNotifications } from '../hooks/useNotificationSubscriptions';

interface ProductNotificationButtonsProps {
  productId: string;
  productName: string;
  currentPrice: number;
  isInStock: boolean;
}

export const ProductNotificationButtons: React.FC<ProductNotificationButtonsProps> = ({
  productId,
  productName,
  currentPrice,
  isInStock,
}) => {
  const {
    subscriptionStatus,
    isLoading,
    subscribeToStock,
    unsubscribeFromStock,
    subscribeToPrice,
    unsubscribeFromPrice,
    isSubscribingToStock,
    isUnsubscribingFromStock,
    isSubscribingToPrice,
    isUnsubscribingFromPrice,
  } = useProductNotifications(productId);

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');

  const handleStockNotification = () => {
    if (subscriptionStatus?.subscribedToStock) {
      unsubscribeFromStock();
    } else {
      subscribeToStock();
    }
  };

  const handlePriceAlert = () => {
    if (subscriptionStatus?.subscribedToPrice) {
      Alert.alert(
        'Alerta de precio activa',
        `Notificación cuando el precio baje a $${subscriptionStatus.targetPrice?.toLocaleString()} o menos`,
        [
          { text: 'Cancelar alerta', onPress: () => unsubscribeFromPrice(), style: 'destructive' },
          { text: 'Cerrar', style: 'cancel' },
        ]
      );
    } else {
      setShowPriceModal(true);
    }
  };

  const handleSubmitPriceAlert = () => {
    const price = parseFloat(targetPrice);
    
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Por favor ingresa un precio válido');
      return;
    }

    if (price >= currentPrice) {
      Alert.alert('Error', `El precio debe ser menor a $${currentPrice.toLocaleString()}`);
      return;
    }

    subscribeToPrice(price);
    setShowPriceModal(false);
    setTargetPrice('');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        
        {/* Botón de notificación de stock */}
        {!isInStock && (
          <TouchableOpacity
            style={[
              styles.notificationButton,
              subscriptionStatus?.subscribedToStock && styles.notificationButtonActive,
            ]}
            onPress={handleStockNotification}
            disabled={isSubscribingToStock || isUnsubscribingFromStock}
          >
            {isSubscribingToStock || isUnsubscribingFromStock ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons
                  name={subscriptionStatus?.subscribedToStock ? 'notifications' : 'notifications-outline'}
                  size={20}
                  color="#FFF"
                />
                <Text style={styles.notificationButtonText}>
                  {subscriptionStatus?.subscribedToStock
                    ? 'Notificación de stock activa'
                    : 'Notificarme cuando haya stock'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Botón de alerta de precio */}
        <TouchableOpacity
          style={[
            styles.notificationButton,
            styles.priceAlertButton,
            subscriptionStatus?.subscribedToPrice && styles.notificationButtonActive,
          ]}
          onPress={handlePriceAlert}
          disabled={isSubscribingToPrice || isUnsubscribingFromPrice}
        >
          {isSubscribingToPrice || isUnsubscribingFromPrice ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons
                name={subscriptionStatus?.subscribedToPrice ? 'pricetag' : 'pricetag-outline'}
                size={20}
                color="#FFF"
              />
              <Text style={styles.notificationButtonText}>
                {subscriptionStatus?.subscribedToPrice
                  ? `Alerta activa: $${subscriptionStatus.targetPrice?.toLocaleString()}`
                  : 'Alertarme de baja de precio'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal para ingresar precio objetivo */}
      <Modal
        visible={showPriceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alerta de Precio</Text>
              <TouchableOpacity onPress={() => setShowPriceModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Te notificaremos cuando el precio de "{productName}" baje al monto que indiques
            </Text>

            <View style={styles.currentPriceContainer}>
              <Text style={styles.currentPriceLabel}>Precio actual:</Text>
              <Text style={styles.currentPriceValue}>${currentPrice.toLocaleString()}</Text>
            </View>

            <Text style={styles.inputLabel}>Precio objetivo:</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 50000"
                keyboardType="numeric"
                value={targetPrice}
                onChangeText={setTargetPrice}
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitPriceAlert}
              disabled={!targetPrice}
            >
              <Text style={styles.submitButtonText}>Activar Alerta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  notificationButtonActive: {
    backgroundColor: '#34C759',
  },
  priceAlertButton: {
    backgroundColor: '#FF9500',
  },
  notificationButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  currentPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentPriceLabel: {
    fontSize: 14,
    color: '#666',
  },
  currentPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
