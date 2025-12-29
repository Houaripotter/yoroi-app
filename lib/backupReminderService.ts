// ============================================
// SERVICE DE RAPPEL DE SAUVEGARDE
// ============================================
// Rappelle à l'utilisateur de sauvegarder ses données sur iCloud
// après avoir ajouté des données importantes

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const STORAGE_KEY = '@yoroi_backup_reminder';

interface BackupReminderState {
  dataAddedCount: number; // Nombre de fois qu'on a ajouté des données
  lastReminderDate: string | null; // Dernière fois qu'on a montré le rappel
  hasSeenReminder: boolean; // A déjà vu le rappel au moins une fois
}

// Configura settings
const SHOW_AFTER_ITEMS = 5; // Afficher après 5 ajouts
const DAYS_BETWEEN_REMINDERS = 7; // Minimum 7 jours entre 2 rappels

class BackupReminderService {
  private state: BackupReminderState = {
    dataAddedCount: 0,
    lastReminderDate: null,
    hasSeenReminder: false,
  };

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.state = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[BackupReminder] Erreur initialisation:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('[BackupReminder] Erreur sauvegarde état:', error);
    }
  }

  /**
   * Appelé quand l'utilisateur ajoute des données
   * Retourne true si le popup doit être affiché
   */
  async onDataAdded(): Promise<boolean> {
    await this.initialize();

    this.state.dataAddedCount++;
    await this.saveState();

    return this.shouldShowReminder();
  }

  /**
   * Détermine si on doit afficher le rappel
   */
  private shouldShowReminder(): boolean {
    // Si c'est la première fois, attendre au moins SHOW_AFTER_ITEMS ajouts
    if (!this.state.hasSeenReminder) {
      return this.state.dataAddedCount >= SHOW_AFTER_ITEMS;
    }

    // Si déjà vu, vérifier :
    // 1. Au moins SHOW_AFTER_ITEMS nouveaux ajouts depuis le dernier rappel
    // 2. Au moins DAYS_BETWEEN_REMINDERS jours depuis le dernier rappel

    if (this.state.dataAddedCount < SHOW_AFTER_ITEMS) {
      return false;
    }

    if (this.state.lastReminderDate) {
      const lastDate = new Date(this.state.lastReminderDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < DAYS_BETWEEN_REMINDERS) {
        return false;
      }
    }

    return true;
  }

  /**
   * Affiche le popup de rappel
   */
  async showReminder(onBackup?: () => void): Promise<void> {
    Alert.alert(
      '☁️ Sauvegarde tes données',
      'Yoroi est 100% confidentiel : tes données restent uniquement sur ton téléphone, sans serveur.\n\nPense à sauvegarder régulièrement sur iCloud pour ne jamais les perdre !',
      [
        {
          text: 'Plus tard',
          style: 'cancel',
          onPress: () => {
            this.markReminderShown();
          },
        },
        {
          text: 'Sauvegarder maintenant',
          onPress: () => {
            this.markReminderShown();
            if (onBackup) {
              onBackup();
            }
          },
        },
      ],
      { cancelable: false }
    );
  }

  /**
   * Marque le rappel comme vu
   */
  private async markReminderShown(): Promise<void> {
    this.state.hasSeenReminder = true;
    this.state.lastReminderDate = new Date().toISOString();
    this.state.dataAddedCount = 0; // Reset le compteur
    await this.saveState();
  }

  /**
   * Reset le service (pour testing ou settings)
   */
  async reset(): Promise<void> {
    this.state = {
      dataAddedCount: 0,
      lastReminderDate: null,
      hasSeenReminder: false,
    };
    await this.saveState();
  }
}

export const backupReminderService = new BackupReminderService();
