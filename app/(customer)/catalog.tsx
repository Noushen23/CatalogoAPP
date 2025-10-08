import * as React from 'react';
import { useState, useCallback, memo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useProducts, useProductSearch } from '@/presentation/products/hooks/useProducts';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { Product } from '@/core/api/productsApi';
import { CategorySelector } from '@/presentation/categories/components/CategorySelector';
import { useAddToCart } from '@/presentation/cart/hooks/useCart';
import { CartIndicator } from '@/presentation/cart/components/CartIndicator';
import { useToggleFavorite, useIsFavorite } from '@/presentation/favorites/hooks/useFavorites';

// Obtener dimensiones de pantalla para diseño responsive
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calcular dimensiones responsive
const getResponsiveDimensions = () => {
  const isSmallScreen = screenWidth < 360; // Pantallas pequeñas (iPhone SE, etc.)
  const isMediumScreen = screenWidth >= 360 && screenWidth < 414; // Pantallas medianas
  const isLargeScreen = screenWidth >= 414; // Pantallas grandes (iPhone Plus, etc.)
  const marginBetweenCards = isSmallScreen ? 8 : 12;
  return {
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    // Dimensiones de tarjetas de producto
    cardWidth: (screenWidth - 30 - marginBetweenCards) / 2, // 2 columnas con padding
    cardHeight: isSmallScreen ? 300 : isMediumScreen ? 320 : 350,
    imageHeight: isSmallScreen ? 120 : isMediumScreen ? 140 : 160,
    // Espaciado responsive
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingVertical: isSmallScreen ? 10 : 12,
    marginBetweenCards: isSmallScreen ? 8 : 12,
    // Texto responsive
    titleFontSize: isSmallScreen ? 14 : isMediumScreen ? 15 : 16,
    descriptionFontSize: isSmallScreen ? 12 : 13,
    priceFontSize: isSmallScreen ? 15 : isMediumScreen ? 16 : 17,
  };
};

/**
 * Componente de producto optimizado con React.memo
 * Solo se re-renderiza cuando las props del producto cambian
 */
const ProductItem = memo(({ product }: { product: Product }) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const addToCartMutation = useAddToCart();
  const toggleFavorite = useToggleFavorite();
  const { isFavorite, isLoading: isFavoriteLoading } = useIsFavorite(product.id);
  const responsiveDims = getResponsiveDimensions();

  const handleAddToCart = useCallback(async (e: any) => {
    e.stopPropagation(); // Evitar navegación al producto
    
    // Verificar que el producto tenga stock antes de intentar agregarlo
    if (product.stock === 0) {
      Alert.alert(
        '❌ Producto agotado',
        'Este producto no está disponible en este momento',
        [{ text: 'Entendido', style: 'default' }]
      );
      return;
    }
    
    try {
      await addToCartMutation.mutateAsync({
        productId: product.id,
        quantity: 1
      });
      
      Alert.alert(
        '✅ Agregado al carrito',
        `${product.nombre} agregado exitosamente`,
        [{ text: 'Continuar comprando', style: 'default' }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el producto al carrito');
    }
  }, [product.id, product.stock, product.nombre, addToCartMutation]);

  const handleToggleFavorite = useCallback(async (e: any) => {
    e.stopPropagation(); // Evitar navegación al producto
    
    try {
      toggleFavorite.toggle(product.id, isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [product.id, isFavorite, toggleFavorite]);

  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <TouchableOpacity
      style={[
        styles.productCard, 
        { 
          backgroundColor,
          width: responsiveDims.cardWidth,
          height: responsiveDims.cardHeight,
        }
      ]}
      onPress={() => router.push(`/(customer)/product/${product.id}` as any)}
    >
      <View style={[styles.productImage, { height: responsiveDims.imageHeight }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImageContent}
            resizeMode="cover"
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
              opacity: toggleFavorite.isPending || isFavoriteLoading ? 0.7 : 1,
            }
          ]}
          onPress={handleToggleFavorite}
          disabled={toggleFavorite.isPending || isFavoriteLoading}
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
        
        {/* Disponibilidad arriba del precio */}
        <View style={styles.stockInfo}>
          <Ionicons 
            name={product.stock > 0 ? "checkmark-circle" : "close-circle"} 
            size={responsiveDims.isSmallScreen ? 12 : 14} 
            color={product.stock > 0 ? "#4CAF50" : "#F44336"} 
          />
          <ThemedText 
            style={[
              styles.stockText,
              { 
                color: product.stock > 0 ? "#4CAF50" : "#F44336",
                fontSize: responsiveDims.isSmallScreen ? 10 : 11
              }
            ]}
            numberOfLines={1}
          >
            {product.stock > 0 ? `${product.stock} disp.` : 'Agotado'}
          </ThemedText>
        </View>
        
        {/* Precio abajo */}
        <View style={styles.priceContainer}>
          {product.enOferta && (
            <ThemedText style={[styles.originalPrice, { fontSize: responsiveDims.isSmallScreen ? 10 : 12 }]}>
              ${product.precio.toLocaleString()}
            </ThemedText>
          )}
          <ThemedText style={[styles.productPrice, { color: tintColor, fontSize: responsiveDims.priceFontSize }]}>
            ${product.precioFinal.toLocaleString()}
          </ThemedText>
        </View>
        
        {product.enOferta && (
          <View style={styles.offerBadge}>
            <ThemedText style={styles.offerText}>¡Oferta!</ThemedText>
          </View>
        )}

        {/* Botón agregar al carrito */}
        <TouchableOpacity
          style={[
            styles.addToCartButton, 
            { 
              backgroundColor: product.stock === 0 ? "#F44336" : tintColor,
              width: responsiveDims.isSmallScreen ? 28 : 32,
              height: responsiveDims.isSmallScreen ? 28 : 32,
              borderRadius: responsiveDims.isSmallScreen ? 14 : 16,
              opacity: product.stock === 0 ? 0.7 : 1,
            }
          ]}
          onPress={handleAddToCart}
          disabled={addToCartMutation.isPending || product.stock === 0}
          activeOpacity={product.stock === 0 ? 1 : 0.8}
        >
          {addToCartMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons 
              name={product.stock === 0 ? "close-circle" : "cart"} 
              size={responsiveDims.isSmallScreen ? 14 : 16} 
              color="white" 
            />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Comparación personalizada: solo re-renderizar si cambian las propiedades relevantes del producto
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.nombre === nextProps.product.nombre &&
    prevProps.product.precio === nextProps.product.precio &&
    prevProps.product.precioFinal === nextProps.product.precioFinal &&
    prevProps.product.stock === nextProps.product.stock &&
    prevProps.product.enOferta === nextProps.product.enOferta &&
    // Comparar imágenes: misma cantidad y misma primera imagen
    prevProps.product.images?.length === nextProps.product.images?.length &&
    prevProps.product.images?.[0] === nextProps.product.images?.[0]
  );
});

// Nombre del componente para debugging
ProductItem.displayName = 'ProductItem';

export default function CatalogScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = '#e0e0e0';
  const responsiveDims = getResponsiveDimensions();

  // Usar búsqueda si hay query, sino usar productos normales
  const searchQueryTrimmed = searchQuery.trim();
  const shouldSearch = searchQueryTrimmed.length > 0;

  const { 
    productsQuery, 
    loadNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useProducts({ 
    activo: true,
    categoriaId: selectedCategoryId || undefined
  });
  
  const { 
    data: searchData, 
    isLoading: isSearchLoading, 
    error: searchError 
  } = useProductSearch(searchQueryTrimmed, { 
    activo: true,
    categoriaId: selectedCategoryId || undefined
  });

  const products = shouldSearch 
    ? searchData?.products ?? []
    : productsQuery.data?.pages.flatMap((page) => page?.products ?? []) ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (shouldSearch) {
        // Refrescar búsqueda
        // La búsqueda se refresca automáticamente con React Query
      } else {
        // Refrescar productos normales
        await productsQuery.refetch();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la lista de productos');
    } finally {
      setRefreshing(false);
    }
  }, [shouldSearch, productsQuery]);

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    // Limpiar búsqueda cuando se cambia de categoría
    setSearchQuery('');
  }, []);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <ProductItem product={item} />
  ), []);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const isLoading = shouldSearch ? isSearchLoading : productsQuery.isLoading;
  const error = shouldSearch ? searchError : productsQuery.error;

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.loadingText}>Cargando productos...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <ThemedText style={styles.errorText}>
          Error al cargar productos
        </ThemedText>
        <ThemedText style={styles.errorSubtext}>
          {error instanceof Error ? error.message : 'Error desconocido'}
        </ThemedText>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header con búsqueda y carrito */}
      <View style={[styles.headerContainer, { paddingHorizontal: responsiveDims.paddingHorizontal }]}>
        {/* Barra de búsqueda */}
        <View style={[styles.searchContainer, { borderColor }]}>
          <Ionicons 
            name="search" 
            size={responsiveDims.isSmallScreen ? 18 : 20} 
            color="#999" 
            style={styles.searchIcon} 
          />
          <TextInput
            style={[styles.searchInput, { fontSize: responsiveDims.isSmallScreen ? 14 : 15 }]}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons 
                name="close-circle" 
                size={responsiveDims.isSmallScreen ? 18 : 20} 
                color="#999" 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Indicador del carrito */}
        <CartIndicator
          onPress={() => router.push('/(customer)/cart')}
          showText={false}
          size={responsiveDims.isSmallScreen ? "small" : "medium"}
        />
      </View>

      {/* Selector de categorías */}
      <View style={styles.categorySelectorContainer}>
        <CategorySelector
          selectedCategoryId={selectedCategoryId || undefined}
          onCategorySelect={handleCategorySelect}
          showAllOption={true}
        />
      </View>

      {/* Lista de productos */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={keyExtractor}
        numColumns={2}
        contentContainerStyle={[
          styles.productsList,
          { padding: responsiveDims.paddingHorizontal }
        ]}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => {
          if (!shouldSearch && hasNextPage && !isFetchingNextPage) {
            loadNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => {
          if (isFetchingNextPage) {
            return (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" />
                <ThemedText style={styles.loadingMoreText}>Cargando más...</ThemedText>
              </View>
            );
          }
          return null;
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={60} color="#ccc" />
            <ThemedText style={styles.emptyText}>
              {searchQuery 
                ? 'No se encontraron productos' 
                : selectedCategoryId 
                  ? 'No hay productos en esta categoría' 
                  : 'No hay productos disponibles'
              }
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 0,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 0, // <--- Quitar espacio vertical
  },
  searchIcon: {
    marginRight: 10,
    color: '#3b82f6',
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    paddingVertical: 0,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    backgroundColor: 'transparent',
  },
  categorySelectorContainer: {
    marginBottom: 0, // <--- Quitar espacio entre categorías y search
    backgroundColor: '#fff',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  productsList: {
    paddingTop: 8,
    paddingBottom: 20,
    // padding se define dinámicamente
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
    // width y height se definen dinámicamente
  },
  productImage: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    overflow: 'hidden',
    paddingHorizontal: 10,
    // height se define dinámicamente
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 22,
    color: '#1a1a1a',
    letterSpacing: 0.3,
    // fontSize se define dinámicamente
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  productDescription: {
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 16,
    letterSpacing: 0.3,
    // fontSize se define dinámicamente
  },
  productPrice: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    // fontSize se define dinámicamente
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 8,
    marginBottom: 0,
    alignSelf: 'flex-start',
  },
  stockText: {
    marginLeft: 4,
    fontWeight: '500',
    flexShrink: 1,
    // fontSize se define dinámicamente
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 0,
    marginBottom: 0,
    gap: 0,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 1,
  },
  offerBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  offerText: {
    fontSize: 9,
    color: 'white',
    fontWeight: 'bold',
  },
  addToCartButton: {
    position: 'absolute',
    top: -4,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});
