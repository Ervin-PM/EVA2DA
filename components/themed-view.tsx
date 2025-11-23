import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

// Provides the app-wide background gradient and preserves caller styles/props.
export function ThemedView({ style, lightColor, darkColor, children, ...otherProps }: ThemedViewProps) {
  // keep hook for potential theming extensions, but we will render transparent
  // so the gradient remains visible behind children.
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  // Use the same gradient colors as the Home screen so all views share the background.
  const colors = ['#0B5FA5', '#3F88C5', '#FFD400'];

  // Do not force flex:1 by default — caller decides sizing. If caller passes a style
  // with flex:1 (typical for full-screen views), the gradient will fill the screen.
  return (
    <LinearGradient
      colors={['#0B5FA5', '#3F88C5', '#FFD400'] as any}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={style}
    >
      <View style={[{ backgroundColor: 'transparent' }]} {...otherProps}>
        {children}
      </View>
    </LinearGradient>
  );
}
