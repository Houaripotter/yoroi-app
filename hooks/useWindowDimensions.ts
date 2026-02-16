/**
 * useWindowDimensions Hook
 *
 * Hook optimisé pour gérer les dimensions de l'écran
 * avec mise à jour automatique lors du changement d'orientation
 *
 * ✅ Avantages vs Dimensions.get():
 * - Réactif aux changements d'orientation
 * - Pas de recalcul inutile
 * - API React Native standard
 * - TypeScript strict
 */

import { useWindowDimensions as useRNWindowDimensions } from 'react-native';

export interface WindowDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

/**
 * Hook pour obtenir les dimensions de la fenêtre
 * Mise à jour automatique lors de la rotation
 */
export function useWindowDimensions(): WindowDimensions {
  return useRNWindowDimensions();
}

/**
 * Hook pour détecter si l'écran est petit
 * Utile pour les layouts adaptatifs
 */
export function useIsSmallScreen(threshold: number = 375): boolean {
  const { width } = useWindowDimensions();
  return width < threshold;
}

/**
 * Hook pour détecter l'orientation
 */
export function useOrientation(): 'portrait' | 'landscape' {
  const { width, height } = useWindowDimensions();
  return height >= width ? 'portrait' : 'landscape';
}

/**
 * Hook pour obtenir des breakpoints responsive
 */
export function useBreakpoint() {
  const { width } = useWindowDimensions();

  return {
    isXS: width < 375,      // iPhone SE
    isSM: width >= 375 && width < 414,  // iPhone 8/X
    isMD: width >= 414 && width < 768,  // iPhone Plus/Max
    isLG: width >= 768 && width < 1024, // iPad Portrait
    isXL: width >= 1024,    // iPad Landscape
    width,
  };
}

// Valeurs statiques pour les composants qui ne peuvent pas utiliser de hooks
export const STATIC_DIMENSIONS = {
  // Valeurs par défaut (iPhone standard)
  DEFAULT_WIDTH: 375,
  DEFAULT_HEIGHT: 667,

  // Breakpoints
  BREAKPOINTS: {
    XS: 375,
    SM: 414,
    MD: 768,
    LG: 1024,
  },
};
