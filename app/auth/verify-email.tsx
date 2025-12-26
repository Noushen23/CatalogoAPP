import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import {
  useVerifyEmail,
  useResendVerification,
  useVerificationStatus,
} from '@/presentation/auth/hooks/useEmailVerification';

const CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const { user, isAuthenticated } = useAuthStore();

  // Hooks de verificación
  const verifyEmailMutation = useVerifyEmail();
  const resendVerificationMutation = useResendVerification();
  const { data: verificationStatus, isLoading: isLoadingStatus } = useVerificationStatus();

  // Si no está autenticado, redirigir a login
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated]);

  // Si ya está verificado, redirigir
  useEffect(() => {
    if (verificationStatus?.emailVerificado) {
      router.replace('/(customer)/catalog');
    }
  }, [verificationStatus]);

  // Manejar cambio de texto en un input
  const handleChangeText = (text: string, index: number) => {
    // Solo permitir números
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length === 0) {
      // Borrar
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);
      
      // Mover al input anterior
      if (index > 0) {
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
        }, 50);
      }
    } else if (numericText.length === 1) {
      // Ingresar un dígito
      const newCode = [...code];
      newCode[index] = numericText;
      setCode(newCode);
      
      // Mover al siguiente input
      if (index < CODE_LENGTH - 1) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
        }, 50);
      } else {
        // Último input, quitar foco y cerrar teclado
        setTimeout(() => {
          inputRefs.current[index]?.blur();
          Keyboard.dismiss();
        }, 100);
      }
    } else if (numericText.length > 1) {
      // Pegar código completo
      const digits = numericText.slice(0, CODE_LENGTH).split('');
      const newCode = [...code];
      
      digits.forEach((digit, i) => {
        if (index + i < CODE_LENGTH) {
          newCode[index + i] = digit;
        }
      });
      
      setCode(newCode);
      
      // Mover al último input con contenido
      const lastIndex = Math.min(index + digits.length - 1, CODE_LENGTH - 1);
      setTimeout(() => {
        inputRefs.current[lastIndex]?.focus();
        if (lastIndex === CODE_LENGTH - 1) {
          setTimeout(() => {
            Keyboard.dismiss();
          }, 200);
        }
      }, 50);
    }
  };

  // Manejar tecla backspace
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      setTimeout(() => {
        inputRefs.current[index - 1]?.focus();
      }, 50);
    }
  };

  // Verificar código
  const handleVerify = async () => {
    const fullCode = code.join('');
    
    console.log('🔍 Código ingresado:', fullCode);
    console.log('🔍 Longitud del código:', fullCode.length);
    
    if (fullCode.length !== CODE_LENGTH) {
      console.log('❌ Código incompleto');
      return;
    }

    console.log('📤 Enviando código al backend...');
    verifyEmailMutation.mutate(fullCode);
  };

  // Reenviar código
  const handleResend = () => {
    resendVerificationMutation.mutate();
  };

  // Verificar si el código está completo
  const isCodeComplete = code.every(digit => digit !== '');
  const isLoading = verifyEmailMutation.isPending || isLoadingStatus;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Icono principal */}
          <View style={[styles.iconContainer, { backgroundColor: `${tintColor}20` }]}>
            <Ionicons name="mail-outline" size={64} color={tintColor} />
          </View>

          {/* Título */}
          <ThemedText style={styles.title}>Verifica tu Email</ThemedText>

          {/* Descripción */}
          <ThemedText style={styles.description}>
            Hemos enviado un código de verificación de 6 dígitos a
          </ThemedText>
          <ThemedText style={[styles.email, { color: tintColor }]}>
            {user?.email || 'tu email'}
          </ThemedText>

          {/* Inputs de código */}
          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.codeInput,
                  {
                    borderColor: focusedIndex === index ? tintColor : '#e0e0e0',
                    backgroundColor: digit ? `${tintColor}10` : backgroundColor,
                  },
                ]}
                value={digit}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => {
                  // Solo actualizar si no hay otro input enfocado
                  setTimeout(() => {
                    if (!inputRefs.current.some(ref => ref?.isFocused())) {
                      setFocusedIndex(-1);
                    }
                  }, 100);
                }}
                keyboardType="number-pad"
                maxLength={1}
                editable={!isLoading}
                returnKeyType={index === CODE_LENGTH - 1 ? 'done' : 'next'}
                blurOnSubmit={index === CODE_LENGTH - 1}
                contextMenuHidden={true}
              />
            ))}
          </View>

          {/* Botón de verificar */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              {
                backgroundColor: isCodeComplete && !isLoading ? tintColor : '#ccc',
              },
            ]}
            onPress={handleVerify}
            disabled={!isCodeComplete || isLoading}
            activeOpacity={0.8}
          >
            {verifyEmailMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                <ThemedText style={styles.verifyButtonText}>Verificar Código</ThemedText>
              </>
            )}
          </TouchableOpacity>

          {/* Reenviar código */}
          <View style={styles.resendContainer}>
            <ThemedText style={styles.resendText}>¿No recibiste el código?</ThemedText>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendVerificationMutation.isPending}
              activeOpacity={0.7}
            >
              {resendVerificationMutation.isPending ? (
                <ActivityIndicator size="small" color={tintColor} />
              ) : (
                <ThemedText style={[styles.resendLink, { color: tintColor }]}>
                  Reenviar código
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {/* Información adicional */}
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <ThemedText style={styles.infoText}>
                El código es válido por 24 horas
              </ThemedText>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#666" />
              <ThemedText style={styles.infoText}>
                Revisa tu carpeta de spam si no lo encuentras
              </ThemedText>
            </View>
          </View>

          {/* Botón para omitir (temporal) */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.replace('/(customer)/catalog')}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.skipButtonText}>
              Verificar más tarde
            </ThemedText>
          </TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 40,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    gap: 6,
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'underline',
  },
});

