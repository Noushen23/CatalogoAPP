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
import ThemedPicker from '@/presentation/theme/components/ThemedPicker';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { registerSchema, RegisterFormData } from '@/core/auth/schemas/authSchemas';

const RegisterScreen = () => {
  const { register, status, error, clearError } = useAuthStore();
  const backgroundColor = useThemeColor({}, 'background');

  // Configurar react-hook-form con validación de zod
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      email: '',
      password: '',
      telefono: '',
      tipoIdentificacion: undefined,
      numeroIdentificacion: '',
    },
  });

  const buildNombreCompleto = (data: RegisterFormData) =>
    [
      data.primerApellido,
      data.segundoApellido,
      data.nombre,
      data.segundoNombre,
    ]
      .map((value) => value?.trim())
      .filter((value) => value && value.length > 0)
      .join(' ');

  const onRegister = async (data: RegisterFormData) => {
    clearError(); // Limpiar errores previos

    const nombreCompleto = buildNombreCompleto(data);
    const wasSuccessful = await register(
      nombreCompleto,
      data.nombre,
      data.segundoNombre,
      data.primerApellido,
      data.segundoApellido,
      data.email, 
      data.password, 
      data.telefono || '',
      data.tipoIdentificacion,
      data.numeroIdentificacion || ''
    );

    if (wasSuccessful) {
      // Detectar si hubo advertencia de duplicado desde la respuesta del API
      // Nota: La advertencia se logueó en el store, aquí mostramos el mensaje estándar
      Alert.alert(
        '✅ Cuenta Creada',
        'Tu cuenta ha sido creada exitosamente. Te hemos enviado un código de verificación a tu email.',
        [
          {
            text: 'Verificar Email',
            onPress: () => router.replace('/auth/verify-email'),
            style: 'default',
          },
        ]
      );
      return;
    }

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
          <ThemedText type="title">Crear Cuenta</ThemedText>
          <ThemedText style={styles.subtitle}>
            Únete y descubre productos increíbles
          </ThemedText>
        </View>

        <View style={{ marginTop: 20 }}>
          <ThemedControlledInput
            control={control}
            name="nombre"
            placeholder="Nombre"
            autoCapitalize="words"
            icon="person-outline"
          />

          <ThemedControlledInput
            control={control}
            name="segundoNombre"
            placeholder="Segundo nombre"
            autoCapitalize="words"
            icon="person-outline"
          />

          <ThemedControlledInput
            control={control}
            name="primerApellido"
            placeholder="Primer apellido"
            autoCapitalize="words"
            icon="person-outline"
          />

          <ThemedControlledInput
            control={control}
            name="segundoApellido"
            placeholder="Segundo apellido"
            autoCapitalize="words"
            icon="person-outline"
          />

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
            name="telefono"
            placeholder="Teléfono"
            keyboardType="phone-pad"
            icon="call-outline"
          />

          {/* Campos de identificación */}
          <ThemedPicker
            control={control}
            name="tipoIdentificacion"
            icon="card-outline"
            items={[
              { label: 'Cédula de Ciudadanía', value: 'CC' },
              { label: 'NIT', value: 'NIT' },
              { label: 'Cédula de Extranjería', value: 'CE' },
              { label: 'Tarjeta de Identidad', value: 'TR' },
            ]}
          />

          <ThemedControlledInput
            control={control}
            name="numeroIdentificacion"
            placeholder="Número de identificación"
            keyboardType="default"
            autoCapitalize="none"
            icon="document-text-outline"
          />

          <ThemedControlledInput
            control={control}
            name="password"
            placeholder="Contraseña"
            secureTextEntry
            autoCapitalize="none"
            icon="lock-closed-outline"
          />

          <ThemedText style={{
            fontSize: 12,
            color: 'grey',
            marginTop: 5,
            marginLeft: 10,
            marginBottom: 10,
          }}>
            Mínimo 6 caracteres, 1 mayúscula, 1 minúscula y 1 número
          </ThemedText>
        </View>

        {/* Mostrar error si existe */}
        {error && (
          <View style={{ marginTop: 10, padding: 10, backgroundColor: '#ffebee', borderRadius: 5 }}>
            <ThemedText style={{ color: '#d32f2f', textAlign: 'center' }}>
              {error}
            </ThemedText>
          </View>
        )}

        <ThemedButton
          icon="arrow-forward-outline"
          onPress={handleSubmit(onRegister)}
          disabled={isSubmitting || status === 'checking'}
        >
          {isSubmitting || status === 'checking' ? 'Creando cuenta...' : 'Crear cuenta'}
        </ThemedButton>

        <View style={{ marginTop: 50 }} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ThemedText>¿Ya tienes cuenta?</ThemedText>
          <ThemedLink href="/auth/login" style={{ marginHorizontal: 5 }} text="Ingresar" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default RegisterScreen;
