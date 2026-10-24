/**
 * Reglage « Reduire les animations » du telephone : null tant qu'il n'est pas lu,
 * puis true ou false. Suit les changements pendant que l'ecran est ouvert.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useMouvementReduit(): boolean | null {
  const [reduit, setReduit] = useState<boolean | null>(null);
  useEffect(() => {
    let vivant = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => vivant && setReduit(!!v))
      .catch(() => vivant && setReduit(false));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduit(!!v));
    return () => {
      vivant = false;
      sub?.remove?.();
    };
  }, []);
  return reduit;
}
