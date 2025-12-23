// ============================================
// YOROI TIMER NOTIFICATIONS
// Notifications pour le timer en arrière-plan
// ============================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as Notifications.NotificationBehavior),
});

class TimerNotificationsService {
  private notificationId: string | null = null;

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
   * Planifier une notification quand le timer finit
   */
  async scheduleTimerFinishedNotification(
    title: string,
    body: string,
    delaySeconds: number
  ): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.log('[TimerNotifications] Permission refusée');
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
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          data: { type: 'timer_finished' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
        } as Notifications.TimeIntervalTriggerInput,
      });

      console.log(`[TimerNotifications] Notification planifiée pour ${delaySeconds}s`);
    } catch (error) {
      console.error('[TimerNotifications] Erreur planification:', error);
    }
  }

  /**
   * Annuler la notification planifiée
   */
  async cancelNotification(): Promise<void> {
    if (this.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(this.notificationId);
        console.log('[TimerNotifications] Notification annulée');
        this.notificationId = null;
      } catch (error) {
        console.error('[TimerNotifications] Erreur annulation:', error);
      }
    }
  }

  /**
   * Mettre à jour une notification existante
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
   * Notification pour repos muscu terminé
   */
  async notifyRestFinished(): Promise<void> {
    await this.scheduleTimerFinishedNotification(
      '💪 Repos terminé !',
      'Go go go ! Prochaine série !',
      0 // Immédiat
    );
  }

  /**
   * Notification pour round combat terminé
   */
  async notifyRoundFinished(roundNumber: number, totalRounds: number): Promise<void> {
    const message = roundNumber < totalRounds
      ? `Round ${roundNumber}/${totalRounds} terminé ! Repos.`
      : 'Dernier round terminé ! Bravo !';

    await this.scheduleTimerFinishedNotification(
      '🥋 Round terminé',
      message,
      0
    );
  }

  /**
   * Notification pour entraînement complètement terminé
   */
  async notifyWorkoutFinished(mode: string): Promise<void> {
    const titles: Record<string, string> = {
      musculation: '💪 Entraînement terminé !',
      combat: '🥋 Combat terminé !',
      tabata: '⚡ Tabata terminé !',
      emom: '🔄 EMOM terminé !',
      amrap: '🔥 AMRAP terminé !',
      fortime: '⏱️ For Time terminé !',
    };

    await this.scheduleTimerFinishedNotification(
      titles[mode] || '🏆 Entraînement terminé !',
      'Excellent travail ! 💪',
      0
    );
  }
}

// Instance singleton
export const timerNotifications = new TimerNotificationsService();

export default timerNotifications;
