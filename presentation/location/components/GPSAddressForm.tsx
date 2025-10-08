import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import ThemedTextInput from '@/presentation/theme/components/ThemedTextInput';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { LocationSelector } from './LocationSelector';
import { AddressData } from '../hooks/useLocation';

interface GPSAddressFormProps {
  onAddressChange: (addressData: Partial<AddressData>) => void;
  initialData?: Partial<AddressData>;
  disabled?: boolean;
}

export const GPSAddressForm: React.FC<GPSAddressFormProps> = ({
  onAddressChange,
  initialData = {},
  disabled = false,
}) => {
  const [addressData, setAddressData] = useState<Partial<AddressData>>(initialData);
  const [isEditing, setIsEditing] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  const handleLocationSelect = (gpsData: AddressData) => {
    const newData = {
      address: gpsData.address,
      city: gpsData.city,
      department: gpsData.department,
      country: gpsData.country,
      postalCode: gpsData.postalCode,
      coordinates: gpsData.coordinates
    };
    
    setAddressData(newData);
    onAddressChange(newData);
    setIsEditing(true);
  };

  const handleFieldChange = (field: keyof AddressData, value: string) => {
    const newData = { ...addressData, [field]: value };
    setAddressData(newData);
    onAddressChange(newData);
  };

  const handleLocationError = (error: string) => {
    console.error('Location error:', error);
  };

  const hasGPSData = addressData.coordinates && addressData.address;

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="navigate-outline" size={20} color={tintColor} />
          <ThemedText style={styles.title}>Dirección con GPS</ThemedText>
        </View>
        
        {hasGPSData && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isEditing ? "checkmark-outline" : "create-outline"} 
              size={16} 
              color={tintColor} 
            />
            <ThemedText style={[styles.editText, { color: tintColor }]}>
              {isEditing ? 'Guardar' : 'Editar'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Selector de ubicación GPS */}
      <LocationSelector
        onLocationSelect={handleLocationSelect}
        onLocationError={handleLocationError}
        disabled={disabled}
      />

      {/* Formulario de dirección */}
      {(hasGPSData || isEditing) && (
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.sectionTitle}>Detalles de la Dirección</ThemedText>
          
          <ThemedTextInput
            placeholder="Dirección"
            value={addressData.address || ''}
            onChangeText={(text) => handleFieldChange('address', text)}
            icon="location-outline"
            editable={isEditing}
            style={isEditing ? undefined : styles.disabledInput}
          />
          
          <ThemedTextInput
            placeholder="Ciudad"
            value={addressData.city || ''}
            onChangeText={(text) => handleFieldChange('city', text)}
            icon="business-outline"
            editable={isEditing}
            style={isEditing ? undefined : styles.disabledInput}
          />
          
          <ThemedTextInput
            placeholder="Departamento"
            value={addressData.department || ''}
            onChangeText={(text) => handleFieldChange('department', text)}
            icon="map-outline"
            editable={isEditing}
            style={isEditing ? undefined : styles.disabledInput}
          />
          
          <ThemedTextInput
            placeholder="País"
            value={addressData.country || 'Colombia'}
            onChangeText={(text) => handleFieldChange('country', text)}
            icon="globe-outline"
            editable={isEditing}
            style={isEditing ? undefined : styles.disabledInput}
          />
          
          {addressData.postalCode && (
            <ThemedTextInput
              placeholder="Código Postal"
              value={addressData.postalCode}
              onChangeText={(text) => handleFieldChange('postalCode', text)}
              icon="mail-outline"
              editable={isEditing}
              style={isEditing ? undefined : styles.disabledInput}
            />
          )}

          {/* Información de coordenadas */}
          {addressData.coordinates && (
            <View style={styles.coordinatesContainer}>
              <View style={styles.coordinatesHeader}>
                <Ionicons name="compass-outline" size={16} color="#666" />
                <ThemedText style={styles.coordinatesTitle}>Coordenadas GPS</ThemedText>
              </View>
              <View style={styles.coordinatesRow}>
                <ThemedText style={styles.coordinateLabel}>Latitud:</ThemedText>
                <ThemedText style={styles.coordinateValue}>
                  {addressData.coordinates.latitude.toFixed(6)}
                </ThemedText>
              </View>
              <View style={styles.coordinatesRow}>
                <ThemedText style={styles.coordinateLabel}>Longitud:</ThemedText>
                <ThemedText style={styles.coordinateValue}>
                  {addressData.coordinates.longitude.toFixed(6)}
                </ThemedText>
              </View>
              {addressData.coordinates.accuracy && (
                <View style={styles.coordinatesRow}>
                  <ThemedText style={styles.coordinateLabel}>Precisión:</ThemedText>
                  <ThemedText style={styles.coordinateValue}>
                    ±{Math.round(addressData.coordinates.accuracy)}m
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    marginTop: 8,
  },
  disabledInput: {
    opacity: 0.6,
  },
  coordinatesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  coordinatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordinatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  coordinatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  coordinateLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  coordinateValue: {
    fontSize: 12,
    color: '#1a1a1a',
    fontFamily: 'monospace',
  },
});






















