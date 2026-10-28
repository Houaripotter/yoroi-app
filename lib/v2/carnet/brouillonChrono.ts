/**
 * Chronos (app/timer.tsx) : le chrono en cours survit à la fermeture de l'app (28 octobre 2026, audit « ne
 * jamais perdre de données »). Même principe que les sprints guidés (lib/v2/intervalles/brouillon.ts) : les
 * phases, l'étape en cours et son heure absolue de début (décalée des pauses), la pause, les séries notées
 * (repos de musculation), les tours (AMRAP), le temps (au temps), les réglages du mode.
 *
 * Le brouillon reste jusqu'à l'enregistrement : « Enregistrer » ouvre la saisie après coup avec les séries en
 * texte, et c'est l'enregistrement de cette saisie qui l'efface (app/seance/deja-faite.tsx). Fermer la saisie
 * sans enregistrer ne perd donc rien : le chrono le repropose à la prochaine ouverture.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChronoPhase, ChronoStatus } from './useChronoEngine';
import type { CombatPreset, TimerMode } from './chrono';

export const CLE_BROUILLON_CHRONO = 'yoroi_chrono_brouillon_v1';

export type SerieChrono = { seriesNumber: number; timestampMs: number; restDuration: number; reps?: number; weight?: number };

export type BrouillonChrono = {
  v: 1;
  mode: TimerMode;
  combatPreset: CombatPreset;
  /** réglages du mode (repos, rounds, Tabata, EMOM...), mêmes clés que app/timer.tsx */
  r: Record<string, number>;
  listes: { emom: string[]; amrap: string[]; fortime: string[] };
  /** début de la séance (ms), null avant le premier lancement */
  debutMs: number | null;
  /** fin du chrono (ms), null tant qu'il tourne */
  finMs: number | null;
  /** moteur : phases et état ; status idle entre deux séries de musculation */
  phases: ChronoPhase[];
  status: ChronoStatus;
  index: number;
  etapeDebutMs: number;
  pauseMs: number | null;
  seriesCount: number;
  series: SerieChrono[];
  amrapTours: number;
  forTimeSec: number;
  /** temps passé dans chaque phase (rounds de combat), [index, ms] */
  phaseMs: [number, number][];
  /** « Enregistrer » touché : la saisie après coup est ouverte, pas encore enregistrée */
  versSaisie?: { sport: string; duration: number; notes: string };
  majMs: number;
};

const MODES: readonly string[] = ['musculation', 'combat', 'tabata', 'emom', 'amrap', 'fortime'];
const nombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const textes = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function lireBrouillonChrono(v: unknown): BrouillonChrono | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.mode !== 'string' || !MODES.includes(o.mode)) return null;
  const phases = Array.isArray(o.phases) ? (o.phases as ChronoPhase[]).filter((p) => p && typeof p.kind === 'string' && nombre(p.duration)) : [];
  const r: Record<string, number> = {};
  if (o.r && typeof o.r === 'object') for (const [k, x] of Object.entries(o.r as Record<string, unknown>)) if (nombre(x)) r[k] = x;
  const l = (o.listes ?? {}) as Record<string, unknown>;
  const status: ChronoStatus = o.status === 'running' || o.status === 'paused' || o.status === 'finished' || o.status === 'holding' ? o.status : 'idle';
  const series = Array.isArray(o.series)
    ? (o.series as SerieChrono[]).filter((x) => x && nombre(x.seriesNumber)).map((x) => ({
      seriesNumber: x.seriesNumber, timestampMs: nombre(x.timestampMs) ? x.timestampMs : 0, restDuration: nombre(x.restDuration) ? x.restDuration : 0,
      ...(nombre(x.reps) ? { reps: x.reps } : {}), ...(nombre(x.weight) ? { weight: x.weight } : {}),
    }))
    : [];
  const vs = o.versSaisie as BrouillonChrono['versSaisie'] | undefined;
  return {
    v: 1,
    mode: o.mode as TimerMode,
    combatPreset: (typeof o.combatPreset === 'string' ? o.combatPreset : 'mma') as CombatPreset,
    r,
    listes: { emom: textes(l.emom), amrap: textes(l.amrap), fortime: textes(l.fortime) },
    debutMs: nombre(o.debutMs) ? o.debutMs : null,
    finMs: nombre(o.finMs) ? o.finMs : null,
    phases,
    status: phases.length ? status : 'idle',
    index: nombre(o.index) ? Math.max(0, Math.min(Math.max(0, phases.length - 1), Math.floor(o.index))) : 0,
    etapeDebutMs: nombre(o.etapeDebutMs) ? o.etapeDebutMs : 0,
    pauseMs: nombre(o.pauseMs) ? o.pauseMs : null,
    seriesCount: nombre(o.seriesCount) ? Math.max(0, Math.floor(o.seriesCount)) : 0,
    series,
    amrapTours: nombre(o.amrapTours) ? o.amrapTours : 0,
    forTimeSec: nombre(o.forTimeSec) ? o.forTimeSec : 0,
    phaseMs: Array.isArray(o.phaseMs) ? (o.phaseMs as [number, number][]).filter((x) => Array.isArray(x) && nombre(x[0]) && nombre(x[1])) : [],
    ...(vs && typeof vs.sport === 'string' && nombre(vs.duration) && typeof vs.notes === 'string' ? { versSaisie: vs } : {}),
    majMs: nombre(o.majMs) ? o.majMs : Date.now(),
  };
}

/** Il y a quelque chose à garder : un chrono lancé, ou des séries comptées */
export function aGarder(b: Pick<BrouillonChrono, 'status' | 'seriesCount' | 'series' | 'versSaisie'>): boolean {
  return b.status !== 'idle' || b.seriesCount > 0 || b.series.length > 0 || !!b.versSaisie;
}

/**
 * Le chrono a tourné jusqu'au bout pendant que l'app était fermée : fin à l'heure prévue (jamais l'heure du
 * retour). Phases qui attendent (hold) : la fin est celle de la phase en cours.
 */
export function finPrevue(b: BrouillonChrono): number | null {
  if (b.status !== 'running' || !b.phases.length) return null;
  return b.etapeDebutMs + b.phases.slice(b.index).reduce((s, p) => s + p.duration * 1000, 0);
}

/** Heure de fin à enregistrer : la fin connue, la fin prévue si elle est passée, la dernière trace de vie sinon */
export function finPourEnregistrer(b: BrouillonChrono, maintenantMs: number): number {
  if (b.finMs !== null) return b.finMs;
  const prevue = finPrevue(b);
  if (prevue !== null && prevue <= maintenantMs) return prevue;
  if (b.status === 'paused' && b.pauseMs !== null) return b.pauseMs;
  return Math.min(maintenantMs, b.majMs);
}

/* ─── Stockage : une écriture à la fois, la dernière gagne, rien après l'effacement ─── */

let file: Promise<void> = Promise.resolve();
let aEcrire: { b: BrouillonChrono; gen: number } | null = null;
let generation = 0;

export function generationChrono(): number {
  return generation;
}

export function sauverBrouillonChrono(b: BrouillonChrono, gen: number = generation): Promise<void> {
  aEcrire = { b, gen };
  file = file.then(async () => {
    const a = aEcrire;
    aEcrire = null;
    if (!a || a.gen !== generation) return;
    try {
      await AsyncStorage.setItem(CLE_BROUILLON_CHRONO, JSON.stringify({ ...a.b, majMs: Date.now() }));
    } catch {
      // le chrono continue en mémoire
    }
  });
  return file;
}

export async function chargerBrouillonChrono(): Promise<BrouillonChrono | null> {
  await file.catch(() => undefined);
  try {
    const raw = await AsyncStorage.getItem(CLE_BROUILLON_CHRONO);
    if (!raw) return null;
    return lireBrouillonChrono(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function effacerBrouillonChrono(): Promise<void> {
  generation += 1;
  aEcrire = null;
  file = file.catch(() => {}).then(async () => {
    try {
      await AsyncStorage.removeItem(CLE_BROUILLON_CHRONO);
    } catch {
      // rien
    }
  });
  return file;
}
