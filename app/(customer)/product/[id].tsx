import * as React from 'react';
import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Redirect, router } from 'expo-router';

import { useProduct } from '@/presentation/products/hooks/useProduct';
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

// Obtener dimensiones de pantalla para diseño responsive
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const { id } = useLocalSearchParams();
  const { productQuery } = useProduct(`${id}`);
  
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartAnimation] = useState(new Animated.Value(1));
  const [successAnimation] = useState(new Animated.Value(0));
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const addToCartMutation = useAddToCart();
  const responsiveDims = getResponsiveDimensions();

  // Hooks para reseñas - DEBEN estar antes de cualquier return condicional
  const { data: reviewStats } = useProductReviewStats(`${id}`);
  const { data: canReviewData } = useCanUserReviewProduct(`${id}`);

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

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleWriteReview = () => {
    // Navegar a la pantalla de escribir reseña
    router.push(`/(customer)/product/write-review?productId=${id}` as any);
  };

  return (
    <View style={styles.container}>
      {/* Header con navegación y carrito */}
      <View style={[
        styles.header,
        responsiveDims.isTabletOrDesktop && styles.headerTablet
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>Producto</ThemedText>
        
        <CartIndicator
          onPress={() => router.push('/(customer)/cart')}
          showText={false}
          size={responsiveDims.isSmallPhone ? "small" : responsiveDims.isTabletOrDesktop ? "large" : "medium"}
        />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
          <View style={[styles.imageContainer, { height: responsiveDims.imageHeight }]}>
            <ProductImages 
              images={product.images || []} 
              style={[styles.productImages, { height: responsiveDims.imageHeight }]}
            />
          </View>

          <ThemedView style={[styles.content, { paddingHorizontal: responsiveDims.paddingHorizontal }]}>
        {/* Header del producto */}
        <View style={styles.productHeader}>
          <View style={styles.titleContainer}>
            <ThemedText style={[styles.title, { fontSize: responsiveDims.titleFontSize }]}>{product.nombre}</ThemedText>
            
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
            {product.enOferta ? (
              <>
                <ThemedText style={[styles.originalPrice, { fontSize: responsiveDims.bodyFontSize }]}>
                  ${product.precio.toLocaleString()}
                </ThemedText>
                <ThemedText style={[styles.currentPrice, { color: tintColor, fontSize: responsiveDims.priceFontSize }]}>
                  ${product.precioFinal.toLocaleString()}
                </ThemedText>
                <View style={styles.offerBadge}>
                  <ThemedText style={[styles.offerText, { fontSize: responsiveDims.isSmallPhone ? 10 : responsiveDims.isTabletOrDesktop ? 14 : 12 }]}>¡Oferta!</ThemedText>
                </View>
              </>
            ) : (
              <ThemedText style={[styles.currentPrice, { color: tintColor, fontSize: responsiveDims.priceFontSize }]}>
                ${product.precioFinal.toLocaleString()}
              </ThemedText>
            )}
          </View>
        </View>
        
        {/* Descripción */}
        {product.descripcion && (
          <View style={styles.descriptionContainer}>
            <ThemedText style={[styles.sectionTitle, { fontSize: responsiveDims.subtitleFontSize }]}>Descripción</ThemedText>
            <ThemedText style={[styles.description, { fontSize: responsiveDims.bodyFontSize }]}>{product.descripcion}</ThemedText>
          </View>
        )}

        {/* Información del producto */}
        <View style={styles.productInfoContainer}>
          <ThemedText style={[styles.sectionTitle, { fontSize: responsiveDims.subtitleFontSize }]}>Información del producto</ThemedText>
          
          {/* Stock */}
          <View style={styles.infoItem}>
            <View style={styles.infoHeader}>
              <Ionicons 
                name={product.stock > 0 ? "checkmark-circle" : "close-circle"} 
                size={responsiveDims.smallIconSize} 
                color={product.stock > 0 ? "#4CAF50" : "#F44336"} 
              />
              <ThemedText style={[styles.infoLabel, { fontSize: responsiveDims.bodyFontSize }]}>Disponibilidad</ThemedText>
            </View>
            <ThemedText style={[
              styles.infoValue,
              { color: product.stock > 0 ? "#4CAF50" : "#F44336", fontSize: responsiveDims.bodyFontSize }
            ]}>
              {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
            </ThemedText>
          </View>

          {/* SKU */}
          {product.sku && (
            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <Ionicons name="barcode-outline" size={responsiveDims.smallIconSize} color="#666" />
                <ThemedText style={[styles.infoLabel, { fontSize: responsiveDims.bodyFontSize }]}>SKU</ThemedText>
              </View>
              <ThemedText style={[styles.infoValue, { fontSize: responsiveDims.bodyFontSize }]} numberOfLines={1}>
                {product.sku}
              </ThemedText>
            </View>
          )}

          {/* Categoría */}
          {product.categoriaNombre && (
            <View style={styles.infoItem}>
              <View style={styles.infoHeader}>
                <Ionicons name="folder-outline" size={responsiveDims.smallIconSize} color="#666" />
                <ThemedText style={[styles.infoLabel, { fontSize: responsiveDims.bodyFontSize }]}>Categoría</ThemedText>
              </View>
              <ThemedText style={[styles.infoValue, { fontSize: responsiveDims.bodyFontSize }]} numberOfLines={1}>
                {product.categoriaNombre}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Botones de notificaciones */}
        <ProductNotificationButtons
          productId={product.id}
          productName={product.nombre}
          currentPrice={product.precioFinal}
          isInStock={product.stock > 0}
        />

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

        {/* Cantidad y acciones */}
        <View style={styles.actionsContainer}>
          <View style={styles.quantitySection}>
            <ThemedText style={[styles.sectionTitle, { fontSize: responsiveDims.subtitleFontSize }]}>Cantidad</ThemedText>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[
                  styles.quantityButton, 
                  { 
                    width: responsiveDims.isTabletOrDesktop ? 55 : 45,
                    height: responsiveDims.isTabletOrDesktop ? 55 : 45,
                    borderRadius: responsiveDims.isTabletOrDesktop ? 27.5 : 22.5,
                  },
                  quantity <= 1 && styles.quantityButtonDisabled
                ]}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={responsiveDims.smallIconSize} color={quantity <= 1 ? "#ccc" : "#333"} />
              </TouchableOpacity>
              
              <View style={[
                styles.quantityDisplay,
                {
                  minWidth: responsiveDims.isTabletOrDesktop ? 80 : 60,
                  height: responsiveDims.isTabletOrDesktop ? 55 : 45,
                }
              ]}>
                <ThemedText style={[styles.quantityText, { fontSize: responsiveDims.bodyFontSize }]}>{quantity}</ThemedText>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  { 
                    width: responsiveDims.isTabletOrDesktop ? 55 : 45,
                    height: responsiveDims.isTabletOrDesktop ? 55 : 45,
                    borderRadius: responsiveDims.isTabletOrDesktop ? 27.5 : 22.5,
                  },
                  quantity >= product.stock && styles.quantityButtonDisabled
                ]}
                onPress={incrementQuantity}
                disabled={quantity >= product.stock}
              >
                <Ionicons name="add" size={responsiveDims.smallIconSize} color={quantity >= product.stock ? "#ccc" : "#333"} />
              </TouchableOpacity>
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
        </ThemedView>

        {/* Sección de estadísticas de reseñas */}
        {reviewStats && reviewStats.totalResenas > 0 && (
          <ReviewStats
            stats={reviewStats}
            onWriteReview={handleWriteReview}
            canWriteReview={canReviewData?.canReview || false}
          />
        )}

        {/* Sección de reseñas */}
        <ReviewsList
          productId={`${id}`}
          onWriteReview={handleWriteReview}
          canWriteReview={canReviewData?.canReview || false}
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
    elevation: 5,
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
    backgroundColor: '#f8f9fa',
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
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quantityButtonDisabled: {
    backgroundColor: '#f5f5f5',
    elevation: 0,
  },
  quantityDisplay: {
    minWidth: 60,
    height: 45,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quantityText: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    // fontSize se define dinámicamente
  },
  actionButtons: {
    marginTop: 10,
    position: 'relative',
  },
  addToCartButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    elevation: 4,
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
    elevation: 0,
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
});
