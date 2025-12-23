// ============================================
// YOROI V6 - LIGHT & ADDICTIVE DESIGN
// ============================================
// Couleurs CLAIRES et énergisantes
// Objectif: Rendre les utilisateurs accros !
// ============================================

import { themes, defaultThemeColor, defaultThemeMode, Theme } from './themes';

// Obtenir le thème par défaut
const activeTheme: Theme = themes[`${defaultThemeColor}_${defaultThemeMode}`];
const c = activeTheme.colors;

// ============================================
// COULEURS - PALETTE LUMINEUSE & ADDICTIVE
// ============================================
export const COLORS = {
  // Background - Clair et chaleureux
  background: c.background,
  backgroundAlt: c.backgroundSecondary,
  backgroundElevated: c.card,

  // Surfaces - Cartes blanches ou claires
  surface: c.card,
  surfaceLight: c.cardSecondary,
  surfaceBorder: c.border,

  // Accent Principal - Énergisant
  primary: c.primary,
  primaryDark: c.primaryDark,
  primaryLight: c.primaryLight,
  primaryMuted: `${c.primary}20`,
  primaryGlow: `${c.primary}40`,

  // Accent Secondaire - Frais
  accent: c.secondary,
  accentDark: c.secondary,
  accentLight: c.secondaryLight,
  accentMuted: `${c.secondary}20`,
  accentGlow: `${c.secondary}40`,

  // Texte - Foncé pour lisibilité
  text: c.text,
  textSecondary: c.textSecondary,
  textMuted: c.textMuted,
  textDim: c.textMuted,
  textOnPrimary: c.textOnPrimary,

  // États - Couleurs vives
  success: c.success,
  successLight: c.successLight,
  successMuted: c.successLight,

  error: c.error,
  errorLight: c.errorLight,
  errorMuted: c.errorLight,

  warning: c.warning,
  warningLight: c.warningLight,
  warningMuted: c.warningLight,

  info: c.chart3,
  infoLight: `${c.chart3}40`,
  infoMuted: `${c.chart3}20`,

  // Couleurs spéciales pour gamification
  gold: c.chart4 || '#FFD700',
  goldLight: `${c.chart4 || '#FFD700'}60`,
  goldMuted: `${c.chart4 || '#FFD700'}20`,

  purple: c.secondary,
  purpleLight: c.secondaryLight,
  purpleMuted: `${c.secondary}20`,

  pink: '#FF6B9D',
  pinkLight: '#FF8FB8',
  pinkMuted: 'rgba(255, 107, 157, 0.15)',

  cyan: c.chart3,
  cyanLight: `${c.chart3}80`,
  cyanMuted: `${c.chart3}20`,

  // Avatar background - Fond BLANC pour un cercle visible
  avatarBg: '#FFFFFF',
  avatarGlow: `${c.primary}30`,

  // Tab bar
  tabBar: c.tabBar,
  tabBarActive: c.tabBarActive,
  tabBarInactive: c.tabBarInactive,
};

// ============================================
// SPACING - Généreux et aéré
// ============================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
};

// ============================================
// BORDER RADIUS - Moderne et arrondi
// ============================================
export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  full: 9999,
};

// ============================================
// TYPOGRAPHY
// ============================================
export const TYPOGRAPHY = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
    hero: 56,
    giant: 72,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },
  lineHeight: {
    tight: 1.0,
    snug: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
};

// ============================================
// OMBRES - Douces pour thème clair
// ============================================
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glowAccent: {
    shadowColor: c.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glowSm: {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

// ============================================
// GRADIENTS - Énergisants
// ============================================
export const GRADIENTS = {
  // Principal
  primary: [c.primary, c.primaryLight] as [string, string],
  primaryVibrant: [c.primary, c.primaryDark] as [string, string],

  // Accent
  accent: [c.secondary, c.secondaryLight] as [string, string],
  accentVibrant: [c.secondary, c.secondaryLight] as [string, string],

  // Sunset - Chaleureux
  sunset: [c.chart1, c.chart4] as [string, string],

  // Ocean - Frais
  ocean: [c.chart3, c.secondary] as [string, string],

  // Aurora - Multi-couleurs
  aurora: [c.chart1, c.secondary, c.chart3] as [string, string, string],

  // États
  success: [c.success, c.successLight] as [string, string],
  error: [c.error, c.errorLight] as [string, string],
  warning: [c.warning, c.warningLight] as [string, string],
  info: [c.chart3, `${c.chart3}80`] as [string, string],

  // Spéciaux
  gold: [c.chart4 || '#FFD700', '#FFA500'] as [string, string],
  purple: [c.secondary, c.secondaryLight] as [string, string],
  pink: ['#FF6B9D', '#FF8FB8'] as [string, string],

  // Backgrounds
  surface: [c.card, c.cardSecondary] as [string, string],
  card: [c.card, c.cardSecondary] as [string, string],

  // Body composition colors
  bodyFat: [c.chart1, `${c.chart1}80`] as [string, string],
  muscle: [c.success, c.successLight] as [string, string],
  water: [c.chart3, `${c.chart3}80`] as [string, string],
  bone: ['#B8B5AD', '#D0CFC8'] as [string, string],
  visceral: [c.secondary, c.secondaryLight] as [string, string],
};

// ============================================
// TAB BAR
// ============================================
export const TAB_BAR = {
  height: 80,
  background: c.tabBar,
  backgroundBlur: `${c.tabBar}F5`,
  activeColor: c.tabBarActive,
  inactiveColor: c.tabBarInactive,
  plusButtonSize: 60,
  plusButtonGradient: GRADIENTS.primary,
  borderRadius: 30,
  margin: {
    horizontal: 20,
    bottom: 24,
  },
};

// ============================================
// ANIMATION DURATIONS
// ============================================
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
  verySlow: 600,
};

// ============================================
// BODY COMPOSITION COLORS
// ============================================
export const BODY_COMP_COLORS = {
  bodyFat: c.chart1,
  muscle: c.success,
  water: c.chart3,
  bone: '#B8B5AD',
  visceralFat: c.secondary,
  metabolicAge: c.warning,
  bmr: c.chart3,
};

// ============================================
// MEASUREMENT COLORS
// ============================================
export const MEASUREMENT_COLORS = {
  chest: c.chart1,
  waist: c.error,
  hips: c.secondary,
  thighs: c.success,
  arms: c.chart3,
  calves: c.warning,
  neck: '#FF6B9D',
  shoulders: c.chart3,
};

// ============================================
// HELPERS
// ============================================
export const getWeightChangeColor = (change: number) => {
  if (change < 0) return COLORS.success;
  if (change > 0) return COLORS.error;
  return COLORS.textSecondary;
};

export const getWeightChangeBgColor = (change: number) => {
  if (change < 0) return COLORS.successMuted;
  if (change > 0) return COLORS.errorMuted;
  return COLORS.surfaceLight;
};

export const getScoreColor = (score: number) => {
  if (score >= 80) return COLORS.success;
  if (score >= 60) return COLORS.warning;
  return COLORS.error;
};

export const getScoreGradient = (score: number): [string, string] => {
  if (score >= 80) return GRADIENTS.success;
  if (score >= 60) return GRADIENTS.warning;
  return GRADIENTS.error;
};

export const getBodyFatColor = (percentage: number, gender: 'male' | 'female' = 'male') => {
  const ranges = gender === 'male'
    ? { low: 6, healthy: 24, high: 30 }
    : { low: 14, healthy: 31, high: 37 };

  if (percentage < ranges.low) return COLORS.warning;
  if (percentage <= ranges.healthy) return COLORS.success;
  if (percentage <= ranges.high) return COLORS.warning;
  return COLORS.error;
};

// ============================================
// CARD STYLES
// ============================================
export const CARD_STYLES = {
  base: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  elevated: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.md,
  },
  glass: {
    backgroundColor: c.glass,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: c.glassBorder,
  },
  primary: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  accent: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
};
