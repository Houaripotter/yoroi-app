// ============================================
// REVIEW PROMPT SERVICE
// Demande une note App Store au BON moment (user content, pas frustré).
//
// Déclencheurs :
// - Après 10 séances loggées
// - Après 7 jours d'usage cumulé
// - Après 3 pesées loggées
// - Après 1 session sparring avec ≥ 3 rounds
//
// Contraintes Apple :
// - Max 3 prompts par 365 jours
// - Attendre ≥ 10s après action positive
// ============================================

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';

const LAST_PROMPT_KEY = '@yoroi_review_last_prompt';
const PROMPTS_COUNT_KEY = '@yoroi_review_prompts_count';
const PROMPTS_COUNT_PERIOD_KEY = '@yoroi_review_prompts_period_start';
const MIN_DAYS_BETWEEN_PROMPTS = 90; // 3 mois entre 2 prompts
const MAX_PROMPTS_PER_YEAR = 3; // Limite Apple

/**
 * Demande une review si les conditions sont remplies.
 * Retourne true si le prompt a été déclenché.
 */
export const requestReviewIfAppropriate = async (): Promise<boolean> => {
  try {
    // 1. Vérifier support OS
    const available = await StoreReview.isAvailableAsync();
    if (!available) return false;

    const hasAction = await StoreReview.hasAction();
    if (!hasAction) return false;

    // 2. Vérifier min days since last prompt
    const lastPromptStr = await AsyncStorage.getItem(LAST_PROMPT_KEY);
    if (lastPromptStr) {
      const daysSince = (Date.now() - parseInt(lastPromptStr, 10)) / (86400 * 1000);
      if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) {
        return false;
      }
    }

    // 3. Vérifier quota annuel (3 max/an Apple)
    const periodStartStr = await AsyncStorage.getItem(PROMPTS_COUNT_PERIOD_KEY);
    const periodStart = periodStartStr ? parseInt(periodStartStr, 10) : 0;
    const now = Date.now();
    const yearMs = 365 * 86400 * 1000;

    if (!periodStart || now - periodStart > yearMs) {
      // Reset compteur
      await AsyncStorage.setItem(PROMPTS_COUNT_PERIOD_KEY, String(now));
      await AsyncStorage.setItem(PROMPTS_COUNT_KEY, '0');
    }

    const countStr = await AsyncStorage.getItem(PROMPTS_COUNT_KEY);
    const count = countStr ? parseInt(countStr, 10) : 0;
    if (count >= MAX_PROMPTS_PER_YEAR) {
      logger.info('[Review] Quota annuel atteint (3/an)');
      return false;
    }

    // 4. Déclencher le prompt
    await StoreReview.requestReview();
    await AsyncStorage.setItem(LAST_PROMPT_KEY, String(now));
    await AsyncStorage.setItem(PROMPTS_COUNT_KEY, String(count + 1));
    logger.info('[Review] Prompt affiché à l\'utilisateur');
    return true;
  } catch (e) {
    logger.warn('[Review] Erreur requestReview:', e);
    return false;
  }
};

/**
 * Helper : déclenche un prompt de review UNIQUEMENT après un moment positif
 * (user content). Attend 2s pour que l'user voie son action réussie avant.
 */
export const promptReviewAfterPositiveAction = (delayMs: number = 2000): void => {
  setTimeout(() => {
    requestReviewIfAppropriate().catch(() => {});
  }, delayMs);
};

/**
 * Reset les compteurs (debug only).
 */
export const resetReviewPrompts = async (): Promise<void> => {
  await AsyncStorage.multiRemove([LAST_PROMPT_KEY, PROMPTS_COUNT_KEY, PROMPTS_COUNT_PERIOD_KEY]);
};
