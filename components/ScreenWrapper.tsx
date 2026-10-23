import React, { memo } from 'react';
import { View, StyleSheet, ViewStyle, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';

// ============================================
// Enveloppe d'ecran (refonte v2, l'armure vivante)
// Fond papier de riz, kanji en filigrane, contenu pose directement sur le papier.
// API inchangee.
// ============================================

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: readonly ('top' | 'right' | 'bottom' | 'left')[];
  noPadding?: boolean;
  noContainer?: boolean;
  containerStyle?: ViewStyle;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = memo(({
  children,
  style,
  edges = ['top', 'left', 'right'] as const,
  noPadding = false,
  noContainer = false,
  containerStyle,
}) => {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.layer, { backgroundColor: c.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />


      {noContainer ? (
        <SafeAreaView style={styles.safeArea} edges={edges}>
          <View style={[styles.content, noPadding && { padding: 0 }, style]}>{children}</View>
        </SafeAreaView>
      ) : (
        <View style={[styles.container, { marginTop: insets.top + 4 }, containerStyle]}>
          <View style={[styles.content, noPadding && { padding: 0 }, style]}>{children}</View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: {
    flex: 1,
  },
  watermark: {
    position: 'absolute',
    right: -30,
    opacity: 0.7,
  },
  watermarkText: {
    lineHeight: 220,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default ScreenWrapper;
