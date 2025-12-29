// ============================================
// SERVICE DE BROUILLON AUTOMATIQUE
// ============================================
// Sauvegarde automatiquement les données en cours de saisie
// pour éviter toute perte en cas de crash

import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_KEYS = {
  WEIGHT_ENTRY: '@yoroi_draft_weight_entry',
  TRAINING_ENTRY: '@yoroi_draft_training_entry',
};

// ============================================
// TYPES
// ============================================

export interface WeightDraft {
  timestamp: string;
  weight: string;
  date: Date;
  fatPercent?: string;
  musclePercent?: string;
  waterPercent?: string;
  boneMass?: string;
  visceralFat?: string;
  metabolicAge?: string;
  bmr?: string;
  waist?: string;
  chest?: string;
  arm?: string;
  thigh?: string;
  hips?: string;
  neck?: string;
  calf?: string;
  mood?: string;
}

export interface TrainingDraft {
  timestamp: string;
  sport: string;
  date: Date;
  sessionType?: string;
  notes?: string;
  duration?: string;
}

// ============================================
// WEIGHT DRAFT SERVICE
// ============================================

class DraftService {
  /**
   * Sauvegarde un brouillon de poids
   */
  async saveWeightDraft(draft: WeightDraft): Promise<void> {
    try {
      const draftWithTimestamp = {
        ...draft,
        timestamp: new Date().toISOString(),
        date: draft.date.toISOString(), // Convertir la date en string
      };
      await AsyncStorage.setItem(
        DRAFT_KEYS.WEIGHT_ENTRY,
        JSON.stringify(draftWithTimestamp)
      );
    } catch (error) {
      console.error('[Draft] Erreur sauvegarde brouillon poids:', error);
    }
  }

  /**
   * Récupère un brouillon de poids
   */
  async getWeightDraft(): Promise<WeightDraft | null> {
    try {
      const stored = await AsyncStorage.getItem(DRAFT_KEYS.WEIGHT_ENTRY);
      if (!stored) return null;

      const draft = JSON.parse(stored);
      // Reconvertir la date en objet Date
      if (draft.date) {
        draft.date = new Date(draft.date);
      }

      // Vérifier que le brouillon n'est pas trop vieux (> 7 jours)
      const draftAge = Date.now() - new Date(draft.timestamp).getTime();
      const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours

      if (draftAge > MAX_AGE) {
        // Brouillon trop vieux, le supprimer
        await this.clearWeightDraft();
        return null;
      }

      return draft;
    } catch (error) {
      console.error('[Draft] Erreur récupération brouillon poids:', error);
      return null;
    }
  }

  /**
   * Efface le brouillon de poids
   */
  async clearWeightDraft(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DRAFT_KEYS.WEIGHT_ENTRY);
    } catch (error) {
      console.error('[Draft] Erreur suppression brouillon poids:', error);
    }
  }

  /**
   * Sauvegarde un brouillon d'entraînement
   */
  async saveTrainingDraft(draft: TrainingDraft): Promise<void> {
    try {
      const draftWithTimestamp = {
        ...draft,
        timestamp: new Date().toISOString(),
        date: draft.date.toISOString(),
      };
      await AsyncStorage.setItem(
        DRAFT_KEYS.TRAINING_ENTRY,
        JSON.stringify(draftWithTimestamp)
      );
    } catch (error) {
      console.error('[Draft] Erreur sauvegarde brouillon entraînement:', error);
    }
  }

  /**
   * Récupère un brouillon d'entraînement
   */
  async getTrainingDraft(): Promise<TrainingDraft | null> {
    try {
      const stored = await AsyncStorage.getItem(DRAFT_KEYS.TRAINING_ENTRY);
      if (!stored) return null;

      const draft = JSON.parse(stored);
      if (draft.date) {
        draft.date = new Date(draft.date);
      }

      // Vérifier l'âge (7 jours)
      const draftAge = Date.now() - new Date(draft.timestamp).getTime();
      const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours

      if (draftAge > MAX_AGE) {
        await this.clearTrainingDraft();
        return null;
      }

      return draft;
    } catch (error) {
      console.error('[Draft] Erreur récupération brouillon entraînement:', error);
      return null;
    }
  }

  /**
   * Efface le brouillon d'entraînement
   */
  async clearTrainingDraft(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DRAFT_KEYS.TRAINING_ENTRY);
    } catch (error) {
      console.error('[Draft] Erreur suppression brouillon entraînement:', error);
    }
  }

  /**
   * Vérifie si un brouillon existe
   */
  async hasWeightDraft(): Promise<boolean> {
    const draft = await this.getWeightDraft();
    return draft !== null;
  }

  async hasTrainingDraft(): Promise<boolean> {
    const draft = await this.getTrainingDraft();
    return draft !== null;
  }

  /**
   * Calcule l'âge du brouillon en jours
   */
  async getWeightDraftAgeInDays(): Promise<number | null> {
    try {
      const stored = await AsyncStorage.getItem(DRAFT_KEYS.WEIGHT_ENTRY);
      if (!stored) return null;

      const draft = JSON.parse(stored);
      const draftAge = Date.now() - new Date(draft.timestamp).getTime();
      const ageInDays = Math.floor(draftAge / (24 * 60 * 60 * 1000));

      return ageInDays;
    } catch (error) {
      return null;
    }
  }

  /**
   * Vérifie si le brouillon est proche de l'expiration (> 5 jours)
   */
  async isWeightDraftExpiringSoon(): Promise<boolean> {
    const age = await this.getWeightDraftAgeInDays();
    if (age === null) return false;
    return age >= 5; // Alerte si 5 jours ou plus
  }
}

export const draftService = new DraftService();
