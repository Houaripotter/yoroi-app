// ============================================
// YOROI - SERVICE HAPTIC FEEDBACK
// ============================================
// Feedback tactile centralisé pour toute l'app

import { selectionAsync, impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { Platform } from 'react-native';

export const HapticService = {
  // Feedback léger (sélection, toggle, navigation)
  light: () => {
    if (Platform.OS !== 'web') {
      selectionAsync();
    }
  },

  // Feedback moyen (bouton principal, action standard)
  medium: () => {
    if (Platform.OS !== 'web') {
      impactAsync(ImpactFeedbackStyle.Medium);
    }
  },

  // Feedback fort (action importante, confirmation)
  heavy: () => {
    if (Platform.OS !== 'web') {
      impactAsync(ImpactFeedbackStyle.Heavy);
    }
  },

  // Succès (sauvegarde, objectif atteint, validation)
  success: () => {
    if (Platform.OS !== 'web') {
      notificationAsync(NotificationFeedbackType.Success);
    }
  },

  // Erreur (échec, validation invalide)
  error: () => {
    if (Platform.OS !== 'web') {
      notificationAsync(NotificationFeedbackType.Error);
    }
  },

  // Warning (attention, avertissement)
  warning: () => {
    if (Platform.OS !== 'web') {
      notificationAsync(NotificationFeedbackType.Warning);
    }
  },
};

export default HapticService;
