import * as React from 'react';
import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Image,
  Animated,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Redirect, router } from 'expo-router';

import { useProduct } from '@/presentation/products/hooks/useProduct';
import { useProducts } from '@/presentation/products/hooks/useProducts';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import ThemedButton from '@/presentation/theme/components/ThemedButton';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { Product } from '@/core/api/productsApi';
import ProductImages from '@/presentation/products/components/ProductImages';
import { useAddToCart } from '@/presentation/cart/hooks/useCart';
import { CartIndicator } from '@/presentation/cart/components/CartIndicator';
import { ReviewStats } from '@/presentation/reviews/components/ReviewStats';
import { ReviewsList } from '@/presentation/reviews/components/ReviewsList';
import { useProductReviewStats, useCanUserReviewProduct } from '@/presentation/reviews/hooks/useReviews';
import { ProductNotificationButtons } from '@/presentation/notifications/components/ProductNotificationButtons';
import { FlatList } from 'react-native';

// Obtener dimensiones de pantalla para diseño responsive
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Paleta de colores
const COLOR_PALETTE = {
  primary: '#314259',    // Azul oscuro
  accent: '#4F758C',     // Azul medio
  light: '#8EACBF',      // Azul claro
};

// Calcular dimensiones responsive para vista de producto
const getResponsiveDimensions = () => {
  // Breakpoints para diferentes dispositivos
  const isSmallPhone = screenWidth < 360; // iPhone SE, etc.
  const isMediumPhone = screenWidth >= 360 && screenWidth < 414; // iPhone estándar
  const isLargePhone = screenWidth >= 414 && screenWidth < 768; // iPhone Plus, Android grandes
  const isTablet = screenWidth >= 768 && screenWidth < 1024; // iPads, tablets Android
  const isDesktop = screenWidth >= 1024; // Computadores, pantallas grandes
  
  // Determinar si es móvil o no
  const isMobile = screenWidth < 768;
  const isTabletOrDesktop = screenWidth >= 768;
  
  return {
    // Breakpoints
    isSmallPhone,
    isMediumPhone,
    isLargePhone,
    isTablet,
    isDesktop,
    isMobile,
    isTabletOrDesktop,
    
    // Dimensiones de imagen principal
    imageWidth: screenWidth,
    imageHeight: isSmallPhone ? 250 : isMediumPhone ? 280 : isLargePhone ? 320 : isTablet ? 400 : 450,
    
    // Espaciado responsive
    paddingHorizontal: isSmallPhone ? 12 : isMediumPhone ? 16 : isLargePhone ? 20 : isTablet ? 32 : 48,
    paddingVertical: isSmallPhone ? 8 : isMediumPhone ? 12 : isLargePhone ? 16 : isTablet ? 20 : 24,
    marginBetween: isSmallPhone ? 8 : isMediumPhone ? 12 : isLargePhone ? 16 : isTablet ? 20 : 24,
    
    // Texto responsive
    titleFontSize: isSmallPhone ? 20 : isMediumPhone ? 22 : isLargePhone ? 24 : isTablet ? 28 : 32,
    subtitleFontSize: isSmallPhone ? 14 : isMediumPhone ? 15 : isLargePhone ? 16 : isTablet ? 18 : 20,
    bodyFontSize: isSmallPhone ? 13 : isMediumPhone ? 14 : isLargePhone ? 15 : isTablet ? 16 : 18,
    priceFontSize: isSmallPhone ? 18 : isMediumPhone ? 20 : isLargePhone ? 22 : isTablet ? 26 : 30,
    buttonFontSize: isSmallPhone ? 14 : isMediumPhone ? 15 : isLargePhone ? 16 : isTablet ? 18 : 20,
    
    // Botones responsive
    buttonHeight: isSmallPhone ? 50 : isMediumPhone ? 54 : isLargePhone ? 58 : isTablet ? 64 : 68,
    buttonPadding: isSmallPhone ? 16 : isMediumPhone ? 18 : isLargePhone ? 20 : isTablet ? 24 : 28,
    
    // Iconos responsive
    iconSize: isSmallPhone ? 20 : isMediumPhone ? 22 : isLargePhone ? 24 : isTablet ? 28 : 32,
    smallIconSize: isSmallPhone ? 16 : isMediumPhone ? 18 : isLargePhone ? 20 : isTablet ? 22 : 24,
    
    // Layout específico para tablets y desktop
    maxContentWidth: isTabletOrDesktop ? Math.min(screenWidth * 0.8, 800) : screenWidth,
    contentPadding: isTabletOrDesktop ? 24 : 16,
  };
};

export default function ProductDetailScreen() {
  const { id, fromService } = useLocalSearchParams();
  const isServiceView = fromService === 'true';
  const { productQuery } = useProduct(`${id}`);
  
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartAnimation] = useState(new Animated.Value(1));
  const [successAnimation] = useState(new Animated.Value(0));
  const [refreshing, setRefreshing] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const addToCartMutation = useAddToCart();
  const responsiveDims = getResponsiveDimensions();
  
  // Colores para servicios usando la nueva paleta
  const serviceColor = COLOR_PALETTE.primary; // Azul oscuro principal
  const serviceColorSecondary = COLOR_PALETTE.accent; // Azul medio
  const serviceBackgroundLight = COLOR_PALETTE.light + '20'; // Fondo azul claro translúcido
  const serviceBackgroundCard = COLOR_PALETTE.light + '30'; // Fondo azul claro
  const serviceBorderColor = COLOR_PALETTE.light + '60'; // Borde azul claro
  const serviceTextDark = COLOR_PALETTE.primary; // Texto azul oscuro
  const serviceTextLight = COLOR_PALETTE.accent; // Texto azul medio

  // Hooks para reseñas - DEBEN estar antes de cualquier return condicional
  const { data: reviewStats } = useProductReviewStats(`${id}`);
  const { data: canReviewData } = useCanUserReviewProduct(`${id}`);

  // Obtener productos relacionados - DEBE estar antes de cualquier return condicional
  // Extraemos categoriaId de manera segura, puede ser undefined si aún no hay datos
  // Usamos un valor por defecto estable para mantener el orden de hooks
  const categoriaId = productQuery.data?.product?.categoriaId;
  
  // Determinar si el producto actual es un servicio
  const currentProduct = productQuery.data?.product;
  const isService = isServiceView || currentProduct?.esServicio || currentProduct?.es_servicio;
  
  // Memoizar los filtros para mantener una referencia estable del objeto
  // Siempre usar el mismo objeto base, incluso si categoriaId es undefined
  // Si estamos viendo un servicio, filtrar solo servicios relacionados
  const relatedFilters = React.useMemo(() => ({
    activo: true,
    esServicio: isService ? true : false, // Solo servicios si estamos viendo un servicio, solo productos si no
    categoriaId: categoriaId || undefined,
    limit: 10,
  }), [categoriaId, isService]);
  
  // Siempre llamar al hook con los mismos parámetros
  // El hook se ejecuta siempre, pero la query solo se ejecuta si enabled es true
  const { productsQuery: relatedProductsQuery } = useProducts(
    relatedFilters,
    {
      enabled: !!categoriaId, // Solo ejecutar cuando tengamos categoriaId
    }
  );

  // Filtrar productos relacionados excluyendo el producto actual
  // DEBE estar antes del return condicional para cumplir las reglas de hooks
  const productId = productQuery.data?.product?.id;
  const relatedProducts = React.useMemo(() => {
    if (!productId) return [];
    const allProducts = relatedProductsQuery.data?.pages.flatMap((page) => page?.products ?? []) ?? [];
    return allProducts.filter((p) => p.id !== productId).slice(0, 8);
  }, [relatedProductsQuery.data, productId]);

  // Resetear cantidad y tamaño cuando cambia el producto
  React.useEffect(() => {
    setQuantity(1);
    setSelectedSize(null);
  }, [id]);

  // Función para refrescar el producto
  const handleRefresh = async () => {
    setRefreshing(true);
    await productQuery.refetch();
    setRefreshing(false);
  };

  // Validación temprana para evitar errores
  if (!productQuery.data) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Cargando producto...</ThemedText>
        </View>
      </View>
    );
  }

  const product = productQuery.data.product;

  const handleAddToCart = async () => {
    // Comentado hasta implementar tallas en backend
    // if (product.sizes && product.sizes.length > 0 && !selectedSize) {
    //   Alert.alert('Selecciona una talla', 'Por favor selecciona una talla antes de agregar al carrito');
    //   return;
    // }

    if (quantity > product.stock) {
      Alert.alert('Stock insuficiente', `Solo hay ${product.stock} unidades disponibles`);
      return;
    }

    if (addToCartMutation.isPending) return;

    // Animación de pulsación del botón
    Animated.sequence([
      Animated.timing(cartAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cartAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      // Agregar producto al carrito usando la API real
      await addToCartMutation.mutateAsync({
        productId: product.id,
        quantity: quantity
      });
      
      // Animación de éxito
      Animated.sequence([
        Animated.timing(successAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(successAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Mostrar confirmación
      Alert.alert(
        '✅ Agregado al carrito',
        `${quantity}x ${product.nombre}${selectedSize ? ` (Talla ${selectedSize})` : ''} agregado exitosamente`,
        [
          { text: 'Continuar comprando', style: 'default' },
          { text: 'Ver carrito', style: 'default', onPress: () => router.push('/(customer)/cart') }
        ]
      );

    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el producto al carrito');
    }
  };

  // Función para manejar cambios de cantidad (similar a la del carrito)
  const handleQuantityChange = (newQuantity: number) => {
    // Validar que la cantidad esté en el rango válido
    if (newQuantity < 1) {
      setQuantity(1);
      return;
    }

    if (newQuantity > product.stock) {
      Alert.alert('Stock insuficiente', `Solo hay ${product.stock} unidades disponibles`);
      setQuantity(product.stock);
      return;
    }

    setQuantity(newQuantity);
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      handleQuantityChange(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      handleQuantityChange(quantity - 1);
    }
  };


  const handleWriteReview = () => {
    // Navegar a la pantalla de escribir reseña
    router.push(`/(customer)/product/write-review?productId=${id}` as any);
  };

  const handleEditReview = () => {
    // Navegar a la pantalla de editar reseña
    if (canReviewData?.existingReviewId) {
      router.push(`/(customer)/product/write-review?productId=${id}&reviewId=${canReviewData.existingReviewId}` as any);
    }
  };

  return (
    <View style={[
      styles.container,
      isServiceView && { backgroundColor: serviceBackgroundLight }
    ]}>
      {/* Header con navegación y carrito */}
      <View style={[
        styles.header,
        responsiveDims.isTabletOrDesktop && styles.headerTablet,
        isServiceView && {
          backgroundColor: serviceBackgroundLight,
          borderBottomColor: serviceBorderColor,
        }
      ]}>
        <TouchableOpacity
          onPress={() => {
            if (isServiceView) {
              router.push('/(customer)/services' as any);
            } else {
              router.back();
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={isServiceView ? serviceTextDark : "#333"} />
        </TouchableOpacity>
        
        <ThemedText style={[
          styles.headerTitle,
          isServiceView && { color: serviceTextDark }
        ]}>
          {isServiceView ? 'Servicio' : 'Producto'}
        </ThemedText>
        
        {!isServiceView && (
          <CartIndicator
            onPress={() => router.push('/(customer)/cart')}
            showText={false}
            size={responsiveDims.isSmallPhone ? "small" : responsiveDims.isTabletOrDesktop ? "large" : "medium"}
          />
        )}
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={isServiceView ? serviceColor : tintColor}
            colors={[isServiceView ? serviceColor : tintColor]}
          />
        }
      >
        {/* Contenedor principal responsive */}
        <View style={[
          styles.mainContainer,
          responsiveDims.isTabletOrDesktop && {
            maxWidth: responsiveDims.maxContentWidth,
            alignSelf: 'center',
            width: '100%',
          }
        ]}>
          {/* Galería de imágenes del producto */}
          <View style={[
            styles.imageContainer,
            { height: responsiveDims.imageHeight },
            isServiceView && { backgroundColor: serviceBackgroundCard }
          ]}>
            <ProductImages 
              images={(() => {
                const imagesToUse = product.images || product.imagenes || [];
                console.log('🖼️ [ProductDetail] Pasando imágenes a ProductImages:', {
                  productoId: product.id,
                  tieneImages: !!product.images,
                  tieneImagenes: !!product.imagenes,
                  imagesLength: product.images?.length || 0,
                  imagenesLength: product.imagenes?.length || 0,
                  imagesToUseLength: imagesToUse.length,
                  imagesToUse: imagesToUse,
                  primerElemento: imagesToUse[0],
                  tipoPrimerElemento: typeof imagesToUse[0]
                });
                return imagesToUse;
              })()}
              style={[styles.productImages, { height: responsiveDims.imageHeight }]}
            />
          </View>

          <ThemedView style={[
            styles.content,
            { paddingHorizontal: responsiveDims.paddingHorizontal },
            isServiceView && { backgroundColor: serviceBackgroundLight }
          ]}>
        
        {/* Banner Informativo para Servicios */}
        {isServiceView && (
          <View style={{
            backgroundColor: serviceColor,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 12,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            shadowColor: serviceColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            // elevation: 4,
          }}>
            <Ionicons name="eye-outline" size={28} color="#fff" />
            <View style={{ flex: 1 }}>
              <ThemedText style={{
                color: '#fff',
                fontSize: responsiveDims.isSmallPhone ? 15 : responsiveDims.subtitleFontSize,
                fontWeight: '700',
                marginBottom: 4,
              }}>
                Vista Informativa
              </ThemedText>
              <ThemedText style={{
                color: '#e9d5ff',
                fontSize: responsiveDims.isSmallPhone ? 12 : responsiveDims.bodyFontSize,
                fontWeight: '500',
                lineHeight: 18,
              }}>
                Esta es una vista informativa del servicio. No incluye opciones de compra.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Header del producto */}
        <View style={styles.productHeader}>
          <View style={styles.titleContainer}>
            <ThemedText style={[
              styles.title,
              { fontSize: responsiveDims.titleFontSize },
              isServiceView && { color: serviceTextDark }
            ]}>
              {product.nombre}
            </ThemedText>
            
            {/* Calificación promedio */}
            {reviewStats && reviewStats.totalResenas > 0 && (
              <View style={styles.ratingContainer}>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= Math.round(reviewStats.promedioCalificacion) ? "star" : "star-outline"}
                      size={responsiveDims.isSmallPhone ? 16 : responsiveDims.isTabletOrDesktop ? 20 : 18}
                      color="#FFD700"
                    />
                  ))}
                </View>
                <ThemedText style={[styles.ratingText, { fontSize: responsiveDims.bodyFontSize }]}>
                  {reviewStats.promedioCalificacion.toFixed(1)} ({reviewStats.totalResenas} {reviewStats.totalResenas === 1 ? 'reseña' : 'reseñas'})
                </ThemedText>
              </View>
            )}
          </View>
          
          {/* Precio */}
          <View style={styles.priceContainer}>
            {product.enOferta && product.precio != null ? (
              <>
                <ThemedText style={[styles.originalPrice, { fontSize: responsiveDims.bodyFontSize }]}>
                  ${product.precio.toLocaleString()}
                </ThemedText>
                <ThemedText style={[
                  styles.currentPrice,
                  {
                    color: isServiceView ? serviceColor : tintColor,
                    fontSize: responsiveDims.priceFontSize
                  }
                ]}>
                  ${(product.precioFinal || product.precio || 0).toLocaleString()}
                </ThemedText>
                <View style={[
                  styles.offerBadge,
                  isServiceView && { backgroundColor: serviceColor }
                ]}>
                  <ThemedText style={[styles.offerText, { fontSize: responsiveDims.isSmallPhone ? 10 : responsiveDims.isTabletOrDesktop ? 14 : 12 }]}>¡Oferta!</ThemedText>
                </View>
              </>
            ) : (
              <ThemedText style={[
                styles.currentPrice,
                {
                  color: isServiceView ? serviceColor : tintColor,
                  fontSize: responsiveDims.priceFontSize
                }
              ]}>
                ${(product.precioFinal || product.precio || 0).toLocaleString()}
              </ThemedText>
            )}
          </View>
        </View>
        
        {/* Descripción */}
        {product.descripcion && (
          <View style={[
            styles.descriptionContainer,
            isServiceView && {
              backgroundColor: serviceBackgroundCard,
              borderColor: serviceBorderColor,
              borderWidth: 1,
            }
          ]}>
            <ThemedText style={[
              styles.sectionTitle,
              { 
                fontSize: responsiveDims.subtitleFontSize,
                color: isServiceView ? serviceColor : tintColor
              }
            ]}>
              Descripción
            </ThemedText>
            <ThemedText style={[
              styles.description,
              { fontSize: responsiveDims.bodyFontSize },
              isServiceView && { color: serviceTextLight }
            ]}>
              {product.descripcion}
            </ThemedText>
          </View>
        )}

        {/* Información del producto */}
        <View style={[
          styles.productInfoContainer,
          isServiceView && {
            backgroundColor: serviceBackgroundCard,
            borderColor: serviceBorderColor,
            borderWidth: 1,
          }
        ]}>
          <ThemedText style={[
            styles.sectionTitle,
            { fontSize: responsiveDims.subtitleFontSize },
            isServiceView && { color: serviceTextDark }
          ]}>
            Información del producto
          </ThemedText>
          
          {/* Stock / Información de Recargas */}
          {isServiceView ? (
            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <Ionicons 
                  name="information-circle" 
                  size={responsiveDims.smallIconSize} 
                  color={serviceColor} 
                />
                <ThemedText style={[
                  styles.infoLabel,
                  { fontSize: responsiveDims.bodyFontSize },
                  { color: serviceTextLight }
                ]}>
                  Información de recargas
                </ThemedText>
              </View>
              <ThemedText style={[
                styles.infoValue,
                {
                  color: serviceTextDark,
                  fontSize: responsiveDims.bodyFontSize
                }
              ]}>
                Servicio disponible
              </ThemedText>
            </View>
          ) : (
            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <Ionicons 
                  name={product.stock > 0 ? "checkmark-circle" : "close-circle"} 
                  size={responsiveDims.smallIconSize} 
                  color={product.stock > 0 ? "#4CAF50" : "#F44336"} 
                />
                <ThemedText style={[
                  styles.infoLabel,
                  { fontSize: responsiveDims.bodyFontSize }
                ]}>
                  Disponibilidad
                </ThemedText>
              </View>
              <ThemedText style={[
                styles.infoValue,
                {
                  color: product.stock > 0 ? "#4CAF50" : "#F44336",
                  fontSize: responsiveDims.bodyFontSize
                }
              ]}>
                {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
              </ThemedText>
            </View>
          )}

          {/* SKU */}
          {product.sku && (
            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="barcode-outline"
                  size={responsiveDims.smallIconSize}
                  color={isServiceView ? serviceTextLight : "#666"}
                />
                <ThemedText style={[
                  styles.infoLabel,
                  { fontSize: responsiveDims.bodyFontSize },
                  isServiceView && { color: serviceTextLight }
                ]}>
                  SKU
                </ThemedText>
              </View>
              <ThemedText style={[
                styles.infoValue,
                { fontSize: responsiveDims.bodyFontSize },
                isServiceView && { color: serviceTextDark }
              ]} numberOfLines={1}>
                {product.sku}
              </ThemedText>
            </View>
          )}

          {/* Categoría */}
          {product.categoriaNombre && (
            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="folder-outline"
                  size={responsiveDims.smallIconSize}
                  color={isServiceView ? serviceTextLight : "#666"}
                />
                <ThemedText style={[
                  styles.infoLabel,
                  { fontSize: responsiveDims.bodyFontSize },
                  isServiceView && { color: serviceTextLight }
                ]}>
                  Categoría
                </ThemedText>
              </View>
              <ThemedText style={[
                styles.infoValue,
                { fontSize: responsiveDims.bodyFontSize },
                isServiceView && { color: serviceTextDark }
              ]} numberOfLines={1}>
                {product.categoriaNombre}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Botones de notificaciones - Solo mostrar si NO es vista de servicio */}
        {!isServiceView && (
          <ProductNotificationButtons
            productId={product.id}
            productName={product.nombre}
            currentPrice={product.precioFinal}
            isInStock={product.stock > 0}
          />
        )}

        {/* Tallas disponibles - Comentado hasta implementar en backend }
        {/* {product.sizes && product.sizes.length > 0 && (
          <View style={styles.sizesContainer}>
            <ThemedText style={styles.sectionTitle}>Tallas disponibles:</ThemedText>
            <View style={styles.sizesList}>
              {product.sizes.map((size: string) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeButton,
                    selectedSize === size && { backgroundColor: tintColor }
                  ]}
                  onPress={() => setSelectedSize(size)}
                >
                  <ThemedText style={[
                    styles.sizeText,
                    selectedSize === size && { color: 'white' }
                  ]}>
                    {size}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )} */}

        {/* Cantidad y acciones - Solo mostrar si NO es vista de servicio */}
        {!isServiceView && (
          <View style={styles.actionsContainer}>
            <View style={styles.quantitySection}>
              <ThemedText style={[styles.sectionTitle, { fontSize: responsiveDims.subtitleFontSize }]}>Cantidad</ThemedText>
              <View style={styles.quantityControls} pointerEvents="box-none">
                {Platform.OS === 'android' ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.quantityButton,
                      (quantity <= 1 || product.stock === 0) && styles.quantityButtonDisabled,
                      pressed && styles.quantityButtonPressed
                    ]}
                    onPress={() => {
                      if (quantity > 1 && product.stock > 0) {
                        decrementQuantity();
                      }
                    }}
                    disabled={quantity <= 1 || product.stock === 0}
                    android_ripple={{ color: '#e0e0e0', borderless: false }}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  >
                    <Ionicons 
                      name="remove" 
                      size={responsiveDims.smallIconSize} 
                      color={(quantity <= 1 || product.stock === 0) ? "#ccc" : "#333"} 
                    />
                  </Pressable>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      (quantity <= 1 || product.stock === 0) && styles.quantityButtonDisabled
                    ]}
                    onPress={() => {
                      if (quantity > 1 && product.stock > 0) {
                        decrementQuantity();
                      }
                    }}
                    disabled={quantity <= 1 || product.stock === 0}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons 
                      name="remove" 
                      size={responsiveDims.smallIconSize} 
                      color={(quantity <= 1 || product.stock === 0) ? "#ccc" : "#333"} 
                    />
                  </TouchableOpacity>
                )}
                
                <View style={styles.quantityDisplay} pointerEvents="none">
                  <ThemedText style={styles.quantityText}>
                    {quantity}
                  </ThemedText>
                </View>
                
                {Platform.OS === 'android' ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.quantityButton,
                      (quantity >= product.stock || product.stock === 0) && styles.quantityButtonDisabled,
                      pressed && styles.quantityButtonPressed
                    ]}
                    onPress={() => {
                      if (quantity < product.stock && product.stock > 0) {
                        incrementQuantity();
                      }
                    }}
                    disabled={quantity >= product.stock || product.stock === 0}
                    android_ripple={{ color: '#e0e0e0', borderless: false }}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  >
                    <Ionicons 
                      name="add" 
                      size={responsiveDims.smallIconSize} 
                      color={(quantity >= product.stock || product.stock === 0) ? "#ccc" : "#333"} 
                    />
                  </Pressable>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      (quantity >= product.stock || product.stock === 0) && styles.quantityButtonDisabled
                    ]}
                    onPress={() => {
                      if (quantity < product.stock && product.stock > 0) {
                        incrementQuantity();
                      }
                    }}
                    disabled={quantity >= product.stock || product.stock === 0}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons 
                      name="add" 
                      size={responsiveDims.smallIconSize} 
                      color={(quantity >= product.stock || product.stock === 0) ? "#ccc" : "#333"} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[
              styles.actionButtons,
              responsiveDims.isTabletOrDesktop && styles.actionButtonsTablet
            ]}>
              <Animated.View style={{ transform: [{ scale: cartAnimation }] }}>
                <TouchableOpacity
                  onPress={handleAddToCart}
                  disabled={product.stock === 0 || addToCartMutation.isPending}
                  style={[
                    styles.addToCartButton,
                    { 
                      height: responsiveDims.buttonHeight,
                      minWidth: responsiveDims.isSmallPhone ? 160 : responsiveDims.isMediumPhone ? 180 : 200,
                    },
                    product.stock === 0 && styles.disabledButton,
                    addToCartMutation.isPending && styles.loadingButton,
                    responsiveDims.isTabletOrDesktop && styles.addToCartButtonTablet
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.buttonContent,
                    {
                      paddingHorizontal: responsiveDims.isSmallPhone ? 16 : responsiveDims.isMediumPhone ? 20 : 24,
                    }
                  ]}>
                    {addToCartMutation.isPending ? (
                      <>
                        <ActivityIndicator size="small" color="white" />
                        <ThemedText style={[styles.buttonText, { fontSize: responsiveDims.buttonFontSize }]}>Agregando...</ThemedText>
                      </>
                    ) : (
                      <>
                        <Ionicons 
                          name={product.stock === 0 ? "close-circle" : "cart"} 
                          size={responsiveDims.smallIconSize} 
                          color="white" 
                          style={[
                            styles.buttonIcon,
                            { marginRight: responsiveDims.isSmallPhone ? 6 : 10 }
                          ]}
                        />
                        <ThemedText style={[styles.buttonText, { fontSize: responsiveDims.buttonFontSize }]}>
                          {product.stock === 0 
                            ? 'Producto Agotado' 
                            : responsiveDims.isSmallPhone 
                              ? 'Agregar' 
                              : 'Agregar al Carrito'
                          }
                        </ThemedText>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {/* Indicador de éxito */}
              <Animated.View 
                style={[
                  styles.successIndicator,
                  {
                    opacity: successAnimation,
                    transform: [{
                      scale: successAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      })
                    }]
                  }
                ]}
              >
                <Ionicons name="checkmark-circle" size={responsiveDims.iconSize} color="#4CAF50" />
                <ThemedText style={[styles.successText, { fontSize: responsiveDims.bodyFontSize }]}>¡Agregado!</ThemedText>
              </Animated.View>

              {/* Botón secundario para ver carrito */}
              <TouchableOpacity
                style={[
                  styles.secondaryButton, 
                  { height: responsiveDims.buttonHeight },
                  responsiveDims.isTabletOrDesktop && styles.secondaryButtonTablet
                ]}
                onPress={() => router.push('/(customer)/cart')}
                activeOpacity={0.7}
              >
                <Ionicons name="bag-outline" size={responsiveDims.smallIconSize} color="#007AFF" />
                <ThemedText style={[styles.secondaryButtonText, { fontSize: responsiveDims.buttonFontSize }]}>Ver Carrito</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </ThemedView>

        {/* Sección de productos relacionados */}
        {relatedProducts.length > 0 && (
          <View style={[styles.relatedProductsContainer, { paddingHorizontal: responsiveDims.paddingHorizontal }]}>
            <ThemedText style={[
              styles.relatedProductsTitle,
              { fontSize: responsiveDims.subtitleFontSize },
              isServiceView && { color: serviceTextDark }
            ]}>
              {isServiceView ? 'Más servicios disponibles' : 'Productos relacionados'}
            </ThemedText>
            <FlatList
              horizontal
              data={relatedProducts}
              keyExtractor={(item) => `related-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.relatedProductsList, { paddingRight: responsiveDims.paddingHorizontal }]}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.relatedProductCard,
                    {
                      width: responsiveDims.isSmallPhone ? 150 : responsiveDims.isMediumPhone ? 170 : 190,
                    },
                    isServiceView && {
                      backgroundColor: serviceBackgroundLight,
                      borderColor: serviceBorderColor,
                      shadowColor: serviceColor,
                    }
                  ]}
                  onPress={() => {
                    router.replace(`/(customer)/product/${item.id}${isServiceView ? '?fromService=true' : ''}` as any);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.relatedProductImageContainer,
                    {
                      height: responsiveDims.isSmallPhone ? 120 : responsiveDims.isMediumPhone ? 140 : 160,
                    }
                  ]}>
                    {item.images && item.images.length > 0 && item.images[0] ? (
                      <Image
                        source={{ uri: item.images[0] }}
                        style={styles.relatedProductImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.relatedProductNoImage}>
                        <Ionicons name="image-outline" size={40} color="#ced3de" />
                      </View>
                    )}
                  </View>
                  <View style={styles.relatedProductInfo}>
                    <ThemedText 
                      style={[styles.relatedProductName, { fontSize: responsiveDims.isSmallPhone ? 13 : 14 }]} 
                      numberOfLines={2}
                    >
                      {String(item.nombre || 'Sin nombre')}
                    </ThemedText>
                    {item.precioFinal || item.precio ? (
                      <ThemedText style={[
                        styles.relatedProductPrice,
                        {
                          fontSize: responsiveDims.isSmallPhone ? 14 : 16,
                          color: isServiceView ? serviceColor : undefined
                        }
                      ]}>
                        ${String((item.precioFinal || item.precio || 0).toLocaleString())}
                      </ThemedText>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Sección de estadísticas de reseñas */}
        {reviewStats && reviewStats.totalResenas > 0 && (
          <ReviewStats
            stats={reviewStats}
            onWriteReview={handleWriteReview}
            onEditReview={handleEditReview}
            canWriteReview={canReviewData?.canReview || false}
            hasExistingReview={!!canReviewData?.existingReviewId}
          />
        )}

        {/* Sección de reseñas */}
        <ReviewsList
          productId={`${id}`}
          onWriteReview={handleWriteReview}
          onEditReview={handleEditReview}
          canWriteReview={canReviewData?.canReview || false}
          hasExistingReview={!!canReviewData?.existingReviewId}
        />
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
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
  imageContainer: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    // elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // height se define dinámicamente
  },
  productImages: {
    height: '100%',
  },
  content: {
    flex: 1,
    marginTop: -10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#fff',
    // padding se define dinámicamente
  },
  productHeader: {
    marginBottom: 16,
  },
  titleContainer: {
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
    lineHeight: 30,
    flexWrap: 'wrap',
    // fontSize se define dinámicamente
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    color: '#666',
    fontWeight: '500',
    // fontSize se define dinámicamente
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  currentPrice: {
    fontWeight: 'bold',
    marginRight: 12,
    // fontSize se define dinámicamente
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    color: '#999',
    marginRight: 12,
    // fontSize se define dinámicamente
  },
  offerBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  offerText: {
    color: 'white',
    fontWeight: 'bold',
    // fontSize se define dinámicamente
  },
  descriptionContainer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
    // fontSize se define dinámicamente
  },
  description: {
    lineHeight: 20,
    color: '#666',
    // fontSize se define dinámicamente
  },
  productInfoContainer: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 40,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  infoLabel: {
    fontWeight: '500',
    marginLeft: 8,
    color: '#666',
    flex: 1,
    // fontSize se define dinámicamente
  },
  infoValue: {
    fontWeight: '600',
    // fontSize se define dinámicamente
    color: '#1a1a1a',
    textAlign: 'right',
    flex: 1,
  },
  actionsContainer: {
    marginTop: 16,
  },
  quantitySection: {
    marginBottom: 16,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    justifyContent: 'center',
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    // elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    zIndex: 1,
  },
  quantityButtonDisabled: {
    backgroundColor: '#f5f5f5',
    // elevation: 0,
  },
  quantityButtonPressed: {
    opacity: 0.6,
  },
  quantityDisplay: {
    minWidth: 44,
    height: 36,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  actionButtons: {
    marginTop: 10,
    position: 'relative',
  },
  addToCartButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    // elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    // height y minWidth se definen dinámicamente
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
    paddingHorizontal: 24,
    minHeight: 50,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
    // fontSize se define dinámicamente
  },
  disabledButton: {
    backgroundColor: '#ccc',
    // elevation: 0,
    shadowOpacity: 0,
  },
  loadingButton: {
    backgroundColor: '#5A9FD4',
  },
  successIndicator: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  successText: {
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 6,
    // fontSize se define dinámicamente
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 16,
    marginHorizontal: 4,
    // height se define dinámicamente
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
    // fontSize se define dinámicamente
  },
  // Estilos específicos para tablets y desktop
  headerTablet: {
    paddingVertical: 16,
  },
  backButtonTablet: {
    padding: 12,
  },
  actionButtonsTablet: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  addToCartButtonTablet: {
    flex: 1,
    marginHorizontal: 0,
  },
  secondaryButtonTablet: {
    flex: 0.4,
    marginTop: 0,
    marginHorizontal: 0,
  },
  // Estilos para productos relacionados
  relatedProductsContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  relatedProductsTitle: {
    fontWeight: '700',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  relatedProductsList: {
    paddingRight: 0,
  },
  relatedProductCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  relatedProductImageContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
  },
  relatedProductImage: {
    width: '100%',
    height: '100%',
  },
  relatedProductNoImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fc',
  },
  relatedProductInfo: {
    padding: 10,
  },
  relatedProductName: {
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
    minHeight: 36,
  },
  relatedProductPrice: {
    fontWeight: '700',
    color: '#007AFF',
  },
});
