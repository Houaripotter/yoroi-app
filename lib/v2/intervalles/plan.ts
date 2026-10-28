/**
 * Sprints guidés (28 octobre 2026) : le modèle pur d'une séance d'intervalles. Pas de React, pas de son.
 * Demande d'un ami de Houari : « je veux faire des sprints, que l'appli me guide : échauffement, sprints,
 * récupération, adaptable à tous les niveaux ».
 *
 * Une séance : un échauffement, des sprints séparés par des récupérations (aucune après le dernier sprint),
 * puis un retour au calme. Tout est en secondes.
 *
 * Réglages tout prêts :
 *  - Débutant, Intermédiaire, Confirmé : des RÉGLAGES DE DÉPART, sans promesse scientifique, à ajuster.
 *    L'échauffement et le retour au calme reprennent ce que font déjà les programmes de course de l'app
 *    (lib/v2/programmes/catalogue.ts : 5 min de marche rapide au début et à la fin pour le plan débutant
 *    tiré de GRONORUN, buist2007 ; 10 min faciles puis 5 min pour le fractionné du 10 km) ;
 *  - 4 fois 4 minutes : le protocole de helgerud2007 (lib/v2/programmes/sources.ts) : 4 minutes dur,
 *    3 minutes de récupération active.
 * « Personnaliser » : chaque valeur se règle, dans des bornes raisonnables.
 *
 * Le temps est toujours compté à partir d'heures absolues (début, pauses) : au retour de l'arrière plan,
 * l'étape en cours se recalcule (etapeA), rien n'est décompté seconde par seconde.
 */

export type NiveauSprint = 'debutant' | 'intermediaire' | 'confirme';
export type PresetSprint = NiveauSprint | 'quatre_quatre';
export type ChoixSprint = PresetSprint | 'perso';

export type ReglagesIntervalles = {
  /** secondes d'échauffement (0 : aucun) */
  echauffement: number;
  /** nombre de sprints */
  sprints: number;
  /** secondes de chaque sprint */
  sprint: number;
  /** secondes de récupération entre deux sprints */
  recup: number;
  /** secondes de retour au calme (0 : aucun) */
  retourCalme: number;
};

export type TypeEtape = 'echauffement' | 'sprint' | 'recup' | 'retour_calme';

export type EtapeIntervalle = {
  type: TypeEtape;
  /** secondes */
  duree: number;
  /** sprint : son numéro (à partir de 1) ; récupération : le numéro du sprint qui vient d'être fait ; sinon 0 */
  numero: number;
  /** nombre de sprints de la séance */
  total: number;
  /** le dernier sprint */
  dernier: boolean;
};

export type CleReglage = keyof ReglagesIntervalles;

export const PRESETS: Readonly<Record<PresetSprint, { reglages: ReglagesIntervalles; source?: string }>> = {
  debutant: { reglages: { echauffement: 300, sprints: 6, sprint: 15, recup: 90, retourCalme: 300 } },
  intermediaire: { reglages: { echauffement: 600, sprints: 8, sprint: 20, recup: 90, retourCalme: 300 } },
  confirme: { reglages: { echauffement: 600, sprints: 8, sprint: 30, recup: 120, retourCalme: 300 } },
  quatre_quatre: { reglages: { echauffement: 600, sprints: 4, sprint: 240, recup: 180, retourCalme: 300 }, source: 'helgerud2007' },
};

export const ORDRE_PRESETS: readonly PresetSprint[] = ['debutant', 'intermediaire', 'confirme', 'quatre_quatre'];

export const BORNES: Readonly<Record<CleReglage, { min: number; max: number }>> = {
  echauffement: { min: 0, max: 1200 },
  sprints: { min: 1, max: 20 },
  sprint: { min: 5, max: 300 },
  recup: { min: 10, max: 300 },
  retourCalme: { min: 0, max: 900 },
};

/** Pas d'un réglage : la minute pour l'échauffement et le retour au calme, un sprint, et pour une durée 5 s puis 15 s puis 30 s */
export function pas(cle: CleReglage, valeur: number, sens: 1 | -1): number {
  if (cle === 'echauffement' || cle === 'retourCalme') return 60;
  if (cle === 'sprints') return 1;
  // en descendant, le pas est celui de la valeur d'arrivée (60 descend à 55, pas à 45)
  const v = sens > 0 ? valeur : valeur - 1;
  if (v < 60) return 5;
  if (v < 180) return 15;
  return 30;
}

function borne(cle: CleReglage, v: number): number {
  const b = BORNES[cle];
  const n = Number.isFinite(v) ? Math.round(v) : b.min;
  return Math.min(b.max, Math.max(b.min, n));
}

/** Réglages dans les bornes, valeurs entières */
export function borner(r: ReglagesIntervalles): ReglagesIntervalles {
  return {
    echauffement: borne('echauffement', r.echauffement),
    sprints: borne('sprints', r.sprints),
    sprint: borne('sprint', r.sprint),
    recup: borne('recup', r.recup),
    retourCalme: borne('retourCalme', r.retourCalme),
  };
}

/** Un appui sur moins ou plus */
export function ajuster(r: ReglagesIntervalles, cle: CleReglage, sens: 1 | -1): ReglagesIntervalles {
  return borner({ ...r, [cle]: r[cle] + sens * pas(cle, r[cle], sens) });
}

export function estReglages(v: unknown): v is ReglagesIntervalles {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (['echauffement', 'sprints', 'sprint', 'recup', 'retourCalme'] as const).every((k) => typeof o[k] === 'number' && Number.isFinite(o[k] as number));
}

/** Le réglage tout prêt qui correspond exactement, sinon perso */
export function choixCorrespondant(r: ReglagesIntervalles): ChoixSprint {
  for (const k of ORDRE_PRESETS) {
    const p = PRESETS[k].reglages;
    if ((Object.keys(p) as CleReglage[]).every((c) => p[c] === r[c])) return k;
  }
  return 'perso';
}

/** Les étapes, dans l'ordre */
export function construirePlan(reglages: ReglagesIntervalles): EtapeIntervalle[] {
  const r = borner(reglages);
  const total = r.sprints;
  const plan: EtapeIntervalle[] = [];
  if (r.echauffement > 0) plan.push({ type: 'echauffement', duree: r.echauffement, numero: 0, total, dernier: false });
  for (let n = 1; n <= total; n++) {
    plan.push({ type: 'sprint', duree: r.sprint, numero: n, total, dernier: n === total });
    if (n < total) plan.push({ type: 'recup', duree: r.recup, numero: n, total, dernier: false });
  }
  if (r.retourCalme > 0) plan.push({ type: 'retour_calme', duree: r.retourCalme, numero: 0, total, dernier: false });
  return plan;
}

/** Durée totale en secondes */
export function dureeTotale(plan: readonly EtapeIntervalle[]): number {
  return plan.reduce((s, e) => s + e.duree, 0);
}

/** Temps écoulé (ms) depuis le début, pauses retirées ; pauseDepuis : heure du début de la pause en cours */
export function ecoule(debutMs: number, pausesMs: number, pauseDepuisMs: number | null, maintenantMs: number): number {
  const fin = pauseDepuisMs ?? maintenantMs;
  return Math.max(0, fin - debutMs - pausesMs);
}

/** L'étape en cours après ecouleMs de séance, ou null quand tout est fini */
export function etapeA(plan: readonly EtapeIntervalle[], ecouleMs: number): { index: number; ecouleDansEtapeMs: number; resteMs: number } | null {
  let debut = 0;
  const t = Math.max(0, ecouleMs);
  for (let i = 0; i < plan.length; i++) {
    const fin = debut + plan[i].duree * 1000;
    if (t < fin) return { index: i, ecouleDansEtapeMs: t - debut, resteMs: fin - t };
    debut = fin;
  }
  return null;
}

/**
 * Les changements d'étape à venir, en heures absolues, quand l'étape index finit à finEtapeMs :
 * le début de chaque étape suivante, puis la fin de la séance (index null).
 */
export function changementsApres(plan: readonly EtapeIntervalle[], index: number, finEtapeMs: number): { atMs: number; index: number | null }[] {
  const out: { atMs: number; index: number | null }[] = [];
  if (index < 0 || index >= plan.length) return out;
  let t = finEtapeMs;
  for (let i = index + 1; i < plan.length; i++) {
    out.push({ atMs: t, index: i });
    t += plan[i].duree * 1000;
  }
  out.push({ atMs: t, index: null });
  return out;
}

/**
 * Sprints faits : ceux des étapes passées, et le sprint en cours s'il a tourné au moins la moitié de sa durée
 * (la même règle que les rounds des chronos, lib/v2/carnet/chrono.ts roundsFaits).
 * fini : la séance est allée au bout.
 */
export function sprintsFaits(plan: readonly EtapeIntervalle[], index: number, ecouleDansEtapeMs: number, fini = false): number {
  let n = 0;
  plan.forEach((e, i) => {
    if (e.type !== 'sprint') return;
    if (fini || i < index) n += 1;
    else if (i === index && ecouleDansEtapeMs >= (e.duree * 1000) / 2) n += 1;
  });
  return n;
}

/** Le sport enregistré : sprint pour des efforts d'une minute au plus, course à pied au delà (4 fois 4 minutes) */
export function sportDuPlan(r: ReglagesIntervalles): 'sprint' | 'running' {
  return r.sprint <= 60 ? 'sprint' : 'running';
}
