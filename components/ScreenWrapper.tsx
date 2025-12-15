import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// ⚔️ SCREEN WRAPPER - THEME GUERRIER
// ============================================
// Utilise useTheme() pour le fond dynamique
// S'adapte au mode clair/sombre

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  noPadding?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  style,
  edges = ['top', 'left', 'right'],
  noPadding = false,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.background, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <SafeAreaView style={styles.safeArea} edges={edges}>
        <View style={[styles.content, { backgroundColor: colors.background }, noPadding && { padding: 0 }, style]}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default ScreenWrapper;
