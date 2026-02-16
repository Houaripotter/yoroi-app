import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// SCREEN WRAPPER - DESIGN PREMIUM
// ============================================
// Système à 2 couches :
// Couche 1: Fond coloré (bleu-gris #A8BDC9 ou couleur du thème)
// Couche 2: Container blanc opaque avec coins arrondis
// PAS de liquid glass, PAS de transparence

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  noPadding?: boolean;
  noContainer?: boolean;
  containerStyle?: ViewStyle;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  style,
  edges = ['top', 'left', 'right'],
  noPadding = false,
  noContainer = false,
  containerStyle,
}) => {
  const { isDark, screenBackground, containerBackground } = useTheme();
  const insets = useSafeAreaInsets();

  // Toujours utiliser le système 2 couches
  return (
    <View style={[styles.layer1, { backgroundColor: screenBackground }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {noContainer ? (
        // Sans container - juste le fond
        <SafeAreaView style={styles.safeArea} edges={edges}>
          <View style={[styles.content, noPadding && { padding: 0 }, style]}>
            {children}
          </View>
        </SafeAreaView>
      ) : (
        // Avec container blanc arrondi
        <View
          style={[
            styles.layer2Container,
            {
              marginTop: insets.top + 8,
              backgroundColor: containerBackground,
            },
            containerStyle,
          ]}
        >
          <View style={[styles.content, noPadding && { padding: 0 }, style]}>
            {children}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  layer1: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  layer2Container: {
    flex: 1,
    marginHorizontal: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    // Ombre premium
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
});

export default ScreenWrapper;
