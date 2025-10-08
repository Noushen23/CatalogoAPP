import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';

export default function ModeSelectionScreen() {
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  const handleCustomerMode = () => {
    // Redirigir al login para usuarios no autenticados
    router.replace('/auth/login');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="storefront" size={80} color={tintColor} />
          <ThemedText style={styles.title}>Bienvenido</ThemedText>
          <ThemedText style={styles.subtitle}>
            Selecciona el modo que deseas usar
          </ThemedText>
        </View>

        <View style={styles.modesContainer}>
          {/* Modo Cliente */}
          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor }]}
            onPress={handleCustomerMode}
          >
            <View style={[styles.modeIcon, { backgroundColor: '#4CAF50' + '20' }]}>
              <Ionicons name="person" size={40} color="#4CAF50" />
            </View>
            
            <ThemedText style={styles.modeTitle}>Modo Cliente</ThemedText>
            <ThemedText style={styles.modeDescription}>
              Explora productos y realiza pedidos
            </ThemedText>
            
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={16} color="#4CAF50" />
                <ThemedText style={styles.featureText}>Ver catálogo de productos</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={16} color="#4CAF50" />
                <ThemedText style={styles.featureText}>Agregar al carrito</ThemedText>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark" size={16} color="#4CAF50" />
                <ThemedText style={styles.featureText}>Realizar pedidos</ThemedText>
              </View>
            </View>
          </TouchableOpacity>

        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            ¡Bienvenido a nuestra tienda online!
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modesContainer: {
    gap: 20,
  },
  modeCard: {
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modeDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresList: {
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    marginLeft: 10,
    color: '#666',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

