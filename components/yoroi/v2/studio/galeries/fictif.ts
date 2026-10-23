/**
 * Donnees fictives des galeries du Studio : Heny, musculation et JJB.
 * Elles ne sont jamais ecrites nulle part, elles servent seulement a remplir les cartes et les apercus.
 */
import type { Training } from '@/lib/database';
import type { WeekStats } from '@/lib/social-cards/useWeekStats';
import type { MonthStats } from '@/lib/social-cards/useMonthStats';
import type { YearStats } from '@/lib/social-cards/useYearStats';
import type { CombatRoundData } from '@/components/social-cards/SessionCard';
import type { CardIdentity } from '@/lib/v2/partage/identity';
import type { FighterData } from '@/components/yoroi/v2/partage/FighterCardView';
import { traduire } from '@/lib/i18n/tr';

export const NOM = 'Heny';
const CLUB_JJB = 'First Jiu-Jitsu Academy';
const CLUB_MUSCU = 'Basic-Fit Prado';

const JOURS = [traduire('Lun'), traduire('Mar'), traduire('Mer'), traduire('Jeu'), traduire('Ven'), traduire('Sam'), traduire('Dim')];

function lundi(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1));
  return x;
}

function numeroSemaine(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

/** Semaine en cours : 4 jours actifs, 5 seances */
export function semaineFictive(now = new Date()): WeekStats {
  const start = lundi(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const seances = [1, 0, 2, 0, 1, 1, 0];
  const calendar = seances.map((s, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, dayName: JOURS[i], dayNumber: d.getDate(), isActive: s > 0, isToday: d.toDateString() === now.toDateString(), sessions: s };
  });
  const wn = numeroSemaine(now);
  return {
    year: now.getFullYear(),
    weekNumber: wn,
    weekStart: start,
    weekEnd: end,
    weekLabel: traduire("Semaine {0}", wn),
    activeDays: 4,
    totalSessions: 5,
    totalDays: 7,
    percentage: Math.round((4 / 7) * 100),
    calendar,
    clubs: [
      { clubName: CLUB_JJB, count: 3 },
      { clubName: CLUB_MUSCU, count: 2 },
    ],
    evolution: { weight: { start: 64.8, end: 64.2, change: -0.6 } },
    bestDay: { dayName: traduire('Mercredi'), date: calendar[2].date, sessions: 2 },
  };
}

const MOIS = [traduire('Janvier'), traduire('Février'), traduire('Mars'), traduire('Avril'), traduire('Mai'), traduire('Juin'), traduire('Juillet'), traduire('Août'), traduire('Septembre'), traduire('Octobre'), traduire('Novembre'), traduire('Décembre')];

/** Mois precedent : 16 jours actifs sur le mois */
export function moisFictif(now = new Date()): MonthStats {
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const n = new Date(y, m + 1, 0).getDate();
  const actifs = new Set([1, 3, 4, 6, 8, 10, 11, 13, 15, 17, 18, 20, 22, 24, 25, 27]);
  const calendar = Array.from({ length: n }).map((_, i) => {
    const d = new Date(y, m, i + 1);
    const dow = d.getDay();
    return { day: i + 1, isActive: actifs.has(i + 1), isToday: false, isWeekend: dow === 0 || dow === 6, dayOfWeek: dow };
  });
  return {
    year: y,
    month: m,
    monthName: MOIS[m],
    activeDays: actifs.size,
    totalDays: n,
    totalTrainings: 19,
    percentage: Math.round((actifs.size / n) * 100),
    calendar,
    clubTrainings: [
      { clubName: CLUB_JJB, sport: 'jjb', count: 11 },
      { clubName: CLUB_MUSCU, sport: 'musculation', count: 8 },
    ],
    evolution: { weight: { start: 65.6, end: 64.2, change: -1.4 } },
    bestWeek: { weekNumber: 3, daysActive: 5 },
  };
}

/** Annee en cours */
export function anneeFictive(now = new Date()): YearStats {
  const y = now.getFullYear();
  const bissextile = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return {
    year: y,
    totalDays: 168,
    totalDaysInYear: bissextile ? 366 : 365,
    percentage: Math.round((168 / (bissextile ? 366 : 365)) * 100),
    weeklyGoal: 4,
    yearlyGoal: 208,
    activityBreakdown: [
      { clubName: CLUB_JJB, count: 96, percentage: 57 },
      { clubName: CLUB_MUSCU, count: 72, percentage: 43 },
    ],
    bestStreak: 11,
    currentStreak: 4,
    busiestMonth: { month: traduire('Mars'), monthNumber: 2, daysActive: 21 },
    projection: { estimatedTotal: 218, onTrackFor200: true },
  };
}

function hier(heure: string): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${heure}:00`;
}

export const SEANCE_MUSCU: Partial<Training> = {
  sport: 'musculation',
  date: hier('18:30'),
  start_time: '18:30',
  duration_minutes: 65,
  session_type: 'force',
  intensity: 8,
  location_name: 'Marseille',
};

export const OPTIONS_MUSCU = [
  { label: traduire('Développé couché'), weight: '42,5', reps: '6', sets: '4' },
  { label: 'Squat', weight: '70', reps: '5', sets: '5' },
  { label: 'Tractions', reps: '6', sets: '4' },
  { label: traduire('Rowing haltère'), weight: '16', reps: '10', sets: '3' },
];

export const SEANCE_JJB: Partial<Training> = {
  sport: 'jjb',
  date: hier('19:30'),
  start_time: '19:30',
  duration_minutes: 90,
  session_types: JSON.stringify(['cours', 'sparring']),
  technical_theme: traduire('Passage de garde'),
  rounds: 5,
  round_duration: 6,
  intensity: 7,
  location_name: CLUB_JJB,
};

export const ROUNDS_JJB: CombatRoundData[] = [
  { number: 1, result: 'win', methodsGiven: ['Triangle'], partner: 'Sarah', duration: 360 },
  { number: 2, result: 'loss', methodsTaken: [traduire('Clé de bras')], partner: traduire('Inès'), duration: 360 },
  { number: 3, result: 'draw', partner: 'Camille', duration: 360 },
  { number: 4, result: 'win', methodsGiven: [traduire('Étranglement arrière')], partner: 'Sarah', duration: 360 },
  { number: 5, result: 'win', methodsGiven: ['Triangle'], partner: traduire('Léa'), duration: 360 },
];

export const DUEL = {
  myName: NOM,
  myBelt: 'bleue',
  opponentName: 'Sarah',
  opponentBelt: 'violette',
  wins: 7,
  losses: 5,
  draws: 2,
  totalRounds: 14,
  topMethodGiven: 'Triangle',
  topMethodTaken: traduire('Clé de bras'),
  lastSessions: ['win', 'loss', 'win', 'draw', 'win'] as ('win' | 'loss' | 'draw')[],
  sport: 'jjb',
};

export function identiteFictive(genre: 'h' | 'f'): CardIdentity {
  return {
    name: NOM,
    photo: null,
    personnage: genre === 'f' ? 'guerrier_f' : 'guerrier_h',
    genre,
    rankIndex: 1,
    rankName: 'Bushi',
    rankKanji: '',
    xp: 1240,
    rankProgress: 0.55,
    weekStreak: 6,
    weeklyGoal: 4,
    sealsCount: 9,
    ready: true,
  };
}

export const COMBATTANT: FighterData = {
  name: NOM,
  weight: 64.2,
  height: 168,
  totalTrainings: 142,
  totalMinutes: 9840,
  discipline: 'JJB',
  disciplineId: 'jjb',
  joinDate: '2025-11-02',
  weightLost: 3.4,
  goals: { done: 3, target: 4, percent: 75 },
};

export const RECORDS_PARTAGE = [
  { label: 'Record muscu', sub: traduire('Développé couché, nouveau record'), data: { exerciseName: traduire('Développé couché'), performance: '45 kg x 5 reps', date: hier('18:30').slice(0, 10), isPR: true, previous: '42,5 kg x 5 reps' } },
  { label: traduire('Perf du jour'), sub: traduire('Tractions, sans record'), data: { exerciseName: 'Tractions', performance: '8 reps', date: hier('18:30').slice(0, 10), isPR: false } },
];
