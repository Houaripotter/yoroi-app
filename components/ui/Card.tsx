import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// CARD - LIQUID GLASS DESIGN iOS 26
// ============================================

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'gold' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noBorder?: boolean;
  noBlur?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'md',
  noBorder = false,
  noBlur = false,
}) => {
  const { colors, isDark, themeName } = useTheme();

  // All themes now use clean white cards
  const isWellness = false;

  const paddingValues = {
    none: 0,
    sm: 12,
    md: 16,
    lg: 20,
  };

  // Liquid Glass colors - Wellness Premium uses pure white cards
  const glassColors = {
    default: {
      background: isWellness ? '#FFFFFF' : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.7)'),
      border: isWellness ? 'rgba(0, 0, 0, 0.04)' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
      highlight: isWellness ? 'rgba(255, 255, 255, 1)' : (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.9)'),
    },
    gold: {
      background: isWellness ? '#FFFFFF' : (isDark ? 'rgba(212, 175, 55, 0.05)' : 'rgba(212, 175, 55, 0.05)'),
      border: isWellness ? 'rgba(125, 211, 216, 0.3)' : (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.2)'),
      highlight: isWellness ? 'rgba(125, 211, 216, 0.2)' : (isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.3)'),
    },
    elevated: {
      background: isWellness ? '#FFFFFF' : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.85)'),
      border: isWellness ? 'rgba(0, 0, 0, 0.02)' : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
      highlight: isWellness ? 'rgba(255, 255, 255, 1)' : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 1)'),
    },
  };

  const currentGlass = glassColors[variant];

  // Premium shadow styles for Wellness theme
  const wellnessShadow = isWellness ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  } : {};

  const wellnessElevatedShadow = isWellness ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  } : {};

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: currentGlass.background,
          borderColor: noBorder ? 'transparent' : currentGlass.border,
        },
        variant === 'elevated' && styles.elevated,
        isWellness && wellnessShadow,
        isWellness && variant === 'elevated' && wellnessElevatedShadow,
        style,
      ]}
    >
      {/* Blur effect - iOS only for performance */}
      {!noBlur && Platform.OS === 'ios' && isDark && (
        <BlurView
          intensity={20}
          style={StyleSheet.absoluteFill}
          tint="dark"
        />
      )}

      {/* Top highlight */}
      <LinearGradient
        colors={[currentGlass.highlight, 'transparent']}
        style={styles.highlight}
      />

      {/* Content */}
      <View style={[styles.content, { padding: paddingValues[padding] }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 2,
  },
});

export default Card;
