import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { ProfileStats as ProfileStatsType } from '@/core/api/profileApi';
import { formatCurrency } from '@/presentation/utils';

interface ProfileStatsProps {
  stats: ProfileStatsType;
}

// Componente optimizado para cada item de estadística
const StatItem = React.memo<{
  icon: string;
  title: string;
  value: string;
  color: string;
}>(({ icon, title, value, color }) => (
  <View style={styles.statItem}>
    <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon as any} size={24} color={color} />
    </View>
    <ThemedText style={styles.statValue}>{value}</ThemedText>
    <ThemedText style={styles.statTitle}>{title}</ThemedText>
  </View>
));

StatItem.displayName = 'StatItem';

export const ProfileStats: React.FC<ProfileStatsProps> = React.memo(({ stats }) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Memoizar items de estadísticas para evitar recálculos
  const statsItems = React.useMemo(() => [
    {
      icon: 'bag-outline' as const,
      title: 'Pedidos Totales',
      value: stats.totalOrders.toString(),
      color: '#4CAF50',
    },
    {
      icon: 'heart-outline' as const,
      title: 'Productos Favoritos',
      value: stats.favoriteProducts.toString(),
      color: '#FF9800',
    },
    {
      icon: 'cash-outline' as const,
      title: 'Total Gastado',
      value: formatCurrency(stats.totalSpent),
      color: '#2196F3',
    },
    {
      icon: 'star-outline' as const,
      title: 'Reseñas',
      value: stats.totalReviews.toString(),
      color: '#9C27B0',
    },
  ], [stats.totalOrders, stats.favoriteProducts, stats.totalSpent, stats.totalReviews]);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedText style={styles.title}>Estadísticas</ThemedText>
      
      <View style={styles.statsGrid}>
        {statsItems.map((item, index) => (
          <StatItem
            key={`${item.title}-${index}`}
            icon={item.icon}
            title={item.title}
            value={item.value}
            color={item.color}
          />
        ))}
      </View>
    </ThemedView>
  );
});

ProfileStats.displayName = 'ProfileStats';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});