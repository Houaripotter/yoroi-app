import React, { ReactNode } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TIFFANY } from '@/constants/appTheme';

// ============================================
// GRADIENT BACKGROUND - TIFFANY DARK
// ============================================
// Gris anthracite avec subtle glow effects
// ============================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GradientBackgroundProps {
  children: ReactNode;
  variant?: 'default' | 'subtle' | 'accent';
  style?: object;
}

export function GradientBackground({
  children,
  variant = 'default',
  style,
}: GradientBackgroundProps) {
  // Tiffany Dark gradients
  const getGradientColors = (): [string, string, string] => {
    switch (variant) {
      case 'accent':
        return [TIFFANY.background, TIFFANY.backgroundCard, TIFFANY.background];
      case 'subtle':
        return [TIFFANY.background, TIFFANY.background, TIFFANY.backgroundCard];
      default:
        return [TIFFANY.background, TIFFANY.background, TIFFANY.background];
    }
  };

  const gradientColors = getGradientColors();

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {children}
    </View>
  );
}

// Composant pour ajouter un effet de glow Tiffany
export function AmbientGlow({
  color,
  position = 'top-right',
  opacity = 0.15,
  size = 300,
}: {
  color?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  size?: number;
}) {
  const glowColor = color || TIFFANY.accent;

  const positionStyles: Record<string, object> = {
    'top-left': { top: -size / 2, left: -size / 2 },
    'top-right': { top: -size / 2, right: -size / 2 },
    'bottom-left': { bottom: -size / 2, left: -size / 2 },
    'bottom-right': { bottom: -size / 2, right: -size / 2 },
    center: { top: '30%', left: '50%', marginLeft: -size / 2 },
  };

  return (
    <View
      style={[
        styles.glow,
        positionStyles[position],
        {
          width: size,
          height: size,
          backgroundColor: glowColor,
          opacity,
        },
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TIFFANY.background,
  },
  glow: {
    position: 'absolute',
    borderRadius: 9999,
    // Blur effect via shadows
    shadowColor: 'currentColor',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 100,
  },
});

export default GradientBackground;
