/**
 * Partenaires de sparring (refonte v2) : stockage (meme cle que l'ancien ecran),
 * statistiques reelles calculees depuis les rounds enregistres, rangs et tiers.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import type { CombatRound, Training } from '@/lib/database';
import type { Archetype, ExperienceLevel, PartnerBadge, PartnerMedia, PartnerMission } from '@/lib/partnerModel';
import { countResults, letterOf, roundMatchesPartner, roundsOf } from './rounds';
import type { Letter } from './rounds';
import { traduire } from '@/lib/i18n/tr';

export const PARTNERS_KEY = '@yoroi_sparring_partners';
export const PARTNERS_CHANGED_EVENT = 'YOROI_PARTNERS_CHANGED';

export interface TacticalNote {
  id: string;
  date: string;
  content: string;
}

export interface StyleStats {
  garde: number;
  passage: number;
  debout: number;
  cardio: number;
  explosivite: number;
}

export interface AudioNote {
  id: string;
  uri: string;
  date: string;
  durationMs: number;
}

export interface Partner {
  id: string;
  name: string;
  belt?: string;
  weight?: string;
  sport?: string;
  photoUri?: string;
  strengths: string[];
  weaknesses: string[];
  whatWorks: string[];
  notes: TacticalNote[];
  matchCount: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
  activeGoal?: { text: string; createdAt: string };
  longTermGoal?: { text: string; targetWinRate: number; deadline: string; createdAt: string };
  archetype?: Archetype;
  experienceLevel?: ExperienceLevel;
  weightDeltaKg?: number;
  heightDeltaCm?: number;
  reachDeltaCm?: number;
  media?: PartnerMedia[];
  unlockedBadges?: PartnerBadge[];
  missions?: PartnerMission[];
  styleStats?: StyleStats;
  dangerousMoves?: string[];
  similarTo?: string;
  nickname?: string;
  gardePreferred?: string[];
  audioNotes?: AudioNote[];
}

function normalize(p: Partial<Partner> & { id: string; name: string }): Partner {
  return {
    strengths: [],
    weaknesses: [],
    whatWorks: [],
    notes: [],
    matchCount: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    createdAt: new Date().toISOString(),
    ...p,
  } as Partner;
}

export async function loadPartners(): Promise<Partner[]> {
  try {
    const raw = await AsyncStorage.getItem(PARTNERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && p.id && p.name).map((p) => normalize(p));
  } catch {
    return [];
  }
}

/** Ecrit la liste et previent les autres ecrans */
export async function savePartners(partners: Partner[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PARTNERS_KEY, JSON.stringify(partners));
    DeviceEventEmitter.emit(PARTNERS_CHANGED_EVENT);
  } catch {
    // stockage indisponible : l'etat local reste a jour
  }
}

/**
 * Enregistre un partenaire en gardant les champs ecrits ailleurs entre-temps
 * (badges debloques et missions du mois sont ecrits directement par leurs services).
 */
export async function upsertPartner(p: Partner): Promise<Partner[]> {
  const list = await loadPartners();
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx < 0) {
    const next = [p, ...list];
    await savePartners(next);
    return next;
  }
  const stored = list[idx];
  const merged: Partner = {
    ...stored,
    ...p,
    unlockedBadges: mergeById(stored.unlockedBadges, p.unlockedBadges),
    missions: stored.missions ?? p.missions,
  };
  const next = [...list];
  next[idx] = merged;
  await savePartners(next);
  return next;
}

function mergeById<T extends { id: string }>(a?: T[], b?: T[]): T[] | undefined {
  if (!a && !b) return undefined;
  const map = new Map<string, T>();
  for (const x of a ?? []) map.set(x.id, x);
  for (const x of b ?? []) if (!map.has(x.id)) map.set(x.id, x);
  return Array.from(map.values());
}

export async function deletePartner(id: string): Promise<Partner[]> {
  const list = await loadPartners();
  const next = list.filter((p) => p.id !== id);
  await savePartners(next);
  return next;
}

export function newPartner(name: string, id: string): Partner {
  return normalize({ id, name: name.trim(), createdAt: new Date().toISOString() });
}

// ─── Statistiques reelles ─────────────────────────────────────────────

export interface SessionEntry {
  training: Training;
  rounds: CombatRound[];
}

export interface LiveStats {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number | null; // victoires sur rounds decides (V+D+N)
  winRateVD: number | null; // victoires sur V+D (ancienne regle du tier)
  lastDate?: string;
  avgRating?: number;
  sessions: number;
  trend: 'up' | 'down' | 'stable';
  progressionScore: number;
}

/** Seances (plus recentes d'abord) qui contiennent au moins un round avec ce partenaire */
export function sessionsWith(trainings: Training[], name: string): SessionEntry[] {
  const out: SessionEntry[] = [];
  for (const t of trainings) {
    const rounds = roundsOf(t).filter((r) => roundMatchesPartner(r, name));
    if (rounds.length > 0) out.push({ training: t, rounds });
  }
  return out.sort((a, b) => b.training.date.localeCompare(a.training.date));
}

export function liveStatsOf(entries: SessionEntry[]): LiveStats {
  const all = entries.flatMap((e) => e.rounds);
  const { wins, losses, draws, total } = countResults(all);
  let ratingSum = 0;
  let ratingCount = 0;
  for (const r of all) {
    if (r.partnerRating) {
      ratingSum += r.partnerRating;
      ratingCount++;
    }
  }
  // Tendance : 3 dernieres seances contre les 3 precedentes (meme regle que l'ancien classement)
  const asc = [...entries].reverse();
  const rates: number[] = [];
  for (const e of asc) {
    const c = countResults(e.rounds);
    if (c.total > 0) rates.push(c.wins / c.total);
  }
  let trend: LiveStats['trend'] = 'stable';
  let progressionScore = Math.round((rates[0] ?? 0) * 100);
  if (rates.length >= 2) {
    const recent = rates.slice(-3);
    const older = rates.slice(-6, -3);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgOlder = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : rates.slice(0, recent.length).reduce((a, b) => a + b, 0) / recent.length;
    const diff = avgRecent - avgOlder;
    trend = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'stable';
    progressionScore = Math.round(avgRecent * 100);
  }
  return {
    wins,
    losses,
    draws,
    total,
    winRate: total > 0 ? Math.round((wins / total) * 100) : null,
    winRateVD: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null,
    lastDate: entries[0]?.training.date,
    avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : undefined,
    sessions: entries.length,
    trend,
    progressionScore,
  };
}

/** Statistiques reelles quand il y a des rounds, sinon les anciens champs stockes */
export function effectiveStats(p: Partner, live?: LiveStats): LiveStats {
  if (live && live.total > 0) return live;
  const wins = p.wins || 0;
  const losses = p.losses || 0;
  const draws = p.draws || 0;
  const total = p.matchCount || wins + losses + draws;
  const decided = wins + losses + draws;
  return {
    wins,
    losses,
    draws,
    total,
    winRate: decided > 0 ? Math.round((wins / decided) * 100) : null,
    winRateVD: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null,
    lastDate: live?.lastDate,
    avgRating: live?.avgRating,
    sessions: live?.sessions ?? 0,
    trend: 'stable',
    progressionScore: decided > 0 ? Math.round((wins / decided) * 100) : 0,
  };
}

export function allStats(partners: Partner[], trainings: Training[]): Record<string, { live: LiveStats; entries: SessionEntry[] }> {
  const out: Record<string, { live: LiveStats; entries: SessionEntry[] }> = {};
  for (const p of partners) {
    const entries = sessionsWith(trainings, p.name);
    out[p.id] = { entries, live: liveStatsOf(entries) };
  }
  return out;
}

/** Points V/D/N par round, dates croissantes, pour timelines et series */
export function matchupsOf(entries: SessionEntry[]): { date: string; result: Letter | null; tapOut: boolean }[] {
  return entries.flatMap((e) =>
    e.rounds.map((r) => ({
      date: e.training.date,
      result: letterOf(r.result ?? null),
      tapOut: r.result === 'loss' && (r.methodsTaken?.length ?? 0) > 0,
    })),
  );
}

// ─── Tiers (classement par domination) ─────────────────────────────────

export type Tier = 'S' | 'A' | 'B' | 'C' | 'D';

export const TIER_META: Record<Tier, { name: string; kanji: string; color: string; description: string }> = {
  S: { name: traduire('Bêtes noires'), kanji: '鬼', color: '#B0282E', description: traduire('Tu gagnes moins de 30 % de tes rounds contre eux.') },
  A: { name: 'Difficiles', kanji: '険', color: '#A8832F', description: traduire('Gros défis, tu gagnes entre 30 et 50 %.') },
  B: { name: 'Équilibrés', kanji: '均', color: '#3D5D9E', description: traduire('Combat à armes égales, entre 50 et 65 %.') },
  C: { name: 'Dominés', kanji: '勝', color: '#4F6B28', description: traduire('Tu maîtrises, plus de 65 % de victoires.') },
  D: { name: 'À évaluer', kanji: '未', color: '#8B8D96', description: traduire('Moins de trois rounds, pas assez pour juger.') },
};

export function tierOf(winRateVD: number | null, total: number): Tier {
  if (total < 3 || winRateVD == null) return 'D';
  if (winRateVD < 30) return 'S';
  if (winRateVD < 50) return 'A';
  if (winRateVD < 65) return 'B';
  return 'C';
}

/** Teinte de taux de victoire (meme seuils que l'ancienne matrice) */
export function winrateTone(wr: number | null): string {
  if (wr == null) return '#8B8D96';
  if (wr >= 70) return '#4F6B28';
  if (wr >= 50) return '#3D5D9E';
  if (wr >= 30) return '#A8832F';
  return '#B0282E';
}
