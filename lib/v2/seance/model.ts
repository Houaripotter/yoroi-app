/**
 * Seance en direct : types du brouillon et sauvegarde locale.
 * Le brouillon survit a la fermeture de l'app (AsyncStorage), on propose de le reprendre.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CombatRound, Exercise } from '@/lib/database';

export type SeanceKind = 'muscu' | 'combat' | 'cardio';

/** Details communs a toutes les seances : quand, ou, avec quel club, note de technique */
export type SessionDetails = {
  /** jour de la seance, date locale "2026-10-09" */
  date: string;
  /** heure de debut en minutes depuis minuit */
  startMin: number;
  /** duree en minutes (saisie a la main, hors chrono) */
  duration: number;
  clubId: number | null;
  outdoor: boolean;
  place: string;
  lat: number | null;
  lon: number | null;
  /** note de 1 a 5 (technique, execution ou sensations selon le sport, voir note.ts) */
  technique: number | null;
  /**
   * Cadre de la seance sans club (16 octobre 2026) : en salle, dehors ou a la maison.
   * Avec un club, la seance est au club, sauf si outdoor (seance du club dehors).
   * Ecrit en base par is_outdoor et, pour la maison, location_name « Maison ».
   */
  cadre?: 'salle' | 'exterieur' | 'maison' | null;
  /** le club a ete choisi (par toi, le planning ou la seance modifiee) : plus de choix automatique */
  clubFixe?: boolean;
};

/** Champs communs aux brouillons */
type DraftBase = {
  /** saisie apres coup ou modification : pas de chrono, date et duree reglees a la main */
  form?: boolean;
  /** id de la seance modifiee */
  editId?: number;
  details?: SessionDetails;
};

export type LiveSet = {
  id: string;
  weight: number;
  reps: number;
  done: boolean;
  record?: boolean;
  /** valeurs de la derniere seance pour cette serie, affichees en aide */
  prevWeight?: number;
  prevReps?: number;
  /** type d'une serie enregistree (echauffement...), garde a la modification pour le tonnage */
  type?: 'normal' | 'warmup' | 'dropset' | 'superset';
};

export type LiveExercise = {
  id: string;
  name: string;
  muscle?: string;
  sets: LiveSet[];
  notes?: string;
  /** exercice d'origine (modification) : ses autres champs sont conserves */
  orig?: Exercise;
  /** 24 octobre 2026 : objectif fixe par le programme suivi (lib/v2/programmes) */
  cible?: { repsMin: number; repsMax: number; reposSec: number; conseil?: string; secondes?: boolean; raison?: 'premiere' | 'monte' | 'garde' | 'poids_du_corps' | 'variante' | 'legere'; nouvelleCharge?: number };
};

export type MuscuDraft = DraftBase & {
  kind: 'muscu';
  sport: string;
  label?: string;
  slotId?: number;
  startedAt: number;
  exercises: LiveExercise[];
  currentId: string | null;
  notes: string;
  restSec: number;
  restEndsAt: number | null;
  restTotal: number;
  /** muscles travailles choisis a la main, sinon deduits des exercices */
  muscles?: string[] | null;
  intensity?: number | null;
  /** 24 octobre 2026 : seance d'un programme (lib/v2/programmes), le jour suivant avance a l'enregistrement */
  programme?: { id: string; jourId: string };
  /** le repos a ete regle a la main pendant la seance : il remplace le repos prevu par le programme */
  reposManuel?: boolean;
};

export type RoundIntensity = 'detendu' | 'technique' | 'guerre';
export type RoundResult = 'win' | 'loss' | 'draw';

export type LiveRound = {
  number: number;
  intensity?: RoundIntensity;
  partner?: string;
  result?: RoundResult;
  method?: string;
  notes?: string;
  /** round d'origine (modification) : points, analyse... conserves */
  orig?: CombatRound;
};

/** ids compatibles avec add-combat-session.tsx et getSessionTypeLabel */
export type CombatSessionType = 'entrainement' | 'technique' | 'guerre' | 'openmat' | 'competition';

export type TimerPhase = 'idle' | 'round' | 'rest' | 'done';

export type CombatTimer = {
  phase: TimerPhase;
  /** numero du round en cours ou du prochain round (1 a totalRounds) */
  index: number;
  endsAt: number | null;
  /** secondes restantes quand le chrono est en pause, sinon null */
  paused: number | null;
};

export type CombatDraft = DraftBase & {
  kind: 'combat';
  sport: string;
  label?: string;
  slotId?: number;
  startedAt: number;
  sessionType: CombatSessionType;
  /** modification : type d'origine hors liste (ancienne saisie), garde tel quel tant que tu n'en choisis pas un autre */
  sessionTypeOrig?: string;
  roundSec: number;
  restSec: number;
  totalRounds: number;
  rounds: LiveRound[];
  theme: string;
  notes: string;
  timer: CombatTimer;
  rpe?: number | null;
  /** 24 octobre 2026 : seance d'un programme (rounds de sac), une consigne par round */
  programme?: { id: string; jourId: string };
  consignes?: string[];
  hrAvg?: number;
  hrMax?: number;
  gamePlan?: string;
  worked?: string;
  didnt?: string;
};

export type CardioDraft = DraftBase & {
  kind: 'cardio';
  sport: string;
  label?: string;
  slotId?: number;
  startedAt: number;
  /** minutes saisies a la main, sinon le chrono fait foi */
  manualMinutes: number | null;
  distance: string;
  calories: string;
  heartRate: string;
  intensity: number | null;
  notes: string;
  maxHeartRate?: number;
  speed?: number;
  pente?: number;
  resistance?: number;
  watts?: number;
  cadence?: number;
  scoreFor?: number;
  scoreAgainst?: number;
  /** nom libre quand le sport est "Autre" */
  customName?: string;
  /** 24 octobre 2026 : seance d'un programme */
  programme?: { id: string; jourId: string };
};

export type SeanceDraft = MuscuDraft | CombatDraft | CardioDraft;

const DRAFT_KEY = 'yoroi_seance_brouillon_v1';
const REST_KEY = 'yoroi_seance_repos_v1';
const COMBAT_PREFS_KEY = 'yoroi_seance_combat_v1';

export async function loadDraft(): Promise<SeanceDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SeanceDraft;
    if (!d || !d.kind || !d.startedAt) return null;
    // un brouillon de plus de 2 jours n'a plus de sens
    if (Date.now() - d.startedAt > 2 * 24 * 3600 * 1000) {
      await clearDraft();
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export async function saveDraft(d: SeanceDraft): Promise<void> {
  // une saisie apres coup ou une modification ne remplace jamais la seance en cours
  if (d.form) return;
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // stockage indisponible : la seance continue en memoire
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // rien a faire
  }
  // 24 octobre 2026 : plus de seance, plus de seance sur l'ecran verrouille (lib/v2/widgets/activiteSeance.ts)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/lib/v2/widgets/activiteSeance').terminerActiviteSeance();
  } catch {
    // sans module natif : rien a arreter
  }
}

export async function loadRestPref(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(REST_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 15 && n <= 600 ? n : 90;
  } catch {
    return 90;
  }
}

export async function saveRestPref(sec: number): Promise<void> {
  try {
    await AsyncStorage.setItem(REST_KEY, String(sec));
  } catch {
    // rien a faire
  }
}

export type CombatPrefs = { roundSec: number; restSec: number; totalRounds: number };

export async function loadCombatPrefs(): Promise<CombatPrefs> {
  const def: CombatPrefs = { roundSec: 300, restSec: 60, totalRounds: 6 };
  try {
    const raw = await AsyncStorage.getItem(COMBAT_PREFS_KEY);
    if (!raw) return def;
    return { ...def, ...(JSON.parse(raw) as Partial<CombatPrefs>) };
  } catch {
    return def;
  }
}

export async function saveCombatPrefs(p: CombatPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(COMBAT_PREFS_KEY, JSON.stringify(p));
  } catch {
    // rien a faire
  }
}

let counter = 0;
export function uid(): string {
  counter += 1;
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}
