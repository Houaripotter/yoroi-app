// ============================================
// YOROI TIMER NOTIFICATIONS
// Notifications pour le timer en arriere-plan
// ============================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import { saveNotification } from '@/lib/notificationHistoryService';

const TIMER_NOTIF_SETTINGS_KEY = '@yoroi_timer_notification_settings';

export interface TimerNotifSettings {
  restFinished: boolean;    // "Repos terminé ! Go go go !"
  roundFinished: boolean;   // "Round terminé"
  workoutFinished: boolean; // "Entraînement terminé"
}

const DEFAULT_SETTINGS: TimerNotifSettings = {
  restFinished: true,
  roundFinished: true,
  workoutFinished: true,
};

// Configuration des notifications — priorité max, affichage même en premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  } as Notifications.NotificationBehavior),
});

// Canal Android haute priorité (crée une fois au démarrage)
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('timer_alarm', {
    name: 'Alarme Timer YOROI',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 400, 200, 400, 200, 400],
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableLights: true,
    lightColor: '#EF4444',
  });
}

class TimerNotificationsService {
  private notificationId: string | null = null;
  private settings: TimerNotifSettings = { ...DEFAULT_SETTINGS };
  private settingsLoaded = false;

  /**
   * Charger les settings depuis AsyncStorage
   */
  async loadSettings(): Promise<TimerNotifSettings> {
    try {
      const data = await AsyncStorage.getItem(TIMER_NOTIF_SETTINGS_KEY);
      if (data) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
      this.settingsLoaded = true;
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
    return this.settings;
  }

  /**
   * Sauvegarder les settings
   */
  async saveSettings(settings: TimerNotifSettings): Promise<void> {
    this.settings = settings;
    this.settingsLoaded = true;
    try {
      await AsyncStorage.setItem(TIMER_NOTIF_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      logger.error('[TimerNotifications] Erreur sauvegarde settings:', error);
    }
  }

  /**
   * Obtenir les settings actuels
   */
  getSettings(): TimerNotifSettings {
    return { ...this.settings };
  }

  /**
   * Demander la permission pour les notifications
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,  // plein écran même en silencieux
          provideAppNotificationSettings: false,
        },
      });
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Planifier une notification quand le timer finit
   */
  async scheduleTimerFinishedNotification(
    title: string,
    body: string,
    delaySeconds: number
  ): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      logger.info('[TimerNotifications] Permission refusée');
      return;
    }

    try {
      // Annuler la notification précédente si elle existe
      await this.cancelNotification();

      // Planifier la nouvelle notification
      this.notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: Platform.OS === 'ios' ? 'wizz.mp3' : 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 400, 200, 400, 200, 400],
          data: { type: 'timer_finished' },
          // iOS : interruption critique — s'affiche plein écran sur l'écran verrouillé
          // et passe à travers le mode silence et Focus
          ...(Platform.OS === 'ios' && {
            interruptionLevel: 'critical' as any,
          }),
          // Android : canal haute priorité + intent plein écran
          ...(Platform.OS === 'android' && {
            channelId: 'timer_alarm',
            fullScreenIntent: true,
            sticky: false,
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, delaySeconds),
        } as Notifications.TimeIntervalTriggerInput,
      });

      logger.info(`[TimerNotifications] Notification planifiée pour ${delaySeconds}s`);

      // Sauvegarder dans l'historique
      saveNotification(title, body, 'timer', { type: 'timer_finished' }).catch(() => {});
    } catch (error) {
      logger.error('[TimerNotifications] Erreur planification:', error);
    }
  }

  /**
   * Annuler la notification planifiée
   */
  async cancelNotification(): Promise<void> {
    if (this.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(this.notificationId);
        logger.info('[TimerNotifications] Notification annulée');
        this.notificationId = null;
      } catch (error) {
        logger.error('[TimerNotifications] Erreur annulation:', error);
      }
    }
  }

  /**
   * Mettre a jour une notification existante
   */
  async updateTimerNotification(
    title: string,
    body: string,
    delaySeconds: number
  ): Promise<void> {
    // Annuler l'ancienne et créer une nouvelle
    await this.cancelNotification();
    await this.scheduleTimerFinishedNotification(title, body, delaySeconds);
  }

  /**
   * Planifier notification de fin de timer (appele depuis timer.tsx)
   * Respecte les settings utilisateur
   */
  async scheduleTimerEndNotification(mode: string, delaySeconds: number): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();

    if (mode === 'musculation') {
      if (!this.settings.restFinished) return;
      await this.scheduleTimerFinishedNotification('Repos terminé !', 'Go go go ! Prochaine série !', delaySeconds);
    } else {
      if (!this.settings.roundFinished) return;
      await this.scheduleTimerFinishedNotification('Timer terminé !', 'Excellent travail !', delaySeconds);
    }
  }

  /**
   * Notification pour repos muscu terminé
   */
  async notifyRestFinished(): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();
    if (!this.settings.restFinished) return;

    await this.scheduleTimerFinishedNotification(
      'Repos terminé !',
      'Go go go ! Prochaine série !',
      0 // Immédiat
    );
  }

  /**
   * Notification pour round combat terminé
   */
  async notifyRoundFinished(roundNumber: number, totalRounds: number): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();
    if (!this.settings.roundFinished) return;

    const message = roundNumber < totalRounds
      ? `Round ${roundNumber}/${totalRounds} terminé ! Repos.`
      : 'Dernier round terminé ! Bravo !';

    await this.scheduleTimerFinishedNotification(
      'Round terminé',
      message,
      0
    );
  }

  /**
   * Notification pour entraînement complètement terminé
   */
  async notifyWorkoutFinished(mode: string): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();
    if (!this.settings.workoutFinished) return;

    const titles: Record<string, string> = {
      musculation: 'Entraînement terminé !',
      combat: 'Combat terminé !',
      tabata: 'Tabata terminé !',
      emom: 'EMOM terminé !',
      amrap: 'AMRAP terminé !',
      fortime: 'For Time terminé !',
    };

    await this.scheduleTimerFinishedNotification(
      titles[mode] || 'Entraînement terminé !',
      'Excellent travail !',
      0
    );
  }
}

// Instance singleton
export const timerNotifications = new TimerNotificationsService();

export default timerNotifications;
