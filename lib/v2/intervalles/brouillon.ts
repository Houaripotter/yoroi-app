/**
 * Sprints guidés : la séance en cours survit à la fermeture de l'app (28 octobre 2026, audit « l'utilisateur
 * ne doit jamais perdre ses données »). Avant, tout vivait en mémoire : app tuée par iOS pendant une
 * récupération, téléphone éteint, et la séance disparaissait.
 *
 * On garde, à chaque changement (lancement, étape, pause, reprise, réglage, fin, passage en arrière plan) :
 * le plan, les durées réelles des étapes (allongées ou raccourcies pendant la séance), l'heure de début de la
 * séance, l'étape en cours, l'heure absolue du début de cette étape (décalée des pauses) et celle de la pause.
 * Au retour, l'étape réelle se recalcule à partir de ces heures (etatMaintenant) : tu reprends là où tu en es,
 * ou tu enregistres ce qui est fait.
 *
 * Clé à part de la séance en direct (lib/v2/seance/model.ts) : des sprints n'effacent jamais une séance de
 * musculation en cours, et l'inverse. Rien n'est jamais effacé tout seul : seul l'enregistrement ou ton choix
 * « Effacer » retire le brouillon.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { estReglages, sprintsFaits, type ChoixSprint, type EtapeIntervalle, type ReglagesIntervalles } from './plan';

export const CLE_BROUILLON_SPRINTS = 'yoroi_sprints_brouillon_v1';

export type StatutSprints = 'running' | 'paused' | 'finished';

export type BrouillonSprints = {
  v: 1;
  plan: EtapeIntervalle[];
  /** secondes réelles de chaque étape (réglées pendant la séance), même longueur que plan */
  durees: number[];
  reglages: ReglagesIntervalles;
  choix: ChoixSprint;
  /** début de la séance (ms) */
  debutMs: number;
  /** étape en cours */
  index: number;
  /** début de l'étape en cours (ms), décalé de la durée des pauses */
  etapeDebutMs: number;
  /** début de la pause en cours (ms), sinon null */
  pauseMs: number | null;
  statut: StatutSprints;
  /** fin de la séance (ms) quand elle est finie ou arrêtée */
  finMs: number | null;
  /** sprints faits, connus à la fin ou à l'arrêt */
  faits: number;
  /** arrêtée en cours de route, bilan à enregistrer */
  arretee?: boolean;
  majMs: number;
};

const CHOIX: readonly string[] = ['debutant', 'intermediaire', 'confirme', 'quatre_quatre', 'perso'];
const nombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Brouillon lisible et cohérent, sinon null (un brouillon abîmé n'est jamais réécrit par dessus : voir chargerBrouillonSprints) */
export function lireBrouillonSprints(v: unknown): BrouillonSprints | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.plan) || o.plan.length === 0) return null;
  const plan = o.plan as EtapeIntervalle[];
  if (!plan.every((e) => e && typeof e === 'object' && typeof e.type === 'string' && nombre(e.duree))) return null;
  const durees = Array.isArray(o.durees) && o.durees.length === plan.length && o.durees.every(nombre) ? (o.durees as number[]) : plan.map((e) => e.duree);
  if (!estReglages(o.reglages) || !nombre(o.debutMs) || !nombre(o.etapeDebutMs)) return null;
  const index = nombre(o.index) ? Math.min(plan.length - 1, Math.max(0, Math.floor(o.index))) : 0;
  const statut: StatutSprints = o.statut === 'paused' || o.statut === 'finished' ? o.statut : 'running';
  return {
    v: 1,
    plan,
    durees,
    reglages: o.reglages,
    choix: (typeof o.choix === 'string' && CHOIX.includes(o.choix) ? o.choix : 'perso') as ChoixSprint,
    debutMs: o.debutMs,
    index,
    etapeDebutMs: o.etapeDebutMs,
    pauseMs: nombre(o.pauseMs) ? o.pauseMs : null,
    statut,
    finMs: nombre(o.finMs) ? o.finMs : null,
    faits: nombre(o.faits) ? Math.max(0, Math.floor(o.faits)) : 0,
    arretee: o.arretee === true,
    majMs: nombre(o.majMs) ? o.majMs : o.debutMs,
  };
}

/**
 * Où en est la séance maintenant : les étapes finies pendant l'absence sont enchaînées à partir des heures
 * absolues (la suivante commence pile à la fin de la précédente). En pause, rien n'avance.
 */
export function etatMaintenant(b: BrouillonSprints, maintenantMs: number): { index: number; etapeDebutMs: number; fini: boolean; finMs: number | null } {
  if (b.statut === 'finished') return { index: b.index, etapeDebutMs: b.etapeDebutMs, fini: true, finMs: b.finMs ?? b.majMs };
  if (b.statut === 'paused') return { index: b.index, etapeDebutMs: b.etapeDebutMs, fini: false, finMs: null };
  let i = b.index;
  let debut = b.etapeDebutMs;
  while (i < b.durees.length) {
    const fin = debut + b.durees[i] * 1000;
    if (maintenantMs < fin) return { index: i, etapeDebutMs: debut, fini: false, finMs: null };
    if (i === b.durees.length - 1) return { index: i, etapeDebutMs: debut, fini: true, finMs: fin };
    debut = fin;
    i += 1;
  }
  return { index: b.durees.length - 1, etapeDebutMs: debut, fini: true, finMs: debut };
}

/** Sprints faits si la séance s'arrêtait maintenant (même règle que l'arrêt en direct) */
export function faitsMaintenant(b: BrouillonSprints, maintenantMs: number): number {
  if (b.arretee) return b.faits;
  if (b.statut === 'finished') return b.reglages.sprints;
  const e = etatMaintenant(b, maintenantMs);
  if (e.fini) return b.reglages.sprints;
  const fin = b.statut === 'paused' && b.pauseMs !== null ? b.pauseMs : maintenantMs;
  return sprintsFaits(b.plan, e.index, Math.max(0, fin - e.etapeDebutMs));
}

/** Heure de fin à enregistrer : la fin réelle si elle est connue, sinon la dernière trace de vie de la séance */
export function finPourEnregistrer(b: BrouillonSprints, maintenantMs: number): number {
  if (b.finMs !== null) return b.finMs;
  const e = etatMaintenant(b, maintenantMs);
  if (e.fini && e.finMs !== null) return e.finMs;
  if (b.statut === 'paused' && b.pauseMs !== null) return b.pauseMs;
  // app tuée en pleine séance : on ne compte pas les heures passées loin de l'app au delà de la fin prévue
  return Math.min(maintenantMs, e.etapeDebutMs + b.durees.slice(e.index).reduce((s, d) => s + d * 1000, 0));
}

/* ─── Stockage : une écriture à la fois, la dernière version gagne, rien après l'effacement ─── */

let file: Promise<void> = Promise.resolve();
let aEcrire: { b: BrouillonSprints; gen: number } | null = null;
let generation = 0;

export function generationSprints(): number {
  return generation;
}

export function sauverBrouillonSprints(b: BrouillonSprints, gen: number = generation): Promise<void> {
  aEcrire = { b, gen };
  file = file.then(async () => {
    const a = aEcrire;
    aEcrire = null;
    if (!a || a.gen !== generation) return;
    try {
      await AsyncStorage.setItem(CLE_BROUILLON_SPRINTS, JSON.stringify({ ...a.b, majMs: Date.now() }));
    } catch {
      // stockage indisponible : la séance continue en mémoire
    }
  });
  return file;
}

export async function chargerBrouillonSprints(): Promise<BrouillonSprints | null> {
  try {
    const raw = await AsyncStorage.getItem(CLE_BROUILLON_SPRINTS);
    if (!raw) return null;
    return lireBrouillonSprints(JSON.parse(raw));
  } catch {
    // illisible : on ne l'efface pas, on ne le montre pas
    return null;
  }
}

/** L'effacement passe dans la même file que les écritures : une nouvelle séance lancée juste après n'est jamais effacée */
export function effacerBrouillonSprints(): Promise<void> {
  generation += 1;
  aEcrire = null;
  file = file.catch(() => {}).then(async () => {
    try {
      await AsyncStorage.removeItem(CLE_BROUILLON_SPRINTS);
    } catch {
      // rien
    }
  });
  return file;
}
