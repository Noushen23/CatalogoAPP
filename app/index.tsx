import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';

export default function Index() {
  const { status, checkStatus } = useAuthStore();

  useEffect(() => {
    // Verificar estado de autenticación al cargar la app
    checkStatus();
  }, []);

  // Mostrar loading mientras se verifica la autenticación
  if (status === 'checking') {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 10 }}>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  // Si está autenticado, ir al catálogo
  if (status === 'authenticated') {
    return <Redirect href="/(customer)/catalog" />;
  }

  // Si no está autenticado, ir a selección de modo
  return <Redirect href="/mode-selection" />;
}
