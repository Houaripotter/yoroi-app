/**
 * Rappel de securite de la pesee (vague 27) : l'onboarding demande quand tu te peses d'habitude.
 * Si aucune pesee n'est notee environ 2 h apres ce moment, une seule notification douce.
 * Prudence :
 *  - jamais de demande d'autorisation ici : le rappel n'est programme que si les notifications
 *    sont deja autorisees (demande faite apres le paywall, voir lib/v2/onboarding/trial.ts) ;
 *  - vague 28 : seulement les jours de pesee choisis (onboarding ou Notifications) ;
 *    sans jours choisis (ancien reglage) : les jours ou tu t'es pese le meme jour de la semaine precedente
 *    (quelqu'un qui se pese le lundi n'est rappele que le lundi) ;
 *  - jamais le jour meme si la pesee est deja notee ;
 *  - un reglage dans Notifications le coupe ;
 *  - seules ses propres notifications sont annulees (data.type 'pesee_habitude', data.source 'rappelHabitude'),
 *    les autres rappels de l'app ne sont jamais touches.
 * Reprogramme au lancement, au retour dans l'app et apres chaque pesee : sept jours d'avance au plus.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/security/logger';
import type { PeseeMoment } from '@/lib/v2/onboarding/draft';
import { messagePesee } from '@/lib/v2/notifications/discipline';
import { traduire } from '@/lib/i18n/tr';

const KEY = '@yoroi_pesee_habitude_v1';
export const RAPPEL_PESEE_TYPE = 'pesee_habitude';
const SOURCE = 'rappelHabitude';

export type HabitudePesee = {
  moment: PeseeMoment | null;
  actif: boolean;
  /** vague 28 : jours de pesee, comme Date.getDay() (0 = dimanche). Vide ou absent : ancien comportement. */
  jours?: number[];
  /** vague 28 : heure precise (HH:MM) quand moment vaut 'heure' */
  heure?: string | null;
};

/** Jour de l'onboarding (0 = lundi) vers Date.getDay() (0 = dimanche), et retour */
export const lundiVersJs = (j: number) => (j + 1) % 7;
export const jsVersLundi = (j: number) => (j + 6) % 7;

/** Heure habituelle de chaque moment (heures, minutes) */
export const MOMENT_HEURE: Record<Exclude<PeseeMoment, 'inconnu' | 'heure'>, [number, number]> = {
  reveil: [7, 0],
  douche: [7, 30],
  midi: [12, 30],
  soir: [19, 30],
};

export const MOMENT_LABEL: Record<PeseeMoment, string> = {
  reveil: traduire('Le matin au réveil'),
  douche: traduire('Après la douche du matin'),
  midi: traduire('Le midi'),
  soir: traduire('Le soir'),
  heure: traduire('À une heure précise'),
  inconnu: traduire('Je ne sais pas encore'),
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Heure habituelle de la pesee (heures, minutes), ou null si le moment n'est pas connu */
export function heureDe(h: Pick<HabitudePesee, 'moment' | 'heure'>): [number, number] | null {
  if (!h.moment || h.moment === 'inconnu') return null;
  if (h.moment === 'heure') {
    const m = HHMM.exec(h.heure ?? '');
    return m ? [Number(m[1]), Number(m[2])] : null;
  }
  return MOMENT_HEURE[h.moment];
}

/** Heure du rappel, environ 2 h apres (HH:MM), ou null */
export function heureRappel(h: Pick<HabitudePesee, 'moment' | 'heure'>): string | null {
  const t = heureDe(h);
  if (!t) return null;
  const tot = (t[0] * 60 + t[1] + 120) % 1440;
  return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
}

/** Delai apres le moment habituel avant le rappel */
const DELAI_MIN = 120;

export async function getHabitudePesee(): Promise<HabitudePesee> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { moment: null, actif: true };
    const v = JSON.parse(raw) as Partial<HabitudePesee>;
    const jours = Array.isArray(v.jours) ? v.jours.filter((j) => Number.isInteger(j) && j >= 0 && j <= 6) : undefined;
    return { moment: v.moment ?? null, actif: v.actif !== false, ...(jours ? { jours } : {}), heure: typeof v.heure === 'string' ? v.heure : null };
  } catch {
    return { moment: null, actif: true };
  }
}

export async function saveHabitudePesee(patch: Partial<HabitudePesee>): Promise<HabitudePesee> {
  const next = { ...(await getHabitudePesee()), ...patch };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // stockage indisponible : rien de grave, le rappel reste simplement absent
  }
  return next;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Annule uniquement les rappels de pesee programmes par ce module */
export async function annulerRappelPesee(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => (n.content?.data as Record<string, unknown> | undefined)?.type === RAPPEL_PESEE_TYPE)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined)),
    );
  } catch (e) {
    logger.warn('[RappelPesee] annulation impossible', e);
  }
}

/**
 * Jours a rappeler, calcul pur : pour chacun des 7 prochains jours, un rappel seulement si c'est un de tes
 * jours de pesee (sans jours choisis : si une pesee existe 7 jours avant), si l'heure n'est pas passee
 * et si la pesee du jour n'est pas deja notee.
 */
export function joursARappeler(hab: Pick<HabitudePesee, 'moment' | 'heure' | 'jours'>, peseeDays: Set<string>, now: Date): Date[] {
  const t = heureDe(hab);
  if (!t) return [];
  const [h, m] = t;
  const choisis = hab.jours && hab.jours.length ? new Set(hab.jours) : null;
  const out: Date[] = [];
  for (let k = 0; k < 7; k++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, h, m + DELAI_MIN, 0, 0);
    if (day.getTime() <= now.getTime() + 60000) continue;
    const iso = isoOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k));
    if (k === 0 && peseeDays.has(iso)) continue;
    if (choisis) {
      if (!choisis.has(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k).getDay())) continue;
    } else {
      const weekBefore = isoOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k - 7));
      if (!peseeDays.has(weekBefore)) continue;
    }
    out.push(day);
  }
  return out;
}

/** Reprogramme les rappels (sans jamais demander l'autorisation). Ne jette jamais. */
export async function planifierRappelPesee(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  try {
    await annulerRappelPesee();
    const h = await getHabitudePesee();
    if (!h.actif || !heureDe(h)) return 0;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return 0;
    const db = await import('@/lib/database');
    const weights = (await db.getWeights(undefined, 40).catch(() => [])) ?? [];
    const days = new Set(weights.map((w) => String(w.date ?? '').slice(0, 10)).filter(Boolean));
    const list = joursARappeler(h, days, new Date());
    for (const date of list) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'YOROI',
          // 14 octobre 2026 : textes varies d'un jour a l'autre, jamais culpabilisants (lib/v2/notifications/discipline.ts)
          body: messagePesee(date),
          data: { type: RAPPEL_PESEE_TYPE, source: SOURCE },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
    return list.length;
  } catch (e) {
    logger.warn('[RappelPesee] programmation impossible', e);
    return 0;
  }
}
