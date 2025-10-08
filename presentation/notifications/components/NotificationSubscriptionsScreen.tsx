import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useNotificationSubscriptions } from '../hooks/useNotificationSubscriptions';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';

export const NotificationSubscriptionsScreen: React.FC = () => {
  const { subscriptions, isLoading, refetch } = useNotificationSubscriptions();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Cargando suscripciones...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const hasSubscriptions = (subscriptions?.stockAlerts.length ?? 0) > 0 || (subscriptions?.priceAlerts.length ?? 0) > 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Mis Notificaciones</ThemedText>
          <ThemedText style={styles.subtitle}>
            {subscriptions?.total || 0} {subscriptions?.total === 1 ? 'suscripción activa' : 'suscripciones activas'}
          </ThemedText>
        </View>

        {!hasSubscriptions ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#CCC" />
            <ThemedText style={styles.emptyTitle}>No tienes notificaciones activas</ThemedText>
            <ThemedText style={styles.emptyText}>
              Suscríbete a productos desde la pantalla de detalle para recibir alertas de stock y precio
            </ThemedText>
          </View>
        ) : (
          <>
            {/* Alertas de Stock */}
            {subscriptions && subscriptions.stockAlerts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="cube-outline" size={20} color="#007AFF" />
                  <ThemedText style={styles.sectionTitle}>Alertas de Stock</ThemedText>
                </View>

                {subscriptions.stockAlerts.map((alert) => (
                  <TouchableOpacity
                    key={alert.id}
                    style={styles.alertCard}
                    onPress={() => router.push(`/(customer)/product/${alert.productId}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.alertContent}>
                      <View style={styles.alertIcon}>
                        <Ionicons name="notifications" size={24} color="#007AFF" />
                      </View>
                      <View style={styles.alertInfo}>
                        <ThemedText style={styles.alertTitle}>{alert.productName}</ThemedText>
                        <ThemedText style={styles.alertSubtitle}>
                          Te notificaremos cuando haya stock
                        </ThemedText>
                        <View style={styles.alertMeta}>
                          <Ionicons name="pricetag-outline" size={14} color="#666" />
                          <ThemedText style={styles.alertMetaText}>
                            ${alert.currentPrice.toLocaleString()}
                          </ThemedText>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Alertas de Precio */}
            {subscriptions && subscriptions.priceAlerts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pricetag-outline" size={20} color="#FF9500" />
                  <ThemedText style={styles.sectionTitle}>Alertas de Precio</ThemedText>
                </View>

                {subscriptions.priceAlerts.map((alert) => (
                  <TouchableOpacity
                    key={alert.id}
                    style={styles.alertCard}
                    onPress={() => router.push(`/(customer)/product/${alert.productId}` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.alertContent}>
                      <View style={[styles.alertIcon, { backgroundColor: '#FFF3E0' }]}>
                        <Ionicons name="trending-down" size={24} color="#FF9500" />
                      </View>
                      <View style={styles.alertInfo}>
                        <ThemedText style={styles.alertTitle}>{alert.productName}</ThemedText>
                        <ThemedText style={styles.alertSubtitle}>
                          Alerta cuando baje a ${alert.targetPrice.toLocaleString()}
                        </ThemedText>
                        <View style={styles.priceComparison}>
                          <View style={styles.priceItem}>
                            <ThemedText style={styles.priceLabel}>Actual:</ThemedText>
                            <ThemedText style={styles.priceValue}>
                              ${alert.currentPrice.toLocaleString()}
                            </ThemedText>
                          </View>
                          <Ionicons name="arrow-forward" size={16} color="#666" />
                          <View style={styles.priceItem}>
                            <ThemedText style={styles.priceLabel}>Objetivo:</ThemedText>
                            <ThemedText style={[styles.priceValue, { color: '#4CAF50' }]}>
                              ${alert.targetPrice.toLocaleString()}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertMetaText: {
    fontSize: 12,
    color: '#666',
  },
  priceComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});
