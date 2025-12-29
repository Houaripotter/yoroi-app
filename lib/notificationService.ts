// ============================================
// YOROI - SERVICE DE NOTIFICATIONS
// ============================================
// Rappels d'entraînement, hydratation, pesée
// ============================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ReminderType = 'weight' | 'workout' | 'both';

export interface ReminderSettings {
  enabled: boolean;
  time: string;
  days: DayOfWeek[];
  type: ReminderType;
}

export interface HydrationSlot {
  enabled: boolean;
  time: string; // HH:mm
  amount: number; // ml
}

export interface NotificationSettings {
  enabled: boolean;
  training: {
    enabled: boolean;
    time: string; // HH:mm format
    days: number[]; // 0-6 (dimanche = 0)
  };
  hydration: {
    enabled: boolean;
    useSlots: boolean; // Utiliser les tranches personnalisées ou l'intervalle
    interval: number; // heures entre rappels (mode ancien)
    startTime: string; // HH:mm (mode ancien)
    endTime: string; // HH:mm (mode ancien)
    slots: {
      morning: HydrationSlot;
      afternoon: HydrationSlot;
      evening: HydrationSlot;
    };
  };
  weighing: {
    enabled: boolean;
    time: string; // HH:mm
    days: number[]; // jours de la semaine
  };
  streak: {
    enabled: boolean;
    time: string; // HH:mm - rappel si pas entraîné
  };
  sleep: {
    enabled: boolean;
    bedtimeReminder: string; // HH:mm - rappel pour aller dormir
    days: number[]; // jours de la semaine (0-6)
  };
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY = '@yoroi_notification_settings';

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  training: {
    enabled: true,
    time: '18:00',
    days: [1, 2, 3, 4, 5], // Lundi à vendredi
  },
  hydration: {
    enabled: true,
    useSlots: true, // Par défaut, utiliser les tranches personnalisées
    interval: 2,
    startTime: '08:00',
    endTime: '22:00',
    slots: {
      morning: {
        enabled: true,
        time: '09:00',
        amount: 750, // ml
      },
      afternoon: {
        enabled: true,
        time: '14:00',
        amount: 750, // ml
      },
      evening: {
        enabled: true,
        time: '19:00',
        amount: 750, // ml
      },
    },
  },
  weighing: {
    enabled: true,
    time: '07:00',
    days: [1, 3, 5], // Lundi, mercredi, vendredi
  },
  streak: {
    enabled: true,
    time: '20:00',
  },
  sleep: {
    enabled: false, // Désactivé par défaut, l'utilisateur doit l'activer
    bedtimeReminder: '22:30', // Rappel à 22h30 par défaut
    days: [0, 1, 2, 3, 4, 5, 6], // Tous les jours
  },
};

// Messages motivants
const TRAINING_MESSAGES = [
  { title: '🥋 C\'est l\'heure !', body: 'Ton entraînement t\'attend. Donne tout !' },
  { title: '⚔️ Guerrier !', body: 'Le tatami t\'appelle. Es-tu prêt ?' },
  { title: '💪 Go training !', body: 'Chaque séance compte. Fais-la maintenant !' },
  { title: '🔥 On y va ?', body: 'Ton corps est prêt. Ne le fais pas attendre !' },
  { title: '🎯 Objectif du jour', body: 'Une séance de plus vers ton but !' },
];

const HYDRATION_MESSAGES = [
  { title: '💧 Hydratation', body: 'N\'oublie pas de boire de l\'eau !' },
  { title: '🚰 Pause eau', body: 'Ton corps a besoin d\'eau. Bois un verre !' },
  { title: '💦 Rappel hydratation', body: 'Reste hydraté pour performer !' },
];

const WEIGHING_MESSAGES = [
  { title: '⚖️ Pesée du jour', body: 'Monte sur la balance pour suivre ta progression !' },
  { title: '📊 Suivi poids', body: 'Une pesée régulière = meilleur suivi !' },
];

const STREAK_MESSAGES = [
  { title: '🔥 Attention !', body: 'Tu n\'as pas encore entraîné aujourd\'hui. Ton streak est en danger !' },
  { title: '⚠️ Streak en péril', body: 'N\'oublie pas de t\'entraîner pour garder ton streak !' },
  { title: '💔 Ne casse pas ta série !', body: 'Même une séance légère compte. Go !' },
];

const SLEEP_MESSAGES = [
  { title: '🌙 Il est temps de dormir', body: 'Ton corps a besoin de repos. Direction le lit !' },
  { title: '😴 Bonne nuit !', body: 'Un bon sommeil = meilleures performances demain !' },
  { title: '💤 Heure du coucher', body: 'Éteins les écrans, ton objectif sommeil t\'attend !' },
  { title: '🛌 Repos guerrier', body: 'La récupération est essentielle. Dors bien !' },
];

// ============================================
// CONFIGURATION
// ============================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================
// SERVICE
// ============================================

class NotificationService {
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private isInitialized = false;

  // ============================================
  // INITIALISATION
  // ============================================

  async initialize(): Promise<boolean> {
    try {
      // Charger les paramètres sauvegardés
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }

      // Demander les permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Permissions notifications refusées');
        return false;
      }

      // Programmer les notifications
      if (this.settings.enabled) {
        await this.scheduleAllNotifications();
      }

      this.isInitialized = true;
      console.log('NotificationService initialisé');
      return true;
    } catch (error) {
      console.error('Erreur init notifications:', error);
      return false;
    }
  }

  // ============================================
  // PERMISSIONS
  // ============================================

  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Notifications non supportées sur simulateur');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Configuration Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'YOROI',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D4AF37',
        });
      }

      return true;
    } catch (error) {
      console.error('Erreur permissions:', error);
      return false;
    }
  }

  // ============================================
  // PROGRAMMATION
  // ============================================

  async scheduleAllNotifications(): Promise<void> {
    // Annuler toutes les notifications existantes
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!this.settings.enabled) return;

    // Programmer chaque type
    if (this.settings.training.enabled) {
      await this.scheduleTrainingNotifications();
    }
    if (this.settings.hydration.enabled) {
      await this.scheduleHydrationNotifications();
    }
    if (this.settings.weighing.enabled) {
      await this.scheduleWeighingNotifications();
    }
    if (this.settings.streak.enabled) {
      await this.scheduleStreakNotification();
    }
    if (this.settings.sleep.enabled) {
      await this.scheduleSleepNotifications();
    }

    console.log('Notifications programmées');
  }

  private async scheduleTrainingNotifications(): Promise<void> {
    const { time, days } = this.settings.training;
    const [hours, minutes] = time.split(':').map(Number);

    for (const day of days) {
      const message = TRAINING_MESSAGES[Math.floor(Math.random() * TRAINING_MESSAGES.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { type: 'training' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day === 0 ? 1 : day + 1, // Expo utilise 1-7 (dimanche = 1)
          hour: hours,
          minute: minutes,
        },
      });
    }
  }

  private async scheduleHydrationNotifications(): Promise<void> {
    const { useSlots, slots, interval, startTime, endTime } = this.settings.hydration;

    if (useSlots) {
      // Mode tranches personnalisées
      const slotsList = [
        { name: 'morning', slot: slots.morning },
        { name: 'afternoon', slot: slots.afternoon },
        { name: 'evening', slot: slots.evening },
      ];

      for (const { name, slot } of slotsList) {
        if (!slot.enabled) continue;

        const [hours, minutes] = slot.time.split(':').map(Number);
        const message = HYDRATION_MESSAGES[Math.floor(Math.random() * HYDRATION_MESSAGES.length)];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: message.title,
            body: `${message.body} (${slot.amount}ml recommandés)`,
            data: { type: 'hydration', slot: name, amount: slot.amount },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hours,
            minute: minutes,
          },
        });
      }
    } else {
      // Mode intervalle (ancien mode)
      const [startHour] = startTime.split(':').map(Number);
      const [endHour] = endTime.split(':').map(Number);

      for (let hour = startHour; hour <= endHour; hour += interval) {
        const message = HYDRATION_MESSAGES[Math.floor(Math.random() * HYDRATION_MESSAGES.length)];

        await Notifications.scheduleNotificationAsync({
          content: {
            title: message.title,
            body: message.body,
            data: { type: 'hydration' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: hour,
            minute: 0,
          },
        });
      }
    }
  }

  private async scheduleWeighingNotifications(): Promise<void> {
    const { time, days } = this.settings.weighing;
    const [hours, minutes] = time.split(':').map(Number);

    for (const day of days) {
      const message = WEIGHING_MESSAGES[Math.floor(Math.random() * WEIGHING_MESSAGES.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { type: 'weighing' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day === 0 ? 1 : day + 1,
          hour: hours,
          minute: minutes,
        },
      });
    }
  }

  private async scheduleStreakNotification(): Promise<void> {
    const { time } = this.settings.streak;
    const [hours, minutes] = time.split(':').map(Number);

    const message = STREAK_MESSAGES[Math.floor(Math.random() * STREAK_MESSAGES.length)];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        data: { type: 'streak' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });
  }

  private async scheduleSleepNotifications(): Promise<void> {
    const { bedtimeReminder, days } = this.settings.sleep;
    const [hours, minutes] = bedtimeReminder.split(':').map(Number);

    for (const day of days) {
      const message = SLEEP_MESSAGES[Math.floor(Math.random() * SLEEP_MESSAGES.length)];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { type: 'sleep' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day === 0 ? 1 : day + 1, // Expo utilise 1-7 (dimanche = 1)
          hour: hours,
          minute: minutes,
        },
      });
    }
  }

  // ============================================
  // NOTIFICATIONS INSTANTANÉES
  // ============================================

  async sendInstantNotification(title: string, body: string, data?: any): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // Immédiat
    });
  }

  async sendTrainingReminder(): Promise<void> {
    const message = TRAINING_MESSAGES[Math.floor(Math.random() * TRAINING_MESSAGES.length)];
    await this.sendInstantNotification(message.title, message.body, { type: 'training' });
  }

  async sendHydrationReminder(): Promise<void> {
    const message = HYDRATION_MESSAGES[Math.floor(Math.random() * HYDRATION_MESSAGES.length)];
    await this.sendInstantNotification(message.title, message.body, { type: 'hydration' });
  }

  async sendStreakWarning(currentStreak: number): Promise<void> {
    await this.sendInstantNotification(
      '🔥 Protège ton streak !',
      `Tu as ${currentStreak} jours consécutifs. Ne les perds pas aujourd'hui !`,
      { type: 'streak' }
    );
  }

  async sendCongratulation(message: string): Promise<void> {
    await this.sendInstantNotification('🎉 Félicitations !', message, { type: 'achievement' });
  }

  // ============================================
  // PARAMÈTRES
  // ============================================

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    
    // Reprogrammer les notifications
    await this.scheduleAllNotifications();
  }

  async enableNotifications(): Promise<void> {
    await this.updateSettings({ enabled: true });
  }

  async disableNotifications(): Promise<void> {
    await this.updateSettings({ enabled: false });
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // ============================================
  // DEBUG
  // ============================================

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

// ============================================
// INSTANCE SINGLETON
// ============================================

export const notificationService = new NotificationService();

export default notificationService;

// ============================================
// FONCTIONS D'EXPORT POUR ReminderSettings
// ============================================

export async function requestNotificationPermissions(): Promise<boolean> {
  return await notificationService.requestPermissions();
}

export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleNotifications(settings: ReminderSettings): Promise<void> {
  if (!settings.enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }

  // Annuler les notifications existantes
  await Notifications.cancelAllScheduledNotificationsAsync();

  const [hours, minutes] = settings.time.split(':').map(Number);

  for (const day of settings.days) {
    // Calculer la prochaine occurrence de ce jour
    const now = new Date();
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);

    const currentDay = now.getDay();
    let daysUntil = day - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && now > scheduledDate)) {
      daysUntil += 7;
    }

    scheduledDate.setDate(now.getDate() + daysUntil);

    // Message selon le type
    let title = '🥋 YOROI';
    let body = 'C\'est l\'heure !';

    if (settings.type === 'weight') {
      title = '⚖️ Pesée YOROI';
      body = 'Monte sur la balance pour suivre ta progression !';
    } else if (settings.type === 'workout') {
      title = '💪 Entraînement YOROI';
      body = 'C\'est l\'heure de t\'entraîner ! Le tatami t\'attend.';
    } else {
      title = '🛡️ YOROI';
      body = 'N\'oublie pas ta pesée et ton entraînement !';
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: hours,
        minute: minutes,
        repeats: true,
        weekday: day + 1, // iOS utilise 1-7 au lieu de 0-6
      } as Notifications.CalendarTriggerInput,
    });
  }
}

export async function testNotification(type: ReminderType): Promise<void> {
  let title = '🥋 YOROI Test';
  let body = 'Notification de test !';

  if (type === 'weight') {
    title = '⚖️ Pesée YOROI';
    body = 'Monte sur la balance pour suivre ta progression !';
  } else if (type === 'workout') {
    title = '💪 Entraînement YOROI';
    body = 'C\'est l\'heure de t\'entraîner ! Le tatami t\'attend.';
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    } as Notifications.TimeIntervalTriggerInput,
  });
}
