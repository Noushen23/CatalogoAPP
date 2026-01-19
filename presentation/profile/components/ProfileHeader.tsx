import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { Profile } from '@/core/api/profileApi';
import { useUpdateAvatar } from '../hooks/useProfile';

interface ProfileHeaderProps {
  profile: Profile;
  onEditPress?: () => void;
}

// Componente optimizado para el avatar
const AvatarComponent = React.memo<{
  avatarUrl?: string;
  userName?: string;
  tintColor: string;
  onPress: () => void;
  isUpdating: boolean;
}>(({ avatarUrl, userName, tintColor, onPress, isUpdating }) => {
  const avatarInitial = useMemo(() => {
    return userName ? userName.charAt(0).toUpperCase() : 'U';
  }, [userName]);

  return (
    <TouchableOpacity
      style={[styles.avatarContainer, { backgroundColor: tintColor }]}
      onPress={onPress}
      disabled={isUpdating}
      activeOpacity={0.8}
    >
      {isUpdating ? (
        <ActivityIndicator size="small" color="white" />
      ) : avatarUrl ? (
        <View style={styles.avatarImageContainer}>
          {/* Aquí iría una imagen real si tuvieras Image component */}
          <Ionicons name="person" size={32} color="white" />
        </View>
      ) : (
        <ThemedText style={styles.avatarText}>{avatarInitial}</ThemedText>
      )}
    </TouchableOpacity>
  );
});

// Componente optimizado para información del usuario
const UserInfoComponent = React.memo<{
  profile: Profile;
  tintColor: string;
  onEditPress?: () => void;
}>(({ profile, tintColor, onEditPress }) => {
  const userName = useMemo(() => {
    const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    return fullName || 'Usuario';
  }, [profile.firstName, profile.lastName]);

  const userEmail = useMemo(() => {
    return profile.email || 'email@ejemplo.com';
  }, [profile.email]);

  const memberSince = useMemo(() => {
    if (!profile.createdAt) return 'No disponible';
    return new Date(profile.createdAt).toLocaleDateString('es-CO');
  }, [profile.createdAt]);

  return (
    <View style={styles.userInfo}>
      <View style={styles.userDetails}>
        <ThemedText style={styles.userName}>{userName}</ThemedText>
        <ThemedText style={styles.userEmail}>{userEmail}</ThemedText>
        <ThemedText style={styles.memberSince}>
          Miembro desde {memberSince}
        </ThemedText>
      </View>
      
      {onEditPress && (
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: `${tintColor}20` }]}
          onPress={onEditPress}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={16} color={tintColor} />
        </TouchableOpacity>
      )}
    </View>
  );
});

// Componente principal optimizado
export const ProfileHeader: React.FC<ProfileHeaderProps> = React.memo(({ profile, onEditPress }) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const updateAvatarMutation = useUpdateAvatar();

  const handleAvatarPress = useCallback(() => {
    Alert.alert(
      'Cambiar Avatar',
      '¿Cómo quieres cambiar tu avatar?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Desde URL',
          onPress: () => {
            Alert.prompt(
              'URL del Avatar',
              'Ingresa la URL de tu nueva imagen de perfil:',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Actualizar',
                  onPress: (url?: string) => {
                    if (url?.trim()) {
                      updateAvatarMutation.mutate(url.trim());
                    }
                  },
                },
              ],
              'plain-text',
              profile.avatar || ''
            );
          },
        },
        {
          text: 'Eliminar Avatar',
          style: 'destructive',
          onPress: () => {
            updateAvatarMutation.mutate('');
          },
        },
      ]
    );
  }, [profile.avatar, updateAvatarMutation]);

  const handleEditPress = useCallback(() => {
    if (onEditPress) {
      onEditPress();
    } else {
      Alert.alert('Próximamente', 'La edición de perfil estará disponible pronto');
    }
  }, [onEditPress]);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <AvatarComponent
          avatarUrl={profile.avatar}
          userName={`${profile.firstName || ''} ${profile.lastName || ''}`.trim()}
          tintColor={tintColor}
          onPress={handleAvatarPress}
          isUpdating={updateAvatarMutation.isPending}
        />
        
        <UserInfoComponent
          profile={profile}
          tintColor={tintColor}
          onEditPress={handleEditPress}
        />
      </View>
    </ThemedView>
  );
});

ProfileHeader.displayName = 'ProfileHeader';

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  memberSince: {
    fontSize: 12,
    color: '#888',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  verificationText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 6,
    flex: 1,
  },
});