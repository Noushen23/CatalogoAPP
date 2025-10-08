import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Image,
  StyleSheet,
} from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';

import ThemedButton from '@/presentation/theme/components/ThemedButton';
import ThemedLink from '@/presentation/theme/components/ThemedLink';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import ThemedControlledInput from '@/presentation/theme/components/ThemedControlledInput';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { loginSchema, LoginFormData } from '@/core/auth/schemas/authSchemas';

const LoginScreen = () => {
  const { login, status, error, clearError, isAuthenticated } = useAuthStore();
  const backgroundColor = useThemeColor({}, 'background');

  // Configurar react-hook-form con validación de zod
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onLogin = async (data: LoginFormData) => {
    clearError(); // Limpiar errores previos
    
    console.log('🔐 Intentando login con:', data.email);
    const wasSuccessful = await login(data.email, data.password);
    console.log('🔍 Login result:', wasSuccessful);
    console.log('🔍 Auth status:', status);
    console.log('🔍 Auth error:', error);
    console.log('🔍 Is authenticated:', isAuthenticated);

    if (wasSuccessful) {
      console.log('✅ Login exitoso! Redirigiendo al catálogo...');
      Alert.alert('✅ Login Exitoso', 'Has iniciado sesión correctamente', [
        {
          text: 'Continuar',
          onPress: () => router.replace('/(customer)/catalog')
        }
      ]);
      return;
    }

    console.log('❌ Login falló. Error:', error);
    // El error se mostrará automáticamente desde el store
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        style={{
          paddingHorizontal: 40,
          backgroundColor: backgroundColor,
        }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo de la aplicación */}
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/elLogo-1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerContainer}>
          <ThemedText type="title">Bienvenido</ThemedText>
          <ThemedText style={styles.subtitle}>
            Ingresa a tu cuenta para continuar
          </ThemedText>
        </View>

        <View style={{ marginTop: 40 }}>
          <ThemedControlledInput
            control={control}
            name="email"
            placeholder="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
          />

          <ThemedControlledInput
            control={control}
            name="password"
            placeholder="Contraseña"
            secureTextEntry
            autoCapitalize="none"
            icon="lock-closed-outline"
          />
        </View>

        {/* Mostrar error si existe */}
        {error && (
          <View style={{ marginTop: 10, padding: 10, backgroundColor: '#ffebee', borderRadius: 5 }}>
            <ThemedText style={{ color: '#d32f2f', textAlign: 'center' }}>
              {error}
            </ThemedText>
          </View>
        )}

        <View style={{ marginTop: 20 }} />
        <ThemedButton
          icon="arrow-forward-outline"
          onPress={handleSubmit(onLogin)}
          disabled={isSubmitting || status === 'checking'}
        >
          {isSubmitting || status === 'checking' ? 'Ingresando...' : 'Ingresar'}
        </ThemedButton>

        <View style={{ marginTop: 70 }} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ThemedText>¿No tienes cuenta?</ThemedText>
          <ThemedLink href="/auth/register" style={{ marginHorizontal: 5 }} text="Crear cuenta" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default LoginScreen;
