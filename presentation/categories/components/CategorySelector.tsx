import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useCategories } from '../hooks/useCategories';

interface CategorySelectorProps {
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string | null) => void;
  showAllOption?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryId,
  onCategorySelect,
  showAllOption = true,
}) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  const { data: categoriesData, isLoading, error } = useCategories({ activa: true });
  const categories = categoriesData?.categories || [];

  const handleCategoryPress = (categoryId: string | null) => {
    onCategorySelect(categoryId);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={tintColor} />
        <ThemedText style={styles.loadingText}>Cargando categorías...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={20} color="#ef4444" />
        <ThemedText style={styles.errorText}>Error al cargar categorías</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {/* Opción "Todas" */}
        {showAllOption && (
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategoryId && styles.selectedChip,
            ]}
            onPress={() => handleCategoryPress(null)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="grid-outline" 
              size={16} 
              color={!selectedCategoryId ? 'white' : "#64748b"} 
            />
            <ThemedText
              style={[
                styles.chipText,
                { color: !selectedCategoryId ? 'white' : "#334155" }
              ]}
            >
              Todas
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Lista de categorías */}
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategoryId === category.id && styles.selectedChip,
            ]}
            onPress={() => handleCategoryPress(category.id)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="pricetag-outline" 
              size={16} 
              color={selectedCategoryId === category.id ? 'white' : "#64748b"} 
            />
            <ThemedText
              style={[
                styles.chipText,
                { color: selectedCategoryId === category.id ? 'white' : "#334155" }
              ]}
              numberOfLines={1}
            >
              {category.nombre}
            </ThemedText>
          </TouchableOpacity>
        ))}

        {/* Mensaje si no hay categorías */}
        {categories.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="library-outline" size={20} color="#94a3b8" />
            <ThemedText style={styles.emptyText}>Sin categorías</ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 50,
    backgroundColor: 'transparent',
    borderBottomWidth: 3,
    borderBottomColor: '#e2e8f0',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    marginBottom: 10,
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  scrollView: {
    flex: 5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 5,
    marginRight: 4,
    borderRadius: 25,
    borderWidth: 0,
    minHeight: 40,
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedChip: {
    backgroundColor: '#3b82f6',
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    transform: [{ scale: 1.02 }],
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    maxWidth: 120,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginLeft: 6,
    fontWeight: '500',
  },
});
