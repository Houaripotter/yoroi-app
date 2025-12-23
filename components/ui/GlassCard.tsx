import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// GLASS CARD - LIQUID GLASS DESIGN iOS 26
// ============================================
// Effet verre depoli premium avec :
// - Fond blur (frosted glass)
// - Bordure lumineuse subtile
// - Reflet en haut
// - Ombre douce
// ============================================

interface GlassCardProps {
  children: React.ReactNode;
  intensity?: number; // 0-100, default 20
  style?: ViewStyle;
  variant?: 'default' | 'gold' | 'elevated' | 'solid';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noBorder?: boolean;
  noHighlight?: boolean;
}

export function GlassCard({
  children,
  intensity = 20,
  style,
  variant = 'default',
  padding = 'md',
  noBorder = false,
  noHighlight = false,
}: GlassCardProps) {
  const { colors, isDark } = useTheme();

  const paddingValues = {
    none: 0,
    sm: 12,
    md: 16,
    lg: 20,
  };

  // Couleurs selon le variant
  const variantColors = {
    default: {
      background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      highlight: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)',
    },
    gold: {
      background: isDark ? 'rgba(212, 175, 55, 0.05)' : 'rgba(212, 175, 55, 0.03)',
      border: isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)',
      highlight: isDark ? 'rgba(212, 175, 55, 0.25)' : 'rgba(212, 175, 55, 0.2)',
    },
    elevated: {
      background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
      border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      highlight: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.9)',
    },
    solid: {
      background: isDark ? colors.card : colors.card,
      border: colors.border,
      highlight: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
    },
  };

  const currentVariant = variantColors[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: currentVariant.background,
          borderColor: noBorder ? 'transparent' : currentVariant.border,
        },
        variant === 'elevated' && styles.elevated,
        style,
      ]}
    >
      {/* Fond blur - uniquement sur iOS pour les performances */}
      {Platform.OS === 'ios' && variant !== 'solid' && (
        <BlurView
          intensity={intensity}
          style={StyleSheet.absoluteFill}
          tint={isDark ? 'dark' : 'light'}
        />
      )}

      {/* Bordure lumineuse en haut (highlight) */}
      {!noHighlight && (
        <LinearGradient
          colors={[currentVariant.highlight, 'transparent']}
          style={styles.topHighlight}
        />
      )}

      {/* Contenu */}
      <View style={[styles.content, { padding: paddingValues[padding] }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    // Ombre douce
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
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});

export default GlassCard;
