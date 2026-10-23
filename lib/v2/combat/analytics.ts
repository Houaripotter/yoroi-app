/**
 * Agregats de l'analyse de combat et du suivi des debriefs (refonte v2).
 * Memes regles de calcul que les anciens ecrans.
 */
import type { CombatRound, Training } from '@/lib/database';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import { countFreq, monthShort, parseDate, roundsOf } from './rounds';
import { traduire } from '@/lib/i18n/tr';

export interface PartnerAgg {
  name: string;
  totalRounds: number;
  wins: number;
  losses: number;
  draws: number;
  submissionsGiven: number;
  submissionsTaken: number;
  lastSession?: string;
}

export function partnerAggregates(trainings: Training[]): PartnerAgg[] {
  const map: Record<string, PartnerAgg> = {};
  for (const tr of trainings) {
    for (const r of roundsOf(tr)) {
      const name = r.partner?.trim();
      if (!name) continue;
      const k = name.toLowerCase();
      if (!map[k]) map[k] = { name, totalRounds: 0, wins: 0, losses: 0, draws: 0, submissionsGiven: 0, submissionsTaken: 0, lastSession: tr.date };
      const p = map[k];
      p.totalRounds++;
      if (r.result === 'win') p.wins++;
      else if (r.result === 'loss') p.losses++;
      else if (r.result === 'draw') p.draws++;
      p.submissionsGiven += r.submissionsGiven ?? 0;
      p.submissionsTaken += r.submissionsTaken ?? 0;
      if (!p.lastSession || tr.date > p.lastSession) p.lastSession = tr.date;
    }
  }
  return Object.values(map).sort((a, b) => b.totalRounds - a.totalRounds);
}

export function techniqueAggregates(trainings: Training[]): { name: string; count: number; lastSession?: string }[] {
  const map: Record<string, { name: string; count: number; lastSession?: string }> = {};
  for (const tr of trainings) {
    const theme = tr.technical_theme?.trim();
    if (!theme) continue;
    const k = theme.toLowerCase();
    if (!map[k]) map[k] = { name: theme, count: 0, lastSession: tr.date };
    map[k].count++;
    if (!map[k].lastSession || tr.date > (map[k].lastSession ?? '')) map[k].lastSession = tr.date;
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

export function submissionAggregates(trainings: Training[]): { name: string; given: number; taken: number }[] {
  const map: Record<string, { name: string; given: number; taken: number }> = {};
  const add = (raw: string, side: 'given' | 'taken') => {
    const name = getMethodDisplayName(raw.trim());
    const k = name.toLowerCase();
    if (!k) return;
    if (!map[k]) map[k] = { name, given: 0, taken: 0 };
    map[k][side]++;
  };
  for (const tr of trainings) {
    for (const r of roundsOf(tr)) {
      r.methodsGiven?.forEach((m) => add(m, 'given'));
      r.methodsTaken?.forEach((m) => add(m, 'taken'));
      if (!r.methodsGiven?.length && !r.methodsTaken?.length && r.method?.trim()) {
        if (r.result === 'win') add(r.method, 'given');
        else if (r.result === 'loss') add(r.method, 'taken');
      }
    }
  }
  return Object.values(map).sort((a, b) => b.given + b.taken - (a.given + a.taken));
}

function hasType(tr: Training, kw: string): boolean {
  if (tr.session_type?.toLowerCase().includes(kw)) return true;
  if (tr.session_types) {
    try {
      const arr: unknown = JSON.parse(tr.session_types);
      if (Array.isArray(arr)) return arr.some((s) => typeof s === 'string' && s.toLowerCase().includes(kw));
    } catch {
      // format inattendu
    }
  }
  return false;
}

export function drillSparRatio(trainings: Training[]) {
  const now = new Date();
  const months: { key: string; label: string; a: number; b: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthShort(d.getMonth()).slice(0, 4).replace('.', ''), a: 0, b: 0 });
  }
  let drilling = 0;
  let sparring = 0;
  for (const tr of trainings) {
    const d = parseDate(tr.date);
    const slot = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (!slot) continue;
    if (hasType(tr, 'drill')) {
      slot.a++;
      drilling++;
    }
    if (hasType(tr, 'sparring')) {
      slot.b++;
      sparring++;
    }
  }
  const total = drilling + sparring;
  const dPct = total > 0 ? Math.round((drilling / total) * 100) : 0;
  const sPct = total > 0 ? 100 - dPct : 0;
  let advice = '';
  if (total > 0) {
    if (dPct > 80) advice = traduire('Beaucoup de drilling : ajoute du sparring pour tester en vrai.');
    else if (dPct < 20) advice = traduire('Beaucoup de sparring : ajoute du drilling pour ancrer tes techniques.');
    else if (dPct >= 50 && dPct <= 70) advice = traduire('Bonne alternance entre drilling et sparring.');
    else advice = traduire("{0} % de drilling, {1} % de sparring.", dPct, sPct);
  }
  return { months, drilling, sparring, total, dPct, sPct, advice };
}

// ─── Debriefs de rounds ───────────────────────────────────────────────

export const MOODS: Record<string, { label: string; color: string; kanji: string }> = {
  fire: { label: traduire('Au top'), color: '#D9822B', kanji: '炎' },
  strong: { label: traduire('En forme'), color: '#4F6B28', kanji: '強' },
  focus: { label: traduire('Concentré'), color: '#2C4A84', kanji: '集' },
  flow: { label: traduire('Dans le flow'), color: '#3D5D9E', kanji: '流' },
  gassed: { label: traduire('Essoufflé'), color: '#A8832F', kanji: '息' },
  tired: { label: traduire('Fatigué'), color: '#8B8D96', kanji: '疲' },
  confused: { label: 'Perdu', color: '#9C5B33', kanji: '迷' },
  frustrated: { label: traduire('Frustré'), color: '#7B3B63', kanji: '怒' },
};

function splitItems(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 80);
}

export type DebriefRound = CombatRound & { date: string; sport: string };

export function debriefStats(trainings: Training[], sport: string | 'all') {
  const filtered = trainings.filter((t) => roundsOf(t).length > 0 && (sport === 'all' || t.sport === sport));
  const all: DebriefRound[] = [];
  for (const t of filtered) for (const r of roundsOf(t)) all.push({ ...r, date: t.date, sport: t.sport });
  const debriefed = all.filter((r) => !!(r.selfRating || r.mood || r.gamePlan || r.whatWorked || r.whatDidntWork || r.counteredBy || r.improvement));
  const ratings = debriefed.map((r) => r.selfRating).filter((v): v is number => typeof v === 'number' && v > 0);
  const avgRating = ratings.length > 0 ? ratings.reduce((s, v) => s + v, 0) / ratings.length : 0;
  const moodCounts = new Map<string, number>();
  for (const r of debriefed) if (r.mood) moodCounts.set(r.mood, (moodCounts.get(r.mood) ?? 0) + 1);
  const moods = Array.from(moodCounts.entries())
    .filter(([id]) => !!MOODS[id])
    .map(([id, count]) => ({ id, count, info: MOODS[id] }))
    .sort((a, b) => b.count - a.count);
  const totalMoods = moods.reduce((s, m) => s + m.count, 0) || 1;
  const topWorked = countFreq(debriefed.flatMap((r) => splitItems(r.whatWorked))).slice(0, 5);
  const topProblems = countFreq([...debriefed.flatMap((r) => splitItems(r.whatDidntWork)), ...debriefed.flatMap((r) => splitItems(r.counteredBy))]).slice(0, 5);
  const topObjectives = countFreq(debriefed.flatMap((r) => splitItems(r.improvement))).slice(0, 5);
  const bySession = new Map<string, number[]>();
  for (const r of debriefed) {
    if (typeof r.selfRating !== 'number') continue;
    const arr = bySession.get(r.date) ?? [];
    arr.push(r.selfRating);
    bySession.set(r.date, arr);
  }
  const evolution = Array.from(bySession.entries())
    .map(([date, arr]) => ({ date, avg: arr.reduce((s, v) => s + v, 0) / arr.length }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);
  const sports = Array.from(new Set(trainings.filter((t) => roundsOf(t).length > 0).map((t) => t.sport))).sort();
  return { nbSessions: filtered.length, nbRounds: all.length, nbDebriefed: debriefed.length, avgRating, moods, totalMoods, topWorked, topProblems, topObjectives, evolution, sports };
}
