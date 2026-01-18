import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

// ============================================
// SYSTEME DE NOTATION APP STORE
// ============================================

const REVIEW_ASKED_KEY = 'yoroi_review_asked';
const REVIEW_COUNT_KEY = 'yoroi_review_count';

/**
 * Incremente le compteur d'actions positives
 */
export const incrementReviewTrigger = async (): Promise<void> => {
  try {
    const count = await AsyncStorage.getItem(REVIEW_COUNT_KEY);
    const newCount = parseInt(count || '0', 10) + 1;
    await AsyncStorage.setItem(REVIEW_COUNT_KEY, newCount.toString());
  } catch (error) {
    logger.info('Review trigger error:', error);
  }
};

/**
 * Verifie si on doit demander une note (sans afficher de popup)
 * Retourne true si les conditions sont remplies
 */
export const shouldAskForReview = async (): Promise<boolean> => {
  try {
    // Verifier si on a deja demande
    const hasAsked = await AsyncStorage.getItem(REVIEW_ASKED_KEY);
    if (hasAsked === 'true') return false;

    // Verifier le nombre d'actions positives
    const count = await AsyncStorage.getItem(REVIEW_COUNT_KEY);
    const triggerCount = parseInt(count || '0', 10);

    // Demander apres 7 actions positives
    if (triggerCount < 7) return false;

    // Verifier si le store review est disponible
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return false;

    return true;
  } catch (error) {
    logger.info('Review check error:', error);
    return false;
  }
};

/**
 * Marque la review comme demandee
 */
export const markReviewAsked = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(REVIEW_ASKED_KEY, 'true');
  } catch (error) {
    logger.info('Mark review error:', error);
  }
};

/**
 * Demande une note directement (pour usage interne)
 * Utilise le ReviewModal pour un meilleur UX
 */
export const askForReview = async (): Promise<boolean> => {
  const should = await shouldAskForReview();
  return should;
};

/**
 * Reinitialiser le compteur (pour tests)
 */
export const resetReviewTrigger = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(REVIEW_COUNT_KEY);
    await AsyncStorage.removeItem(REVIEW_ASKED_KEY);
  } catch (error) {
    logger.info('Reset review error:', error);
  }
};

/**
 * Verifier si on peut demander une review
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
