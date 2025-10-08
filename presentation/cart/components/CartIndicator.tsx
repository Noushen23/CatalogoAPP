import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';
import { useCartSummary } from '../hooks/useCart';

interface CartIndicatorProps {
  onPress?: () => void;
  showText?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const CartIndicator: React.FC<CartIndicatorProps> = ({
  onPress,
  showText = true,
  size = 'medium',
}) => {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');
  
  const { data: cartSummary, isLoading } = useCartSummary();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          icon: 18,
          badge: styles.smallBadge,
          text: styles.smallText,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          icon: 28,
          badge: styles.largeBadge,
          text: styles.largeText,
        };
      default: // medium
        return {
          container: styles.mediumContainer,
          icon: 24,
          badge: styles.mediumBadge,
          text: styles.mediumText,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const itemCount = cartSummary?.totalItems || 0;
  const hasItems = itemCount > 0;

  if (isLoading) {
    return (
      <View style={[sizeStyles.container, { backgroundColor }]}>
        <Ionicons name="cart-outline" size={sizeStyles.icon} color="#ccc" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[sizeStyles.container, { backgroundColor }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Ionicons 
        name={hasItems ? "cart" : "cart-outline"} 
        size={sizeStyles.icon} 
        color={hasItems ? tintColor : "#666"} 
      />
      
      {/* Badge con cantidad */}
      {hasItems && (
        <View style={[sizeStyles.badge, { backgroundColor: tintColor }]}>
          <ThemedText style={styles.badgeText}>
            {itemCount > 99 ? '99+' : itemCount}
          </ThemedText>
        </View>
      )}

      {/* Texto opcional */}
      {showText && (
        <View style={styles.textContainer}>
          <ThemedText style={[sizeStyles.text, { color: hasItems ? tintColor : "#666" }]}>
            {hasItems ? `$${cartSummary?.total.toLocaleString()}` : 'Carrito'}
          </ThemedText>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // --- Contenedores por tamaño ---
  smallContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    minWidth: 36,
    minHeight: 32,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  mediumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    minWidth: 44,
    minHeight: 38,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  largeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    minWidth: 56,
    minHeight: 48,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 3,
  },

  // --- Badges por tamaño ---
  smallBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },
  mediumBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },
  largeBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 2,
  },

  // --- Textos por tamaño ---
  smallText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
    color: '#222',
    letterSpacing: 0.1,
  },
  mediumText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    color: '#222',
    letterSpacing: 0.1,
  },
  largeText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
    color: '#222',
    letterSpacing: 0.15,
  },

  // --- Estilos comunes ---
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center', // Centra verticalmente en Android
    alignSelf: 'center',
    includeFontPadding: false,
    paddingHorizontal: 2,
    minWidth: 16,
    lineHeight: 16,
  },
  textContainer: {
    marginLeft: 4,
    justifyContent: 'center',
  },
});


