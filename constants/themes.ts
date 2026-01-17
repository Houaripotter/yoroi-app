// ===================================================
// YOROI - SYSTÈME DE 18 THÈMES PREMIUM
// 9 couleurs × 2 modes (Dark/Light)
// ===================================================

export type ThemeColor = 'volt' | 'tiffany' | 'magma' | 'sakura' | 'matrix' | 'blaze' | 'phantom' | 'ghost' | 'ocean' | 'classic' | 'indigo' | 'gold' | 'emerald' | 'sunset' | 'lavender';
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

    // Secondary (purple)
    secondary: '#8B5CF6',
    secondaryDark: '#7C3AED',
    secondaryLight: '#A78BFA',
    secondaryMuted: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',

    // Purple (alias for secondary)
    purple: '#8B5CF6',
    purpleLight: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
    purpleMuted: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',

    // Chart colors
    chart1: base.accent,
    chart2: '#8B5CF6',
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

    // Chart bar colors - NOIR en light, BLANC en dark
    barPrimary: isDark ? '#FFFFFF' : '#1A1A1A',
    barAccent: base.accent,
  };
};

// ===================================================
// DÉFINITION DES 18 THÈMES
// ===================================================

export const themes: Record<string, Theme> = {

  // VOLT - Jaune Électrique ULTRA VIBRANT
  volt_dark: {
    id: 'volt_dark',
    colorId: 'volt',
    mode: 'dark',
    name: 'Volt',
    icon: '',
    kanji: '雷',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#FFFF00',          // Jaune pur électrique
      accentDark: '#FFEE00',
      accentLight: '#FFFF66',     // Ultra lumineux
      textPrimary: '#FFFFFF',
      textSecondary: '#E5E5E5',
      textMuted: '#9E9E9E',
      textOnAccent: '#000000',    // NOIR sur jaune vif ✓
      border: '#2A2A22',
      borderLight: '#3A3A30',
      glow: 'rgba(255, 255, 0, 0.6)',        // Glow plus intense
      glowStrong: 'rgba(255, 255, 0, 0.85)',
    }, true),
  },

  volt_light: {
    id: 'volt_light',
    colorId: 'volt',
    mode: 'light',
    name: 'Volt',
    icon: '',
    kanji: '雷',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#FAFAFA',
      accent: '#FFFF00',          // Jaune fluo électrique IDENTIQUE au dark
      accentDark: '#FFEE00',
      accentLight: '#FFFF66',
      textPrimary: '#000000',
      textSecondary: '#1A1A1A',
      textMuted: '#666666',
      textOnAccent: '#000000',    // NOIR sur jaune fluo ✓
      border: '#EEEEEE',
      borderLight: '#F5F5F5',
      glow: 'rgba(255, 255, 0, 0.6)',        // Glow intense comme dark
      glowStrong: 'rgba(255, 255, 0, 0.85)',
    }, false),
  },

  // TIFFANY - BLEU TIFFANY & CO FLUO (Robin's Egg Blue)
  tiffany_dark: {
    id: 'tiffany_dark',
    colorId: 'tiffany',
    mode: 'dark',
    name: 'Tiffany',
    icon: '',
    kanji: '氷',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#0FFFEF',          // TIFFANY BLUE FLUO - Turquoise distinct!
      accentDark: '#00E8D8',
      accentLight: '#7FFFF4',     // Tiffany clair brillant
      textPrimary: '#FFFFFF',
      textSecondary: '#E5E8E8',
      textMuted: '#9AB0AD',
      textOnAccent: '#000000',    // NOIR sur tiffany fluo ✓
      border: '#1F2D2B',
      borderLight: '#2A3836',
      glow: 'rgba(15, 255, 239, 0.6)',
      glowStrong: 'rgba(15, 255, 239, 0.85)',
    }, true),
  },

  tiffany_light: {
    id: 'tiffany_light',
    colorId: 'tiffany',
    mode: 'light',
    name: 'Tiffany',
    icon: '',
    kanji: '氷',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#FAFAFA',
      accent: '#0FFFEF',          // TIFFANY BLUE FLUO - Turquoise distinct!
      accentDark: '#00E8D8',
      accentLight: '#7FFFF4',
      textPrimary: '#000000',
      textSecondary: '#1A1A1A',
      textMuted: '#666666',
      textOnAccent: '#000000',    // NOIR sur tiffany fluo ✓
      border: '#EEEEEE',
      borderLight: '#F5F5F5',
      glow: 'rgba(15, 255, 239, 0.6)',
      glowStrong: 'rgba(15, 255, 239, 0.85)',
    }, false),
  },

  // MAGMA - Rouge Combat INCANDESCENT
  magma_dark: {
    id: 'magma_dark',
    colorId: 'magma',
    mode: 'dark',
    name: 'Magma',
    icon: '',
    kanji: '炎',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#FF0000',          // Rouge pur incandescent
      accentDark: '#EE0000',
      accentLight: '#FF4444',     // Rouge flamboyant
      textPrimary: '#FFFFFF',
      textSecondary: '#E8E5E5',
      textMuted: '#B09898',
      textOnAccent: '#FFFFFF',
      border: '#2F1F1F',
      borderLight: '#3A2A2A',
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
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#FAFAFA',
      accent: '#FF0000',          // Rouge vif intense
      accentDark: '#DD0000',
      accentLight: '#FF3333',
      textPrimary: '#000000',
      textSecondary: '#1A1A1A',
      textMuted: '#666666',
      textOnAccent: '#FFFFFF',
      border: '#EEEEEE',
      borderLight: '#F5F5F5',
      glow: 'rgba(255, 0, 0, 0.5)',
      glowStrong: 'rgba(255, 0, 0, 0.75)',
    }, false),
  },

  // SAKURA - ROSE CERISE VRAI (pas magenta/violet!)
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
      accent: '#FF69B4',          // HOT PINK - Vrai rose fluo cerise!
      accentDark: '#FF5BA7',
      accentLight: '#FF8DC7',     // Rose bonbon brillant
      textPrimary: '#FFFFFF',
      textSecondary: '#E8E5E8',
      textMuted: '#B098A8',
      textOnAccent: '#000000',    // Noir sur rose
      border: '#2A1F25',
      borderLight: '#352A30',
      glow: 'rgba(255, 105, 180, 0.6)',
      glowStrong: 'rgba(255, 105, 180, 0.85)',
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
      backgroundLight: '#FAFAFA',
      accent: '#FF69B4',          // HOT PINK - Vrai rose fluo cerise!
      accentDark: '#FF5BA7',
      accentLight: '#FF8DC7',
      textPrimary: '#000000',
      textSecondary: '#1A1A1A',
      textMuted: '#666666',
      textOnAccent: '#000000',    // Noir sur rose
      border: '#EEEEEE',
      borderLight: '#F5F5F5',
      glow: 'rgba(255, 105, 180, 0.6)',
      glowStrong: 'rgba(255, 105, 180, 0.85)',
    }, false),
  },

  // MATRIX - Vert Néon ÉLECTRIQUE
  matrix_dark: {
    id: 'matrix_dark',
    colorId: 'matrix',
    mode: 'dark',
    name: 'Matrix',
    icon: '',
    kanji: '電',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#00FF00',          // Vert pur néon Matrix
      accentDark: '#00EE00',
      accentLight: '#66FF66',     // Vert ultra brillant
      textPrimary: '#FFFFFF',
      textSecondary: '#D0E8D8',
      textMuted: '#7BB088',
      textOnAccent: '#000000',
      border: '#1F2A1F',
      borderLight: '#2A352A',
      glow: 'rgba(0, 255, 0, 0.6)',
      glowStrong: 'rgba(0, 255, 0, 0.85)',
    }, true),
  },

  matrix_light: {
    id: 'matrix_light',
    colorId: 'matrix',
    mode: 'light',
    name: 'Matrix',
    icon: '',
    kanji: '電',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#FAFAFA',
      accent: '#00FF00',          // Vert néon MATRIX pur identique au dark
      accentDark: '#00EE00',
      accentLight: '#33FF33',
      textPrimary: '#000000',
      textSecondary: '#1A1A1A',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#EEEEEE',
      borderLight: '#F5F5F5',
      glow: 'rgba(0, 255, 0, 0.6)',        // Glow intense
      glowStrong: 'rgba(0, 255, 0, 0.85)',
    }, false),
  },

  // BLAZE - PÊCHE FLUO MAGNIFIQUE
  blaze_dark: {
    id: 'blaze_dark',
    colorId: 'blaze',
    mode: 'dark',
    name: 'Blaze',
    icon: '',
    kanji: '火',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#FF8574',          // PÊCHE FLUO - Corail lumineux!
      accentDark: '#FF7563',
      accentLight: '#FFA090',     // Pêche clair brillant
      textPrimary: '#FFFFFF',
      textSecondary: '#E8E5E0',
      textMuted: '#B0A098',
      textOnAccent: '#000000',
      border: '#2F2520',
      borderLight: '#3A302A',
      glow: 'rgba(255, 133, 116, 0.6)',
      glowStrong: 'rgba(255, 133, 116, 0.85)',
    }, true),
  },

  blaze_light: {
    id: 'blaze_light',
    colorId: 'blaze',
    mode: 'light',
    name: 'Blaze',
    icon: '',
    kanji: '火',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#FAFAFA',
      accent: '#FF8574',          // PÊCHE FLUO - Corail lumineux!
      accentDark: '#FF7563',
      accentLight: '#FFA090',
      textPrimary: '#000000',
      textSecondary: '#1A1A1A',
      textMuted: '#666666',
      textOnAccent: '#000000',    // NOIR sur pêche fluo ✓
      border: '#EEEEEE',
      borderLight: '#F5F5F5',
      glow: 'rgba(255, 133, 116, 0.6)',
      glowStrong: 'rgba(255, 133, 116, 0.85)',
    }, false),
  },

  // PHANTOM - Violet Mystère NÉON
  phantom_dark: {
    id: 'phantom_dark',
    colorId: 'phantom',
    mode: 'dark',
    name: 'Phantom',
    icon: '',
    kanji: '影',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#CC00FF',          // Violet néon électrique
      accentDark: '#BB00EE',
      accentLight: '#DD66FF',     // Violet ultra brillant
      textPrimary: '#FFFFFF',
      textSecondary: '#E5E0F0',
      textMuted: '#9888B8',
      textOnAccent: '#FFFFFF',
      border: '#251F2F',
      borderLight: '#2F2A3A',
      glow: 'rgba(204, 0, 255, 0.6)',
      glowStrong: 'rgba(204, 0, 255, 0.85)',
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
      background: '#FFFFFF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFFFFF',
      backgroundLight: '#FAFAFA',
      accent: '#9900CC', // Violet plus fonce pour meilleur contraste WCAG AA (etait #CC00FF)
      accentDark: '#7700AA',
      accentLight: '#BB33EE',
      textPrimary: '#000000',
      textSecondary: '#1A1A1A',
      textMuted: '#505050', // Ameliore contraste (etait #666666)
      textOnAccent: '#FFFFFF',
      border: '#EEEEEE',
      borderLight: '#F5F5F5',
      glow: 'rgba(153, 0, 204, 0.6)',
      glowStrong: 'rgba(153, 0, 204, 0.85)',
    }, false),
  },

  // GHOST - Minimaliste
  ghost_dark: {
    id: 'ghost_dark',
    colorId: 'ghost',
    mode: 'dark',
    name: 'Ghost',
    icon: '',
    kanji: '魂',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#FFFFFF',
      accentDark: '#E0E0E0',
      accentLight: '#FFFFFF',
      textPrimary: '#FFFFFF',
      textSecondary: '#C8C8C8',
      textMuted: '#909090',
      textOnAccent: '#000000',
      border: '#252525',
      borderLight: '#303030',
      glow: 'rgba(255, 255, 255, 0.2)',
      glowStrong: 'rgba(255, 255, 255, 0.35)',
    }, true),
  },

  ghost_light: {
    id: 'ghost_light',
    colorId: 'ghost',
    mode: 'light',
    name: 'Ghost',
    icon: '',
    kanji: '魂',
    colors: createThemeColors({
      background: '#FAFAFA',
      backgroundCard: '#F5F5F5',
      backgroundElevated: '#F0F0F0',
      backgroundLight: '#EAEAEA',
      accent: '#5A5A5A', // Ameliore contraste WCAG AA (etait #888888)
      accentDark: '#404040',
      accentLight: '#707070',
      textPrimary: '#1A1A1A',
      textSecondary: '#2A2A2A', // Ameliore contraste (etait #3A3A3A)
      textMuted: '#505050', // Ameliore contraste (etait #666666)
      textOnAccent: '#FFFFFF',
      border: '#DEDEDE',
      borderLight: '#EEEEEE',
      glow: 'rgba(0, 0, 0, 0.08)',
      glowStrong: 'rgba(0, 0, 0, 0.15)',
    }, false),
  },

  // OCEAN - Bleu Profond ÉLECTRIQUE
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
      accent: '#00D4FF',          // Bleu cyan ultra vif
      accentDark: '#00BBEE',
      accentLight: '#66E5FF',     // Bleu océan brillant
      textPrimary: '#FFFFFF',
      textSecondary: '#D0E5F0',
      textMuted: '#7898B8',
      textOnAccent: '#000000',
      border: '#1F2A30',
      borderLight: '#2A3540',
      glow: 'rgba(0, 212, 255, 0.6)',
      glowStrong: 'rgba(0, 212, 255, 0.85)',
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
      backgroundLight: '#FAFAFA',
      accent: '#00D4FF',          // Bleu cyan électrique identique au dark
      accentDark: '#00CCFF',
      accentLight: '#33DDFF',
      textPrimary: '#000000',
      textSecondary: '#1A1A1A',
      textMuted: '#666666',
      textOnAccent: '#000000',    // NOIR sur cyan vif ✓
      border: '#EEEEEE',
      borderLight: '#F5F5F5',
      glow: 'rgba(0, 212, 255, 0.6)',        // Glow cyan intense
      glowStrong: 'rgba(0, 212, 255, 0.85)',
    }, false),
  },

  // ⬛ CLASSIC - Noir & Blanc Pur
  classic_dark: {
    id: 'classic_dark',
    colorId: 'classic',
    mode: 'dark',
    name: 'Classic',
    icon: '⬛',
    kanji: '墨',
    colors: createThemeColors({
      background: '#0A0A0A',
      backgroundCard: '#151515',
      backgroundElevated: '#1F1F1F',
      backgroundLight: '#2A2A2A',
      accent: '#FFFFFF',
      accentDark: '#E0E0E0',
      accentLight: '#FFFFFF',
      textPrimary: '#FFFFFF',
      textSecondary: '#B8B8B8',
      textMuted: '#808080',
      textOnAccent: '#000000',
      border: '#2A2A2A',
      borderLight: '#353535',
      glow: 'rgba(255, 255, 255, 0.15)',
      glowStrong: 'rgba(255, 255, 255, 0.25)',
    }, true),
  },

  classic_light: {
    id: 'classic_light',
    colorId: 'classic',
    mode: 'light',
    name: 'Classic',
    icon: '',
    kanji: '墨',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#F8F8F8',
      backgroundElevated: '#F0F0F0',
      backgroundLight: '#FAFAFA',
      accent: '#1A1A1A',           // NOIR pour mode clair
      accentDark: '#000000',
      accentLight: '#333333',
      textPrimary: '#1A1A1A',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#FFFFFF',     // Blanc sur noir
      border: '#E5E5E5',
      borderLight: '#EEEEEE',
      glow: 'rgba(0, 0, 0, 0.08)',
      glowStrong: 'rgba(0, 0, 0, 0.15)',
    }, false),
  },

  // 💜 INDIGO - Bleu-Violet Profond
  indigo_dark: {
    id: 'indigo_dark',
    colorId: 'indigo',
    mode: 'dark',
    name: 'Indigo',
    icon: '💜',
    kanji: '藍',
    colors: createThemeColors({
      background: '#0A0A14',
      backgroundCard: '#12121F',
      backgroundElevated: '#1A1A2E',
      backgroundLight: '#22223A',
      accent: '#6366F1',
      accentDark: '#4F46E5',
      accentLight: '#818CF8',
      textPrimary: '#FFFFFF',
      textSecondary: '#C7C7D9',
      textMuted: '#8B8BA3',
      textOnAccent: '#FFFFFF',
      border: '#2A2A45',
      borderLight: '#3A3A55',
      glow: 'rgba(99, 102, 241, 0.4)',
      glowStrong: 'rgba(99, 102, 241, 0.6)',
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
      background: '#F8F8FF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#F0F0FF',
      backgroundLight: '#E8E8F8',
      accent: '#4F46E5',
      accentDark: '#4338CA',
      accentLight: '#6366F1',
      textPrimary: '#1A1A2E',
      textSecondary: '#3A3A55',
      textMuted: '#5A5A75',
      textOnAccent: '#FFFFFF',
      border: '#E0E0F0',
      borderLight: '#EEEEFC',
      glow: 'rgba(79, 70, 229, 0.15)',
      glowStrong: 'rgba(79, 70, 229, 0.25)',
    }, false),
  },

  // 🏆 GOLD - Or Luxueux
  gold_dark: {
    id: 'gold_dark',
    colorId: 'gold',
    mode: 'dark',
    name: 'Gold',
    icon: '🏆',
    kanji: '金',
    colors: createThemeColors({
      background: '#0D0A05',
      backgroundCard: '#1A1408',
      backgroundElevated: '#251E0D',
      backgroundLight: '#302712',
      accent: '#D4AF37',
      accentDark: '#B8960C',
      accentLight: '#F0C850',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0D5B8',
      textMuted: '#A89B70',
      textOnAccent: '#000000',
      border: '#3D3415',
      borderLight: '#4D4320',
      glow: 'rgba(212, 175, 55, 0.4)',
      glowStrong: 'rgba(212, 175, 55, 0.6)',
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
      background: '#FFFDF5',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFF8E8',
      backgroundLight: '#FFF3D8',
      accent: '#B8960C',
      accentDark: '#9A7B00',
      accentLight: '#D4AF37',
      textPrimary: '#1A1408',
      textSecondary: '#3D3415',
      textMuted: '#5D5430',
      textOnAccent: '#000000',
      border: '#E8E0C8',
      borderLight: '#F0EAD8',
      glow: 'rgba(184, 150, 12, 0.15)',
      glowStrong: 'rgba(184, 150, 12, 0.25)',
    }, false),
  },

  // 💎 EMERALD - Emeraude Profond
  emerald_dark: {
    id: 'emerald_dark',
    colorId: 'emerald',
    mode: 'dark',
    name: 'Emerald',
    icon: '💎',
    kanji: '翠',
    colors: createThemeColors({
      background: '#05100D',
      backgroundCard: '#0A1A15',
      backgroundElevated: '#10251F',
      backgroundLight: '#153028',
      accent: '#10B981',
      accentDark: '#059669',
      accentLight: '#34D399',
      textPrimary: '#FFFFFF',
      textSecondary: '#B8E0D0',
      textMuted: '#70A898',
      textOnAccent: '#000000',
      border: '#1A3D32',
      borderLight: '#254D42',
      glow: 'rgba(16, 185, 129, 0.4)',
      glowStrong: 'rgba(16, 185, 129, 0.6)',
    }, true),
  },

  emerald_light: {
    id: 'emerald_light',
    colorId: 'emerald',
    mode: 'light',
    name: 'Emerald',
    icon: '',
    kanji: '翠',
    colors: createThemeColors({
      background: '#F5FFFC',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#E8FFF5',
      backgroundLight: '#D8FFED',
      accent: '#059669',
      accentDark: '#047857',
      accentLight: '#10B981',
      textPrimary: '#0A1A15',
      textSecondary: '#153028',
      textMuted: '#2D5045',
      textOnAccent: '#FFFFFF',
      border: '#C8E8DC',
      borderLight: '#D8F0E8',
      glow: 'rgba(5, 150, 105, 0.15)',
      glowStrong: 'rgba(5, 150, 105, 0.25)',
    }, false),
  },

  // 🌅 SUNSET - Coucher de Soleil
  sunset_dark: {
    id: 'sunset_dark',
    colorId: 'sunset',
    mode: 'dark',
    name: 'Sunset',
    icon: '🌅',
    kanji: '夕',
    colors: createThemeColors({
      background: '#100805',
      backgroundCard: '#1A0D08',
      backgroundElevated: '#25140D',
      backgroundLight: '#301A12',
      accent: '#FF6B35',
      accentDark: '#E85520',
      accentLight: '#FF8B5A',
      textPrimary: '#FFFFFF',
      textSecondary: '#F0D0C0',
      textMuted: '#B08878',
      textOnAccent: '#FFFFFF',
      border: '#402418',
      borderLight: '#503020',
      glow: 'rgba(255, 107, 53, 0.4)',
      glowStrong: 'rgba(255, 107, 53, 0.6)',
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
      background: '#FFFAF5',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#FFF0E8',
      backgroundLight: '#FFE8D8',
      accent: '#E85520',
      accentDark: '#D04515',
      accentLight: '#FF6B35',
      textPrimary: '#1A0D08',
      textSecondary: '#402418',
      textMuted: '#604030',
      textOnAccent: '#FFFFFF',
      border: '#F0D8C8',
      borderLight: '#F8E8DC',
      glow: 'rgba(232, 85, 32, 0.15)',
      glowStrong: 'rgba(232, 85, 32, 0.25)',
    }, false),
  },

  // 🪻 LAVENDER - Lavande Douce
  lavender_dark: {
    id: 'lavender_dark',
    colorId: 'lavender',
    mode: 'dark',
    name: 'Lavender',
    icon: '🪻',
    kanji: '紫',
    colors: createThemeColors({
      background: '#0D0A10',
      backgroundCard: '#15121A',
      backgroundElevated: '#1E1A25',
      backgroundLight: '#272230',
      accent: '#A78BFA',
      accentDark: '#8B5CF6',
      accentLight: '#C4B5FD',
      textPrimary: '#FFFFFF',
      textSecondary: '#D8D0E8',
      textMuted: '#9890A8',
      textOnAccent: '#000000',
      border: '#352D40',
      borderLight: '#453D55',
      glow: 'rgba(167, 139, 250, 0.4)',
      glowStrong: 'rgba(167, 139, 250, 0.6)',
    }, true),
  },

  lavender_light: {
    id: 'lavender_light',
    colorId: 'lavender',
    mode: 'light',
    name: 'Lavender',
    icon: '',
    kanji: '紫',
    colors: createThemeColors({
      background: '#FAF8FF',
      backgroundCard: '#FFFFFF',
      backgroundElevated: '#F0ECFF',
      backgroundLight: '#E8E0FF',
      accent: '#8B5CF6',
      accentDark: '#7C3AED',
      accentLight: '#A78BFA',
      textPrimary: '#15121A',
      textSecondary: '#352D40',
      textMuted: '#554D65',
      textOnAccent: '#FFFFFF',
      border: '#E0D8F0',
      borderLight: '#EDE8F8',
      glow: 'rgba(139, 92, 246, 0.15)',
      glowStrong: 'rgba(139, 92, 246, 0.25)',
    }, false),
  },
};

// ===================================================
// LISTE DES COULEURS POUR LE SÉLECTEUR
// ===================================================

export const themeColors: { id: ThemeColor; name: string; icon: string; kanji: string; color: string }[] = [
  { id: 'classic', name: 'Classic', icon: '', kanji: '墨', color: '#1A1A1A' },
  { id: 'tiffany', name: 'Tiffany', icon: '', kanji: '氷', color: '#0FFFEF' },  // Bleu Tiffany & Co fluo
  { id: 'volt', name: 'Volt', icon: '', kanji: '雷', color: '#FFFF00' },
  { id: 'magma', name: 'Magma', icon: '', kanji: '炎', color: '#FF0000' },
  { id: 'sakura', name: 'Sakura', icon: '', kanji: '桜', color: '#FF69B4' },  // ROSE CERISE (Hot Pink)
  { id: 'matrix', name: 'Matrix', icon: '', kanji: '電', color: '#00FF00' },
  { id: 'blaze', name: 'Blaze', icon: '', kanji: '火', color: '#FF8574' },   // PÊCHE FLUO
  { id: 'phantom', name: 'Phantom', icon: '', kanji: '影', color: '#CC00FF' },
  { id: 'ghost', name: 'Ghost', icon: '', kanji: '魂', color: '#888888' },
  { id: 'ocean', name: 'Ocean', icon: '', kanji: '海', color: '#00D4FF' },
  // 5 Nouveaux thèmes
  { id: 'indigo', name: 'Indigo', icon: '', kanji: '藍', color: '#6366F1' },   // Bleu-violet profond
  { id: 'gold', name: 'Gold', icon: '', kanji: '金', color: '#D4AF37' },       // Or luxueux
  { id: 'emerald', name: 'Emerald', icon: '', kanji: '翠', color: '#10B981' }, // Émeraude profond
  { id: 'sunset', name: 'Sunset', icon: '', kanji: '夕', color: '#FF6B35' },   // Coucher de soleil
  { id: 'lavender', name: 'Lavender', icon: '', kanji: '紫', color: '#A78BFA' }, // Lavande douce
];

// ===================================================
// HELPER FUNCTIONS
// ===================================================

export const getTheme = (colorId: ThemeColor, mode: 'dark' | 'light'): Theme => {
  const key = `${colorId}_${mode}`;
  return themes[key] || themes.volt_dark;
};

export const getThemeKey = (colorId: ThemeColor, mode: 'dark' | 'light'): string => {
  return `${colorId}_${mode}`;
};

// Thème par défaut
export const defaultThemeColor: ThemeColor = 'classic';
export const defaultThemeMode: ThemeMode = 'light';

// Thèmes Premium (pour monétisation future)
export const premiumThemeColors: ThemeColor[] = ['volt', 'magma', 'sakura', 'matrix', 'blaze', 'phantom', 'ghost', 'ocean'];
export const freeThemeColors: ThemeColor[] = ['classic', 'tiffany'];

export const isPremiumTheme = (colorId: ThemeColor): boolean => {
  // Tous les thèmes sont maintenant gratuits
  return false;
};

// ===================================================
// GRADIENTS (compatibilité) - ULTRA VIBRANTS
// ===================================================

export const GRADIENTS = {
  primary: ['#FFFF00', '#FFEE00'] as [string, string],     // Jaune électrique
  secondary: ['#CC00FF', '#BB00EE'] as [string, string],   // Violet néon
  success: ['#00FF00', '#00EE00'] as [string, string],     // Vert néon
  gold: ['#FFFF00', '#FFEE00'] as [string, string],        // Or brillant
  danger: ['#FF0000', '#EE0000'] as [string, string],      // Rouge pur
  info: ['#00D4FF', '#00BBEE'] as [string, string],        // Bleu cyan
};
