import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Hook que maneja automáticamente la redirección al login
 * cuando el usuario se desloguea
 */
export const useAuthRedirect = () => {
  const { status } = useAuthStore();

  useEffect(() => {
    // Si el usuario no está autenticado y no está en proceso de verificación,
    // redirigir al login
    if (status === 'unauthenticated') {
      // Pequeño delay para evitar problemas de navegación
      const timeoutId = setTimeout(() => {
        router.replace('/auth/login');
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [status]);
};
