/**
 * Records de l'espace Seances v2, calcules a partir des seances enregistrees.
 * Un tampon est pose chaque fois qu'une seance bat la meilleure marque precedente.
 * La toute premiere fois qu'un exercice apparait sert de point de depart, sans tampon.
 * Records utiles par sport : charge max et max estime (musculation), distance et allure
 * (course, cardio), seance la plus longue, victoires et soumissions (combat), regularite.
 * Le nombre de rounds reste un repere secondaire : il ne pose plus de tampon.
 * SOURCE UNIQUE des records de seance (vague 32) : onglet Seances, ecran Records, Progres et Carnet
 * lisent ce calcul, toujours sur les seances dedoublonnees (lib/v2/seances/useSessionRecords.ts).
 */
import type { Training } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { durationOf } from '@/lib/v2/trainingWeek';
import { libelleUnite, versUnitePoids, type UnitePoids } from '@/lib/v2/unitePoids';
import { estimatedMax, familyOf, firstSport, parseExercises, parseRounds, workSets } from './sessionData';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export type RecordKind = 'force' | 'reps' | 'distance' | 'allure' | 'rounds' | 'duree';

export type RecordPoint = { date: string; value: number; trainingId?: number; isRecord: boolean };

export type RecordLine = {
  key: string;
  kind: RecordKind;
  name: string;
  sport: string;
  /** meilleure valeur (kg estimes, repetitions, km, secondes au km, rounds, minutes) */
  best: number;
  /** pour la force : la serie qui a donne le record */
  bestSet?: { weight: number; reps: number };
  /** pour la force : la charge la plus lourde soulevee (et ses repetitions) */
  maxLoad?: { weight: number; reps: number };
  /** repere secondaire (rounds) : jamais mis en avant, sans tampon */
  minor?: boolean;
  date: string;
  trainingId?: number;
  stamps: number;
  history: RecordPoint[];
};

export type RecordsResult = {
  lines: RecordLine[];
  totalStamps: number;
  /** seances qui ont battu au moins un record, avec le nombre de records */
  stampedTrainings: Map<number, number>;
  /** derniers records battus, du plus recent au plus ancien */
  recent: { line: RecordLine; point: RecordPoint }[];
  /** records utiles a mettre en avant (force, endurance, puis duree), sans les reperes secondaires */
  highlights: RecordLine[];
};

type Acc = {
  line: RecordLine;
  lowerIsBetter: boolean;
};

function push(map: Map<string, Acc>, key: string, make: () => RecordLine, lowerIsBetter: boolean, point: { date: string; value: number; trainingId?: number }, extra?: (l: RecordLine) => void) {
  let acc = map.get(key);
  if (!acc) {
    acc = { line: make(), lowerIsBetter };
    map.set(key, acc);
  }
  const l = acc.line;
  const first = l.history.length === 0;
  const better = first || (lowerIsBetter ? point.value < l.best - 1e-9 : point.value > l.best + 1e-9);
  const isRecord = !first && better;
  l.history.push({ ...point, isRecord });
  if (better) {
    l.best = point.value;
    l.date = point.date;
    l.trainingId = point.trainingId;
    if (extra) extra(l);
  }
  if (isRecord) l.stamps += 1;
}

export function computeRecords(trainings: Training[]): RecordsResult {
  const sorted = [...trainings].filter((t) => t && t.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.start_time ?? '').localeCompare(b.start_time ?? '')));
  const map = new Map<string, Acc>();

  for (const t of sorted) {
    const date = t.date.slice(0, 10);
    const sport = firstSport(t.sport);

    // Force : meilleur maximum estime par exercice, ou meilleures repetitions au poids du corps
    for (const ex of parseExercises(t)) {
      const name = (ex.name ?? '').trim();
      if (!name) continue;
      const sets = workSets(ex);
      let bestMax = 0;
      let bestSet: { weight: number; reps: number } | undefined;
      let bestReps = 0;
      let heaviest: { weight: number; reps: number } | undefined;
      for (const s of sets) {
        if (s.weight > 0 && s.reps > 0 && (!heaviest || s.weight > heaviest.weight || (s.weight === heaviest.weight && s.reps > heaviest.reps))) heaviest = { weight: s.weight, reps: s.reps };
        const m = estimatedMax(s.weight, s.reps);
        if (m > bestMax) {
          bestMax = m;
          bestSet = { weight: s.weight, reps: s.reps };
        }
        if (!(s.weight > 0) && s.reps > bestReps) bestReps = s.reps;
      }
      const key = name.toLowerCase();
      if (bestMax > 0 && bestSet) {
        const set = bestSet;
        push(map, `force:${key}`, () => ({ key: `force:${key}`, kind: 'force', name, sport, best: 0, date, stamps: 0, history: [] }), false, { date, value: Math.round(bestMax * 10) / 10, trainingId: t.id }, (l) => { l.bestSet = set; l.name = name; });
        const line = map.get(`force:${key}`)?.line;
        if (line && heaviest && (!line.maxLoad || heaviest.weight > line.maxLoad.weight || (heaviest.weight === line.maxLoad.weight && heaviest.reps > line.maxLoad.reps))) line.maxLoad = heaviest;
      } else if (bestReps > 0) {
        push(map, `reps:${key}`, () => ({ key: `reps:${key}`, kind: 'reps', name, sport, best: 0, date, stamps: 0, history: [] }), false, { date, value: bestReps, trainingId: t.id });
      }
    }

    // Endurance : plus longue distance et meilleure allure par sport
    const fam = familyOf(sport);
    const dist = t.distance ?? 0;
    const dur = durationOf(t);
    if (fam === 'cardio' && dist > 0) {
      const sName = getSportName(sport);
      push(map, traduire("distance:{0}", sport), () => ({ key: `distance:${sport}`, kind: 'distance', name: `${sName}, plus longue distance`, sport, best: 0, date, stamps: 0, history: [] }), false, { date, value: dist, trainingId: t.id });
      if (dist >= 1 && dur > 0) {
        const pace = (dur * 60) / dist;
        if (pace > 120 && pace < 1800) {
          push(map, `allure:${sport}`, () => ({ key: `allure:${sport}`, kind: 'allure', name: `${sName}, meilleure allure`, sport, best: 0, date, stamps: 0, history: [] }), true, { date, value: pace, trainingId: t.id });
        }
      }
    }

    // Combat : le plus de rounds dans une seance (repere secondaire, sans tampon)
    if (fam === 'combat_sol' || fam === 'combat_pied') {
      const rounds = parseRounds(t).length || t.rounds || 0;
      if (rounds > 0) {
        const sName = getSportName(sport);
        push(map, `rounds:${sport}`, () => ({ key: `rounds:${sport}`, kind: 'rounds', name: `${sName}, le plus de rounds`, sport, best: 0, date, stamps: 0, history: [], minor: true }), false, { date, value: rounds, trainingId: t.id });
      }
    }

    // Tous les sports sans distance : la seance la plus longue
    if (dur > 0 && !(fam === 'cardio' && dist > 0)) {
      const sName = getSportName(sport);
      push(map, `duree:${sport}`, () => ({ key: `duree:${sport}`, kind: 'duree', name: `${sName}, séance la plus longue`, sport, best: 0, date, stamps: 0, history: [] }), false, { date, value: dur, trainingId: t.id });
    }
  }

  const lines = Array.from(map.values()).map((a) => a.line);
  lines.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.stamps - a.stamps));

  const stampedTrainings = new Map<number, number>();
  const recent: { line: RecordLine; point: RecordPoint }[] = [];
  let totalStamps = 0;
  for (const l of lines) {
    if (l.minor) {
      // les rounds restent visibles dans leur liste, sans tampon
      l.stamps = 0;
      l.history = l.history.map((p) => ({ ...p, isRecord: false }));
      continue;
    }
    totalStamps += l.stamps;
    for (const p of l.history) {
      if (!p.isRecord) continue;
      if (p.trainingId != null) stampedTrainings.set(p.trainingId, (stampedTrainings.get(p.trainingId) ?? 0) + 1);
      recent.push({ line: l, point: p });
    }
  }
  recent.sort((a, b) => (a.point.date < b.point.date ? 1 : a.point.date > b.point.date ? -1 : 0));
  return { lines, totalStamps, stampedTrainings, recent, highlights: pickHighlights(lines) };
}

const KIND_RANK: Record<RecordKind, number> = { force: 0, allure: 1, distance: 2, reps: 3, duree: 4, rounds: 9 };

/** Records a mettre en avant : force (les exercices les plus travailles), endurance, puis duree */
function pickHighlights(lines: RecordLine[]): RecordLine[] {
  return lines
    .filter((l) => !l.minor)
    .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.history.length - a.history.length || (a.date < b.date ? 1 : -1));
}

/** Points de la courbe : une seance par point pour un exercice, sinon la progression du record */
export function chartSeries(line: RecordLine, max = 40): RecordPoint[] {
  const h = line.history.slice(-max);
  if (line.kind === 'force' || line.kind === 'reps') return h;
  // progression du meilleur : courbe en escalier lisible, sans dents de scie
  const out: RecordPoint[] = [];
  let best: number | null = null;
  const lower = line.kind === 'allure';
  for (const p of line.history) {
    if (best == null || (lower ? p.value < best : p.value > best)) {
      best = p.value;
      out.push({ ...p });
    }
  }
  return out.slice(-max);
}

/** Victoires, soumissions par technique et seances les plus longues en combat */
export type CombatSummary = {
  roundsTotal: number;
  wins: number;
  losses: number;
  draws: number;
  /** victoires en competition (palmares) */
  compWins: number;
  compTotal: number;
  submissions: { technique: string; count: number }[];
  submissionsTotal: number;
};

type CompCombat = { resultat?: string; methode?: string; technique?: string };

const NOT_A_SUBMISSION = new Set(['points', traduire('aux points'), 'ko', 'tko', 'décision', 'decision', 'avantages', 'arrêt de l’arbitre', 'abandon', 'dq']);

export function combatSummary(trainings: Training[], combats: CompCombat[] = []): CombatSummary {
  const out: CombatSummary = { roundsTotal: 0, wins: 0, losses: 0, draws: 0, compWins: 0, compTotal: 0, submissions: [], submissionsTotal: 0 };
  const subs = new Map<string, { technique: string; count: number }>();
  const addSub = (raw: string | undefined) => {
    const name = (raw ?? '').trim();
    if (!name || NOT_A_SUBMISSION.has(name.toLowerCase())) return;
    const k = name.toLowerCase();
    const cur = subs.get(k);
    if (cur) cur.count += 1;
    else subs.set(k, { technique: name, count: 1 });
    out.submissionsTotal += 1;
  };
  for (const t of trainings) {
    const fam = familyOf(t.sport);
    if (fam !== 'combat_sol' && fam !== 'combat_pied') continue;
    for (const r of parseRounds(t) as (ReturnType<typeof parseRounds>[number] & { methodsGiven?: string[] })[]) {
      out.roundsTotal += 1;
      if (r.result === 'win') out.wins += 1;
      else if (r.result === 'loss') out.losses += 1;
      else if (r.result === 'draw') out.draws += 1;
      const given = Array.isArray(r.methodsGiven) ? r.methodsGiven : [];
      if (given.length) given.forEach(addSub);
      else if (r.result === 'win' && r.method) addSub(r.method);
    }
  }
  for (const c of combats) {
    out.compTotal += 1;
    if (c.resultat === 'victoire') {
      out.compWins += 1;
      if (c.methode === 'soumission') addSub(c.technique || 'Soumission');
    }
  }
  out.submissions = Array.from(subs.values()).sort((a, b) => b.count - a.count);
  return out;
}

/** Regularite : meilleure semaine, semaines d'affilee, volume total */
export type Regularity = {
  totalSessions: number;
  totalMinutes: number;
  bestWeek: { count: number; monday: string } | null;
  longestWeekStreak: number;
  currentWeekStreak: number;
};

function mondayIso(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addWeeks(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n * 7);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function regularity(trainings: Training[], today: string): Regularity {
  const weeks = new Map<string, number>();
  let totalMinutes = 0;
  for (const t of trainings) {
    if (!t?.date) continue;
    const m = mondayIso(t.date);
    weeks.set(m, (weeks.get(m) ?? 0) + 1);
    totalMinutes += durationOf(t);
  }
  let bestWeek: Regularity['bestWeek'] = null;
  weeks.forEach((count, monday) => {
    if (!bestWeek || count > bestWeek.count || (count === bestWeek.count && monday > bestWeek.monday)) bestWeek = { count, monday };
  });
  const sorted = Array.from(weeks.keys()).sort();
  let longest = 0;
  let run = 0;
  let prev = '';
  for (const m of sorted) {
    run = prev && addWeeks(prev, 1) === m ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = m;
  }
  // semaines d'affilee jusqu'a maintenant (la semaine en cours compte si elle a deja une seance)
  let cur = 0;
  let w = mondayIso(today);
  if (!weeks.has(w)) w = addWeeks(w, -1);
  while (weeks.has(w)) {
    cur += 1;
    w = addWeeks(w, -1);
  }
  return { totalSessions: trainings.length, totalMinutes, bestWeek, longestWeekStreak: longest, currentWeekStreak: cur };
}

/** Records battus pendant une seance donnee */
export function recordsOfTraining(result: RecordsResult, trainingId: number | undefined): { line: RecordLine; point: RecordPoint }[] {
  if (trainingId == null) return [];
  return result.recent.filter((r) => r.point.trainingId === trainingId);
}

export function formatRecordValue(line: RecordLine, value?: number, unite: UnitePoids = 'kg'): { main: string; sub: string } {
  const v = value ?? line.best;
  const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', DECIMAL);
  switch (line.kind) {
    case 'force': {
      // 18 octobre 2026 : charges stockees en kilos, affichees dans l'unite du reglage (kg ou lb)
      const u = libelleUnite(unite);
      const c = (kg: number) => versUnitePoids(kg, unite);
      return {
        main: value == null && (line.maxLoad || line.bestSet) ? `${fmt(c((line.maxLoad ?? line.bestSet)!.weight))} ${u} × ${(line.maxLoad ?? line.bestSet)!.reps}` : `${Math.round(c(v))} ${u}`,
        sub: traduire("max estimé {0} {1}", Math.round(c(v)), u),
      };
    }
    case 'reps':
      return { main: traduire("{0} répétitions", Math.round(v)), sub: traduire('au poids du corps') };
    case 'distance':
      return { main: `${fmt(v)} km`, sub: traduire('en une séance') };
    case 'allure': {
      // 18 octobre (audit) : arrondi a la seconde d'abord, jamais « 5:60 »
      const r = Math.round(v);
      const m = Math.floor(r / 60);
      const s = r % 60;
      return { main: `${m}:${String(s).padStart(2, '0')}`, sub: traduire('min par km') };
    }
    case 'rounds':
      return { main: `${Math.round(v)} rounds`, sub: traduire('en une séance') };
    case 'duree': {
      // 18 octobre (audit) : arrondi a la minute d'abord, jamais « 1 h 60 »
      const r = Math.round(v);
      const h = Math.floor(r / 60);
      const m = r % 60;
      return { main: h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`, sub: traduire('en une séance') };
    }
  }
}

/** Libelle court d'un record (le sport est montre par la vignette) : Seances, Carnet */
export function recordShortTitle(l: RecordLine): string {
  if (l.kind === 'force' || l.kind === 'reps') return l.name;
  const rest = l.name.split(', ').slice(1).join(', ');
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : l.name;
}

export function kindUnit(kind: RecordKind): string {
  switch (kind) {
    case 'force':
      return 'kilos';
    case 'reps':
      return traduire('répétitions');
    case 'distance':
      return 'km';
    case 'allure':
      return 'au km';
    case 'rounds':
      return 'rounds';
    case 'duree':
      return traduire('minutes');
  }
}
