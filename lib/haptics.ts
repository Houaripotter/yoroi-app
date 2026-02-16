import { impactAsync, notificationAsync, selectionAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

// ============================================
// 🎮 HAPTICS FEEDBACK
// ============================================

/**
 * Feedback haptic léger (boutons, tabs)
 */
export const lightHaptic = async () => {
  try {
    await impactAsync(ImpactFeedbackStyle.Light);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic moyen (sélection, toggle)
 */
export const mediumHaptic = async () => {
  try {
    await impactAsync(ImpactFeedbackStyle.Medium);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic fort (confirmation, action importante)
 */
export const heavyHaptic = async () => {
  try {
    await impactAsync(ImpactFeedbackStyle.Heavy);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic de succès (enregistrement réussi, objectif atteint)
 */
export const successHaptic = async () => {
  try {
    await notificationAsync(NotificationFeedbackType.Success);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic d'erreur
 */
export const errorHaptic = async () => {
  try {
    await notificationAsync(NotificationFeedbackType.Error);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic d'avertissement
 */
export const warningHaptic = async () => {
  try {
    await notificationAsync(NotificationFeedbackType.Warning);
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};

/**
 * Feedback haptic de sélection (wheel picker, slider)
 */
export const selectionHaptic = async () => {
  try {
    await selectionAsync();
  } catch (error) {
    // Silencieux si les haptics ne sont pas supportés
  }
};
