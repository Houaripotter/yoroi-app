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
  /** 28 octobre 2026 : heure (ms) de la derniere ecriture, la derniere trace de vie de la seance */
  majMs?: number;
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
  /**
   * 26 octobre 2026 : tu es passe a un autre exercice apres au moins une serie (un test de max a 1 serie,
   * par exemple). Ses series prevues non faites ne comptent plus : l'app ne te le repropose pas.
   * Rien n'est efface : tu peux y revenir, elles sont encore la.
   */
  laisse?: boolean;
};

/** Changer d'exercice : celui qu'on quitte avec au moins une serie faite est « laisse » (plus repropose) */
export function allerAExercice<D extends { exercises: LiveExercise[]; currentId: string | null }>(d: D, id: string | null): D {
  if (!id || id === d.currentId) return d;
  return {
    ...d,
    currentId: id,
    exercises: d.exercises.map((e) => {
      if (e.id === id) return e.laisse ? { ...e, laisse: false } : e;
      if (e.id === d.currentId && e.sets.some((s) => s.done) && e.sets.some((s) => !s.done)) return { ...e, laisse: true };
      return e;
    }),
  };
}

/** Series encore a faire d'un exercice (zero s'il a ete laisse) */
export function seriesRestantes(e: LiveExercise): number {
  return e.laisse ? 0 : e.sets.filter((s) => !s.done).length;
}

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
  /** 25 octobre 2026 : lancee depuis « Mes séances » (lib/v2/seance/mesSeances.ts), marquee faite a l'enregistrement */
  maSeance?: string;
  /** 25 octobre 2026 : appuis de la Dynamic Island deja appliques (ids) et date du dernier, en ms (lib/v2/seance/actionsIle.ts) */
  ile?: { maj: number; ids: string[] };
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

/** Au dela, une seance n'est plus reprise « en direct » : elle passe dans les seances non terminees */
export const DRAFT_MAX_MS = 2 * 24 * 3600 * 1000;

/** Quelque chose a ete fait : une serie validee, un round rempli, une mesure de cardio */
export function aDuTravail(d: SeanceDraft): boolean {
  if (d.kind === 'muscu') return d.exercises.some((e) => e.sets.some((x) => x.done));
  if (d.kind === 'combat') {
    return (!!d.timer && d.timer.phase !== 'idle')
      || d.rounds.some((r) => !!(r.intensity || r.partner || r.result || r.method || r.notes)) || !!d.notes.trim() || !!d.theme.trim();
  }
  return !!(d.distance.trim() || d.calories.trim() || d.heartRate.trim() || d.notes.trim() || d.manualMinutes);
}

/**
 * 28 octobre 2026 (audit « ne jamais perdre de donnees ») : une seance en direct de plus de 2 jours n'est plus
 * effacee sans un mot. Avec au moins une serie faite, elle part dans les seances non terminees
 * (lib/v2/seance/ancien.ts) : « Enregistrer ce qui est fait » ou « Effacer », a ton choix. Vide, elle part.
 */
export const ANCIENS_KEY = 'yoroi_seances_non_terminees_v1';

export async function chargerAnciens(): Promise<SeanceDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(ANCIENS_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((d) => d && d.kind && d.startedAt) : [];
  } catch {
    return [];
  }
}

async function archiverAncien(d: SeanceDraft): Promise<void> {
  // une liste illisible n'est jamais remplacee : l'erreur remonte et le brouillon reste ou il est
  const raw = await AsyncStorage.getItem(ANCIENS_KEY);
  const v = raw ? JSON.parse(raw) : [];
  const liste: SeanceDraft[] = Array.isArray(v) ? v : [];
  if (!liste.some((x) => x && x.startedAt === d.startedAt && x.kind === d.kind)) liste.push(d);
  await AsyncStorage.setItem(ANCIENS_KEY, JSON.stringify(liste));
}

export async function retirerAncien(d: Pick<SeanceDraft, 'kind' | 'startedAt'>): Promise<void> {
  const raw = await AsyncStorage.getItem(ANCIENS_KEY);
  const v = raw ? JSON.parse(raw) : [];
  const liste: SeanceDraft[] = Array.isArray(v) ? v : [];
  await AsyncStorage.setItem(ANCIENS_KEY, JSON.stringify(liste.filter((x) => !(x && x.startedAt === d.startedAt && x.kind === d.kind))));
}

export async function loadDraft(): Promise<SeanceDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SeanceDraft;
    if (!d || !d.kind || !d.startedAt) return null;
    if (Date.now() - d.startedAt > DRAFT_MAX_MS) {
      if (aDuTravail(d)) {
        try {
          await archiverAncien(d);
        } catch {
          // non archivee : on la laisse en place, rien n'est efface
          return null;
        }
      }
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
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, majMs: Date.now() }));
  } catch {
    // stockage indisponible : la seance continue en memoire
  }
}

/**
 * Saisie apres coup en cours (26 octobre 2026) : gardee a part, quelques heures, pour ne pas perdre ce que tu
 * tapais si le telephone ferme l'app. Elle ne remplace jamais la seance en direct (cle differente).
 */
const SAISIE_KEY = 'yoroi_seance_saisie_v1';
/**
 * 28 octobre 2026 : une saisie par sport et par seance modifiee (cle `muscu:new`, `cardio:42`...), gardee 7 jours
 * (avant : 12 heures, et la modification d'une seance existante n'etait jamais gardee). Ecritures une par une.
 */
const SAISIES_KEY = 'yoroi_seance_saisies_v2';
const SAISIE_MAX_MS = 7 * 24 * 3600 * 1000;
export const cleSaisie = (d: { kind: SeanceDraft['kind']; editId?: number | null }): string => `${d.kind}:${d.editId ? d.editId : 'new'}`;

type Saisies = Record<string, SeanceDraft & { savedAt?: number }>;
let fileSaisies: Promise<unknown> = Promise.resolve();
function enFileSaisies<T>(fn: () => Promise<T>): Promise<T> {
  const p = fileSaisies.then(fn, fn);
  fileSaisies = p.catch(() => undefined);
  return p;
}
async function lireSaisies(strict: boolean): Promise<Saisies> {
  const raw = await AsyncStorage.getItem(SAISIES_KEY);
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Saisies;
  } catch {
    // illisible
  }
  if (strict) throw new Error('saisies illisibles');
  return {};
}

export function sauverSaisie(d: SeanceDraft): Promise<void> {
  if (!d.form) return Promise.resolve();
  return enFileSaisies(async () => {
    try {
      const all = await lireSaisies(true);
      all[cleSaisie(d)] = { ...d, savedAt: Date.now() };
      await AsyncStorage.setItem(SAISIES_KEY, JSON.stringify(all));
    } catch {
      // rien : la saisie continue en memoire
    }
  });
}

/** La saisie en cours de ce sport (nouvelle saisie), ou de cette seance modifiee (editId) */
export async function chargerSaisie(kind: SeanceDraft['kind'], editId?: number | null): Promise<SeanceDraft | null> {
  await fileSaisies.catch(() => undefined);
  try {
    const d = (await lireSaisies(false))[cleSaisie({ kind, editId })];
    if (d && d.kind === kind && d.form && Date.now() - (d.savedAt ?? 0) <= SAISIE_MAX_MS) return d;
  } catch {
    // rien
  }
  if (editId) return null;
  // ancienne cle (avant le 28 octobre 2026)
  try {
    const raw = await AsyncStorage.getItem(SAISIE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SeanceDraft & { savedAt?: number };
    if (!d || d.kind !== kind || !d.form || d.editId || Date.now() - (d.savedAt ?? 0) > SAISIE_MAX_MS) return null;
    return d;
  } catch {
    return null;
  }
}

/** Une seance modifiee vient d'etre enregistree (lib/v2/seance/save.ts) : ses saisies gardees partent, quel que soit l'ecran */
export function effacerSaisiesDeSeance(editId: number): Promise<void> {
  return enFileSaisies(async () => {
    try {
      const all = await lireSaisies(true);
      let change = false;
      for (const k of Object.keys(all)) if (k.endsWith(`:${editId}`)) { delete all[k]; change = true; }
      if (change) await AsyncStorage.setItem(SAISIES_KEY, JSON.stringify(all));
    } catch {
      // rien
    }
  });
}

/** Saisie enregistree ou abandonnee. Sans argument : la nouvelle saisie de musculation (ancien appel). */
export function effacerSaisie(d: { kind: SeanceDraft['kind']; editId?: number | null } = { kind: 'muscu' }): Promise<void> {
  return enFileSaisies(async () => {
    try {
      const all = await lireSaisies(true);
      delete all[cleSaisie(d)];
      await AsyncStorage.setItem(SAISIES_KEY, JSON.stringify(all));
    } catch {
      // rien
    }
    if (!d.editId) {
      try {
        const raw = await AsyncStorage.getItem(SAISIE_KEY);
        const old = raw ? JSON.parse(raw) : null;
        if (!old || old.kind === d.kind) await AsyncStorage.removeItem(SAISIE_KEY);
      } catch {
        // rien
      }
    }
  });
}

/**
 * Ecriture du brouillon dans l'ordre (26 octobre 2026) : une seule ecriture a la fois, la derniere version gagne,
 * et rien ne peut etre ecrit apres clearDraft (sinon une seance finie reapparaitrait « en cours »).
 */
let fileEcriture: Promise<void> = Promise.resolve();
let aEcrire: { d: SeanceDraft; gen: number } | null = null;
let generation = 0;

/** Numero de la seance en cours de stockage : change a chaque clearDraft */
export function generationBrouillon(): number {
  return generation;
}

/**
 * `gen` : la generation vue par l'ecran qui ecrit. Une ecriture d'une generation passee (ecran reste dessous
 * apres la fin de la seance sur un autre ecran) est ignoree : la seance finie ne revient jamais « en cours ».
 */
export function ecrireBrouillon(d: SeanceDraft, gen: number = generation): Promise<void> {
  aEcrire = { d, gen };
  fileEcriture = fileEcriture.then(async () => {
    const a = aEcrire;
    aEcrire = null;
    if (a && a.gen === generation) await saveDraft(a.d);
  });
  return fileEcriture;
}

export async function clearDraft(): Promise<void> {
  // les ecritures en attente sont annulees, celle en cours se termine avant l'effacement
  generation++;
  aEcrire = null;
  // 28 octobre 2026 : l'effacement passe dans la file des ecritures. Avant, une nouvelle seance ecrite juste
  // apres clearDraft pouvait etre effacee par lui (l'effacement partait apres elle) : plus de brouillon.
  fileEcriture = fileEcriture.catch(() => {}).then(async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch {
      // rien a faire
    }
  });
  await fileEcriture;
  // 26 octobre 2026 : plus de seance, plus de rappel de fin de repos
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    void require('./rappelRepos').retirerRappelsRepos();
  } catch {
    // sans module de notifications : rien a retirer
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
