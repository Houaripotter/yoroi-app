// ============================================
// YOROI - SPARRING NOTIFICATIONS SERVICE
// ============================================
// Service de notifications intelligentes pour les partenaires de sparring
// ============================================

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from '@/lib/security/logger';
import { contenuSansSante } from '@/lib/v2/notifications/texte';
import { traduire } from '@/lib/i18n/tr';
import { installerGestionnaireNotifications } from '@/lib/v2/notifications/gestionnaire';
import { sourceNotif, src } from '@/lib/notificationLangue';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SparringPartner {
  id: string;
  name: string;
  activeGoal?: { text: string; createdAt: string };
  lastSessionDate?: string; // ISO date de la dernière séance de sparring
}

// ─── Constantes ───────────────────────────────────────────────────────────────

export const NOTIFICATION_CHANNEL_ID = 'sparring-reminders';

// ─── Handler de notification ──────────────────────────────────────────────────

// 30 octobre 2026 : le gestionnaire commun (lib/v2/notifications/gestionnaire.ts)
export const setupNotificationHandler = () => {
  installerGestionnaireNotifications();
};

// ─── Canal Android ────────────────────────────────────────────────────────────

const ensureAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Rappels sparring',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2C4A84',
    });
  } catch (err) {
    logger.error('sparringNotifications: impossible de créer le canal Android', err);
  }
};

// ─── Permissions ──────────────────────────────────────────────────────────────

/**
 * Permission sans surprise : déjà accordée, on prépare le canal Android ; sinon on ne
 * demande rien ici. La demande passe par la fenêtre maison (lib/v2/notifications/permission.ts),
 * seulement quand un objectif de sparring en a besoin, et jamais après un refus du système.
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return false;
    await ensureAndroidChannel();
    return true;
  } catch (err) {
    logger.error('sparringNotifications: erreur lors de la lecture des permissions', err);
    return false;
  }
};

/** Vrai si au moins un partenaire a un objectif actif : seul cas où les rappels servent */
export const aBesoinDeRappels = (partners: { activeGoal?: { text: string } | null }[]): boolean =>
  partners.some((p) => !!p.activeGoal?.text);

// ─── Utilitaires ─────────────────────────────────────────────────────────────

const daysSince = (isoDate: string): number => {
  const past = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((now - past) / (1000 * 60 * 60 * 24));
};

/**
 * Retourne un trigger pour demain à 9h00.
 */
const tomorrowAt9am = (): Notifications.NotificationTriggerInput => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return { date: tomorrow, type: Notifications.SchedulableTriggerInputTypes.DATE };
};

/**
 * Planifie une notification en annulant d'abord toute notification existante
 * portant le même identifiant.
 */
const scheduleOrReplace = async (
  identifier: string,
  content: Notifications.NotificationContentInput,
  trigger: Notifications.NotificationTriggerInput,
): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // L'identifiant n'existait pas, pas d'erreur à traiter
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        ...contenuSansSante(content),
        ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
      },
      trigger,
    });
    logger.info(`sparringNotifications: notification planifiée, ${identifier}`);
  } catch (err) {
    logger.error(`sparringNotifications: impossible de planifier ${identifier}`, err);
  }
};

// ─── Planification principale ─────────────────────────────────────────────────

export const scheduleSparringReminders = async (
  partners: SparringPartner[],
): Promise<void> => {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      logger.warn('sparringNotifications: permissions non accordées, abandon de la planification');
      return;
    }

    await ensureAndroidChannel();

    for (const partner of partners) {
      const { id, name, activeGoal, lastSessionDate } = partner;

      const daysSinceSession = lastSessionDate ? daysSince(lastSessionDate) : null;

      // ── 1. Inactivité partenaire (> 14 jours + objectif actif) ────────────
      if (activeGoal && daysSinceSession !== null && daysSinceSession > 14) {
        const goal = activeGoal.text;
        const days = daysSinceSession;
        await scheduleOrReplace(
          `sparring-inactive-${id}`,
          {
            title: traduire('Objectif en attente'),
            body: traduire("Ton objectif contre {0} : \"{1}\", ça fait {2} jours sans sparring", name, goal, days),
            // de quoi réafficher l'historique dans une autre langue
            data: sourceNotif(src('Objectif en attente'), src("Ton objectif contre {0} : \"{1}\", ça fait {2} jours sans sparring", name, goal, days)),
          },
          {
            seconds: 5,
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          },
        );
      }

      // ── 2. Rappel objectif actif (> 7 jours) ──────────────────────────────
      if (activeGoal && daysSinceSession !== null && daysSinceSession > 7) {
        const goal = activeGoal.text;
        await scheduleOrReplace(
          `sparring-goal-${id}`,
          {
            title: traduire("Sparring avec {0} ?", name),
            body: traduire("Objectif en cours : {0}", goal),
            data: sourceNotif(src("Sparring avec {0} ?", name), src("Objectif en cours : {0}", goal)),
          },
          tomorrowAt9am(),
        );
      }
    }
  } catch (err) {
    logger.error('sparringNotifications: erreur lors de la planification des rappels', err);
  }
};

// ─── Annulation ───────────────────────────────────────────────────────────────

export const cancelSparringNotifications = async (): Promise<void> => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const sparringIds = scheduled
      .map((n) => n.identifier)
      .filter((id) => id.startsWith('sparring-inactive-') || id.startsWith('sparring-goal-'));

    await Promise.all(
      sparringIds.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch((err) =>
          logger.warn(`sparringNotifications: impossible d'annuler ${id}`, err),
        ),
      ),
    );

    logger.info(`sparringNotifications: ${sparringIds.length} notification(s) annulée(s)`);
  } catch (err) {
    logger.error('sparringNotifications: erreur lors de l\'annulation des notifications', err);
  }
};
