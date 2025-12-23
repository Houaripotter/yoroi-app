// ===================================================
// YOROI - SYSTÈME DE 18 THÈMES PREMIUM
// 9 couleurs × 2 modes (Dark/Light)
// ===================================================

export type ThemeColor = 'volt' | 'tiffany' | 'magma' | 'sakura' | 'matrix' | 'blaze' | 'phantom' | 'ghost' | 'ocean' | 'classic';
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

  return {
    // Base colors
    ...base,
    accentMuted,

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

  // ⚡ VOLT - Jaune Électrique
  volt_dark: {
    id: 'volt_dark',
    colorId: 'volt',
    mode: 'dark',
    name: 'Volt',
    icon: '⚡',
    kanji: '雷',
    colors: createThemeColors({
      background: '#000000',
      backgroundCard: '#0A0A08',
      backgroundElevated: '#1E1E1A',
      backgroundLight: '#282820',
      accent: '#FFE500',
      accentDark: '#E6CF00',
      accentLight: '#FFF34D',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#8E8E93',
      textOnAccent: '#000000',
      border: '#2A2A22',
      borderLight: '#3A3A30',
      glow: 'rgba(255, 229, 0, 0.4)',
      glowStrong: 'rgba(255, 229, 0, 0.6)',
    }, true),
  },

  volt_light: {
    id: 'volt_light',
    colorId: 'volt',
    mode: 'light',
    name: 'Volt',
    icon: '⚡',
    kanji: '雷',
    colors: createThemeColors({
      background: '#FFFEF5',
      backgroundCard: '#FFFCE8',
      backgroundElevated: '#FFF9D0',
      backgroundLight: '#FFF4B8',
      accent: '#FFE500',
      accentDark: '#E6CF00',
      accentLight: '#FFF34D',
      textPrimary: '#1A1A1A',
      textSecondary: '#3A3A3A',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#F0E8C0',
      borderLight: '#FFF8D8',
      glow: 'rgba(255, 229, 0, 0.25)',
      glowStrong: 'rgba(255, 229, 0, 0.4)',
    }, false),
  },

  // 💎 TIFFANY - Turquoise Luxe
  tiffany_dark: {
    id: 'tiffany_dark',
    colorId: 'tiffany',
    mode: 'dark',
    name: 'Tiffany',
    icon: '💎',
    kanji: '氷',
    colors: createThemeColors({
      background: '#000000',
      backgroundCard: '#060C0C',
      backgroundElevated: '#121E1E',
      backgroundLight: '#1A2828',
      accent: '#0ABAB5',
      accentDark: '#089E9A',
      accentLight: '#5CE0DB',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0E8E8',
      textMuted: '#8AA0A0',
      textOnAccent: '#FFFFFF',
      border: '#1A2828',
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
    icon: '💎',
    kanji: '氷',
    colors: createThemeColors({
      background: '#F5FAFA',
      backgroundCard: '#E8F8F8',
      backgroundElevated: '#D8F2F2',
      backgroundLight: '#C8ECEC',
      accent: '#0ABAB5',
      accentDark: '#089E9A',
      accentLight: '#5CE0DB',
      textPrimary: '#1A1A1A',
      textSecondary: '#3A3A3A',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#C0E0E0',
      borderLight: '#D8F0F0',
      glow: 'rgba(10, 186, 181, 0.2)',
      glowStrong: 'rgba(10, 186, 181, 0.35)',
    }, false),
  },

  // 🔥 MAGMA - Rouge Combat
  magma_dark: {
    id: 'magma_dark',
    colorId: 'magma',
    mode: 'dark',
    name: 'Magma',
    icon: '🔥',
    kanji: '炎',
    colors: createThemeColors({
      background: '#000000',
      backgroundCard: '#0C0606',
      backgroundElevated: '#1E1212',
      backgroundLight: '#281A1A',
      accent: '#FF3B30',
      accentDark: '#D63028',
      accentLight: '#FF6B61',
      textPrimary: '#FFFFFF',
      textSecondary: '#E8E0E0',
      textMuted: '#A08888',
      textOnAccent: '#FFFFFF',
      border: '#281818',
      borderLight: '#352525',
      glow: 'rgba(255, 59, 48, 0.4)',
      glowStrong: 'rgba(255, 59, 48, 0.6)',
    }, true),
  },

  magma_light: {
    id: 'magma_light',
    colorId: 'magma',
    mode: 'light',
    name: 'Magma',
    icon: '🔥',
    kanji: '炎',
    colors: createThemeColors({
      background: '#FFF8F7',
      backgroundCard: '#FFEFED',
      backgroundElevated: '#FFE5E2',
      backgroundLight: '#FFDAD6',
      accent: '#FF3B30',
      accentDark: '#D63028',
      accentLight: '#FF6B61',
      textPrimary: '#1A1A1A',
      textSecondary: '#3A3A3A',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#F0D8D5',
      borderLight: '#FFEEEC',
      glow: 'rgba(255, 59, 48, 0.2)',
      glowStrong: 'rgba(255, 59, 48, 0.35)',
    }, false),
  },

  // 🌸 SAKURA - Rose Japonais
  sakura_dark: {
    id: 'sakura_dark',
    colorId: 'sakura',
    mode: 'dark',
    name: 'Sakura',
    icon: '🌸',
    kanji: '桜',
    colors: createThemeColors({
      background: '#000000',
      backgroundCard: '#0C060A',
      backgroundElevated: '#1E1218',
      backgroundLight: '#281A22',
      accent: '#FF2D92',
      accentDark: '#D6267A',
      accentLight: '#FF6DB3',
      textPrimary: '#FFFFFF',
      textSecondary: '#E8E0E8',
      textMuted: '#A088A0',
      textOnAccent: '#FFFFFF',
      border: '#251820',
      borderLight: '#322530',
      glow: 'rgba(255, 45, 146, 0.4)',
      glowStrong: 'rgba(255, 45, 146, 0.6)',
    }, true),
  },

  sakura_light: {
    id: 'sakura_light',
    colorId: 'sakura',
    mode: 'light',
    name: 'Sakura',
    icon: '🌸',
    kanji: '桜',
    colors: createThemeColors({
      background: '#FFF5F9',
      backgroundCard: '#FFEEF5',
      backgroundElevated: '#FFE5EF',
      backgroundLight: '#FFDCE8',
      accent: '#FF2D92',
      accentDark: '#D6267A',
      accentLight: '#FF6DB3',
      textPrimary: '#1A1A1A',
      textSecondary: '#3A3A3A',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#F0D0E0',
      borderLight: '#FFE8F2',
      glow: 'rgba(255, 45, 146, 0.2)',
      glowStrong: 'rgba(255, 45, 146, 0.35)',
    }, false),
  },

  // 💚 MATRIX - Vert Néon
  matrix_dark: {
    id: 'matrix_dark',
    colorId: 'matrix',
    mode: 'dark',
    name: 'Matrix',
    icon: '💚',
    kanji: '電',
    colors: createThemeColors({
      background: '#000000',
      backgroundCard: '#050805',
      backgroundElevated: '#101810',
      backgroundLight: '#182018',
      accent: '#00FF41',
      accentDark: '#00CC34',
      accentLight: '#66FF8C',
      textPrimary: '#FFFFFF',
      textSecondary: '#C8E8D0',
      textMuted: '#6BA078',
      textOnAccent: '#000000',
      border: '#142014',
      borderLight: '#1E2A1E',
      glow: 'rgba(0, 255, 65, 0.4)',
      glowStrong: 'rgba(0, 255, 65, 0.6)',
    }, true),
  },

  matrix_light: {
    id: 'matrix_light',
    colorId: 'matrix',
    mode: 'light',
    name: 'Matrix',
    icon: '💚',
    kanji: '電',
    colors: createThemeColors({
      background: '#F2FFF5',
      backgroundCard: '#E8FFEC',
      backgroundElevated: '#DCFFE2',
      backgroundLight: '#D0FFD8',
      accent: '#00FF41',
      accentDark: '#00CC34',
      accentLight: '#66FF8C',
      textPrimary: '#1A1A1A',
      textSecondary: '#3A3A3A',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#C0E8C8',
      borderLight: '#E0FFE8',
      glow: 'rgba(0, 255, 65, 0.2)',
      glowStrong: 'rgba(0, 255, 65, 0.35)',
    }, false),
  },

  // 🟠 BLAZE - Orange Feu
  blaze_dark: {
    id: 'blaze_dark',
    colorId: 'blaze',
    mode: 'dark',
    name: 'Blaze',
    icon: '🟠',
    kanji: '火',
    colors: createThemeColors({
      background: '#000000',
      backgroundCard: '#0A0704',
      backgroundElevated: '#1E1610',
      backgroundLight: '#281E18',
      accent: '#FF9500',
      accentDark: '#E68600',
      accentLight: '#FFB340',
      textPrimary: '#FFFFFF',
      textSecondary: '#E8E0D0',
      textMuted: '#A09078',
      textOnAccent: '#000000',
      border: '#282018',
      borderLight: '#352A20',
      glow: 'rgba(255, 149, 0, 0.4)',
      glowStrong: 'rgba(255, 149, 0, 0.6)',
    }, true),
  },

  blaze_light: {
    id: 'blaze_light',
    colorId: 'blaze',
    mode: 'light',
    name: 'Blaze',
    icon: '🟠',
    kanji: '火',
    colors: createThemeColors({
      background: '#FFFAF2',
      backgroundCard: '#FFF5E8',
      backgroundElevated: '#FFEFDC',
      backgroundLight: '#FFE8D0',
      accent: '#FF9500',
      accentDark: '#E68600',
      accentLight: '#FFB340',
      textPrimary: '#1A1A1A',
      textSecondary: '#3A3A3A',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#F0E0C8',
      borderLight: '#FFF0E0',
      glow: 'rgba(255, 149, 0, 0.2)',
      glowStrong: 'rgba(255, 149, 0, 0.35)',
    }, false),
  },

  // 💜 PHANTOM - Violet Mystère
  phantom_dark: {
    id: 'phantom_dark',
    colorId: 'phantom',
    mode: 'dark',
    name: 'Phantom',
    icon: '💜',
    kanji: '影',
    colors: createThemeColors({
      background: '#000000',
      backgroundCard: '#08050C',
      backgroundElevated: '#16101E',
      backgroundLight: '#1E1828',
      accent: '#BF5AF2',
      accentDark: '#A34AD6',
      accentLight: '#D48EFF',
      textPrimary: '#FFFFFF',
      textSecondary: '#E0D8F0',
      textMuted: '#8878A8',
      textOnAccent: '#FFFFFF',
      border: '#1A1428',
      borderLight: '#251E35',
      glow: 'rgba(191, 90, 242, 0.4)',
      glowStrong: 'rgba(191, 90, 242, 0.6)',
    }, true),
  },

  phantom_light: {
    id: 'phantom_light',
    colorId: 'phantom',
    mode: 'light',
    name: 'Phantom',
    icon: '💜',
    kanji: '影',
    colors: createThemeColors({
      background: '#FAF5FF',
      backgroundCard: '#F5EEFF',
      backgroundElevated: '#EDE5FF',
      backgroundLight: '#E5DCFF',
      accent: '#BF5AF2',
      accentDark: '#A34AD6',
      accentLight: '#D48EFF',
      textPrimary: '#1A1A1A',
      textSecondary: '#3A3A3A',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E0D0F0',
      borderLight: '#F0E8FF',
      glow: 'rgba(191, 90, 242, 0.2)',
      glowStrong: 'rgba(191, 90, 242, 0.35)',
    }, false),
  },

  // 🤍 GHOST - Minimaliste
  ghost_dark: {
    id: 'ghost_dark',
    colorId: 'ghost',
    mode: 'dark',
    name: 'Ghost',
    icon: '🤍',
    kanji: '魂',
    colors: createThemeColors({
      background: '#000000',
      backgroundCard: '#070707',
      backgroundElevated: '#181818',
      backgroundLight: '#222222',
      accent: '#FFFFFF',
      accentDark: '#E0E0E0',
      accentLight: '#FFFFFF',
      textPrimary: '#FFFFFF',
      textSecondary: '#C0C0C0',
      textMuted: '#808080',
      textOnAccent: '#000000',
      border: '#1E1E1E',
      borderLight: '#2A2A2A',
      glow: 'rgba(255, 255, 255, 0.2)',
      glowStrong: 'rgba(255, 255, 255, 0.35)',
    }, true),
  },

  ghost_light: {
    id: 'ghost_light',
    colorId: 'ghost',
    mode: 'light',
    name: 'Ghost',
    icon: '🤍',
    kanji: '魂',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#F8F8F8',
      backgroundElevated: '#F2F2F2',
      backgroundLight: '#ECECEC',
      accent: '#888888',
      accentDark: '#666666',
      accentLight: '#AAAAAA',
      textPrimary: '#1A1A1A',
      textSecondary: '#3A3A3A',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#E0E0E0',
      borderLight: '#F0F0F0',
      glow: 'rgba(0, 0, 0, 0.1)',
      glowStrong: 'rgba(0, 0, 0, 0.2)',
    }, false),
  },

  // 🌊 OCEAN - Bleu Profond
  ocean_dark: {
    id: 'ocean_dark',
    colorId: 'ocean',
    mode: 'dark',
    name: 'Ocean',
    icon: '🌊',
    kanji: '海',
    colors: createThemeColors({
      background: '#000000',
      backgroundCard: '#03070A',
      backgroundElevated: '#0C161E',
      backgroundLight: '#121E28',
      accent: '#00C8FF',
      accentDark: '#00A8D6',
      accentLight: '#5CE1FF',
      textPrimary: '#FFFFFF',
      textSecondary: '#C8E0F0',
      textMuted: '#6888A8',
      textOnAccent: '#000000',
      border: '#101A24',
      borderLight: '#1A2832',
      glow: 'rgba(0, 200, 255, 0.4)',
      glowStrong: 'rgba(0, 200, 255, 0.6)',
    }, true),
  },

  ocean_light: {
    id: 'ocean_light',
    colorId: 'ocean',
    mode: 'light',
    name: 'Ocean',
    icon: '🌊',
    kanji: '海',
    colors: createThemeColors({
      background: '#F0FAFF',
      backgroundCard: '#E8F6FF',
      backgroundElevated: '#DCF0FF',
      backgroundLight: '#D0EAFF',
      accent: '#00C8FF',
      accentDark: '#00A8D6',
      accentLight: '#5CE1FF',
      textPrimary: '#1A1A1A',
      textSecondary: '#3A3A3A',
      textMuted: '#666666',
      textOnAccent: '#000000',
      border: '#C0E0F0',
      borderLight: '#E0F4FF',
      glow: 'rgba(0, 200, 255, 0.2)',
      glowStrong: 'rgba(0, 200, 255, 0.35)',
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
      background: '#000000',
      backgroundCard: '#050505',
      backgroundElevated: '#141414',
      backgroundLight: '#1E1E1E',
      accent: '#FFFFFF',
      accentDark: '#E0E0E0',
      accentLight: '#FFFFFF',
      textPrimary: '#FFFFFF',
      textSecondary: '#B0B0B0',
      textMuted: '#707070',
      textOnAccent: '#000000',
      border: '#252525',
      borderLight: '#333333',
      glow: 'rgba(255, 255, 255, 0.15)',
      glowStrong: 'rgba(255, 255, 255, 0.25)',
    }, true),
  },

  classic_light: {
    id: 'classic_light',
    colorId: 'classic',
    mode: 'light',
    name: 'Classic',
    icon: '⬜',
    kanji: '墨',
    colors: createThemeColors({
      background: '#FFFFFF',
      backgroundCard: '#FAFAFA',
      backgroundElevated: '#F5F5F5',
      backgroundLight: '#F0F0F0',
      accent: '#000000',
      accentDark: '#1A1A1A',
      accentLight: '#333333',
      textPrimary: '#000000',
      textSecondary: '#333333',
      textMuted: '#666666',
      textOnAccent: '#FFFFFF',
      border: '#E0E0E0',
      borderLight: '#EEEEEE',
      glow: 'rgba(0, 0, 0, 0.08)',
      glowStrong: 'rgba(0, 0, 0, 0.15)',
    }, false),
  },
};

// ===================================================
// LISTE DES COULEURS POUR LE SÉLECTEUR
// ===================================================

export const themeColors: { id: ThemeColor; name: string; icon: string; kanji: string; color: string }[] = [
  { id: 'volt', name: 'Volt', icon: '⚡', kanji: '雷', color: '#FFE500' },
  { id: 'tiffany', name: 'Tiffany', icon: '💎', kanji: '氷', color: '#0ABAB5' },
  { id: 'magma', name: 'Magma', icon: '🔥', kanji: '炎', color: '#FF3B30' },
  { id: 'sakura', name: 'Sakura', icon: '🌸', kanji: '桜', color: '#FF2D92' },
  { id: 'matrix', name: 'Matrix', icon: '💚', kanji: '電', color: '#00FF41' },
  { id: 'blaze', name: 'Blaze', icon: '🟠', kanji: '火', color: '#FF9500' },
  { id: 'phantom', name: 'Phantom', icon: '💜', kanji: '影', color: '#BF5AF2' },
  { id: 'ghost', name: 'Ghost', icon: '🤍', kanji: '魂', color: '#888888' },
  { id: 'ocean', name: 'Ocean', icon: '🌊', kanji: '海', color: '#00C8FF' },
  { id: 'classic', name: 'Classic', icon: '⬜', kanji: '墨', color: '#000000' },
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
// GRADIENTS (compatibilité)
// ===================================================

export const GRADIENTS = {
  primary: ['#FFE500', '#E6CF00'] as [string, string],
  secondary: ['#8B5CF6', '#7C3AED'] as [string, string],
  success: ['#30D158', '#059669'] as [string, string],
  gold: ['#FFE500', '#E6CF00'] as [string, string],
  danger: ['#FF453A', '#DC2626'] as [string, string],
  info: ['#0A84FF', '#2563EB'] as [string, string],
};
