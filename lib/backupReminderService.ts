// ============================================================
// YOROI : Service de rappel de sauvegarde
// ============================================================
// Propose à l'utilisateur de sauvegarder après N entrées
// ou si ça fait trop longtemps sans backup.
//
// Usage dans entry.tsx / add-training.tsx :
//   const suggest = await backupReminderService.onDataAdded();
//   if (suggest) { /* afficher popup backup avec showPopup */ }
//
//   await backupReminderService.markReminderShown(); // après action user
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const STORAGE_KEY           = '@yoroi_backup_reminder';
const SHOW_AFTER_ITEMS      = 5;   // proposer après 5 entrées (poids OU séances)
const DAYS_BETWEEN_REMINDERS = 7;  // min 7 jours entre 2 rappels

interface BackupReminderState {
  dataAddedCount: number;
  lastReminderDate: string | null;
  hasSeenReminder: boolean;
}

class BackupReminderService {
  private state: BackupReminderState = {
    dataAddedCount: 0,
    lastReminderDate: null,
    hasSeenReminder: false,
  };

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) this.state = JSON.parse(stored);
    } catch (error) {
      logger.error('[BackupReminder] Erreur initialisation:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      logger.error('[BackupReminder] Erreur sauvegarde état:', error);
    }
  }

  /**
   * Appelé après chaque enregistrement (poids ou séance).
   * Retourne true si l'app doit proposer une sauvegarde maintenant.
   */
  async onDataAdded(): Promise<boolean> {
    await this.initialize();
    this.state.dataAddedCount++;
    await this.saveState();
    return this.shouldShowReminder();
  }

  private shouldShowReminder(): boolean {
    if (this.state.dataAddedCount < SHOW_AFTER_ITEMS) return false;

    // Premier rappel : dès SHOW_AFTER_ITEMS entrées
    if (!this.state.hasSeenReminder) return true;

    // Rappels suivants : aussi attendre DAYS_BETWEEN_REMINDERS
    if (this.state.lastReminderDate) {
      const lastDate = new Date(this.state.lastReminderDate);
      const daysDiff = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < DAYS_BETWEEN_REMINDERS) return false;
    }

    return true;
  }

  /**
   * À appeler quand l'utilisateur a vu le popup (qu'il sauvegarde ou non).
   * Remet le compteur à zéro et enregistre la date du rappel.
   */
  async markReminderShown(): Promise<void> {
    await this.initialize();
    this.state.hasSeenReminder = true;
    this.state.lastReminderDate = new Date().toISOString();
    this.state.dataAddedCount = 0;
    await this.saveState();
    logger.info('[BackupReminder] Rappel vu, compteur remis à zéro.');
  }

  /**
   * Retourne le nombre d'entrées depuis le dernier rappel (debug).
   */
  async getCount(): Promise<number> {
    await this.initialize();
    return this.state.dataAddedCount;
  }

  async reset(): Promise<void> {
    this.state = { dataAddedCount: 0, lastReminderDate: null, hasSeenReminder: false };
    await this.saveState();
  }
}

export const backupReminderService = new BackupReminderService();
