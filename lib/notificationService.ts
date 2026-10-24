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
import { calculateStreak, getWeeklyPlan, getProfile, getTrainings, getSlotOccurrences } from '@/lib/database';
import { getCurrentRank } from '@/lib/ranks';
import { getUnifiedPoints } from '@/lib/gamification';
import { getSportName } from '@/lib/sports';
import { saveNotification } from '@/lib/notificationHistoryService';
import { contenuSansSante } from '@/lib/v2/notifications/texte';
import { noter } from '@/lib/v2/notifications/mesure';
import { datesRappelSeance, messageSeance } from '@/lib/v2/notifications/discipline';
import { chargerProgrammeActif, seancesAVenir, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import { messageDuJour } from '@/lib/v2/programmes/lancer';
import { getEspace, objectifVise } from '@/lib/v2/espace';
import { traduire } from '@/lib/i18n/tr';
import { sourceNotif, src } from '@/lib/notificationLangue';

// Règle : aucune valeur de santé (poids, kcal, FC, ml, mensurations...) dans
// le titre ou le corps d'une notification, car elle s'affiche sur l'écran
// verrouillé. Garde : contenuSansSante() de lib/v2/notifications/texte.ts.

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
  { title: traduire('C’est l’heure de ta séance'), body: traduire('Ton créneau est arrivé. Même une séance courte compte.') },
  { title: traduire('Ta séance t’attend'), body: traduire('Un échauffement, et le reste suivra.') },
  { title: 'On y va ?', body: traduire('C’est le moment que tu avais prévu pour t’entraîner.') },
  { title: traduire('Ton créneau du jour'), body: traduire('Une séance de plus sur ton chemin.') },
  { title: traduire('Prêt pour ta séance ?'), body: traduire('Prends ton sac, ta séance est prévue maintenant.') },
];

const HYDRATION_MESSAGES = [
  { title: traduire('Un verre d’eau ?'), body: traduire('Une petite pause pour boire.') },
  { title: traduire('Pause eau'), body: traduire('Quelques gorgées maintenant, et ton corps te remercie.') },
  { title: traduire('Pense à boire'), body: traduire('Garde ta bouteille à portée de main.') },
];

const WEIGHING_MESSAGES = [
  { title: traduire('Ta pesée du jour'), body: traduire('Au réveil, avant le petit déjeuner : c’est le bon moment.') },
  { title: traduire('Petit passage sur la balance'), body: traduire('Une pesée régulière rend ta courbe plus juste.') },
];

const STREAK_MESSAGES = [
  { title: traduire('Ta série t’attend'), body: traduire('Pas encore de séance notée aujourd’hui. Même une séance légère compte.') },
  { title: traduire('Encore un jour à ajouter'), body: traduire('Note ta séance du jour pour prolonger ta série.') },
  { title: traduire('Il reste du temps'), body: traduire('Une séance courte suffit à garder ta série.') },
];

const SLEEP_MESSAGES = [
  { title: traduire('Bientôt l’heure de dormir'), body: traduire('Pose l’écran, ton corps récupère pendant la nuit.') },
  { title: traduire('Bonne nuit'), body: traduire('Un bon sommeil, c’est déjà une partie de l’entraînement.') },
  { title: traduire('L’heure du coucher approche'), body: traduire('Tu avais choisi cette heure pour dormir. On s’y tient ?') },
  { title: traduire('Place au repos'), body: traduire('La récupération fait partie du progrès. Dors bien.') },
];

const WEEKLY_CARD_MESSAGES = [
  { title: traduire('Ta semaine est prête'), body: traduire('Ta carte de la semaine t’attend dans YOROI.') },
  { title: traduire('Le bilan de ta semaine'), body: traduire('Un coup d’œil sur tes sept derniers jours ?') },
  { title: traduire('Semaine bouclée'), body: traduire('Ta carte de la semaine est prête, à garder ou à partager.') },
];

const MONTHLY_CARD_MESSAGES = [
  { title: traduire('Ton mois en une carte'), body: traduire('Ta carte du mois est prête dans YOROI.') },
  { title: traduire('Le bilan de ton mois'), body: traduire('Un mois de plus sur ton chemin. Viens le voir.') },
  { title: traduire('Nouveau mois'), body: traduire('Ta carte du mois dernier t’attend, à garder ou à partager.') },
];

// Salutations selon l'heure
const BRIEFING_GREETINGS = [
  traduire('Bonjour'),
  'Ohayō',
  traduire('Belle journée à toi'),
  traduire('Un nouveau jour commence'),
];

// Messages motivants du matin (UNIVERSELS)
const BRIEFING_MOTIVATIONS = [
  traduire('Un pas de plus vers ton objectif.'),
  traduire('La régularité fait la différence.'),
  traduire('Ta séance du jour t’attend.'),
  traduire('Tu construis ta forme jour après jour.'),
  traduire('Fais simple aujourd’hui, mais fais-le.'),
];

// Messages pour rappels intelligents (UNIVERSELS)
const SMART_MISSED_TRAINING_MESSAGES = [
  { title: 'C’est {day}', body: traduire('D’habitude tu t’entraînes ce jour-là. Une séance aujourd’hui ?') },
  { title: traduire('Ton jour d’entraînement'), body: traduire('Tu t’entraînes souvent le {day}. Toujours partant ?') },
  { title: traduire('Une séance ce {day} ?'), body: traduire('C’est souvent ton jour. Même une séance courte compte.') },
];

const SMART_REST_SUGGESTION_MESSAGES = [
  { title: traduire('Et si tu soufflais ?'), body: traduire('{days} jours d’entraînement d’affilée. Le repos fait aussi progresser.') },
  { title: traduire('Pense à récupérer'), body: traduire('{days} jours de suite : une journée calme peut te faire du bien.') },
  { title: traduire('Recharge les batteries'), body: traduire('Après {days} jours d’affilée, une pause aide à revenir plus fort.') },
];

const SMART_FREQUENCY_ALERT_MESSAGES = [
  { title: traduire('Une semaine plus calme'), body: traduire('Tu fais d’habitude {usual} séances par semaine, {current} cette semaine. Tout va bien ?') },
  { title: traduire('Petit coup de pouce'), body: traduire('Ton rythme a un peu baissé. Une séance courte pour reprendre ?') },
  { title: 'On reprend ?', body: traduire('Moins de séances que d’habitude cette semaine. Ton objectif t’attend.') },
];

const DAY_NAMES = [traduire('dimanche'), traduire('lundi'), traduire('mardi'), traduire('mercredi'), traduire('jeudi'), traduire('vendredi'), traduire('samedi')];

// ============================================
// ANNULATION CIBLEE
// ============================================
// Ce service n'annule jamais toutes les notifications programmees : seulement les siennes.
// Les rappels de competition, de fin d'essai, du chrono, du recap hebdo, du weight cut
// ou du sparring appartiennent a d'autres services et doivent survivre.

/** Types (data.type) des notifications programmees par ce service */
const OWN_TYPES = new Set([
  'training', 'programme_du_jour', 'hydration', 'weighing', 'streak', 'sleep',
  'social_card_weekly', 'social_card_monthly', 'briefing', 'smart_check',
]);

/** Type des rappels programmes par scheduleNotifications (ancien ecran ReminderSettings) */
const REMINDER_SETTINGS_TYPE = 'reminder_settings';

/** Titres des anciens rappels ReminderSettings, programmes sans data avant la marque */
const LEGACY_REMINDER_TITLES = new Set(['\u2696\ufe0f Pes\u00e9e YOROI', 'Pes\u00e9e YOROI', 'Entra\u00eenement YOROI', 'YOROI']);

/** Notifications d'autres services qu'on ne touche jamais, meme sans marque reconnue */
export function isProtectedNotification(n: Notifications.NotificationRequest): boolean {
  const id = String(n.identifier ?? '');
  const type = String((n.content?.data as any)?.type ?? '');
  return (
    id.startsWith('yoroi-competition-') ||
    type === 'competition' ||
    type === 'trial_reminder' ||
    type === 'timer_finished'
  );
}

/** Annule les notifications programmees qui repondent au filtre, jamais celles qui sont protegees */
async function cancelScheduledWhere(match: (n: Notifications.NotificationRequest) => boolean): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => !isProtectedNotification(n) && match(n))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
    );
  } catch (e) {
    logger.warn('Annulation ciblée des notifications impossible:', e);
  }
}

const isOwnNotification = (n: Notifications.NotificationRequest) => OWN_TYPES.has((n.content?.data as any)?.type);

const isReminderSettingsNotification = (n: Notifications.NotificationRequest) => {
  const data = n.content?.data as Record<string, unknown> | undefined;
  if (data?.type === REMINDER_SETTINGS_TYPE) return true;
  // Anciens rappels sans marque : aucune donnee et un titre de l'ancien ecran
  const empty = !data || Object.keys(data).length === 0;
  return empty && LEGACY_REMINDER_TITLES.has(String(n.content?.title ?? ''));
};

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
  /** true quand les reglages enregistres ont ete lus (ou qu'il n'y en avait aucun) */
  private settingsLoaded = false;

  /**
   * Lit les reglages enregistres sans rien programmer ni rien ecrire.
   * Indispensable avant toute modification : sans ca, un ecran qui modifie un reglage
   * avant l'initialisation du service ecrirait les valeurs par defaut par-dessus les tiennes.
   */
  async loadSettings(): Promise<NotificationSettings> {
    if (this.settingsLoaded) return { ...this.settings };
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          this.settings = { ...DEFAULT_SETTINGS, ...parsed };
        }
      }
      this.settingsLoaded = true;
    } catch (error) {
      // Lecture impossible : on ne marque pas comme lu, pour ne jamais ecraser
      logger.warn('Lecture des réglages de notifications impossible:', error);
      throw error;
    }
    return { ...this.settings };
  }

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
      this.settingsLoaded = true;

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
      const existing = await Notifications.getPermissionsAsync();
      let finalStatus = existing.status;

      // Demande faite depuis les réglages des rappels, sur une action de la personne.
      // Jamais redemandée après un refus du système (la fenêtre ne s'afficherait plus).
      if (existing.status !== 'granted' && existing.status !== 'denied' && existing.canAskAgain !== false) {
        noter('notif_permission_demandee', { ecran: 'reglages' });
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        noter(status === 'granted' ? 'notif_permission_acceptee' : 'notif_permission_refusee', { ecran: 'reglages' });
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
          lightColor: '#2C4A84',
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
    // Annuler UNIQUEMENT les notifications gérées par ce service.
    // Avant, cancelAll effaçait aussi le récap hebdo, les rappels de weight cut,
    // de sparring, de compétition, de fin d'essai et du chrono.
    await cancelScheduledWhere(isOwnNotification);

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

  /**
   * 14 octobre 2026 (rappels de discipline) : des rappels dates sur deux semaines au lieu de rappels hebdomadaires,
   * pour ne jamais rappeler une seance deja notee ni une semaine dont l'objectif est atteint
   * (lib/v2/notifications/discipline.ts, datesRappelSeance). Reprogrammes par replanifierSeances
   * au lancement, au retour dans l'app et apres chaque seance (app/_layout.tsx).
   */
  private async scheduleTrainingNotifications(): Promise<void> {
    const { time } = this.settings.training;
    // Si aucun jour configuré, utiliser lundi-vendredi par défaut
    const days = this.settings.training.days.length > 0
      ? this.settings.training.days
      : [1, 2, 3, 4, 5];
    const trainings = await getTrainings(21).catch(() => []);
    let objectif = 0;
    try {
      objectif = objectifVise(await getEspace());
    } catch {
      // sans objectif lisible : les rappels suivent seulement tes jours
    }
    const dates = datesRappelSeance({
      jours: days,
      heure: time,
      faites: (trainings ?? []).map((t: any) => String(t?.date ?? '')),
      objectifSemaine: objectif,
      now: new Date(),
    });

    // 24 octobre 2026 : avec un programme en cours, le rappel dit la seance du jour (« Aujourd'hui : Pectoraux... »).
    // Les seances deja faites n'ont pas de rappel, et la liste est reprogrammee apres chaque seance : l'ordre suit le programme.
    const actif = await chargerProgrammeActif().catch(() => null);
    const prevues = actif ? seancesAVenir(actif, dates.length) : [];

    for (const [k, date] of dates.entries()) {
      const prevue = prevues[k];
      const message = prevue && actif
        ? (() => {
            const m = messageDuJour(prevue.programme, prevue.jour, semaineDuProgramme(actif, date));
            return { title: m.titre, body: m.corps };
          })()
        : messageSeance(date);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: prevue ? { type: 'programme_du_jour', screen: 'programmes' } : { type: 'training', screen: 'add-training' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        } as Notifications.DateTriggerInput,
      });
    }
  }

  /** Reprogramme seulement les rappels de seance (jamais les autres), sans rien demander. Ne jette jamais. */
  async replanifierSeances(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await this.loadSettings();
      // les anciens rappels de l'ecran ReminderSettings (supprime) feraient doublon
      await cancelScheduledWhere(isReminderSettingsNotification);
      await cancelScheduledWhere((n) => ['training', 'programme_du_jour'].includes((n.content?.data as any)?.type));
      if (this.settings.enabled && this.settings.training.enabled) await this.scheduleTrainingNotifications();
    } catch (e) {
      logger.warn('[NotificationService] rappels de seance non reprogrammes', e);
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
            body: message.body,
            data: { type: 'hydration', screen: 'hydration', slot: name },
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
        data: { type: 'social_card_weekly', screen: 'social-share/weekly-recap-v2', autoShare: true },
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
          data: { type: 'social_card_monthly', screen: 'social-share/monthly-recap-v2', autoShare: true },
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

      // Poids : jamais de valeur ni d'écart sur l'écran verrouillé.
      // On rappelle seulement la pesée si un objectif de poids existe.
      if (profile?.target_weight) {
        parts.push(traduire('Pense à ta pesée'));
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
          parts.push(`${pendingCount > 1 ? traduire("{0} créneaux", pendingCount) : traduire('1 créneau')} : ${slotsDesc}`);
        } else {
          parts.push(traduire('Tes créneaux du jour sont faits'));
        }
      }

      // Message motivant
      const motivation = BRIEFING_MOTIVATIONS[Math.floor(Math.random() * BRIEFING_MOTIVATIONS.length)];

      // Construire le body final
      let body = parts.length > 0 ? parts.join(', ') : motivation;
      if (parts.length > 0) {
        body += `\n${motivation}`;
      }

      return contenuSansSante({
        title: `${greeting}`,
        body,
      });
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
          title: traduire('Ta journée en un coup d’œil'),
          body: traduire('Ouvre YOROI pour voir où tu en es.'),
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

    // Filet de sécurité : aucune valeur de santé sur l'écran verrouillé
    const propre = contenuSansSante({ title, body });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: propre.title,
        body: propre.body,
        data: data || {},
        sound: true,
      },
      trigger: null, // Immédiat
    });

    // Logger dans l'historique
    const notifType = data?.type || 'general';
    saveNotification(propre.title, propre.body, notifType, data).catch(() => {});
  }

  // Ces fonctions sont UNIQUEMENT pour les boutons "Tester" dans les paramètres
  async sendTrainingReminder(): Promise<void> {
    const message = TRAINING_MESSAGES[Math.floor(Math.random() * TRAINING_MESSAGES.length)];
    await this.sendInstantNotification(message.title, message.body, { type: 'training', screen: 'add-training' }, true);
  }

  async sendHydrationReminder(): Promise<void> {
    const message = HYDRATION_MESSAGES[Math.floor(Math.random() * HYDRATION_MESSAGES.length)];
    await this.sendInstantNotification(message.title, message.body, { type: 'hydration' }, true);
  }

  async sendStreakWarning(currentStreak: number): Promise<void> {
    await this.sendInstantNotification(
      traduire('Protège ton streak !'),
      traduire("Tu as {0} jours consécutifs. Ne les perds pas aujourd'hui !", currentStreak),
      { type: 'streak', ...sourceNotif(null, src("Tu as {0} jours consécutifs. Ne les perds pas aujourd'hui !", currentStreak)) },
      true
    );
  }

  async sendCongratulation(message: string): Promise<void> {
    await this.sendInstantNotification(traduire('Félicitations !'), message, { type: 'achievement', screen: 'gamification' }, true);
  }

  async sendWeeklyCardReminder(): Promise<void> {
    const message = WEEKLY_CARD_MESSAGES[Math.floor(Math.random() * WEEKLY_CARD_MESSAGES.length)];
    await this.sendInstantNotification(message.title, message.body, { type: 'social_card_weekly', screen: 'social-share/weekly-recap-v2', autoShare: true }, true);
  }

  async sendMonthlyCardReminder(): Promise<void> {
    const message = MONTHLY_CARD_MESSAGES[Math.floor(Math.random() * MONTHLY_CARD_MESSAGES.length)];
    await this.sendInstantNotification(message.title, message.body, { type: 'social_card_monthly', screen: 'social-share/monthly-recap-v2', autoShare: true }, true);
  }

  async sendBriefing(): Promise<void> {
    const content = await this.generateBriefingContent();
    await this.sendInstantNotification(content.title, content.body, { type: 'briefing', screen: 'home' }, true);
  }

  /**
   * Notification apres fin de séance - propose de partager sur les reseaux
   */
  async sendWorkoutCompletedNotification(sport: string, _durationMin: number, _calories?: number, workoutId?: number): Promise<void> {
    const messages = [
      // Aucune durée ni calorie : seulement le sport et un encouragement
      { title: traduire('Séance notée'), body: traduire("{0} : c’est fait. Ta carte de séance est prête si tu veux la partager.", sport) },
      { title: 'Beau travail', body: traduire("Ta séance de {0} est dans ton carnet.", sport) },
      { title: traduire("{0}, c’est fait", sport), body: traduire('Bel effort. Ta carte de séance t’attend.') },
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    await this.sendInstantNotification(
      msg.title,
      msg.body,
      {
        type: 'workout_completed',
        screen: 'social-share/last-session',
        ...(workoutId ? { workoutId: workoutId.toString() } : {}),
      },
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
      testMessage = traduire("Jours habituels: {0}", usualDayNames);
      testType = 'patterns';
    }

    if (patterns.consecutiveDays >= 3) {
      testMessage += traduire("\n{0} jours d'entraînement consécutifs", patterns.consecutiveDays);
      testType = 'rest';
    }

    if (patterns.avgFrequency > 0) {
      testMessage += traduire("\nMoyenne: {0} séances/sem", patterns.avgFrequency);
      testMessage += traduire("\nCette semaine: {0} séance(s)", patterns.currentWeekCount);
    }

    if (!testMessage) {
      testMessage = traduire('Pas assez de données pour analyser tes habitudes. Continue à t\'entraîner !');
    }

    await this.sendInstantNotification(
      traduire('Analyse de tes habitudes'),
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
    // Toujours partir des reglages enregistres, jamais des valeurs par defaut en memoire
    await this.loadSettings();
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
    await cancelScheduledWhere((n) => isOwnNotification(n) || isReminderSettingsNotification(n));
  }

  // ============================================
  // DEBUG
  // ============================================

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /** Annule toutes les notifications de ce service (jamais celles des competitions, de l'essai ou du chrono) */
  async cancelAll(): Promise<void> {
    await cancelScheduledWhere((n) => isOwnNotification(n) || isReminderSettingsNotification(n));
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

/** Annule les anciens rappels de l'ecran ReminderSettings (supprime) : sans ecran pour les regler, ils feraient doublon */
export async function cancelLegacyReminderSettings(): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelScheduledWhere(isReminderSettingsNotification);
}

export async function scheduleNotifications(settings: ReminderSettings): Promise<void> {
  // Annuler seulement les rappels de cet ecran (marques, ou anciens sans marque)
  await cancelScheduledWhere(isReminderSettingsNotification);
  if (!settings.enabled) return;

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
    let body = traduire('C\'est l\'heure !');

    if (settings.type === 'weight') {
      title = traduire('Pesée YOROI');
      body = traduire('Monte sur la balance pour suivre ta progression !');
    } else if (settings.type === 'workout') {
      title = traduire('Entraînement YOROI');
      body = traduire('C\'est l\'heure de t\'entraîner ! Bouge ton corps.');
    } else {
      title = 'YOROI';
      body = traduire('N\'oublie pas ta pesée et ton entraînement !');
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: REMINDER_SETTINGS_TYPE, source: 'notificationService' },
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
  let body = traduire('Notification de test !');

  if (type === 'weight') {
    title = traduire('Pesée YOROI');
    body = traduire('Monte sur la balance pour suivre ta progression !');
  } else if (type === 'workout') {
    title = traduire('Entraînement YOROI');
    body = traduire('C\'est l\'heure de t\'entraîner ! Bouge ton corps.');
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
