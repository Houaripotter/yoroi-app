// ============================================
// 🔒 PROTECTION CONTRE LES SCREENSHOTS - YOROI
// ============================================
//
// Empêche les screenshots sur les écrans sensibles et floute
// l'app dans le sélecteur d'apps pour protéger les données personnelles.

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import logger from './logger';

// Try to import ScreenCapture, but gracefully handle if not available (simulator)
let ScreenCapture: any = null;
try {
  ScreenCapture = require('expo-screen-capture');
} catch (error) {
  logger.warn('expo-screen-capture not available (simulator or missing native module)');
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Écrans sensibles qui doivent bloquer les screenshots
 */
export const SENSITIVE_SCREENS = [
  'measurements', // Mesures corporelles
  'photos', // Photos de progression
  'profile', // Profil utilisateur
  'body-status', // Statut corporel
  'export-data', // Export de données
  'import-data', // Import de données
];

/**
 * Configuration de la protection
 */
export const SCREENSHOT_PROTECTION_CONFIG = {
  enabled: true, // Activer la protection globalement
  preventScreenshots: Platform.OS === 'ios', // iOS supporte mieux la prévention
  blurOnBackground: true, // Flouter l'app en arrière-plan
  showWarning: true, // Afficher un avertissement si screenshot détecté
};

// ============================================
// ÉTAT GLOBAL
// ============================================

let isProtectionActive = false;
let screenshotListenerSubscription: any = null;

// ============================================
// PRÉVENTION DES SCREENSHOTS
// ============================================

/**
 * ✅ Active la protection contre les screenshots
 */
export async function enableScreenshotProtection(): Promise<void> {
  if (!SCREENSHOT_PROTECTION_CONFIG.enabled || !ScreenCapture) {
    logger.debug('Screenshot protection disabled or not available');
    return;
  }

  if (isProtectionActive) {
    logger.debug('Screenshot protection already active');
    return;
  }

  try {
    if (Platform.OS === 'ios') {
      // Sur iOS, on peut empêcher les screenshots
      await ScreenCapture.preventScreenCaptureAsync();
      isProtectionActive = true;
      logger.info('Screenshot protection enabled');
    } else if (Platform.OS === 'android') {
      // Sur Android, on peut détecter mais pas empêcher
      // On utilise un listener pour détecter les tentatives
      screenshotListenerSubscription = ScreenCapture.addScreenshotListener(() => {
        logger.warn('Screenshot detected!');
        handleScreenshotDetected();
      });
      isProtectionActive = true;
      logger.info('Screenshot detection enabled (Android)');
    }
  } catch (error) {
    logger.error('Failed to enable screenshot protection', error);
  }
}

/**
 * ✅ Désactive la protection contre les screenshots
 */
export async function disableScreenshotProtection(): Promise<void> {
  if (!isProtectionActive || !ScreenCapture) {
    logger.debug('Screenshot protection already inactive or not available');
    return;
  }

  try {
    if (Platform.OS === 'ios') {
      await ScreenCapture.allowScreenCaptureAsync();
      isProtectionActive = false;
      logger.info('Screenshot protection disabled');
    } else if (Platform.OS === 'android') {
      if (screenshotListenerSubscription) {
        screenshotListenerSubscription.remove();
        screenshotListenerSubscription = null;
      }
      isProtectionActive = false;
      logger.info('Screenshot detection disabled (Android)');
    }
  } catch (error) {
    logger.error('Failed to disable screenshot protection', error);
  }
}

/**
 * Appelé quand un screenshot est détecté (Android)
 */
function handleScreenshotDetected(): void {
  if (SCREENSHOT_PROTECTION_CONFIG.showWarning) {
    // Note: On ne peut pas afficher d'Alert ici car on n'a pas accès au contexte React
    // L'app devrait écouter cet événement via le hook useScreenshotProtection
    logger.warn('Screenshot taken on sensitive screen');
  }
}

// ============================================
// FLOUTAGE EN ARRIÈRE-PLAN
// ============================================

/**
 * État de floutage en arrière-plan
 */
let backgroundBlurEnabled = false;
let appStateSubscription: any = null;

/**
 * ✅ Active le floutage automatique quand l'app passe en arrière-plan
 */
export function enableBackgroundBlur(onBlur?: () => void, onUnblur?: () => void): void {
  if (!SCREENSHOT_PROTECTION_CONFIG.blurOnBackground) {
    logger.debug('Background blur disabled in config');
    return;
  }

  if (backgroundBlurEnabled) {
    logger.debug('Background blur already enabled');
    return;
  }

  // Écouter les changements d'état de l'app
  appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App passe en arrière-plan : flouter
      logger.debug('App went to background, applying blur');
      onBlur?.();
    } else if (nextAppState === 'active') {
      // App revient au premier plan : déflouter
      logger.debug('App came to foreground, removing blur');
      onUnblur?.();
    }
  });

  backgroundBlurEnabled = true;
  logger.info('🌫️ Background blur enabled');
}

/**
 * ✅ Désactive le floutage en arrière-plan
 */
export function disableBackgroundBlur(): void {
  if (!backgroundBlurEnabled) return;

  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  backgroundBlurEnabled = false;
  logger.info('Background blur disabled');
}

// ============================================
// HOOKS REACT
// ============================================

/**
 * ✅ Hook pour protéger un écran contre les screenshots
 *
 * Usage:
 * ```tsx
 * function SensitiveScreen() {
 *   const { isProtected, screenshotDetected } = useScreenshotProtection(true);
 *
 *   if (screenshotDetected) {
 *     // Afficher un avertissement
 *   }
 *
 *   return <View>...</View>
 * }
 * ```
 */
export function useScreenshotProtection(enabled: boolean = true) {
  const [screenshotDetected, setScreenshotDetected] = useState(false);
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    if (!enabled || !ScreenCapture) return;

    let listener: any = null;

    const setup = async () => {
      try {
        if (Platform.OS === 'ios' && SCREENSHOT_PROTECTION_CONFIG.preventScreenshots) {
          await ScreenCapture.preventScreenCaptureAsync();
          setIsProtected(true);
        } else if (Platform.OS === 'android') {
          listener = ScreenCapture.addScreenshotListener(() => {
            setScreenshotDetected(true);
            setTimeout(() => setScreenshotDetected(false), 3000); // Reset après 3s
          });
          setIsProtected(true);
        }
      } catch (error) {
        logger.error('Screenshot protection setup failed', error);
      }
    };

    setup();

    return () => {
      // Cleanup
      if (Platform.OS === 'ios' && ScreenCapture) {
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      }
      if (listener) {
        listener.remove();
      }
      setIsProtected(false);
    };
  }, [enabled]);

  return { isProtected, screenshotDetected };
}

/**
 * ✅ Hook pour flouter l'app en arrière-plan
 *
 * Usage:
 * ```tsx
 * function App() {
 *   const { isBlurred } = useBackgroundBlur();
 *
 *   return (
 *     <View>
 *       {isBlurred && <BlurView />}
 *       <YourContent />
 *     </View>
 *   );
 * }
 * ```
 */
export function useBackgroundBlur() {
  const [isBlurred, setIsBlurred] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!SCREENSHOT_PROTECTION_CONFIG.blurOnBackground) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        // App passe en arrière-plan
        setIsBlurred(true);
        logger.debug('Blur activated');
      } else if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App revient au premier plan
        setIsBlurred(false);
        logger.debug('Blur deactivated');
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return { isBlurred };
}

/**
 * ✅ Hook combiné pour écran sensible complet
 *
 * Usage:
 * ```tsx
 * function ProfileScreen() {
 *   const { isProtected, isBlurred, screenshotDetected } = useSensitiveScreen();
 *
 *   return (
 *     <View>
 *       {isBlurred && <BlurOverlay />}
 *       {screenshotDetected && <ScreenshotWarning />}
 *       <YourSensitiveContent />
 *     </View>
 *   );
 * }
 * ```
 */
export function useSensitiveScreen(enabled: boolean = true) {
  const { isProtected, screenshotDetected } = useScreenshotProtection(enabled);
  const { isBlurred } = useBackgroundBlur();

  return {
    isProtected,
    isBlurred,
    screenshotDetected,
  };
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * ✅ Vérifie si un écran est sensible
 */
export function isSensitiveScreen(screenName: string): boolean {
  return SENSITIVE_SCREENS.some(
    sensitive => screenName.toLowerCase().includes(sensitive.toLowerCase())
  );
}

/**
 * ✅ Obtient le statut de la protection
 */
export function getProtectionStatus() {
  return {
    isProtectionActive,
    backgroundBlurEnabled,
    platform: Platform.OS,
    canPreventScreenshots: Platform.OS === 'ios',
    canDetectScreenshots: true,
  };
}

/**
 * ✅ EXEMPLE D'UTILISATION DANS UN COMPOSANT:
 *
 * // Écran de mesures (sensible)
 * function MeasurementsScreen() {
 *   const { isProtected, isBlurred, screenshotDetected } = useSensitiveScreen();
 *
 *   return (
 *     <View style={{ flex: 1 }}>
 *       {screenshotDetected && (
 *         <View style={styles.warning}>
 *           <Text>⚠️ Screenshot détecté ! Vos données sont sensibles.</Text>
 *         </View>
 *       )}
 *
 *       {isBlurred && (
 *         <BlurView
 *           style={StyleSheet.absoluteFill}
 *           intensity={100}
 *         />
 *       )}
 *
 *       <YourMeasurementsContent />
 *     </View>
 *   );
 * }
 *
 * // Dans App.tsx (root)
 * function App() {
 *   const { isBlurred } = useBackgroundBlur();
 *
 *   return (
 *     <NavigationContainer>
 *       <Stack.Navigator>
 *         <Stack.Screen name="Home" component={HomeScreen} />
 *         <Stack.Screen name="Measurements" component={MeasurementsScreen} />
 *       </Stack.Navigator>
 *
 *       {isBlurred && (
 *         <BlurView
 *           style={StyleSheet.absoluteFill}
 *           intensity={90}
 *           tint="dark"
 *         />
 *       )}
 *     </NavigationContainer>
 *   );
 * }
 */

export default {
  enableScreenshotProtection,
  disableScreenshotProtection,
  enableBackgroundBlur,
  disableBackgroundBlur,
  useScreenshotProtection,
  useBackgroundBlur,
  useSensitiveScreen,
  isSensitiveScreen,
  getProtectionStatus,
  SENSITIVE_SCREENS,
  SCREENSHOT_PROTECTION_CONFIG,
};
