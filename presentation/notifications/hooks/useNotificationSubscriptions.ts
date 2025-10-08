import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/core/api/notificationsApi';
import { Alert } from 'react-native';

/**
 * Hook para gestionar suscripciones de notificaciones
 */
export const useNotificationSubscriptions = () => {
  const queryClient = useQueryClient();

  // Obtener todas las suscripciones del usuario
  const { data: subscriptions, isLoading, refetch } = useQuery({
    queryKey: ['userSubscriptions'],
    queryFn: notificationsApi.getUserSubscriptions,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Obtener historial de notificaciones
  const { data: history } = useQuery({
    queryKey: ['notificationHistory'],
    queryFn: () => notificationsApi.getNotificationHistory(20, 0),
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  return {
    subscriptions,
    history: history?.data,
    isLoading,
    refetch,
  };
};

/**
 * Hook para verificar y gestionar suscripciones de un producto específico
 */
export const useProductNotifications = (productId: string) => {
  const queryClient = useQueryClient();

  // Verificar estado de suscripción
  const { data: subscriptionStatus, isLoading } = useQuery({
    queryKey: ['productSubscription', productId],
    queryFn: () => notificationsApi.checkProductSubscription(productId),
    enabled: !!productId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });

  // Suscribirse a notificaciones de stock
  const subscribeToStockMutation = useMutation({
    mutationFn: () => notificationsApi.subscribeToStock(productId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['productSubscription', productId] });
      queryClient.invalidateQueries({ queryKey: ['userSubscriptions'] });
      
      Alert.alert(
        '✅ Suscripción activada',
        response.message || 'Te notificaremos cuando este producto esté disponible'
      );
    },
    onError: (error: any) => {
      Alert.alert(
        '❌ Error',
        error.message || 'No se pudo activar la notificación'
      );
    },
  });

  // Cancelar suscripción de stock
  const unsubscribeFromStockMutation = useMutation({
    mutationFn: () => notificationsApi.unsubscribeFromStock(productId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['productSubscription', productId] });
      queryClient.invalidateQueries({ queryKey: ['userSubscriptions'] });
      
      Alert.alert(
        '✅ Suscripción cancelada',
        response.message || 'Ya no recibirás notificaciones de este producto'
      );
    },
    onError: (error: any) => {
      Alert.alert(
        '❌ Error',
        error.message || 'No se pudo cancelar la notificación'
      );
    },
  });

  // Suscribirse a notificaciones de precio
  const subscribeToPriceMutation = useMutation({
    mutationFn: (targetPrice: number) => notificationsApi.subscribeToPrice(productId, targetPrice),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['productSubscription', productId] });
      queryClient.invalidateQueries({ queryKey: ['userSubscriptions'] });
      
      Alert.alert(
        '✅ Alerta de precio activada',
        response.message || 'Te notificaremos cuando baje el precio'
      );
    },
    onError: (error: any) => {
      Alert.alert(
        '❌ Error',
        error.message || 'No se pudo activar la alerta de precio'
      );
    },
  });

  // Cancelar suscripción de precio
  const unsubscribeFromPriceMutation = useMutation({
    mutationFn: () => notificationsApi.unsubscribeFromPrice(productId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['productSubscription', productId] });
      queryClient.invalidateQueries({ queryKey: ['userSubscriptions'] });
      
      Alert.alert(
        '✅ Alerta cancelada',
        response.message || 'Ya no recibirás alertas de precio'
      );
    },
    onError: (error: any) => {
      Alert.alert(
        '❌ Error',
        error.message || 'No se pudo cancelar la alerta'
      );
    },
  });

  return {
    subscriptionStatus,
    isLoading,
    subscribeToStock: subscribeToStockMutation.mutate,
    unsubscribeFromStock: unsubscribeFromStockMutation.mutate,
    subscribeToPrice: subscribeToPriceMutation.mutate,
    unsubscribeFromPrice: unsubscribeFromPriceMutation.mutate,
    isSubscribingToStock: subscribeToStockMutation.isPending,
    isUnsubscribingFromStock: unsubscribeFromStockMutation.isPending,
    isSubscribingToPrice: subscribeToPriceMutation.isPending,
    isUnsubscribingFromPrice: unsubscribeFromPriceMutation.isPending,
  };
};
