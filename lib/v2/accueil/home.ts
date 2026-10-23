/**
 * Donnees des blocs de l'accueil : prochaine seance planifiee, dernier record, prochaine competition.
 */
import { getCompetitions, getWeeklyPlan } from '@/lib/database';
import type { Competition, Training, WeeklyPlan } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { localISO } from './hydration';
import { devNow } from '@/lib/v2/creator/devClock';

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export type NextSession = { title: string; sport: string; when: string; time?: string; duration?: number; club?: string; isToday: boolean; sportId?: string; slotId?: number };

export function formatHour(time?: string): string | undefined {
  if (!time) return undefined;
  const [h, m] = time.split(':');
  if (h === undefined) return undefined;
  const hh = String(parseInt(h, 10));
  return m && m !== '00' ? `${hh} h ${m}` : `${hh} h`;
}

export async function getNextSession(trainedToday: boolean): Promise<NextSession | null> {
  let plan: WeeklyPlan[] = [];
  try {
    plan = (await getWeeklyPlan()) ?? [];
  } catch {
    return null;
  }
  const active = plan.filter((p) => !p.is_rest_day && p.sport);
  if (active.length === 0) return null;
  // horloge du Studio (l'heure reelle hors mode createur)
  const now = devNow();
  const todayIdx = (now.getDay() + 6) % 7;
  const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  for (let off = 0; off < 8; off++) {
    const day = (todayIdx + off) % 7;
    const items = active
      .filter((p) => p.day_of_week === day)
      .filter((p) => {
        if (off !== 0) return true;
        if (p.time) return p.time.slice(0, 5) >= nowHM;
        return !trainedToday;
      })
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    if (items.length > 0) {
      const p = items[0];
      const when = off === 0 ? (p.time && p.time < '17:00' ? 'Aujourd’hui' : 'Ce soir') : off === 1 ? 'Demain' : WEEKDAYS[day];
      const title = p.label?.trim() || p.session_type?.trim() || getSportName(p.sport);
      return { title, sport: getSportName(p.sport), when: off === 0 && !p.time ? 'Aujourd’hui' : when, time: formatHour(p.time), duration: p.duration_minutes, club: p.club_name, isToday: off === 0, sportId: p.sport, slotId: p.id };
    }
  }
  return null;
}

export type LastRecord = { exercise: string; weight: number; reps: number; date: string; gain: number };

/** Dernier record de charge battu (un exercice depasse son meilleur poids precedent) */
export function findLastRecord(trainings: Training[]): LastRecord | null {
  const chrono = [...trainings].filter((t) => t.exercises && t.exercises.length > 0).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id ?? 0) - (b.id ?? 0)));
  const best = new Map<string, number>();
  let last: LastRecord | null = null;
  for (const t of chrono) {
    for (const e of t.exercises ?? []) {
      const name = (e.name ?? '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const sets = e.setsData && e.setsData.length > 0 ? e.setsData : null;
      let w = e.weight || 0;
      let reps = e.reps || 0;
      if (sets) {
        for (const s of sets as any[]) {
          const sw = Number(s?.weight) || 0;
          if (sw > w) {
            w = sw;
            reps = Number(s?.reps) || reps;
          }
        }
      }
      if (!(w > 0)) continue;
      const prev = best.get(key);
      if (prev !== undefined && w > prev) last = { exercise: name, weight: w, reps, date: t.date.slice(0, 10), gain: w - prev };
      if (prev === undefined || w > prev) best.set(key, w);
    }
  }
  return last;
}

export type NextCompetition = { name: string; date: string; days: number; place?: string; sport: string; category?: string; id?: number };

export async function getNextCompetition(): Promise<NextCompetition | null> {
  try {
    const list: Competition[] = (await getCompetitions()) ?? [];
    const today = localISO();
    const next = list
      .filter((c) => c.date && c.date.slice(0, 10) >= today && c.statut !== 'termine')
      .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    if (!next) return null;
    const days = Math.round((new Date(next.date.slice(0, 10) + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000);
    return { name: next.nom, date: next.date.slice(0, 10), days, place: next.lieu, sport: getSportName(next.sport), category: next.categorie_poids, id: next.id };
  } catch {
    return null;
  }
}

export function longDate(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function relativeDay(iso: string): string {
  const d = Math.round((new Date(localISO() + 'T12:00:00').getTime() - new Date(iso.slice(0, 10) + 'T12:00:00').getTime()) / 86400000);
  if (d <= 0) return 'aujourd’hui';
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} jours`;
  return `le ${longDate(iso)}`;
}
