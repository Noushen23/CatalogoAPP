import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { apiClient } from '@/core/api/apiClient';

// Configurar el comportamiento de las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // Reproducir sonido
    shouldSetBadge: false, // Dejar que el servidor controle el badge
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: string;
  orderId?: string;
  orderNumber?: string;
  newStatus?: string;
  customerName?: string;
  timestamp: string;
}

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushNotificationState>({
    expoPushToken: null,
    notification: null,
    isRegistered: false,
    isLoading: false,
    error: null,
  });

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Función para registrar el dispositivo para notificaciones push
  const registerForPushNotificationsAsync = useCallback(async (): Promise<string | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Verificar si el dispositivo es físico (no funciona en simulador)
      if (!Device.isDevice) {
        console.warn('⚠️ Las notificaciones push no funcionan en el simulador');
        setState(prev => ({ ...prev, error: 'Las notificaciones push no funcionan en el simulador', isLoading: false }));
        return null;
      }

      // Verificar si hay un token de autenticación válido antes de hacer la petición
      const authToken = await apiClient.loadToken();
      if (!authToken) {
        console.warn('⚠️ No hay token de autenticación, saltando registro de notificaciones');
        setState(prev => ({ ...prev, isLoading: false }));
        return null;
      }

      // Solicitar permisos para notificaciones
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('📱 Solicitando permisos para notificaciones...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Permisos de notificaciones denegados');
        setState(prev => ({ 
          ...prev, 
          error: 'Permisos de notificaciones denegados',
          isLoading: false 
        }));
        return null;
      }

      console.log('✅ Permisos de notificaciones concedidos');

      // Obtener el token de Expo
      console.log('📱 Obteniendo token de Expo...');
      
      // Intentar obtener projectId del ambiente o app.json
      let projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      
      // Si no hay projectId, intentar sin él (para desarrollo local)
      let token;
      try {
        if (projectId) {
          token = await Notifications.getExpoPushTokenAsync({ projectId });
        } else {
          // Para desarrollo local sin EAS
          token = await Notifications.getExpoPushTokenAsync();
        }
      } catch (error) {
        // Si falla con projectId, intentar sin él
        console.warn('⚠️ No se pudo obtener token con projectId, intentando sin él...');
        token = await Notifications.getExpoPushTokenAsync();
      }

      const expoPushToken = token.data;
      console.log('✅ Token de Expo obtenido:', expoPushToken);

      // Configurar canales de notificación para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('order_updates', {
          name: 'Actualizaciones de Pedidos',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          description: 'Notificaciones sobre cambios en el estado de tus pedidos',
        });

        await Notifications.setNotificationChannelAsync('admin_notifications', {
          name: 'Notificaciones de Administrador',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          description: 'Notificaciones importantes para administradores',
        });

        console.log('✅ Canales de notificación configurados para Android');
      }

      // Enviar el token al backend
      console.log('📡 Enviando token al backend...');
      try {
        const response = await apiClient.post('/profile/push-token', {
          push_token: expoPushToken,
        });

        if (response.success) {
          console.log('✅ Token registrado exitosamente en el backend');
          setState(prev => ({
            ...prev,
            expoPushToken,
            isRegistered: true,
            isLoading: false,
          }));
          return expoPushToken;
        } else {
          throw new Error(response.message || 'Error al registrar token en el backend');
        }
      } catch (apiError) {
        // Si hay error de autenticación, no fallar, solo loggear
        if (apiError instanceof Error && apiError.message.includes('Token inválido')) {
          console.warn('⚠️ Token expirado, saltando registro de notificaciones');
          setState(prev => ({ ...prev, isLoading: false }));
          return null;
        }
        throw apiError;
      }

    } catch (error) {
      console.error('❌ Error al registrar notificaciones push:', error);
      
      // Manejar errores específicos de configuración de Expo
      if (error instanceof Error && error.message.includes('projectId')) {
        console.warn('⚠️ Error de configuración de projectId, continuando sin notificaciones push');
        setState(prev => ({
          ...prev,
          error: 'Configuración de notificaciones incompleta',
          isLoading: false,
        }));
        return null;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      return null;
    }
  }, []);

  // Función para eliminar el token de notificaciones
  const unregisterPushNotifications = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      console.log('📱 Eliminando token de notificaciones...');

      // Verificar si hay un token de autenticación válido
      const authToken = await apiClient.loadToken();
      if (!authToken) {
        console.warn('⚠️ No hay token de autenticación, limpiando estado local');
        setState(prev => ({
          ...prev,
          expoPushToken: null,
          isRegistered: false,
          isLoading: false,
        }));
        return true;
      }

      // Eliminar el token del backend
      try {
        const response = await apiClient.delete('/profile/push-token');

        if (response.success) {
          console.log('✅ Token eliminado exitosamente del backend');
          setState(prev => ({
            ...prev,
            expoPushToken: null,
            isRegistered: false,
            isLoading: false,
          }));
          return true;
        } else {
          throw new Error(response.message || 'Error al eliminar token del backend');
        }
      } catch (apiError) {
        // Si hay error de autenticación, limpiar estado local
        if (apiError instanceof Error && apiError.message.includes('Token inválido')) {
          console.warn('⚠️ Token expirado, limpiando estado local');
          setState(prev => ({
            ...prev,
            expoPushToken: null,
            isRegistered: false,
            isLoading: false,
          }));
          return true;
        }
        throw apiError;
      }

    } catch (error) {
      console.error('❌ Error al eliminar token de notificaciones:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      return false;
    }
  }, []);

  // --- Lógica de Listeners ---

  // Función para manejar la navegación basada en los datos de la notificación
  const handleNotificationNavigation = useCallback((data: NotificationData) => {
    console.log('🧭 Navegando basado en notificación:', data);

    try {
      switch (data.type) {
        case 'order_status_update':
          if (data.orderId) {
            console.log('📦 Navegando a detalle del pedido:', data.orderId);
            router.push(`/(customer)/orders/${data.orderId}` as any);
          } else {
            console.log('📋 Navegando a lista de pedidos');
            router.push('/(customer)/orders' as any);
          }
          break;

        case 'new_order':
          // Para administradores, navegar al panel de administración
          if (data.orderId) {
            console.log('🛒 Navegando a detalle del pedido en admin:', data.orderId);
            // TODO: Implementar navegación al panel de admin cuando esté disponible
            // router.push(`/admin/orders/${data.orderId}`);
          }
          break;

        default:
          console.log('📱 Notificación de tipo desconocido, navegando a inicio');
          router.push('/(customer)/catalog' as any);
          break;
      }
    } catch (error) {
      console.error('❌ Error al navegar desde notificación:', error);
      // Fallback: navegar a la pantalla principal
      router.push('/(customer)/catalog' as any);
    }
  }, []);

  useEffect(() => {
    console.log('🎧 Configurando listeners de notificaciones...');

    // Listener para notificaciones recibidas con la app abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notificación recibida con app abierta:', notification);
      // Aquí se podría mostrar una alerta o un toast in-app
    });

    // Listener para cuando el usuario toca una notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Usuario tocó notificación:', response);
      const rawData = response.notification.request.content.data as unknown;
      
      // Validar que los datos tienen la estructura esperada
      if (rawData && typeof rawData === 'object' && 'type' in rawData && 'timestamp' in rawData) {
        const data = rawData as NotificationData;
        handleNotificationNavigation(data);
      } else {
        console.warn('⚠️ Datos de notificación inválidos:', rawData);
      }
    });

    // Limpiar listeners al desmontar
    return () => {
      console.log('🧹 Limpiando listeners de notificaciones...');
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotificationNavigation]);

  const clearNotificationBadge = useCallback(async () => {
      try {
        await Notifications.setBadgeCountAsync(0);
        console.log('✅ Badge de notificaciones limpiado');
      } catch (error) {
        console.error('❌ Error al limpiar badge:', error);
      }
    }, []);

  const initializeNotifications = useCallback(async () => {
    console.log('🚀 Inicializando notificaciones push...');
    return await registerForPushNotificationsAsync();
  }, [registerForPushNotificationsAsync]);

  return {
    ...state,
    initializeNotifications,
    unregisterPushNotifications,
    clearNotificationBadge,
  };
};
