import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { 
  useShippingAddresses, 
  useDeleteShippingAddress,
  useSetPrimaryShippingAddress 
} from '@/presentation/shipping/hooks/useShippingAddresses';
import { ShippingAddress } from '@/core/api/shippingAddressesApi';

export default function ShippingAddressesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Hooks para datos
  const { data: addresses, isLoading, error, refetch } = useShippingAddresses();
  const deleteAddressMutation = useDeleteShippingAddress();
  const setPrimaryMutation = useSetPrimaryShippingAddress();

  // Manejar refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Manejar eliminación de dirección
  const handleDeleteAddress = (address: ShippingAddress) => {
    Alert.alert(
      'Eliminar Dirección',
      `¿Estás seguro de que quieres eliminar la dirección de ${address.nombreDestinatario}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddressMutation.mutateAsync(address.id);
              Alert.alert('Éxito', 'Dirección eliminada correctamente');
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Error al eliminar la dirección'
              );
            }
          }
        }
      ]
    );
  };

  // Manejar establecer como principal
  const handleSetPrimary = async (addressId: string) => {
    try {
      await setPrimaryMutation.mutateAsync(addressId);
      Alert.alert('Éxito', 'Dirección establecida como principal');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Error al establecer como principal'
      );
    }
  };

  // Estados de carga
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tintColor} />
        <ThemedText style={styles.loadingText}>Cargando direcciones...</ThemedText>
      </View>
    );
  }

  // Estado de error
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <ThemedText style={styles.errorText}>
          Error al cargar las direcciones
        </ThemedText>
        <ThemedText style={styles.errorSubtext}>
          {error instanceof Error ? error.message : 'Error desconocido'}
        </ThemedText>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: tintColor }]}
          onPress={handleRefresh}
        >
          <ThemedText style={styles.retryButtonText}>Reintentar</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>Mis Direcciones</ThemedText>
        
        <TouchableOpacity
          onPress={() => router.push('/(customer)/shipping-addresses/create')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={26} color={tintColor} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {!addresses || addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={80} color="#ccc" />
            <ThemedText style={styles.emptyTitle}>
              No tienes direcciones guardadas
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Agrega tu primera dirección para facilitar tus compras
            </ThemedText>
            
            <TouchableOpacity
              style={[styles.addFirstButton, { backgroundColor: tintColor }]}
              onPress={() => router.push('/(customer)/shipping-addresses/create')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <ThemedText style={styles.addFirstButtonText}>
                Agregar Primera Dirección
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.addressesContainer}>
            <ThemedText style={styles.sectionTitle}>
              {`Direcciones Guardadas (${addresses?.length ?? 0})`}
            </ThemedText>
            
            {addresses
              .filter(address => address && typeof address === 'object' && address.id)
              .map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={() => router.push(`/(customer)/shipping-addresses/edit/${address.id}`)}
                onDelete={() => handleDeleteAddress(address)}
                onSetPrimary={() => handleSetPrimary(address.id)}
                tintColor={tintColor}
                isDeleting={deleteAddressMutation.isPending}
                isSettingPrimary={setPrimaryMutation.isPending}
              />
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </ThemedView>
  );
}

interface AddressCardProps {
  address: ShippingAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
  tintColor: string;
  isDeleting: boolean;
  isSettingPrimary: boolean;
}

const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onEdit,
  onDelete,
  onSetPrimary,
  tintColor,
  isDeleting,
  isSettingPrimary,
}) => {
  const backgroundColor = useThemeColor({}, 'background');

  // Validar que address exista
  if (!address || typeof address !== 'object') {
    return null;
  }

  // Validar y convertir valores a string de forma segura
  const nombreDestinatario = (address.nombreDestinatario !== null && address.nombreDestinatario !== undefined) 
    ? String(address.nombreDestinatario) 
    : 'Sin nombre';
  const direccion = (address.direccion !== null && address.direccion !== undefined) 
    ? String(address.direccion) 
    : 'Sin dirección';
  const ciudad = (address.ciudad !== null && address.ciudad !== undefined) 
    ? String(address.ciudad) 
    : '';
  const departamento = (address.departamento !== null && address.departamento !== undefined) 
    ? String(address.departamento) 
    : '';
  const telefono = (address.telefono !== null && address.telefono !== undefined) 
    ? String(address.telefono) 
    : '';
  const instrucciones = (address.instrucciones !== null && address.instrucciones !== undefined) 
    ? String(address.instrucciones) 
    : '';
  
  // Convertir esPrincipal a booleano (viene como 1 o 0 desde el backend MySQL tinyint)
  const esPrincipal = Boolean(address.esPrincipal);

  return (
    <View style={[styles.addressCard, { backgroundColor }]}>
      <View style={styles.addressHeader}>
        <View style={styles.addressInfo}>
          <ThemedText style={styles.addressName}>
            {nombreDestinatario}
          </ThemedText>
          {esPrincipal && (
            <View style={[styles.primaryBadge, { backgroundColor: tintColor + '20' }]}>
              <ThemedText style={[styles.primaryText, { color: tintColor }]}>
                Principal
              </ThemedText>
            </View>
          )}
        </View>
        
        <View style={styles.addressActions}>
          {!esPrincipal && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSetPrimary}
              disabled={isSettingPrimary}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="star-outline" 
                size={18} 
                color={isSettingPrimary ? '#ccc' : tintColor} 
              />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onDelete}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="trash-outline" 
              size={18} 
              color={isDeleting ? '#ccc' : '#F44336'} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <ThemedText style={styles.addressText}>
        {direccion}
      </ThemedText>
      <ThemedText style={styles.addressText}>
        {[ciudad, departamento].filter(v => v && v.length > 0).join(', ') || 'Sin ubicación'}
      </ThemedText>
      {telefono && telefono.length > 0 && (
        <View style={styles.phoneContainer}>
          <Ionicons name="call-outline" size={16} color="#666" />
          <ThemedText style={styles.phoneText}>
            {telefono}
          </ThemedText>
        </View>
      )}
      
      {instrucciones && instrucciones.length > 0 && (
        <View style={styles.instructionsContainer}>
          <ThemedText style={styles.instructionsLabel}>Instrucciones:</ThemedText>
          <ThemedText style={styles.instructionsText}>
            {instrucciones}
          </ThemedText>
        </View>
      )}
    </View>
  );
};

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
    paddingVertical: 60,
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
  addFirstButton: {
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
  addFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addressesContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  addressCard: {
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  primaryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addressActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    borderRadius: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    lineHeight: 20,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  phoneText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  instructionsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  instructionsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  bottomSpacing: {
    height: 32,
  },
});
