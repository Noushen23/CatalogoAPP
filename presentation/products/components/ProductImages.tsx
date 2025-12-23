import React, { useState, useEffect } from 'react';
import { View, Image, FlatList, TouchableOpacity, Dimensions, Modal, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProductImage {
  id: string;
  url?: string;
  urlImagen?: string;
  url_imagen?: string;
  orden?: number;
  es_principal?: boolean;
}

interface Props {
  images: string[] | ProductImage[];
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');

const ProductImages = ({ images, style }: Props) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  // Helper para validar URLs de imágenes
  const isValidImageUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    
    const trimmedUrl = url.trim();
    if (trimmedUrl === '') return false;
    
    try {
      new URL(trimmedUrl);
      return true;
    } catch {
      return false;
    }
  };

  // Debug: Log de imágenes recibidas
  useEffect(() => {
    console.log('🖼️ [ProductImages] Imágenes recibidas:', {
      total: images?.length || 0,
      esArray: Array.isArray(images),
      tipoPrimerElemento: images?.[0] ? typeof images[0] : 'undefined',
      primerElemento: images?.[0],
      todosLosElementos: images,
      estructuraCompleta: JSON.stringify(images, null, 2)
    });
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.noImageContainer}>
          <Ionicons name="image-outline" size={80} color="#ccc" />
          <Text style={styles.noImageText}>Sin imágenes disponibles</Text>
        </View>
      </View>
    );
  }

  // Transformar y filtrar imágenes válidas
  const validImages = images
    .map((img, index) => {
      if (typeof img === 'string') {
        const trimmedUrl = img.trim();
        const isValid = isValidImageUrl(trimmedUrl);
        if (!isValid) {
          console.warn(`⚠️ Imagen ${index} (string) inválida:`, trimmedUrl);
        }
        return isValid ? trimmedUrl : null;
      } else if (img && typeof img === 'object') {
        // Buscar URL en todos los campos posibles (url, urlImagen, url_imagen)
        const url = img.url || img.urlImagen || img.url_imagen || '';
        const trimmedUrl = url ? url.trim() : '';
        const isValid = isValidImageUrl(trimmedUrl);
        if (!isValid && url) {
          console.warn(`⚠️ Imagen ${index} (objeto) inválida:`, { url, trimmedUrl, img });
        }
        return isValid ? trimmedUrl : null;
      }
      console.warn(`⚠️ Imagen ${index} tiene formato desconocido:`, typeof img, img);
      return null;
    })
    .filter((img): img is string => img !== null && img !== '');
  
  // Debug: Log de imágenes válidas
  useEffect(() => {
    console.log('✅ ProductImages - Imágenes válidas después de filtrar:', {
      total: validImages.length,
      urls: validImages
    });
  }, [validImages.length]);
  
  if (validImages.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.noImageContainer}>
          <Ionicons name="image-outline" size={80} color="#ccc" />
          <Text style={styles.noImageText}>Imágenes no válidas</Text>
        </View>
      </View>
    );
  }

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const renderImage = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      onPress={() => openImageModal(index)}
      style={styles.imageItem}
    >
      <Image
        source={{ uri: item }}
        style={styles.image}
        resizeMode="cover"
        onError={(error) => {
          console.warn('⚠️ Error cargando imagen:', item, error.nativeEvent.error);
        }}
        onLoad={() => {
          console.log('✅ Imagen cargada exitosamente:', item);
        }}
      />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={validImages}
        keyExtractor={(item, index) => `${item}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderImage}
        contentContainerStyle={styles.imagesList}
      />
      
      {/* Indicador de imágenes */}
      {validImages.length > 1 && (
        <View style={styles.dotsContainer}>
          {validImages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === selectedImageIndex && styles.activeDot
              ]}
            />
          ))}
        </View>
      )}

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
          
          <FlatList
            data={validImages}
            keyExtractor={(item, index) => `modal-${item}-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedImageIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={styles.modalImageContainer}>
                <Image
                  source={{ uri: item }}
                  style={styles.modalImage}
                  resizeMode="contain"
                  onError={(error) => {
                    console.warn('⚠️ Error cargando imagen modal:', item, error.nativeEvent.error);
                  }}
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  noImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  noImageText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  imagesList: {
    paddingHorizontal: 10,

  },
  imageItem: {
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 10,
    marginTop: 10,
    marginLeft: 10,
  },
  image: {
    width: 260,
    height: 280,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#007AFF',
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
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: screenWidth,
    height: '80%',
  },
});

export default ProductImages;
