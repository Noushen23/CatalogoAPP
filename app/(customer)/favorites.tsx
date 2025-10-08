import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { formatCurrency } from '@/presentation/utils';
import { useUserFavorites, useToggleFavorite, useIsFavorite } from '@/presentation/favorites/hooks/useFavorites';
import { Favorite } from '@/core/api/favoritesApi';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';

// Obtener dimensiones de pantalla para diseño responsive
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calcular dimensiones responsive
const getResponsiveDimensions = () => {
  const isSmallScreen = screenWidth < 375;
  const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
  
  return {
    isSmallScreen,
    isMediumScreen,
    numColumns: isSmallScreen ? 2 : 2,
    cardWidth: (screenWidth - 30 - (isSmallScreen ? 10 : 15)) / (isSmallScreen ? 2 : 2),
    cardHeight: isSmallScreen ? 280 : isMediumScreen ? 300 : 320,
    imageHeight: isSmallScreen ? 140 : isMediumScreen ? 150 : 160,
    titleFontSize: isSmallScreen ? 14 : isMediumScreen ? 15 : 16,
    descriptionFontSize: isSmallScreen ? 12 : 13,
    priceFontSize: isSmallScreen ? 15 : isMediumScreen ? 16 : 17,
  };
};

/**
 * Componente de producto favorito optimizado con React.memo
 * Solo se re-renderiza cuando las props del favorito cambian
 */
const FavoriteProductItem = memo(({ favorite }: { favorite: Favorite }) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const toggleFavorite = useToggleFavorite();
  const { isFavorite } = useIsFavorite(favorite.producto_id);
  const responsiveDims = getResponsiveDimensions();

  const handleToggleFavorite = useCallback(async (e: any) => {
    e.stopPropagation();
    
    try {
      toggleFavorite.toggle(favorite.producto_id, isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [favorite.producto_id, isFavorite, toggleFavorite]);

  const handleProductPress = useCallback(() => {
    router.push(`/(customer)/product/${favorite.producto_id}` as any);
  }, [favorite.producto_id]);

  // Si no hay detalles del producto, mostrar un mensaje de error
  if (!favorite.producto) {
    return (
      <View style={[styles.errorProductCard, { backgroundColor }]}>
        <ThemedText style={styles.errorText}>
          Error al cargar producto
        </ThemedText>
      </View>
    );
  }

  const product = favorite.producto as typeof favorite.producto & { images?: string[] };
  
  // Manejar imagen del producto de la misma forma que en catálogo
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <TouchableOpacity
      style={[
        styles.productCard, 
        {
          width: responsiveDims.cardWidth,
          height: responsiveDims.cardHeight,
          backgroundColor,
        }
      ]}
      onPress={handleProductPress}
    >
      <View style={[styles.productImage, { height: responsiveDims.imageHeight }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImageContent}
            resizeMode="cover"
            onError={(error) => {
              console.log('❌ Error loading favorite image:', imageUrl, error);
            }}
            onLoad={() => {
              console.log('✅ Favorite image loaded successfully:', imageUrl);
            }}
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons 
              name="image-outline" 
              size={responsiveDims.isSmallScreen ? 50 : responsiveDims.isMediumScreen ? 55 : 60} 
              color="#ccc" 
            />
            <ThemedText style={styles.noImageText}>Sin imagen</ThemedText>
          </View>
        )}
        
        {/* Ícono de favoritos */}
        <TouchableOpacity
          style={[
            styles.favoriteButton,
            { 
              backgroundColor: toggleFavorite.isPending ? '#f0f0f0' : '#fff',
              opacity: toggleFavorite.isPending ? 0.7 : 1,
            }
          ]}
          onPress={handleToggleFavorite}
          disabled={toggleFavorite.isPending}
          activeOpacity={0.8}
        >
          {toggleFavorite.isPending ? (
            <ActivityIndicator 
              size="small" 
              color="#FF6B6B" 
            />
          ) : (
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={responsiveDims.isSmallScreen ? 16 : 18} 
              color={isFavorite ? "#FF6B6B" : "#FF6B6B"} 
            />
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.productInfo}>
        <ThemedText 
          style={[styles.productTitle, { fontSize: responsiveDims.titleFontSize }]} 
          numberOfLines={2}
        >
          {product.nombre}
        </ThemedText>
        
        <ThemedText 
          style={[styles.productDescription, { fontSize: responsiveDims.descriptionFontSize }]} 
          numberOfLines={2}
        >
          {product.descripcion || 'Sin descripción'}
        </ThemedText>
        
        <View style={styles.priceContainer}>
          <ThemedText 
            style={[styles.productPrice, { fontSize: responsiveDims.priceFontSize }]}
          >
            {formatCurrency(product.precio_final)}
          </ThemedText>
          
          {product.precio_oferta && product.precio_oferta < product.precio && (
            <ThemedText style={styles.originalPrice}>
              {formatCurrency(product.precio)}
            </ThemedText>
          )}
        </View>
        
        <View style={styles.stockContainer}>
          <Ionicons 
            name={product.stock > 0 ? "checkmark-circle" : "close-circle"} 
            size={14} 
            color={product.stock > 0 ? "#4CAF50" : "#F44336"} 
          />
          <ThemedText 
            style={[
              styles.stockText,
              { color: product.stock > 0 ? "#4CAF50" : "#F44336" }
            ]}
          >
            {product.stock > 0 ? `Stock: ${product.stock}` : 'Agotado'}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada: solo re-renderizar si cambian las propiedades relevantes
  const prevProduct = prevProps.favorite.producto;
  const nextProduct = nextProps.favorite.producto;
  
  return (
    prevProps.favorite.id === nextProps.favorite.id &&
    prevProps.favorite.producto_id === nextProps.favorite.producto_id &&
    prevProduct?.nombre === nextProduct?.nombre &&
    prevProduct?.precio === nextProduct?.precio &&
    prevProduct?.precio_final === nextProduct?.precio_final &&
    prevProduct?.precio_oferta === nextProduct?.precio_oferta &&
    prevProduct?.stock === nextProduct?.stock &&
    // Comparar imágenes: misma cantidad y misma primera imagen
    prevProduct?.images?.length === nextProduct?.images?.length &&
    prevProduct?.images?.[0] === nextProduct?.images?.[0]
  );
});

// Nombre del componente para debugging
FavoriteProductItem.displayName = 'FavoriteProductItem';

// Componente para el estado vacío
const EmptyFavorites = memo(({ onExploreCatalog }: { onExploreCatalog: () => void }) => {
  const tintColor = useThemeColor({}, 'tint');
  
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={80} color="#ccc" />
        <View style={[styles.emptyIconBadge, { backgroundColor: tintColor + '20' }]}>
          <Ionicons name="heart" size={24} color={tintColor} />
        </View>
      </View>
      
      <ThemedText style={styles.emptyTitle}>¡No tienes favoritos aún!</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Explora nuestro catálogo y marca con ❤️ los productos que más te gusten.
        Podrás encontrarlos fácilmente aquí cuando quieras volver a verlos.
      </ThemedText>
      
      <TouchableOpacity
        style={[styles.exploreButton, { backgroundColor: tintColor }]}
        onPress={onExploreCatalog}
        activeOpacity={0.8}
      >
        <Ionicons name="storefront-outline" size={20} color="white" />
        <ThemedText style={styles.exploreButtonText}>Explorar Catálogo</ThemedText>
        <Ionicons name="arrow-forward" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );
});

EmptyFavorites.displayName = 'EmptyFavorites';

// Componente para el estado de error
const ErrorState = memo(({ onRetry, isTokenExpired }: { onRetry: () => void; isTokenExpired?: boolean }) => {
  const tintColor = useThemeColor({}, 'tint');
  
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#F44336" />
      </View>
      
      <ThemedText style={styles.errorTitle}>¡Ups! Algo salió mal</ThemedText>
      <ThemedText style={styles.errorSubtitle}>
        {isTokenExpired 
          ? 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente para ver tus favoritos.'
          : 'No pudimos cargar tus favoritos. Verifica tu conexión a internet e intenta de nuevo.'
        }
      </ThemedText>
      
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: tintColor }]}
        onPress={onRetry}
        activeOpacity={0.8}
      >
        <Ionicons name={isTokenExpired ? "log-in" : "refresh"} size={20} color="white" />
        <ThemedText style={styles.retryButtonText}>
          {isTokenExpired ? 'Iniciar Sesión' : 'Intentar de Nuevo'}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
});

ErrorState.displayName = 'ErrorState';

// Pantalla principal de favoritos
export default function FavoritesScreen() {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const [refreshing, setRefreshing] = useState(false);
  const { status, logout } = useAuthStore();
  
  // Obtener favoritos con detalles de productos
  const {
    data: favoritesData,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useUserFavorites({
    include_details: true,
    limit: 50, // Límite alto para mostrar todos los favoritos
  });

  // Detectar si el error es por token expirado
  const isTokenExpired = error?.message?.includes('Token inválido') || error?.message?.includes('expirado');

  // Manejar refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Navegar al catálogo
  const handleExploreCatalog = useCallback(() => {
    router.push('/(customer)/catalog' as any);
  }, []);

  // Reintentar carga
  const handleRetry = useCallback(() => {
    if (isTokenExpired) {
      // Si el token está expirado, redirigir al login
      logout();
      router.replace('/auth/login' as any);
    } else {
      refetch();
    }
  }, [isTokenExpired, logout, refetch]);

  // Redirigir al login si no está autenticado
  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login' as any);
    }
  }, [status]);

  // Obtener lista de favoritos
  const favorites = useMemo(() => {
    return favoritesData?.success && favoritesData.data ? favoritesData.data.favorites : [];
  }, [favoritesData]);

  // Renderizar item de la lista
  const renderFavoriteItem = useCallback(({ item }: { item: Favorite }) => (
    <FavoriteProductItem favorite={item} />
  ), []);

  // Obtener key para cada item
  const getItemKey = useCallback((item: Favorite) => item.id, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Mis Favoritos</ThemedText>
        <View style={styles.headerRight}>
          {favorites.length > 0 && (
            <ThemedText style={styles.favoriteCount}>
              {favorites.length}
            </ThemedText>
          )}
        </View>
      </View>


      {/* Contenido */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tintColor} />
            <ThemedText style={styles.loadingText}>Cargando tus favoritos...</ThemedText>
          </View>
        ) : error ? (
          <ErrorState onRetry={handleRetry} isTokenExpired={isTokenExpired} />
        ) : favorites.length === 0 ? (
          <EmptyFavorites onExploreCatalog={handleExploreCatalog} />
        ) : (
          <FlatList
            data={favorites}
            renderItem={renderFavoriteItem}
            keyExtractor={getItemKey}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={styles.row}
            refreshControl={
              <RefreshControl
                refreshing={refreshing || isRefetching}
                onRefresh={onRefresh}
                colors={[tintColor]}
                tintColor={tintColor}
              />
            }
            ListFooterComponent={() => (
              <View style={styles.footer}>
                <ThemedText style={styles.footerText}>
                  {favorites.length} {favorites.length === 1 ? 'producto' : 'productos'} en tus favoritos
                </ThemedText>
              </View>
            )}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  headerRight: {
    minWidth: 24,
    alignItems: 'center',
  },
  favoriteCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  productCard: {
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: '#fff',
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  productImage: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    overflow: 'hidden',
    paddingHorizontal: 10,
  },
  productImageContent: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
  },
  noImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  noImageText: {
    marginTop: 5,
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  productInfo: {
    padding: 12,
    flex: 1,
  },
  productTitle: {
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  productDescription: {
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  productPrice: {
    fontWeight: '700',
    color: '#2E7D32',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  errorProductCard: {
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  emptyIconBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    marginBottom: 30,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});
