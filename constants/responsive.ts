// ===================================================
// YOROI - SYSTÈME RESPONSIVE IPHONE/IPAD
// ===================================================

import { Dimensions, Platform } from 'react-native';

// Récupérer les dimensions de l'écran
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ===================================================
// DÉTECTION DU TYPE D'APPAREIL
// ===================================================

/**
 * Détecte si l'appareil est un iPad
 */
export const isIPad = (): boolean => {
  if (Platform.OS !== 'ios') return false;

  // iPad a un ratio plus proche de 4:3 vs iPhone 16:9
  const ratio = SCREEN_HEIGHT / SCREEN_WIDTH;

  // iPad: ~1.33 (4:3) ou ~1.43 (iPad Pro)
  // iPhone: ~2.16 (16:9) ou plus
  return ratio < 1.6;
};

/**
 * Détecte si l'appareil est un iPhone
 */
export const isIPhone = (): boolean => {
  return Platform.OS === 'ios' && !isIPad();
};

// ===================================================
// DIMENSIONS DE BASE
// ===================================================

// Dimensions de référence (iPhone 14 Pro)
const IPHONE_WIDTH = 393;
const IPHONE_HEIGHT = 852;

// Facteur de scaling pour iPad
const IPAD_SCALE_FACTOR = 1.5; // iPad affiche 50% plus grand

/**
 * Scale une valeur selon l'appareil
 * @param size Taille de base (pour iPhone)
 * @returns Taille adaptée à l'appareil
 */
export const scale = (size: number): number => {
  if (isIPad()) {
    return Math.round(size * IPAD_SCALE_FACTOR);
  }

  // Pour iPhone, on scale proportionnellement à la largeur
  const scaleWidth = SCREEN_WIDTH / IPHONE_WIDTH;
  return Math.round(size * scaleWidth);
};

/**
 * Scale vertical (basé sur la hauteur)
 */
export const scaleVertical = (size: number): number => {
  if (isIPad()) {
    return Math.round(size * IPAD_SCALE_FACTOR);
  }

  const scaleHeight = SCREEN_HEIGHT / IPHONE_HEIGHT;
  return Math.round(size * scaleHeight);
};

/**
 * Scale modéré (entre scale normal et pas de scale)
 * Utilisé pour les textes, les espacements, etc.
 */
export const scaleModerate = (size: number, factor: number = 0.5): number => {
  const scaledSize = scale(size);
  return Math.round(size + (scaledSize - size) * factor);
};

// ===================================================
// VALEURS RESPONSIVES COMMUNES
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
  radiusRound: scale(999),

  // Font Sizes
  fontXS: scaleModerate(10, 0.3),
  fontS: scaleModerate(12, 0.3),
  fontM: scaleModerate(14, 0.3),
  fontL: scaleModerate(16, 0.3),
  fontXL: scaleModerate(18, 0.3),
  fontXXL: scaleModerate(20, 0.3),
  fontTitle: scaleModerate(24, 0.4),
  fontLarge: scaleModerate(28, 0.4),
  fontHuge: scaleModerate(32, 0.4),

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

  // Screen Dimensions
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,

  // Safe Area (approximation)
  safeAreaTop: isIPad() ? 20 : 44,
  safeAreaBottom: isIPad() ? 20 : 34,
};

// ===================================================
// HELPERS POUR STYLES CONDITIONNELS
// ===================================================

/**
 * Retourne une valeur selon l'appareil
 * @param iphoneValue Valeur pour iPhone
 * @param ipadValue Valeur pour iPad
 */
export const deviceValue = <T,>(iphoneValue: T, ipadValue: T): T => {
  return isIPad() ? ipadValue : iphoneValue;
};

/**
 * Retourne un style selon l'appareil
 */
export const deviceStyle = <T extends object>(iphoneStyle: T, ipadStyle: T): T => {
  return isIPad() ? ipadStyle : iphoneStyle;
};

// ===================================================
// GRID SYSTEM POUR IPAD
// ===================================================

/**
 * Nombre de colonnes dans une grille
 * iPhone: 2 colonnes, iPad: 3-4 colonnes
 */
export const getGridColumns = (): number => {
  return isIPad() ? 3 : 2;
};

/**
 * Largeur d'un élément dans une grille
 * @param columns Nombre de colonnes total
 * @param spacing Espacement entre les colonnes
 */
export const getGridItemWidth = (columns?: number, spacing: number = responsive.paddingL): number => {
  const cols = columns || getGridColumns();
  const totalSpacing = spacing * (cols + 1);
  return (SCREEN_WIDTH - totalSpacing) / cols;
};

// ===================================================
// GRAPHIQUES ET DONNÉES
// ===================================================

/**
 * Nombre de points de données à afficher dans les graphiques
 * iPhone: 3-5 points, iPad: 7-10 points
 */
export const getChartDataPoints = (type: 'mini' | 'medium' | 'large' = 'mini'): number => {
  if (isIPad()) {
    switch (type) {
      case 'mini': return 7;      // Mini graphiques (cards)
      case 'medium': return 10;    // Graphiques moyens
      case 'large': return 14;     // Grands graphiques
      default: return 7;
    }
  } else {
    switch (type) {
      case 'mini': return 3;       // Mini graphiques (cards)
      case 'medium': return 5;     // Graphiques moyens
      case 'large': return 7;      // Grands graphiques
      default: return 3;
    }
  }
};

/**
 * Nombre de jours d'historique à afficher
 */
export const getHistoryDays = (): number => {
  return isIPad() ? 7 : 3;
};

// ===================================================
// EXPORTS
// ===================================================

export default {
  scale,
  scaleVertical,
  scaleModerate,
  isIPad,
  isIPhone,
  responsive,
  deviceValue,
  deviceStyle,
  getGridColumns,
  getGridItemWidth,
  getChartDataPoints,
  getHistoryDays,
};
