import * as React from 'react';
import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { CartIndicator } from '@/presentation/cart/components/CartIndicator';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { useProfile, useProfileStats } from '@/presentation/profile/hooks/useProfile';
import { ProfileHeader } from '@/presentation/profile/components/ProfileHeader';
import { ProfileStats } from '@/presentation/profile/components/ProfileStats';
import { PersonalInfo } from '@/presentation/profile/components/PersonalInfo';
import { useAuthRedirect } from '@/presentation/auth/hooks/useAuthRedirect';

// Configuración del icono para la pestaña
export const icon = 'person-outline';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Hook para manejar redirección automática al logout
  useAuthRedirect();

  // Hooks para obtener datos del perfil
  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { data: profileStats, isLoading: statsLoading, refetch: refetchStats } = useProfileStats();

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
              // La redirección se maneja automáticamente con useAuthRedirect
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar sesión');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchProfile(), refetchStats()]);
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
    } finally {
      setRefreshing(false);
    }
  };


  const menuItems = [
    {
      icon: 'location-outline',
      title: 'Direcciones de Envío',
      subtitle: 'Gestiona tus direcciones de entrega',
      onPress: () => router.push('/(customer)/shipping-addresses' as any),
    },
    {
      icon: 'heart-outline',
      title: 'Mis Favoritos',
      subtitle: 'Productos que te gustan',
      onPress: () => router.push('/(customer)/favorites' as any),
    },
    {
      icon: 'bag-outline',
      title: 'Mis Pedidos',
      subtitle: 'Historial de compras y pedidos',
      onPress: () => router.push('/(customer)/orders' as any),
    },
    {
      icon: 'information-circle-outline',
      title: 'Acerca de',
      subtitle: 'Información de la aplicación',
      onPress: () => {
        Alert.alert(
          'Acerca de',
          'Tienda Móvil v1.0.0\n\nDesarrollado con React Native y Expo\n\n© 2024 Todos los derechos reservados',
          [{ text: 'Cerrar' }]
        );
      },
    },
  ];

  // Mostrar loading solo si no hay datos del usuario en el store
  const showLoading = profileLoading && !user;
  
  if (showLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Mi Perfil</ThemedText>
          <CartIndicator
            onPress={() => router.push('/(customer)/cart')}
            showText={false}
            size="medium"
          />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Cargando perfil...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header con navegación y carrito */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Mi Perfil</ThemedText>
        
        <CartIndicator
          onPress={() => router.push('/(customer)/cart')}
          showText={false}
          size="medium"
        />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header del perfil */}
        {profileData?.hasProfile && profileData.profile ? (
          <ProfileHeader 
            profile={profileData.profile}
          />
        ) : (
          /* Header básico para usuarios sin perfil completo */
          <View style={styles.basicProfileContainer}>
            <View style={styles.basicProfileHeader}>
              <View style={[styles.basicAvatar, { backgroundColor: tintColor }]}>
                <ThemedText style={styles.basicAvatarText}>
                  {user?.nombreCompleto ? user.nombreCompleto.charAt(0).toUpperCase() : 'U'}
                </ThemedText>
              </View>
              <View style={styles.basicUserInfo}>
                <ThemedText style={styles.basicUserName}>
                  {user?.nombreCompleto || 'Usuario'}
                </ThemedText>
                <ThemedText style={styles.basicUserEmail}>
                  {user?.email || 'email@ejemplo.com'}
                </ThemedText>
                <View style={styles.completeProfilePrompt}>
                  <Ionicons name="information-circle-outline" size={16} color="#FF9800" />
                  <ThemedText style={styles.completeProfileText}>
                    Completa tu perfil para una mejor experiencia
                  </ThemedText>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.completeProfileButton, { backgroundColor: tintColor }]}
              onPress={() => {
                Alert.alert('Próximamente', 'La edición de perfil estará disponible pronto');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={20} color="white" />
              <ThemedText style={styles.completeProfileButtonText}>
                Completar Perfil
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Banner de verificación de email */}
        {!user?.emailVerificado && (
          <TouchableOpacity
            style={styles.verificationBanner}
            onPress={() => router.push('/auth/verify-email' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-unread-outline" size={24} color="#FF9800" />
            <View style={styles.verificationTextContainer}>
              <ThemedText style={styles.verificationTitle}>Email no verificado</ThemedText>
              <ThemedText style={styles.verificationText}>
                Toca aquí para verificar tu email y poder realizar compras
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF9800" />
          </TouchableOpacity>
        )}

        {/* Estadísticas del perfil */}
        {statsLoading ? (
          <View style={[styles.statsLoadingContainer, { backgroundColor }]}>
            <ActivityIndicator size="small" color={tintColor} />
            <ThemedText style={styles.statsLoadingText}>Cargando estadísticas...</ThemedText>
          </View>
        ) : profileStats ? (
          <ProfileStats stats={profileStats} />
        ) : null}

        {/* Información básica del usuario - siempre visible */}
        <View style={styles.userInfoSection}>
          <ThemedText style={styles.sectionTitle}>Información de Cuenta</ThemedText>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={20} color={tintColor} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel}>Nombre</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {user?.nombreCompleto || 'No especificado'}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={20} color={tintColor} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel}>Email</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {user?.email || 'No especificado'}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="calendar-outline" size={20} color={tintColor} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel}>Miembro desde</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {user?.fechaCreacion ? new Date(user.fechaCreacion).toLocaleDateString('es-CO') : 'No disponible'}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons 
                  name={user?.emailVerificado ? "checkmark-circle" : "alert-circle"} 
                  size={20} 
                  color={user?.emailVerificado ? "#4CAF50" : "#FF9800"} 
                />
              </View>
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel}>Estado de cuenta</ThemedText>
                <ThemedText style={[
                  styles.infoValue,
                  { color: user?.emailVerificado ? "#4CAF50" : "#FF9800" }
                ]}>
                  {user?.emailVerificado ? 'Email verificado' : 'Email pendiente de verificación'}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Información personal */}
        {profileData?.hasProfile && profileData.profile && (
          <PersonalInfo profile={profileData.profile} />
        )}


        {/* Menú de opciones */}
        <View style={styles.menuContainer}>
          <ThemedText style={styles.menuTitle}>Más Opciones</ThemedText>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { backgroundColor }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: `${tintColor}20` }]}>
                  <Ionicons name={item.icon as any} size={24} color={tintColor} />
                </View>
                <View style={styles.menuItemContent}>
                  <ThemedText style={styles.menuItemTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.menuItemSubtitle}>{item.subtitle}</ThemedText>
                </View>
              </View>
              
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Botón de cerrar sesión */}
        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: '#F44336' }]}
          onPress={handleLogout}
          activeOpacity={0.8}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#F44336" />
          ) : (
            <Ionicons name="log-out-outline" size={20} color="#F44336" />
          )}
          <ThemedText style={[styles.logoutButtonText, { color: '#F44336' }]}>
            {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    gap: 12,
  },
  verificationTextContainer: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  verificationText: {
    fontSize: 12,
    color: '#F57C00',
    lineHeight: 16,
  },
  statsLoadingContainer: {
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  statsLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  menuContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Estilos para perfil básico
  basicProfileContainer: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  basicProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  basicAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  basicAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  basicUserInfo: {
    flex: 1,
  },
  basicUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  basicUserEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  completeProfilePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  completeProfileText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 4,
    fontWeight: '500',
  },
  completeProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  completeProfileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Estilos para información de usuario
  userInfoSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
});
