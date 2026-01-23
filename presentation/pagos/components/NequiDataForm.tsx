import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';

interface NequiDataFormProps {
  onDataSelected: (data: { telefono: string }) => void;
  initialData?: {
    telefono?: string;
  };
  userTelefono?: string;
}

export function NequiDataForm({
  onDataSelected,
  initialData,
  userTelefono,
}: NequiDataFormProps) {
  const [telefono, setTelefono] = useState<string>(
    initialData?.telefono || userTelefono || ''
  );

  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  // Validar y enviar datos cuando cambien (opcional para Web Checkout)
  React.useEffect(() => {
    // Enviar datos incluso si no están completos, para que el backend pueda pre-llenar información
    if (telefono && telefono.length > 0) {
      onDataSelected({ telefono: telefono.trim() });
    } else {
      // Si está vacío, enviar null para indicar que no hay datos
      onDataSelected({ telefono: '' });
    }
  }, [telefono]);

  const handleTelefonoChange = (text: string) => {
    // Solo permitir números
    const numericText = text.replace(/[^0-9]/g, '');
    setTelefono(numericText);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Datos para Pago Nequi</ThemedText>
      <ThemedText style={styles.subtitle}>
        Ingresa el número de teléfono Nequi con el que realizarás el pago. Este dato ayudará a pre-llenar información en el checkout de Wompi.
      </ThemedText>
      <ThemedText style={styles.webCheckoutNote}>
        ℹ️ Nota: Con Web Checkout, seleccionarás Nequi como método de pago en la interfaz de Wompi. Este formulario ayuda a pre-llenar tus datos.
      </ThemedText>

      {/* Número de Teléfono Nequi */}
      <View style={styles.section}>
        <ThemedText style={styles.label}>Número de Teléfono (opcional)</ThemedText>
        
        <TextInput
          style={[
            styles.textInput,
            { borderColor: borderColor || '#ddd' },
            telefono && telefono.length >= 10 && { borderColor: tintColor },
          ]}
          value={telefono}
          onChangeText={handleTelefonoChange}
          placeholder="Ej: 3991111111"
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={15}
        />
        
        {telefono && telefono.length > 0 && telefono.length < 10 && (
          <ThemedText style={styles.warningText}>
            ⚠️ El número debe tener al menos 10 dígitos para ser válido
          </ThemedText>
        )}
        
        {telefono && telefono.length >= 10 && (
          <ThemedText style={styles.successText}>
            ✓ Número válido
          </ThemedText>
        )}
        
        {!telefono && (
          <ThemedText style={styles.hintText}>
            Puedes dejar este campo vacío y completarlo en el checkout de Wompi
          </ThemedText>
        )}
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
    marginBottom: 12,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  textInput: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 50,
    fontSize: 16,
    backgroundColor: '#fff',
    marginTop: 12,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 8,
  },
  warningText: {
    color: '#f57c00',
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
});
