import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { ReviewStats as ReviewStatsType } from '@/core/api/reviewsApi';

interface ReviewStatsProps {
  stats: ReviewStatsType;
  onWriteReview?: () => void;
  canWriteReview?: boolean;
}

export const ReviewStats: React.FC<ReviewStatsProps> = ({ 
  stats, 
  onWriteReview, 
  canWriteReview = false 
}) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Ionicons
            key={i}
            name="star"
            size={20}
            color="#FFD700"
          />
        );
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <Ionicons
            key={i}
            name="star-half"
            size={20}
            color="#FFD700"
          />
        );
      } else {
        stars.push(
          <Ionicons
            key={i}
            name="star-outline"
            size={20}
            color="#ccc"
          />
        );
      }
    }
    return stars;
  };

  const getRatingText = (rating: number) => {
    if (rating >= 4.5) return 'Excelente';
    if (rating >= 4.0) return 'Muy bueno';
    if (rating >= 3.0) return 'Bueno';
    if (rating >= 2.0) return 'Regular';
    return 'Malo';
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Calificaciones</ThemedText>
        {canWriteReview && (
          <TouchableOpacity
            style={[styles.writeReviewButton, { backgroundColor: tintColor }]}
            onPress={onWriteReview}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color="white" />
            <ThemedText style={styles.writeReviewText}>Escribir reseña</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        {/* Rating principal */}
        <View style={styles.mainRating}>
          <View style={styles.ratingNumber}>
            <ThemedText style={[styles.ratingValue, { color: tintColor }]}>
              {stats.promedioCalificacion.toFixed(1)}
            </ThemedText>
            <ThemedText style={styles.ratingMax}>/5</ThemedText>
          </View>
          
          <View style={styles.starsContainer}>
            {renderStars(stats.promedioCalificacion)}
          </View>
          
          <ThemedText style={styles.ratingText}>
            {getRatingText(stats.promedioCalificacion)}
          </ThemedText>
          
          <ThemedText style={styles.totalReviews}>
            Basado en {stats.totalResenas} {stats.totalResenas === 1 ? 'reseña' : 'reseñas'}
          </ThemedText>
        </View>

        {/* Distribución de calificaciones */}
        {stats.totalResenas > 0 && (
          <View style={styles.distribution}>
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.distribucion[rating as keyof typeof stats.distribucion];
              const percentage = stats.totalResenas > 0 ? (count / stats.totalResenas) * 100 : 0;
              
              return (
                <View key={rating} style={styles.ratingBar}>
                  <View style={styles.ratingLabel}>
                    <ThemedText style={styles.ratingLabelText}>{rating}</ThemedText>
                    <Ionicons name="star" size={12} color="#FFD700" />
                  </View>
                  
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { backgroundColor: '#e0e0e0' }]}>
                      <View 
                        style={[
                          styles.barFill, 
                          { 
                            width: `${percentage}%`,
                            backgroundColor: tintColor 
                          }
                        ]} 
                      />
                    </View>
                  </View>
                  
                  <ThemedText style={styles.ratingCount}>{count}</ThemedText>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 6,
    marginVertical: 6,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  writeReviewText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  mainRating: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 60,
  },
  ratingNumber: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  ratingMax: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  totalReviews: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
  },
  distribution: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  ratingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 18,
  },
  ratingLabelText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#333',
    marginRight: 2,
  },
  barContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  ratingCount: {
    fontSize: 9,
    color: '#666',
    width: 14,
    textAlign: 'right',
  },
});
