/**
 * Le cardio de fin de seance tel qu'il est vraiment (31 octobre 2026, Houari : « si j'ai fait du vélo, je veux
 * qu'elle annonce le vélo. Il ne faut pas mentir »). Un petit module sans dependance lourde, lu par les ecrans qui
 * annoncent la seance (carte du jour, page du programme, rappels) et par ceux qui la resument apres (Bravo,
 * historique, calendrier, detail) :
 *  - la liste fermee des types (TYPES_CARDIO) et leur phrase « 20 min de vélo » ;
 *  - le choix garde par jour du programme, en memoire (rempli par cardioChoix.ts, chargerChoix et enregistrerChoix) ;
 *  - le cardio reellement fait d'une seance enregistree, lu dans ses exercices.
 * Donnees pures, testees dans __tests__/unit/cardioChoix.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { traduire } from '@/lib/i18n/tr';
import type { TypeCardio } from './cardioFin';

/** Ce qu'on note pendant ce cardio : pente et vitesse (tapis), un niveau (machines a resistance), ou rien */
export type MesureCardio = 'tapis' | 'niveau' | 'aucune';
export type InfoCardio = { id: TypeCardio; label: string; nom: string; mesure: MesureCardio; sticker: string };

/** « Autre », un cardio que la liste ne connait pas (pas d'exercice de la bibliotheque) */
export const NOM_AUTRE_CARDIO = 'Autre cardio';

/** La liste fermee : rien d'autre n'est propose. `nom` : l'exercice de la seance (cardioFin.ts) */
export const TYPES_CARDIO: readonly InfoCardio[] = [
  { id: 'marche_inclinee', label: 'Marche inclinée', nom: 'Marche inclinée sur tapis', mesure: 'tapis', sticker: 'sport_marche' },
  { id: 'tapis_course', label: 'Course sur tapis', nom: 'Course sur tapis', mesure: 'tapis', sticker: 'course' },
  { id: 'velo', label: 'Vélo', nom: 'Vélo d’appartement', mesure: 'niveau', sticker: 'sport_velo' },
  { id: 'rameur', label: 'Rameur', nom: 'Rameur', mesure: 'niveau', sticker: 'sport_pagaie' },
  { id: 'elliptique', label: 'Elliptique', nom: 'Vélo Elliptique', mesure: 'niveau', sticker: 'repeter' },
  { id: 'escalier', label: 'Escalier', nom: 'Escaliers', mesure: 'niveau', sticker: 'montagne_drapeau' },
  { id: 'corde', label: 'Corde à sauter', nom: 'Corde à sauter', mesure: 'aucune', sticker: 'flamme' },
  { id: 'autre', label: 'Autre', nom: NOM_AUTRE_CARDIO, mesure: 'aucune', sticker: 'cardio_zone2' },
];
export const TYPE_DEFAUT: TypeCardio = 'marche_inclinee';
export const MINUTES_DEFAUT = 30;

export const infoCardio = (t: TypeCardio | null | undefined): InfoCardio => TYPES_CARDIO.find((x) => x.id === t) ?? TYPES_CARDIO[0];
export const estType = (x: unknown): x is TypeCardio => typeof x === 'string' && TYPES_CARDIO.some((t) => t.id === x);

/** Le type d'un exercice cardio d'apres son nom ; null si ce n'est pas un cardio de fin de seance */
export function typeDeNom(nom: string | null | undefined): TypeCardio | null {
  if (!nom) return null;
  const direct = TYPES_CARDIO.find((t) => t.nom === nom);
  if (direct) return direct.id;
  if (nom === 'Vélo de Biking / Spinning') return 'velo';
  return null;
}

/** « 20 min de vélo » : une phrase par type, pour l'accord (« d'elliptique ») */
const PHRASES: Record<TypeCardio, string> = {
  marche_inclinee: '{0} min de marche inclinée',
  tapis_course: '{0} min de course sur tapis',
  velo: '{0} min de vélo',
  rameur: '{0} min de rameur',
  elliptique: '{0} min d’elliptique',
  escalier: '{0} min d’escalier',
  corde: '{0} min de corde à sauter',
  autre: '{0} min de cardio',
};
export const phraseCardio = (type: TypeCardio): string => PHRASES[type] ?? PHRASES.autre;
/** « 20 min de vélo », traduit */
export const libelleCardio = (type: TypeCardio, minutes: number): string => traduire(phraseCardio(type), Math.max(1, Math.round(minutes)));

/* ------------------------------------------------------------------------------------------------
 * Le choix garde par jour du programme, en memoire
 * ---------------------------------------------------------------------------------------------- */
export type ChoixCardio = { type: TypeCardio; minutes: number };
export type ChoixGardes = Record<string, ChoixCardio>;

/** « programme|jour », ou « libre » pour une seance hors programme */
export const cleChoix = (programme?: string | null, jour?: string | null): string => (programme && jour ? `${programme}|${jour}` : 'libre');

let enMemoire: ChoixGardes = {};
export const choixEnMemoire = (): ChoixGardes => enMemoire;
export function retenirChoix(g: ChoixGardes): void {
  enMemoire = g;
}

const minutesOk = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && Math.round(n) >= 1 && Math.round(n) <= 180 ? Math.round(n) : null;
};

export const CLE_CHOIX_CARDIO = 'yoroi_cardio_choix_v1';

export function lireChoix(x: unknown): ChoixCardio | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const m = minutesOk(o.minutes);
  return estType(o.type) && m !== null ? { type: o.type, minutes: m } : null;
}

export function nettoyerChoix(x: unknown): ChoixGardes {
  const out: ChoixGardes = {};
  if (!x || typeof x !== 'object' || Array.isArray(x)) return out;
  for (const [k, v] of Object.entries(x as Record<string, unknown>).slice(0, 200)) {
    const c = lireChoix(v);
    if (k && k.length <= 240 && c) out[k] = c;
  }
  return out;
}


/**
 * La copie en memoire, relue du stockage : appelee par chargerProgrammeActif (suivi.ts), si bien que chaque ecran qui
 * annonce la seance du jour connait deja ton choix ; la synchro la relit aussi (lib/v2/synchro/cles.ts).
 */
export async function hydraterChoix(): Promise<ChoixGardes> {
  try {
    const raw = await AsyncStorage.getItem(CLE_CHOIX_CARDIO);
    enMemoire = raw ? nettoyerChoix(JSON.parse(raw)) : {};
  } catch {
    // stockage illisible : la copie d'avant reste
  }
  return enMemoire;
}

/** Le choix de ce jour : ton dernier choix, sinon marche inclinee et la duree du programme (30 min sinon) */
export function choixParDefaut(gardes: ChoixGardes, cle: string, minutesProgramme?: number | null): ChoixCardio {
  return gardes[cle] ?? { type: TYPE_DEFAUT, minutes: minutesOk(minutesProgramme) ?? MINUTES_DEFAUT };
}

/** Le cardio annonce pour ce jour du programme, d'apres le choix en memoire */
export const cardioPrevu = (programme: string | null | undefined, jour: string | null | undefined, minutesProgramme?: number | null): ChoixCardio =>
  choixParDefaut(enMemoire, cleChoix(programme, jour), minutesProgramme);

/* ------------------------------------------------------------------------------------------------
 * Le cardio reellement fait, dans une seance enregistree
 * ---------------------------------------------------------------------------------------------- */
type ExoLu = { name?: unknown; muscle_group?: unknown; duration?: unknown; cardio?: { type?: unknown } | null };

/**
 * Le cardio de fin de seance d'une seance enregistree : son type (le resume du cardio, sinon le nom de la machine)
 * et sa duree reelle. null s'il n'y en a pas, ou s'il a ete passe (il n'est alors pas enregistre).
 */
export function cardioFait(exos: readonly unknown[] | null | undefined): ChoixCardio | null {
  for (const x of exos ?? []) {
    const e = x as ExoLu | null;
    if (!e || typeof e !== 'object') continue;
    const type = estType(e.cardio?.type) ? e.cardio!.type as TypeCardio : typeDeNom(typeof e.name === 'string' ? e.name : null);
    const minutes = minutesOk(e.duration);
    if (type && minutes && (e.cardio || e.muscle_group === 'CARDIO')) return { type, minutes };
  }
  return null;
}

/** Un exercice enregistre qui est le cardio de fin de seance (sa serie contient des secondes, pas des repetitions) */
export const estCardioEnregistre = (x: unknown): boolean => cardioFait([x]) !== null;
