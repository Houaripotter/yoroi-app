// ============================================
// STREAK AT RISK · Notification proactive
// ============================================
// Quand un user a une streak d'entraînements consécutifs,
// on le notifie le soir (20h) s'il n'a pas encore enregistré
// de séance aujourd'hui et que son streak est ≥ 3 jours.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getTrainings } from './database';
import logger from '@/lib/security/logger';

const LAST_CHECK_KEY = '@yoroi_streak_risk_last_check';
const LAST_SENT_KEY = '@yoroi_streak_risk_last_sent';
const ENABLED_KEY = '@yoroi_streak_risk_enabled'; // default: true

/**
 * Calcule le streak actuel (jours consécutifs avec au moins une séance).
 */
const computeCurrentStreak = (dates: string[]): number => {
  if (dates.length === 0) return 0;
  // Ensemble des jours YYYY-MM-DD avec séance
  const daysWithActivity = new Set<string>();
  for (const d of dates) {
    try {
      daysWithActivity.add(new Date(d).toISOString().slice(0, 10));
    } catch {}
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);

  // Commencer à compter depuis aujourd'hui si séance aujourd'hui, sinon hier
  let cursor: Date;
  if (daysWithActivity.has(todayStr)) {
    cursor = new Date(today);
  } else if (daysWithActivity.has(yesterdayStr)) {
    cursor = new Date(today.getTime() - 86400000);
  } else {
    return 0;
  }

  let streak = 0;
  while (daysWithActivity.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
};

/**
 * Vérifie si la streak est en danger et envoie une notif si besoin.
 * À appeler automatiquement :
 *  - au démarrage de l'app si > 20h
 *  - à chaque foreground si > 20h et < 23h
 *  - programmé quotidiennement à 20h via notification planifiée
 */
export async function checkAndNotifyStreakAtRisk(): Promise<void> {
  try {
    // 1. Vérifier que la feature est activée
    const enabled = await AsyncStorage.getItem(ENABLED_KEY);
    if (enabled === 'false') return;

    // 2. N'envoyer qu'une fois par jour max
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastSent = await AsyncStorage.getItem(LAST_SENT_KEY);
    if (lastSent === todayStr) return;

    // 3. Créneau horaire : entre 19h et 22h
    const hour = new Date().getHours();
    if (hour < 19 || hour >= 22) return;

    // 4. Charger les trainings + calculer le streak
    const trainings = await getTrainings(1000).catch(() => []);
    const streak = computeCurrentStreak(trainings.map(t => t.date));

    // Streak < 3 → pas digne d'une notif
    if (streak < 3) return;

    // 5. Vérifier si l'utilisateur a déjà fait une séance aujourd'hui
    const daysWithActivity = new Set<string>();
    for (const t of trainings) {
      try {
        daysWithActivity.add(new Date(t.date).toISOString().slice(0, 10));
      } catch {}
    }
    if (daysWithActivity.has(todayStr)) {
      // Le user a déjà fait une séance → streak pas en danger
      return;
    }

    // 6. Streak ≥ 3 + pas de séance aujourd'hui → notifier
    const messages = streak >= 20
      ? {
          title: `🔥 Ton streak de ${streak} jours est en danger !`,
          body: `T'as pas encore logué de séance aujourd'hui. Même 15min sauvent ta série.`,
        }
      : streak >= 10
      ? {
          title: `🔥 Ne casse pas ton streak de ${streak} jours`,
          body: `Encore 2h pour logger une séance aujourd'hui et garder ta série.`,
        }
      : {
          title: `⚡ ${streak} jours d'affilée, continue !`,
          body: `Ta séance d'aujourd'hui préserve ta série. T'as le temps.`,
        };

    // Pas de demande d'autorisation surprise : on n'envoie que si déjà autorisé
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: messages.title,
        body: messages.body,
        sound: 'default',
        categoryIdentifier: 'yoroi.streak.risk',
        data: { type: 'streak_at_risk', streak },
      },
      trigger: null, // envoi immédiat
    });

    await AsyncStorage.setItem(LAST_SENT_KEY, todayStr);
    await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

    logger.info(`[StreakAtRisk] Notif envoyée : streak ${streak} jours`);
  } catch (e) {
    logger.warn('[StreakAtRisk] erreur vérification:', e);
  }
}

/**
 * Active ou désactive les notifications de streak en danger.
 * Utilisé par le toggle dans les Réglages.
 */
export async function setStreakRiskEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function isStreakRiskEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(ENABLED_KEY);
  return v !== 'false'; // activé par défaut
}
