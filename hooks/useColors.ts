// ============================================
// YOROI - HOOK COULEURS DYNAMIQUES
// ============================================
// Utilise les couleurs du theme Tiffany Dark

import { useMemo } from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { TIFFANY, COLORS } from '@/constants/appTheme';

/**
 * Hook qui retourne les couleurs dynamiques basees sur le theme actif
 * Utiliser ce hook au lieu d'importer COLORS de constants/design
 */
export const useColors = () => {
  const { theme, colors, isDark } = useTheme();

  return useMemo(() => ({
    // Background - utilise le theme actif
    background: TIFFANY.background,
    backgroundAlt: TIFFANY.backgroundCard,
    backgroundElevated: TIFFANY.backgroundElevated,

    // Surfaces
    surface: TIFFANY.backgroundCard,
    surfaceLight: TIFFANY.backgroundElevated,
    surfaceBorder: TIFFANY.border,

    // Primary - utilise l'accent du theme
    primary: TIFFANY.accent,
    primaryDark: TIFFANY.accentDark,
    primaryLight: TIFFANY.accentLight,
    primaryMuted: TIFFANY.accentMuted,
    primaryGlow: TIFFANY.accentGlow,

    // Accent (secondary)
    accent: colors.secondary,
    accentDark: colors.secondary,
    accentLight: colors.secondaryLight,
    accentMuted: colors.secondaryMuted,
    accentGlow: `${colors.secondary}40`,

    // Text
    text: TIFFANY.textPrimary,
    textSecondary: TIFFANY.textSecondary,
    textMuted: TIFFANY.textMuted,
    textDim: TIFFANY.textMuted,
    textOnPrimary: '#FFFFFF',

    // States
    success: TIFFANY.success,
    successLight: TIFFANY.successLight,
    successMuted: TIFFANY.successMuted,

    error: TIFFANY.error,
    errorLight: TIFFANY.errorLight,
    errorMuted: TIFFANY.errorMuted,

    warning: TIFFANY.warning,
    warningLight: TIFFANY.warningLight,
    warningMuted: TIFFANY.warningMuted,

    info: TIFFANY.info,
    infoLight: TIFFANY.infoLight,
    infoMuted: TIFFANY.infoMuted,

    // Special colors
    gold: TIFFANY.accent,
    goldLight: TIFFANY.accentLight,
    goldMuted: TIFFANY.accentMuted,

    purple: colors.purple,
    purpleLight: colors.purpleLight,
    purpleMuted: colors.purpleMuted,

    pink: '#EC4899',
    pinkLight: 'rgba(236, 72, 153, 0.15)',
    pinkMuted: 'rgba(236, 72, 153, 0.1)',

    cyan: colors.water,
    cyanLight: colors.waterLight,
    cyanMuted: `${colors.water}20`,

    // Avatar
    avatarBg: TIFFANY.backgroundCard,
    avatarGlow: TIFFANY.accentGlow,

    // Tab bar
    tabBar: TIFFANY.backgroundCard,
    tabBarActive: TIFFANY.accent,
    tabBarInactive: TIFFANY.textMuted,

    // Charts
    chart1: TIFFANY.accent,
    chart2: colors.secondary,
    chart3: TIFFANY.info,
    chart4: TIFFANY.warning,
    chartBackground: TIFFANY.backgroundCard,

    // Glass (for compatibility)
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: TIFFANY.border,

    // Border
    border: TIFFANY.border,
    borderLight: TIFFANY.borderLight,
    divider: TIFFANY.border,

    // isDark flag
    isDark: true,
  }), [theme, colors, isDark]);
};

/**
 * Hook qui retourne les gradients dynamiques basees sur le theme actif
 */
export const useGradients = () => {
  const { gradients, colors } = useTheme();

  return useMemo(() => ({
    primary: gradients.primary,
    primaryVibrant: [TIFFANY.accent, TIFFANY.accentDark] as [string, string],
    accent: gradients.secondary,
    accentVibrant: gradients.secondary,
    sunset: [colors.fire, TIFFANY.warning] as [string, string],
    ocean: [colors.water, colors.secondary] as [string, string],
    aurora: [colors.fire, colors.secondary, colors.water] as [string, string, string],
    success: gradients.success,
    error: gradients.danger,
    warning: [TIFFANY.warning, colors.fire] as [string, string],
    info: gradients.info,
    gold: gradients.gold,
    purple: [colors.purple, colors.purpleLight] as [string, string],
    pink: ['#EC4899', '#F472B6'] as [string, string],
    surface: [TIFFANY.backgroundCard, TIFFANY.backgroundElevated] as [string, string],
    card: [TIFFANY.backgroundCard, TIFFANY.backgroundElevated] as [string, string],
  }), [gradients, colors]);
};

/**
 * Hook qui retourne les ombres dynamiques basees sur le theme actif
 */
export const useShadows = () => {
  return useMemo(() => ({
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 12,
    },
    glow: {
      shadowColor: TIFFANY.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
    glowAccent: {
      shadowColor: TIFFANY.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
  }), []);
};
