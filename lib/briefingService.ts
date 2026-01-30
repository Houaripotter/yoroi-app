// ============================================
// YOROI - SERVICE BRIEFING MATIN
// ============================================
// Notifications personnalisées avec résumé quotidien

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getUserSettings } from './storage';
import { infirmaryService } from './infirmary';
import { calculateStreak, getTrainings } from './database';
import { isRestDay } from './restDaysService';
import logger from '@/lib/security/logger';

const BRIEFING_SETTINGS_KEY = '@yoroi_briefing_settings';

export interface BriefingSettings {
  enabled: boolean;
  time: string; // Format "HH:MM"
}

// Configuration par défaut - DÉSACTIVÉ pour ne pas spammer les utilisateurs
const DEFAULT_SETTINGS: BriefingSettings = {
  enabled: false, // OFF par défaut - l'utilisateur doit activer manuellement
  time: '07:00', // 7h du matin
};

class BriefingService {
  /**
   * Obtenir les paramètres du briefing
   */
  async getSettings(): Promise<BriefingSettings> {
    try {
      const data = await AsyncStorage.getItem(BRIEFING_SETTINGS_KEY);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch (error) {
      logger.error('[Briefing] Erreur chargement settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Sauvegarder les paramètres
   */
  async saveSettings(settings: BriefingSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(BRIEFING_SETTINGS_KEY, JSON.stringify(settings));
      await this.scheduleBriefing();
    } catch (error) {
      logger.error('[Briefing] Erreur sauvegarde settings:', error);
    }
  }

  /**
   * Demander la permission pour les notifications
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Générer le message de briefing personnalisé
   */
  async generateBriefingMessage(): Promise<{ title: string; body: string }> {
    try {
      const userSettings = await getUserSettings();
      const userName = userSettings?.username || 'Athlète';

      let message = `Bonjour ${userName} !\n\n`;

      // Calculer le vrai streak
      const streak = await calculateStreak();
      if (streak > 0) {
        message += `Série : ${streak} jour${streak > 1 ? 's' : ''} consécutif${streak > 1 ? 's' : ''}\n`;
      }

      // Vérifier les entraînements du jour
      const today = new Date().toISOString().split('T')[0];
      const trainings = await getTrainings();
      const todayTrainings = trainings.filter(t => t.date === today);
      const isRest = await isRestDay(today);

      if (isRest) {
        message += `😴 Jour de repos planifié\n`;
      } else if (todayTrainings.length > 0) {
        const sportsList = [...new Set(todayTrainings.map(t => t.sport))].join(', ');
        message += `Prévu : ${sportsList}\n`;
      } else {
        message += `Pas d'entraînement prévu\n`;
      }

      // Blessures actives
      const activeInjuries = await infirmaryService.getActiveInjuries();
      if (activeInjuries.length > 0) {
        const firstInjury = activeInjuries[0];
        message += `\nN'oublie pas tes soins pour ${firstInjury.zoneName}`;
      }

      message += `\n\nBonne journée, champion !`;

      return {
        title: '🌅 Briefing du matin',
        body: message,
      };
    } catch (error) {
      logger.error('[Briefing] Erreur génération message:', error);
      return {
        title: '🌅 Briefing du matin',
        body: 'Bonjour ! Bonne journée, champion !',
      };
    }
  }

  /**
   * Planifier le briefing quotidien
   */
  async scheduleBriefing(): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      logger.info('[Briefing] Permission refusée');
      return;
    }

    const settings = await this.getSettings();
    if (!settings.enabled) {
      logger.info('[Briefing] Briefing désactivé');
      await this.cancelBriefing();
      return;
    }

    try {
      // Annuler les notifications existantes
      await this.cancelBriefing();

      // Parser l'heure
      const [hours, minutes] = settings.time.split(':').map(Number);

      // Calculer la prochaine occurrence
      const now = new Date();
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      // Si l'heure est déjà passée aujourd'hui, planifier pour demain
      if (scheduledDate <= now) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      // Générer le message
      const { title, body } = await this.generateBriefingMessage();

      // Planifier la notification quotidienne
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'morning_briefing' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: hours,
          minute: minutes,
          repeats: true, // Répéter tous les jours
        },
      });

      logger.info(`[Briefing] Planifié pour ${hours}:${minutes} tous les jours`);
    } catch (error) {
      logger.error('[Briefing] Erreur planification:', error);
    }
  }

  /**
   * Annuler le briefing
   */
  async cancelBriefing(): Promise<void> {
    try {
      // Annuler toutes les notifications de type briefing
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const briefingNotifications = scheduled.filter(
        n => n.content.data?.type === 'morning_briefing'
      );

      for (const notification of briefingNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      logger.info('[Briefing] Notifications annulées');
    } catch (error) {
      logger.error('[Briefing] Erreur annulation:', error);
    }
  }

  /**
   * Activer le briefing
   */
  async enable(): Promise<void> {
    const settings = await this.getSettings();
    await this.saveSettings({ ...settings, enabled: true });
  }

  /**
   * Désactiver le briefing
   */
  async disable(): Promise<void> {
    const settings = await this.getSettings();
    await this.saveSettings({ ...settings, enabled: false });
    await this.cancelBriefing();
  }

  /**
   * Changer l'heure du briefing
   */
  async setTime(time: string): Promise<void> {
    const settings = await this.getSettings();
    await this.saveSettings({ ...settings, time });
  }
}

// Instance singleton
export const briefingService = new BriefingService();

export default briefingService;
