// ============================================
// WEEKLY RECAP NOTIFICATION
// Programme une notif récurrente chaque dimanche 19h avec récap de la semaine.
// La notif contient le nombre de séances + minutes + un message contextuel.
// ============================================

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTrainings } from './database';
import { differenceInDays, parseISO } from 'date-fns';
import { logger } from './security/logger';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const NOTIF_ID_KEY = '@yoroi_weekly_recap_id';
const ENABLED_KEY = '@yoroi_weekly_recap_enabled';

/**
 * Calcule le récap de la semaine écoulée et retourne le contenu de la notif.
 */
const buildRecapContent = async (): Promise<{ title: string; body: string } | null> => {
  try {
    const trainings = await getTrainings(7, 50);
    const sessions = (trainings || []).filter(t => {
      try { return differenceInDays(new Date(), parseISO(t.date)) <= 7; }
      catch { return false; }
    });
    const totalMin = sessions.reduce((s, t: any) => s + (t.duration_minutes || t.duration || 0), 0);

    if (sessions.length === 0) {
      return {
        title: traduire('Semaine sans séance'),
        body: traduire('Une semaine calme. La suivante commence : choisis un petit objectif.'),
      };
    }
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const durStr = h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
    const msg = sessions.length >= 5
      ? traduire("{0} séances, {1}. Quelle semaine.", sessions.length, durStr)
      : sessions.length >= 3
        ? traduire("{0} séances, {1}. Belle régularité.", sessions.length, durStr)
        : traduirePluriel(sessions.length, sessions.length > 1, "{0} séance, {1}. On continue la semaine prochaine ?", "{0} séances, {1}. On continue la semaine prochaine ?", sessions.length, durStr);
    return { title: traduire('Récap de ta semaine'), body: msg };
  } catch (e) {
    logger.warn('[WeeklyRecap] Erreur build content:', e);
    return null;
  }
};

/**
 * Planifie la notification récurrente : chaque dimanche à 19h.
 * Annule l'ancienne si elle existe.
 */
export const scheduleWeeklyRecap = async (): Promise<void> => {
  try {
    // Annule l'ancienne
    const oldId = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (oldId) {
      try { await Notifications.cancelScheduledNotificationAsync(oldId); } catch {}
    }
    // Vérifier permission
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      logger.info('[WeeklyRecap] Permission non accordée, skip schedule');
      return;
    }

    // Schedule pour dimanche 19h, récurrent
    // weekday: 1 = dimanche dans iOS (UnixOS-style), 8 dans Notifications.WeeklyTriggerInput
    // expo-notifications attend `weekday` 1-7 (dimanche = 1)
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: traduire('Récap de ta semaine'),
        body: traduire('Ton bilan des sept derniers jours t’attend dans YOROI.'),
        sound: 'default',
        data: { type: 'weekly_recap', tab: 'stats' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Dimanche
        hour: 19,
        minute: 0,
      } as any,
    });
    await AsyncStorage.setItem(NOTIF_ID_KEY, id);
    await AsyncStorage.setItem(ENABLED_KEY, 'true');
    logger.info('[WeeklyRecap] Notif planifiée pour dimanche 19h');
  } catch (e) {
    logger.warn('[WeeklyRecap] Erreur schedule:', e);
  }
};

export const cancelWeeklyRecap = async (): Promise<void> => {
  try {
    const oldId = await AsyncStorage.getItem(NOTIF_ID_KEY);
    if (oldId) await Notifications.cancelScheduledNotificationAsync(oldId);
    await AsyncStorage.removeItem(NOTIF_ID_KEY);
    await AsyncStorage.setItem(ENABLED_KEY, 'false');
  } catch (e) {
    logger.warn('[WeeklyRecap] Erreur cancel:', e);
  }
};

export const isWeeklyRecapEnabled = async (): Promise<boolean> => {
  const v = await AsyncStorage.getItem(ENABLED_KEY);
  return v !== 'false'; // Activé par défaut
};

/**
 * À appeler une fois au démarrage de l'app pour s'assurer que la notif est planifiée
 * (en cas de désinstall/réinstall, ou première installation).
 */
export const ensureWeeklyRecapScheduled = async (): Promise<void> => {
  const enabled = await isWeeklyRecapEnabled();
  if (!enabled) return;
  const existingId = await AsyncStorage.getItem(NOTIF_ID_KEY);
  if (existingId) {
    // Vérifier que la notif existe vraiment
    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      if (all.some(n => n.identifier === existingId)) return; // Déjà OK
    } catch {}
  }
  await scheduleWeeklyRecap();
};
