// ============================================
// YOROI - SERVICE DE NOTIFICATIONS
// ============================================
// Rappels d'entraînement, hydratation, pesée
// ============================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import { calculateStreak, getLatestWeight, getWeeklyPlan, getProfile, getTrainings, getSlotOccurrences } from '@/lib/database';
import { getCurrentRank } from '@/lib/ranks';
import { getUnifiedPoints } from '@/lib/gamification';
import { getSportName } from '@/lib/sports';
import { saveNotification } from '@/lib/notificationHistoryService';

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
  socialCards: {
    enabled: boolean;
    weeklyTime: string; // HH:mm - rappel chaque dimanche
    monthlyTime: string; // HH:mm - rappel chaque 1er du mois
  };
  briefing: {
    enabled: boolean;
    time: string; // HH:mm - heure du briefing matinal
    days: number[]; // jours de la semaine (0-6)
  };
  smartReminders: {
    enabled: boolean;
    missedTrainingAlert: boolean; // Alerte si jour habituel sans entraînement
    restDaySuggestion: boolean; // Suggérer repos après plusieurs jours consécutifs
    frequencyAlert: boolean; // Alerte si fréquence en baisse
    checkTime: string; // HH:mm - heure de vérification (soir)
  };
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY = '@yoroi_notification_settings';

// ═══════════════════════════════════════════════════════════
// TOUT EST DÉSACTIVÉ PAR DÉFAUT - SAUF LES CITATIONS
// Seul le service citationNotificationService gère les citations
// ═══════════════════════════════════════════════════════════
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true, // ON par defaut (cartes sociales actives)
  training: {
    enabled: false, // OFF
    time: '18:00',
    days: [],
  },
  hydration: {
    enabled: false, // OFF - AUCUNE notification hydratation
    useSlots: false,
    interval: 24, // Une seule par jour max si jamais activé
    startTime: '08:00',
    endTime: '08:00',
    slots: {
      morning: { enabled: false, time: '09:00', amount: 750 },
      afternoon: { enabled: false, time: '14:00', amount: 750 },
      evening: { enabled: false, time: '19:00', amount: 750 },
    },
  },
  weighing: {
    enabled: false, // OFF
    time: '07:00',
    days: [],
  },
  streak: {
    enabled: false, // OFF - AUCUNE notification "ne casse pas ta série"
    time: '20:00',
  },
  sleep: {
    enabled: false, // OFF
    bedtimeReminder: '22:30',
    days: [],
  },
  socialCards: {
    enabled: true, // ON - carte hebdo le vendredi a 19h
    weeklyTime: '19:00',
    monthlyTime: '10:00',
  },
  briefing: {
    enabled: false, // OFF
    time: '07:30',
    days: [],
  },
  smartReminders: {
    enabled: false, // OFF - AUCUNE analyse des habitudes
    missedTrainingAlert: false,
    restDaySuggestion: false,
    frequencyAlert: false,
    checkTime: '19:00',
  },
};

// Messages motivants (UNIVERSELS - pas spécifiques aux sports de combat)
const TRAINING_MESSAGES = [
  { title: 'C\'est l\'heure !', body: 'Ton entraînement t\'attend. Donne tout !' },
  { title: 'C\'est parti !', body: 'Bouge ton corps. Vas-y !' },
  { title: 'Entraînement !', body: 'Chaque séance compte. Fais-la maintenant !' },
  { title: 'On y va ?', body: 'Ton corps est prêt. Ne le fais pas attendre !' },
  { title: 'Objectif du jour', body: 'Une séance de plus vers ton but !' },
];

const HYDRATION_MESSAGES = [
  { title: 'Hydratation', body: 'N\'oublie pas de boire de l\'eau !' },
  { title: 'Pause eau', body: 'Ton corps a besoin d\'eau. Bois un verre !' },
  { title: 'Rappel hydratation', body: 'Reste hydraté pour performer !' },
];

const WEIGHING_MESSAGES = [
  { title: 'Pesée du jour', body: 'Monte sur la balance pour suivre ta progression !' },
  { title: 'Suivi poids', body: 'Une pesée régulière = meilleur suivi !' },
];

const STREAK_MESSAGES = [
  { title: 'Attention !', body: 'Tu n\'as pas encore entraîné aujourd\'hui. Ton streak est en danger !' },
  { title: 'Streak en péril', body: 'N\'oublie pas de t\'entraîner pour garder ton streak !' },
  { title: 'Ne casse pas ta série !', body: 'Même une séance légère compte. Go !' },
];

const SLEEP_MESSAGES = [
  { title: 'Il est temps de dormir', body: 'Ton corps a besoin de repos. Direction le lit !' },
  { title: 'Bonne nuit !', body: 'Un bon sommeil = meilleures performances demain !' },
  { title: 'Heure du coucher', body: 'Éteins les écrans, ton objectif sommeil t\'attend !' },
  { title: 'Repos bien mérité', body: 'La récupération est essentielle. Dors bien !' },
];

const WEEKLY_CARD_MESSAGES = [
  { title: 'Ta semaine en image !', body: 'Ta carte hebdo est prête. Partage tes progrès sur les réseaux !' },
  { title: 'Bilan de la semaine', body: 'Montre ta progression ! Ta carte sociale t\'attend.' },
  { title: 'Semaine terminée !', body: 'Partage ta carte de la semaine et inspire les autres !' },
  { title: 'Stats de la semaine', body: 'Ta carte est prête à être partagée. Fais voir tes résultats !' },
];

const MONTHLY_CARD_MESSAGES = [
  { title: 'Nouveau mois, nouvelle carte !', body: 'Ta carte du mois est disponible. Partage ta progression !' },
  { title: 'Bilan mensuel', body: 'Un mois de plus dans ta transformation ! Partage ta carte.' },
  { title: 'Carte du mois prête !', body: 'Montre à tous tes progrès du mois dernier !' },
  { title: 'Résumé mensuel', body: 'Ta carte mensuelle t\'attend. Partage-la sur tes réseaux !' },
];

// Salutations selon l'heure
const BRIEFING_GREETINGS = [
  'Ohayo !',
  'Bonjour Athlète !',
  'Salut !',
  'Réveil de warrior !',
  'Hajime !',
];

// Messages motivants du matin (UNIVERSELS)
const BRIEFING_MOTIVATIONS = [
  'Chaque jour est une nouvelle victoire.',
  'La discipline fait la différence.',
  'Un pas de plus vers ton objectif.',
  'Ton entraînement t\'attend.',
  'Aujourd\'hui tu deviens plus fort·e.',
  'Le chemin continue.',
  'Ta transformation se construit jour après jour.',
];

// Messages pour rappels intelligents (UNIVERSELS)
const SMART_MISSED_TRAINING_MESSAGES = [
  { title: 'Jour d\'entraînement habituel', body: 'Tu t\'entraînes souvent le {day}. Pas de session aujourd\'hui ?' },
  { title: 'C\'est {day} !', body: 'D\'habitude tu t\'entraînes ce jour-là. On y va ?' },
  { title: '{day} = Entraînement ?', body: 'Ton corps s\'attend à bouger. Ne le déçois pas !' },
];

const SMART_REST_SUGGESTION_MESSAGES = [
  { title: 'Repos mérité ?', body: 'Tu t\'es entraîné {days} jours d\'affilée. Le repos fait partie du progrès !' },
  { title: 'Récupération', body: '{days} jours consécutifs d\'entraînement ! Pense à récupérer.' },
  { title: 'Recharge tes batteries', body: 'Après {days} jours, une pause peut booster tes performances.' },
];

const SMART_FREQUENCY_ALERT_MESSAGES = [
  { title: 'Rythme en baisse', body: 'Tu faisais {usual} séances/semaine, seulement {current} cette semaine. Besoin de motivation ?' },
  { title: 'Rappel amical', body: 'Ta fréquence d\'entraînement a diminué. Tout va bien ?' },
  { title: 'On en parle ?', body: 'Moins actif que d\'habitude. N\'oublie pas tes objectifs !' },
];

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

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
      // Charger les settings sauvegardés ou utiliser les défauts (tout OFF)
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          this.settings = { ...DEFAULT_SETTINGS, ...parsed };
        } else {
          this.settings = { ...DEFAULT_SETTINGS };
        }
      } else {
        this.settings = { ...DEFAULT_SETTINGS };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      }

      // Reprogrammer les notifications selon les settings sauvegardés
      await this.scheduleAllNotifications();

      this.isInitialized = true;
      logger.info('[NotificationService] Initialisé avec settings sauvegardés');
      return true;
    } catch (error) {
      logger.error('Erreur init notifications:', error);
      return false;
    }
  }

  // ============================================
  // PERMISSIONS
  // ============================================

  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      logger.info('Notifications non supportées sur simulateur');
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
      logger.error('Erreur permissions:', error);
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
    if (this.settings.socialCards?.enabled) {
      await this.scheduleSocialCardsNotifications();
    }
    if (this.settings.briefing?.enabled) {
      await this.scheduleBriefingNotifications();
    }
    if (this.settings.smartReminders?.enabled) {
      await this.scheduleSmartRemindersCheck();
    }

    logger.info('Notifications programmées');
  }

  private async scheduleTrainingNotifications(): Promise<void> {
    const { time } = this.settings.training;
    // Si aucun jour configuré, utiliser lundi-vendredi par défaut
    const days = this.settings.training.days.length > 0
      ? this.settings.training.days
      : [1, 2, 3, 4, 5];
    const [hours, minutes] = time.split(':').map(Number);

    for (const day of days) {
      const message = TRAINING_MESSAGES[Math.floor(Math.random() * TRAINING_MESSAGES.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { type: 'training', screen: 'add-training' },
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
            data: { type: 'hydration', screen: 'hydration', slot: name, amount: slot.amount },
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
            data: { type: 'hydration', screen: 'hydration' },
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
    const { time } = this.settings.weighing;
    // Si aucun jour configuré, peser le matin en semaine par défaut
    const days = this.settings.weighing.days.length > 0
      ? this.settings.weighing.days
      : [1, 2, 3, 4, 5];
    const [hours, minutes] = time.split(':').map(Number);

    for (const day of days) {
      const message = WEIGHING_MESSAGES[Math.floor(Math.random() * WEIGHING_MESSAGES.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { type: 'weighing', screen: 'body-composition' },
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
        data: { type: 'streak', screen: 'add-training' },
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
    const { bedtimeReminder } = this.settings.sleep;
    // Si aucun jour configuré, utiliser tous les jours par défaut
    const days = this.settings.sleep.days.length > 0
      ? this.settings.sleep.days
      : [0, 1, 2, 3, 4, 5, 6];
    const [hours, minutes] = bedtimeReminder.split(':').map(Number);

    for (const day of days) {
      const message = SLEEP_MESSAGES[Math.floor(Math.random() * SLEEP_MESSAGES.length)];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: { type: 'sleep', screen: 'sleep' },
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

  private async scheduleSocialCardsNotifications(): Promise<void> {
    const { weeklyTime, monthlyTime } = this.settings.socialCards || { weeklyTime: '10:00', monthlyTime: '10:00' };

    // Notification hebdomadaire (chaque vendredi)
    const [weeklyHours, weeklyMinutes] = weeklyTime.split(':').map(Number);
    const weeklyMessage = WEEKLY_CARD_MESSAGES[Math.floor(Math.random() * WEEKLY_CARD_MESSAGES.length)];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: weeklyMessage.title,
        body: weeklyMessage.body,
        data: { type: 'social_card_weekly', screen: 'share-hub' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 6, // Vendredi = 6 dans Expo (1=dim, 2=lun, ..., 6=ven)
        hour: weeklyHours,
        minute: weeklyMinutes,
      },
    });

    // Notification mensuelle (chaque 1er du mois)
    // On programme pour les 12 prochains mois
    const [monthlyHours, monthlyMinutes] = monthlyTime.split(':').map(Number);
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1, monthlyHours, monthlyMinutes, 0);

      // Si la date est dans le passé (pour le mois actuel), passer au suivant
      if (targetDate <= now) continue;

      const monthlyMessage = MONTHLY_CARD_MESSAGES[Math.floor(Math.random() * MONTHLY_CARD_MESSAGES.length)];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: monthlyMessage.title,
          body: monthlyMessage.body,
          data: { type: 'social_card_monthly', screen: 'share-hub' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: targetDate,
        } as Notifications.DateTriggerInput,
      });
    }
  }

  private async scheduleBriefingNotifications(): Promise<void> {
    const briefing = this.settings.briefing || { time: '07:30', days: [0, 1, 2, 3, 4, 5, 6] };
    const { time } = briefing;
    // Si aucun jour configuré, envoyer tous les jours par défaut
    const days = (briefing.days?.length ?? 0) > 0
      ? briefing.days
      : [0, 1, 2, 3, 4, 5, 6];
    const [hours, minutes] = time.split(':').map(Number);

    // Générer le contenu UNE SEULE FOIS (pas 7 fois) pour éviter 7 accès DB
    const briefingContent = await this.generateBriefingContent();

    for (const day of days) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: briefingContent.title,
          body: briefingContent.body,
          data: { type: 'briefing', screen: 'home' },
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

  /**
   * Génère le contenu personnalisé du briefing matinal
   */
  private async generateBriefingContent(): Promise<{ title: string; body: string }> {
    try {
      // Récupérer les données utilisateur
      const streak = await calculateStreak();
      const latestWeight = await getLatestWeight();
      const profile = await getProfile();
      const weeklyPlan = await getWeeklyPlan();
      const totalPoints = await getUnifiedPoints();
      const rank = getCurrentRank(totalPoints);

      // Jour actuel: JS getDay() retourne 0=dimanche, weekly_plan utilise 0=lundi
      const jsDay = new Date().getDay();
      const planDay = jsDay === 0 ? 6 : jsDay - 1;
      const todayPlan = weeklyPlan?.filter(p => p.day_of_week === planDay) || [];

      // Salutation aléatoire
      const greeting = BRIEFING_GREETINGS[Math.floor(Math.random() * BRIEFING_GREETINGS.length)];

      // Construire le corps du message
      const parts: string[] = [];

      // Streak
      if (streak > 0) {
        parts.push(`${streak}j streak`);
      }

      // Rang
      if (rank) {
        parts.push(`${rank.name}`);
      }

      // Poids et objectif
      const currentWeight = latestWeight?.weight;
      const targetWeight = profile?.target_weight;
      if (currentWeight && targetWeight) {
        const diff = Math.abs(currentWeight - targetWeight);
        if (diff < 0.5) {
          parts.push(`⚖️ Objectif atteint !`);
        } else if (currentWeight > targetWeight) {
          parts.push(`⚖️ -${diff.toFixed(1)}kg`);
        } else {
          parts.push(`⚖️ +${diff.toFixed(1)}kg`);
        }
      } else if (currentWeight) {
        parts.push(`⚖️ ${currentWeight.toFixed(1)}kg`);
      }

      // Creneaux prevus aujourd'hui (avec details)
      const activeSlots = todayPlan.filter(p => !p.is_rest_day);
      if (activeSlots.length > 0) {
        // Verifier combien sont deja valides cette semaine
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diff);
        const weekStart = monday.toISOString().split('T')[0];

        let pendingCount = activeSlots.length;
        try {
          const occurrences = await getSlotOccurrences(weekStart);
          const todayOccs = occurrences.filter(o =>
            activeSlots.some(s => s.id === o.weekly_plan_id)
          );
          pendingCount = activeSlots.length - todayOccs.filter(o => o.status === 'validated').length;
        } catch {}

        const slotsDesc = activeSlots
          .map(p => `${getSportName(p.sport)}${p.time ? ` ${p.time}` : ''}`)
          .join(', ');

        if (pendingCount > 0) {
          parts.push(`${pendingCount} creneau(x) : ${slotsDesc}`);
        } else {
          parts.push(`Creneaux valides !`);
        }
      }

      // Message motivant
      const motivation = BRIEFING_MOTIVATIONS[Math.floor(Math.random() * BRIEFING_MOTIVATIONS.length)];

      // Construire le body final
      let body = parts.length > 0 ? parts.join(' • ') : motivation;
      if (parts.length > 0) {
        body += `\n${motivation}`;
      }

      return {
        title: `${greeting}`,
        body,
      };
    } catch (error) {
      logger.error('[NotificationService] Erreur génération briefing:', error);
      // Fallback en cas d'erreur
      const greeting = BRIEFING_GREETINGS[Math.floor(Math.random() * BRIEFING_GREETINGS.length)];
      const motivation = BRIEFING_MOTIVATIONS[Math.floor(Math.random() * BRIEFING_MOTIVATIONS.length)];
      return {
        title: `${greeting}`,
        body: motivation,
      };
    }
  }

  /**
   * Programme la vérification quotidienne des rappels intelligents
   */
  private async scheduleSmartRemindersCheck(): Promise<void> {
    const { checkTime } = this.settings.smartReminders || { checkTime: '19:00' };
    const [hours, minutes] = checkTime.split(':').map(Number);

    // Programmer une vérification quotidienne
    for (let day = 0; day < 7; day++) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Vérification intelligente',
          body: 'Analyse de tes habitudes...',
          data: { type: 'smart_check', silent: true },
          sound: false, // Silencieux - déclenchera une analyse
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

  /**
   * Analyse les habitudes d'entraînement de l'utilisateur
   */
  async analyzeTrainingPatterns(): Promise<{
    usualDays: number[]; // Jours habituels (0-6)
    avgFrequency: number; // Séances par semaine en moyenne
    consecutiveDays: number; // Jours consécutifs d'entraînement actuels
    currentWeekCount: number; // Nombre de séances cette semaine
    trainedToday: boolean; // S'est entraîné aujourd'hui
  }> {
    try {
      const trainings = await getTrainings(60); // 60 derniers jours

      if (!trainings || trainings.length === 0) {
        return {
          usualDays: [],
          avgFrequency: 0,
          consecutiveDays: 0,
          currentWeekCount: 0,
          trainedToday: false,
        };
      }

      // Compter les entraînements par jour de la semaine
      const dayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      let trainedToday = false;

      // Calculer le début de la semaine actuelle (lundi)
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lundi = 0
      startOfWeek.setDate(today.getDate() - diff);
      startOfWeek.setHours(0, 0, 0, 0);

      let currentWeekCount = 0;

      for (const training of trainings) {
        const trainingDate = new Date(training.date);
        const dayOfWeek = trainingDate.getDay();
        dayCount[dayOfWeek]++;

        // Vérifier si entraînement aujourd'hui
        if (training.date === todayStr) {
          trainedToday = true;
        }

        // Compter les entraînements de la semaine en cours
        if (trainingDate >= startOfWeek) {
          currentWeekCount++;
        }
      }

      // Déterminer les jours habituels (plus de 30% des semaines)
      const weeksAnalyzed = 60 / 7;
      const threshold = weeksAnalyzed * 0.3; // 30% des semaines
      const usualDays = Object.entries(dayCount)
        .filter(([, count]) => count >= threshold)
        .map(([day]) => parseInt(day))
        .sort((a, b) => a - b);

      // Calculer la fréquence moyenne
      const totalTrainings = trainings.length;
      const avgFrequency = Math.round((totalTrainings / 60) * 7 * 10) / 10; // Arrondi à 1 décimale

      // Calculer les jours consécutifs d'entraînement
      let consecutiveDays = 0;
      const sortedDates = [...new Set(trainings.map(t => t.date))].sort().reverse();

      for (let i = 0; i < sortedDates.length; i++) {
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        const expectedStr = expectedDate.toISOString().split('T')[0];

        if (sortedDates.includes(expectedStr)) {
          consecutiveDays++;
        } else {
          break;
        }
      }

      return {
        usualDays,
        avgFrequency,
        consecutiveDays,
        currentWeekCount,
        trainedToday,
      };
    } catch (error) {
      logger.error('[NotificationService] Erreur analyse patterns:', error);
      return {
        usualDays: [],
        avgFrequency: 0,
        consecutiveDays: 0,
        currentWeekCount: 0,
        trainedToday: false,
      };
    }
  }

  /**
   * Vérifie et envoie les rappels intelligents appropriés
   */
  async checkAndSendSmartReminders(): Promise<void> {
    if (!this.settings.smartReminders?.enabled) return;

    try {
      const patterns = await this.analyzeTrainingPatterns();
      const today = new Date().getDay();
      const { missedTrainingAlert, restDaySuggestion, frequencyAlert } = this.settings.smartReminders;

      // 1. Alerte jour habituel manqué
      if (missedTrainingAlert && patterns.usualDays.includes(today) && !patterns.trainedToday) {
        const message = SMART_MISSED_TRAINING_MESSAGES[
          Math.floor(Math.random() * SMART_MISSED_TRAINING_MESSAGES.length)
        ];
        const dayName = DAY_NAMES[today];
        await this.sendInstantNotification(
          message.title.replace('{day}', dayName),
          message.body.replace('{day}', dayName),
          { type: 'smart_missed', screen: 'add-training' }
        );
        return; // Une seule notification par jour
      }

      // 2. Suggestion de repos (après 4+ jours consécutifs)
      if (restDaySuggestion && patterns.consecutiveDays >= 4) {
        const message = SMART_REST_SUGGESTION_MESSAGES[
          Math.floor(Math.random() * SMART_REST_SUGGESTION_MESSAGES.length)
        ];
        await this.sendInstantNotification(
          message.title.replace('{days}', patterns.consecutiveDays.toString()),
          message.body.replace('{days}', patterns.consecutiveDays.toString()),
          { type: 'smart_rest', screen: 'history' }
        );
        return;
      }

      // 3. Alerte fréquence en baisse (dimanche soir uniquement)
      if (frequencyAlert && today === 0 && patterns.avgFrequency > 0) {
        const expectedThisWeek = Math.round(patterns.avgFrequency);
        if (patterns.currentWeekCount < expectedThisWeek - 1) {
          const message = SMART_FREQUENCY_ALERT_MESSAGES[
            Math.floor(Math.random() * SMART_FREQUENCY_ALERT_MESSAGES.length)
          ];
          await this.sendInstantNotification(
            message.title
              .replace('{usual}', expectedThisWeek.toString())
              .replace('{current}', patterns.currentWeekCount.toString()),
            message.body
              .replace('{usual}', expectedThisWeek.toString())
              .replace('{current}', patterns.currentWeekCount.toString()),
            { type: 'smart_frequency', screen: 'add-training' }
          );
        }
      }
    } catch (error) {
      logger.error('[NotificationService] Erreur rappels intelligents:', error);
    }
  }

  // ============================================
  // NOTIFICATIONS INSTANTANÉES
  // Ces fonctions sont utilisées UNIQUEMENT pour les tests dans les paramètres
  // Elles ne s'envoient JAMAIS automatiquement
  // ============================================

  /**
   * Envoie une notification immédiate - USAGE INTERNE/TEST UNIQUEMENT
   * @param isTest - Si true, envoie même si désactivé (pour les tests utilisateur)
   */
  async sendInstantNotification(title: string, body: string, data?: any, isTest: boolean = false): Promise<void> {
    // Ne pas envoyer si les notifications sont désactivées (sauf pour les tests)
    if (!isTest && !this.settings.enabled) {
      logger.info('[NotificationService] Notification bloquée (désactivé)');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // Immédiat
    });

    // Logger dans l'historique
    const notifType = data?.type || 'general';
    saveNotification(title, body, notifType, data).catch(() => {});
  }

  // Ces fonctions sont UNIQUEMENT pour les boutons "Tester" dans les paramètres
  async sendTrainingReminder(): Promise<void> {
    const message = TRAINING_MESSAGES[Math.floor(Math.random() * TRAINING_MESSAGES.length)];
    await this.sendInstantNotification(message.title, message.body, { type: 'training' }, true);
  }

  async sendHydrationReminder(): Promise<void> {
    const message = HYDRATION_MESSAGES[Math.floor(Math.random() * HYDRATION_MESSAGES.length)];
    await this.sendInstantNotification(message.title, message.body, { type: 'hydration' }, true);
  }

  async sendStreakWarning(currentStreak: number): Promise<void> {
    await this.sendInstantNotification(
      'Protège ton streak !',
      `Tu as ${currentStreak} jours consécutifs. Ne les perds pas aujourd'hui !`,
      { type: 'streak' },
      true
    );
  }

  async sendCongratulation(message: string): Promise<void> {
    await this.sendInstantNotification('Félicitations !', message, { type: 'achievement', screen: 'gamification' }, true);
  }

  async sendWeeklyCardReminder(): Promise<void> {
    const message = WEEKLY_CARD_MESSAGES[Math.floor(Math.random() * WEEKLY_CARD_MESSAGES.length)];
    await this.sendInstantNotification(message.title, message.body, { type: 'social_card_weekly', screen: 'share-hub' }, true);
  }

  async sendMonthlyCardReminder(): Promise<void> {
    const message = MONTHLY_CARD_MESSAGES[Math.floor(Math.random() * MONTHLY_CARD_MESSAGES.length)];
    await this.sendInstantNotification(message.title, message.body, { type: 'social_card_monthly', screen: 'share-hub' }, true);
  }

  async sendBriefing(): Promise<void> {
    const content = await this.generateBriefingContent();
    await this.sendInstantNotification(content.title, content.body, { type: 'briefing', screen: 'home' }, true);
  }

  /**
   * Notification apres fin de séance - propose de partager sur les reseaux
   */
  async sendWorkoutCompletedNotification(sport: string, durationMin: number, calories?: number): Promise<void> {
    const messages = [
      { title: 'Séance terminee !', body: `${sport} - ${durationMin} min${calories ? ` - ${calories} kcal` : ''}. Partage ta perf !` },
      { title: 'Bravo, guerrier !', body: `${sport} dans la poche. Montre ca a tes followers !` },
      { title: `${sport} termine !`, body: `${durationMin} min d'effort. Cree ta carte de partage !` },
      { title: 'Warrior mode', body: `Tu viens de finir ${durationMin} min de ${sport}. Partage le sur tes reseaux !` },
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    await this.sendInstantNotification(
      msg.title,
      msg.body,
      { type: 'workout_completed', screen: 'social-share/last-session' },
      true,
    );
  }

  async sendSmartReminderTest(): Promise<{ type: string; message: string }> {
    const patterns = await this.analyzeTrainingPatterns();
    const today = new Date().getDay();
    const dayName = DAY_NAMES[today];

    // Générer un message de test basé sur les vraies données
    let testType = '';
    let testMessage = '';

    if (patterns.usualDays.length > 0) {
      const usualDayNames = patterns.usualDays.map(d => DAY_NAMES[d]).join(', ');
      testMessage = `Jours habituels: ${usualDayNames}`;
      testType = 'patterns';
    }

    if (patterns.consecutiveDays >= 3) {
      testMessage += `\n${patterns.consecutiveDays} jours d'entraînement consécutifs`;
      testType = 'rest';
    }

    if (patterns.avgFrequency > 0) {
      testMessage += `\nMoyenne: ${patterns.avgFrequency} séances/sem`;
      testMessage += `\nCette semaine: ${patterns.currentWeekCount} séance(s)`;
    }

    if (!testMessage) {
      testMessage = 'Pas assez de données pour analyser tes habitudes. Continue à t\'entraîner !';
    }

    await this.sendInstantNotification(
      'Analyse de tes habitudes',
      testMessage,
      { type: 'smart_test' }
    );

    return { type: testType, message: testMessage };
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
    let title = 'YOROI';
    let body = 'C\'est l\'heure !';

    if (settings.type === 'weight') {
      title = '⚖️ Pesée YOROI';
      body = 'Monte sur la balance pour suivre ta progression !';
    } else if (settings.type === 'workout') {
      title = 'Entraînement YOROI';
      body = 'C\'est l\'heure de t\'entraîner ! Bouge ton corps.';
    } else {
      title = 'YOROI';
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
  let title = 'YOROI Test';
  let body = 'Notification de test !';

  if (type === 'weight') {
    title = '⚖️ Pesée YOROI';
    body = 'Monte sur la balance pour suivre ta progression !';
  } else if (type === 'workout') {
    title = 'Entraînement YOROI';
    body = 'C\'est l\'heure de t\'entraîner ! Bouge ton corps.';
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
