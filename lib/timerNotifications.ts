// ============================================
// YOROI TIMER NOTIFICATIONS
// Notifications pour le timer en arriere-plan
// ============================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import { saveNotification } from '@/lib/notificationHistoryService';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Son de la notification de fin. wizz.mp3 n'existe que dans l'app compilee
 * (declare dans app.json, plugin expo-notifications). Dans Expo Go il n'est pas
 * dans l'app native : on prend le son par defaut pour eviter l'erreur
 * « Custom sound not found ».
 */
function timerSound(): string {
  if (Platform.OS !== 'ios') return 'default';
  try {
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'default';
  } catch {
    return 'default';
  }
  return 'wizz.mp3';
}

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

// Configuration des notifications, priorité max, affichage même en premier plan
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
    lightColor: '#2C4A84',
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
   * Permission déjà accordée ? Ne demande jamais rien (la planification se fait
   * quand l'app passe en arrière-plan : une fenêtre du système n'y apparaîtrait pas).
   * Seul un oui est mis en cache : un refus peut être levé dans les réglages du téléphone.
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    if (this.permissionGranted) return true;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      this.permissionGranted = status === 'granted';
    } catch {
      this.permissionGranted = false;
    }
    return this.permissionGranted;
  }

  /**
   * Au lancement du chrono, le seul moment où l'alerte de fin en a vraiment besoin :
   * fenêtre maison qui explique, puis fenêtre du système. Rien si l'alerte est coupée
   * dans les réglages du chrono, si c'est déjà autorisé ou déjà refusé par le système,
   * ou si « Plus tard » a été touché il y a moins de 7 jours (lib/v2/notifications/permission.ts).
   */
  async proposerAuLancement(mode: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      if (!this.settingsLoaded) await this.loadSettings();
      const utile = mode === 'musculation' ? this.settings.restFinished : this.settings.roundFinished;
      if (!utile) return;
      if (await this.requestPermissions()) return;
      const { proposerNotifications } = await import('@/lib/v2/notifications/permission');
      await proposerNotifications('timer', {
        titre: 'Une alerte à la fin du round',
        texte: 'Pour te prévenir à la fin du round ou du repos, même téléphone verrouillé. Jamais de chiffre de santé sur l’écran verrouillé.',
        onAccepte: () => {
          this.permissionGranted = true;
        },
      });
    } catch (error) {
      logger.warn('[TimerNotifications] Proposition impossible:', error);
    }
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

      // Délai calculé ICI : après les await, pour être précis à la seconde près
      const delaySeconds = Math.max(1, Math.ceil((targetTimestampMs - Date.now()) / 1000));

      this.notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: timerSound(),
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 400, 200, 400, 200, 400],
          data: { type: 'timer_finished' },
          ...(Platform.OS === 'ios' && {
            // timeSensitive : passe à travers tous les modes Focus (pas besoin d'approbation Apple)
            interruptionLevel: 'timeSensitive' as any,
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
   * @param targetTimestampMs Timestamp absolu (Date.now() + durée * 1000), jamais une durée brute
   */
  async scheduleTimerEndNotification(mode: string, targetTimestampMs: number): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();

    if (mode === 'musculation') {
      if (!this.settings.restFinished) return;
      await this.scheduleTimerFinishedNotification('Repos terminé', 'À toi pour la série suivante.', targetTimestampMs);
    } else {
      if (!this.settings.roundFinished) return;
      await this.scheduleTimerFinishedNotification('Minuteur terminé', 'Beau travail.', targetTimestampMs);
    }
  }

  /**
   * Notification immédiate, repos muscu terminé
   */
  async notifyRestFinished(): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();
    if (!this.settings.restFinished) return;
    await this.scheduleTimerFinishedNotification('Repos terminé', 'À toi pour la série suivante.', Date.now() + 1000);
  }

  /**
   * Notification immédiate, round combat terminé
   */
  async notifyRoundFinished(roundNumber: number, totalRounds: number): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();
    if (!this.settings.roundFinished) return;

    const message = roundNumber < totalRounds
      ? `Round ${roundNumber} sur ${totalRounds} terminé. Souffle un peu.`
      : 'Dernier round terminé. Beau travail.';

    await this.scheduleTimerFinishedNotification('Round terminé', message, Date.now() + 1000);
  }

  /**
   * Notification immédiate, entraînement terminé
   */
  async notifyWorkoutFinished(mode: string): Promise<void> {
    if (!this.settingsLoaded) await this.loadSettings();
    if (!this.settings.workoutFinished) return;

    const titles: Record<string, string> = {
      musculation: 'Entraînement terminé',
      combat: 'Combat terminé',
      tabata: 'Tabata terminé',
      emom: 'EMOM terminé',
      amrap: 'AMRAP terminé',
      fortime: 'For Time terminé',
    };

    await this.scheduleTimerFinishedNotification(
      titles[mode] || 'Entraînement terminé',
      'Beau travail. Pense à boire et à t’étirer.',
      Date.now() + 1000
    );
  }
}

// Instance singleton
export const timerNotifications = new TimerNotificationsService();

export default timerNotifications;
