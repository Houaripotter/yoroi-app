/**
 * Yoroi App Theme
 * Design System coloré et moderne
 */

export const theme = {
  colors: {
    // Couleurs principales
    background: '#FAF7F2',         // Fond beige clair
    surface: '#FFFFFF',            // Cards blanc pur

    // Accents - Palette colorée et moderne
    primary: '#34D399',            // Vert menthe
    secondary: '#F59E0B',          // Orange chaleureux
    tertiary: '#2DD4BF',           // Turquoise
    accent: '#D4A574',             // Beige doré

    // Gradient pour ProgressRing
    gradientStart: '#2DD4BF',      // Turquoise
    gradientEnd: '#34D399',        // Vert menthe

    // Texte
    textPrimary: '#1A1A1A',        // Noir classique
    textSecondary: '#6B7280',      // Gris
    textTertiary: '#9CA3AF',       // Gris clair

    // Couleurs sémantiques
    success: '#34D399',            // Vert menthe
    warning: '#F59E0B',            // Orange chaleureux
    error: '#EF4444',              // Rouge
    info: '#2DD4BF',               // Turquoise

    // Couleurs pastel pour pills/badges
    mintPastel: '#D1FAE5',         // Vert menthe pastel
    orangePastel: '#FEF3C7',       // Orange pastel
    turquoisePastel: '#CCFBF1',    // Turquoise pastel
    beigeLight: '#F5F1E8',         // Beige très clair

    // Couleurs variées pour icônes
    iconOrange: '#F59E0B',
    iconGreen: '#34D399',
    iconBlue: '#3B82F6',
    iconPurple: '#A78BFA',
    iconPink: '#EC4899',
    iconTurquoise: '#2DD4BF',

    // Bordures
    border: '#E5E5E5',
    borderLight: '#F0F0F0',

    // Ombres très douces
    shadow: 'rgba(0, 0, 0, 0.04)',
    shadowMedium: 'rgba(0, 0, 0, 0.06)',
    shadowDark: 'rgba(0, 0, 0, 0.08)',
  },

  // Radius - coins encore plus arrondis
  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    full: 9999,
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Typography
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 34,
  },

  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },

  // Shadows - très douces
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
  },
} as const;

export type Theme = typeof theme;
