import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { FullScreenLoader } from '@/presentation/theme/components/FullScreenLoader';
import { ErrorDisplay } from '@/presentation/theme/components/ErrorDisplay';
import { EmptyState } from '@/presentation/theme/components/EmptyState';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useCart, useClearCart } from '@/presentation/cart/hooks/useCart';
import { useShippingAddresses } from '@/presentation/shipping/hooks/useShippingAddresses';
import { ShippingAddressSelector } from '@/presentation/shipping/components/ShippingAddressSelector';
import { useLocation, AddressData } from '@/presentation/location/hooks/useLocation';
import { LocationSelector } from '@/presentation/location/components/LocationSelector';
// import { useCreateOrderFromCart, useCancelUserOrder } from '@/presentation/orders/hooks/useOrders';
import { CreateOrderFromCartRequest, ordersApi } from '@/core/api/ordersApi';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { formatCurrency } from '@/presentation/utils';
import { useCrearTransaccion } from '@/presentation/pagos/hooks/usePagos';
import { PSEDataForm } from '@/presentation/pagos/components/PSEDataForm';
import { NequiDataForm } from '@/presentation/pagos/components/NequiDataForm';
import { BancolombiaDataForm } from '@/presentation/pagos/components/BancolombiaDataForm';
import { DatosPSE, DatosNequi, DatosBancolombia } from '@/core/api/pagosApi';

export default function CheckoutScreen() {
  // El ID de la dirección seleccionada se guardará aquí
  const [seleccionadaDireccionId, setSeleccionadaDireccionId] = useState<string | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState<'tarjeta' | 'pse' | 'nequi' | 'bancolombia_transfer'>('tarjeta');
  const [pseData, setPseData] = useState<DatosPSE | null>(null);
  const [nequiData, setNequiData] = useState<DatosNequi | null>(null);
  const [bancolombiaData, setBancolombiaData] = useState<DatosBancolombia | null>(null);
  const [notes, setNotes] = useState('');
  const [direccionCost, setDireccionCost] = useState(0);
  const [direccionZona, setDireccionZona] = useState<string | null>(null);
  const [isCalculandoDireccion, setIsCalculandoDireccion] = useState(false);

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Hook para obtener usuario autenticado
  const { user } = useAuthStore();

  // Hooks para datos del carrito
  const { data: cart, isLoading, error } = useCart();
  // Hook para obtener las direcciones del usuario
  const { data: shippingAddresses, isLoading: addressesLoading } = useShippingAddresses();

  const clearCartMutation = useClearCart();
  
  // Hook para crear transacción de pago con Wompi
  // NOTA: El pedido se creará automáticamente cuando el pago sea aprobado (vía webhook)
  const crearTransaccionMutation = useCrearTransaccion();

  // Hook para obtener ubicación GPS
  const { getLocationAndAddress, isLoading: isLocationLoading } = useLocation({
    enableHighAccuracy: true,
    timeout: 15000
  });

  // Calcular costo de envío cuando cambie el subtotal o la dirección
  useEffect(() => {
    const calcularEnvio = async () => {
      if (!cart || cart.items.length === 0) {
        setDireccionCost(0);
        setDireccionZona(null);
        return;
      }

      const subtotal = parseFloat(cart.total as any) || 0;
      
      // Si no hay dirección seleccionada, usar costo por defecto
      if (!seleccionadaDireccionId) {
        // Envío gratis si >= $300.000, de lo contrario usar un valor estimado
        const costoEstimado = subtotal >= 300000 ? 0 : 5000;
        setDireccionCost(costoEstimado);
        setDireccionZona(null);
        return;
      }

      setIsCalculandoDireccion(true);
      try {
        const response = await ordersApi.calcularCostoEnvio({
          subtotal,
          direccionEnvioId: seleccionadaDireccionId
        });

        if (response.success && response.data) {
          setDireccionCost(response.data.costoEnvio);
          setDireccionZona(response.data.zona);
        }
      } catch (error) {
        console.error('Error al calcular costo de envío:', error);
        // En caso de error, usar cálculo por defecto
        const defaultCost = subtotal >= 300000 ? 0 : 5000;
        setDireccionCost(defaultCost);
        setDireccionZona(null);
      } finally {
        setIsCalculandoDireccion(false);
      }
    };

    calcularEnvio();
  }, [cart, seleccionadaDireccionId]);

  // Manejar selección de dirección
  const handleAddressSelect = (addressId: string) => {
    setSeleccionadaDireccionId(addressId);
  };

  // Navegar a la pantalla de creación de dirección
  const handleAddressCreate = () => {
    router.push('/(customer)/shipping-addresses/create');
  };

  // Confirmar pedido
  const handleConfirmOrder = async () => {
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

    if (!cart || cart.items.length === 0) {
      Alert.alert('Error', 'No hay productos en el carrito');
      return;
    }

    if (!seleccionadaDireccionId) {
      Alert.alert('Error', 'Debes seleccionar una dirección de envío.');
      return;
    }

    try {
      // Todos los métodos de pago requieren integración con Wompi
      // NO crear pedido antes del pago - el pedido se creará cuando el pago sea aprobado
      // Crear transacción directamente con los datos del carrito
      const transaccionData: any = {
        metodoPago: paymentMethod as 'tarjeta' | 'pse' | 'nequi' | 'bancolombia_transfer',
        direccionEnvioId: seleccionadaDireccionId,
        notas: notes.trim() || undefined,
      };

      // Agregar datos opcionales de los formularios para pre-llenar información en el Web Checkout
      if (paymentMethod === 'pse' && pseData) {
        transaccionData.datosPSE = pseData;
      }

      if (paymentMethod === 'nequi' && nequiData) {
        transaccionData.datosNequi = nequiData;
      }

      if (paymentMethod === 'bancolombia_transfer' && bancolombiaData) {
        transaccionData.datosBancolombia = bancolombiaData;
      }

      const transaccionResult = await crearTransaccionMutation.mutateAsync(transaccionData);

      if (transaccionResult && transaccionResult.urlCheckout) {
        // Guardar URL en SecureStore como respaldo (por si la URL es muy larga para los parámetros)
        try {
          await SecureStore.setItemAsync('wompi_checkout_url', transaccionResult.urlCheckout);
          if (transaccionResult.referencia) {
            await SecureStore.setItemAsync('wompi_checkout_ref', transaccionResult.referencia);
          }
        } catch (storeError) {
          console.warn('⚠️ [Checkout] No se pudo guardar URL en SecureStore:', storeError);
          // Continuar de todas formas, la URL se pasará como parámetro
        }

        console.log('🔍 [Checkout] URL recibida del backend:', {
          urlLength: transaccionResult.urlCheckout.length,
          urlPrefix: transaccionResult.urlCheckout.substring(0, 200),
          hasSignature: transaccionResult.urlCheckout.includes('signature:integrity'),
          isWompiDomain: transaccionResult.urlCheckout.includes('checkout.wompi.co'),
          transaccionId: transaccionResult.transaccionId
        });
        
        // Navegar a la pantalla de checkout de Wompi
        router.push({
          pathname: '/(customer)/wompi-checkout',
          params: {
            transaccionId: transaccionResult.transaccionId,
            urlCheckout: transaccionResult.urlCheckout,
            referencia: transaccionResult.referencia,
          },
        });
      } else {
        throw new Error('No se recibió URL de checkout de Wompi');
      }
    } catch (error) {
      console.error('❌ Error al crear transacción de pago:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar el pago';
      Alert.alert(
        'Error al Procesar Pago',
        errorMessage,
        [{ text: 'Entendido' }]
      );
    }
  };

  // Estados de carga
  if (isLoading || addressesLoading) {
    return (
      <FullScreenLoader 
        message={addressesLoading ? "Cargando direcciones..." : "Cargando carrito..."} 
      />
    );
  }

  // Estado de error
  if (error) {
    return (
      <ErrorDisplay
        title="Error al cargar el carrito"
        message="No se pudo cargar la información del carrito. Por favor, intenta nuevamente."
        error={error}
        onRetry={() => router.back()}
      />
    );
  }

  // Carrito vacío
  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        icon="cart-outline"
        iconSize={80}
        title="Tu carrito está vacío"
        description="Agrega algunos productos para continuar con tu compra"
        actionText="Ir a comprar"
        actionIcon="storefront-outline"
        onAction={() => router.push('/(customer)/catalog')}
      />
    );
  }

  // Cálculos de totales
  const subtotal = parseFloat(cart.total as any) || 0;
  const total = subtotal + direccionCost;

  // Estado de procesamiento
  const isProcessing = crearTransaccionMutation.isPending;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>Finalizar Compra</ThemedText>
        
        <View style={styles.headerRight} />
      </View>

      {/* Banner de verificación de email */}
      {!user?.emailVerificado && (
        <View style={styles.verificationBanner}>
          <Ionicons name="mail-unread-outline" size={20} color="#FF9800" />
          <View style={styles.verificationTextContainer}>
            <ThemedText style={styles.verificationTitle}>Email no verificado</ThemedText>
            <ThemedText style={styles.verificationText}>
              Verifica tu email para poder realizar compras
            </ThemedText>
          </View>
          <Ionicons name="warning-outline" size={20} color="#FF9800" />
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Resumen del Pedido */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Resumen del Pedido</ThemedText>
            
            <View style={styles.orderSummary}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Productos ({cart.totalItems})</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {formatCurrency(subtotal)}
                </ThemedText>
              </View>
              
              <View style={styles.summaryRow}>
                <View style={styles.direccionInfo}>
                  <ThemedText style={styles.summaryLabel}>Envío</ThemedText>
                  {direccionZona && (
                    <ThemedText style={styles.direccionZona}>
                      {direccionZona}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.direccionCostContainer}>
                  {isCalculandoDireccion ? (
                    <ActivityIndicator size="small" color={tintColor} />
                  ) : (
                    <ThemedText style={styles.summaryValue}>
                      {direccionCost === 0 ? 'Gratis' : formatCurrency(direccionCost)}
                    </ThemedText>
                  )}
                </View>
              </View>
              
              <View style={[styles.summaryRow, styles.totalRow]}>
                <ThemedText style={styles.totalLabel}>Total</ThemedText>
                <ThemedText style={styles.totalValue}>
                  {formatCurrency(total)}
                </ThemedText>
              </View>
            </View>

            {/* Lista de productos */}
            <View style={styles.productsContainer}>
              <ThemedText style={styles.productsTitle}>Productos:</ThemedText>
              {cart.items.map((item) => (
                <View key={item.id} style={styles.productItem}>
                  <ThemedText style={styles.productName}>
                    {item.productoNombre} x{item.cantidad}
                  </ThemedText>
                  <ThemedText style={styles.productPrice}>
                    {formatCurrency(item.subtotal)}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>

          {/* Dirección de Envío */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Dirección de Envío</ThemedText>
            <ShippingAddressSelector
              selectedAddressId={seleccionadaDireccionId}
              onAddressSelect={handleAddressSelect}
              onAddressCreate={handleAddressCreate}
            />
          </View>

          {/* Método de Pago */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Método de Pago</ThemedText>
            
            <View style={styles.paymentMethods}>
              {[
                { key: 'tarjeta', label: 'Tarjeta', icon: 'card-outline' },
                { key: 'pse', label: 'PSE', icon: 'phone-portrait-outline' },
                { key: 'nequi', label: 'Nequi', icon: 'wallet-outline' },
                { key: 'bancolombia_transfer', label: 'Bancolombia', icon: 'swap-horizontal-outline' },
              ].map((method) => (
                <TouchableOpacity
                  key={method.key}
                  style={[
                    styles.paymentMethod,
                    paymentMethod === method.key && { backgroundColor: tintColor + '20', borderColor: tintColor }
                  ]}
                  onPress={() => setPaymentMethod(method.key as any)}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={method.icon as any} 
                    size={24} 
                    color={paymentMethod === method.key ? tintColor : '#666'} 
                  />
                  <ThemedText style={[
                    styles.paymentMethodLabel,
                    paymentMethod === method.key && { color: tintColor }
                  ]}>
                    {method.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Formulario de datos PSE */}
            {paymentMethod === 'pse' && (
              <View style={styles.pseFormContainer}>
                <PSEDataForm
                  onDataSelected={(data) => {
                    setPseData({
                      tipoIdentificacion: data.tipoIdentificacion as DatosPSE['tipoIdentificacion'],
                      numeroIdentificacion: data.numeroIdentificacion,
                    });
                  }}
                  userNumeroIdentificacion={undefined}
                  userTipoIdentificacion={undefined}
                />
              </View>
            )}

            {/* Formulario de datos Nequi */}
            {paymentMethod === 'nequi' && (
              <View style={styles.pseFormContainer}>
                <NequiDataForm
                  onDataSelected={(data) => {
                    setNequiData({
                      telefono: data.telefono,
                    });
                  }}
                  userTelefono={user?.telefono}
                />
              </View>
            )}

            {/* Formulario de datos Bancolombia */}
            {paymentMethod === 'bancolombia_transfer' && (
              <View style={styles.pseFormContainer}>
                <BancolombiaDataForm
                  onDataSelected={(data) => {
                    setBancolombiaData({
                      descripcionPago: data.descripcionPago,
                    });
                  }}
                />
              </View>
            )}
          </View>

          {/* Notas Adicionales */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Notas Adicionales (Opcional)</ThemedText>
            
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Instrucciones especiales para la entrega..."
              multiline
              numberOfLines={3}
              editable={!isProcessing}
            />
          </View>

          {/* Botón de Confirmación */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: tintColor },
              isProcessing && styles.disabledButton
            ]}
            onPress={handleConfirmOrder}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={24} color="white" />
            )}
            <ThemedText style={styles.confirmButtonText}>
              {isProcessing ? 'Procesando...' : `Confirmar Pedido - ${formatCurrency(total)}`}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
    gap: 12,
  },
  verificationTextContainer: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 2,
  },
  verificationText: {
    fontSize: 12,
    color: '#F57C00',
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
  keyboardAvoidingView: {
    flex: 1,
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
  orderSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
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
  productsContainer: {
    marginTop: 8,
  },
  productsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  productName: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  formContainer: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentMethod: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  pseFormContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    color: '#666',
    marginLeft: 8,
  },
  confirmButton: {
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
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 32,
  },
  direccionInfo: {
    flex: 1,
  },
  direccionZona: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  direccionCostContainer: {
    alignItems: 'flex-end',
  },
});