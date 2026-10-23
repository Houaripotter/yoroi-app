/**
 * Analyse du sparring (carnet v2) : partenaires, techniques, finitions, semaines, taux de victoire,
 * conseils du coach, records, intensite, jours de la semaine, cardio. Fonctions pures.
 */
import type { CombatRound, Training } from '@/lib/database';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import { parseRounds } from './useCarnetData';

export interface PartnerSession {
  date: string;
  sport: string;
  rounds: CombatRound[];
  technicalTheme?: string;
}

export interface PartnerStats {
  name: string;
  totalRounds: number;
  wins: number;
  losses: number;
  draws: number;
  submissionsGiven: number;
  submissionsTaken: number;
  lastSession?: string;
  sessions: PartnerSession[];
  avgRating?: number;
  ratingHistory?: { date: string; rating: number }[];
}

export type CoachTone = 'danger' | 'info' | 'warn' | 'good';
export type CoachInsight = { text: string; tone: CoachTone; kanji: string };

/** Lundi de la semaine 1 (norme ISO 8601 : la semaine du 4 janvier), a midi heure locale */
function isoWeek1Monday(year: number): Date {
  const jan4 = new Date(year, 0, 4, 12, 0, 0, 0);
  jan4.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  return jan4;
}

/**
 * Semaine ISO 8601 d'un jour (AAAA-MM-JJ, date locale) : du lundi au dimanche, « 2026-W42 ».
 * 18 octobre 2026 (audit) : l'ancien calcul changeait de semaine le samedi et lisait la date en UTC.
 */
export function isoWeekKey(dateStr: string): string {
  const d = new Date(String(dateStr ?? '').slice(0, 10) + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + 3);
  const year = thursday.getFullYear();
  const week = 1 + Math.round((d.getTime() - isoWeek1Monday(year).getTime()) / (7 * 86400000));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Rang d'une semaine « 2026-W42 » : deux semaines qui se suivent ont des rangs consecutifs, meme a cheval sur deux annees */
export function isoWeekIndex(key: string): number {
  const [y, n] = key.split('-W').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(n)) return NaN;
  const monday = isoWeek1Monday(y);
  monday.setDate(monday.getDate() + (n - 1) * 7);
  return Math.round(monday.getTime() / (7 * 86400000));
}

export function currentWeekKey(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return isoWeekKey(`${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`);
}

export function hasCombat(t: Training): boolean {
  return parseRounds(t.combat_rounds).length > 0 || !!t.technical_theme?.trim();
}

export function partnerStatsOf(trainings: Training[]): PartnerStats[] {
  const map: Record<string, PartnerStats> = {};
  for (const tr of trainings) {
    const rounds = parseRounds(tr.combat_rounds);
    const inSession: Record<string, CombatRound[]> = {};
    for (const r of rounds) {
      if (!r.partner?.trim()) continue;
      const key = r.partner.trim().toLowerCase();
      if (!map[key]) map[key] = { name: r.partner.trim(), totalRounds: 0, wins: 0, losses: 0, draws: 0, submissionsGiven: 0, submissionsTaken: 0, lastSession: tr.date, sessions: [] };
      const p = map[key];
      p.totalRounds++;
      if (r.result === 'win') p.wins++;
      else if (r.result === 'loss') p.losses++;
      else if (r.result === 'draw') p.draws++;
      p.submissionsGiven += Math.max(r.submissionsGiven ?? 0, r.methodsGiven?.length ?? 0);
      p.submissionsTaken += Math.max(r.submissionsTaken ?? 0, r.methodsTaken?.length ?? 0);
      if (!p.lastSession || tr.date > p.lastSession) p.lastSession = tr.date;
      if (!inSession[key]) inSession[key] = [];
      inSession[key].push(r);
    }
    for (const [key, pr] of Object.entries(inSession)) {
      map[key]?.sessions.push({ date: tr.date, sport: tr.sport, rounds: pr, technicalTheme: tr.technical_theme });
    }
  }
  for (const p of Object.values(map)) {
    p.sessions.sort((a, b) => b.date.localeCompare(a.date));
    const ratings: { date: string; rating: number }[] = [];
    for (const s of p.sessions) for (const r of s.rounds) if (r.partnerRating) ratings.push({ date: s.date, rating: r.partnerRating });
    if (ratings.length > 0) {
      p.ratingHistory = ratings.sort((a, b) => a.date.localeCompare(b.date));
      p.avgRating = Math.round((ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) * 10) / 10;
    }
  }
  return Object.values(map).sort((a, b) => b.totalRounds - a.totalRounds);
}

export function techniqueStatsOf(trainings: Training[]) {
  const map: Record<string, { name: string; count: number; lastSession?: string }> = {};
  for (const tr of trainings) {
    if (!tr.technical_theme?.trim()) continue;
    const key = tr.technical_theme.trim().toLowerCase();
    if (!map[key]) map[key] = { name: tr.technical_theme.trim(), count: 0, lastSession: tr.date };
    map[key].count++;
    if (tr.date > (map[key].lastSession ?? '')) map[key].lastSession = tr.date;
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

/** Finitions du champ historique "method" (une par round) */
export function submissionStatsOf(trainings: Training[]) {
  const map: Record<string, { name: string; given: number; taken: number }> = {};
  for (const tr of trainings) {
    for (const r of parseRounds(tr.combat_rounds)) {
      if (!r.method?.trim()) continue;
      const key = r.method.trim().toLowerCase();
      if (!map[key]) map[key] = { name: r.method.trim(), given: 0, taken: 0 };
      if (r.result === 'win') map[key].given++;
      else if (r.result === 'loss') map[key].taken++;
    }
  }
  return Object.values(map).sort((a, b) => b.given + b.taken - (a.given + a.taken));
}

export function recentSessionsOf(trainings: Training[], n = 5) {
  return [...trainings]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n)
    .map((tr) => {
      const rounds = parseRounds(tr.combat_rounds);
      return {
        id: tr.id,
        date: tr.date,
        sport: tr.sport,
        roundsCount: rounds.length > 0 ? rounds.length : tr.rounds ?? 0,
        partners: Array.from(new Set(rounds.map((r) => r.partner).filter(Boolean) as string[])),
        technicalTheme: tr.technical_theme,
        wins: rounds.filter((r) => r.result === 'win').length,
        losses: rounds.filter((r) => r.result === 'loss').length,
      };
    });
}

export function weeklyRoundsOf(trainings: Training[]) {
  const map: Record<string, number> = {};
  for (const tr of trainings) {
    const rounds = parseRounds(tr.combat_rounds);
    if (rounds.length === 0 && !(tr.rounds && tr.rounds > 0)) continue;
    const key = isoWeekKey(tr.date);
    map[key] = (map[key] || 0) + (rounds.length > 0 ? rounds.length : tr.rounds ?? 0);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, value]) => ({ label: `S${key.split('-W')[1] ?? ''}`, value }));
}

export function thisWeekRoundsOf(trainings: Training[]): number {
  const cur = currentWeekKey();
  let n = 0;
  for (const tr of trainings) {
    if (isoWeekKey(tr.date) !== cur) continue;
    const rounds = parseRounds(tr.combat_rounds);
    n += rounds.length > 0 ? rounds.length : tr.rounds ?? 0;
  }
  return n;
}

export function monthlyWinRateOf(trainings: Training[]) {
  const map: Record<string, { wins: number; total: number }> = {};
  for (const tr of trainings) {
    for (const r of parseRounds(tr.combat_rounds)) {
      if (r.result !== 'win' && r.result !== 'loss') continue;
      const k = tr.date.slice(0, 7);
      if (!map[k]) map[k] = { wins: 0, total: 0 };
      if (r.result === 'win') map[k].wins++;
      map[k].total++;
    }
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([k, v]) => ({ key: k, value: v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0, total: v.total }));
}

function methodMap(trainings: Training[], field: 'methodsGiven' | 'methodsTaken') {
  const map: Record<string, number> = {};
  for (const tr of trainings) {
    for (const r of parseRounds(tr.combat_rounds)) {
      for (const m of r[field] ?? []) {
        const k = getMethodDisplayName(m.trim());
        if (k) map[k] = (map[k] ?? 0) + 1;
      }
    }
  }
  return map;
}

export function topMethodsOf(trainings: Training[], field: 'methodsGiven' | 'methodsTaken', n = 5): [string, number][] {
  return Object.entries(methodMap(trainings, field)).sort((a, b) => b[1] - a[1]).slice(0, n);
}

export function methodsCombinedOf(trainings: Training[]) {
  const g = methodMap(trainings, 'methodsGiven');
  const t = methodMap(trainings, 'methodsTaken');
  return Array.from(new Set([...Object.keys(g), ...Object.keys(t)]))
    .map((method) => ({ method, given: g[method] || 0, taken: t[method] || 0 }))
    .sort((a, b) => b.given + b.taken - (a.given + a.taken));
}

export function coachInsightsOf(partners: PartnerStats[], topTaken: [string, number][], totals: { wins: number; losses: number; winRate: number | null }): CoachInsight[] {
  const out: CoachInsight[] = [];
  if (partners.length === 0) return out;
  if (topTaken.length > 0 && topTaken[0][1] >= 2) out.push({ text: `On te place ${topTaken[0][0]} ${topTaken[0][1]} fois. Priorité : travaille ta défense.`, tone: 'danger', kanji: '' });
  const ratings = partners.filter((p) => p.avgRating != null).map((p) => p.avgRating!);
  if (ratings.length >= 2) {
    const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
    out.push({ text: `Niveau moyen de tes partenaires : ${String(avg).replace('.', ',')} sur 10.`, tone: avg <= 4 ? 'good' : avg <= 7 ? 'warn' : 'info', kanji: '' });
  }
  const tough = partners.filter((p) => p.losses >= 2 && p.wins === 0);
  if (tough.length > 0) out.push({ text: `${tough[0].losses} défaites sans victoire contre ${tough[0].name}. Change de stratégie.`, tone: 'warn', kanji: '' });
  const dormant = partners.find((p) => p.lastSession && Math.floor((Date.now() - new Date(p.lastSession).getTime()) / 86400000) >= 21);
  if (dormant) {
    const d = Math.floor((Date.now() - new Date(dormant.lastSession!).getTime()) / 86400000);
    out.push({ text: `${d} jours sans croiser ${dormant.name}. Retente pour mesurer tes progrès.`, tone: 'info', kanji: '' });
  }
  if (totals.winRate != null && totals.wins + totals.losses >= 3) {
    if (totals.winRate >= 70) out.push({ text: `${totals.winRate} % de victoires : tu domines. Cherche plus fort que toi.`, tone: 'good', kanji: '' });
    else if (totals.winRate <= 30) out.push({ text: `${totals.winRate} % de victoires : phase d’apprentissage. Un seul objectif par séance.`, tone: 'danger', kanji: '' });
  }
  const easy = partners.some((p) => p.wins > 0 && (p.avgRating ?? 5) <= 3);
  const hard = partners.some((p) => p.wins > 0 && (p.avgRating ?? 5) >= 6);
  if (easy && !hard && partners.length >= 3) out.push({ text: 'Tu bats les débutants, pas encore les intermédiaires. Prochain défi : un round face à du 6 sur 10.', tone: 'info', kanji: '' });
  return out.slice(0, 4);
}

export function sparringRecordsOf(trainings: Training[]) {
  const withRounds = trainings.filter((tr) => parseRounds(tr.combat_rounds).length > 0);
  let longest: { date: string; n: number } | null = null;
  let mostSubs: { date: string; n: number } | null = null;
  let best: { date: string; rate: number; wins: number; total: number } | null = null;
  for (const tr of withRounds) {
    const rounds = parseRounds(tr.combat_rounds);
    if (!longest || rounds.length > longest.n) longest = { date: tr.date, n: rounds.length };
    const subs = rounds.reduce((s, r) => s + (r.methodsGiven?.length ?? 0), 0);
    if (subs > 0 && (!mostSubs || subs > mostSubs.n)) mostSubs = { date: tr.date, n: subs };
    if (rounds.length >= 4) {
      const wins = rounds.filter((r) => r.result === 'win').length;
      const rate = (wins / rounds.length) * 100;
      if (rate > 0 && (!best || rate > best.rate)) best = { date: tr.date, rate, wins, total: rounds.length };
    }
  }
  return { longest, mostSubs, best };
}

export function byIntensityOf(trainings: Training[]) {
  const by: Record<'guerre' | 'technique' | 'detendu', { wins: number; losses: number; draws: number; total: number }> = {
    guerre: { wins: 0, losses: 0, draws: 0, total: 0 },
    technique: { wins: 0, losses: 0, draws: 0, total: 0 },
    detendu: { wins: 0, losses: 0, draws: 0, total: 0 },
  };
  for (const tr of trainings) {
    for (const r of parseRounds(tr.combat_rounds)) {
      const k = (r.roundIntensity || 'technique') as keyof typeof by;
      if (!by[k]) continue;
      if (r.result === 'win') by[k].wins++;
      else if (r.result === 'loss') by[k].losses++;
      else if (r.result === 'draw') by[k].draws++;
      by[k].total++;
    }
  }
  return by;
}

export function byWeekdayOf(trainings: Training[]) {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const by = days.map((label) => ({ label, wins: 0, total: 0, sessions: 0 }));
  for (const tr of trainings) {
    const rounds = parseRounds(tr.combat_rounds);
    if (rounds.length === 0) continue;
    const d = new Date(String(tr.date ?? '').slice(0, 10) + 'T12:00:00');
    if (!isFinite(d.getTime())) continue;
    const i = d.getDay();
    by[i].sessions++;
    for (const r of rounds) {
      if (r.result === 'win') by[i].wins++;
      if (r.result) by[i].total++;
    }
  }
  return [1, 2, 3, 4, 5, 6, 0].map((i) => by[i]);
}

export function cardioOf(trainings: Training[]) {
  const hr = trainings.filter((t) => t.heart_rate && t.heart_rate > 0);
  const cal = trainings.filter((t) => t.calories && t.calories > 0);
  const dur = trainings.filter((t) => t.duration_minutes && t.duration_minutes > 0);
  return {
    avgHR: hr.length > 0 ? Math.round(hr.reduce((s, t) => s + (t.heart_rate || 0), 0) / hr.length) : null,
    hrCount: hr.length,
    maxHR: hr.length > 0 ? Math.max(...hr.map((t) => t.max_heart_rate || t.heart_rate || 0)) : null,
    kcal: cal.reduce((s, t) => s + (t.calories || 0), 0),
    hours: dur.reduce((s, t) => s + (t.duration_minutes || 0), 0) / 60,
  };
}

/** Evolution mensuelle des 3 finitions les plus donnees (6 derniers mois) */
export function methodsTimelineOf(trainings: Training[], months: string[]) {
  const total: Record<string, number> = {};
  const per: Record<string, Record<string, number>> = {};
  for (const tr of trainings) {
    const k = tr.date.slice(0, 7);
    for (const r of parseRounds(tr.combat_rounds)) {
      for (const m of r.methodsGiven ?? []) {
        const name = getMethodDisplayName(m.trim());
        if (!name) continue;
        total[name] = (total[name] || 0) + 1;
        if (!per[name]) per[name] = {};
        per[name][k] = (per[name][k] || 0) + 1;
      }
    }
  }
  const top = Object.entries(total).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);
  return top.map((name) => ({ name, values: months.map((m) => per[name]?.[m] || 0) }));
}

export function streakDaysOf(trainings: Training[]): { current: number; best: number } {
  const days = Array.from(new Set(trainings.map((t) => t.date.slice(0, 10)))).sort();
  if (days.length === 0) return { current: 0, best: 0 };
  // Serie en semaines actives (au moins un jour de combat dans la semaine)
  const weeks = Array.from(new Set(days.map((d) => isoWeekKey(d)).filter(Boolean))).sort();
  let best = 1;
  let run = 1;
  const idx = isoWeekIndex;
  for (let i = 1; i < weeks.length; i++) {
    if (idx(weeks[i]) - idx(weeks[i - 1]) === 1) run++;
    else run = 1;
    best = Math.max(best, run);
  }
  const cur = idx(currentWeekKey());
  const last = idx(weeks[weeks.length - 1]);
  let current = 0;
  if (cur - last <= 1) {
    current = 1;
    for (let i = weeks.length - 1; i > 0; i--) {
      if (idx(weeks[i]) - idx(weeks[i - 1]) === 1) current++;
      else break;
    }
  }
  return { current, best };
}
