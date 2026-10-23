// ============================================
// BIOMETRIC LOCK : FaceID / TouchID au lancement
// ============================================
// Verrouille l'app si activee par l'utilisateur.
// Prompt au lancement ou quand l'app revient au premier plan apres > 5 min.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

// expo-local-authentication est require dynamiquement : si non installe,
// les fonctions retournent des defaults "non supporte" sans crasher.
let LocalAuthentication: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  LocalAuthentication = require('expo-local-authentication');
} catch {
  LocalAuthentication = null;
}

const ENABLED_KEY = '@yoroi_biometric_lock_enabled';
const LAST_AUTH_KEY = '@yoroi_biometric_last_auth';
const REAUTH_AFTER_MINUTES = 5;

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  if (!LocalAuthentication) return false;
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch {
    return false;
  }
}

export async function isBiometricLockEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ENABLED_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled) {
    await AsyncStorage.removeItem(LAST_AUTH_KEY);
  }
}

/**
 * Demande FaceID/TouchID si active + si derniere auth > 5min.
 * Retourne true si authentifie ou pas necessaire, false si echec.
 */
export async function authenticateIfNeeded(): Promise<boolean> {
  try {
    const enabled = await isBiometricLockEnabled();
    if (!enabled) return true;

    const available = await isBiometricHardwareAvailable();
    if (!available) return true; // fallback : pas bloquer si hardware down

    // Re-auth seulement si > REAUTH_AFTER_MINUTES
    const lastAuthStr = await AsyncStorage.getItem(LAST_AUTH_KEY);
    if (lastAuthStr) {
      const last = parseInt(lastAuthStr, 10);
      if (Date.now() - last < REAUTH_AFTER_MINUTES * 60 * 1000) {
        return true;
      }
    }

    if (!LocalAuthentication) return true;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Deverrouillez Yoroi',
      fallbackLabel: 'Utiliser le code',
      cancelLabel: 'Annuler',
      disableDeviceFallback: false,
    });

    if (result.success) {
      await AsyncStorage.setItem(LAST_AUTH_KEY, String(Date.now()));
      return true;
    }
    return false;
  } catch (e) {
    logger.warn('[BiometricLock] erreur auth', e);
    return true; // ne jamais bloquer sur erreur technique
  }
}

/**
 * Force un re-prompt la prochaine fois (ex : user vient de changer ses reglages).
 */
export async function invalidateLastAuth(): Promise<void> {
  await AsyncStorage.removeItem(LAST_AUTH_KEY);
}
