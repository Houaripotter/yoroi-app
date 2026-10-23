/**
 * Chiffres de l'onglet Seances, facon Strava ou Whoop : la semaine en cours comparee a la semaine passee
 * au meme moment, regroupement de l'historique par semaine ou par mois, points cles d'une seance
 * et reperage des seances importees de la montre.
 */
import type { Training } from '@/lib/database';
import { sessionTonnage } from '@/lib/v2/progres/strength';
import { durationOf, formatTonnage, mondayOf, setsCount } from '@/lib/v2/trainingWeek';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { MONTHS, MONTHS_SHORT, addDaysISO, daysFrom, firstSport, parseRounds, workSets, parseExercises } from './sessionData';

/** Effort retenu quand la seance n'a pas d'effort note, comme l'ecran Charge (lib/v2/chargeReelle) */
const DEFAULT_RPE = 5;

/** Sources des seances qui viennent d'une montre ou d'une autre app (Apple Sante, Health Connect...) */
const IMPORT_SOURCES = new Set(['apple', 'apple_health', 'apple_watch', 'healthkit', 'health_connect', 'iphone', 'strava', 'garmin', 'polar', 'whoop', 'suunto', 'coros', 'wahoo', 'samsung', 'fitbit', 'withings']);

const SOURCE_LABEL: Record<string, string> = {
  apple: 'Apple Watch',
  apple_watch: 'Apple Watch',
  apple_health: 'Apple Santé',
  healthkit: 'Apple Santé',
  iphone: 'iPhone',
  health_connect: 'Health Connect',
  strava: 'Strava',
  garmin: 'Garmin',
  polar: 'Polar',
  whoop: 'Whoop',
  suunto: 'Suunto',
  coros: 'Coros',
  wahoo: 'Wahoo',
  samsung: 'Samsung',
  fitbit: 'Fitbit',
  withings: 'Withings',
};

export function isImported(t: Training): boolean {
  return !!t.healthkit_uuid || IMPORT_SOURCES.has((t.source ?? '').toLowerCase());
}

export function sourceLabel(t: Training): string {
  return SOURCE_LABEL[(t.source ?? '').toLowerCase()] ?? 'ta montre';
}

export function loadOf(t: Training): number {
  const rpe = t.intensity && t.intensity > 0 ? Math.min(10, t.intensity) : DEFAULT_RPE;
  return durationOf(t) * rpe;
}

export function roundsOf(t: Training): number {
  return parseRounds(t).length || t.rounds || 0;
}

export function setsOf(t: Training): number {
  return setsCount(t);
}

export type PeriodStats = {
  sessions: number;
  days: number;
  minutes: number;
  tonnageKg: number;
  rounds: number;
  sets: number;
  distanceKm: number;
  load: number;
};

export function statsOf(trainings: Training[], from: string, to: string): PeriodStats {
  const out: PeriodStats = { sessions: 0, days: 0, minutes: 0, tonnageKg: 0, rounds: 0, sets: 0, distanceKm: 0, load: 0 };
  const days = new Set<string>();
  for (const t of trainings) {
    const d = (t.date || '').slice(0, 10);
    if (d < from || d > to) continue;
    out.sessions += 1;
    days.add(d);
    out.minutes += durationOf(t);
    out.tonnageKg += sessionTonnage(t);
    out.rounds += roundsOf(t);
    out.sets += setsOf(t);
    out.distanceKm += t.distance || 0;
    out.load += loadOf(t);
  }
  out.days = days.size;
  return out;
}

export type WeekCompare = {
  monday: string;
  sunday: string;
  /** Lundi a aujourd'hui */
  current: PeriodStats;
  /** Semaine passee, du lundi au meme jour */
  previousSoFar: PeriodStats;
  /** Semaine passee entiere */
  previousFull: PeriodStats;
  /** « du 5 au 11 oct. » */
  range: string;
  /** Jour de la semaine en cours (1 = lundi, 7 = dimanche) */
  dayIndex: number;
};

export function weekCompare(trainings: Training[], today: string): WeekCompare {
  const monday = mondayOf(today);
  const sunday = addDaysISO(monday, 6);
  const prevMonday = addDaysISO(monday, -7);
  const dayIndex = daysFrom(monday, today) + 1;
  const md = new Date(monday + 'T12:00:00');
  const sd = new Date(sunday + 'T12:00:00');
  const range = md.getMonth() === sd.getMonth()
    ? `du ${md.getDate()} au ${sd.getDate()} ${MONTHS_SHORT[sd.getMonth()]}`
    : `du ${md.getDate()} ${MONTHS_SHORT[md.getMonth()]} au ${sd.getDate()} ${MONTHS_SHORT[sd.getMonth()]}`;
  return {
    monday,
    sunday,
    current: statsOf(trainings, monday, today),
    previousSoFar: statsOf(trainings, prevMonday, addDaysISO(prevMonday, dayIndex - 1)),
    previousFull: statsOf(trainings, prevMonday, addDaysISO(prevMonday, 6)),
    range,
    dayIndex,
  };
}

/** Points de charge a la francaise : « 1 250 » */
export function formatPoints(n: number): string {
  return String(Math.round(Math.max(0, n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Nombre a une decimale a la francaise */
export function fr1(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace('.', ',');
}

export type HistoryGroup = {
  key: string;
  title: string;
  sessions: number;
  days: number;
  minutes: number;
  tonnageKg: number;
  rounds: number;
  distanceKm: number;
  items: Training[];
};

function sortDesc(trainings: Training[]): Training[] {
  return [...trainings].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.start_time ?? '').localeCompare(a.start_time ?? '')));
}

function summarize(key: string, title: string, items: Training[]): HistoryGroup {
  const days = new Set(items.map((t) => t.date.slice(0, 10)));
  return {
    key,
    title,
    sessions: items.length,
    days: days.size,
    minutes: items.reduce((s, t) => s + durationOf(t), 0),
    tonnageKg: items.reduce((s, t) => s + sessionTonnage(t), 0),
    rounds: items.reduce((s, t) => s + roundsOf(t), 0),
    distanceKm: items.reduce((s, t) => s + (t.distance || 0), 0),
    items,
  };
}

export function groupHistory(trainings: Training[], today: string, mode: 'semaine' | 'mois'): HistoryGroup[] {
  const map = new Map<string, Training[]>();
  for (const t of sortDesc(trainings)) {
    const d = (t.date || '').slice(0, 10);
    if (!d) continue;
    const k = mode === 'semaine' ? mondayOf(d) : d.slice(0, 7);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  }
  const thisMonday = mondayOf(today);
  const lastMonday = addDaysISO(thisMonday, -7);
  const thisMonth = today.slice(0, 7);
  const year = today.slice(0, 4);
  return Array.from(map.entries()).map(([k, items]) => {
    let title: string;
    if (mode === 'semaine') {
      const md = new Date(k + 'T12:00:00');
      const sd = new Date(addDaysISO(k, 6) + 'T12:00:00');
      title = k === thisMonday
        ? 'Cette semaine'
        : k === lastMonday
          ? 'Semaine dernière'
          : md.getMonth() === sd.getMonth()
            ? `Du ${md.getDate()} au ${sd.getDate()} ${MONTHS_SHORT[sd.getMonth()]}${k.slice(0, 4) !== year ? ` ${k.slice(0, 4)}` : ''}`
            : `Du ${md.getDate()} ${MONTHS_SHORT[md.getMonth()]} au ${sd.getDate()} ${MONTHS_SHORT[sd.getMonth()]}${k.slice(0, 4) !== year ? ` ${k.slice(0, 4)}` : ''}`;
    } else {
      const m = Number(k.slice(5, 7)) - 1;
      const name = MONTHS[m].charAt(0).toUpperCase() + MONTHS[m].slice(1);
      title = k === thisMonth ? `${name}, ce mois-ci` : k.slice(0, 4) !== year ? `${name} ${k.slice(0, 4)}` : name;
    }
    return summarize(k, title, items);
  });
}

/** Sports pratiques, du plus frequent au moins frequent, pour les filtres */
export function sportsByCount(trainings: Training[]): { sport: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const t of trainings) {
    const s = firstSport(t.sport);
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([sport, count]) => ({ sport, count }));
}

export type KeyFact = { kind: 'duree' | 'volume' | 'series' | 'rounds' | 'distance' | 'fc' | 'calories'; text: string };

/** Points cles d'une seance pour la ligne d'historique (quatre au maximum) */
export function keyFacts(t: Training, unite: UnitePoids = 'kg'): KeyFact[] {
  const out: KeyFact[] = [];
  const min = durationOf(t);
  if (min > 0) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    out.push({ kind: 'duree', text: h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}` });
  }
  const tonnage = sessionTonnage(t);
  // format unique du tonnage (lib/v2/trainingWeek)
  if (tonnage >= 100) out.push({ kind: 'volume', text: formatTonnage(tonnage, unite) });
  else {
    const sets = setsOf(t);
    if (sets > 0) out.push({ kind: 'series', text: `${sets} série${sets > 1 ? 's' : ''}` });
  }
  const r = roundsOf(t);
  if (r > 0) out.push({ kind: 'rounds', text: `${r} round${r > 1 ? 's' : ''}` });
  if (t.distance && t.distance > 0) out.push({ kind: 'distance', text: `${fr1(t.distance)} km` });
  if (t.heart_rate && t.heart_rate > 0) out.push({ kind: 'fc', text: `${Math.round(t.heart_rate)} bpm` });
  if (out.length < 4 && t.calories && t.calories > 0) out.push({ kind: 'calories', text: `${Math.round(t.calories)} kcal` });
  return out.slice(0, 4);
}
