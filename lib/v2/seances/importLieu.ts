/**
 * Club et cadre d'une seance importee d'Apple Sante ou de Health Connect (17 octobre 2026, audit des seances).
 *  - club : seulement si un creneau du planning du meme sport chevauche la seance, avec un seul club possible ;
 *    sinon aucun club (jamais de devinette) ;
 *  - exterieur : la montre dit « dehors » (Apple : indoor faux) ou la seance a un trace GPS.
 * Le reste (heure, duree, sport) vient tel quel de la source.
 */
import { getWeeklyPlan } from '@/lib/database';
import type { Training, WeeklyPlan } from '@/lib/database';
import { logger } from '@/lib/security/logger';

export type CreneauPlanning = Pick<WeeklyPlan, 'day_of_week' | 'sport' | 'time' | 'duration_minutes' | 'club_id' | 'is_rest_day'>;

const minutes = (hhmm?: string | null): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm ?? ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Jour du planning (0 lundi a 6 dimanche) d'une date locale « 2026-10-17 » */
export function jourPlanning(date: string): number {
  const d = new Date(String(date).slice(0, 10) + 'T12:00:00');
  return (d.getDay() + 6) % 7;
}

/** Le club du creneau du meme sport qui chevauche la seance, ou null (aucun ou plusieurs clubs possibles) */
export function clubDuPlanning(t: Pick<Training, 'sport' | 'date' | 'start_time' | 'duration_minutes'>, creneaux: CreneauPlanning[]): number | null {
  const debut = minutes(t.start_time);
  if (debut === null || !t.sport || !t.date) return null;
  const fin = debut + Math.max(1, t.duration_minutes || 1);
  const jour = jourPlanning(t.date);
  const clubs = new Set<number>();
  for (const c of creneaux) {
    if (!c.club_id || c.is_rest_day || c.day_of_week !== jour) continue;
    const sports = String(c.sport ?? '').split(',').map((s) => s.trim());
    if (!sports.includes(t.sport)) continue;
    const cd = minutes(c.time);
    if (cd === null) continue;
    const cf = cd + Math.max(1, c.duration_minutes || 60);
    if (debut < cf && cd < fin) clubs.add(c.club_id);
  }
  return clubs.size === 1 ? [...clubs][0] : null;
}

/** Dehors d'apres la source : indoor faux (Apple) ou trace GPS. Inconnu reste faux, jamais devine. */
export function exterieurDeLaSource(info: { indoor?: boolean | null; trace?: boolean | null }): boolean {
  return info.indoor === false || info.trace === true;
}

let cache: { at: number; list: CreneauPlanning[] } | null = null;

async function creneaux(): Promise<CreneauPlanning[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.list;
  try {
    const list = (await getWeeklyPlan()) ?? [];
    cache = { at: Date.now(), list };
    return list;
  } catch (e) {
    logger.warn('[ImportLieu] planning illisible', e);
    return [];
  }
}

/** La seance importee avec son club (si le planning le dit) et son cadre dehors (si la source le dit) */
export async function completerLieuImport<T extends Training>(t: T, info: { indoor?: boolean | null; trace?: boolean | null } = {}): Promise<T> {
  const out: T = { ...t };
  if (exterieurDeLaSource(info)) out.is_outdoor = true;
  if (out.club_id == null) {
    const id = clubDuPlanning(out, await creneaux());
    if (id) out.club_id = id;
  }
  return out;
}
