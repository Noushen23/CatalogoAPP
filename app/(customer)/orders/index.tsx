import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { FullScreenLoader } from '@/presentation/theme/components/FullScreenLoader';
import { ErrorDisplay } from '@/presentation/theme/components/ErrorDisplay';
import { EmptyState } from '@/presentation/theme/components/EmptyState';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { OrderItem } from '@/presentation/orders/components/OrderItem';
import { useUserOrders } from '@/presentation/orders/hooks/useOrders';
import { OrderSimple } from '@/core/api/ordersApi';

export default function OrdersScreen() {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Hook para obtener pedidos con paginación infinita
  const {
    data,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useUserOrders({ limit: 20 });

  // Aplanar todos los pedidos de todas las páginas
  const allOrders = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.orders).filter(order => order !== undefined);
  }, [data?.pages]);

  // Función para cargar más pedidos
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Función para refrescar
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error al refrescar pedidos:', error);
    }
  }, [refetch]);

  // Función para navegar al detalle del pedido
  const handleOrderPress = useCallback((order: OrderSimple) => {
    router.push(`/(customer)/orders/${order.id}` as any);
  }, []);

  // Renderizar item de la lista
  const renderOrderItem = useCallback(({ item }: { item: OrderSimple }) => (
    <OrderItem
      order={item}
      onPress={(orderId: string) => handleOrderPress(item)}
    />
  ), [handleOrderPress]);

  // Renderizar footer con indicador de carga
  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={tintColor} />
        <ThemedText style={styles.loadingMoreText}>
          Cargando más pedidos...
        </ThemedText>
      </View>
    );
  }, [isFetchingNextPage, tintColor]);

  // Renderizar lista vacía
  const renderEmptyComponent = useCallback(() => (
    <EmptyState
      icon="bag-outline"
      title="No hay pedidos"
      description="Tus pedidos aparecerán aquí cuando realices una compra"
      actionText="Ver productos"
      actionIcon="storefront-outline"
      onAction={() => router.push('/(customer)/catalog' as any)}
    />
  ), []);

  // Mostrar error
  if (isError) {
    return (
      <ErrorDisplay
        title="Error al cargar pedidos"
        message="No se pudieron cargar los pedidos. Verifica tu conexión e intenta nuevamente."
        error={error}
        onRetry={handleRefresh}
      />
    );
  }

  // Mostrar loading inicial
  if (isLoading) {
    return <FullScreenLoader message="Cargando pedidos..." />;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Mis Pedidos</ThemedText>
        <View style={styles.headerRight}>
          {allOrders.length > 0 && (
            <ThemedText style={styles.orderCount}>
              {allOrders.length}
            </ThemedText>
          )}
        </View>
      </View>

      <FlatList
        data={allOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={tintColor}
            colors={[tintColor]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    minWidth: 24,
    alignItems: 'center',
  },
  orderCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
