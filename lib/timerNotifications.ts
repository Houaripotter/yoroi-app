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
  private permissionGranted: boolean | null = null; // cache pour éviter le délai async

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
   * Demander la permission pour les notifications — résultat mis en cache
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    // Cache : évite le délai async après le premier appel
    if (this.permissionGranted !== null) return this.permissionGranted;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
          provideAppNotificationSettings: false,
        },
      });
      finalStatus = status;
    }

    this.permissionGranted = finalStatus === 'granted';
    return this.permissionGranted;
  }

  /**
   * Planifier une notification quand le timer finit.
   * @param targetTimestampMs Timestamp absolu (ms) quand la notif doit sonner.
   *   Le délai est recalculé APRÈS les opérations async (permissions, cancel)
   *   pour éviter le décalage dû au temps d'initialisation.
   */
  async scheduleTimerFinishedNotification(
    title: string,
    body: string,
    targetTimestampMs: number
  ): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      logger.info('[TimerNotifications] Permission refusée');
      return;
    }

    try {
      await this.cancelNotification();

      // Délai calculé ICI — après les await — pour être précis à la seconde près
      const delaySeconds = Math.max(1, Math.ceil((targetTimestampMs - Date.now()) / 1000));

      this.notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: Platform.OS === 'ios' ? 'wizz.mp3' : 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 400, 200, 400, 200, 400],
          data: { type: 'timer_finished' },
          ...(Platform.OS === 'ios' && {
            // timeSensitive : passe à travers tous les modes Focus (pas besoin d'approbation Apple)
            interruptionLevel: 'timeSensitive' as any,
            sound: 'wizz.mp3',
          }),
          ...(Platform.OS === 'android' && {
            channelId: 'timer_alarm',
            fullScreenIntent: true,
            sticky: false,
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
        } as Notifications.TimeIntervalTriggerInput,
      });

      logger.info(`[TimerNotifications] Notification planifiée dans ${delaySeconds}s`);
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
   * @param targetTimestampMs Timestamp absolu quand la notif doit sonner
   */
  async updateTimerNotification(
    title: string,
    body: string,
    targetTimestampMs: number
  ): Promise<void> {
    await this.cancelNotification();
    await this.scheduleTimerFinishedNotification(title, body, targetTimestampMs);
  }

  /**
   * Planifier notification de fin de timer (appelé depuis timer.tsx)
   * @param targetTimestampMs Timestamp absolu (Date.now() + durée * 1000) — jamais une durée brute
   */
  async scheduleTimerEndNotification(mode: string, targetTimestampMs: number): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();

    if (mode === 'musculation') {
      if (!this.settings.restFinished) return;
      await this.scheduleTimerFinishedNotification('Repos terminé !', 'Go go go ! Prochaine série !', targetTimestampMs);
    } else {
      if (!this.settings.roundFinished) return;
      await this.scheduleTimerFinishedNotification('Timer terminé !', 'Excellent travail !', targetTimestampMs);
    }
  }

  /**
   * Notification immédiate — repos muscu terminé
   */
  async notifyRestFinished(): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();
    if (!this.settings.restFinished) return;
    await this.scheduleTimerFinishedNotification('Repos terminé !', 'Go go go ! Prochaine série !', Date.now() + 1000);
  }

  /**
   * Notification immédiate — round combat terminé
   */
  async notifyRoundFinished(roundNumber: number, totalRounds: number): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();
    if (!this.settings.roundFinished) return;

    const message = roundNumber < totalRounds
      ? `Round ${roundNumber}/${totalRounds} terminé ! Repos.`
      : 'Dernier round terminé ! Bravo !';

    await this.scheduleTimerFinishedNotification('Round terminé', message, Date.now() + 1000);
  }

  /**
   * Notification immédiate — entraînement terminé
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
      Date.now() + 1000
    );
  }
}

// Instance singleton
export const timerNotifications = new TimerNotificationsService();

export default timerNotifications;
