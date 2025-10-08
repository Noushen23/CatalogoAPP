import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useShippingAddresses, useCreateShippingAddress } from '../hooks/useShippingAddresses';
import { ShippingAddress } from '@/core/api/shippingAddressesApi';

interface ShippingAddressSelectorProps {
  selectedAddressId?: string;
  onAddressSelect: (addressId: string) => void;
  onAddressCreate?: () => void;
}

export const ShippingAddressSelector: React.FC<ShippingAddressSelectorProps> = ({
  selectedAddressId,
  onAddressSelect,
  onAddressCreate,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = '#e0e0e0';

  const { data: addresses, isLoading, error } = useShippingAddresses();
  const createAddressMutation = useCreateShippingAddress();

  const handleCreateAddress = () => {
    if (onAddressCreate) {
      onAddressCreate();
    } else {
      // Navegar a pantalla de creación de dirección
      router.push('/(customer)/shipping-addresses/create');
    }
  };

  const handleSelectAddress = (addressId: string) => {
    onAddressSelect(addressId);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={tintColor} />
        <ThemedText style={styles.loadingText}>Cargando direcciones...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={24} color="#F44336" />
        <ThemedText style={styles.errorText}>
          Error al cargar direcciones
        </ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor, borderColor }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Dirección de Entrega</ThemedText>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: tintColor }]}
          onPress={handleCreateAddress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="white" />
          <ThemedText style={styles.addButtonText}>Nueva</ThemedText>
        </TouchableOpacity>
      </View>

      {!addresses || addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={48} color="#ccc" />
          <ThemedText style={styles.emptyText}>
            No tienes direcciones guardadas
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Agrega una dirección para continuar con tu pedido
          </ThemedText>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: tintColor }]}
            onPress={handleCreateAddress}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <ThemedText style={styles.createButtonText}>
              Agregar Dirección
            </ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.addressesList}>
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              isSelected={selectedAddressId === address.id}
              onSelect={() => handleSelectAddress(address.id)}
              tintColor={tintColor}
            />
          ))}
        </View>
      )}
    </ThemedView>
  );
};

interface AddressCardProps {
  address: ShippingAddress;
  isSelected: boolean;
  onSelect: () => void;
  tintColor: string;
}

const AddressCard: React.FC<AddressCardProps> = ({
  address,
  isSelected,
  onSelect,
  tintColor,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = '#e0e0e0';

  // Asegurar que todos los valores sean strings válidos
  const nombreDestinatario = String(address.nombreDestinatario || 'Sin nombre');
  const direccion = String(address.direccion || 'Sin dirección');
  const ciudad = String(address.ciudad || 'Sin ciudad');
  const departamento = String(address.departamento || 'Sin departamento');
  const telefono = address.telefono ? String(address.telefono) : null;
  const esPrincipal = Boolean(address.esPrincipal);

  return (
    <TouchableOpacity
      style={[
        styles.addressCard,
        { backgroundColor, borderColor },
        isSelected && { borderColor: tintColor, borderWidth: 2 }
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.addressHeader}>
        <View style={styles.addressInfo}>
          <ThemedText style={styles.addressName}>
            {nombreDestinatario}
          </ThemedText>
          {esPrincipal && (
            <View style={styles.primaryBadge}>
              <ThemedText style={styles.primaryText}>Principal</ThemedText>
            </View>
          )}
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={tintColor} />
        )}
      </View>
      
      <ThemedText style={styles.addressText}>
        {direccion}
      </ThemedText>
      <ThemedText style={styles.addressText}>
        {`${ciudad}, ${departamento}`}
      </ThemedText>
      {telefono && (
        <ThemedText style={styles.phoneText}>
          {`📞 ${telefono}`}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#F44336',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  addressesList: {
    gap: 12,
  },
  addressCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  primaryBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  primaryText: {
    fontSize: 10,
    color: '#1976D2',
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  phoneText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
