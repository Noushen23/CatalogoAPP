import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useLocation, AddressData } from '../hooks/useLocation';

interface LocationSelectorProps {
  onLocationSelect: (addressData: AddressData) => void;
  onLocationError?: (error: string) => void;
  disabled?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationSelect,
  onLocationError,
  disabled = false,
}) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = '#e0e0e0';

  const {
    getLocationAndAddress,
    isLoading,
    error,
    permissionStatus
  } = useLocation({
    enableHighAccuracy: true,
    timeout: 15000
  });

  const handleGetLocation = async () => {
    if (disabled) return;

    setIsGettingLocation(true);

    try {
      const addressData = await getLocationAndAddress();
      
      if (addressData) {
        onLocationSelect(addressData);
      } else if (error) {
        onLocationError?.(error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener ubicación';
      onLocationError?.(errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const isLocationLoading = isLoading || isGettingLocation;

  return (
    <ThemedView style={[styles.container, { backgroundColor, borderColor }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="location-outline" size={20} color={tintColor} />
          <ThemedText style={styles.title}>Ubicación Actual</ThemedText>
        </View>
        
        <TouchableOpacity
          style={[
            styles.locationButton,
            { backgroundColor: tintColor },
            (disabled || isLocationLoading) && styles.disabledButton
          ]}
          onPress={handleGetLocation}
          disabled={disabled || isLocationLoading}
          activeOpacity={0.8}
        >
          {isLocationLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="locate-outline" size={16} color="white" />
          )}
          <ThemedText style={styles.buttonText}>
            {isLocationLoading ? 'Obteniendo...' : 'Usar GPS'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="information-circle-outline" size={14} color="#2196F3" />
          <ThemedText style={styles.infoText}>
            Obtén tu dirección actual usando GPS
          </ThemedText>
        </View>
        
        <View style={styles.infoItem}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#4CAF50" />
          <ThemedText style={styles.infoText}>
            Tu ubicación es privada y segura
          </ThemedText>
        </View>
      </View>

      {permissionStatus?.status === 'denied' && (
        <View style={styles.permissionWarning}>
          <Ionicons name="warning-outline" size={16} color="#FF9800" />
          <ThemedText style={styles.warningText}>
            Los permisos de ubicación están deshabilitados. Habilítalos en configuración para usar esta función.
          </ThemedText>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={16} color="#F44336" />
          <ThemedText style={styles.errorText}>
            {error}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoContainer: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
});






















