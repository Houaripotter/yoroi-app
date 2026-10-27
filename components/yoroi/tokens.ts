/**
 * YOROI design tokens (refonte "l'armure vivante").
 * Seul fichier du dossier components/yoroi autorise a contenir des couleurs en dur.
 */

export type YoroiThemeName = 'dojo' | 'nuit' | 'sakura' | 'matcha';

/** Mode d'affichage choisi (vague 35) : auto suit le reglage clair ou sombre de l'iPhone */
export type YoroiMode = 'clair' | 'sombre' | 'auto';

export const YOROI_THEME_NAMES: YoroiThemeName[] = ['dojo', 'nuit', 'sakura', 'matcha'];

export type YoroiColors = {
  background: string;
  surface: string;
  border: string;
  divider: string;
  fillSubtle: string;
  fillSoft: string;
  pill: string;
  ink: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentPressed: string;
  accentTint: string;
  /** l'accent en texte sur un fond clair (un cran plus fonce, lisible en petit) */
  accentText: string;
  onAccent: string;
  /** 27 octobre 2026 : fond pastel des boutons principaux et de l'onglet actif, et son texte */
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  /** le bleu vif des petits details (traits de courbe, coches, anneaux) */
  detail: string;
  /** Erreurs, suppressions, alertes (blessure, recuperation basse) */
  danger: string;
  dangerPressed: string;
  dangerTint: string;
  /** Reserve aux tampons de record hanko */
  record: string;
  indigo: string;
  indigoTint: string;
  gold: string;
  goldDeep: string;
  goldTint: string;
  goldLight: string;
  success: string;
  successText: string;
  successTint: string;
  darkCard: string;
  /** 27 octobre 2026 : le fond pastel des grandes cartes (a la place du bleu nuit plein), texte encre dessus */
  carteDouce: string;
  onDark: string;
  onDarkSecondary: string;
  shadow: string;
  transparent: string;
};

export type ColorToken = keyof YoroiColors;

// 27 octobre 2026, refonte « Pastel et Ciel » (choisie par Houari) : fond gris bleute tres clair, cartes blanches,
// ombres douces. Correction du meme jour (Houari : « le bleu plein est trop fort ») : plus aucun grand fond bleu sature.
// Les boutons principaux et l'onglet actif sont pastel (primary) avec un texte bleu nuit (onPrimary) ; l'accent devient
// ce bleu nuit, lisible en texte ; le bleu vif (detail) ne sert qu'aux petits details (traits de courbe, coches, anneaux)
const dojo: YoroiColors = {
  background: '#F5F6FB',
  surface: '#FFFFFF',
  border: '#E4E7F1',
  divider: '#ECEEF5',
  fillSubtle: '#E8EBF4',
  fillSoft: '#EEF0F7',
  pill: '#FFFFFF',
  ink: '#1D2033',
  textSecondary: '#646985',
  textMuted: '#8F94AC',
  // Bleu ciel : couleur d'action ; accentText, le meme bleu un cran plus fonce pour un texte sur fond clair
  accent: '#23358F',
  accentPressed: '#1A2870',
  accentTint: '#EEF1FF',
  accentText: '#23358F',
  onAccent: '#FFFFFF',
  primary: '#DCE3FF',
  primaryPressed: '#C9D3FB',
  onPrimary: '#23358F',
  detail: '#4C6EF5',
  // Le rouge soie ne sert plus qu'aux erreurs, suppressions et alertes
  danger: '#B0282E',
  dangerPressed: '#8C1E23',
  dangerTint: '#F6E3E1',
  // et aux tampons de record hanko
  record: '#B0282E',
  indigo: '#3557D9',
  indigoTint: '#EEF1FF',
  gold: '#C59D45',
  goldDeep: '#A8832F',
  goldTint: '#F3EBDA',
  goldLight: '#E3C47B',
  success: '#6E8C3A',
  successText: '#4F6B28',
  successTint: '#E4EADB',
  // les grandes cartes pleines : bleu nuit (onDark sert aussi sur les photos, il reste blanc)
  darkCard: '#23358F',
  carteDouce: '#E8ECFF',
  onDark: '#FFFFFF',
  onDarkSecondary: '#D5DCF5',
  shadow: '#1D2033',
  transparent: 'transparent',
};

// Vague 35 : nuit v2, le mode sombre de l'app (memes valeurs que P_SOMBRE de livePalette.ts)
const nuit: YoroiColors = {
  background: '#10131B',
  surface: '#1A1E29',
  border: '#2B303D',
  divider: '#242935',
  fillSubtle: '#252A36',
  fillSoft: '#1F2430',
  pill: '#242936',
  ink: '#ECEAE3',
  textSecondary: '#B8BBC6',
  textMuted: '#8A8E9B',
  // indigo eclairci : texte encre dessus (7,8:1), lisible sur le fond (7,8:1)
  accent: '#8FA8DE',
  accentPressed: '#7A94CC',
  accentTint: '#212B42',
  accentText: '#8FA8DE',
  onAccent: '#10131B',
  primary: '#2A3557',
  primaryPressed: '#33406A',
  onPrimary: '#DCE3FF',
  detail: '#8FA8DE',
  danger: '#EC7A70',
  dangerPressed: '#D45F55',
  dangerTint: '#3A2326',
  record: '#EC7A70',
  indigo: '#8FA8DE',
  indigoTint: '#212B42',
  gold: '#D8B562',
  goldDeep: '#D3AE5C',
  goldTint: '#2F2A1C',
  goldLight: '#C9A85E',
  success: '#93B562',
  successText: '#A8C77A',
  successTint: '#222B1D',
  darkCard: '#232838',
  carteDouce: '#1E2540',
  onDark: '#ECEAE3',
  onDarkSecondary: '#B8BBC6',
  shadow: '#000000',
  transparent: 'transparent',
};

// Placeholder : variante claire derivee de dojo
const sakura: YoroiColors = {
  ...dojo,
  background: '#FBEEF1',
  border: '#F0DDE2',
  divider: '#F3E4E8',
  fillSubtle: '#F2DCE2',
  fillSoft: '#F8E7EB',
  accent: '#C23B6B',
  accentPressed: '#9A2D54',
  accentTint: '#F7DCE5',
  accentText: '#9A2D54',
  primary: '#F7DCE5',
  primaryPressed: '#F0CAD7',
  onPrimary: '#9A2D54',
  detail: '#C23B6B',
  shadow: '#3C1424',
};

// Placeholder : variante claire derivee de dojo
const matcha: YoroiColors = {
  ...dojo,
  background: '#EEF1EA',
  border: '#DFE4D8',
  divider: '#E5E9E0',
  fillSubtle: '#DDE3D5',
  fillSoft: '#E7EBE2',
  accent: '#3E6A3B',
  accentPressed: '#2F512D',
  accentTint: '#DDE7DA',
  accentText: '#2F512D',
  primary: '#DDE7DA',
  primaryPressed: '#CBDAC7',
  onPrimary: '#2F512D',
  detail: '#3E6A3B',
  shadow: '#1E2814',
};

export const yoroiPalettes: Record<YoroiThemeName, YoroiColors> = { dojo, nuit, sakura, matcha };

/** Graisse logique, resolue en fontFamily Archivo (ou fontWeight systeme) dans fonts.ts */
export type FontWeightKey = 'medium' | 'bold' | 'extraBold' | 'black';

export type TypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'body'
  | 'small'
  | 'overline';

export type TypographySpec = {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  weight: FontWeightKey;
  uppercase?: boolean;
};

export const typography: Record<TypographyVariant, TypographySpec> = {
  display: { fontSize: 56, lineHeight: 60, letterSpacing: -2, weight: 'black' },
  h1: { fontSize: 32, lineHeight: 36, letterSpacing: -1, weight: 'black' },
  h2: { fontSize: 26, lineHeight: 30, letterSpacing: -0.6, weight: 'black' },
  h3: { fontSize: 20, lineHeight: 24, letterSpacing: -0.4, weight: 'black' },
  title: { fontSize: 17, lineHeight: 22, letterSpacing: 0, weight: 'extraBold' },
  body: { fontSize: 15, lineHeight: 21, letterSpacing: 0, weight: 'medium' },
  // 600 n'existe pas en statique : on prend Archivo 700
  small: { fontSize: 13, lineHeight: 18, letterSpacing: 0, weight: 'bold' },
  overline: { fontSize: 13, lineHeight: 17, letterSpacing: 0, weight: 'bold' },
};

export const radii = {
  card: 24,
  cardLg: 26,
  cardSm: 18,
  button: 18,
  iconTile: 14,
  segment: 14,
  chip: 999,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  gap: 14,
  md: 16,
  screen: 20,
  lg: 24,
  xl: 32,
} as const;

export const sizes = {
  touchMin: 44,
  buttonLg: 58,
  buttonMd: 48,
  tabBarHeight: 68,
  tabBarRadius: 26,
  tabBarSide: 16,
  tabBarBottom: 26,
  tabBarAddButton: 58,
  tabBarAddBorder: 4,
} as const;

export type ShadowSpec = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

export function makeShadows(colors: YoroiColors, isDark: boolean) {
  const soft: ShadowSpec = {
    shadowColor: colors.shadow,
    shadowOpacity: isDark ? 0.35 : 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  };
  const pill: ShadowSpec = {
    shadowColor: colors.shadow,
    shadowOpacity: isDark ? 0.3 : 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  };
  const none: ShadowSpec = {
    shadowColor: colors.transparent,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  };
  return { soft, pill, none };
}

export type YoroiTheme = {
  name: YoroiThemeName;
  isDark: boolean;
  colors: YoroiColors;
  typography: typeof typography;
  radii: typeof radii;
  spacing: typeof spacing;
  sizes: typeof sizes;
  shadows: ReturnType<typeof makeShadows>;
};

export function buildYoroiTheme(name: YoroiThemeName): YoroiTheme {
  const colors = yoroiPalettes[name];
  const isDark = name === 'nuit';
  return {
    name,
    isDark,
    colors,
    typography,
    radii,
    spacing,
    sizes,
    shadows: makeShadows(colors, isDark),
  };
}

export const yoroiThemes: Record<YoroiThemeName, YoroiTheme> = {
  dojo: buildYoroiTheme('dojo'),
  nuit: buildYoroiTheme('nuit'),
  sakura: buildYoroiTheme('sakura'),
  matcha: buildYoroiTheme('matcha'),
};
