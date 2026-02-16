import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';
import { logger } from '@/lib/security/logger';

/**
 * Hook pour empêcher les captures d'écran et l'enregistrement vidéo
 * sur les écrans contenant des données sensibles.
 */
export const useScreenShield = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    const protect = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        logger.warn('Failed to prevent screen capture', e);
      }
    };

    protect();

    return () => {
      if (Platform.OS !== 'web') {
        ScreenCapture.allowScreenCaptureAsync();
      }
    };
  }, [enabled]);
};
