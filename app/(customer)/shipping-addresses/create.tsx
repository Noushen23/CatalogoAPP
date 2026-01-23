import React, { useState } from 'react';
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
import { router } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useCreateShippingAddress } from '@/presentation/shipping/hooks/useShippingAddresses';
import { CreateShippingAddressRequest } from '@/core/api/shippingAddressesApi';
import { GPSAddressForm } from '@/presentation/location/components/GPSAddressForm';
import { AddressData } from '@/presentation/location/hooks/useLocation';

export default function CreateShippingAddressScreen() {
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [nombreDestinatario, setNombreDestinatario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(false);

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Hook para crear dirección
  const createAddressMutation = useCreateShippingAddress();

  // Manejar datos del GPS
  const handleAddressData = (data: Partial<AddressData>) => {
    if (data.address && data.city && data.department && data.coordinates) {
      setAddressData({
        address: data.address,
        city: data.city,
        department: data.department,
        country: data.country || 'Colombia',
        postalCode: data.postalCode,
        coordinates: data.coordinates,
        // Propiedades adicionales para compatibilidad
        latitude: data.coordinates.latitude,
        longitude: data.coordinates.longitude,
        state: data.department,
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

  // Manejar envío del formulario
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Error de Validación', validationError);
      return;
    }

    if (!addressData) return;

    try {
      const requestData: CreateShippingAddressRequest = {
        nombreDestinatario: nombreDestinatario.trim(),
        telefono: telefono.trim(),
        direccion: addressData.address,
        ciudad: addressData.city,
        departamento: addressData.department,
        codigoPostal: addressData.postalCode || undefined, // ← AGREGADO: Incluir código postal
        coordenadas: {
          latitud: addressData.coordinates.latitude,
          longitud: addressData.coordinates.longitude,
        },
        instrucciones: instrucciones.trim() || undefined,
        esPrincipal,
      };

      await createAddressMutation.mutateAsync(requestData);
      
      Alert.alert(
        'Éxito',
        'Dirección creada correctamente',
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
        error instanceof Error ? error.message : 'Error al crear la dirección'
      );
    }
  };

  const isProcessing = createAddressMutation.isPending;

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>Nueva Dirección</ThemedText>
        
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
              Usa el GPS para obtener tu ubicación exacta
            </ThemedText>
            
            <GPSAddressForm onAddressChange={handleAddressData} />
            
            {addressData && (
              <View style={styles.selectedLocationContainer}>
                <View style={styles.locationHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <ThemedText style={styles.locationTitle}>Ubicación Seleccionada</ThemedText>
                </View>
                <ThemedText style={styles.locationAddress}>
                  {addressData.address}
                </ThemedText>
                <ThemedText style={styles.locationCity}>
                  {addressData.city}, {addressData.department}
                </ThemedText>
                {addressData.postalCode && (
                  <ThemedText style={styles.locationPostalCode}>
                    📮 Código Postal: {addressData.postalCode}
                  </ThemedText>
                )}
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

          {/* Botón de Guardar */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: tintColor },
              isProcessing && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="save-outline" size={24} color="white" />
            )}
            <ThemedText style={styles.saveButtonText}>
              {isProcessing ? 'Guardando...' : 'Guardar Dirección'}
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
  locationPostalCode: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 4,
    fontWeight: '500',
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
