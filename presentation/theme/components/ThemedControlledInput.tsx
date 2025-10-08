import { Ionicons } from '@expo/vector-icons';
import {
  View,
  TextInputProps,
  StyleSheet,
  TextInput,
  ViewStyle,
} from 'react-native';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { useThemeColor } from '../hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { useRef, useState } from 'react';

interface Props<T extends FieldValues> extends Omit<TextInputProps, 'style'> {
  control: Control<T>;
  name: Path<T>;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

/**
 * Componente de input controlado por react-hook-form con soporte para iconos y validación
 */
const ThemedControlledInput = <T extends FieldValues>({ 
  control, 
  name, 
  icon, 
  style, 
  ...rest 
}: Props<T>) => {
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');

  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef<TextInput>(null);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={[styles.container, style]}>
          <View
            style={[
              styles.border,
              {
                borderColor: error 
                  ? '#F44336' 
                  : isActive 
                    ? primaryColor 
                    : '#ccc',
              },
            ]}
            onTouchStart={() => inputRef.current?.focus()}
          >
            {icon && (
              <Ionicons
                name={icon}
                size={24}
                color={error ? '#F44336' : textColor}
                style={styles.icon}
              />
            )}

            <TextInput
              ref={inputRef}
              placeholderTextColor="#5c5c5c"
              onFocus={() => setIsActive(true)}
              onBlur={() => {
                setIsActive(false);
                onBlur();
              }}
              onChangeText={onChange}
              value={value}
              style={[
                styles.input,
                {
                  color: textColor,
                },
              ]}
              {...rest}
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={14} color="#F44336" />
              <ThemedText style={styles.errorText}>
                {error.message}
              </ThemedText>
            </View>
          )}
        </View>
      )}
    />
  );
};

export default ThemedControlledInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  border: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 4,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginLeft: 4,
  },
});

