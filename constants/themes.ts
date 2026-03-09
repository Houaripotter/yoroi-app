// ===================================================
// YOROI - 10 COMBOS DE COULEURS
// 10 couleurs × 2 modes (Dark/Light)
// ===================================================

export type ThemeColor = 'charcoal' | 'mint' | 'royal' | 'ocean' | 'pumpkin' | 'vista' | 'lavender' | 'peach' | 'fizz' | 'cadet' | 'tiffany' | 'obsidian' | 'sakura' | 'emerald' | 'amber' | 'slate' | 'ambersmoke' | 'dreamy' | 'lavendar' | 'chartreuse' | 'classic' | 'volt' | 'magma' | 'matrix' | 'blaze' | 'phantom' | 'ghost' | 'indigo' | 'gold' | 'sunset';
export type ThemeMode = 'dark' | 'light' | 'auto';

export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundCard: string;
  backgroundElevated: string;
  backgroundLight: string;

  // Accent
  accent: string;
  accentDark: string;
  accentLight: string;
  accentMuted: string;

  // Compatibility aliases (gold = accent)
  gold: string;
  goldDark: string;
  goldLight: string;
  goldMuted: string;

  // Compatibility aliases (primary = accent)
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryMuted: string;

  // Compatibility aliases (card = backgroundCard)
  card: string;
  cardHover: string;
  surface: string;

  // Text
  text: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  textOnGold: string;
  textLight: string;
  textDisabled: string;

  // Border
  border: string;
  borderLight: string;
  borderAccent: string;

  // Glow effects
  glow: string;
  glowStrong: string;
  accentGlow: string;

  // States
  success: string;
  successLight: string;
  successMuted: string;
  warning: string;
  warningLight: string;
  warningMuted: string;
  error: string;
  errorLight: string;
  errorMuted: string;
  info: string;
  infoLight: string;
  infoMuted: string;

  // Tab bar
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Misc
  divider: string;
  overlay: string;

  // Danger alias
  danger: string;
  dangerLight: string;
  dangerMuted: string;

  // Secondary colors
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  secondaryMuted: string;

  // Purple (alias for secondary)
  purple: string;
  purpleLight: string;
  purpleMuted: string;

  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;

  // Additional compatibility
  backgroundSecondary: string;
  cardSecondary: string;
  textOnPrimary: string;
  shadow: string;

  // Water/Fire colors
  water: string;
  waterLight: string;
  fire: string;
  fireLight: string;

  // Glass effect
  glass: string;
  glassBorder: string;

  // Chart bar colors
  barPrimary: string;   // Noir en light, Blanc en dark
  barAccent: string;    // Couleur accent du thème

  // Texte accent lisible (pour éviter jaune/cyan/vert sur fond blanc)
  accentText: string;   // Version sombre de l'accent pour le texte en mode light

  // Couleur companion (2e couleur du combo, toujours visible)
  companion: string;
}

export interface Theme {
  id: string;
  colorId: ThemeColor;
  mode: 'dark' | 'light';
  name: string;
  icon: string;
  kanji: string;
  colors: ThemeColors;
}

// ===================================================
// HELPER: Mélanger deux couleurs hex (weight 0 = c1, weight 1 = c2)
// ===================================================
function mixHex(c1: string, c2: string, weight: number): string {
  const h1 = c1.replace('#', '');
  const h2 = c2.replace('#', '');
  const r = Math.round(parseInt(h1.substring(0, 2), 16) * (1 - weight) + parseInt(h2.substring(0, 2), 16) * weight);
  const g = Math.round(parseInt(h1.substring(2, 4), 16) * (1 - weight) + parseInt(h2.substring(2, 4), 16) * weight);
  const b = Math.round(parseInt(h1.substring(4, 6), 16) * (1 - weight) + parseInt(h2.substring(4, 6), 16) * weight);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper: la couleur est-elle claire ?
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.45;
}

// ===================================================
// HELPER: Créer les couleurs complètes avec aliases
// ===================================================

interface BaseColors {
  background: string;
  backgroundCard: string;
  backgroundElevated: string;
  backgroundLight: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  accentText?: string;  // Version lisible de l'accent pour le texte
  companion: string;    // 2e couleur du combo
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  border: string;
  borderLight: string;
  glow: string;
  glowStrong: string;
}

const createThemeColors = (base: BaseColors, isDark: boolean): ThemeColors => {
  const accentMuted = base.glow.replace('0.4', '0.15').replace('0.2', '0.1');

  // En mode dark, utiliser l'accent tel quel (couleur fluo)
  // En mode light, utiliser le texte noir pour la lisibilité
  const accentText = base.accentText || (isDark ? base.accent : base.textPrimary);

  return {
    // Base colors
    ...base,
    accentMuted,
    accentText,

    // Gold aliases (= accent)
    gold: base.accent,
    goldDark: base.accentDark,
    goldLight: base.accentLight,
    goldMuted: accentMuted,

    // Primary aliases (= accent)
    primary: base.accent,
    primaryDark: base.accentDark,
    primaryLight: base.accentLight,
    primaryMuted: accentMuted,

    // Card aliases
    card: base.backgroundCard,
    cardHover: base.backgroundElevated,
    surface: base.backgroundCard,

    // Border accent
    borderAccent: base.accent,

    // Glow aliases
    accentGlow: base.glow,

    // Text aliases
    text: base.textPrimary,
    textOnGold: base.textOnAccent,
    textLight: '#FFFFFF',
    textDisabled: isDark ? '#4B5563' : '#9CA3AF',

    // States - Dark mode
    success: isDark ? '#30D158' : '#248A3D',
    successLight: isDark ? 'rgba(48, 209, 88, 0.15)' : 'rgba(36, 138, 61, 0.12)',
    successMuted: isDark ? 'rgba(48, 209, 88, 0.1)' : 'rgba(36, 138, 61, 0.08)',
    warning: isDark ? '#FF9F0A' : '#B25000',
    warningLight: isDark ? 'rgba(255, 159, 10, 0.15)' : 'rgba(178, 80, 0, 0.12)',
    warningMuted: isDark ? 'rgba(255, 159, 10, 0.1)' : 'rgba(178, 80, 0, 0.08)',
    error: isDark ? '#FF453A' : '#D70015',
    errorLight: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(215, 0, 21, 0.12)',
    errorMuted: isDark ? 'rgba(255, 69, 58, 0.1)' : 'rgba(215, 0, 21, 0.08)',
    info: isDark ? '#0A84FF' : '#0066CC',
    infoLight: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(0, 102, 204, 0.12)',
    infoMuted: isDark ? 'rgba(10, 132, 255, 0.1)' : 'rgba(0, 102, 204, 0.08)',

    // Tab bar
    tabBar: base.backgroundCard,
    tabBarActive: base.accent,
    tabBarInactive: base.textMuted,

    // Misc
    divider: base.border,
    overlay: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',

    // Danger alias (= error)
    danger: isDark ? '#FF453A' : '#D70015',
    dangerLight: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(215, 0, 21, 0.12)',
    dangerMuted: isDark ? 'rgba(255, 69, 58, 0.1)' : 'rgba(215, 0, 21, 0.08)',

    // Secondary (= companion, la 2e couleur du combo)
    secondary: base.companion,
    secondaryDark: base.accentDark,
    secondaryLight: base.companion,
    secondaryMuted: isDark ? (base.companion + '25') : (base.companion + '18'),

    // Purple (alias for secondary = companion)
    purple: base.companion,
    purpleLight: isDark ? (base.companion + '25') : (base.companion + '18'),
    purpleMuted: isDark ? (base.companion + '18') : (base.companion + '14'),

    // Chart colors - accent + companion comme duo
    chart1: base.accent,
    chart2: base.companion,
    chart3: isDark ? '#06B6D4' : '#0891B2',
    chart4: isDark ? '#F97316' : '#EA580C',

    // Additional compatibility
    backgroundSecondary: base.backgroundCard,
    cardSecondary: base.backgroundElevated,
    textOnPrimary: base.textOnAccent,
    shadow: isDark ? '#000000' : 'rgba(0, 0, 0, 0.15)',

    // Water/Fire colors
    water: '#06B6D4',
    waterLight: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)',
    fire: '#F97316',
    fireLight: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',

    // Glass effect
    glass: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
    glassBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',

    // Chart bar colors - companion + accent comme duo
    barPrimary: base.companion,
    barAccent: base.accent,
  };
};

// ===================================================
// DÉFINITION DES 10 COMBOS × 2 MODES = 20 THÈMES
// ===================================================

export const themes: Record<string, Theme> = {

  // ─────────────────────────────────────────────
  // 1. CHARCOAL - Rouge Cadillac + Off-White
  // Accent: #D2042D | Light BG: #FAF9F6
  // ─────────────────────────────────────────────

  charcoal_dark: {
    id: 'charcoal_dark',
    colorId: 'charcoal',
    mode: 'dark',
    name: 'Charcoal',
    icon: '',
    kanji: '炭',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#D2042D',
      accentDark: '#B0021F',
      accentLight: '#E83350',
      companion: '#FAF9F6',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#FFFFFF',
      border: '#2A1F1F',
      borderLight: '#352A2A',
      glow: 'rgba(210, 4, 45, 0.4)',
      glowStrong: 'rgba(210, 4, 45, 0.6)',
    }, true),
  },

  charcoal_light: {
    id: 'charcoal_light',
    colorId: 'charcoal',
    mode: 'light',
    name: 'Charcoal',
    icon: '',
    kanji: '炭',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#D2042D',
      accentDark: '#B0021F',
      accentLight: '#E83350',
      companion: '#FAF9F6',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#FFFFFF',
      border: '#E8E6E2',
      borderLight: '#F0EEEA',
      glow: 'rgba(210, 4, 45, 0.2)',
      glowStrong: 'rgba(210, 4, 45, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 2. MINT - Vert Menthe + Blanc Fumé
  // Accent: #69A481 | Light BG: #E7EDEB
  // ─────────────────────────────────────────────

  mint_dark: {
    id: 'mint_dark',
    colorId: 'mint',
    mode: 'dark',
    name: 'Mint',
    icon: '',
    kanji: '葉',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#69A481',
      accentDark: '#528A6A',
      accentLight: '#85BA99',
      companion: '#E7EDEB',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#FFFFFF',
      border: '#1F2A22',
      borderLight: '#2A3530',
      glow: 'rgba(105, 164, 129, 0.4)',
      glowStrong: 'rgba(105, 164, 129, 0.6)',
    }, true),
  },

  mint_light: {
    id: 'mint_light',
    colorId: 'mint',
    mode: 'light',
    name: 'Mint',
    icon: '',
    kanji: '葉',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#69A481',
      accentDark: '#528A6A',
      accentLight: '#85BA99',
      companion: '#E7EDEB',
      accentText: '#4A7A5E',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#FFFFFF',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(105, 164, 129, 0.2)',
      glowStrong: 'rgba(105, 164, 129, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 3. ROYAL - Bleu Royal + Blanc
  // Accent: #00539C | Light BG: #FFFFFF
  // ─────────────────────────────────────────────

  royal_dark: {
    id: 'royal_dark',
    colorId: 'royal',
    mode: 'dark',
    name: 'Royal',
    icon: '',
    kanji: '王',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#00539C',
      accentDark: '#003D75',
      accentLight: '#2A7BC4',
      companion: '#FFFFFF',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#FFFFFF',
      border: '#1F1F2A',
      borderLight: '#2A2A35',
      glow: 'rgba(0, 83, 156, 0.4)',
      glowStrong: 'rgba(0, 83, 156, 0.6)',
    }, true),
  },

  royal_light: {
    id: 'royal_light',
    colorId: 'royal',
    mode: 'light',
    name: 'Royal',
    icon: '',
    kanji: '王',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#00539C',
      accentDark: '#003D75',
      accentLight: '#2A7BC4',
      companion: '#FFFFFF',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#FFFFFF',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(0, 83, 156, 0.2)',
      glowStrong: 'rgba(0, 83, 156, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 4. OCEAN - Bleu Océan + Ciel Nuageux ★ PRÉFÉRÉ
  // Accent: #2872A1 | Light BG: #CBDDE9
  // ─────────────────────────────────────────────

  ocean_dark: {
    id: 'ocean_dark',
    colorId: 'ocean',
    mode: 'dark',
    name: 'Ocean',
    icon: '',
    kanji: '海',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#2872A1',
      accentDark: '#1D5B82',
      accentLight: '#4A94C0',
      companion: '#CBDDE9',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#FFFFFF',
      border: '#1F2530',
      borderLight: '#2A3040',
      glow: 'rgba(40, 114, 161, 0.4)',
      glowStrong: 'rgba(40, 114, 161, 0.6)',
    }, true),
  },

  ocean_light: {
    id: 'ocean_light',
    colorId: 'ocean',
    mode: 'light',
    name: 'Ocean',
    icon: '',
    kanji: '海',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#2872A1',
      accentDark: '#1D5B82',
      accentLight: '#4A94C0',
      companion: '#CBDDE9',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#5A5A5A',
      textOnAccent: '#FFFFFF',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(40, 114, 161, 0.2)',
      glowStrong: 'rgba(40, 114, 161, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 5. PUMPKIN - Orange Citrouille + Charcoal
  // Accent: #FD802E | Light BG: #233D4C
  // ─────────────────────────────────────────────

  pumpkin_dark: {
    id: 'pumpkin_dark',
    colorId: 'pumpkin',
    mode: 'dark',
    name: 'Pumpkin',
    icon: '',
    kanji: '橙',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#FD802E',
      accentDark: '#E06A15',
      accentLight: '#FFA060',
      companion: '#233D4C',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#2A2520',
      borderLight: '#353028',
      glow: 'rgba(253, 128, 46, 0.4)',
      glowStrong: 'rgba(253, 128, 46, 0.6)',
    }, true),
  },

  pumpkin_light: {
    id: 'pumpkin_light',
    colorId: 'pumpkin',
    mode: 'light',
    name: 'Pumpkin',
    icon: '',
    kanji: '橙',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#FD802E',
      accentDark: '#E06A15',
      accentLight: '#FFA060',
      companion: '#233D4C',
      accentText: '#D06820',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(253, 128, 46, 0.3)',
      glowStrong: 'rgba(253, 128, 46, 0.5)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 6. VISTA - Bleu Vista + Mindaro
  // Accent: #84ABD6 | Light BG: #FEFFB9
  // ─────────────────────────────────────────────

  vista_dark: {
    id: 'vista_dark',
    colorId: 'vista',
    mode: 'dark',
    name: 'Vista',
    icon: '',
    kanji: '空',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#84ABD6',
      accentDark: '#6890BA',
      accentLight: '#A0C2E4',
      companion: '#FEFFB9',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#1F252A',
      borderLight: '#2A3035',
      glow: 'rgba(132, 171, 214, 0.4)',
      glowStrong: 'rgba(132, 171, 214, 0.6)',
    }, true),
  },

  vista_light: {
    id: 'vista_light',
    colorId: 'vista',
    mode: 'light',
    name: 'Vista',
    icon: '',
    kanji: '空',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#84ABD6',
      accentDark: '#6890BA',
      accentLight: '#A0C2E4',
      companion: '#FEFFB9',
      accentText: '#5580A5',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(132, 171, 214, 0.2)',
      glowStrong: 'rgba(132, 171, 214, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 7. LAVENDER - Rose Blush + Lavande
  // Accent: #D37E91 | Light BG: #FFE8EE
  // ─────────────────────────────────────────────

  lavender_dark: {
    id: 'lavender_dark',
    colorId: 'lavender',
    mode: 'dark',
    name: 'Lavender',
    icon: '',
    kanji: '花',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#D37E91',
      accentDark: '#B86578',
      accentLight: '#E09AAA',
      companion: '#FFE8EE',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#2A1F22',
      borderLight: '#352A2E',
      glow: 'rgba(211, 126, 145, 0.4)',
      glowStrong: 'rgba(211, 126, 145, 0.6)',
    }, true),
  },

  lavender_light: {
    id: 'lavender_light',
    colorId: 'lavender',
    mode: 'light',
    name: 'Lavender',
    icon: '',
    kanji: '花',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#D37E91',
      accentDark: '#B86578',
      accentLight: '#E09AAA',
      companion: '#FFE8EE',
      accentText: '#B06070',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(211, 126, 145, 0.2)',
      glowStrong: 'rgba(211, 126, 145, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 8. PEACH - Cherry Crush + Peach Cream
  // Accent: #E74F5E | Light BG: #FDDFC5
  // ─────────────────────────────────────────────

  peach_dark: {
    id: 'peach_dark',
    colorId: 'peach',
    mode: 'dark',
    name: 'Peach',
    icon: '',
    kanji: '桃',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#E74F5E',
      accentDark: '#CC3545',
      accentLight: '#F07080',
      companion: '#FDDFC5',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#FFFFFF',
      border: '#2A1F20',
      borderLight: '#352A2C',
      glow: 'rgba(231, 79, 94, 0.4)',
      glowStrong: 'rgba(231, 79, 94, 0.6)',
    }, true),
  },

  peach_light: {
    id: 'peach_light',
    colorId: 'peach',
    mode: 'light',
    name: 'Peach',
    icon: '',
    kanji: '桃',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#E74F5E',
      accentDark: '#CC3545',
      accentLight: '#F07080',
      companion: '#FDDFC5',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#FFFFFF',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(231, 79, 94, 0.2)',
      glowStrong: 'rgba(231, 79, 94, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 9. FIZZ - Indigo Dusk + Peach Fizz ★ 2e PRÉFÉRÉ
  // Accent: #3E4260 | Light BG: #FFEAD7
  // ─────────────────────────────────────────────

  fizz_dark: {
    id: 'fizz_dark',
    colorId: 'fizz',
    mode: 'dark',
    name: 'Fizz',
    icon: '',
    kanji: '泡',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#3E4260',
      accentDark: '#2E3250',
      accentLight: '#5A5E7A',
      companion: '#FFEAD7',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#FFFFFF',
      border: '#1F2030',
      borderLight: '#2A2B3A',
      glow: 'rgba(62, 66, 96, 0.4)',
      glowStrong: 'rgba(62, 66, 96, 0.6)',
    }, true),
  },

  fizz_light: {
    id: 'fizz_light',
    colorId: 'fizz',
    mode: 'light',
    name: 'Fizz',
    icon: '',
    kanji: '泡',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#3E4260',
      accentDark: '#2E3250',
      accentLight: '#5A5E7A',
      companion: '#FFEAD7',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#FFFFFF',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(62, 66, 96, 0.2)',
      glowStrong: 'rgba(62, 66, 96, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 10. CADET - Bleu Cadet + Menthe Glacée
  // Accent: #5E9EA0 | Light BG: #F0F5DF
  // ─────────────────────────────────────────────

  cadet_dark: {
    id: 'cadet_dark',
    colorId: 'cadet',
    mode: 'dark',
    name: 'Cadet',
    icon: '',
    kanji: '翠',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#5E9EA0',
      accentDark: '#488588',
      accentLight: '#7AB5B7',
      companion: '#F0F5DF',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#1F2A2A',
      borderLight: '#2A3535',
      glow: 'rgba(94, 158, 160, 0.4)',
      glowStrong: 'rgba(94, 158, 160, 0.6)',
    }, true),
  },

  cadet_light: {
    id: 'cadet_light',
    colorId: 'cadet',
    mode: 'light',
    name: 'Cadet',
    icon: '',
    kanji: '翠',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#5E9EA0',
      accentDark: '#488588',
      accentLight: '#7AB5B7',
      companion: '#F0F5DF',
      accentText: '#3A7A7C',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(94, 158, 160, 0.2)',
      glowStrong: 'rgba(94, 158, 160, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 11. TIFFANY - Bleu Tiffany + Noir (Tiffany x Nike)
  // Accent: #0ABAB5 | Companion: #1A1A1A
  // ─────────────────────────────────────────────

  tiffany_dark: {
    id: 'tiffany_dark',
    colorId: 'tiffany',
    mode: 'dark',
    name: 'Tiffany',
    icon: '',
    kanji: '宝',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#0ABAB5',
      accentDark: '#089A96',
      accentLight: '#3DD4CF',
      companion: '#1A1A1A',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#1A2A2A',
      borderLight: '#253535',
      glow: 'rgba(10, 186, 181, 0.4)',
      glowStrong: 'rgba(10, 186, 181, 0.6)',
    }, true),
  },

  tiffany_light: {
    id: 'tiffany_light',
    colorId: 'tiffany',
    mode: 'light',
    name: 'Tiffany',
    icon: '',
    kanji: '宝',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#0ABAB5',
      accentDark: '#089A96',
      accentLight: '#3DD4CF',
      companion: '#1A1A1A',
      accentText: '#078A87',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(10, 186, 181, 0.2)',
      glowStrong: 'rgba(10, 186, 181, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 12. OBSIDIAN - Or Antique + Obsidienne
  // Accent: #C9A84C | Companion: #2C2C2C
  // ─────────────────────────────────────────────

  obsidian_dark: {
    id: 'obsidian_dark',
    colorId: 'obsidian',
    mode: 'dark',
    name: 'Obsidian',
    icon: '',
    kanji: '黒',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#C9A84C',
      accentDark: '#A8893A',
      accentLight: '#DBBF6A',
      companion: '#2C2C2C',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#2A2518',
      borderLight: '#352F22',
      glow: 'rgba(201, 168, 76, 0.4)',
      glowStrong: 'rgba(201, 168, 76, 0.6)',
    }, true),
  },

  obsidian_light: {
    id: 'obsidian_light',
    colorId: 'obsidian',
    mode: 'light',
    name: 'Obsidian',
    icon: '',
    kanji: '黒',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#C9A84C',
      accentDark: '#A8893A',
      accentLight: '#DBBF6A',
      companion: '#2C2C2C',
      accentText: '#9A8035',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(201, 168, 76, 0.2)',
      glowStrong: 'rgba(201, 168, 76, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 13. SAKURA - Rose Cerisier + Ivoire Chaud
  // Accent: #E891A8 | Companion: #F5E6D3
  // ─────────────────────────────────────────────

  sakura_dark: {
    id: 'sakura_dark',
    colorId: 'sakura',
    mode: 'dark',
    name: 'Sakura',
    icon: '',
    kanji: '桜',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#E891A8',
      accentDark: '#D07090',
      accentLight: '#F0ACBE',
      companion: '#F5E6D3',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#2A1F24',
      borderLight: '#352A30',
      glow: 'rgba(232, 145, 168, 0.4)',
      glowStrong: 'rgba(232, 145, 168, 0.6)',
    }, true),
  },

  sakura_light: {
    id: 'sakura_light',
    colorId: 'sakura',
    mode: 'light',
    name: 'Sakura',
    icon: '',
    kanji: '桜',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#E891A8',
      accentDark: '#D07090',
      accentLight: '#F0ACBE',
      companion: '#F5E6D3',
      accentText: '#C06882',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(232, 145, 168, 0.2)',
      glowStrong: 'rgba(232, 145, 168, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 14. EMERALD - Vert Emeraude + Foret Profonde
  // Accent: #50C878 | Companion: #1B3A2D
  // ─────────────────────────────────────────────

  emerald_dark: {
    id: 'emerald_dark',
    colorId: 'emerald',
    mode: 'dark',
    name: 'Emerald',
    icon: '',
    kanji: '翡',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#50C878',
      accentDark: '#3DA860',
      accentLight: '#70D890',
      companion: '#1B3A2D',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#1A2A20',
      borderLight: '#25352A',
      glow: 'rgba(80, 200, 120, 0.4)',
      glowStrong: 'rgba(80, 200, 120, 0.6)',
    }, true),
  },

  emerald_light: {
    id: 'emerald_light',
    colorId: 'emerald',
    mode: 'light',
    name: 'Emerald',
    icon: '',
    kanji: '翡',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#50C878',
      accentDark: '#3DA860',
      accentLight: '#70D890',
      companion: '#1B3A2D',
      accentText: '#2E9A55',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(80, 200, 120, 0.2)',
      glowStrong: 'rgba(80, 200, 120, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 15. AMBER - Ambre Dore + Bois Fonce
  // Accent: #FFBF00 | Companion: #2D1810
  // ─────────────────────────────────────────────

  amber_dark: {
    id: 'amber_dark',
    colorId: 'amber',
    mode: 'dark',
    name: 'Amber',
    icon: '',
    kanji: '琥',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#FFBF00',
      accentDark: '#D9A200',
      accentLight: '#FFD040',
      companion: '#2D1810',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#2A2515',
      borderLight: '#353020',
      glow: 'rgba(255, 191, 0, 0.4)',
      glowStrong: 'rgba(255, 191, 0, 0.6)',
    }, true),
  },

  amber_light: {
    id: 'amber_light',
    colorId: 'amber',
    mode: 'light',
    name: 'Amber',
    icon: '',
    kanji: '琥',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#FFBF00',
      accentDark: '#D9A200',
      accentLight: '#FFD040',
      companion: '#2D1810',
      accentText: '#B88A00',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(255, 191, 0, 0.2)',
      glowStrong: 'rgba(255, 191, 0, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 16. SLATE - Pervenche + Lilas Pale
  // Accent: #7C8CFF | Companion: #E8E4F0
  // ─────────────────────────────────────────────

  slate_dark: {
    id: 'slate_dark',
    colorId: 'slate',
    mode: 'dark',
    name: 'Slate',
    icon: '',
    kanji: '夜',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#7C8CFF',
      accentDark: '#5A6AE0',
      accentLight: '#9EAAFF',
      companion: '#E8E4F0',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#1F1F2A',
      borderLight: '#2A2A38',
      glow: 'rgba(124, 140, 255, 0.4)',
      glowStrong: 'rgba(124, 140, 255, 0.6)',
    }, true),
  },

  slate_light: {
    id: 'slate_light',
    colorId: 'slate',
    mode: 'light',
    name: 'Slate',
    icon: '',
    kanji: '夜',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#7C8CFF',
      accentDark: '#5A6AE0',
      accentLight: '#9EAAFF',
      companion: '#E8E4F0',
      accentText: '#5560CC',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(124, 140, 255, 0.2)',
      glowStrong: 'rgba(124, 140, 255, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 17. AMBER SMOKE - Beige Rose Chaud + Bleu Acier
  // Accent: #F2E0D0 | Companion: #6E8B98
  // ─────────────────────────────────────────────

  ambersmoke_dark: {
    id: 'ambersmoke_dark',
    colorId: 'ambersmoke',
    mode: 'dark',
    name: 'Amber Smoke',
    icon: '',
    kanji: '煙',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#F2E0D0',
      accentDark: '#D8C4B2',
      accentLight: '#F8EDE4',
      companion: '#6E8B98',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#2A241F',
      borderLight: '#352F2A',
      glow: 'rgba(242, 224, 208, 0.4)',
      glowStrong: 'rgba(242, 224, 208, 0.6)',
    }, true),
  },

  ambersmoke_light: {
    id: 'ambersmoke_light',
    colorId: 'ambersmoke',
    mode: 'light',
    name: 'Amber Smoke',
    icon: '',
    kanji: '煙',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#F2E0D0',
      accentDark: '#D8C4B2',
      accentLight: '#F8EDE4',
      companion: '#6E8B98',
      accentText: '#8A7060',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(242, 224, 208, 0.2)',
      glowStrong: 'rgba(242, 224, 208, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 18. DREAMY - Ocean Profond + Vert Creme
  // Accent: #006989 | Companion: #EAEBCD
  // ─────────────────────────────────────────────

  dreamy_dark: {
    id: 'dreamy_dark',
    colorId: 'dreamy',
    mode: 'dark',
    name: 'Dreamy',
    icon: '',
    kanji: '夢',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#006989',
      accentDark: '#005070',
      accentLight: '#2089A9',
      companion: '#EAEBCD',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#FFFFFF',
      border: '#0F1F2A',
      borderLight: '#1A2A35',
      glow: 'rgba(0, 105, 137, 0.4)',
      glowStrong: 'rgba(0, 105, 137, 0.6)',
    }, true),
  },

  dreamy_light: {
    id: 'dreamy_light',
    colorId: 'dreamy',
    mode: 'light',
    name: 'Dreamy',
    icon: '',
    kanji: '夢',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#006989',
      accentDark: '#005070',
      accentLight: '#2089A9',
      companion: '#EAEBCD',
      accentText: '#005070',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#FFFFFF',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(0, 105, 137, 0.2)',
      glowStrong: 'rgba(0, 105, 137, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 19. LAVENDAR - Rose Violet Vif + Violet Fonce
  // Accent: #F492F0 | Companion: #8E429C
  // ─────────────────────────────────────────────

  lavendar_dark: {
    id: 'lavendar_dark',
    colorId: 'lavendar',
    mode: 'dark',
    name: 'Lavendar',
    icon: '',
    kanji: '紫',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#F492F0',
      accentDark: '#D874D4',
      accentLight: '#F8B0F6',
      companion: '#8E429C',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#2A1F2A',
      borderLight: '#352A35',
      glow: 'rgba(244, 146, 240, 0.4)',
      glowStrong: 'rgba(244, 146, 240, 0.6)',
    }, true),
  },

  lavendar_light: {
    id: 'lavendar_light',
    colorId: 'lavendar',
    mode: 'light',
    name: 'Lavendar',
    icon: '',
    kanji: '紫',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#F492F0',
      accentDark: '#D874D4',
      accentLight: '#F8B0F6',
      companion: '#8E429C',
      accentText: '#9E3AAE',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(244, 146, 240, 0.2)',
      glowStrong: 'rgba(244, 146, 240, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // 20. CHARTREUSE - Jaune-Vert Neon + Bleu Nuit
  // Accent: #E0FF4F | Companion: #00272B
  // ─────────────────────────────────────────────

  chartreuse_dark: {
    id: 'chartreuse_dark',
    colorId: 'chartreuse',
    mode: 'dark',
    name: 'Chartreuse',
    icon: '',
    kanji: '蛍',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#1C1C1E',
      backgroundElevated: '#2C2C2E',
      backgroundLight: '#3A3A3C',
      accent: '#E0FF4F',
      accentDark: '#C0DD30',
      accentLight: '#EAFF7A',
      companion: '#00272B',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AEAEB2',
      textOnAccent: '#000000',
      border: '#1F2A1A',
      borderLight: '#2A3525',
      glow: 'rgba(224, 255, 79, 0.4)',
      glowStrong: 'rgba(224, 255, 79, 0.6)',
    }, true),
  },

  chartreuse_light: {
    id: 'chartreuse_light',
    colorId: 'chartreuse',
    mode: 'light',
    name: 'Chartreuse',
    icon: '',
    kanji: '蛍',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#F8F8F8',
      accent: '#E0FF4F',
      accentDark: '#C0DD30',
      accentLight: '#EAFF7A',
      companion: '#00272B',
      accentText: '#5A6E00',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E5E5E5',
      borderLight: '#F0F0F0',
      glow: 'rgba(224, 255, 79, 0.2)',
      glowStrong: 'rgba(224, 255, 79, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // CLASSIC - Monochrome Blanc Pur
  // Accent: #EEEEEE
  // ─────────────────────────────────────────────

  classic_dark: {
    id: 'classic_dark',
    colorId: 'classic',
    mode: 'dark',
    name: 'Classic',
    icon: '',
    kanji: '黒',
    colors: createThemeColors({
      background: '#0D0D0D',
      backgroundCard: '#1A1A1A',
      backgroundElevated: '#262626',
      backgroundLight: '#333333',
      accent: '#FFFFFF',
      accentDark: '#CCCCCC',
      accentLight: '#FFFFFF',
      companion: '#888888',
      textPrimary: '#FFFFFF',
      textSecondary: '#E8E8E8',
      textMuted: '#AAAAAA',
      textOnAccent: '#000000',
      border: '#2E2E2E',
      borderLight: '#3D3D3D',
      glow: 'rgba(255, 255, 255, 0.2)',
      glowStrong: 'rgba(255, 255, 255, 0.4)',
    }, true),
  },

  classic_light: {
    id: 'classic_light',
    colorId: 'classic',
    mode: 'light',
    name: 'Classic',
    icon: '',
    kanji: '黒',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FAFAFA',
      backgroundElevated: '#F2F2F2',
      backgroundLight: '#E8E8E8',
      accent: '#111111',
      accentDark: '#000000',
      accentLight: '#444444',
      companion: '#888888',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#FFFFFF',
      border: '#E0E0E0',
      borderLight: '#EFEFEF',
      glow: 'rgba(0, 0, 0, 0.1)',
      glowStrong: 'rgba(0, 0, 0, 0.2)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // VOLT - Jaune Electrique
  // Accent: #C8FF00
  // ─────────────────────────────────────────────

  volt_dark: {
    id: 'volt_dark',
    colorId: 'volt',
    mode: 'dark',
    name: 'Volt',
    icon: '',
    kanji: '電',
    colors: createThemeColors({
      background: '#030A00',
      backgroundCard: '#0D1800',
      backgroundElevated: '#162400',
      backgroundLight: '#1E3000',
      accent: '#CCFF00',
      accentDark: '#99CC00',
      accentLight: '#DEFF66',
      companion: '#88CC00',
      accentText: '#557700',
      textPrimary: '#EFFFCC',
      textSecondary: '#CCEE99',
      textMuted: '#88AA55',
      textOnAccent: '#000000',
      border: '#1E3C00',
      borderLight: '#2A5000',
      glow: 'rgba(204, 255, 0, 0.5)',
      glowStrong: 'rgba(204, 255, 0, 0.75)',
    }, true),
  },

  volt_light: {
    id: 'volt_light',
    colorId: 'volt',
    mode: 'light',
    name: 'Volt',
    icon: '',
    kanji: '電',
    colors: createThemeColors({
      background: '#FAFFF0',
      backgroundCard: '#F5FFE0',
      backgroundElevated: '#EFFFCC',
      backgroundLight: '#E5FFBB',
      accent: '#6B9900',
      accentDark: '#4A7000',
      accentLight: '#99DD00',
      companion: '#447700',
      accentText: '#3A6600',
      textPrimary: '#1A2600',
      textSecondary: '#2A3A00',
      textMuted: '#556600',
      textOnAccent: '#FFFFFF',
      border: '#CCEE88',
      borderLight: '#DDFFA0',
      glow: 'rgba(107, 153, 0, 0.2)',
      glowStrong: 'rgba(107, 153, 0, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // MAGMA - Rouge Lave
  // Accent: #FF2200
  // ─────────────────────────────────────────────

  magma_dark: {
    id: 'magma_dark',
    colorId: 'magma',
    mode: 'dark',
    name: 'Magma',
    icon: '',
    kanji: '炎',
    colors: createThemeColors({
      background: '#0D0000',
      backgroundCard: '#1C0505',
      backgroundElevated: '#2A0808',
      backgroundLight: '#380A0A',
      accent: '#FF0000',
      accentDark: '#CC0000',
      accentLight: '#FF5555',
      companion: '#CC2200',
      textPrimary: '#FFE8E5',
      textSecondary: '#FFBBBB',
      textMuted: '#AA6666',
      textOnAccent: '#FFFFFF',
      border: '#3D1010',
      borderLight: '#551515',
      glow: 'rgba(255, 0, 0, 0.6)',
      glowStrong: 'rgba(255, 0, 0, 0.85)',
    }, true),
  },

  magma_light: {
    id: 'magma_light',
    colorId: 'magma',
    mode: 'light',
    name: 'Magma',
    icon: '',
    kanji: '炎',
    colors: createThemeColors({
      background: '#FFF5F3',
      backgroundCard: '#FFEEEB',
      backgroundElevated: '#FFE6E2',
      backgroundLight: '#FFD8D3',
      accent: '#DD0000',
      accentDark: '#AA0000',
      accentLight: '#FF4444',
      companion: '#FF4400',
      textPrimary: '#2A0000',
      textSecondary: '#440000',
      textMuted: '#884444',
      textOnAccent: '#FFFFFF',
      border: '#FFBBB5',
      borderLight: '#FFD0CC',
      glow: 'rgba(200, 24, 0, 0.2)',
      glowStrong: 'rgba(200, 24, 0, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // MATRIX - Vert Cyber
  // Accent: #00FF41
  // ─────────────────────────────────────────────

  matrix_dark: {
    id: 'matrix_dark',
    colorId: 'matrix',
    mode: 'dark',
    name: 'Matrix',
    icon: '',
    kanji: '緑',
    colors: createThemeColors({
      background: '#000800',
      backgroundCard: '#001200',
      backgroundElevated: '#001A00',
      backgroundLight: '#002400',
      accent: '#00FF41',
      accentDark: '#00CC33',
      accentLight: '#66FF88',
      companion: '#00AA30',
      accentText: '#008822',
      textPrimary: '#E0FFE8',
      textSecondary: '#AAFFBB',
      textMuted: '#55AA66',
      textOnAccent: '#000000',
      border: '#003300',
      borderLight: '#004400',
      glow: 'rgba(0, 255, 65, 0.5)',
      glowStrong: 'rgba(0, 255, 65, 0.75)',
    }, true),
  },

  matrix_light: {
    id: 'matrix_light',
    colorId: 'matrix',
    mode: 'light',
    name: 'Matrix',
    icon: '',
    kanji: '緑',
    colors: createThemeColors({
      background: '#F0FFF5',
      backgroundCard: '#E5FFEE',
      backgroundElevated: '#D8FFE8',
      backgroundLight: '#CCFFE0',
      accent: '#007822',
      accentDark: '#005518',
      accentLight: '#00AA33',
      companion: '#005500',
      accentText: '#004A1A',
      textPrimary: '#001A08',
      textSecondary: '#002A10',
      textMuted: '#336644',
      textOnAccent: '#FFFFFF',
      border: '#AAFFCC',
      borderLight: '#CCFFE0',
      glow: 'rgba(0, 120, 34, 0.2)',
      glowStrong: 'rgba(0, 120, 34, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // BLAZE - Orange Feu
  // Accent: #FF6B00
  // ─────────────────────────────────────────────

  blaze_dark: {
    id: 'blaze_dark',
    colorId: 'blaze',
    mode: 'dark',
    name: 'Blaze',
    icon: '',
    kanji: '焔',
    colors: createThemeColors({
      background: '#0A0400',
      backgroundCard: '#1A0800',
      backgroundElevated: '#260D00',
      backgroundLight: '#331200',
      accent: '#FF6600',
      accentDark: '#CC4D00',
      accentLight: '#FF9955',
      companion: '#CC5500',
      textPrimary: '#FFF0E5',
      textSecondary: '#FFCC99',
      textMuted: '#AA7744',
      textOnAccent: '#FFFFFF',
      border: '#3D1A00',
      borderLight: '#552400',
      glow: 'rgba(255, 102, 0, 0.55)',
      glowStrong: 'rgba(255, 102, 0, 0.75)',
    }, true),
  },

  blaze_light: {
    id: 'blaze_light',
    colorId: 'blaze',
    mode: 'light',
    name: 'Blaze',
    icon: '',
    kanji: '焔',
    colors: createThemeColors({
      background: '#FFF8F0',
      backgroundCard: '#FFEFE0',
      backgroundElevated: '#FFE5CC',
      backgroundLight: '#FFDABC',
      accent: '#CC4D00',
      accentDark: '#993800',
      accentLight: '#FF8844',
      companion: '#FF4400',
      textPrimary: '#2A1000',
      textSecondary: '#441800',
      textMuted: '#885533',
      textOnAccent: '#FFFFFF',
      border: '#FFCC99',
      borderLight: '#FFDDBB',
      glow: 'rgba(200, 77, 0, 0.2)',
      glowStrong: 'rgba(200, 77, 0, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // PHANTOM - Violet Profond
  // Accent: #8B5CF6
  // ─────────────────────────────────────────────

  phantom_dark: {
    id: 'phantom_dark',
    colorId: 'phantom',
    mode: 'dark',
    name: 'Phantom',
    icon: '',
    kanji: '影',
    colors: createThemeColors({
      background: '#08000F',
      backgroundCard: '#120020',
      backgroundElevated: '#1C003A',
      backgroundLight: '#260052',
      accent: '#C000FF',
      accentDark: '#9400CC',
      accentLight: '#DD55FF',
      companion: '#9400CC',
      textPrimary: '#F5E8FF',
      textSecondary: '#DDAAFF',
      textMuted: '#9955CC',
      textOnAccent: '#FFFFFF',
      border: '#350055',
      borderLight: '#4A007A',
      glow: 'rgba(192, 0, 255, 0.6)',
      glowStrong: 'rgba(192, 0, 255, 0.85)',
    }, true),
  },

  phantom_light: {
    id: 'phantom_light',
    colorId: 'phantom',
    mode: 'light',
    name: 'Phantom',
    icon: '',
    kanji: '影',
    colors: createThemeColors({
      background: '#FAF5FF',
      backgroundCard: '#F3E8FF',
      backgroundElevated: '#EEDDFF',
      backgroundLight: '#E5D0FF',
      accent: '#9B00E8',
      accentDark: '#7000BB',
      accentLight: '#C055FF',
      companion: '#9333EA',
      textPrimary: '#1A0040',
      textSecondary: '#2A0060',
      textMuted: '#664499',
      textOnAccent: '#FFFFFF',
      border: '#D0AAFF',
      borderLight: '#E2CCFF',
      glow: 'rgba(124, 58, 237, 0.2)',
      glowStrong: 'rgba(124, 58, 237, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // GHOST - Gris Minimal
  // Accent: #9CA3AF
  // ─────────────────────────────────────────────

  ghost_dark: {
    id: 'ghost_dark',
    colorId: 'ghost',
    mode: 'dark',
    name: 'Ghost',
    icon: '',
    kanji: '霧',
    colors: createThemeColors({
      background: '#111118',
      backgroundCard: '#1C1C28',
      backgroundElevated: '#262638',
      backgroundLight: '#303048',
      accent: '#A0A8C8',
      accentDark: '#7880AA',
      accentLight: '#C8CCEE',
      companion: '#7080B0',
      textPrimary: '#F0F0FF',
      textSecondary: '#CCCCEE',
      textMuted: '#8888AA',
      textOnAccent: '#000000',
      border: '#2E2E44',
      borderLight: '#3C3C56',
      glow: 'rgba(160, 168, 200, 0.35)',
      glowStrong: 'rgba(160, 168, 200, 0.55)',
    }, true),
  },

  ghost_light: {
    id: 'ghost_light',
    colorId: 'ghost',
    mode: 'light',
    name: 'Ghost',
    icon: '',
    kanji: '霧',
    colors: createThemeColors({
      background: '#F5F5FC',
      backgroundCard: '#ECECF8',
      backgroundElevated: '#E4E4F4',
      backgroundLight: '#DCDBF0',
      accent: '#5558AA',
      accentDark: '#3D4090',
      accentLight: '#8888CC',
      companion: '#6066AA',
      textPrimary: '#11113A',
      textSecondary: '#222255',
      textMuted: '#5A5C7A',
      textOnAccent: '#FFFFFF',
      border: '#C8C8E8',
      borderLight: '#DCDCF4',
      glow: 'rgba(85, 88, 170, 0.2)',
      glowStrong: 'rgba(85, 88, 170, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // INDIGO - Bleu Indigo
  // Accent: #6366F1
  // ─────────────────────────────────────────────

  indigo_dark: {
    id: 'indigo_dark',
    colorId: 'indigo',
    mode: 'dark',
    name: 'Indigo',
    icon: '',
    kanji: '藍',
    colors: createThemeColors({
      background: '#05050F',
      backgroundCard: '#0E0E28',
      backgroundElevated: '#161642',
      backgroundLight: '#1E1E58',
      accent: '#6366F1',
      accentDark: '#4F46E5',
      accentLight: '#818CF8',
      companion: '#4F46E5',
      textPrimary: '#EEF0FF',
      textSecondary: '#BBBBFF',
      textMuted: '#6668AA',
      textOnAccent: '#FFFFFF',
      border: '#1E1E55',
      borderLight: '#282880',
      glow: 'rgba(99, 102, 241, 0.55)',
      glowStrong: 'rgba(99, 102, 241, 0.75)',
    }, true),
  },

  indigo_light: {
    id: 'indigo_light',
    colorId: 'indigo',
    mode: 'light',
    name: 'Indigo',
    icon: '',
    kanji: '藍',
    colors: createThemeColors({
      background: '#F5F5FF',
      backgroundCard: '#EDEDFF',
      backgroundElevated: '#E4E4FF',
      backgroundLight: '#D9D9FF',
      accent: '#4F46E5',
      accentDark: '#3730A3',
      accentLight: '#6366F1',
      companion: '#4338CA',
      textPrimary: '#0A0A3A',
      textSecondary: '#14145A',
      textMuted: '#4A4A88',
      textOnAccent: '#FFFFFF',
      border: '#B8B8FF',
      borderLight: '#CCCCFF',
      glow: 'rgba(79, 70, 229, 0.2)',
      glowStrong: 'rgba(79, 70, 229, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // GOLD - Or Luxueux
  // Accent: #FFD700
  // ─────────────────────────────────────────────

  gold_dark: {
    id: 'gold_dark',
    colorId: 'gold',
    mode: 'dark',
    name: 'Gold',
    icon: '',
    kanji: '金',
    colors: createThemeColors({
      background: '#0A0800',
      backgroundCard: '#1A1400',
      backgroundElevated: '#261E00',
      backgroundLight: '#332800',
      accent: '#FFD700',
      accentDark: '#CCAA00',
      accentLight: '#FFE566',
      companion: '#CC9900',
      accentText: '#664400',
      textPrimary: '#FFF8E0',
      textSecondary: '#FFE599',
      textMuted: '#AA8833',
      textOnAccent: '#000000',
      border: '#3D3000',
      borderLight: '#554400',
      glow: 'rgba(255, 215, 0, 0.55)',
      glowStrong: 'rgba(255, 215, 0, 0.75)',
    }, true),
  },

  gold_light: {
    id: 'gold_light',
    colorId: 'gold',
    mode: 'light',
    name: 'Gold',
    icon: '',
    kanji: '金',
    colors: createThemeColors({
      background: '#FFFCF0',
      backgroundCard: '#FFF8E0',
      backgroundElevated: '#FFF3CC',
      backgroundLight: '#FFEEBB',
      accent: '#B8860B',
      accentDark: '#8B6914',
      accentLight: '#DDAA33',
      companion: '#FF9500',
      accentText: '#664400',
      textPrimary: '#1A1200',
      textSecondary: '#2A1E00',
      textMuted: '#886622',
      textOnAccent: '#FFFFFF',
      border: '#EED680',
      borderLight: '#F5E8AA',
      glow: 'rgba(184, 134, 11, 0.2)',
      glowStrong: 'rgba(184, 134, 11, 0.35)',
    }, false),
  },

  // ─────────────────────────────────────────────
  // SUNSET - Coucher de Soleil
  // Accent: #FF4500
  // ─────────────────────────────────────────────

  sunset_dark: {
    id: 'sunset_dark',
    colorId: 'sunset',
    mode: 'dark',
    name: 'Sunset',
    icon: '',
    kanji: '夕',
    colors: createThemeColors({
      background: '#100008',
      backgroundCard: '#1E0012',
      backgroundElevated: '#2C001C',
      backgroundLight: '#3A0026',
      accent: '#FF0080',
      accentDark: '#CC0066',
      accentLight: '#FF55AA',
      companion: '#CC0070',
      textPrimary: '#FFE8F4',
      textSecondary: '#FFAACC',
      textMuted: '#AA5577',
      textOnAccent: '#FFFFFF',
      border: '#440022',
      borderLight: '#660033',
      glow: 'rgba(255, 0, 128, 0.6)',
      glowStrong: 'rgba(255, 0, 128, 0.85)',
    }, true),
  },

  sunset_light: {
    id: 'sunset_light',
    colorId: 'sunset',
    mode: 'light',
    name: 'Sunset',
    icon: '',
    kanji: '夕',
    colors: createThemeColors({
      background: '#FFF5F8',
      backgroundCard: '#FFECF2',
      backgroundElevated: '#FFE2EC',
      backgroundLight: '#FFD5E5',
      accent: '#CC0066',
      accentDark: '#AA0050',
      accentLight: '#FF4499',
      companion: '#FF4478',
      textPrimary: '#2A0015',
      textSecondary: '#440022',
      textMuted: '#884466',
      textOnAccent: '#FFFFFF',
      border: '#FFAACB',
      borderLight: '#FFCCDD',
      glow: 'rgba(224, 32, 90, 0.2)',
      glowStrong: 'rgba(224, 32, 90, 0.35)',
    }, false),
  },
};

// ===================================================
// LISTE DES COULEURS POUR LE SÉLECTEUR
// ===================================================

export const themeColors: { id: ThemeColor; name: string; icon: string; kanji: string; color: string; companion: string }[] = [
  { id: 'ocean', name: 'Ocean', icon: '', kanji: '海', color: '#2872A1', companion: '#CBDDE9' },
  { id: 'fizz', name: 'Fizz', icon: '', kanji: '泡', color: '#3E4260', companion: '#FFEAD7' },
  { id: 'charcoal', name: 'Charcoal', icon: '', kanji: '炭', color: '#D2042D', companion: '#FAF9F6' },
  { id: 'mint', name: 'Mint', icon: '', kanji: '葉', color: '#69A481', companion: '#E7EDEB' },
  { id: 'royal', name: 'Royal', icon: '', kanji: '王', color: '#00539C', companion: '#FFFFFF' },
  { id: 'pumpkin', name: 'Pumpkin', icon: '', kanji: '橙', color: '#FD802E', companion: '#233D4C' },
  { id: 'vista', name: 'Vista', icon: '', kanji: '空', color: '#84ABD6', companion: '#FEFFB9' },
  { id: 'lavender', name: 'Lavender', icon: '', kanji: '花', color: '#D37E91', companion: '#FFE8EE' },
  { id: 'peach', name: 'Peach', icon: '', kanji: '桃', color: '#E74F5E', companion: '#FDDFC5' },
  { id: 'cadet', name: 'Cadet', icon: '', kanji: '翠', color: '#5E9EA0', companion: '#F0F5DF' },
  { id: 'tiffany', name: 'Tiffany', icon: '', kanji: '宝', color: '#0ABAB5', companion: '#1A1A1A' },
  { id: 'obsidian', name: 'Obsidian', icon: '', kanji: '黒', color: '#C9A84C', companion: '#2C2C2C' },
  { id: 'sakura', name: 'Sakura', icon: '', kanji: '桜', color: '#E891A8', companion: '#F5E6D3' },
  { id: 'emerald', name: 'Emerald', icon: '', kanji: '翡', color: '#50C878', companion: '#1B3A2D' },
  { id: 'amber', name: 'Amber', icon: '', kanji: '琥', color: '#FFBF00', companion: '#2D1810' },
  { id: 'slate', name: 'Slate', icon: '', kanji: '夜', color: '#7C8CFF', companion: '#E8E4F0' },
  { id: 'ambersmoke', name: 'Amber Smoke', icon: '', kanji: '煙', color: '#F2E0D0', companion: '#6E8B98' },
  { id: 'dreamy', name: 'Dreamy', icon: '', kanji: '夢', color: '#006989', companion: '#EAEBCD' },
  { id: 'lavendar', name: 'Lavendar', icon: '', kanji: '紫', color: '#F492F0', companion: '#8E429C' },
  { id: 'chartreuse', name: 'Chartreuse', icon: '', kanji: '蛍', color: '#E0FF4F', companion: '#00272B' },
  { id: 'classic', name: 'Classic', icon: '', kanji: '黒', color: '#1A1A1A', companion: '#FFFFFF' },
  { id: 'volt', name: 'Volt', icon: '', kanji: '電', color: '#CCFF00', companion: '#030A00' },
  { id: 'magma', name: 'Magma', icon: '', kanji: '炎', color: '#FF0000', companion: '#0D0000' },
  { id: 'matrix', name: 'Matrix', icon: '', kanji: '緑', color: '#00FF41', companion: '#000800' },
  { id: 'blaze', name: 'Blaze', icon: '', kanji: '焔', color: '#FF6600', companion: '#0A0400' },
  { id: 'phantom', name: 'Phantom', icon: '', kanji: '影', color: '#C000FF', companion: '#08000F' },
  { id: 'ghost', name: 'Ghost', icon: '', kanji: '霧', color: '#A0A8C8', companion: '#111118' },
  { id: 'indigo', name: 'Indigo', icon: '', kanji: '藍', color: '#6366F1', companion: '#05050F' },
  { id: 'gold', name: 'Gold', icon: '', kanji: '金', color: '#FFD700', companion: '#0A0800' },
  { id: 'sunset', name: 'Sunset', icon: '', kanji: '夕', color: '#FF0080', companion: '#100008' },
];

// ===================================================
// HELPER FUNCTIONS
// ===================================================

export const getTheme = (colorId: ThemeColor, mode: 'dark' | 'light'): Theme => {
  const key = `${colorId}_${mode}`;
  return themes[key] || themes.ocean_dark;
};

export const getThemeKey = (colorId: ThemeColor, mode: 'dark' | 'light'): string => {
  return `${colorId}_${mode}`;
};

// Thème par défaut
export const defaultThemeColor: ThemeColor = 'fizz';
export const defaultThemeMode: ThemeMode = 'light';

// Tous les thèmes sont gratuits
export const premiumThemeColors: ThemeColor[] = [];
export const freeThemeColors: ThemeColor[] = ['charcoal', 'mint', 'royal', 'ocean', 'pumpkin', 'vista', 'lavender', 'peach', 'fizz', 'cadet', 'tiffany', 'obsidian', 'sakura', 'emerald', 'amber', 'slate', 'ambersmoke', 'dreamy', 'lavendar', 'chartreuse', 'classic', 'volt', 'magma', 'matrix', 'blaze', 'phantom', 'ghost', 'indigo', 'gold', 'sunset'];

export const isPremiumTheme = (_colorId: ThemeColor): boolean => {
  return false;
};

// ===================================================
// GRADIENTS (compatibilité)
// ===================================================

export const GRADIENTS = {
  primary: ['#2872A1', '#1D5B82'] as [string, string],     // Ocean blue
  secondary: ['#8B5CF6', '#7C3AED'] as [string, string],   // Violet
  success: ['#30D158', '#248A3D'] as [string, string],      // Vert
  gold: ['#FD802E', '#E06A15'] as [string, string],         // Orange pumpkin
  danger: ['#E74F5E', '#CC3545'] as [string, string],       // Rouge peach
  info: ['#2872A1', '#1D5B82'] as [string, string],         // Bleu océan
};
