/**
 * Analyse d'un partenaire a partir des vrais rounds : bilan, series, finitions,
 * tendances, niveau percu, prediction, zones attaquees, plan de jeu.
 * Calculs repris a l'identique de l'ancien carnet tactique.
 */
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import { computePartnerStreaks } from '@/lib/partnerStreaksService';
import type { PartnerStreakData } from '@/lib/partnerStreaksService';
import { countFreq, countResults, monthShort, parseDate } from './rounds';
import type { Letter, Result } from './rounds';
import { matchupsOf } from './partners';
import type { Partner, SessionEntry, StyleStats } from './partners';
import { traduire } from '@/lib/i18n/tr';

export type Zone = 'neck' | 'arms' | 'torso' | 'legs' | 'back';
export const ZONE_LABELS: Record<Zone, string> = {
  neck: traduire('Cou, étranglements'),
  arms: traduire('Bras, clés'),
  torso: 'Torse, pressions',
  legs: traduire('Jambes, clés de jambe'),
  back: traduire('Dos, prise du dos'),
};

export function zoneFromMethod(method: string): Zone | null {
  const m = method.toLowerCase();
  if (/triangle|bras|omoplata|kimura|americana|coude|levier.*bras|armbar|clé de bras/.test(m)) return 'arms';
  if (/etranglement|étranglement|strangul|mata|leao|leão|ezekiel|col|north south|nord-sud|guillotine|choke|d'arce|anaconda/.test(m)) return 'neck';
  if (/jambe|cheville|genou|heel|knee|ankle|leg|toe/.test(m)) return 'legs';
  if (/dos|rnc|rear naked|sangles/.test(m)) return 'back';
  if (/mount|pression|passage|side control|kesa|flanc/.test(m)) return 'torso';
  return null;
}

export const DEFAULT_STYLE: StyleStats = { garde: 3, passage: 3, debout: 3, cardio: 3, explosivite: 3 };
export const STYLE_AXES: { key: keyof StyleStats; label: string }[] = [
  { key: 'garde', label: 'Garde' },
  { key: 'passage', label: 'Passage' },
  { key: 'debout', label: 'Debout' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'explosivite', label: traduire('Explosivité') },
];

export interface PartnerInsights {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number | null;
  blocks: { result: Result; date: string }[]; // une par seance, plus recente d'abord
  currentStreak: { type: 'win' | 'loss'; count: number } | null;
  topGiven: { label: string; count: number }[];
  topTaken: { label: string; count: number }[];
  topWhatWorked: { label: string; count: number }[];
  lastImprovement: { text: string; date: string } | null;
  lastGamePlan?: string;
  lastWorked?: string;
  lastDidnt?: string;
  monthly: { key: string; label: string; rate: number; total: number }[];
  year: { label: string; value: number | null }[];
  pointsFor: number;
  pointsAgainst: number;
  methodsGiven: { label: string; count: number }[];
  methodsTaken: { label: string; count: number }[];
  subGiven: number;
  subTaken: number;
  intensity: { guerre: number; technique: number; detendu: number };
  avgRating: number | null;
  ratings: { date: string; rating: number }[];
  ratingTrend: number;
  title: { label: string; kanji: string; color: string; description: string };
  threat: number; // 0 a 100
  prediction: { value: number; confidence: 'faible' | 'moyenne' | 'élevée'; trend: 'up' | 'down' | 'neutral'; mood: string };
  momentum: { label: string; color: string };
  matchups: { date: string; result: Letter | null; tapOut: boolean }[];
  streaks: PartnerStreakData;
  weeksInARow: number;
  zones: Record<Zone, number>;
  fighterThreat: { score: number; label: string; color: string };
}

export function analyzePartner(p: Partner, entries: SessionEntry[]): PartnerInsights {
  const allRounds = entries.flatMap((e) => e.rounds);
  const { wins, losses, draws, total } = countResults(allRounds);
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null;

  const blocks = entries.map((e) => {
    const c = countResults(e.rounds);
    const result: Result = c.wins > c.losses ? 'win' : c.losses > c.wins ? 'loss' : 'draw';
    return { result, date: e.training.date };
  });

  let currentStreak: PartnerInsights['currentStreak'] = null;
  if (blocks.length > 0 && blocks[0].result !== 'draw') {
    const first = blocks[0].result as 'win' | 'loss';
    let count = 0;
    for (const b of blocks) {
      if (b.result === first) count++;
      else break;
    }
    currentStreak = { type: first, count };
  }

  const given = allRounds.flatMap((r) => (r.methodsGiven ?? []).map(getMethodDisplayName));
  const taken = allRounds.flatMap((r) => (r.methodsTaken ?? []).map(getMethodDisplayName));
  const methodsGiven = countFreq(given);
  const methodsTaken = countFreq(taken);
  const topGiven = methodsGiven.slice(0, 3);
  const topTaken = methodsTaken.slice(0, 3);

  let lastImprovement: PartnerInsights['lastImprovement'] = null;
  outer: for (const e of entries) {
    for (const r of e.rounds) {
      if (r.improvement) {
        lastImprovement = { text: r.improvement, date: e.training.date };
        break outer;
      }
    }
  }
  const lastGamePlan = allRounds.map((r) => r.gamePlan).find(Boolean);
  const lastWorked = allRounds.map((r) => r.whatWorked).find(Boolean);
  const lastDidnt = allRounds.map((r) => r.whatDidntWork).find(Boolean);

  const worked = allRounds.map((r) => r.whatWorked).filter((s): s is string => !!s);
  const topWhatWorked = countFreq(worked.flatMap((s) => s.split(/[,;.]+/).map((w) => w.trim()).filter((w) => w.length > 3))).slice(0, 3);

  // Taux de victoire par mois (6 derniers mois avec donnees)
  const map: Record<string, { wins: number; total: number }> = {};
  for (const e of entries) {
    const d = parseDate(e.training.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { wins: 0, total: 0 };
    const c = countResults(e.rounds);
    map[key].wins += c.wins;
    map[key].total += c.total;
  }
  const monthly = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, v]) => ({ key, label: monthShort(Number(key.split('-')[1]) - 1), rate: v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0, total: v.total }));

  // Courbe 12 mois (V contre D, nuls exclus, comme l'ancienne courbe)
  const matchups = matchupsOf(entries);
  const now = new Date();
  const year: { key: string; label: string; w: number; l: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    year.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthShort(d.getMonth()).replace('.', '').slice(0, 4), w: 0, l: 0 });
  }
  for (const m of matchups) {
    if (m.result !== 'V' && m.result !== 'D') continue;
    const d = parseDate(m.date);
    const slot = year.find((y) => y.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (!slot) continue;
    if (m.result === 'V') slot.w++;
    else slot.l++;
  }

  let pointsFor = 0;
  let pointsAgainst = 0;
  const intensity = { guerre: 0, technique: 0, detendu: 0 };
  let ratingSum = 0;
  let ratingCount = 0;
  for (const r of allRounds) {
    pointsFor += r.pointsFor ?? 0;
    pointsAgainst += r.pointsAgainst ?? 0;
    if (r.roundIntensity && r.roundIntensity in intensity) intensity[r.roundIntensity] += 1;
    if (r.partnerRating) {
      ratingSum += r.partnerRating;
      ratingCount++;
    }
  }
  const avgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;
  const ratings: { date: string; rating: number }[] = [];
  for (const e of [...entries].reverse()) for (const r of e.rounds) if (r.partnerRating) ratings.push({ date: e.training.date, rating: r.partnerRating });
  const ratingTrend = ratings.length > 0 ? ratings[ratings.length - 1].rating - ratings[0].rating : 0;

  const decided = wins + losses;
  let title: PartnerInsights['title'];
  if (decided === 0) title = { label: traduire('Nouveau'), kanji: '新', color: '#8B8D96', description: traduire('Pas encore de round enregistré') };
  else if (losses >= 3 && wins === 0) title = { label: traduire('Némésis'), kanji: '敵', color: '#B0282E', description: traduire("{0} défaites sans riposte", losses) };
  else if (wins >= 3 && losses === 0) title = { label: traduire('Dominé'), kanji: '勝', color: '#A8832F', description: traduire("{0} victoires sans défaite", wins) };
  else if (decided >= 10) title = { label: traduire('Légende'), kanji: '伝', color: '#2C4A84', description: `${decided} rounds ensemble` };
  else if (total >= 5 && Math.abs(wins - losses) <= 1) title = { label: 'Rival', kanji: '競', color: '#2C4A84', description: traduire('Score équilibré') };
  else if (winRate != null && winRate >= 60) title = { label: 'Favorable', kanji: '利', color: '#4F6B28', description: traduire("{0} % de victoires", winRate) };
  else if (winRate != null && winRate <= 30) title = { label: traduire('Défi'), kanji: '挑', color: '#A8832F', description: 'Opposition difficile' };
  else title = { label: 'Partenaire', kanji: '友', color: '#3D5D9E', description: `${decided} rounds` };

  const threat = total === 0 ? 50 : Math.round(((losses / total) * 0.6 + ((avgRating ?? 5) / 10) * 0.4) * 100);

  // Prediction avant de rouler (meme formule que l'ancien predicteur)
  const recent = blocks.slice(0, 5).map((b) => (b.result === 'win' ? 'V' : b.result === 'loss' ? 'D' : 'N'));
  let pv = 50;
  let confidence: PartnerInsights['prediction']['confidence'] = 'faible';
  let ptrend: PartnerInsights['prediction']['trend'] = 'neutral';
  if (total >= 3) {
    pv = ((wins + draws * 0.5) / total) * 100;
    if (recent.length >= 3) {
      const rw = recent.filter((r) => r === 'V').length;
      pv = pv * 0.6 + (rw / recent.length) * 100 * 0.4;
      const globalWR = (wins / Math.max(1, wins + losses)) * 100;
      const recentWR = (rw / recent.length) * 100;
      if (recentWR > globalWR + 10) ptrend = 'up';
      else if (recentWR < globalWR - 10) ptrend = 'down';
    }
    if (p.weightDeltaKg && p.weightDeltaKg > 10) pv -= 4;
    if (p.weightDeltaKg && p.weightDeltaKg < -10) pv += 3;
    if (p.heightDeltaCm && p.heightDeltaCm > 10) pv -= 2;
    if (p.experienceLevel === 'pro') pv -= 5;
    else if (p.experienceLevel === 'debutant') pv += 5;
    pv = Math.max(5, Math.min(95, Math.round(pv)));
    confidence = total >= 10 ? 'élevée' : total >= 5 ? 'moyenne' : 'faible';
  }
  const mood = pv >= 70 ? traduire('Tu pars favori') : pv >= 50 ? traduire('Combat équilibré') : pv >= 30 ? traduire('Vrai défi') : traduire('Rien à perdre, ose');

  const sortedM = [...matchups].filter((m) => m.result).sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const last5 = sortedM.slice(-5).filter((m) => m.result === 'V').length;
  const momentum =
    last5 >= 4 ? { label: 'En feu', color: '#4F6B28' } : last5 >= 3 ? { label: traduire('En forme'), color: '#3D5D9E' } : last5 >= 2 ? { label: traduire('Équilibré'), color: '#A8832F' } : last5 >= 1 ? { label: 'Difficile', color: '#B0282E' } : { label: traduire('En difficulté'), color: '#B0282E' };

  const streaks = computePartnerStreaks(matchups);

  const weekSet = new Set(
    entries.map((e) => {
      const d = parseDate(e.training.date);
      const first = new Date(d);
      first.setDate(d.getDate() - d.getDay());
      return `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(first.getDate()).padStart(2, '0')}`;
    }),
  );
  let weeksInARow = 0;
  {
    const arr = Array.from(weekSet).sort();
    let cur = 0;
    let prev = 0;
    for (const w of arr) {
      const ts = parseDate(w).getTime();
      cur = prev && Math.round((ts - prev) / 86400000) === 7 ? cur + 1 : 1;
      if (cur > weeksInARow) weeksInARow = cur;
      prev = ts;
    }
  }

  const zones: Record<Zone, number> = { neck: 0, arms: 0, torso: 0, legs: 0, back: 0 };
  for (const m of taken) {
    const z = zoneFromMethod(m);
    if (z) zones[z] += 1;
  }

  // Niveau de menace de la carte combattant (sur 10)
  const st = p.styleStats ?? DEFAULT_STYLE;
  const wrVD = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
  let score = 5;
  if (wrVD != null) {
    if (wrVD < 30) score += 2.5;
    else if (wrVD < 50) score += 1;
    else if (wrVD > 70) score -= 1.5;
  }
  if (p.experienceLevel === 'pro') score += 2;
  else if (p.experienceLevel === 'competiteur') score += 1;
  else if (p.experienceLevel === 'debutant') score -= 1;
  if (p.weightDeltaKg && p.weightDeltaKg > 10) score += 0.5;
  if (p.heightDeltaCm && p.heightDeltaCm > 10) score += 0.3;
  if ((st.garde + st.passage + st.debout + st.cardio + st.explosivite) / 5 >= 4) score += 1;
  if (total >= 10) score += 0.3;
  const fs = Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  const fighterThreat =
    fs >= 8 ? { score: fs, label: traduire('Bête noire'), color: '#B0282E' } : fs >= 6 ? { score: fs, label: traduire('Sérieux défi'), color: '#A8832F' } : fs >= 4 ? { score: fs, label: 'Partenaire solide', color: '#3D5D9E' } : { score: fs, label: 'Accessible', color: '#4F6B28' };

  return {
    wins,
    losses,
    draws,
    total,
    winRate,
    blocks,
    currentStreak,
    topGiven,
    topTaken,
    topWhatWorked,
    lastImprovement,
    lastGamePlan,
    lastWorked,
    lastDidnt,
    monthly,
    year: year.map((y) => ({ label: y.label, value: y.w + y.l > 0 ? Math.round((y.w / (y.w + y.l)) * 100) : null })),
    pointsFor,
    pointsAgainst,
    methodsGiven,
    methodsTaken,
    subGiven: given.length,
    subTaken: taken.length,
    intensity,
    avgRating,
    ratings,
    ratingTrend,
    title,
    threat,
    prediction: { value: pv, confidence, trend: ptrend, mood },
    momentum,
    matchups,
    streaks,
    weeksInARow,
    zones,
    fighterThreat,
  };
}
