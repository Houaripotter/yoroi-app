// ============================================
// YOROI - SERVICE HAPTIC FEEDBACK
// ============================================
// Feedback tactile centralisé pour toute l'app

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const HapticService = {
  // Feedback léger (sélection, toggle, navigation)
  light: () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  },

  // Feedback moyen (bouton principal, action standard)
  medium: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  // Feedback fort (action importante, confirmation)
  heavy: () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },

  // Succès (sauvegarde, objectif atteint, validation)
  success: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  // Erreur (échec, validation invalide)
  error: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  // Warning (attention, avertissement)
  warning: () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },
};

export default HapticService;
