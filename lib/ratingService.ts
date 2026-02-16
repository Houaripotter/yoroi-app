// ============================================
// RATING SERVICE - Gestion des demandes de notation
// Affiche le popup après 3 actions positives
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';

const STORAGE_KEYS = {
  ACTION_COUNT: '@yoroi_rating_action_count',
  HAS_RATED: '@yoroi_rating_has_rated',
  LAST_PROMPT_DATE: '@yoroi_rating_last_prompt',
  DISMISSED_COUNT: '@yoroi_rating_dismissed_count',
};

// Configuration
const CONFIG = {
  ACTIONS_BEFORE_PROMPT: 3, // Afficher après 3 actions positives
  MIN_DAYS_BETWEEN_PROMPTS: 7, // Minimum 7 jours entre les demandes
  MAX_DISMISSALS: 3, // Après 3 refus, ne plus demander
};

export interface RatingServiceResult {
  shouldShowPopup: boolean;
  actionType: 'weight' | 'session' | 'general';
}

class RatingService {
  // Vérifier si l'utilisateur a déjà noté
  async hasRated(): Promise<boolean> {
    try {
      const hasRated = await AsyncStorage.getItem(STORAGE_KEYS.HAS_RATED);
      return hasRated === 'true';
    } catch {
      return false;
    }
  }

  // Marquer comme noté
  async markAsRated(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_RATED, 'true');
    } catch (error) {
      logger.error('Error marking as rated:', error);
    }
  }

  // Obtenir le compteur d'actions
  async getActionCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(STORAGE_KEYS.ACTION_COUNT);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }

  // Incrémenter le compteur d'actions
  async incrementActionCount(): Promise<number> {
    try {
      const current = await this.getActionCount();
      const newCount = current + 1;
      await AsyncStorage.setItem(STORAGE_KEYS.ACTION_COUNT, newCount.toString());
      return newCount;
    } catch {
      return 0;
    }
  }

  // Réinitialiser le compteur
  async resetActionCount(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTION_COUNT, '0');
    } catch (error) {
      logger.error('Error resetting action count:', error);
    }
  }

  // Obtenir le nombre de fois où l'utilisateur a refusé
  async getDismissedCount(): Promise<number> {
    try {
      const count = await AsyncStorage.getItem(STORAGE_KEYS.DISMISSED_COUNT);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }

  // Incrémenter le compteur de refus
  async incrementDismissedCount(): Promise<void> {
    try {
      const current = await this.getDismissedCount();
      await AsyncStorage.setItem(STORAGE_KEYS.DISMISSED_COUNT, (current + 1).toString());
    } catch (error) {
      logger.error('Error incrementing dismissed count:', error);
    }
  }

  // Vérifier la dernière date de demande
  async getLastPromptDate(): Promise<Date | null> {
    try {
      const dateStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_PROMPT_DATE);
      return dateStr ? new Date(dateStr) : null;
    } catch {
      return null;
    }
  }

  // Enregistrer la date de demande
  async setLastPromptDate(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_PROMPT_DATE, new Date().toISOString());
    } catch (error) {
      logger.error('Error setting last prompt date:', error);
    }
  }

  // Vérifier si assez de jours se sont écoulés
  async hasEnoughDaysPassed(): Promise<boolean> {
    const lastPrompt = await this.getLastPromptDate();
    if (!lastPrompt) return true;

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastPrompt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= CONFIG.MIN_DAYS_BETWEEN_PROMPTS;
  }

  // Enregistrer une action positive et vérifier si on doit afficher le popup
  async recordPositiveAction(
    actionType: 'weight' | 'session'
  ): Promise<RatingServiceResult> {
    // Si l'utilisateur a déjà noté, ne jamais afficher
    if (await this.hasRated()) {
      return { shouldShowPopup: false, actionType };
    }

    // Si l'utilisateur a refusé trop de fois, ne plus demander
    const dismissedCount = await this.getDismissedCount();
    if (dismissedCount >= CONFIG.MAX_DISMISSALS) {
      return { shouldShowPopup: false, actionType };
    }

    // Vérifier si assez de temps s'est écoulé depuis la dernière demande
    if (!(await this.hasEnoughDaysPassed())) {
      // Incrémenter quand même le compteur
      await this.incrementActionCount();
      return { shouldShowPopup: false, actionType };
    }

    // Incrémenter le compteur d'actions
    const newCount = await this.incrementActionCount();

    // Vérifier si on atteint le seuil
    if (newCount >= CONFIG.ACTIONS_BEFORE_PROMPT) {
      // Réinitialiser le compteur pour le prochain cycle
      await this.resetActionCount();
      // Enregistrer la date de demande
      await this.setLastPromptDate();

      return { shouldShowPopup: true, actionType };
    }

    return { shouldShowPopup: false, actionType };
  }

  // Appelé quand l'utilisateur ferme le popup sans noter
  async onPopupDismissed(): Promise<void> {
    await this.incrementDismissedCount();
  }

  // Appelé quand l'utilisateur note l'app
  async onRated(): Promise<void> {
    await this.markAsRated();
  }

  // Pour les tests - réinitialiser tout
  async resetAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACTION_COUNT,
        STORAGE_KEYS.HAS_RATED,
        STORAGE_KEYS.LAST_PROMPT_DATE,
        STORAGE_KEYS.DISMISSED_COUNT,
      ]);
    } catch (error) {
      logger.error('Error resetting rating service:', error);
    }
  }
}

export const ratingService = new RatingService();
export default ratingService;
