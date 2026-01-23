import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ThemedText } from '@/presentation/theme/components/ThemedText';
import { ThemedView } from '@/presentation/theme/components/ThemedView';
import { useThemeColor } from '@/presentation/theme/hooks/useThemeColor';

interface PSEDataFormProps {
  onDataSelected: (data: {
    tipoIdentificacion?: string;
    numeroIdentificacion?: string;
  }) => void;
  initialData?: {
    tipoIdentificacion?: string;
    numeroIdentificacion?: string;
  };
  userNumeroIdentificacion?: string;
  userTipoIdentificacion?: string;
}

export function PSEDataForm({
  onDataSelected,
  initialData,
  userNumeroIdentificacion,
  userTipoIdentificacion,
}: PSEDataFormProps) {
  const [tipoIdentificacion, setTipoIdentificacion] = useState<string>(
    initialData?.tipoIdentificacion || userTipoIdentificacion || 'CC'
  );
  const [numeroIdentificacion, setNumeroIdentificacion] = useState<string>(
    initialData?.numeroIdentificacion || userNumeroIdentificacion || ''
  );

  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  // Validar y enviar datos cuando cambien (opcional para Web Checkout)
  React.useEffect(() => {
    onDataSelected({
      tipoIdentificacion: tipoIdentificacion || 'CC',
      numeroIdentificacion: numeroIdentificacion || '',
    });
  }, [tipoIdentificacion, numeroIdentificacion]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Datos para Pago PSE</ThemedText>
      <ThemedText style={styles.subtitle}>
        Completa la información necesaria para procesar tu pago. Estos datos ayudarán a pre-llenar información en el checkout de Wompi.
      </ThemedText>
      <ThemedText style={styles.webCheckoutNote}>
        ℹ️ Nota: Con Web Checkout, seleccionarás PSE como método de pago en la interfaz de Wompi. Este formulario ayuda a pre-llenar tus datos.
      </ThemedText>

      {/* Tipo de Identificación */}
      <View style={styles.section}>
        <ThemedText style={styles.label}>Tipo de Documento *</ThemedText>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[
              styles.radioOption,
              tipoIdentificacion === 'CC' && { backgroundColor: tintColor + '20', borderColor: tintColor },
            ]}
            onPress={() => setTipoIdentificacion('CC')}
          >
            <View style={styles.radioCircle}>
              {tipoIdentificacion === 'CC' && <View style={[styles.radioInner, { backgroundColor: tintColor }]} />}
            </View>
            <ThemedText style={styles.radioLabel}>Cédula de Ciudadanía (CC)</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.radioOption,
              tipoIdentificacion === 'NIT' && { backgroundColor: tintColor + '20', borderColor: tintColor },
            ]}
            onPress={() => setTipoIdentificacion('NIT')}
          >
            <View style={styles.radioCircle}>
              {tipoIdentificacion === 'NIT' && <View style={[styles.radioInner, { backgroundColor: tintColor }]} />}
            </View>
            <ThemedText style={styles.radioLabel}>NIT (Empresa)</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Número de Identificación */}
      <View style={styles.section}>
        <ThemedText style={styles.label}>Número de Documento *</ThemedText>
        <TextInput
          style={[
            styles.textInput,
            { borderColor: borderColor || '#ddd' },
            numeroIdentificacion && { borderColor: tintColor },
          ]}
          value={numeroIdentificacion}
          onChangeText={setNumeroIdentificacion}
          placeholder="Ingresa tu número de documento"
          keyboardType="numeric"
          autoCapitalize="none"
          autoCorrect={false}
        />
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
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: 16,
  },
  textInput: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    minHeight: 50,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
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
