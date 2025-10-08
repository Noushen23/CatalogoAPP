import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { Profile } from '@/core/api/profileApi';
import { useUpdatePersonalInfo, useUpdateUserInfo } from '../hooks/useProfile';
import { formatDate as formatDateUtil } from '@/presentation/utils';

interface PersonalInfoProps {
  profile: Profile;
}

// Componente optimizado para mostrar información
const InfoRow = React.memo<{
  icon: string;
  label: string;
  value: string;
  tintColor: string;
  onPress?: () => void;
  showEdit?: boolean;
}>(({ icon, label, value, tintColor, onPress, showEdit = false }) => (
  <TouchableOpacity
    style={[styles.infoRow, { backgroundColor: '#f8f9fa' }]}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
  >
    <View style={[styles.infoIcon, { backgroundColor: `${tintColor}20` }]}>
      <Ionicons name={icon as any} size={20} color={tintColor} />
    </View>
    <View style={styles.infoContent}>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      <ThemedText style={styles.infoValue}>{value}</ThemedText>
    </View>
    {showEdit && onPress && (
      <Ionicons name="chevron-forward" size={16} color="#666" />
    )}
  </TouchableOpacity>
));

// Funciones helper memoizadas
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'No especificado';
  try {
    return formatDateUtil(dateString, { format: 'long' });
  } catch {
    return 'Fecha inválida';
  }
};

const formatGender = (gender?: string): string => {
  const genderMap: Record<string, string> = {
    'masculino': 'Masculino',
    'femenino': 'Femenino',
    'otro': 'Otro',
    'no_especificar': 'No especificar',
  };
  return genderMap[gender || ''] || 'No especificado';
};

const formatPhone = (phone?: string): string => {
  if (!phone) return 'No especificado';
  // Formatear número de teléfono si es necesario
  return phone;
};

const formatAddress = (address?: string): string => {
  if (!address) return 'No especificado';
  return address;
};

// Componente principal optimizado
export const PersonalInfo: React.FC<PersonalInfoProps> = React.memo(({ profile }) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const updatePersonalInfoMutation = useUpdatePersonalInfo();
  const updateUserInfoMutation = useUpdateUserInfo();

  // Valores memoizados
  const formattedValues = useMemo(() => ({
    birthDate: formatDate(profile.fechaNacimiento),
    gender: formatGender(profile.genero),
    phone: formatPhone(profile.usuario?.telefono),
    address: formatAddress(profile.usuario?.direccion),
  }), [profile.fechaNacimiento, profile.genero, profile.usuario?.telefono, profile.usuario?.direccion]);

  // Handlers optimizados
  const handleEditBirthDate = useCallback(() => {
    Alert.prompt(
      'Fecha de Nacimiento',
      'Ingresa tu fecha de nacimiento (YYYY-MM-DD):',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: (dateString?: string) => {
            if (dateString?.trim()) {
              try {
                const date = new Date(dateString.trim());
                if (!isNaN(date.getTime())) {
                  updatePersonalInfoMutation.mutate({
                    fechaNacimiento: date.toISOString().split('T')[0],
                  });
                } else {
                  Alert.alert('Error', 'Formato de fecha inválido');
                }
              } catch {
                Alert.alert('Error', 'Fecha inválida');
              }
            }
          },
        },
      ],
      'plain-text',
      profile.fechaNacimiento || ''
    );
  }, [profile.fechaNacimiento, updatePersonalInfoMutation]);

  const handleEditGender = useCallback(() => {
    Alert.alert(
      'Género',
      'Selecciona tu género:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Masculino',
          onPress: () => updatePersonalInfoMutation.mutate({ genero: 'masculino' }),
        },
        {
          text: 'Femenino',
          onPress: () => updatePersonalInfoMutation.mutate({ genero: 'femenino' }),
        },
        {
          text: 'Otro',
          onPress: () => updatePersonalInfoMutation.mutate({ genero: 'otro' }),
        },
        {
          text: 'No especificar',
          onPress: () => updatePersonalInfoMutation.mutate({ genero: 'no_especificar' }),
        },
      ]
    );
  }, [updatePersonalInfoMutation]);

  const handleEditPhone = useCallback(() => {
    Alert.prompt(
      'Teléfono',
      'Ingresa tu número de teléfono:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: (phone?: string) => {
            if (phone?.trim()) {
              updateUserInfoMutation.mutate({ telefono: phone.trim() });
            }
          },
        },
      ],
      'plain-text',
      profile.usuario?.telefono || ''
    );
  }, [profile.usuario?.telefono, updateUserInfoMutation]);

  const handleEditAddress = useCallback(() => {
    Alert.prompt(
      'Dirección',
      'Ingresa tu dirección:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: (address?: string) => {
            if (address?.trim()) {
              updateUserInfoMutation.mutate({ direccion: address.trim() });
            }
          },
        },
      ],
      'plain-text',
      profile.usuario?.direccion || ''
    );
  }, [profile.usuario?.direccion, updateUserInfoMutation]);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <ThemedText style={styles.sectionTitle}>Información Personal</ThemedText>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: `${tintColor}20` }]}
          onPress={() => Alert.alert('Próximamente', 'Edición completa estará disponible pronto')}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={16} color={tintColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <InfoRow
          icon="calendar-outline"
          label="Fecha de Nacimiento"
          value={formattedValues.birthDate}
          tintColor={tintColor}
          onPress={handleEditBirthDate}
          showEdit={true}
        />

        <InfoRow
          icon="person-outline"
          label="Género"
          value={formattedValues.gender}
          tintColor={tintColor}
          onPress={handleEditGender}
          showEdit={true}
        />

        <InfoRow
          icon="call-outline"
          label="Teléfono"
          value={formattedValues.phone}
          tintColor={tintColor}
          onPress={handleEditPhone}
          showEdit={true}
        />

        <InfoRow
          icon="location-outline"
          label="Dirección"
          value={formattedValues.address}
          tintColor={tintColor}
          onPress={handleEditAddress}
          showEdit={true}
        />
      </View>

      {(updatePersonalInfoMutation.isPending || updateUserInfoMutation.isPending) && (
        <View style={styles.loadingOverlay}>
          <ThemedText style={styles.loadingText}>Actualizando...</ThemedText>
        </View>
      )}
    </ThemedView>
  );
});

PersonalInfo.displayName = 'PersonalInfo';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});