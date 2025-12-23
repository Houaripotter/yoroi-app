// ============================================
// YOROI - THEME TIFFANY DARK
// ============================================
// Design Gris Anthracite + Tiffany Blue Flashy
// Glow effects partout pour un look premium
// ============================================

// ═══════════════════════════════════════════════
// COULEURS PRINCIPALES
// ═══════════════════════════════════════════════

export const TIFFANY = {
  // Couleur accent principale
  accent: '#0ABAB5',
  accentLight: '#3DD4CF',
  accentDark: '#089490',
  accentMuted: 'rgba(10, 186, 181, 0.15)',
  accentGlow: 'rgba(10, 186, 181, 0.4)',
  accentGlowStrong: 'rgba(10, 186, 181, 0.6)',

  // Backgrounds
  background: '#1A1A1E',
  backgroundCard: '#242429',
  backgroundElevated: '#2E2E35',
  backgroundInput: '#1F1F24',

  // Borders
  border: '#38383F',
  borderLight: '#45454D',
  borderAccent: '#0ABAB5',

  // Textes
  textPrimary: '#F5F5F5',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textDisabled: '#4B5563',

  // États
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  successMuted: 'rgba(16, 185, 129, 0.1)',

  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  warningMuted: 'rgba(245, 158, 11, 0.1)',

  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.15)',
  errorMuted: 'rgba(239, 68, 68, 0.1)',

  info: '#3B82F6',
  infoLight: 'rgba(59, 130, 246, 0.15)',
  infoMuted: 'rgba(59, 130, 246, 0.1)',

  // Purple
  purple: '#8B5CF6',
  purpleLight: 'rgba(139, 92, 246, 0.15)',
  purpleMuted: 'rgba(139, 92, 246, 0.1)',
};

// ═══════════════════════════════════════════════
// COULEURS FIXES (compatibilité)
// ═══════════════════════════════════════════════

export const COLORS = {
  // Backgrounds
  background: TIFFANY.background,
  backgroundSecondary: TIFFANY.backgroundCard,
  card: TIFFANY.backgroundCard,
  surface: TIFFANY.backgroundCard,

  // Accent
  accent: TIFFANY.accent,
  accentDark: TIFFANY.accentDark,
  accentLight: TIFFANY.accentLight,
  accentMuted: TIFFANY.accentMuted,

  // Primary = accent
  primary: TIFFANY.accent,
  primaryDark: TIFFANY.accentDark,
  primaryLight: TIFFANY.accentLight,
  primaryMuted: TIFFANY.accentMuted,

  // Gold = accent (compatibilité)
  gold: TIFFANY.accent,
  goldDark: TIFFANY.accentDark,
  goldLight: TIFFANY.accentLight,
  goldMuted: TIFFANY.accentMuted,
  textOnGold: '#FFFFFF',

  // Textes
  text: TIFFANY.textPrimary,
  textPrimary: TIFFANY.textPrimary,
  textSecondary: TIFFANY.textSecondary,
  textMuted: TIFFANY.textMuted,
  textLight: '#FFFFFF',
  textDisabled: TIFFANY.textDisabled,

  // Borders
  border: TIFFANY.border,
  borderLight: TIFFANY.borderLight,
  divider: TIFFANY.border,

  // Tab bar
  tabBar: TIFFANY.backgroundCard,
  tabBarActive: TIFFANY.accent,
  tabBarInactive: TIFFANY.textMuted,

  // États
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

  // Couleurs spéciales
  fire: '#F97316',
  fireLight: 'rgba(249, 115, 22, 0.15)',

  water: '#06B6D4',
  waterLight: 'rgba(6, 182, 212, 0.15)',

  xp: TIFFANY.success,
  xpLight: TIFFANY.successLight,

  // Secondary
  secondary: '#8B5CF6',
  secondaryLight: 'rgba(139, 92, 246, 0.15)',
  secondaryMuted: 'rgba(139, 92, 246, 0.1)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Danger
  danger: TIFFANY.error,
  dangerLight: TIFFANY.errorLight,
  dangerMuted: TIFFANY.errorMuted,

  // Pink
  pink: '#EC4899',
  pinkLight: 'rgba(236, 72, 153, 0.15)',
  pinkMuted: 'rgba(236, 72, 153, 0.1)',

  // Purple
  purple: '#8B5CF6',
  purpleLight: 'rgba(139, 92, 246, 0.15)',
  purpleMuted: 'rgba(139, 92, 246, 0.1)',

  // Compatibilité
  cardHover: TIFFANY.backgroundElevated,
  backgroundLight: TIFFANY.backgroundElevated,

  // Glow
  glow: TIFFANY.accentGlow,
  glowStrong: TIFFANY.accentGlowStrong,

  // Sports
  sports: {
    jjb: '#EF4444',
    musculation: '#06B6D4',
    running: '#10B981',
    yoga: '#8B5CF6',
    natation: '#06B6D4',
    boxing: '#EF4444',
    cycling: '#10B981',
    hiit: '#F59E0B',
    crossfit: '#F97316',
    other: TIFFANY.textMuted,
  },
};

// ═══════════════════════════════════════════════
// GRADIENTS
// ═══════════════════════════════════════════════

export const GRADIENTS = {
  primary: [TIFFANY.accent, TIFFANY.accentDark] as [string, string],
  secondary: ['#8B5CF6', '#7C3AED'] as [string, string],
  success: [TIFFANY.success, '#059669'] as [string, string],
  gold: [TIFFANY.accent, TIFFANY.accentDark] as [string, string],
  danger: [TIFFANY.error, '#DC2626'] as [string, string],
  info: [TIFFANY.info, '#2563EB'] as [string, string],
  tiffany: [TIFFANY.accent, TIFFANY.accentDark] as [string, string],
  dark: [TIFFANY.backgroundElevated, TIFFANY.background] as [string, string],
  card: [TIFFANY.backgroundCard, TIFFANY.backgroundElevated] as [string, string],
};

// ═══════════════════════════════════════════════
// ESPACEMENTS
// ═══════════════════════════════════════════════

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

// ═══════════════════════════════════════════════
// BORDER RADIUS
// ═══════════════════════════════════════════════

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  container: 32,
  full: 9999,
};

// ═══════════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════════

export const FONT = {
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 40,
    hero: 92,   // Poids principal
    mega: 100,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '800' as const,
    heavy: '900' as const,
  },
  letterSpacing: {
    tight: -1,
    normal: 0,
    wide: 1,
    wider: 2,
    widest: 3,
    label: 4,
  },
};

// ═══════════════════════════════════════════════
// SHADOWS & GLOW EFFECTS
// ═══════════════════════════════════════════════

export const SHADOWS = {
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
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  // Glow Tiffany
  glow: {
    shadowColor: TIFFANY.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  glowStrong: {
    shadowColor: TIFFANY.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 15,
  },
  glowSubtle: {
    shadowColor: TIFFANY.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  // Glow pour FAB
  glowFab: {
    shadowColor: TIFFANY.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  // Glow pour texte (via textShadow)
  textGlow: {
    textShadowColor: TIFFANY.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  textGlowStrong: {
    textShadowColor: TIFFANY.accentGlowStrong,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
};

// ═══════════════════════════════════════════════
// STYLES DE COMPOSANTS PRÉDÉFINIS
// ═══════════════════════════════════════════════

export const CARD_STYLE = {
  backgroundColor: TIFFANY.backgroundCard,
  borderRadius: RADIUS.xxl,
  borderWidth: 1,
  borderColor: TIFFANY.border,
  padding: SPACING.xl,
};

export const CARD_STYLE_GLOW = {
  backgroundColor: TIFFANY.backgroundCard,
  borderRadius: RADIUS.xxl,
  borderWidth: 1,
  borderColor: TIFFANY.borderAccent,
  padding: SPACING.xl,
  ...SHADOWS.glowSubtle,
};

export const CARD_STYLE_ELEVATED = {
  backgroundColor: TIFFANY.backgroundElevated,
  borderRadius: RADIUS.lg,
  borderWidth: 1,
  borderColor: TIFFANY.border,
  padding: SPACING.lg,
};

export const INPUT_STYLE = {
  backgroundColor: TIFFANY.backgroundInput,
  borderRadius: RADIUS.md,
  borderWidth: 1,
  borderColor: TIFFANY.border,
  padding: SPACING.lg,
  color: TIFFANY.textPrimary,
  fontSize: FONT.size.lg,
};

export const LABEL_STYLE = {
  fontSize: FONT.size.xs,
  fontWeight: FONT.weight.bold,
  color: TIFFANY.textMuted,
  textTransform: 'uppercase' as const,
  letterSpacing: FONT.letterSpacing.label,
};

export const SECTION_HEADER_STYLE = {
  fontSize: FONT.size.sm,
  fontWeight: FONT.weight.bold,
  color: TIFFANY.textMuted,
  textTransform: 'uppercase' as const,
  letterSpacing: FONT.letterSpacing.widest,
  marginBottom: SPACING.md,
  marginTop: SPACING.xxl,
};

// ═══════════════════════════════════════════════
// TAILLES ICÔNES
// ═══════════════════════════════════════════════

export const ICON_SIZE = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
  xxl: 40,
};

export const ICON_CIRCLE_SIZE = 48;
export const AVATAR_HEIGHT = 56;

// ═══════════════════════════════════════════════
// FAB (Floating Action Button)
// ═══════════════════════════════════════════════

export const FAB_SIZE = 64;
export const FAB_ICON_SIZE = 28;
export const FAB_BORDER_RADIUS = 22;

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

export const getGlowShadow = () => SHADOWS.glow;
export const getAccentColor = () => TIFFANY.accent;

// Export default theme values for compatibility
export const DEFAULT_THEME = 'tiffany';
export type ThemeName = 'tiffany';

// Theme object pour compatibilité avec l'ancien code
export const THEMES = {
  tiffany: {
    ...TIFFANY,
    kanji: '翠',
    name: 'Tiffany',
    icon: '💎',
  },
};

export type ThemeColors = typeof TIFFANY & {
  kanji: string;
  name: string;
  icon: string;
};
