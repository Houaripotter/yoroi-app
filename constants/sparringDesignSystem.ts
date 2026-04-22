// ============================================
// SPARRING DESIGN SYSTEM
// Tokens centralisés pour la partie Sparring : couleurs sémantiques,
// typographie, espacements. Évite les valeurs hardcodées partout.
// ============================================

/**
 * Palette sémantique Sparring.
 * Utilise SPARRING_COLORS.win au lieu de '#22C55E' etc.
 */
export const SPARRING_COLORS = {
  // Outcomes
  win: '#22C55E',     // Vert success
  loss: '#EF4444',    // Rouge danger
  draw: '#F59E0B',    // Ambre neutral
  ongoing: '#3B82F6', // Bleu info

  // Positions BJJ (intensité)
  dominant: '#10B981',
  neutral: '#6366F1',
  defensive: '#EF4444',

  // Levels (1-10 scale)
  beginner: '#94A3B8',
  intermediate: '#3B82F6',
  advanced: '#A855F7',
  elite: '#F59E0B',

  // UI
  cardBgLight: '#FFFFFF',
  cardBgDark: '#1F2937',
  borderLight: 'rgba(0,0,0,0.06)',
  borderDark: 'rgba(255,255,255,0.08)',
  divider: 'rgba(128,128,128,0.15)',
} as const;

/**
 * Typography scale Sparring (cohérent avec Stats).
 */
export const SPARRING_TYPO = {
  // Titres
  hero: { fontSize: 28, fontWeight: '900' as const, letterSpacing: -0.8 },
  h1:   { fontSize: 22, fontWeight: '900' as const, letterSpacing: -0.5 },
  h2:   { fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.3 },
  h3:   { fontSize: 15, fontWeight: '800' as const, letterSpacing: -0.2 },

  // Body
  body:    { fontSize: 14, fontWeight: '600' as const, letterSpacing: -0.1 },
  bodySm:  { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.3 },
  micro:   { fontSize: 9,  fontWeight: '800' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },

  // Numbers (KPI)
  numLarge:  { fontSize: 32, fontWeight: '900' as const, letterSpacing: -1 },
  numMedium: { fontSize: 22, fontWeight: '900' as const, letterSpacing: -0.5 },
  numSmall:  { fontSize: 16, fontWeight: '900' as const, letterSpacing: -0.3 },
} as const;

/**
 * Spacing scale (multiples de 4).
 */
export const SPARRING_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Border radius cohérent.
 */
export const SPARRING_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/**
 * Shadows iOS standardisées.
 */
export const SPARRING_SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;

/** Tap target minimum recommandé (Apple HIG = 44pt). */
export const SPARRING_TAP_TARGET_MIN = 44;
export const SPARRING_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };
