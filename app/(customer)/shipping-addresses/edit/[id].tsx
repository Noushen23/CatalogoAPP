import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { 
  useShippingAddress,
  useUpdateShippingAddress 
} from '@/presentation/shipping/hooks/useShippingAddresses';
import { UpdateShippingAddressRequest } from '@/core/api/shippingAddressesApi';
import { GPSAddressForm } from '@/presentation/location/components/GPSAddressForm';
import { AddressData } from '@/presentation/location/hooks/useLocation';

export default function EditShippingAddressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [nombreDestinatario, setNombreDestinatario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(false);

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Hooks para datos
  const { data: address, isLoading, error } = useShippingAddress(id || '');
  const updateAddressMutation = useUpdateShippingAddress();

  // Cargar datos existentes cuando se obtenga la dirección
  useEffect(() => {
    if (address) {
      setNombreDestinatario(address.nombreDestinatario);
      setTelefono(address.telefono || '');
      setInstrucciones(address.instrucciones || '');
      setEsPrincipal(address.esPrincipal);
      
      // Crear AddressData a partir de la dirección existente
      if (address.coordenadas) {
        setAddressData({
          address: address.direccion,
          city: address.ciudad,
          department: address.departamento,
          state: address.departamento,
          country: 'Colombia',
          coordinates: {
            latitude: address.coordenadas.latitud,
            longitude: address.coordenadas.longitud,
          },
          latitude: address.coordenadas.latitud,
          longitude: address.coordenadas.longitud,
        });
      }
    }
  }, [address]);

  // Manejar datos del GPS
  const handleAddressData = (data: Partial<AddressData>) => {
    if (data.address && data.city && data.department && data.coordinates) {
      setAddressData({
        address: data.address,
        city: data.city,
        department: data.department,
        state: data.department,
        country: data.country || 'Colombia',
        coordinates: data.coordinates,
        latitude: data.coordinates.latitude,
        longitude: data.coordinates.longitude,
      });
    }
  };

  // Validar formulario
  const validateForm = (): string | null => {
    if (!nombreDestinatario.trim()) {
      return 'El nombre del destinatario es requerido';
    }
    if (!telefono.trim()) {
      return 'El teléfono es requerido';
    }
    // Validar que el teléfono tenga al menos 10 dígitos
    const phoneDigits = telefono.replace(/\D/g, ''); // Remover caracteres no numéricos
    if (phoneDigits.length < 10) {
      return 'El teléfono debe tener al menos 10 números';
    }
    if (!addressData) {
      return 'Debes seleccionar una ubicación';
    }
    if (!addressData.address) {
      return 'Debes obtener la dirección completa';
    }
    return null;
  };

  // Manejar actualización
  const handleUpdate = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Error de Validación', validationError);
      return;
    }

    if (!addressData || !id) return;

    try {
      const requestData: UpdateShippingAddressRequest = {
        nombreDestinatario: nombreDestinatario.trim(),
        telefono: telefono.trim(),
        direccion: addressData.address,
        ciudad: addressData.city,
        departamento: addressData.department || addressData.state || '',
        coordenadas: {
          latitud: addressData.coordinates.latitude,
          longitud: addressData.coordinates.longitude,
        },
        instrucciones: instrucciones.trim() || undefined,
        esPrincipal,
      };

      await updateAddressMutation.mutateAsync({ addressId: id, data: requestData });
      
      Alert.alert(
        'Éxito',
        'Dirección actualizada correctamente',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Error al actualizar la dirección'
      );
    }
  };

  // Estados de carga
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tintColor} />
        <ThemedText style={styles.loadingText}>Cargando dirección...</ThemedText>
      </View>
    );
  }

  // Estado de error
  if (error || !address) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <ThemedText style={styles.errorText}>
          Error al cargar la dirección
        </ThemedText>
        <ThemedText style={styles.errorSubtext}>
          {error instanceof Error ? error.message : 'Dirección no encontrada'}
        </ThemedText>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: tintColor }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.retryButtonText}>Volver</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const isProcessing = updateAddressMutation.isPending;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>Editar Dirección</ThemedText>
        
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Información del Destinatario */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Información del Destinatario</ThemedText>
            
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Nombre Completo *</ThemedText>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={nombreDestinatario}
                    onChangeText={setNombreDestinatario}
                    placeholder="Ej: Juan Pérez"
                    editable={!isProcessing}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <ThemedText style={styles.inputLabel}>Teléfono *</ThemedText>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={telefono}
                    onChangeText={setTelefono}
                    placeholder="Ej: 3001234567"
                    keyboardType="phone-pad"
                    editable={!isProcessing}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Selección de Ubicación */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Ubicación de Entrega</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Actualiza tu ubicación usando el GPS
            </ThemedText>
            
            <GPSAddressForm onAddressChange={handleAddressData} />
            
            {addressData && (
              <View style={styles.selectedLocationContainer}>
                <View style={styles.locationHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <ThemedText style={styles.locationTitle}>Ubicación Actualizada</ThemedText>
                </View>
                <ThemedText style={styles.locationAddress}>
                  {addressData.address}
                </ThemedText>
                <ThemedText style={styles.locationCity}>
                  {addressData.city}, {addressData.state}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Instrucciones Adicionales */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Instrucciones Adicionales (Opcional)</ThemedText>
            
            <View style={styles.textAreaContainer}>
              <Ionicons name="document-text-outline" size={20} color="#666" style={styles.textAreaIcon} />
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={instrucciones}
                onChangeText={setInstrucciones}
                placeholder="Instrucciones especiales para la entrega (ej: timbre rojo, casa azul, etc.)"
                multiline
                numberOfLines={4}
                editable={!isProcessing}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Opciones */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Opciones</ThemedText>
            
            <TouchableOpacity
              style={styles.optionContainer}
              onPress={() => setEsPrincipal(!esPrincipal)}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <View style={styles.optionInfo}>
                <Ionicons name="star-outline" size={20} color="#666" />
                <View style={styles.optionTextContainer}>
                  <ThemedText style={styles.optionTitle}>Establecer como Dirección Principal</ThemedText>
                  <ThemedText style={styles.optionSubtitle}>
                    Esta será tu dirección predeterminada para futuras compras
                  </ThemedText>
                </View>
              </View>
              <View style={[
                styles.checkbox,
                esPrincipal && { backgroundColor: tintColor, borderColor: tintColor }
              ]}>
                {esPrincipal && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Botón de Actualizar */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: tintColor },
              isProcessing && styles.disabledButton
            ]}
            onPress={handleUpdate}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="save-outline" size={24} color="white" />
            )}
            <ThemedText style={styles.saveButtonText}>
              {isProcessing ? 'Actualizando...' : 'Actualizar Dirección'}
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
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textAreaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  textAreaIcon: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  textArea: {
    flex: 1,
    minHeight: 80,
    paddingVertical: 12,
    paddingRight: 12,
    textAlignVertical: 'top',
  },
  selectedLocationContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8f5e8',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 6,
  },
  locationAddress: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  locationCity: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
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
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 32,
  },
});
