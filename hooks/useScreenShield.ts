import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

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
        console.warn('Failed to prevent screen capture', e);
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
