import 'react-native-reanimated';
import 'react-native-gesture-handler';

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useColorScheme } from '@/presentation/theme/hooks/useColorScheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { usePushNotifications } from '@/presentation/notifications/hooks/useNotifications';

// Crear QueryClient fuera del componente para evitar recreación
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, 'background');

  // Estado de autenticación
  const { isAuthenticated, user } = useAuthStore();

  // Hook de notificaciones push
  const pushNotifications = usePushNotifications();

  const [loaded] = useFonts({
    KanitRegular: require('../assets/fonts/Kanit-Regular.ttf'),
    KanitBold: require('../assets/fonts/Kanit-Bold.ttf'),
    KanitThin: require('../assets/fonts/Kanit-Thin.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      try {
        SplashScreen.hideAsync();
      } catch {
        // no-op
      }
    }
  }, [loaded]);

  // Inicializar notificaciones cuando el usuario esté autenticado
  useEffect(() => {
    if (loaded && isAuthenticated && user && !pushNotifications.isRegistered && !pushNotifications.isLoading) {
      console.log('🚀 Usuario autenticado, inicializando notificaciones push...');
      pushNotifications.initializeNotifications().catch((error) => {
        console.error('❌ Error al inicializar notificaciones:', error);
        // No mostrar error al usuario, solo log
      });
    }
  }, [loaded, isAuthenticated, user, pushNotifications.isRegistered, pushNotifications.isLoading]);

  // Limpiar notificaciones cuando el usuario cierre sesión
  useEffect(() => {
    if (!isAuthenticated && pushNotifications.isRegistered) {
      console.log('🧹 Usuario cerró sesión, limpiando notificaciones...');
      pushNotifications.unregisterPushNotifications().catch((error) => {
        console.error('❌ Error al limpiar notificaciones:', error);
      });
    }
  }, [isAuthenticated, pushNotifications.isRegistered]);

  // Limpiar badge de notificaciones al abrir la app
  useEffect(() => {
    if (loaded) {
      pushNotifications.clearNotificationBadge();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack
            screenOptions={{ 
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
