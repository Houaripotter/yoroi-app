import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// ============================================
// SYSTÈME DE NOTATION APP STORE
// ============================================

const REVIEW_ASKED_KEY = 'yoroi_review_asked';
const REVIEW_COUNT_KEY = 'yoroi_review_count';

/**
 * Incrémente le compteur d'actions positives
 */
export const incrementReviewTrigger = async (): Promise<void> => {
  try {
    const count = await AsyncStorage.getItem(REVIEW_COUNT_KEY);
    const newCount = parseInt(count || '0', 10) + 1;
    await AsyncStorage.setItem(REVIEW_COUNT_KEY, newCount.toString());
  } catch (error) {
    console.log('Review trigger error:', error);
  }
};

/**
 * Demande une note après plusieurs actions positives
 */
export const askForReview = async (): Promise<void> => {
  try {
    // Vérifier si on a déjà demandé
    const hasAsked = await AsyncStorage.getItem(REVIEW_ASKED_KEY);
    if (hasAsked === 'true') return;

    // Vérifier le nombre d'actions positives
    const count = await AsyncStorage.getItem(REVIEW_COUNT_KEY);
    const triggerCount = parseInt(count || '0', 10);

    // Demander après 7 actions positives
    if (triggerCount < 7) return;

    // Vérifier si le store review est disponible
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    Alert.alert(
      "🏆 Tu progresses bien Guerrier !",
      "Si Yoroi t'aide dans ta conquête, donne-nous de la force avec une note ⭐⭐⭐⭐⭐\n\nÇa nous aide énormément à grandir !",
      [
        { text: "Plus tard", style: "cancel" },
        {
          text: "💪 Donner de la force",
          onPress: async () => {
            try {
              await StoreReview.requestReview();
              await AsyncStorage.setItem(REVIEW_ASKED_KEY, 'true');
            } catch (e) {
              console.log('Store review error:', e);
            }
          }
        },
      ]
    );
  } catch (error) {
    console.log('Review error:', error);
  }
};

/**
 * Réinitialiser le compteur (pour tests)
 */
export const resetReviewTrigger = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(REVIEW_COUNT_KEY);
    await AsyncStorage.removeItem(REVIEW_ASKED_KEY);
  } catch (error) {
    console.log('Reset review error:', error);
  }
};

/**
 * Vérifier si on peut demander une review
 */
export const canAskForReview = async (): Promise<boolean> => {
  try {
    const hasAsked = await AsyncStorage.getItem(REVIEW_ASKED_KEY);
    if (hasAsked === 'true') return false;

    const count = await AsyncStorage.getItem(REVIEW_COUNT_KEY);
    const triggerCount = parseInt(count || '0', 10);

    return triggerCount >= 7;
  } catch (error) {
    return false;
  }
};
