import { Link, LinkProps } from 'expo-router';
import { Text, StyleSheet } from 'react-native';

import { useThemeColor } from '../hooks/useThemeColor';

interface Props extends LinkProps {
  text?: string;
  style?: any;
}

const ThemedLink = ({ style, text, children, ...rest }: Props) => {
  const primaryColor = useThemeColor({}, 'primary');

  return (
    <Link {...rest}>
      <Text style={[styles.linkText, { color: primaryColor }, style]}>
        {text || children}
      </Text>
    </Link>
  );
};

const styles = StyleSheet.create({
  linkText: {
    textDecorationLine: 'underline',
  },
});
export default ThemedLink;
