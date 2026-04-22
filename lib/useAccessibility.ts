// ============================================
// USE ACCESSIBILITY
// Hook centralisé pour respecter les préférences d'accessibilité iOS/Android :
// - Reduce Motion : désactive les animations spring
// - Bold Text : ajuste les fontWeight
// - Screen Reader actif : adapte le rendu (descriptions plus longues, etc.)
// ============================================

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

interface AccessibilityState {
  reduceMotion: boolean;
  screenReaderEnabled: boolean;
  boldText: boolean;
}

const DEFAULT_STATE: AccessibilityState = {
  reduceMotion: false,
  screenReaderEnabled: false,
  boldText: false,
};

export const useAccessibility = (): AccessibilityState => {
  const [state, setState] = useState<AccessibilityState>(DEFAULT_STATE);

  useEffect(() => {
    let mounted = true;

    // Lecture initiale
    Promise.all([
      AccessibilityInfo.isReduceMotionEnabled(),
      AccessibilityInfo.isScreenReaderEnabled(),
      AccessibilityInfo.isBoldTextEnabled?.() ?? Promise.resolve(false),
    ]).then(([reduceMotion, screenReaderEnabled, boldText]) => {
      if (mounted) setState({ reduceMotion, screenReaderEnabled, boldText });
    }).catch(() => { /* fallback aux valeurs par défaut */ });

    // Listeners pour les changements en cours d'utilisation
    const reduceMotionListener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (reduceMotion) => mounted && setState(s => ({ ...s, reduceMotion })),
    );
    const screenReaderListener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (screenReaderEnabled) => mounted && setState(s => ({ ...s, screenReaderEnabled })),
    );
    let boldTextListener: { remove?: () => void } | undefined;
    if ((AccessibilityInfo as any).addEventListener) {
      boldTextListener = AccessibilityInfo.addEventListener(
        'boldTextChanged' as any,
        (boldText: boolean) => mounted && setState(s => ({ ...s, boldText })),
      );
    }

    return () => {
      mounted = false;
      reduceMotionListener?.remove?.();
      screenReaderListener?.remove?.();
      boldTextListener?.remove?.();
    };
  }, []);

  return state;
};

/**
 * Helper : génère une description vocale pour une courbe de données.
 * Ex: "Courbe Poids : 81 kg, tendance baissière sur 30 jours"
 */
export const buildChartA11yLabel = (
  metricName: string,
  currentValue: number | string,
  unit: string,
  trend?: 'up' | 'down' | 'stable',
  periodDays?: number,
): string => {
  const trendStr = trend === 'up' ? 'tendance haussière' :
                   trend === 'down' ? 'tendance baissière' :
                   trend === 'stable' ? 'tendance stable' : '';
  const periodStr = periodDays ? ` sur ${periodDays} jours` : '';
  return `Courbe ${metricName} : ${currentValue} ${unit}${trendStr ? ', ' + trendStr : ''}${periodStr}`;
};
