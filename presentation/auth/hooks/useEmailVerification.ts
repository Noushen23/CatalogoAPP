import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailVerificationApi } from '@/core/api/emailVerificationApi';
import { useAuthStore } from '../store/useAuthStore';
import { Alert } from 'react-native';

/**
 * Query keys para verificación de email
 */
export const EMAIL_VERIFICATION_KEYS = {
  STATUS: ['email-verification', 'status'] as const,
};

/**
 * Hook para obtener estado de verificación
 */
export const useVerificationStatus = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: EMAIL_VERIFICATION_KEYS.STATUS,
    queryFn: async () => {
      const response = await emailVerificationApi.getVerificationStatus();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al obtener estado de verificación');
      }
      return response.data;
    },
    enabled: isAuthenticated, // Solo ejecutar si está autenticado
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
  });
};

/**
 * Hook para verificar email con código
 */
export const useVerifyEmail = () => {
  const queryClient = useQueryClient();
  const { user, checkStatus } = useAuthStore();

  return useMutation({
    mutationFn: async (code: string) => {
      console.log('🔐 Verificando código:', code);
      console.log('👤 Usuario:', user?.email);
      
      const response = await emailVerificationApi.verifyEmail(code);
      
      console.log('📥 Respuesta del backend:', response);
      
      if (!response.success) {
        console.log('❌ Error del backend:', response.message);
        throw new Error(response.message || 'Error al verificar email');
      }
      return response.data;
    },
    onSuccess: async (data) => {
      console.log('✅ Email verificado exitosamente');

      // Actualizar estado de verificación en cache
      queryClient.setQueryData(EMAIL_VERIFICATION_KEYS.STATUS, {
        emailVerificado: true,
        codigoEnviado: false,
      });

      // Actualizar usuario en el store
      await checkStatus();

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      Alert.alert(
        '🎉 ¡Email Verificado!',
        '¡Felicidades! Tu cuenta ha sido verificada exitosamente. Ya puedes realizar compras.',
        [{ text: 'Continuar', style: 'default' }]
      );
    },
    onError: (error: Error) => {
      console.error('❌ Error al verificar email:', error);
      
      let errorMessage = 'No se pudo verificar el código. Por favor, inténtalo de nuevo.';
      let buttonText = 'Entendido';
      let buttonAction: (() => void) | undefined = undefined;
      
      if (error.message.includes('Token inválido') || error.message.includes('expirado')) {
        errorMessage = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente para verificar tu email.';
        buttonText = 'Iniciar Sesión';
        buttonAction = () => {
          const { router } = require('expo-router');
          router.replace('/auth/login');
        };
      } else if (error.message.includes('incorrecto')) {
        errorMessage = 'El código ingresado es incorrecto. Verifica e intenta de nuevo.';
      } else if (error.message.includes('inválido')) {
        errorMessage = 'El código debe ser un número de 6 dígitos.';
      } else if (error.message.includes('ya está verificado')) {
        errorMessage = 'Tu email ya está verificado.';
      }

      Alert.alert('❌ Error de Verificación', errorMessage, [
        { 
          text: buttonText, 
          onPress: buttonAction,
        }
      ]);
    },
  });
};

/**
 * Hook para reenviar código de verificación
 */
export const useResendVerification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await emailVerificationApi.resendVerification();
      if (!response.success) {
        throw new Error(response.message || 'Error al reenviar código');
      }
      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Código reenviado a:', data?.email);

      // Actualizar estado en cache
      queryClient.setQueryData(EMAIL_VERIFICATION_KEYS.STATUS, (old: any) => ({
        ...old,
        codigoEnviado: true,
      }));

      Alert.alert(
        '📧 Código Reenviado',
        'Hemos enviado un nuevo código de verificación a tu email. Por favor revisa tu bandeja de entrada.',
        [{ text: 'Entendido' }]
      );
    },
    onError: (error: Error) => {
      console.error('❌ Error al reenviar código:', error);
      
      let errorMessage = 'No se pudo reenviar el código. Por favor, inténtalo de nuevo más tarde.';
      
      if (error.message.includes('ya está verificado')) {
        errorMessage = 'Tu email ya está verificado.';
      }

      Alert.alert('❌ Error', errorMessage, [{ text: 'Entendido' }]);
    },
  });
};

