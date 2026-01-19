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
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { CartIndicator } from '@/presentation/cart/components/CartIndicator';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { useProfile, useUpdateUserInfo, useChangePassword, useRequestChangeEmail, useVerifyChangeEmail } from '@/presentation/profile/hooks/useProfile';
import { ProfileHeader } from '@/presentation/profile/components/ProfileHeader';
import { PersonalInfo } from '@/presentation/profile/components/PersonalInfo';
import { useAuthRedirect } from '@/presentation/auth/hooks/useAuthRedirect';

// Configuración del icono para la pestaña
export const icon = 'person-outline';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para modales de edición
  const [showEditNombreModal, setShowEditNombreModal] = useState(false);
  const [nombreValue, setNombreValue] = useState('');
  const [showEditDocumentoModal, setShowEditDocumentoModal] = useState(false);
  const [documentoType, setDocumentoType] = useState<'CC' | 'NIT' | 'CE' | 'TR' | ''>('');
  const [documentoValue, setDocumentoValue] = useState('');
  
  // Estados para modales de contraseña
  const [showPasswordModal1, setShowPasswordModal1] = useState(false); // Contraseña actual
  const [showPasswordModal2, setShowPasswordModal2] = useState(false); // Nueva contraseña
  const [showPasswordModal3, setShowPasswordModal3] = useState(false); // Confirmar contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estados para modales de email
  const [showEmailModal1, setShowEmailModal1] = useState(false); // Nuevo email
  const [showEmailModal2, setShowEmailModal2] = useState(false); // Código de verificación
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Hook para manejar redirección automática al logout
  useAuthRedirect();

  // Hooks para obtener datos del perfil
  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const updateUserInfoMutation = useUpdateUserInfo();
  const changePasswordMutation = useChangePassword();
  const requestChangeEmailMutation = useRequestChangeEmail();
  const verifyChangeEmailMutation = useVerifyChangeEmail();

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
      await refetchProfile();
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditNombre = () => {
    setNombreValue(user?.nombreCompleto || '');
    setShowEditNombreModal(true);
  };

  const handleSaveNombre = () => {
    if (nombreValue && nombreValue.trim()) {
      updateUserInfoMutation.mutate(
        { nombreCompleto: nombreValue.trim() },
        {
          onSuccess: () => {
            setShowEditNombreModal(false);
            setNombreValue('');
          },
        }
      );
    } else {
      Alert.alert('Error', 'El nombre no puede estar vacío');
    }
  };

  const handleEditDocumento = () => {
    // Primero seleccionar el tipo de documento
    Alert.alert(
      'Editar Documento',
      'Selecciona el tipo de documento:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'CC',
          onPress: () => {
            setDocumentoType('CC');
            setDocumentoValue(user?.numeroIdentificacion || '');
            setShowEditDocumentoModal(true);
          },
        },
        {
          text: 'NIT',
          onPress: () => {
            setDocumentoType('NIT');
            setDocumentoValue(user?.numeroIdentificacion || '');
            setShowEditDocumentoModal(true);
          },
        },
        {
          text: 'CE',
          onPress: () => {
            setDocumentoType('CE');
            setDocumentoValue(user?.numeroIdentificacion || '');
            setShowEditDocumentoModal(true);
          },
        },
        {
          text: 'TR',
          onPress: () => {
            setDocumentoType('TR');
            setDocumentoValue(user?.numeroIdentificacion || '');
            setShowEditDocumentoModal(true);
          },
        },
      ]
    );
  };

  const handleSaveDocumento = () => {
    if (documentoValue && documentoValue.trim() && documentoType) {
      updateUserInfoMutation.mutate(
        {
          tipoIdentificacion: documentoType as 'CC' | 'NIT' | 'CE' | 'TR',
          numeroIdentificacion: documentoValue.trim(),
        },
        {
          onSuccess: () => {
            setShowEditDocumentoModal(false);
            setDocumentoType('');
            setDocumentoValue('');
          },
        }
      );
    } else {
      Alert.alert('Error', 'El número de documento no puede estar vacío');
    }
  };

  const getDocumentoLabel = (type: string) => {
    const labels: Record<string, string> = {
      CC: 'Cédula de Ciudadanía',
      NIT: 'NIT',
      CE: 'Cédula de Extranjería',
      TR: 'Tarjeta de Identidad',
    };
    return labels[type] || type;
  };

  const handleChangePassword = () => {
    // Evitar múltiples llamadas simultáneas
    if (changePasswordMutation.isPending) {
      Alert.alert('Espera', 'Ya hay un cambio de contraseña en proceso. Por favor espera.');
      return;
    }
    // Abrir primer modal (contraseña actual)
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal1(true);
  };

  const handlePasswordStep1 = () => {
    if (!currentPassword || !currentPassword.trim()) {
      Alert.alert('Error', 'Debes ingresar tu contraseña actual');
      return;
    }
    setShowPasswordModal1(false);
    setShowPasswordModal2(true);
  };

  const handlePasswordStep2 = () => {
    if (!newPassword || !newPassword.trim()) {
      Alert.alert('Error', 'Debes ingresar una nueva contraseña');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validar formato de contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      Alert.alert(
        'Error',
        'La contraseña debe contener al menos:\n• Una mayúscula\n• Una minúscula\n• Un número'
      );
      return;
    }

    setShowPasswordModal2(false);
    setShowPasswordModal3(true);
  };

  const handlePasswordStep3 = () => {
    if (!confirmPassword || confirmPassword !== newPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    // Verificar que no haya una mutación en proceso antes de ejecutar
    if (changePasswordMutation.isPending) {
      Alert.alert('Espera', 'Ya hay un cambio de contraseña en proceso. Por favor espera.');
      return;
    }

    // Cambiar contraseña
    changePasswordMutation.mutate(
      {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      },
      {
        onSuccess: () => {
          setShowPasswordModal3(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
      }
    );
  };

  const handleChangeEmail = () => {
    // Evitar múltiples llamadas simultáneas
    if (requestChangeEmailMutation.isPending || verifyChangeEmailMutation.isPending) {
      Alert.alert('Espera', 'Ya hay un cambio de email en proceso. Por favor espera.');
      return;
    }
    // Abrir primer modal (nuevo email)
    setNewEmail('');
    setVerificationCode('');
    setShowEmailModal1(true);
  };

  const handleEmailStep1 = () => {
    if (!newEmail || !newEmail.trim()) {
      Alert.alert('Error', 'Debes ingresar un email válido');
      return;
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      Alert.alert('Error', 'El formato del email no es válido');
      return;
    }

    // Verificar que el nuevo email sea diferente al actual
    if (user?.email && user.email.toLowerCase() === newEmail.trim().toLowerCase()) {
      Alert.alert('Error', 'El nuevo email debe ser diferente al email actual');
      return;
    }

    // Solicitar cambio de email (enviar código)
    requestChangeEmailMutation.mutate(newEmail.trim(), {
      onSuccess: () => {
        setShowEmailModal1(false);
        setShowEmailModal2(true);
      },
    });
  };

  const handleEmailStep2 = () => {
    if (!verificationCode || !verificationCode.trim()) {
      Alert.alert('Error', 'Debes ingresar el código de verificación');
      return;
    }

    // Validar que el código tenga 6 dígitos
    if (!/^\d{6}$/.test(verificationCode.trim())) {
      Alert.alert('Error', 'El código debe tener 6 dígitos');
      return;
    }

    // Verificar código y cambiar email
    verifyChangeEmailMutation.mutate(verificationCode.trim(), {
      onSuccess: () => {
        setShowEmailModal2(false);
        setNewEmail('');
        setVerificationCode('');
      },
    });
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
      icon: 'lock-closed-outline',
      title: 'Cambiar Contraseña',
      subtitle: 'Actualiza tu contraseña de acceso',
      onPress: handleChangePassword,
    },
    {
      icon: 'mail-outline',
      title: 'Cambiar Email',
      subtitle: 'Actualiza tu dirección de email',
      onPress: handleChangeEmail,
    },
    {
      icon: 'information-circle-outline',
      title: 'Acerca de',
      subtitle: 'Información de la aplicación',
      onPress: () => {
        Alert.alert(
          'Acerca de',
          'Tienda Móvil \n\nCuerpo de bomberos voluntarios de cucuta\n\n© 2026 Todos los derechos reservados',
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
        {(profileData as any)?.hasProfile && (profileData as any)?.profile ? (
          <ProfileHeader 
            profile={(profileData as any).profile}
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
              </View>
            </View>
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

        {/* Información básica del usuario - siempre visible */}
        <View style={styles.userInfoSection}>
          <ThemedText style={styles.sectionTitle}>Información de Cuenta</ThemedText>
          
          <View style={styles.infoCard}>
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={handleEditNombre}
              activeOpacity={0.7}
              disabled={updateUserInfoMutation.isPending}
            >
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={20} color={tintColor} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel}>Nombre</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {user?.nombreCompleto || 'No especificado'}
                </ThemedText>
              </View>
              <TouchableOpacity 
                onPress={handleEditNombre}
                disabled={updateUserInfoMutation.isPending}
              >
                <Ionicons name="create-outline" size={20} color={tintColor} />
              </TouchableOpacity>
            </TouchableOpacity>
            
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
            
            <TouchableOpacity 
              style={styles.infoRow}
              onPress={handleEditDocumento}
              activeOpacity={0.7}
              disabled={updateUserInfoMutation.isPending}
            >
              <View style={styles.infoIcon}>
                <Ionicons name="card-outline" size={20} color={tintColor} />
              </View>
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoLabel}>Documento</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {user?.tipoIdentificacion && user?.numeroIdentificacion
                    ? `${user.tipoIdentificacion} ${user.numeroIdentificacion}`
                    : 'No especificado'}
                </ThemedText>
              </View>
              <TouchableOpacity 
                onPress={handleEditDocumento}
                disabled={updateUserInfoMutation.isPending}
              >
                <Ionicons name="create-outline" size={20} color={tintColor} />
              </TouchableOpacity>
            </TouchableOpacity>
            
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
        {(profileData as any)?.hasProfile && (profileData as any)?.profile && (
          <PersonalInfo profile={(profileData as any).profile} />
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

      {/* Modal para editar nombre */}
      <Modal
        visible={showEditNombreModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditNombreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Editar Nombre</ThemedText>
              <TouchableOpacity onPress={() => setShowEditNombreModal(false)}>
                <Ionicons name="close" size={24} color={tintColor} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalDescription}>
              Ingresa tu nombre completo:
            </ThemedText>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={[styles.modalInput, { color: useThemeColor({}, 'text') }]}
                placeholder="Nombre completo"
                placeholderTextColor="#999"
                value={nombreValue}
                onChangeText={setNombreValue}
                autoCapitalize="words"
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEditNombreModal(false)}
              >
                <ThemedText style={styles.modalButtonCancelText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  { backgroundColor: tintColor },
                  (updateUserInfoMutation.isPending || !nombreValue.trim()) && { opacity: 0.5 }
                ]}
                onPress={handleSaveNombre}
                disabled={updateUserInfoMutation.isPending || !nombreValue.trim()}
              >
                {updateUserInfoMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.modalButtonSaveText}>Guardar</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para editar documento */}
      <Modal
        visible={showEditDocumentoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditDocumentoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                Número de {getDocumentoLabel(documentoType)}
              </ThemedText>
              <TouchableOpacity onPress={() => setShowEditDocumentoModal(false)}>
                <Ionicons name="close" size={24} color={tintColor} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalDescription}>
              Ingresa tu número de {getDocumentoLabel(documentoType).toLowerCase()}:
            </ThemedText>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={[styles.modalInput, { color: useThemeColor({}, 'text') }]}
                placeholder={`Número de ${getDocumentoLabel(documentoType)}`}
                placeholderTextColor="#999"
                value={documentoValue}
                onChangeText={setDocumentoValue}
                keyboardType="default"
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEditDocumentoModal(false)}
              >
                <ThemedText style={styles.modalButtonCancelText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  { backgroundColor: tintColor },
                  (updateUserInfoMutation.isPending || !documentoValue.trim()) && { opacity: 0.5 }
                ]}
                onPress={handleSaveDocumento}
                disabled={updateUserInfoMutation.isPending || !documentoValue.trim()}
              >
                {updateUserInfoMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.modalButtonSaveText}>Guardar</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 1: Contraseña actual */}
      <Modal
        visible={showPasswordModal1}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal1(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Cambiar Contraseña</ThemedText>
              <TouchableOpacity onPress={() => setShowPasswordModal1(false)}>
                <Ionicons name="close" size={24} color={tintColor} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalDescription}>
              Ingresa tu contraseña actual:
            </ThemedText>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={[styles.modalInput, { color: useThemeColor({}, 'text') }]}
                placeholder="Contraseña actual"
                placeholderTextColor="#999"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPasswordModal1(false)}
              >
                <ThemedText style={styles.modalButtonCancelText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  { backgroundColor: tintColor },
                  !currentPassword.trim() && { opacity: 0.5 }
                ]}
                onPress={handlePasswordStep1}
                disabled={!currentPassword.trim()}
              >
                <ThemedText style={styles.modalButtonSaveText}>Continuar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Nueva contraseña */}
      <Modal
        visible={showPasswordModal2}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal2(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Nueva Contraseña</ThemedText>
              <TouchableOpacity onPress={() => setShowPasswordModal2(false)}>
                <Ionicons name="close" size={24} color={tintColor} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalDescription}>
              Ingresa tu nueva contraseña:{'\n\n'}
              Debe tener al menos 6 caracteres, incluir una mayúscula, una minúscula y un número.
            </ThemedText>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={[styles.modalInput, { color: useThemeColor({}, 'text') }]}
                placeholder="Nueva contraseña"
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPasswordModal2(false)}
              >
                <ThemedText style={styles.modalButtonCancelText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  { backgroundColor: tintColor },
                  !newPassword.trim() && { opacity: 0.5 }
                ]}
                onPress={handlePasswordStep2}
                disabled={!newPassword.trim()}
              >
                <ThemedText style={styles.modalButtonSaveText}>Continuar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 3: Confirmar contraseña */}
      <Modal
        visible={showPasswordModal3}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal3(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Confirmar Nueva Contraseña</ThemedText>
              <TouchableOpacity onPress={() => setShowPasswordModal3(false)}>
                <Ionicons name="close" size={24} color={tintColor} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalDescription}>
              Confirma tu nueva contraseña:
            </ThemedText>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={[styles.modalInput, { color: useThemeColor({}, 'text') }]}
                placeholder="Confirmar nueva contraseña"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPasswordModal3(false)}
              >
                <ThemedText style={styles.modalButtonCancelText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  { backgroundColor: tintColor },
                  (changePasswordMutation.isPending || !confirmPassword.trim()) && { opacity: 0.5 }
                ]}
                onPress={handlePasswordStep3}
                disabled={changePasswordMutation.isPending || !confirmPassword.trim()}
              >
                {changePasswordMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.modalButtonSaveText}>Cambiar</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 1: Nuevo email */}
      <Modal
        visible={showEmailModal1}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmailModal1(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Cambiar Email</ThemedText>
              <TouchableOpacity onPress={() => setShowEmailModal1(false)}>
                <Ionicons name="close" size={24} color={tintColor} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalDescription}>
              Ingresa tu nuevo email:
            </ThemedText>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={[styles.modalInput, { color: useThemeColor({}, 'text') }]}
                placeholder="Nuevo email"
                placeholderTextColor="#999"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEmailModal1(false)}
              >
                <ThemedText style={styles.modalButtonCancelText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  { backgroundColor: tintColor },
                  (requestChangeEmailMutation.isPending || !newEmail.trim()) && { opacity: 0.5 }
                ]}
                onPress={handleEmailStep1}
                disabled={requestChangeEmailMutation.isPending || !newEmail.trim()}
              >
                {requestChangeEmailMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.modalButtonSaveText}>Continuar</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal 2: Código de verificación */}
      <Modal
        visible={showEmailModal2}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmailModal2(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Código de Verificación</ThemedText>
              <TouchableOpacity onPress={() => setShowEmailModal2(false)}>
                <Ionicons name="close" size={24} color={tintColor} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.modalDescription}>
              Hemos enviado un código de verificación a tu nuevo email. Ingresa el código:
            </ThemedText>

            <View style={styles.modalInputContainer}>
              <TextInput
                style={[styles.modalInput, { color: useThemeColor({}, 'text') }]}
                placeholder="Código de 6 dígitos"
                placeholderTextColor="#999"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEmailModal2(false)}
              >
                <ThemedText style={styles.modalButtonCancelText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  { backgroundColor: tintColor },
                  (verifyChangeEmailMutation.isPending || !verificationCode.trim()) && { opacity: 0.5 }
                ]}
                onPress={handleEmailStep2}
                disabled={verifyChangeEmailMutation.isPending || !verificationCode.trim()}
              >
                {verifyChangeEmailMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.modalButtonSaveText}>Verificar</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Estilos para modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalInputContainer: {
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonCancelText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonSave: {
    opacity: 1,
  },
  modalButtonSaveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
