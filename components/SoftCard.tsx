import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface SoftCardProps {
  children: ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
}

export function SoftCard({ children, style, backgroundColor }: SoftCardProps) {
  const { colors, isDark, themeName } = useTheme();
  const bgColor = backgroundColor || colors.card;
  const isWellness = false;

  return (
    <View style={[
      styles.container,
      { backgroundColor: bgColor },
      {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: isWellness ? 6 : 4 },
        shadowOpacity: isWellness ? 0.15 : (isDark ? 0.3 : 0.1),
        shadowRadius: isWellness ? 16 : 12,
        elevation: isWellness ? 10 : 6,
      },
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
  },
});
