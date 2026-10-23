/**
 * Ta recuperation (ex « Ta forme ») : le score sur 100 du jour.
 * SOURCE UNIQUE (vague 32) : l'accueil, l'ecran detail et Sante lisent ce calcul.
 * Les regles et les poids sont dans lib/v2/recuperation.ts (fonctions pures testees).
 * On ne combine que ce qui est vraiment mesure (sommeil, charge, hydratation,
 * etat du corps, frequence cardiaque au repos, variabilite cardiaque).
 * Sans sommeil ni seance recente, on ne donne pas de score.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { getSleepEntries, getSleepGoal } from '@/lib/sleepService';
import type { SleepEntry } from '@/lib/sleepService';
import { getUserBodyStatus } from '@/lib/storage';
import type { BodyStatusData } from '@/lib/storage';
import { logger } from '@/lib/security/logger';
import { loadHydration, localISO } from './hydration';
import { intensite } from '../intensite';
import { combineRecup, recupLevelId, scoreCharge, scoreHrv, scoreRhr, scoreSleep, todayAndBaseline } from '../recuperation';
import type { RecupKey, RecupPoint } from '../recuperation';
import { getSanteSource, loadSeries } from '../sante/data';
import { dedupeTrainings } from '../seances/dedupe';
import { formatDuration } from '../trainingWeek';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

export type FactorKey = RecupKey;

export type FormeFactor = {
  key: FactorKey;
  label: string;
  score: number; // 0 a 100
  detail: string;
  /** valeur mesuree, formatee (Sante) */
  value?: string;
  /** ta moyenne personnelle, formatee */
  baseline?: string;
};

export type FormeLevel = { id: 'top' | 'bien' | 'moyen' | 'bas' | 'repos'; label: string; advice: string; color: string };

export type FormeResult = {
  score: number | null;
  level: FormeLevel | null;
  factors: FormeFactor[];
  missing: FactorKey[];
  lastNight: SleepEntry | null;
  sleepGoal: number;
  /** sommeil moyen des 7 dernieres nuits, en minutes : ta nuit notee, sinon celle de ta montre (null sans mesure) */
  sleepAvg7: number | null;
  sessions7: number;
  minutes7: number;
  daysSinceLast: number | null;
  hydrationL: number;
  hydrationGoalL: number;
  body: BodyStatusData;
};

/** Series Sante utiles au score (deja chargees par l'ecran Sante, sinon lues ici) */
export type FormeSeries = { vfc?: RecupPoint[]; 'fc-repos'?: RecupPoint[]; sommeil?: RecupPoint[] };

export function levelFor(score: number): FormeLevel {
  const id = recupLevelId(score);
  if (id === 'top') return { id, label: traduire('Prêt à tout donner'), advice: traduire('Ton corps est frais. C’est le jour pour une séance intense.'), color: intensite(2).text };
  if (id === 'bien') return { id, label: traduire('En forme'), advice: traduire('Tu peux t’entraîner normalement.'), color: intensite(2).text };
  if (id === 'moyen') return { id, label: traduire('Écoute ton corps'), advice: traduire('Entraîne-toi, mais garde une marge sur l’intensité.'), color: intensite(3).text };
  if (id === 'bas') return { id, label: traduire('Récupère'), advice: traduire('Privilégie une séance légère, de la mobilité ou de la technique.'), color: intensite(4).text };
  return { id, label: traduire('Repos'), advice: traduire('Une vraie journée de repos te fera gagner du terrain.'), color: intensite(5).text };
}

function durationOf(t: Training): number {
  return t.duration_minutes ?? t.duration ?? 0;
}

function daysAgo(iso: string): number {
  const a = new Date(iso.slice(0, 10) + 'T12:00:00').getTime();
  const b = new Date(localISO() + 'T12:00:00').getTime();
  return Math.round((b - a) / 86400000);
}

/** Format unique des durees (lib/v2/trainingWeek) : « 45 min », « 1 h », « 7 h 50 » */
export function formatMinutes(min: number): string {
  return min > 0 ? formatDuration(min) : '0 min';
}

const fr0 = (v: number) => String(Math.round(v));

async function readSeriesFrom(live: boolean): Promise<FormeSeries> {
  const [vfc, rhr, sommeil] = await Promise.all([
    loadSeries('vfc', 35, live).catch(() => []),
    loadSeries('fc-repos', 35, live).catch(() => []),
    loadSeries('sommeil', 8, live).catch(() => []),
  ]);
  return { vfc, 'fc-repos': rhr, sommeil };
}

/** Series Sante du score : en direct si Sante est relie (4 s au plus), sinon ce qui est garde sur le telephone */
async function readSeries(given?: FormeSeries): Promise<FormeSeries> {
  if (given) return given;
  try {
    const src = await Promise.race([getSanteSource(), new Promise<null>((r) => setTimeout(() => r(null), 2000))]);
    if (src && src.mode === 'live') {
      const live = await Promise.race([readSeriesFrom(true), new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
      if (live) return live;
    }
    return await readSeriesFrom(false);
  } catch {
    return {};
  }
}

export async function computeForme(opts?: { series?: FormeSeries }): Promise<FormeResult> {
  const [entries, sleepGoal, trainings, hyd, body, hrRaw, hrvRaw, series] = await Promise.all([
    getSleepEntries().catch(() => [] as SleepEntry[]),
    getSleepGoal().catch(() => 480),
    // seances dedoublonnees, comme partout ailleurs
    getTrainings(40).then((l) => dedupeTrainings(l ?? [])).catch(() => [] as Training[]),
    loadHydration(),
    getUserBodyStatus().catch(() => ({}) as BodyStatusData),
    AsyncStorage.getItem('@yoroi_health_last_resting_hr').catch(() => null),
    AsyncStorage.getItem('@yoroi_health_last_hrv').catch(() => null),
    readSeries(opts?.series),
  ]);
  const today = localISO();
  const goal = sleepGoal || 480;

  const factors: FormeFactor[] = [];
  const missing: FactorKey[] = [];

  // Sommeil : la nuit notee dans YOROI (aujourd'hui ou hier), sinon celle de ta montre
  const recent = [...(entries ?? [])].filter((e) => e && e.date && daysAgo(e.date) <= 1 && e.duration > 0).sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastNight = recent[0] ?? null;
  const watchNight = todayAndBaseline(series.sommeil, today).today;
  if (lastNight) {
    factors.push({ key: 'sommeil', label: traduire('Sommeil'), score: scoreSleep(lastNight.duration, goal, lastNight.quality), detail: traduire("{0} cette nuit", formatMinutes(lastNight.duration)), value: formatMinutes(lastNight.duration) });
  } else if (watchNight) {
    factors.push({ key: 'sommeil', label: traduire('Sommeil'), score: scoreSleep(watchNight.value, goal), detail: traduire("{0} cette nuit, selon ta montre", formatMinutes(watchNight.value)), value: formatMinutes(watchNight.value) });
  } else missing.push('sommeil');

  // Sommeil moyen sur 7 nuits : SOURCE UNIQUE (detail de la recuperation). Meme fenetre que Sante (7 derniers jours).
  const nights: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today + 'T12:00:00');
    d.setDate(d.getDate() - i);
    const iso = localISO(d);
    const own = (entries ?? []).find((e) => e && e.date === iso && e.duration > 0);
    const watch = (series.sommeil ?? []).find((p) => p && p.date === iso && p.value > 0);
    const v = own ? own.duration : watch ? watch.value : 0;
    if (v > 0) nights.push(v);
  }
  const sleepAvg7 = nights.length ? Math.round(nights.reduce((a, b) => a + b, 0) / nights.length) : null;

  // Charge : 7 derniers jours compares a ta moyenne des 4 semaines d'avant
  const list = trainings ?? [];
  const charge = scoreCharge(list.filter((t) => t && t.date).map((t) => ({ date: t.date.slice(0, 10), minutes: durationOf(t) })), today);
  const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  const daysSinceLast = sorted[0] ? daysAgo(sorted[0].date) : null;
  if (charge) factors.push({ key: 'charge', label: traduire('Charge d’entraînement'), score: charge.score, detail: charge.detail, value: traduirePluriel(charge.sessions7, charge.sessions7 > 1, "{0} séance en 7 jours", "{0} séances en 7 jours", charge.sessions7) });
  else missing.push('charge');

  // Hydratation du jour (seulement si tu as note quelque chose)
  if (hyd.amount > 0) {
    factors.push({ key: 'hydratation', label: traduire('Hydratation'), score: Math.round(Math.min(1, hyd.amount / hyd.goal) * 100), detail: traduire("{0} L sur {1} L", String(Math.round(hyd.amount * 100) / 100).replace('.', DECIMAL), String(hyd.goal).replace('.', DECIMAL)), value: `${String(Math.round(hyd.amount * 10) / 10).replace('.', DECIMAL)} L` });
  } else missing.push('hydratation');

  // Etat du corps
  const zones = Object.values(body ?? {});
  if (zones.length > 0) {
    let s = 100;
    let worst = traduire('aucune gêne signalée');
    for (const z of zones) {
      if (z.status === 'injury') {
        s = Math.min(s, 30);
        worst = traduire('une blessure en cours');
      } else if (z.status === 'warning') {
        const v = 100 - (z.pain ?? 5) * 6;
        if (v < s) {
          s = v;
          worst = traduire("une gêne à {0} sur 10", z.pain ?? 5);
        }
      }
    }
    factors.push({ key: 'corps', label: traduire('État du corps'), score: Math.round(s), detail: worst, value: s >= 100 ? 'rien à signaler' : 'gêne signalée' });
  } else missing.push('corps');

  // Coeur au repos et variabilite : la mesure de la nuit comparee a ta moyenne (Sante), sinon la derniere gardee
  const rhrS = todayAndBaseline(series['fc-repos'], today);
  const hr = rhrS.today?.value ?? (hrRaw ? parseFloat(hrRaw) : 0);
  if (hr > 0) {
    const base = rhrS.today ? rhrS.base : null;
    const diff = base ? Math.round(hr - base) : 0;
    factors.push({
      key: 'coeur',
      label: traduire('Fréquence au repos'),
      score: scoreRhr(hr, base),
      detail: base ? (diff === 0 ? traduire('comme ta moyenne') : traduire("{0}{1} bpm par rapport à ta moyenne", diff > 0 ? '+' : '', diff)) : traduire("{0} battements par minute", fr0(hr)),
      value: `${fr0(hr)} bpm`,
      baseline: base ? `${fr0(base)} bpm` : undefined,
    });
  }
  const hrvS = todayAndBaseline(series.vfc, today);
  const hrv = hrvS.today?.value ?? (hrvRaw ? parseFloat(hrvRaw) : 0);
  if (hrv > 0) {
    const base = hrvS.today ? hrvS.base : null;
    const ratio = base ? Math.round(((hrv - base) / base) * 100) : 0;
    factors.push({
      key: 'vfc',
      label: traduire('Variabilité cardiaque'),
      score: scoreHrv(hrv, base),
      detail: base ? traduire("{0}{1} % par rapport à ta moyenne", ratio >= 0 ? '+' : '', ratio) : `${fr0(hrv)} ms`,
      value: `${fr0(hrv)} ms`,
      baseline: base ? `${fr0(base)} ms` : undefined,
    });
  }

  const score = combineRecup(factors);

  return {
    score,
    level: score === null ? null : levelFor(score),
    factors,
    missing,
    lastNight,
    sleepGoal: goal,
    sleepAvg7,
    sessions7: charge?.sessions7 ?? 0,
    minutes7: charge?.minutes7 ?? 0,
    daysSinceLast,
    hydrationL: hyd.amount,
    hydrationGoalL: hyd.goal,
    body: body ?? {},
  };
}

export async function safeComputeForme(opts?: { series?: FormeSeries }): Promise<FormeResult | null> {
  try {
    return await computeForme(opts);
  } catch (err) {
    logger.error('Calcul de la forme impossible', err);
    return null;
  }
}
