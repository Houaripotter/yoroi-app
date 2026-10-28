/**
 * Rappels locaux d'une competition (expo-notifications, rien ne passe par un serveur) :
 * un mois avant, une semaine avant, la veille au soir, le matin de la pesee,
 * et le lendemain pour noter ton resultat. Chaque rappel a un identifiant fixe :
 * on peut tout reprogrammer sans doublon, meme si un autre reglage a tout annule.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getCompetitions } from '@/lib/fighterModeService';
import type { Competition } from '@/lib/fighterMode';
import { contenuSansSante } from '@/lib/v2/notifications/texte';
import { addDays, parseLocalDate } from './dates';
import { getAllExtras } from './extras';
import type { CompetitionExtra } from './extras';
import logger from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';
import { sourceNotif, src, type SourceTexte } from '@/lib/notificationLangue';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

const PREFIX = 'yoroi-competition-';
const CHANNEL = 'competitions';

type Planned = { kind: string; at: Date; title: string; body: string; src?: { titre?: SourceTexte; texte?: SourceTexte } };

function at(day: Date, h: number, m = 0): Date {
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Les rappels prevus pour une competition, dans l'ordre */
export function plannedReminders(comp: Competition, extra: CompetitionExtra): Planned[] {
  const day = parseLocalDate(comp.date);
  if (isNaN(day.getTime())) return [];
  // Aucune catégorie de poids ni limite en kg : la notification s'affiche
  // sur l'écran verrouillé. Le détail reste dans la fiche compétition.
  const cat = Boolean(comp.categorie_poids);
  const list: Planned[] = [
    { kind: 'j30', at: at(addDays(day, -30), 9), title: traduire("Dans 30 jours : {0}", sansTiret(comp.nom)), body: cat ? traduire('Un mois pour te préparer. Vérifie ton inscription et ta catégorie.') : traduire('Un mois pour te préparer. Pense à vérifier ton inscription.'), src: { titre: src("Dans 30 jours : {0}", sansTiret(comp.nom)) } },
    { kind: 'j7', at: at(addDays(day, -7), 9), title: traduire("Dans 7 jours : {0}", sansTiret(comp.nom)), src: { titre: src("Dans 7 jours : {0}", sansTiret(comp.nom)) }, body: cat ? traduire('Dernière semaine. Garde un œil sur ta pesée.') : traduire('Dernière semaine. Prépare ton sac et ton trajet.') },
    { kind: 'veille', at: at(addDays(day, -1), 19), title: traduire("Demain : {0}", sansTiret(comp.nom)), body: comp.lieu ? traduire("Direction {0}. Prépare ton sac et va au lit tôt.", sansTiret(comp.lieu)) : traduire('Prépare ton sac et va au lit tôt.'), src: { titre: src("Demain : {0}", sansTiret(comp.nom)), ...(comp.lieu ? { texte: src("Direction {0}. Prépare ton sac et va au lit tôt.", sansTiret(comp.lieu)) } : {}) } },
  ];
  if (extra.pesee) {
    const weighDay = extra.pesee === 'veille' ? addDays(day, -1) : day;
    list.push({ kind: 'pesee', at: at(weighDay, extra.pesee === 'veille' ? 8 : 7), title: traduire("Jour de pesée : {0}", sansTiret(comp.nom)), body: traduire('Pesée ce matin pour savoir où tu en es.'), src: { titre: src("Jour de pesée : {0}", sansTiret(comp.nom)) } });
  }
  list.push({ kind: 'resultat', at: at(addDays(day, 1), 10), title: traduire(`Comment s’est passée ta compétition ?`), body: traduire("Note ton résultat de {0} : il rejoint ton palmarès.", sansTiret(comp.nom)), src: { texte: src("Note ton résultat de {0} : il rejoint ton palmarès.", sansTiret(comp.nom)) } });
  return list.sort((a, b) => a.at.getTime() - b.at.getTime());
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: traduire('Compétitions'), importance: Notifications.AndroidImportance.HIGH }).catch(() => {});
}

async function cancelFor(id?: number) {
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => [] as Notifications.NotificationRequest[]);
  const start = id === undefined ? PREFIX : `${PREFIX}${id}-`;
  await Promise.all(all.filter((n) => n.identifier.startsWith(start)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
}

async function scheduleFor(comp: Competition, extra: CompetitionExtra): Promise<number> {
  const now = Date.now() + 60000;
  let n = 0;
  for (const p of plannedReminders(comp, extra)) {
    if (p.at.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${comp.id}-${p.kind}`,
      content: { ...contenuSansSante({ title: p.title, body: p.body }), data: { type: 'competition', source: 'competitionReminders', screen: 'competition-detail', id: String(comp.id), ...sourceNotif(p.src?.titre, p.src?.texte) } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}) } as Notifications.NotificationTriggerInput,
    });
    n++;
  }
  return n;
}

/** Autorisation deja donnee ? (ne la demande jamais) */
export async function remindersAllowed(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Demande l'autorisation, au moment ou tu actives les rappels */
export async function askReminders(): Promise<boolean> {
  try {
    if (await remindersAllowed()) return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Reprogramme les rappels de toutes tes competitions a venir dont les rappels sont actives */
export async function syncCompetitionReminders(list?: Competition[]): Promise<void> {
  try {
    if (Platform.OS === 'web' || !(await remindersAllowed())) return;
    const [comps, extras] = await Promise.all([list ? Promise.resolve(list) : getCompetitions(), getAllExtras()]);
    await ensureChannel();
    await cancelFor();
    for (const c of comps ?? []) {
      const e = extras[String(c.id)];
      if (!e?.rappels || c.statut === 'annulee') continue;
      await scheduleFor(c, e);
    }
  } catch (e) {
    logger.warn('Rappels de competition non reprogrammes', e);
  }
}

/** Active ou coupe les rappels d'une competition. Renvoie le nombre de rappels programmes, ou -1 sans autorisation */
export async function applyReminders(comp: Competition, extra: CompetitionExtra): Promise<number> {
  try {
    if (Platform.OS === 'web') return 0;
    await cancelFor(comp.id);
    if (!extra.rappels || comp.statut === 'annulee') return 0;
    if (!(await askReminders())) return -1;
    await ensureChannel();
    return await scheduleFor(comp, extra);
  } catch (e) {
    logger.warn('Rappels de competition impossibles', e);
    return 0;
  }
}

export async function cancelCompetitionReminders(id: number): Promise<void> {
  await cancelFor(id).catch(() => {});
}
