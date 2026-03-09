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
} from './citations';
import logger from './security/logger';
import { saveNotification } from './notificationHistoryService';

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
 * Heures de notification
 * FORCÉ: 1 seule notification le matin à 8h00
 * Les utilisateurs ne veulent qu'une seule citation par jour
 */
const getNotificationHours = (_frequency: number): number[] => {
  // TOUJOURS 1 seule notification le matin - peu importe la fréquence
  return [8]; // 8h00 (matin uniquement)
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
    const hours = getNotificationHours(settings.frequency);
    const scheduledIds: string[] = [];
    const now = new Date();

    // Si l'heure de notification est déjà passée aujourd'hui, commencer demain
    const notifHour = hours[0] ?? 8;
    const startDay = now.getHours() >= notifHour ? 1 : 0;

    // Planifier pour les 7 prochains jours (en partant du bon jour)
    for (let day = startDay; day < startDay + 7; day++) {
      for (const hour of hours) {
        const triggerDate = new Date();
        triggerDate.setDate(triggerDate.getDate() + day);
        triggerDate.setHours(hour, 0, 0, 0);

        // Sécurité : ne jamais planifier dans le passé
        if (triggerDate.getTime() <= now.getTime()) {
          continue;
        }

        const citation = getRandomQuote(style);

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
        // NOTE: saveNotification n'est PAS appelé ici.
        // Les notifications sont enregistrées dans l'historique uniquement à leur RÉCEPTION
        // via le listener addNotificationReceivedListener dans _layout.tsx.
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
 * Titre UNIQUE et cohérent pour la notification
 * Fini les titres aléatoires qui spamment ("Motivation YOROI", "Citation du moment", etc.)
 */
const getNotificationTitle = (): string => {
  return 'Citation du jour';
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
    const citation = getRandomQuote(style);

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

    // Sauvegarder dans l'historique
    saveNotification(getNotificationTitle(), citation.text, 'citation', { category: citation.category }).catch(() => {});

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

    if (!settings.enabled) {
      await cancelAllCitationNotifications();
      return;
    }

    // On replanifie systématiquement : notificationService.initialize() appelle
    // cancelAllScheduledNotificationsAsync() avant cet appel, ce qui annule toutes
    // les citations. Il faut donc toujours les remettre en place.
    // Le spam d'historique est évité car saveNotification() n'est plus appelé
    // lors de la planification — seulement à la RÉCEPTION via le listener dans _layout.tsx.
    await scheduleCitationNotifications();
    await AsyncStorage.setItem('@yoroi_citation_last_scheduled', Date.now().toString());
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
