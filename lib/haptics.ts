import * as Haptics from 'expo-haptics';

// ============================================
// 🎮 HAPTICS FEEDBACK
// ============================================

/**
 * Feedback haptic léger (boutons, tabs)
 */
export const lightHaptic = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic moyen (sélection, toggle)
 */
export const mediumHaptic = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic fort (confirmation, action importante)
 */
export const heavyHaptic = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic de succès (enregistrement réussi, objectif atteint)
 */
export const successHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic d'erreur
 */
export const errorHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic d'avertissement
 */
export const warningHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic de sélection (wheel picker, slider)
 */
export const selectionHaptic = async () => {
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};
