import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import ThemedButton from '@/presentation/theme/components/ThemedButton';
import ThemedLink from '@/presentation/theme/components/ThemedLink';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import ThemedPicker from '@/presentation/theme/components/ThemedPicker';
import ThemedControlledInput from '@/presentation/theme/components/ThemedControlledInput';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { authApi } from '@/core/api/authApi';

// Esquemas de validación
const forgotPasswordStep1Schema = z.object({
  tipoIdentificacion: z.enum(['CC', 'NIT', 'CE', 'TR'], {
    required_error: 'Debes seleccionar un tipo de documento',
  }),
  numeroIdentificacion: z.string().min(1, 'El número de documento es requerido'),
});

// Esquema básico - validaciones complejas se hacen manualmente
const forgotPasswordStep2Schema = z.object({
  code: z.string(),
  newPassword: z.string(),
  confirmPassword: z.string(),
});

type ForgotPasswordStep1FormData = z.infer<typeof forgotPasswordStep1Schema>;
type ForgotPasswordStep2FormData = z.infer<typeof forgotPasswordStep2Schema>;

const ForgotPasswordScreen = () => {
  const backgroundColor = useThemeColor({}, 'background');
  
  // Paso 1: Verificar documento
  const [step, setStep] = useState<'document' | 'reset'>('document');
  const [documentData, setDocumentData] = useState<{ tipoIdentificacion: string; numeroIdentificacion: string } | null>(null);

  // Form para paso 1 (documento)
  const step1Form = useForm<ForgotPasswordStep1FormData>({
    resolver: zodResolver(forgotPasswordStep1Schema),
    defaultValues: {
      tipoIdentificacion: undefined,
      numeroIdentificacion: '',
    },
  });

  // Form para paso 2 (código y contraseña) - Sin resolver para evitar conflictos
  const step2Form = useForm<ForgotPasswordStep2FormData>({
    mode: 'onSubmit', // Validar solo al enviar el formulario
    defaultValues: {
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Resetear el formulario cuando cambiamos al paso 2
  useEffect(() => {
    if (step === 'reset') {
      step2Form.reset({
        code: '',
        newPassword: '',
        confirmPassword: '',
      }, {
        keepErrors: false,
        keepDirty: false,
        keepIsSubmitted: false,
        keepTouched: false,
        keepIsValid: false,
        keepSubmitCount: false,
      });
    }
  }, [step]);

  const documentTypes = [
    { label: 'Cédula de Ciudadanía', value: 'CC' },
    { label: 'NIT', value: 'NIT' },
    { label: 'Cédula de Extranjería', value: 'CE' },
    { label: 'Tarjeta de Identidad', value: 'TR' },
  ];

  const handleRequestCode = async (data: ForgotPasswordStep1FormData) => {
    try {
      const response = await authApi.forgotPassword({
        tipoIdentificacion: data.tipoIdentificacion as 'CC' | 'NIT' | 'CE' | 'TR',
        numeroIdentificacion: data.numeroIdentificacion.trim(),
      });

      if (response.success) {
        // Guardar datos del documento para el paso 2
        setDocumentData({
          tipoIdentificacion: data.tipoIdentificacion,
          numeroIdentificacion: data.numeroIdentificacion.trim(),
        });
        
        Alert.alert(
          '✅ Código Enviado',
          'Si el documento existe en nuestro sistema, recibirás un código de recuperación en tu email.',
          [
            {
              text: 'Continuar',
              onPress: () => {
                step2Form.reset({
                  code: '',
                  newPassword: '',
                  confirmPassword: '',
                });
                setStep('reset');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Error al solicitar recuperación de contraseña');
      }
    } catch (error: any) {
      console.error('Error al solicitar recuperación:', error);
      Alert.alert('Error', error.message || 'Error al solicitar recuperación de contraseña');
    }
  };

  const handleResetPassword = async (data: ForgotPasswordStep2FormData) => {
    if (!documentData) {
      Alert.alert('Error', 'Error en los datos del documento');
      return;
    }

    // Validaciones manuales
    if (!data.code || data.code.trim().length !== 6) {
      step2Form.setError('code', { message: 'El código debe tener 6 dígitos' });
      return;
    }

    if (!data.newPassword || data.newPassword.trim().length < 6) {
      step2Form.setError('newPassword', { message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(data.newPassword)) {
      step2Form.setError('newPassword', { 
        message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número' 
      });
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      step2Form.setError('confirmPassword', { message: 'Las contraseñas no coinciden' });
      return;
    }

    // Limpiar errores si todo está bien
    step2Form.clearErrors();

    try {
      const response = await authApi.resetPassword({
        tipoIdentificacion: documentData.tipoIdentificacion as 'CC' | 'NIT' | 'CE' | 'TR',
        numeroIdentificacion: documentData.numeroIdentificacion,
        code: data.code.trim(),
        newPassword: data.newPassword.trim(),
      });

      if (response.success) {
        Alert.alert(
          '✅ Contraseña Restablecida',
          'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
          [
            {
              text: 'Ir a Login',
              onPress: () => router.replace('/auth/login'),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Error al restablecer contraseña');
      }
    } catch (error: any) {
      console.error('Error al restablecer contraseña:', error);
      Alert.alert('Error', error.message || 'Error al restablecer contraseña');
    }
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
          <ThemedText type="title">
            {step === 'document' ? 'Recuperar Contraseña' : 'Restablecer Contraseña'}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {step === 'document'
              ? 'Ingresa tu documento para recibir un código de recuperación'
              : 'Ingresa el código recibido y tu nueva contraseña'}
          </ThemedText>
        </View>

        {step === 'document' ? (
          // Paso 1: Verificar documento
          <View style={{ marginTop: 30 }}>
            <ThemedPicker
              control={step1Form.control}
              name="tipoIdentificacion"
              items={documentTypes}
              placeholder="Selecciona el tipo de documento"
              icon="card-outline"
            />

            <ThemedControlledInput
              control={step1Form.control}
              name="numeroIdentificacion"
              placeholder="Número de documento"
              keyboardType="default"
              autoCapitalize="none"
              icon="document-text-outline"
            />

            <View style={{ marginTop: 30 }} />
            <ThemedButton
              icon="mail-outline"
              onPress={step1Form.handleSubmit(handleRequestCode)}
              disabled={step1Form.formState.isSubmitting}
            >
              {step1Form.formState.isSubmitting ? 'Enviando...' : 'Enviar Código'}
            </ThemedButton>
          </View>
        ) : (
          // Paso 2: Código y nueva contraseña
          <View style={{ marginTop: 30 }} key="reset-form">
            <ThemedControlledInput
              control={step2Form.control}
              name="code"
              placeholder="Código de 6 dígitos"
              keyboardType="number-pad"
              maxLength={6}
              autoCapitalize="none"
              icon="keypad-outline"
              editable={!step2Form.formState.isSubmitting}
            />

            <Controller
              control={step2Form.control}
              name="newPassword"
              render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
                <View style={{ marginBottom: 10 }}>
                  <View style={[styles.passwordInputContainer, { borderColor: error ? '#F44336' : '#ddd' }]}>
                    <Ionicons name="lock-closed-outline" size={24} color={useThemeColor({}, 'text')} style={{ marginRight: 10 }} />
                    <TextInput
                      placeholder="Nueva contraseña"
                      placeholderTextColor="#5c5c5c"
                      secureTextEntry
                      autoCapitalize="none"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={value || ''}
                      editable={!step2Form.formState.isSubmitting}
                      style={[styles.passwordInput, { color: useThemeColor({}, 'text') }]}
                    />
                  </View>
                  {error && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginLeft: 4 }}>
                      <Ionicons name="alert-circle" size={14} color="#F44336" />
                      <ThemedText style={{ color: '#F44336', fontSize: 12, marginLeft: 4 }}>
                        {error.message}
                      </ThemedText>
                    </View>
                  )}
                </View>
              )}
            />
            <ThemedText style={styles.hint}>
              Mínimo 6 caracteres, debe incluir mayúscula, minúscula y número
            </ThemedText>

            <ThemedControlledInput
              control={step2Form.control}
              name="confirmPassword"
              placeholder="Confirma tu nueva contraseña"
              secureTextEntry={true}
              autoCapitalize="none"
              icon="lock-closed-outline"
              editable={!step2Form.formState.isSubmitting}
            />

            <View style={{ marginTop: 30 }} />
            <ThemedButton
              icon="checkmark-circle-outline"
              onPress={step2Form.handleSubmit(handleResetPassword)}
              disabled={step2Form.formState.isSubmitting}
            >
              {step2Form.formState.isSubmitting ? 'Restableciendo...' : 'Restablecer Contraseña'}
            </ThemedButton>

            <View style={{ marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  setStep('document');
                  step2Form.reset();
                  setDocumentData(null);
                }}
                disabled={step2Form.formState.isSubmitting}
                style={[
                  styles.backButton,
                  {
                    backgroundColor: backgroundColor,
                    borderColor: '#ddd',
                    opacity: step2Form.formState.isSubmitting ? 0.5 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <ThemedText style={{ color: '#666', fontWeight: '600' }}>Volver</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ marginTop: 30 }} />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ThemedText>¿Recordaste tu contraseña?</ThemedText>
          <ThemedLink href="/auth/login" style={{ marginHorizontal: 5 }} text="Iniciar sesión" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 80,
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
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
  },
});

export default ForgotPasswordScreen;
