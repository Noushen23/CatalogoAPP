import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { ReviewSimple } from '@/core/api/reviewsApi';
import { formatDate } from '@/presentation/utils';

interface ReviewCardProps {
  review: ReviewSimple;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={16}
          color={i <= rating ? "#FFD700" : "#ccc"}
        />
      );
    }
    return stars;
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: cardBackground }]}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <ThemedText style={styles.userName}>{review.usuario.nombreCompleto}</ThemedText>
          <ThemedText style={styles.reviewDate}>{formatDate(review.fechaCreacion)}</ThemedText>
        </View>
        
        <View style={styles.ratingContainer}>
          {renderStars(review.calificacion)}
        </View>
      </View>

      {review.comentario && (
        <View style={styles.commentContainer}>
          <ThemedText style={styles.comment}>{review.comentario}</ThemedText>
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentContainer: {
    marginTop: 8,
  },
  comment: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
});
