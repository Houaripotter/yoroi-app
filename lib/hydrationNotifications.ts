import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getHydrationSettings, getTodayHydration, saveHydrationSettings } from './storage';
import logger from '@/lib/security/logger';

// ============================================
// SERVICE NOTIFICATIONS HYDRATATION
// ============================================

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const HYDRATION_NOTIFICATION_ID = 'hydration-reminder';

/**
 * Demande les permissions de notification
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.info('Permission de notification refusee');
      return false;
    }

    // Configuration specifique Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('hydration', {
        name: 'Rappels Hydratation',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
        sound: 'default',
      });
    }

    return true;
  } catch (error) {
    logger.error('Erreur demande permissions notification:', error);
    return false;
  }
};

/**
 * Programme les rappels d'hydratation
 */
export const scheduleHydrationReminders = async (): Promise<void> => {
  try {
    const settings = await getHydrationSettings();

    if (!settings.reminderEnabled) {
      logger.info('Rappels hydratation desactives');
      return;
    }

    // Annuler les anciennes notifications
    await cancelHydrationReminders();

    // Permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      logger.info('Pas de permission pour les notifications');
      return;
    }

    const intervalMinutes = settings.reminderInterval || 120;

    // Programmer des rappels de 8h a 22h
    const startHour = 8;
    const endHour = 22;

    const messages = [
      "N'oublie pas de boire de l'eau !",
      "C'est l'heure de s'hydrater !",
      "Ton corps a besoin d'eau.",
      "Pense a boire !",
      "Un verre d'eau pour la victoire !",
      "L'hydratation, c'est la cle !",
      "Bois un coup, champion !",
      "Reste hydrate pour performer !",
    ];

    const now = new Date();
    let nextTime = new Date(now);
    nextTime.setMinutes(now.getMinutes() + intervalMinutes);

    // Programmer les rappels pour les prochaines 24h
    let notificationCount = 0;
    const maxNotifications = 10;

    while (notificationCount < maxNotifications) {
      const hour = nextTime.getHours();

      // Seulement entre startHour et endHour
      if (hour >= startHour && hour < endHour) {
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Hydratation',
            body: randomMessage,
            data: { type: 'hydration' },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: nextTime,
          },
        });

        notificationCount++;
      }

      // Passer au prochain intervalle
      nextTime = new Date(nextTime.getTime() + intervalMinutes * 60 * 1000);

      // Ne pas depasser 24h
      if (nextTime.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
        break;
      }
    }

    logger.info(`${notificationCount} rappels hydratation programmes`);
  } catch (error) {
    logger.error('Erreur programmation rappels hydratation:', error);
  }
};

/**
 * Annule tous les rappels d'hydratation
 */
export const cancelHydrationReminders = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    logger.info('Rappels hydratation annules');
  } catch (error) {
    logger.error('Erreur annulation rappels:', error);
  }
};

/**
 * Active/Desactive les rappels d'hydratation
 */
export const toggleHydrationReminders = async (enabled: boolean): Promise<boolean> => {
  try {
    await saveHydrationSettings({ reminderEnabled: enabled });

    if (enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        await saveHydrationSettings({ reminderEnabled: false });
        return false;
      }
      await scheduleHydrationReminders();
    } else {
      await cancelHydrationReminders();
    }

    return true;
  } catch (error) {
    logger.error('Erreur toggle rappels:', error);
    return false;
  }
};

/**
 * Envoie une notification instantanee de rappel
 * SEULEMENT si les rappels hydratation sont activés
 */
export const sendInstantHydrationReminder = async (): Promise<void> => {
  try {
    const settings = await getHydrationSettings();

    // Vérifier si les rappels sont activés
    if (!settings.reminderEnabled) {
      logger.info('Rappels hydratation désactivés - notification non envoyée');
      return;
    }

    const todayAmount = await getTodayHydration();
    const goal = (settings.customGoal || settings.dailyGoal) * 1000;
    const remaining = Math.max(0, goal - todayAmount);

    if (remaining > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Rappel Hydratation',
          body: `Il te reste ${(remaining / 1000).toFixed(1)}L a boire aujourd'hui !`,
          data: { type: 'hydration' },
          sound: 'default',
        },
        trigger: null, // Notification immediate
      });
    }
  } catch (error) {
    logger.error('Erreur notification instantanee:', error);
  }
};

/**
 * Verifie si les rappels sont actifs
 */
export const areHydrationRemindersActive = async (): Promise<boolean> => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some(n => n.content.data?.type === 'hydration');
  } catch (error) {
    logger.error('Erreur verification rappels:', error);
    return false;
  }
};
