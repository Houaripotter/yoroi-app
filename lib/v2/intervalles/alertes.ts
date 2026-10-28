/**
 * Sprints guidés, téléphone verrouillé : une notification (son et vibration) à chaque changement d'étape
 * à venir, planifiée quand l'app passe en arrière plan, annulée dès qu'elle revient.
 *
 * Pourquoi : iOS endort le JavaScript peu après le verrouillage (environ 30 s accordées par
 * lib/backgroundTaskService.ts) ; le chrono et la voix du coach s'arrêtent alors, mais les notifications
 * planifiées sonnent quand même. Le chrono des Chronos n'en planifie qu'une (lib/timerNotifications.ts) :
 * ici, une par étape, pour être guidé jusqu'au bout la poche fermée.
 *
 * Respecte le réglage « Fin de round » des notifications du chrono, ne demande jamais la permission
 * (la proposition se fait au lancement, timerNotifications.proposerAuLancement).
 * iOS garde au plus 64 notifications en attente : au plus 40 ici.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { timerNotifications, timerSound } from '@/lib/timerNotifications';

export const MAX_ALERTES = 40;

let ids: string[] = [];
let generation = 0;

export async function annulerAlertesSprints(): Promise<void> {
  generation += 1;
  const anciens = ids;
  ids = [];
  await Promise.all(anciens.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}

/** Planifie les alertes (heures absolues en ms) ; celles déjà passées ou à moins d'une seconde sont ignorées */
export async function planifierAlertesSprints(alertes: readonly { atMs: number; titre: string; texte: string }[]): Promise<void> {
  if (Platform.OS === 'web') return;
  await annulerAlertesSprints();
  const g = generation;
  try {
    const reglages = await timerNotifications.loadSettings();
    if (!reglages.roundFinished) return;
    if (!(await timerNotifications.requestPermissions())) return;
    const maintenant = Date.now();
    for (const a of alertes.filter((x) => x.atMs > maintenant + 1000).slice(0, MAX_ALERTES)) {
      // l'app est revenue entre temps : on n'en planifie pas plus
      if (g !== generation) return;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: a.titre,
          body: a.texte,
          sound: timerSound(),
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 400, 200, 400],
          data: { type: 'timer_finished' },
          ...(Platform.OS === 'ios' ? { interruptionLevel: 'timeSensitive' as never } : {}),
          ...(Platform.OS === 'android' ? { channelId: 'timer_alarm' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, Math.round((a.atMs - Date.now()) / 1000)),
        } as Notifications.TimeIntervalTriggerInput,
      });
      if (g !== generation) {
        Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
        return;
      }
      ids.push(id);
    }
  } catch {
    // une alerte ratée ne casse jamais la séance
  }
}
