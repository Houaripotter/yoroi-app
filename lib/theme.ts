import { Platform } from 'react-native';

// ============================================
// YOROI GUERRIER - THEME SAMOURAI
// Forge ton armure, deviens legende
// ============================================

// ═══════════════════════════════════════
// THEME SOMBRE (DEFAUT)
// ═══════════════════════════════════════
export const darkTheme = {
  mode: 'dark' as const,
  colors: {
    // === BACKGROUNDS ===
    background: '#0D0D0F',
    backgroundLight: '#1A1A1F',
    backgroundSecondary: '#1A1A1F',
    card: '#1E1E24',
    cardHover: '#252529',
    cardDark: '#16161A',

    // === OR (ACCENT PRINCIPAL) ===
    gold: '#D4AF37',
    goldLight: '#FFD700',
    goldDark: '#B8860B',
    goldMuted: 'rgba(212, 175, 55, 0.15)',

    // === ACCENTS SECONDAIRES ===
    success: '#22C55E',
    successMuted: 'rgba(34, 197, 94, 0.15)',
    danger: '#EF4444',
    dangerMuted: 'rgba(239, 68, 68, 0.15)',
    info: '#3B82F6',
    infoMuted: 'rgba(59, 130, 246, 0.15)',
    purple: '#A855F7',
    purpleMuted: 'rgba(168, 85, 247, 0.15)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.15)',
    cyan: '#22D3EE',
    cyanMuted: 'rgba(34, 211, 238, 0.15)',

    // === TEXTES ===
    textPrimary: '#FFFFFF',
    textSecondary: '#999999',
    textMuted: '#666666',
    textDisabled: '#444444',
    textOnGold: '#0D0D0F',

    // === BORDURES ===
    border: 'rgba(255, 255, 255, 0.1)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    borderGold: 'rgba(212, 175, 55, 0.3)',

    // === SPORTS (couleurs des cards d'entrainement) ===
    sports: {
      jjb: '#EF4444',
      mma: '#F97316',
      musculation: '#3B82F6',
      running: '#22C55E',
      natation: '#06B6D4',
      yoga: '#A855F7',
      boxe: '#DC2626',
      football: '#10B981',
      crossfit: '#F59E0B',
      velo: '#8B5CF6',
      padel: '#FBBF24',
    },

    // === TAB BAR ===
    tabBar: 'rgba(30, 30, 36, 0.95)',
    tabBarActive: '#D4AF37',
    tabBarInactive: '#666666',

    // === ALIAS LEGACY ===
    primary: '#D4AF37',
    primaryDark: '#B8860B',
    primaryLight: '#FFD700',
    secondary: '#D4AF37',
    accent: '#D4AF37',
    white: '#FFFFFF',
    error: '#EF4444',
    errorLight: 'rgba(239, 68, 68, 0.15)',
    successLight: 'rgba(34, 197, 94, 0.15)',
    warningLight: 'rgba(245, 158, 11, 0.15)',

    // === METRIQUES ===
    weight: '#D4AF37',
    bodyFat: '#F59E0B',
    muscle: '#22C55E',
    water: '#3B82F6',
    visceral: '#EF4444',
    bone: '#999999',

    // === PROGRESSIONS ===
    progressTrack: 'rgba(255, 255, 255, 0.1)',
    progressFill: '#D4AF37',

    // === BACKWARD COMPATIBILITY ALIASES ===
    surface: '#1E1E24',
    accentOrange: '#F59E0B',
    accentCyan: '#22D3EE',
    accentGreen: '#22C55E',
    accentPurple: '#A855F7',
    tertiary: '#666666',
    mintPastel: '#22C55E',
    turquoisePastel: '#22D3EE',
    orangePastel: '#F59E0B',
    beigeLight: '#1E1E24',
    gradientStart: '#D4AF37',
    gradientEnd: '#B8860B',
    statsBackground: '#1A1A1F',
    sheet: '#1E1E24',
    textLight: '#FFFFFF',
    metabolism: '#F59E0B',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowColorDark: 'rgba(0, 0, 0, 0.5)',
    backgroundDark: '#0D0D0F',
    cardLight: '#252529',
    secondaryLight: 'rgba(212, 175, 55, 0.15)',
  },

  // === GRADIENTS ===
  gradients: {
    gold: ['#D4AF37', '#B8860B'] as [string, string],
    goldShine: ['#D4AF37', '#FFD700', '#D4AF37'] as [string, string, string],
    card: ['#1E1E24', '#16161A'] as [string, string],
    background: ['#0D0D0F', '#1A1A1F', '#0D0D0F'] as [string, string, string],
    success: ['#22C55E', '#16A34A'] as [string, string],
    danger: ['#EF4444', '#DC2626'] as [string, string],
  },
};

// ═══════════════════════════════════════
// THEME CLAIR
// ═══════════════════════════════════════
export const lightTheme = {
  mode: 'light' as const,
  colors: {
    // === BACKGROUNDS ===
    background: '#F5F5F7',
    backgroundLight: '#FFFFFF',
    backgroundSecondary: '#FFFFFF',
    card: '#FFFFFF',
    cardHover: '#F0F0F2',
    cardDark: '#E8E8EA',

    // === OR (ACCENT PRINCIPAL - plus fonce pour contraste) ===
    gold: '#B8860B',
    goldLight: '#D4AF37',
    goldDark: '#996515',
    goldMuted: 'rgba(184, 134, 11, 0.12)',

    // === ACCENTS SECONDAIRES ===
    success: '#16A34A',
    successMuted: 'rgba(22, 163, 74, 0.12)',
    danger: '#DC2626',
    dangerMuted: 'rgba(220, 38, 38, 0.12)',
    info: '#2563EB',
    infoMuted: 'rgba(37, 99, 235, 0.12)',
    purple: '#9333EA',
    purpleMuted: 'rgba(147, 51, 234, 0.12)',
    warning: '#D97706',
    warningMuted: 'rgba(217, 119, 6, 0.12)',
    cyan: '#0891B2',
    cyanMuted: 'rgba(8, 145, 178, 0.12)',

    // === TEXTES ===
    textPrimary: '#1A1A1F',
    textSecondary: '#666666',
    textMuted: '#999999',
    textDisabled: '#CCCCCC',
    textOnGold: '#FFFFFF',

    // === BORDURES ===
    border: 'rgba(0, 0, 0, 0.08)',
    borderLight: 'rgba(0, 0, 0, 0.04)',
    borderGold: 'rgba(184, 134, 11, 0.3)',

    // === SPORTS (couleurs des cards d'entrainement) ===
    sports: {
      jjb: '#DC2626',
      mma: '#EA580C',
      musculation: '#2563EB',
      running: '#16A34A',
      natation: '#0891B2',
      yoga: '#9333EA',
      boxe: '#B91C1C',
      football: '#059669',
      crossfit: '#D97706',
      velo: '#7C3AED',
      padel: '#CA8A04',
    },

    // === TAB BAR ===
    tabBar: 'rgba(255, 255, 255, 0.95)',
    tabBarActive: '#B8860B',
    tabBarInactive: '#999999',

    // === ALIAS LEGACY ===
    primary: '#B8860B',
    primaryDark: '#996515',
    primaryLight: '#D4AF37',
    secondary: '#B8860B',
    accent: '#B8860B',
    white: '#FFFFFF',
    error: '#DC2626',
    errorLight: 'rgba(220, 38, 38, 0.12)',
    successLight: 'rgba(22, 163, 74, 0.12)',
    warningLight: 'rgba(217, 119, 6, 0.12)',

    // === METRIQUES ===
    weight: '#B8860B',
    bodyFat: '#D97706',
    muscle: '#16A34A',
    water: '#2563EB',
    visceral: '#DC2626',
    bone: '#666666',

    // === PROGRESSIONS ===
    progressTrack: 'rgba(0, 0, 0, 0.08)',
    progressFill: '#B8860B',

    // === BACKWARD COMPATIBILITY ALIASES ===
    surface: '#FFFFFF',
    accentOrange: '#D97706',
    accentCyan: '#0891B2',
    accentGreen: '#16A34A',
    accentPurple: '#9333EA',
    tertiary: '#999999',
    mintPastel: '#16A34A',
    turquoisePastel: '#0891B2',
    orangePastel: '#D97706',
    beigeLight: '#FFFFFF',
    gradientStart: '#B8860B',
    gradientEnd: '#996515',
    statsBackground: '#FFFFFF',
    sheet: '#FFFFFF',
    textLight: '#1A1A1F',
    metabolism: '#D97706',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowColorDark: 'rgba(0, 0, 0, 0.2)',
    backgroundDark: '#E8E8EA',
    cardLight: '#F0F0F2',
    secondaryLight: 'rgba(184, 134, 11, 0.12)',
  },

  // === GRADIENTS ===
  gradients: {
    gold: ['#B8860B', '#996515'] as [string, string],
    goldShine: ['#B8860B', '#D4AF37', '#B8860B'] as [string, string, string],
    card: ['#FFFFFF', '#F5F5F7'] as [string, string],
    background: ['#F5F5F7', '#FFFFFF', '#F5F5F7'] as [string, string, string],
    success: ['#16A34A', '#15803D'] as [string, string],
    danger: ['#DC2626', '#B91C1C'] as [string, string],
  },
};

// Type pour les themes
export type ThemeType = typeof darkTheme;

// ═══════════════════════════════════════
// THEME PAR DEFAUT (DARK)
// ═══════════════════════════════════════
export const theme = {
  ...darkTheme,

  // === BORDER RADIUS ===
  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    full: 9999,
  },

  // === SHADOWS ===
  shadows: {
    gold: {
      shadowColor: '#D4AF37',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 8,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 2,
    },
  },

  // === SHADOW PRESETS ===
  shadow: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    gold: {
      shadowColor: '#D4AF37',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    primary: {
      shadowColor: '#D4AF37',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },

  // === SPACING ===
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // === TYPOGRAPHY ===
  typography: {
    mega: {
      fontSize: 56,
      fontWeight: '700' as const,
      letterSpacing: -2,
    },
    h1: {
      fontSize: 28,
      fontWeight: '700' as const,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 22,
      fontWeight: '700' as const,
    },
    h3: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 13,
      fontWeight: '400' as const,
    },
    label: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
    },
  },

  // === FONT SIZES ===
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    display: 34,
    hero: 48,
    mega: 56,
  },

  // === FONT WEIGHTS ===
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },

  // === ANIMATIONS ===
  animation: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
};

// Helper pour creer des couleurs avec opacite
export const withOpacity = (color: string, opacity: number): string => {
  const hex = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${color}${hex}`;
};

// ═══════════════════════════════════════
// PALETTES DE COULEURS (ACCENT)
// ═══════════════════════════════════════
export type ColorThemeKey = 'gold' | 'blue' | 'sakura';

export interface ColorPalette {
  id: ColorThemeKey;
  name: string;
  emoji: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  textOnPrimary: string;
  gradient: [string, string];
  gradientShine: [string, string, string];
}

export const COLOR_THEMES: Record<ColorThemeKey, ColorPalette> = {
  gold: {
    id: 'gold',
    name: 'Or Samouraï',
    emoji: '⚔️',
    primary: '#D4AF37',
    primaryLight: '#FFD700',
    primaryDark: '#B8860B',
    primaryMuted: 'rgba(212, 175, 55, 0.15)',
    textOnPrimary: '#0D0D0F',
    gradient: ['#D4AF37', '#B8860B'],
    gradientShine: ['#D4AF37', '#FFD700', '#D4AF37'],
  },
  blue: {
    id: 'blue',
    name: 'Bleu Océan',
    emoji: '🌊',
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
    primaryMuted: 'rgba(59, 130, 246, 0.15)',
    textOnPrimary: '#FFFFFF',
    gradient: ['#3B82F6', '#2563EB'],
    gradientShine: ['#3B82F6', '#60A5FA', '#3B82F6'],
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura',
    emoji: '🌸',
    primary: '#EC4899',
    primaryLight: '#F472B6',
    primaryDark: '#DB2777',
    primaryMuted: 'rgba(236, 72, 153, 0.15)',
    textOnPrimary: '#FFFFFF',
    gradient: ['#EC4899', '#DB2777'],
    gradientShine: ['#EC4899', '#F472B6', '#EC4899'],
  },
};

// Fonction pour appliquer une palette de couleur à un thème
export const applyColorTheme = (
  baseTheme: typeof darkTheme | typeof lightTheme,
  colorTheme: ColorThemeKey
): typeof darkTheme | typeof lightTheme => {
  const palette = COLOR_THEMES[colorTheme];

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      // Remplacer les couleurs gold par la palette choisie
      gold: palette.primary,
      goldLight: palette.primaryLight,
      goldDark: palette.primaryDark,
      goldMuted: palette.primaryMuted,
      textOnGold: palette.textOnPrimary,
      borderGold: `rgba(${hexToRgb(palette.primary)}, 0.3)`,

      // Aussi mettre à jour les alias
      primary: palette.primary,
      primaryLight: palette.primaryLight,
      primaryDark: palette.primaryDark,
      secondary: palette.primary,
      accent: palette.primary,

      // Tab bar
      tabBarActive: palette.primary,

      // Progress
      progressFill: palette.primary,

      // Weight metric
      weight: palette.primary,

      // Gradients
      gradientStart: palette.gradient[0],
      gradientEnd: palette.gradient[1],
    },
    gradients: {
      ...baseTheme.gradients,
      gold: palette.gradient,
      goldShine: palette.gradientShine,
    },
  };
};

// Helper pour convertir hex en rgb
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
};

export default theme;
