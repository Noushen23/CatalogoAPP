import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';

interface ProductImageProps {
  imageUrl?: string | null;
  productName?: string;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');

export const ProductImage: React.FC<ProductImageProps> = ({ 
  imageUrl, 
  productName, 
  style 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Debug: Log de props recibidas
  console.log('🖼️ ProductImage props:', {
    imageUrl,
    productName,
    hasImageUrl: !!imageUrl,
    imageUrlType: typeof imageUrl
  });

  const handleImageError = () => {
    console.log('❌ Error cargando imagen:', imageUrl);
    console.log('🔗 URL completa:', imageUrl);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    console.log('✅ Imagen cargada exitosamente:', imageUrl);
    setImageError(false);
    setImageLoading(false);
  };

  const openImageModal = () => {
    if (imageUrl && !imageError) {
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity 
        style={[styles.container, style]} 
        onPress={openImageModal}
        activeOpacity={imageUrl && !imageError ? 0.8 : 1}
        disabled={!imageUrl || imageError}
      >
        {imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        ) : (
          <View style={styles.placeholder}>
            <Image
              source={require('@/assets/images/no-product-image.png')}
              style={styles.defaultImage}
              resizeMode="contain"
            />
            <ThemedText style={styles.placeholderText}>
              {imageUrl ? 'Error de carga' : 'Sin imagen'}
            </ThemedText>
            {productName && (
              <ThemedText style={styles.productNameText} numberOfLines={2}>
                {productName}
              </ThemedText>
            )}
          </View>
        )}
        
        {/* Indicador de que es clickeable */}
        {imageUrl && !imageError && (
          <View style={styles.zoomIndicator}>
            <Ionicons name="expand-outline" size={16} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </TouchableOpacity>

      {/* Modal para vista ampliada */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          
          <View style={styles.modalImageContainer}>
            <Image
              source={{ uri: imageUrl || require('@/assets/images/no-product-image.png') }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </View>
          
          {productName && (
            <View style={styles.modalProductInfo}>
              <ThemedText style={styles.modalProductName}>
                {productName}
              </ThemedText>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  defaultImage: {
    width: 60,
    height: 60,
    opacity: 0.5,
  },
  placeholderText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  productNameText: {
    fontSize: 8,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  zoomIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  modalImageContainer: {
    width: screenWidth,
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: screenWidth,
    height: '100%',
  },
  modalProductInfo: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 16,
  },
  modalProductName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
