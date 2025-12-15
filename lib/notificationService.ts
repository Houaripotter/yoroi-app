import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type ReminderType = 'weight' | 'workout' | 'both';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Dimanche, 6 = Samedi

export interface ReminderSettings {
  enabled: boolean;
  time: string; // Format "HH:mm" (ex: "07:00")
  days: DayOfWeek[];
  type: ReminderType;
}

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Demander les permissions de notification
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Permission de notification refusée');
      return false;
    }

    // Configuration du canal de notification pour Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Rappels',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#34D399',
        sound: 'default',
      });
    }

    console.log('✅ Permission de notification accordée');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la demande de permission:', error);
    return false;
  }
};

// Vérifier le statut des permissions
export const checkNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des permissions:', error);
    return false;
  }
};

// Obtenir les messages de notification
const getNotificationMessage = (type: ReminderType): { title: string; body: string } => {
  const messages = {
    weight: {
      title: '⚖️ Rappel de pesée',
      body: "Bonjour Houari ! N'oublie pas de te peser 🛡️",
    },
    workout: {
      title: '💪 Rappel d\'entraînement',
      body: "C'est l'heure de s'entraîner ! Garde l'armure en forme 🛡️",
    },
    both: {
      title: '🛡️ Rappel Yoroi',
      body: "N'oublie pas de te peser et de t'entraîner aujourd'hui !",
    },
  };

  return messages[type];
};

// Annuler toutes les notifications planifiées
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ Toutes les notifications ont été annulées');
  } catch (error) {
    console.error('❌ Erreur lors de l\'annulation des notifications:', error);
  }
};

// Planifier les notifications selon les paramètres
export const scheduleNotifications = async (settings: ReminderSettings): Promise<void> => {
  try {
    // Annuler toutes les notifications existantes
    await cancelAllNotifications();

    if (!settings.enabled) {
      console.log('ℹ️  Les rappels sont désactivés');
      return;
    }

    // Vérifier les permissions
    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) {
      console.log('❌ Pas de permission pour les notifications');
      return;
    }

    // Parser l'heure
    const [hours, minutes] = settings.time.split(':').map(Number);

    // Message de notification
    const { title, body } = getNotificationMessage(settings.type);

    // Planifier une notification pour chaque jour sélectionné
    for (const day of settings.days) {
      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: hours,
        minute: minutes,
        weekday: day + 1, // expo-notifications utilise 1-7 (1 = Dimanche, 7 = Samedi)
        repeats: true,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: settings.type },
        },
        trigger,
      });

      console.log(`✅ Notification planifiée pour le jour ${day} à ${settings.time} (ID: ${notificationId})`);
    }

    console.log('✅ Toutes les notifications ont été planifiées');
  } catch (error) {
    console.error('❌ Erreur lors de la planification des notifications:', error);
  }
};

// Obtenir toutes les notifications planifiées (pour debug)
export const getAllScheduledNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📅 Notifications planifiées:', notifications);
    return notifications;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des notifications:', error);
    return [];
  }
};

// Tester immédiatement une notification
export const testNotification = async (type: ReminderType = 'weight'): Promise<void> => {
  try {
    const hasPermission = await checkNotificationPermissions();
    if (!hasPermission) {
      console.log('❌ Pas de permission pour les notifications');
      return;
    }

    const { title, body } = getNotificationMessage(type);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2, // Dans 2 secondes
      },
    });

    console.log('✅ Notification de test envoyée');
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification de test:', error);
  }
};
