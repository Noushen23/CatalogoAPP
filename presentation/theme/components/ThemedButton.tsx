import { Ionicons } from '@expo/vector-icons';
import { Text, Pressable, PressableProps, StyleSheet } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';

interface Props extends PressableProps {
  children: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const ThemedButton = ({ children, icon, ...rest }: Props) => {
  const primaryColor = useThemeColor({}, 'primary');

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? primaryColor + '90' : primaryColor,
        },
        styles.button,
      ]}
      {...rest}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color="white"
          style={{ marginRight: 8 }}
        />
      )}
      <Text style={styles.buttonText}>{children}</Text>
    </Pressable>
  );
};
export default ThemedButton;

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
