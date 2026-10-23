// ===================================================
// YOROI - SYSTÈME RESPONSIVE IPHONE / IPAD / WATCH
// ===================================================

import { Dimensions, Platform, PixelRatio } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { getCurrentFontScale } from '@/lib/fontScaleManager';

// ===================================================
// DÉTECTION DU TYPE D'APPAREIL (statique, fiable)
// ===================================================

/**
 * Détecte si l'appareil est un iPad.
 * Utilise Platform.isPad (RN 0.64+) en priorité.
 */
export const isIPad = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  if ((Platform as any).isPad) return true;
  // Fallback: ratio écran proche de 4:3
  const { width, height } = Dimensions.get('window');
  return Math.max(width, height) / Math.min(width, height) < 1.6;
};

export const isIPhone = (): boolean => Platform.OS === 'ios' && !isIPad();
export const isAndroid = (): boolean => Platform.OS === 'android';

// ===================================================
// DIMENSIONS DE RÉFÉRENCE
// ===================================================

// Référence : iPhone 14 Pro (393 × 852)
const REF_WIDTH = 393;
const REF_HEIGHT = 852;

// Facteurs selon taille d'iPhone
// SE / petits  : ~375px → factor ~0.95
// Standard     : ~390px → factor ~1.00
// Pro Max / Plus: ~430px → factor ~1.09
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// ===================================================
// FONCTIONS DE SCALE STATIQUES (pour StyleSheet)
// ===================================================

const { width: SW, height: SH } = Dimensions.get('window');

/**
 * Scale horizontal basé sur la largeur de l'écran.
 * Sur iPad, limité à 1.4× pour éviter les éléments trop grands.
 */
export const scale = (size: number): number => {
  if (isIPad()) {
    const s = clamp(SW / REF_WIDTH, 1.2, 1.8);
    return Math.round(size * s);
  }
  const s = clamp(SW / REF_WIDTH, 0.85, 1.15);
  return Math.round(size * s);
};

/**
 * Scale vertical basé sur la hauteur de l'écran.
 */
export const scaleVertical = (size: number): number => {
  if (isIPad()) {
    const s = clamp(SH / REF_HEIGHT, 1.2, 1.8);
    return Math.round(size * s);
  }
  const s = clamp(SH / REF_HEIGHT, 0.85, 1.15);
  return Math.round(size * s);
};

/**
 * Scale modéré, mélange entre la taille originale et le scale complet.
 * Idéal pour les polices (évite les extrêmes).
 * factor=0 → pas de scale, factor=1 → scale complet
 */
export const scaleModerate = (size: number, factor: number = 0.45): number => {
  return Math.round(size + (scale(size) - size) * factor);
};

/**
 * Normalise une taille de police selon la densité de l'écran.
 */
export const normalizeFontSize = (size: number): number => {
  const scaled = scaleModerate(size, 0.35);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

// ===================================================
// VALEURS RESPONSIVES STATIQUES (pour StyleSheet.create)
// ===================================================

export const responsive = {
  // Padding
  paddingXS: scale(4),
  paddingS: scale(8),
  paddingM: scale(12),
  paddingL: scale(16),
  paddingXL: scale(20),
  paddingXXL: scale(24),

  // Margin
  marginXS: scale(4),
  marginS: scale(8),
  marginM: scale(12),
  marginL: scale(16),
  marginXL: scale(20),
  marginXXL: scale(24),

  // Border Radius
  radiusXS: scale(4),
  radiusS: scale(8),
  radiusM: scale(12),
  radiusL: scale(16),
  radiusXL: scale(20),
  radiusRound: 999,

  // Font Sizes
  fontXS: normalizeFontSize(10),
  fontS: normalizeFontSize(12),
  fontM: normalizeFontSize(14),
  fontL: normalizeFontSize(16),
  fontXL: normalizeFontSize(18),
  fontXXL: normalizeFontSize(20),
  fontTitle: normalizeFontSize(24),
  fontLarge: normalizeFontSize(28),
  fontHuge: normalizeFontSize(32),

  // Icon Sizes
  iconXS: scale(16),
  iconS: scale(20),
  iconM: scale(24),
  iconL: scale(28),
  iconXL: scale(32),
  iconXXL: scale(40),

  // Avatar Sizes
  avatarS: scale(40),
  avatarM: scale(60),
  avatarL: scale(80),
  avatarXL: scale(100),
  avatarXXL: scale(120),

  // Card Heights
  cardS: scale(80),
  cardM: scale(120),
  cardL: scale(160),
  cardXL: scale(200),

  // Button Heights
  buttonS: scale(36),
  buttonM: scale(44),
  buttonL: scale(52),

  // Tab Bar
  tabBarHeight: scale(60),
  tabBarIconSize: scale(24),

  // Screen Dimensions (statiques, pour infos)
  screenWidth: SW,
  screenHeight: SH,

  // Safe Area
  safeAreaTop: isIPad() ? 20 : 44,
  safeAreaBottom: isIPad() ? 20 : 34,
};

// ===================================================
// HOOK DYNAMIQUE : s'adapte à l'orientation en temps réel
// ===================================================

/**
 * useResponsive : hook React qui recalcule tout dynamiquement
 * lors de rotations d'écran ou de changements de fenêtre (iPad multitâche).
 *
 * Usage:
 *   const { s, fs, ip, cols, screenWidth } = useResponsive();
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const pad = isIPad();
  const isLandscape = width > height;

  // Facteur de compacité : en mode S (fontScale < 1), les paddings/marges/tailles
  // rétrécissent aussi pour donner un rendu plus dense. En mode M/L/XL, pas d'effet.
  const fontScale = getCurrentFontScale();
  const compactFactor = fontScale < 1.0 ? fontScale : 1.0;

  // Scale horizontal + compacité (réduit légèrement les marges en mode S)
  const s = (size: number): number => {
    const deviceFactor = pad
      ? clamp(width / REF_WIDTH, 1.0, 2.0)
      : clamp(width / REF_WIDTH, 0.82, 1.18);
    return Math.round(size * deviceFactor * compactFactor);
  };

  // Scale vertical + compacité (les hauteurs de cartes diminuent en mode S)
  const sv = (size: number): number => {
    const deviceFactor = pad
      ? clamp(height / REF_HEIGHT, 1.0, 2.0)
      : clamp(height / REF_HEIGHT, 0.82, 1.18);
    return Math.round(size * deviceFactor * compactFactor);
  };

  // Font size dynamique (device-only, le patch jsx-runtime gère S/M/L/XL)
  const fs = (size: number): number => {
    const deviceFactor = pad
      ? clamp(width / REF_WIDTH, 1.0, 2.0)
      : clamp(width / REF_WIDTH, 0.82, 1.18);
    const scaled = Math.round(size * deviceFactor);
    return Math.round(size + (scaled - size) * 0.4);
  };

  // Scale UI incluant la préférence de taille de l'utilisateur (S/M/L/XL)
  // Utilisé pour les icônes, boutons, éléments qui doivent suivre la taille choisie.
  // NE PAS utiliser pour fontSize (la jsx-runtime patch le gère déjà).
  const ui = (size: number): number => {
    const deviceFactor = pad
      ? clamp(width / REF_WIDTH, 1.0, 2.0)
      : clamp(width / REF_WIDTH, 0.82, 1.18);
    return Math.round(size * deviceFactor * fontScale);
  };

  // Nombre de colonnes selon l'écran
  const cols = (defaultCols = 2): number => {
    if (pad) return isLandscape ? 4 : 3;
    if (width >= 414) return defaultCols + 1; // iPhone Plus/Pro Max
    return defaultCols;
  };

  // Largeur d'un élément dans une grille
  const colWidth = (numCols?: number, spacing = 16): number => {
    const n = numCols ?? cols();
    return (width - spacing * (n + 1)) / n;
  };

  // Largeur max pour les conteneurs (limité à 600 sur iPad)
  const maxWidth = pad ? Math.min(width, 680) : width;

  // Pill tab bar width.
  // Sur iPad portrait : on veut ~60% de la largeur (~450-500px)
  // Sur iPad landscape : on veut max 500px (pas 0.7 × 1366 = 956px, ce serait énorme)
  // Sur iPhone : width - 24
  // Tablette (>= 600) : 70% borné [460, 560] pour loger 6 onglets + le bouton +
  const pillWidth = pad && width >= 600
    ? Math.min(Math.max(width * 0.7, 460), 560, width - 24)
    : width - 24;

  return {
    width,
    height,
    s,
    sv,
    fs,
    ui,
    fontScale,
    isCompact: fontScale < 1.0,
    cols,
    colWidth,
    maxWidth,
    pillWidth,
    isIPad: pad,
    isLandscape,
    isSmallPhone: !pad && width < 380,   // iPhone SE
    isLargePhone: !pad && width >= 420,  // iPhone Pro Max / Plus
  };
}

// ===================================================
// HELPERS DEVICE
// ===================================================

export const deviceValue = <T,>(iphoneValue: T, ipadValue: T): T =>
  isIPad() ? ipadValue : iphoneValue;

export const deviceStyle = <T extends object>(iphoneStyle: T, ipadStyle: T): T =>
  isIPad() ? ipadStyle : iphoneStyle;

// ===================================================
// GRILLE ET GRAPHIQUES
// ===================================================

export const getGridColumns = (): number => isIPad() ? 3 : 2;

export const getGridItemWidth = (columns?: number, spacing = responsive.paddingL): number => {
  const cols = columns ?? getGridColumns();
  return (SW - spacing * (cols + 1)) / cols;
};

export const getChartDataPoints = (type: 'mini' | 'medium' | 'large' = 'mini'): number => {
  if (isIPad()) {
    return type === 'mini' ? 7 : type === 'medium' ? 10 : 14;
  }
  return type === 'mini' ? 3 : type === 'medium' ? 5 : 7;
};

export const getHistoryDays = (): number => isIPad() ? 7 : 3;

// ===================================================
// EXPORT DEFAULT
// ===================================================

export default {
  scale,
  scaleVertical,
  scaleModerate,
  normalizeFontSize,
  isIPad,
  isIPhone,
  isAndroid,
  useResponsive,
  responsive,
  deviceValue,
  deviceStyle,
  getGridColumns,
  getGridItemWidth,
  getChartDataPoints,
  getHistoryDays,
};
