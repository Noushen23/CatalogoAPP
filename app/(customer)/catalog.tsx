import * as React from 'react';
import { useState, useCallback, memo } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useProducts, useProductSearch } from '@/presentation/products/hooks/useProducts';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { Product } from '@/core/api/productsApi';
import { CategorySelector } from '@/presentation/categories/components/CategorySelector';
import { CategoryDropdown } from '@/presentation/categories/components/CategoryDropdown';
import { useAddToCart } from '@/presentation/cart/hooks/useCart';
import { CartIndicator } from '@/presentation/cart/components/CartIndicator';
import { useToggleFavorite, useIsFavorite } from '@/presentation/favorites/hooks/useFavorites';
import { FilterModal, ProductFilters } from '@/presentation/products/components/FilterModal';
import { SearchHistory } from '@/presentation/products/components/SearchHistory';
import { useSearch } from '@/presentation/products/hooks/useFilters';
import { useCategories } from '@/presentation/categories/hooks/useCategories';
import { catalogStyles as styles } from '@/presentation/theme/styles/catalog.styles';

// Responsive helpers
const { width: screenWidth } = Dimensions.get('window');

const getResponsiveDimensions = () => {
  const isSmallScreen = screenWidth < 385; // Mejor umbral para modern phones
  const isMediumScreen = screenWidth >= 385 && screenWidth < 414;
  const isLargeScreen = screenWidth >= 414;
  const marginBetweenCards = isSmallScreen ? 7 : isMediumScreen ? 11 : 15;
  return {
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    cardWidth: (screenWidth - 2 * (isSmallScreen ? 10 : 16) - marginBetweenCards) / 2,
    cardHeight: isSmallScreen ? 293 : isMediumScreen ? 325 : 365,
    imageHeight: isSmallScreen ? 120 : isMediumScreen ? 145 : 175,
    paddingHorizontal: isSmallScreen ? 10 : 16,
    paddingVertical: isSmallScreen ? 8 : 12,
    marginBetweenCards,
    titleFontSize: isSmallScreen ? 15 : isMediumScreen ? 16 : 17,
    descriptionFontSize: isSmallScreen ? 12 : 13,
    priceFontSize: isSmallScreen ? 15 : isMediumScreen ? 17 : 18,
  };
};

// Visual Product Card con estilos mejorados
const ProductItem = memo(({ product }: { product: Product }) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const addToCartMutation = useAddToCart();
  const toggleFavorite = useToggleFavorite();
  const { isFavorite, isLoading: isFavoriteLoading } = useIsFavorite(product.id);
  const responsiveDims = getResponsiveDimensions();

  const handleAddToCart = useCallback(async (e: any) => {
    e.stopPropagation();
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
    e.stopPropagation();
    try {
      toggleFavorite.toggle(product.id, isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [product.id, isFavorite, toggleFavorite]);

  // Debug: Log de imágenes del producto en catálogo
  React.useEffect(() => {
    console.log('🖼️ [Catalog] Imágenes del producto:', {
      productoId: product.id,
      nombre: product.nombre,
      tieneImages: !!product.images,
      tieneImagenes: !!product.imagenes,
      imagesLength: product.images?.length || 0,
      imagenesLength: product.imagenes?.length || 0,
      images: product.images,
      imagenes: product.imagenes,
      primerImage: product.images?.[0],
      primerImagen: product.imagenes?.[0]
    });
  }, [product.id, product.images, product.imagenes]);

  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;

  // Validar URL de imagen antes de renderizar
  const isValidImageUrl = (url: string | null): boolean => {
    if (!url || typeof url !== 'string') {
      console.warn('⚠️ [Catalog] URL inválida (no string):', { url, type: typeof url });
      return false;
    }
    
    const trimmedUrl = url.trim();
    if (trimmedUrl === '') {
      console.warn('⚠️ [Catalog] URL vacía después de trim');
      return false;
    }
    
    try {
      new URL(trimmedUrl);
      return true;
    } catch (error) {
      console.warn('⚠️ [Catalog] URL malformada:', { url: trimmedUrl, error });
      return false;
    }
  };

  const shouldShowImage = isValidImageUrl(imageUrl);
  
  if (!shouldShowImage && imageUrl) {
    console.warn('⚠️ [Catalog] No se mostrará imagen para producto:', {
      productoId: product.id,
      imageUrl,
      reason: !imageUrl ? 'URL null' : typeof imageUrl !== 'string' ? 'No es string' : 'URL inválida'
    });
  }

  return (
    <TouchableOpacity
      style={[
        styles.productCard,
        {
          backgroundColor,
          width: responsiveDims.cardWidth,
          height: responsiveDims.cardHeight,
          shadowColor: '#2d4665',
          shadowOpacity: Platform.OS === 'ios' ? 0.15 : 0.21,
          shadowRadius: 8,
          elevation: isFavorite ? 6 : 4,
          borderColor: isFavorite ? '#3b82f6' : '#f2f2f2'
        }
      ]}
      onPress={() => router.push(`/(customer)/product/${product.id}` as any)}
      activeOpacity={0.93}
    >
      <View style={[
        styles.productImage,
        {
          height: responsiveDims.imageHeight,
          marginBottom: 12,
          backgroundColor: '#eceffc',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          overflow: 'hidden'
        }
      ]}>
        {shouldShowImage ? (
          <Image
            source={{ uri: imageUrl!.trim() }}
            style={styles.productImageContent}
            resizeMode="cover"
            onError={(error) => {
              console.warn('⚠️ Error cargando imagen:', imageUrl, error.nativeEvent.error);
            }}
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons
              name="image-outline"
              size={responsiveDims.isSmallScreen ? 54 : responsiveDims.isMediumScreen ? 58 : 62}
              color="#ced3de"
              style={{ marginBottom: 3 }}
            />
            <ThemedText style={styles.noImageText}>Sin imagen</ThemedText>
          </View>
        )}

        {/* Badge de Oferta */}
        {product.enOferta && (
          <View style={styles.offerBadge}>
            <ThemedText style={styles.offerText}>Oferta</ThemedText>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.favoriteButton,
            {
              backgroundColor: toggleFavorite.isPending ? '#eaeffc' : '#fff',
              borderColor: isFavorite ? "#3b82f6" : "#eee",
              opacity: toggleFavorite.isPending || isFavoriteLoading ? 0.8 : 1,
              shadowColor: '#3b82f6',
              top: 12,
              right: 12
            }
          ]}
          onPress={handleToggleFavorite}
          disabled={toggleFavorite.isPending || isFavoriteLoading}
          activeOpacity={0.83}
        >
          {toggleFavorite.isPending ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={responsiveDims.isSmallScreen ? 20 : 22}
              color={isFavorite ? "#f43f5e" : "#97a8c7"}
              style={{}}
            />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.productInfo}>
        <ThemedText
          style={[styles.productTitle, {
            fontSize: responsiveDims.titleFontSize,
            marginBottom: 1,
            color: '#19233b'
          }]}
          numberOfLines={2}
        >
          {product.nombre}
        </ThemedText>

        <ThemedText
          style={[styles.productDescription, {
            fontSize: responsiveDims.descriptionFontSize,
            color: '#8391a7',
            marginBottom: 7,
            minHeight: 30
          }]}
          numberOfLines={2}
        >
          {product.descripcion || 'Sin descripción'}
        </ThemedText>

        <View style={styles.stockInfo}>
          <Ionicons
            name={product.stock > 0 ? "checkmark-circle" : "close-circle"}
            size={responsiveDims.isSmallScreen ? 14 : 17}
            color={product.stock > 0 ? "#4CAF50" : "#F44336"}
            style={{ marginLeft: 0, marginRight: 2 }}
          />
          <ThemedText
            style={[
              styles.stockText,
              {
                color: product.stock > 0 ? "#4CAF50" : "#F44336",
                fontSize: responsiveDims.isSmallScreen ? 10 : 12,
                fontWeight: '600',
              }
            ]}
            numberOfLines={1}
          >
            {product.stock > 0 ? `${product.stock} disp.` : 'Agotado'}
          </ThemedText>
        </View>

        <View style={styles.priceContainer}>
          {product.enOferta && product.precio != null && (
            <ThemedText style={[
              styles.originalPrice,
              {
                fontSize: responsiveDims.isSmallScreen ? 10 : 13,
                marginBottom: 0,
                color: '#b3bedc'
              }
            ]}>
              ${product.precio.toLocaleString()}
            </ThemedText>
          )}
          <ThemedText style={[
            styles.productPrice,
            {
              color: product.enOferta ? '#ef4444' : tintColor,
              fontSize: responsiveDims.priceFontSize + (product.enOferta ? 2 : 0),
              fontWeight: '700'
            }
          ]}>
            ${(product.precioFinal || product.precio || 0).toLocaleString()}
          </ThemedText>
        </View>

        <TouchableOpacity
          style={[
            styles.addToCartButton,
            {
              backgroundColor: product.stock === 0 ? "#F44336" : '#2e8fea',
              width: responsiveDims.isSmallScreen ? 32 : 36,
              height: responsiveDims.isSmallScreen ? 32 : 36,
              borderRadius: responsiveDims.isSmallScreen ? 16 : 18,
              bottom: 12,
              right: 12,
              shadowColor: '#3b82f6',
              shadowRadius: 4,
              shadowOpacity: 0.12,
              opacity: product.stock === 0 ? 0.6 : 1,
            }
          ]}
          onPress={handleAddToCart}
          disabled={addToCartMutation.isPending || product.stock === 0}
          activeOpacity={product.stock === 0 ? 1 : 0.86}
        >
          {addToCartMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons
              name={product.stock === 0 ? "close-circle" : "cart"}
              size={responsiveDims.isSmallScreen ? 18 : 20}
              color="white"
            />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => (
  prevProps.product.id === nextProps.product.id &&
  prevProps.product.nombre === nextProps.product.nombre &&
  prevProps.product.precio === nextProps.product.precio &&
  prevProps.product.precioFinal === nextProps.product.precioFinal &&
  prevProps.product.stock === nextProps.product.stock &&
  prevProps.product.enOferta === nextProps.product.enOferta &&
  prevProps.product.images?.length === nextProps.product.images?.length &&
  prevProps.product.images?.[0] === nextProps.product.images?.[0]
));
ProductItem.displayName = 'ProductItem';

export default function CatalogScreen() {
 const [searchQuery, setSearchQuery] = useState(''); // Estado del input (lo que el usuario escribe)
  const [searchTerm, setSearchTerm] = useState(''); // Término de búsqueda efectivo (se usa para buscar)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({ sortBy: 'recientes' });
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = '#e1e6f0';
  const responsiveDims = getResponsiveDimensions();
  const categoriesQuery = useCategories();
  const { saveSearch } = useSearch();

  const searchTermTrimmed = searchTerm.trim();
  const shouldSearch = searchTermTrimmed.length > 0;

  React.useEffect(() => {
    let count = 0;
    if (filters.precioMin || filters.precioMax) count++;
    if (filters.calificacionMin) count++;
    if (filters.enOferta) count++;
    if (filters.sortBy && filters.sortBy !== 'recientes') count++;
    setActiveFiltersCount(count);
  }, [filters]);

  const {
    productsQuery,
    loadNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useProducts({
    activo: true,
    esServicio: false, // Excluir servicios del catálogo (solo productos)
    categoriaId: filters.categoriaId || selectedCategoryId || undefined,
    precioMin: filters.precioMin,
    precioMax: filters.precioMax,
    calificacionMin: filters.calificacionMin,
    enOferta: filters.enOferta,
    sortBy: filters.sortBy,
  });

  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
    refetch: refetchSearch
  } = useProductSearch(searchTermTrimmed, {
    activo: true,
    esServicio: false, // Excluir servicios del catálogo (solo productos)
    categoriaId: filters.categoriaId || selectedCategoryId || undefined,
    precioMin: filters.precioMin,
    precioMax: filters.precioMax,
    calificacionMin: filters.calificacionMin,
    enOferta: filters.enOferta,
    sortBy: filters.sortBy,
  });

  const productsRaw = shouldSearch
    ? searchData?.products ?? []
    : productsQuery.data?.pages.flatMap((page) => page?.products ?? []) ?? [];

  const products = React.useMemo(() => {
    const uniqueProducts = new Map();
    productsRaw.forEach(product => {
      if (product && product.id && !uniqueProducts.has(product.id)) {
        uniqueProducts.set(product.id, product);
      }
    });
    return Array.from(uniqueProducts.values());
  }, [productsRaw]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (shouldSearch) {
        // Refrescar búsqueda si hay una búsqueda activa
        await refetchSearch();
      } else {
        await productsQuery.refetch();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la lista de productos');
    } finally {
      setRefreshing(false);
    }
  }, [shouldSearch, productsQuery, refetchSearch]);

  // Función para ejecutar la búsqueda
  const handleSearch = useCallback(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    
    // Detectar si el usuario busca productos en oferta
    const ofertaKeywords = ['oferta', 'ofertas', 'en oferta', 'productos en oferta', 'producto en oferta', 'descuento', 'descuentos', 'rebaja', 'rebajas'];
    const isSearchingOfertas = ofertaKeywords.some(keyword => trimmed.includes(keyword));
    
    // Si detecta búsqueda de ofertas, aplicar el filtro automáticamente
    if (isSearchingOfertas) {
      setFilters(prev => ({ ...prev, enOferta: true }));
      // Limpiar el término de búsqueda de las palabras clave de ofertas
      let cleanSearchTerm = trimmed;
      ofertaKeywords.forEach(keyword => {
        cleanSearchTerm = cleanSearchTerm.replace(new RegExp(keyword, 'gi'), '').trim();
      });
      // Si queda algo después de limpiar, buscar por eso también
      setSearchTerm(cleanSearchTerm.length > 0 ? cleanSearchTerm : '');
    } else {
      setSearchTerm(trimmed);
    }
  }, [searchQuery]);

  // Función para limpiar la búsqueda
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchTerm('');
    // Limpiar también el filtro de ofertas si fue aplicado automáticamente
    setFilters(prev => {
      const newFilters = { ...prev };
      if (newFilters.enOferta) {
        delete newFilters.enOferta;
      }
      return newFilters;
    });
  }, []);

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setFilters(prev => ({ ...prev, categoriaId: categoryId || undefined }));
    setSearchQuery('');
    setSearchTerm('');
  }, []);

  const handleApplyFilters = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters);
    if (newFilters.categoriaId) {
      setSelectedCategoryId(newFilters.categoriaId);
    }
  }, []);

  const handleSearchFromHistory = useCallback((termino: string) => {
    setSearchQuery(termino);
    setSearchTerm(termino); // Buscar inmediatamente cuando se selecciona del historial
  }, []);

  React.useEffect(() => {
    if (searchTermTrimmed.length > 0 && searchData) {
      const timer = setTimeout(() => {
        const totalResults = searchData.products?.length || 0;
        saveSearch({
          termino: searchTermTrimmed,
          filtros: filters,
          resultados: totalResults
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [searchTermTrimmed, searchData, filters, saveSearch]);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <ProductItem product={item} />
  ), []);

  const keyExtractor = useCallback((item: Product, index: number) => {
    return item?.id ? `product-${item.id}` : `product-index-${index}`;
  }, []);

  const isLoading = shouldSearch ? isSearchLoading : productsQuery.isLoading;
  const error = shouldSearch ? searchError : productsQuery.error;

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <ThemedText style={styles.loadingText}>Cargando productos...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={62} color="#ef4444" />
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
      {/* Header Search/Carrito */}
      <View style={[
        styles.headerContainer,
        {
          paddingHorizontal: responsiveDims.paddingHorizontal,
          backgroundColor: '#f8f9fb',
          borderBottomWidth: 1,
          borderBottomColor: '#e5eaf2'
        }
      ]}>
        {/* Searchbar */}
        <View style={[
          styles.searchContainer,
          {
            borderColor,
            shadowColor: '#006AFF',
            borderWidth: 1,
            backgroundColor: '#f1f5fa',
          }
        ]}>
          <Ionicons
            name="search"
            size={responsiveDims.isSmallScreen ? 19 : 21}
            color="#5e7eb6"
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                fontSize: responsiveDims.isSmallScreen ? 14 : 16,
                color: '#202a45',
                minHeight: 41,
                letterSpacing: 0.1,
                fontWeight: '500'
              }
            ]}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            placeholderTextColor="#9ca5b2"
            returnKeyType="search"
            underlineColorAndroid="transparent"
          />
          {searchQuery.length > 0 && (
            <>
              <TouchableOpacity onPress={handleClearSearch} style={{ marginLeft: 3, padding: 4 }}>
                <Ionicons
                  name="close-circle"
                  size={responsiveDims.isSmallScreen ? 18 : 20}
                  color="#cbced6"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSearch} 
                style={{ marginLeft: 6, padding: 4 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="search"
                  size={responsiveDims.isSmallScreen ? 20 : 22}
                  color="#3b82f6"
                />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Filtro + badge */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={26} color="#4464b0" />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <ThemedText style={styles.filterBadgeText}>{activeFiltersCount}</ThemedText>
            </View>
          )}
        </TouchableOpacity>

        {/* Cart icon */}
        <CartIndicator
          onPress={() => router.push('/(customer)/cart')}
          showText={false}
          size={responsiveDims.isSmallScreen ? "small" : "medium"}
        />
      </View>

      {/* Search history */}
      {!shouldSearch && searchQuery.length === 0 && searchTerm.length === 0 && (
        <SearchHistory onSelectSearch={handleSearchFromHistory} />
      )}

      {/* Categorías - Usar dropdown si hay muchas categorías */}
      <View style={styles.categorySelectorContainer}>
        {categoriesQuery.data?.categories && categoriesQuery.data.categories.length > 5 ? (
          <CategoryDropdown
            selectedCategoryId={selectedCategoryId || undefined}
            onCategorySelect={handleCategorySelect}
            showAllOption={true}
          />
        ) : (
          <CategorySelector
            selectedCategoryId={selectedCategoryId || undefined}
            onCategorySelect={handleCategorySelect}
            showAllOption={true}
          />
        )}
      </View>

      {/* Filtros activos */}
      {activeFiltersCount > 0 && (
        <View style={styles.activeFiltersContainer}>
          <View style={styles.activeFiltersContent}>
            <Ionicons name="funnel" size={16} color="#2563eb" />
            <ThemedText style={styles.activeFiltersText}>
              {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro activo' : 'filtros activos'}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={() => {
              setFilters({ sortBy: 'recientes' });
              setSelectedCategoryId(null);
            }}
          >
            <ThemedText style={styles.clearFiltersButton}>Limpiar</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Product Grid */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={keyExtractor}
        numColumns={2}
        contentContainerStyle={[
          styles.productsList,
          { padding: responsiveDims.paddingHorizontal, backgroundColor: "#f9fafb" }
        ]}
        columnWrapperStyle={{
          justifyContent: 'space-between',
          paddingBottom: responsiveDims.marginBetweenCards,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (!shouldSearch && hasNextPage && !isFetchingNextPage) {
            loadNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        ListFooterComponent={() => {
          if (isFetchingNextPage) {
            return (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <ThemedText style={styles.loadingMoreText}>Cargando más...</ThemedText>
              </View>
            );
          }
          return null;
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={66} color="#bfc8de" />
            <ThemedText style={styles.emptyText}>
              {shouldSearch
                ? 'No se encontraron productos'
                : selectedCategoryId
                  ? 'No hay productos en esta categoría'
                  : 'No hay productos disponibles'
              }
            </ThemedText>
          </View>
        }
      />

      {/* Modal de filtros */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        currentFilters={filters}
        onApplyFilters={handleApplyFilters}
        categories={categoriesQuery.data?.categories || []}
      />
    </ThemedView>
  );
}
