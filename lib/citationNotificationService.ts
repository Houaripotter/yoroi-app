// ============================================
// YOROI - SERVICE NOTIFICATIONS DE CITATIONS
// ============================================
// Notifications locales pour envoyer des citations motivantes
// 100% Offline - Utilise expo-notifications

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getRandomQuote,
  getCitationStyle,
  getCitationNotifSettings,
  CitationNotifSettings,
  SupportedLanguage,
} from './citations';
import logger from './security/logger';

const LANGUAGE_KEY = '@yoroi_language';

/**
 * Get current language from AsyncStorage
 */
const getCurrentLanguage = async (): Promise<SupportedLanguage> => {
  try {
    const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
    return (lang as SupportedLanguage) || 'fr';
  } catch {
    return 'fr';
  }
};

// ═══════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════

// Configurer le handler de notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Identifiant du canal de notification (Android)
const CITATION_CHANNEL_ID = 'yoroi-citations';

// Clé pour stocker l'état des notifications planifiées
const SCHEDULED_NOTIFS_KEY = '@yoroi_scheduled_citation_notifs';

// ═══════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════

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
      logger.warn('[CitationNotif] Permission refusée');
      return false;
    }

    // Créer le canal de notification pour Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CITATION_CHANNEL_ID, {
        name: 'Citations Motivantes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD700',
        description: 'Notifications de citations motivantes quotidiennes',
      });
    }

    return true;
  } catch (error) {
    logger.error('[CitationNotif] Erreur permissions:', error);
    return false;
  }
};

// ═══════════════════════════════════════════════
// PLANIFICATION DES NOTIFICATIONS
// ═══════════════════════════════════════════════

/**
 * Heures de notification selon la fréquence
 * Réparties intelligemment sur la journée
 * MAX 3 citations par jour pour ne pas spammer
 */
const getNotificationHours = (frequency: number): number[] => {
  switch (frequency) {
    case 1:
      return [8]; // 8h00 (matin)
    case 2:
      return [8, 19]; // 8h00 (matin) et 19h00 (soir)
    case 3:
      return [8, 13, 19]; // 8h00 (matin), 13h00 (midi) et 19h00 (soir)
    // SUPPRESSION de 4 et 5 - trop de notifications!
    default:
      return [8]; // Par défaut: 1 fois par jour
  }
};

/**
 * Annule toutes les notifications de citations planifiées
 */
export const cancelAllCitationNotifications = async (): Promise<void> => {
  try {
    // Récupérer les IDs des notifications planifiées
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFS_KEY);
    if (stored) {
      const notifIds: string[] = JSON.parse(stored);
      for (const id of notifIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }

    // Vider la liste
    await AsyncStorage.removeItem(SCHEDULED_NOTIFS_KEY);
    logger.info('[CitationNotif] Notifications annulées');
  } catch (error) {
    logger.error('[CitationNotif] Erreur annulation:', error);
  }
};

/**
 * Planifie les notifications de citations pour les 7 prochains jours
 */
export const scheduleCitationNotifications = async (): Promise<boolean> => {
  try {
    // Vérifier les permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    // Récupérer les paramètres
    const settings = await getCitationNotifSettings();
    if (!settings.enabled) {
      await cancelAllCitationNotifications();
      return false;
    }

    // Annuler les anciennes notifications
    await cancelAllCitationNotifications();

    const style = await getCitationStyle();
    const language = await getCurrentLanguage();
    const hours = getNotificationHours(settings.frequency);
    const scheduledIds: string[] = [];

    // Planifier pour les 7 prochains jours
    for (let day = 0; day < 7; day++) {
      for (const hour of hours) {
        const triggerDate = new Date();
        triggerDate.setDate(triggerDate.getDate() + day);
        triggerDate.setHours(hour, 0, 0, 0);

        // Ne pas planifier pour le passé
        if (triggerDate <= new Date()) {
          continue;
        }

        // Obtenir une citation aléatoire dans la langue de l'utilisateur
        const citation = getRandomQuote(style, language);

        // Planifier la notification
        const notifId = await Notifications.scheduleNotificationAsync({
          content: {
            title: getNotificationTitle(),
            body: citation.text,
            data: { type: 'citation', category: citation.category },
            sound: true,
            ...(Platform.OS === 'android' && { channelId: CITATION_CHANNEL_ID }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });

        scheduledIds.push(notifId);
      }
    }

    // Sauvegarder les IDs pour pouvoir les annuler plus tard
    await AsyncStorage.setItem(SCHEDULED_NOTIFS_KEY, JSON.stringify(scheduledIds));

    logger.info(`[CitationNotif] ${scheduledIds.length} notifications planifiées`);
    return true;
  } catch (error) {
    logger.error('[CitationNotif] Erreur planification:', error);
    return false;
  }
};

/**
 * Obtient un titre aléatoire pour la notification
 */
const getNotificationTitle = (): string => {
  const titles = [
    'Ta dose de motivation',
    'Citation du moment',
    'Écoute ça',
    'Focus du jour',
    'Motivation YOROI',
    'Boost mental',
    'Sagesse du dojo',
    'Énergie positive',
  ];
  return titles[Math.floor(Math.random() * titles.length)];
};

// ═══════════════════════════════════════════════
// MISE À JOUR DES PARAMÈTRES
// ═══════════════════════════════════════════════

/**
 * Met à jour les notifications quand les paramètres changent
 */
export const updateCitationNotifications = async (settings: CitationNotifSettings): Promise<boolean> => {
  try {
    if (settings.enabled) {
      return await scheduleCitationNotifications();
    } else {
      await cancelAllCitationNotifications();
      return true;
    }
  } catch (error) {
    logger.error('[CitationNotif] Erreur mise à jour:', error);
    return false;
  }
};

// ═══════════════════════════════════════════════
// ENVOI IMMÉDIAT (TEST)
// ═══════════════════════════════════════════════

/**
 * Envoie une notification de citation immédiatement (pour test)
 */
export const sendImmediateCitationNotification = async (): Promise<boolean> => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    const style = await getCitationStyle();
    const language = await getCurrentLanguage();
    const citation = getRandomQuote(style, language);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: getNotificationTitle(),
        body: citation.text,
        data: { type: 'citation', category: citation.category },
        sound: true,
        ...(Platform.OS === 'android' && { channelId: CITATION_CHANNEL_ID }),
      },
      trigger: null, // Envoi immédiat
    });

    logger.info('[CitationNotif] Notification envoyée immédiatement');
    return true;
  } catch (error) {
    logger.error('[CitationNotif] Erreur envoi immédiat:', error);
    return false;
  }
};

// ═══════════════════════════════════════════════
// INITIALISATION AU DÉMARRAGE
// ═══════════════════════════════════════════════

/**
 * Initialise les notifications de citations au démarrage de l'app
 * Replanifie les notifications si nécessaire
 */
export const initCitationNotifications = async (): Promise<void> => {
  try {
    const settings = await getCitationNotifSettings();

    if (settings.enabled) {
      // Vérifier si on doit replanifier (tous les 3 jours)
      const lastScheduled = await AsyncStorage.getItem('@yoroi_citation_last_scheduled');
      const now = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

      if (!lastScheduled || now - parseInt(lastScheduled, 10) > threeDaysMs) {
        await scheduleCitationNotifications();
        await AsyncStorage.setItem('@yoroi_citation_last_scheduled', now.toString());
      }
    }
  } catch (error) {
    logger.error('[CitationNotif] Erreur init:', error);
  }
};

// ═══════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════

export default {
  requestNotificationPermissions,
  scheduleCitationNotifications,
  cancelAllCitationNotifications,
  updateCitationNotifications,
  sendImmediateCitationNotification,
  initCitationNotifications,
};
