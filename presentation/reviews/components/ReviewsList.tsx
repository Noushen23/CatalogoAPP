import React, { useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { ReviewCard } from './ReviewCard';
import { useProductReviews } from '../hooks/useReviews';
import { ReviewSimple } from '@/core/api/reviewsApi';

interface ReviewsListProps {
  productId: string;
  onWriteReview?: () => void;
  canWriteReview?: boolean;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({ 
  productId, 
  onWriteReview, 
  canWriteReview = false 
}) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  // Hook para obtener reseñas con paginación infinita
  const {
    data,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useProductReviews(productId, { limit: 10 });

  // Aplanar todas las reseñas de todas las páginas
  const allReviews = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.reviews);
  }, [data?.pages]);

  // Función para cargar más reseñas
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Renderizar item de la lista
  const renderReviewItem = useCallback((item: ReviewSimple, index: number) => (
    <View key={item.id}>
      <ReviewCard review={item} />
      {index < allReviews.length - 1 && <View style={styles.separator} />}
    </View>
  ), [allReviews.length]);

  // Renderizar footer con indicador de carga o botón cargar más
  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={tintColor} />
          <ThemedText style={styles.loadingMoreText}>
            Cargando más reseñas...
          </ThemedText>
        </View>
      );
    }
    
    if (hasNextPage) {
      return (
        <TouchableOpacity
          style={[styles.loadMoreButton, { borderColor: tintColor }]}
          onPress={handleLoadMore}
          activeOpacity={0.8}
        >
          <ThemedText style={[styles.loadingMoreText, { color: tintColor }]}>
            Cargar más reseñas
          </ThemedText>
        </TouchableOpacity>
      );
    }
    
    return null;
  }, [isFetchingNextPage, hasNextPage, tintColor, handleLoadMore]);

  // Renderizar lista vacía
  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="star-outline" size={48} color="#ccc" />
      <ThemedText style={styles.emptyTitle}>No hay reseñas</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Sé el primero en calificar este producto
      </ThemedText>
      {canWriteReview && onWriteReview && (
        <TouchableOpacity
          style={[styles.writeFirstReviewButton, { backgroundColor: tintColor }]}
          onPress={onWriteReview}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={16} color="white" />
          <ThemedText style={styles.writeFirstReviewText}>Escribir primera reseña</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  ), [canWriteReview, onWriteReview, tintColor]);

  // Mostrar error
  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
        <ThemedText style={styles.errorTitle}>Error</ThemedText>
        <ThemedText style={styles.errorText}>
          No se pudieron cargar las reseñas. Verifica tu conexión e intenta nuevamente.
        </ThemedText>
        <ThemedText style={styles.errorDetails}>
          {error?.message || 'Error desconocido'}
        </ThemedText>
      </View>
    );
  }

  // Mostrar loading inicial
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tintColor} />
        <ThemedText style={styles.loadingText}>Cargando reseñas...</ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Reseñas</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          {allReviews.length} {allReviews.length === 1 ? 'reseña' : 'reseñas'}
        </ThemedText>
      </View>

      <View style={styles.listContainer}>
        {allReviews.length === 0 ? (
          renderEmptyComponent()
        ) : (
          <>
            {allReviews.map((item, index) => renderReviewItem(item, index))}
            {renderFooter()}
          </>
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 20,
    flex: 1,
  },
  separator: {
    height: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
  loadMoreButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  writeFirstReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  writeFirstReviewText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  errorDetails: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
