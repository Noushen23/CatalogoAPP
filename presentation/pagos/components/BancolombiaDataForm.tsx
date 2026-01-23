import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';

interface BancolombiaDataFormProps {
  onDataSelected: (data: { descripcionPago: string }) => void;
  initialData?: {
    descripcionPago?: string;
  };
  defaultDescription?: string;
}

const MAX_LENGTH = 64;

export function BancolombiaDataForm({
  onDataSelected,
  initialData,
  defaultDescription,
}: BancolombiaDataFormProps) {
  const [descripcionPago, setDescripcionPago] = useState<string>(
    initialData?.descripcionPago || defaultDescription || ''
  );

  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  // Validar y enviar datos cuando cambien (opcional para Web Checkout)
  React.useEffect(() => {
    // Enviar datos incluso si están vacíos, para que el backend pueda usar valores por defecto
    // El backend usará esta descripción para el payment_description en la transacción
    onDataSelected({ descripcionPago: descripcionPago.trim() });
  }, [descripcionPago]);

  const handleDescripcionChange = (text: string) => {
    // Limitar a 64 caracteres
    if (text.length <= MAX_LENGTH) {
      setDescripcionPago(text);
    }
  };

  const caracteresRestantes = MAX_LENGTH - descripcionPago.length;
  const isNearLimit = caracteresRestantes <= 10;

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Datos para Transferencia Bancolombia</ThemedText>
      <ThemedText style={styles.subtitle}>
        Ingresa una descripción para identificar tu pago. Este dato ayudará a pre-llenar información en el checkout de Wompi.
      </ThemedText>
      <ThemedText style={styles.webCheckoutNote}>
        ℹ️ Nota: Con Web Checkout, seleccionarás Transferencia Bancolombia como método de pago en la interfaz de Wompi. Este formulario ayuda a pre-llenar la descripción del pago.
      </ThemedText>

      {/* Descripción del Pago */}
      <View style={styles.section}>
        <ThemedText style={styles.label}>Descripción del Pago *</ThemedText>
        <ThemedText style={styles.hint}>
          Esta descripción aparecerá en tu transferencia bancaria
        </ThemedText>
        
        <TextInput
          style={[
            styles.textInput,
            styles.textArea,
            { borderColor: borderColor || '#ddd' },
            descripcionPago && descripcionPago.length > 0 && { borderColor: tintColor },
          ]}
          value={descripcionPago}
          onChangeText={handleDescripcionChange}
          placeholder="Ej: Pago de pedido #12345"
          multiline
          numberOfLines={3}
          maxLength={MAX_LENGTH}
          autoCapitalize="sentences"
          autoCorrect={true}
        />
        
        <View style={styles.counterContainer}>
          <ThemedText
            style={[
              styles.counterText,
              isNearLimit && styles.counterTextWarning,
              caracteresRestantes === 0 && styles.counterTextError,
            ]}
          >
            {caracteresRestantes} caracteres restantes
          </ThemedText>
        </View>
        
        {descripcionPago && descripcionPago.trim().length === 0 && (
          <ThemedText style={styles.hintText}>
            Puedes dejar este campo vacío y el sistema usará una descripción por defecto
          </ThemedText>
        )}
        
        {descripcionPago && descripcionPago.trim().length > 0 && (
          <ThemedText style={styles.successText}>
            ✓ Descripción válida
          </ThemedText>
        )}
      </View>

      {/* Información adicional */}
      <View style={styles.infoContainer}>
        <ThemedText style={styles.infoTitle}>ℹ️ Información</ThemedText>
        <ThemedText style={styles.infoText}>
          • Completarás la transferencia dentro del Web Checkout de Wompi.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  textInput: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  counterContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  counterText: {
    fontSize: 12,
    color: '#666',
  },
  counterTextWarning: {
    color: '#f57c00',
    fontWeight: '600',
  },
  counterTextError: {
    color: '#d32f2f',
    fontWeight: '700',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 8,
  },
  hintText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  successText: {
    color: '#2e7d32',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  webCheckoutNote: {
    fontSize: 13,
    color: '#1976d2',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    fontStyle: 'italic',
  },
  infoContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
});
