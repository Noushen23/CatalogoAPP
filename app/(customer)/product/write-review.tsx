import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import ThemedButton from '@/presentation/theme/components/ThemedButton';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useProduct } from '@/presentation/products/hooks/useProduct';
import { useCreateReview } from '@/presentation/reviews/hooks/useReviews';

export default function WriteReviewScreen() {
  const { productId } = useLocalSearchParams();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = '#fff';
  const borderColor = '#e0e0e0';

  // Obtener información del producto
  const { productQuery } = useProduct(`${productId}`);
  const createReviewMutation = useCreateReview();

  // Validar que se haya seleccionado una calificación
  const isRatingSelected = rating > 0;
  const canSubmit = isRatingSelected && !isSubmitting;

  // Renderizar estrellas interactivas
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          style={styles.starButton}
          onPress={() => setRating(i)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={i <= rating ? "star" : "star-outline"}
            size={40}
            color={i <= rating ? "#FFD700" : "#ccc"}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  // Obtener texto descriptivo de la calificación
  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Muy malo';
      case 2: return 'Malo';
      case 3: return 'Regular';
      case 4: return 'Bueno';
      case 5: return 'Excelente';
      default: return 'Selecciona una calificación';
    }
  };

  // Manejar envío de la reseña
  const handleSubmitReview = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      await createReviewMutation.mutateAsync({
        productId: `${productId}`,
        data: {
          calificacion: rating,
          comentario: comment.trim() || undefined,
        },
      });

      // Mostrar confirmación
      Alert.alert(
        '✅ Reseña enviada',
        'Tu reseña ha sido enviada exitosamente. Gracias por tu opinión.',
        [
          {
            text: 'Continuar',
            onPress: () => {
              // Navegar de vuelta al producto
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error al enviar reseña:', error);
      
      Alert.alert(
        'Error',
        'No se pudo enviar tu reseña. Por favor, intenta nuevamente.',
        [{ text: 'Entendido' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar loading si está cargando el producto
  if (productQuery.isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={tintColor} />
        <ThemedText style={styles.loadingText}>Cargando producto...</ThemedText>
      </View>
    );
  }

  // Mostrar error si no se puede cargar el producto
  if (productQuery.error || !productQuery.data) {
    return (
      <View style={[styles.errorContainer, { backgroundColor }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
        <ThemedText style={styles.errorTitle}>Error</ThemedText>
        <ThemedText style={styles.errorText}>
          No se pudo cargar la información del producto.
        </ThemedText>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: tintColor }]}
          onPress={() => router.back()}
        >
          <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            Volver
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const product = productQuery.data.product;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <ThemedText style={styles.headerTitle}>Escribir Reseña</ThemedText>
        
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Información del producto */}
        <ThemedView style={[styles.productCard, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText style={styles.productTitle}>{product.nombre}</ThemedText>
          <ThemedText style={styles.productPrice}>
            ${product.precioFinal.toLocaleString()}
          </ThemedText>
        </ThemedView>

        {/* Selección de calificación */}
        <ThemedView style={[styles.ratingCard, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Calificación</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            ¿Qué opinas de este producto?
          </ThemedText>
          
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>
          
          <ThemedText style={[
            styles.ratingText,
            { color: rating > 0 ? tintColor : '#999' }
          ]}>
            {getRatingText(rating)}
          </ThemedText>
        </ThemedView>

        {/* Comentario */}
        <ThemedView style={[styles.commentCard, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText style={styles.sectionTitle}>Comentario (Opcional)</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Comparte tu experiencia con otros compradores
          </ThemedText>
          
          <View style={[styles.textInputContainer, { borderColor }]}>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={6}
              placeholder="Escribe tu comentario aquí..."
              placeholderTextColor="#999"
              value={comment}
              onChangeText={setComment}
              maxLength={1000}
              textAlignVertical="top"
            />
          </View>
          
          <ThemedText style={styles.characterCount}>
            {comment.length}/1000 caracteres
          </ThemedText>
        </ThemedView>

        {/* Botón de envío */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            onPress={handleSubmitReview}
            disabled={!canSubmit}
            style={[
              styles.submitButton,
              { 
                backgroundColor: canSubmit ? tintColor : '#ccc',
                opacity: canSubmit ? 1 : 0.6
              }
            ]}
          >
            <ThemedText style={styles.submitButtonText}>
              {isSubmitting ? 'Enviando...' : 'Enviar Reseña'}
            </ThemedText>
          </TouchableOpacity>
          
          {!isRatingSelected && (
            <ThemedText style={styles.warningText}>
              ⚠️ Debes seleccionar una calificación para continuar
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
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
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: 24,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  productCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ratingCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  commentCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    backgroundColor: '#f8f9fa',
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1a1a1a',
    minHeight: 96,
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  submitContainer: {
    marginTop: 20,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  warningText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
});
