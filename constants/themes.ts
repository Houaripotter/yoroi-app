// ===================================================
// YOROI - 10 COMBOS DE COULEURS
// 10 couleurs × 2 modes (Dark/Light)
// ===================================================

export type ThemeColor = 'charcoal' | 'mint' | 'royal' | 'ocean' | 'pumpkin' | 'vista' | 'lavender' | 'peach' | 'fizz' | 'cadet' | 'tiffany' | 'obsidian' | 'sakura' | 'emerald' | 'amber' | 'slate';
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#D2042D',
      accentDark: '#B0021F',
      accentLight: '#E83350',
      companion: '#FAF9F6',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#69A481',
      accentDark: '#528A6A',
      accentLight: '#85BA99',
      companion: '#E7EDEB',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#00539C',
      accentDark: '#003D75',
      accentLight: '#2A7BC4',
      companion: '#FFFFFF',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#2872A1',
      accentDark: '#1D5B82',
      accentLight: '#4A94C0',
      companion: '#CBDDE9',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#FD802E',
      accentDark: '#E06A15',
      accentLight: '#FFA060',
      companion: '#233D4C',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#84ABD6',
      accentDark: '#6890BA',
      accentLight: '#A0C2E4',
      companion: '#FEFFB9',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#D37E91',
      accentDark: '#B86578',
      accentLight: '#E09AAA',
      companion: '#FFE8EE',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#E74F5E',
      accentDark: '#CC3545',
      accentLight: '#F07080',
      companion: '#FDDFC5',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#3E4260',
      accentDark: '#2E3250',
      accentLight: '#5A5E7A',
      companion: '#FFEAD7',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#5E9EA0',
      accentDark: '#488588',
      accentLight: '#7AB5B7',
      companion: '#F0F5DF',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#0ABAB5',
      accentDark: '#089A96',
      accentLight: '#3DD4CF',
      companion: '#1A1A1A',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#C9A84C',
      accentDark: '#A8893A',
      accentLight: '#DBBF6A',
      companion: '#2C2C2C',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#E891A8',
      accentDark: '#D07090',
      accentLight: '#F0ACBE',
      companion: '#F5E6D3',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#50C878',
      accentDark: '#3DA860',
      accentLight: '#70D890',
      companion: '#1B3A2D',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#FFBF00',
      accentDark: '#D9A200',
      accentLight: '#FFD040',
      companion: '#2D1810',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#7C8CFF',
      accentDark: '#5A6AE0',
      accentLight: '#9EAAFF',
      companion: '#E8E4F0',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#999999',
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
export const defaultThemeColor: ThemeColor = 'ocean';
export const defaultThemeMode: ThemeMode = 'light';

// Tous les thèmes sont gratuits
export const premiumThemeColors: ThemeColor[] = [];
export const freeThemeColors: ThemeColor[] = ['charcoal', 'mint', 'royal', 'ocean', 'pumpkin', 'vista', 'lavender', 'peach', 'fizz', 'cadet', 'tiffany', 'obsidian', 'sakura', 'emerald', 'amber', 'slate'];

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
