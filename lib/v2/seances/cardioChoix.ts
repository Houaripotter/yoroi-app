/**
 * Choix du cardio de fin de seance, et sa saisie (31 octobre 2026, Houari : « j'aimerais choisir ce que je fais.
 * En général c'est de la marche inclinée 30 min, mais les utilisateurs doivent pouvoir choisir combien de temps,
 * et noter ce qu'ils font : la pente et la vitesse »).
 *
 *  - le type vient d'une liste fermee (TYPES_CARDIO), des noms sans marque, relies aux machines de cardioFin.ts ;
 *  - la duree : 10, 15, 20, 30, 45 min, ou une valeur libre ;
 *  - le choix est garde pour ce jour du programme (cle « programme|jour », comme les supersets) : c'est lui qui
 *    revient la fois suivante, sinon marche inclinee et la duree du programme (30 min par defaut) ;
 *  - pendant le cardio : pente (%) et vitesse (km/h) sur tapis, niveau sur velo, rameur, elliptique, escalier.
 *    Une seule valeur par defaut ; « Noter un changement » ajoute un segment ;
 *  - la derniere pente et la derniere vitesse de chaque type sont proposees la fois suivante, comme les crans de
 *    machine (reglagesMachine.ts). Les deux cles sont partagees avec tes appareils appaires (lib/v2/synchro/cles.ts).
 * Donnees pures plus lecture et ecriture, testees dans __tests__/unit/cardioChoix.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signalerASynchroniser } from '@/lib/v2/synchro/cles';
import { CARDIO_DEFAUT, CARDIO_FIN, NOM_AUTRE_CARDIO } from './cardioFin';
import type { SegmentCardio, TypeCardio } from './cardioFin';

export type { SegmentCardio, TypeCardio };
/** Ce qu'on note pendant ce cardio : pente et vitesse (tapis), un niveau (machines a resistance), ou rien */
export type MesureCardio = 'tapis' | 'niveau' | 'aucune';

export type InfoCardio = { id: TypeCardio; label: string; nom: string; mesure: MesureCardio; sticker: string };

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
export const DUREES_RAPIDES = [10, 15, 20, 30, 45] as const;
export const MINUTES_DEFAUT = 30;
export const MINUTES_MIN = 1;
export const MINUTES_MAX = 180;

export const infoCardio = (t: TypeCardio | null | undefined): InfoCardio => TYPES_CARDIO.find((x) => x.id === t) ?? TYPES_CARDIO[0];
const estType = (x: unknown): x is TypeCardio => typeof x === 'string' && TYPES_CARDIO.some((t) => t.id === x);

/** Le type d'un exercice cardio d'apres son nom (« Vélo de Biking / Spinning » est un velo) ; null si inconnu */
export function typeDeNom(nom: string | null | undefined): TypeCardio | null {
  if (!nom) return null;
  const direct = TYPES_CARDIO.find((t) => t.nom === nom);
  if (direct) return direct.id;
  if (nom === 'Vélo de Biking / Spinning') return 'velo';
  return CARDIO_FIN.some((c) => c.nom === nom) || nom === NOM_AUTRE_CARDIO ? 'autre' : null;
}

/** Une duree en minutes entre 1 et 180, ou null */
export function bornerMinutes(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= MINUTES_MIN && r <= MINUTES_MAX ? r : null;
}

/* ------------------------------------------------------------------------------------------------
 * Le choix, garde par jour du programme
 * ---------------------------------------------------------------------------------------------- */
export const CLE_CHOIX_CARDIO = 'yoroi_cardio_choix_v1';
export type ChoixCardio = { type: TypeCardio; minutes: number };
export type ChoixGardes = Record<string, ChoixCardio>;

/** « programme|jour », ou « libre » pour une seance hors programme */
export const cleChoix = (programme?: string | null, jour?: string | null): string => (programme && jour ? `${programme}|${jour}` : 'libre');

export function lireChoix(x: unknown): ChoixCardio | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const m = bornerMinutes(o.minutes);
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

/** Le choix de ce jour : ton dernier choix, sinon marche inclinee et la duree du programme (30 min sinon) */
export function choixParDefaut(gardes: ChoixGardes, cle: string, minutesProgramme?: number | null, typeProgramme?: TypeCardio | null): ChoixCardio {
  return gardes[cle] ?? { type: typeProgramme ?? TYPE_DEFAUT, minutes: bornerMinutes(minutesProgramme) ?? MINUTES_DEFAUT };
}

export async function chargerChoix(): Promise<ChoixGardes> {
  try {
    const raw = await AsyncStorage.getItem(CLE_CHOIX_CARDIO);
    return raw ? nettoyerChoix(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

let fileChoix: Promise<unknown> = Promise.resolve();
export function enregistrerChoix(cle: string, choix: ChoixCardio): Promise<ChoixGardes> {
  const suite = fileChoix.then(async () => {
    const c = lireChoix(choix);
    const g = await chargerChoix();
    if (!c) return g;
    const n = { ...g, [cle]: c };
    try {
      await AsyncStorage.setItem(CLE_CHOIX_CARDIO, JSON.stringify(n));
      signalerASynchroniser();
    } catch {
      // le choix reste pour cette seance
    }
    return n;
  });
  fileChoix = suite.catch(() => {});
  return suite;
}

/* ------------------------------------------------------------------------------------------------
 * Pente, vitesse, niveau
 * ---------------------------------------------------------------------------------------------- */
export const PENTE_MIN = 0;
export const PENTE_MAX = 30;
export const PAS_PENTE = 0.5;
export const VITESSE_MIN = 0.5;
export const VITESSE_MAX = 25;
export const PAS_VITESSE = 0.1;
export const PAS_VITESSE_GROS = 0.5;
export const NIVEAU_MIN = 1;
export const NIVEAU_MAX = 30;

const nombre = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

/** Pente en %, au pas de 0,5 */
export function bornerPente(v: unknown): number | null {
  const n = nombre(v);
  if (n === null || n < PENTE_MIN || n > PENTE_MAX) return null;
  return Math.round(n / PAS_PENTE) * PAS_PENTE;
}

/** Vitesse en km/h, au dixieme */
export function bornerVitesse(v: unknown): number | null {
  const n = nombre(v);
  if (n === null || n < VITESSE_MIN || n > VITESSE_MAX) return null;
  return Math.round(n * 10) / 10;
}

export function bornerNiveau(v: unknown): number | null {
  const n = nombre(v);
  if (n === null) return null;
  const r = Math.round(n);
  return r >= NIVEAU_MIN && r <= NIVEAU_MAX ? r : null;
}

export type Valeurs = { pente?: number; vitesse?: number; niveau?: number };

/** Garde seulement ce que ce type de cardio note, bornes */
export function valeursPour(mesure: MesureCardio, v: Valeurs | null | undefined): Valeurs {
  if (!v || mesure === 'aucune') return {};
  if (mesure === 'niveau') {
    const n = bornerNiveau(v.niveau);
    return n !== null ? { niveau: n } : {};
  }
  const p = bornerPente(v.pente);
  const s = bornerVitesse(v.vitesse);
  return { ...(p !== null ? { pente: p } : {}), ...(s !== null ? { vitesse: s } : {}) };
}

/** Le segment en cours (le dernier) */
export const segmentCourant = (segments: readonly SegmentCardio[] | null | undefined): SegmentCardio | null => (segments && segments.length ? segments[segments.length - 1] : null);

/** Change la valeur du segment en cours (un seul segment par defaut) */
export function avecValeur(segments: readonly SegmentCardio[] | null | undefined, mesure: MesureCardio, v: Valeurs): SegmentCardio[] {
  const liste = segments && segments.length ? segments.slice() : [{ aSec: 0 }];
  const i = liste.length - 1;
  liste[i] = { aSec: liste[i].aSec, ...valeursPour(mesure, { ...liste[i], ...v }) };
  return liste;
}

/** « Noter un changement » : un nouveau segment a `aSec`, qui reprend les valeurs du precedent (au plus 20) */
export function nouveauSegment(segments: readonly SegmentCardio[] | null | undefined, aSec: number): SegmentCardio[] {
  const liste = segments && segments.length ? segments.slice() : [{ aSec: 0 }];
  const dernier = liste[liste.length - 1];
  const t = Math.max(0, Math.round(aSec));
  // un changement juste apres le precedent le remplace : pas de segment de 0 seconde
  if (t - dernier.aSec < 10) return liste;
  if (liste.length >= 20) return liste;
  const { aSec: _a, ...valeurs } = dernier;
  return [...liste, { aSec: t, ...valeurs }];
}

/** Retire le dernier segment (le premier reste toujours) */
export function sansDernierSegment(segments: readonly SegmentCardio[] | null | undefined): SegmentCardio[] {
  const liste = segments && segments.length ? segments.slice() : [{ aSec: 0 }];
  return liste.length > 1 ? liste.slice(0, -1) : liste;
}

export type Bilan = {
  dureeSec: number;
  /** distance tiree de la vitesse du tapis et du temps, seulement si chaque segment a une vitesse */
  distanceKm?: number;
  penteMoy?: number;
  vitesseMoy?: number;
  niveauMoy?: number;
};

/** Moyennes ponderees par le temps de chaque segment ; rien d'estime si une valeur manque */
export function bilanCardio(segments: readonly SegmentCardio[] | null | undefined, dureeSec: number, mesure: MesureCardio): Bilan {
  const total = Math.max(0, Math.round(dureeSec));
  const out: Bilan = { dureeSec: total };
  if (!segments || !segments.length || total <= 0 || mesure === 'aucune') return out;
  const morceaux = segments
    .map((s, i) => ({ s, d: Math.max(0, Math.min(total, segments[i + 1]?.aSec ?? total) - Math.min(total, s.aSec)) }))
    .filter((m) => m.d > 0);
  if (!morceaux.length) return out;
  const moyenne = (k: 'pente' | 'vitesse' | 'niveau'): number | undefined => {
    if (!morceaux.every((m) => typeof m.s[k] === 'number')) return undefined;
    const t = morceaux.reduce((a, m) => a + m.d, 0);
    return morceaux.reduce((a, m) => a + (m.s[k] as number) * m.d, 0) / t;
  };
  if (mesure === 'tapis') {
    const p = moyenne('pente');
    const v = moyenne('vitesse');
    if (p !== undefined) out.penteMoy = Math.round(p * 10) / 10;
    if (v !== undefined) {
      out.vitesseMoy = Math.round(v * 10) / 10;
      const km = morceaux.reduce((a, m) => a + (m.s.vitesse as number) * (m.d / 3600), 0);
      out.distanceKm = Math.round(km * 100) / 100;
    }
  } else {
    const n = moyenne('niveau');
    if (n !== undefined) out.niveauMoy = Math.round(n * 10) / 10;
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------
 * Les dernieres valeurs, par type : preremplies la fois suivante
 * ---------------------------------------------------------------------------------------------- */
export const CLE_REGLAGES_CARDIO = 'yoroi_cardio_reglages_v1';
export type ReglagesCardio = Partial<Record<TypeCardio, Valeurs>>;

export function nettoyerReglagesCardio(x: unknown): ReglagesCardio {
  const out: ReglagesCardio = {};
  if (!x || typeof x !== 'object' || Array.isArray(x)) return out;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (!estType(k)) continue;
    const val = valeursPour(infoCardio(k).mesure, v as Valeurs);
    if (Object.keys(val).length) out[k] = val;
  }
  return out;
}

/** Les valeurs proposees au depart : celles de la derniere fois pour ce type, sinon rien (tu les notes) */
export const prerempli = (r: ReglagesCardio, type: TypeCardio): Valeurs => ({ ...(r[type] ?? {}) });

export async function chargerReglagesCardio(): Promise<ReglagesCardio> {
  try {
    const raw = await AsyncStorage.getItem(CLE_REGLAGES_CARDIO);
    return raw ? nettoyerReglagesCardio(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

let fileReglages: Promise<unknown> = Promise.resolve();
export function enregistrerReglagesCardio(type: TypeCardio, v: Valeurs): Promise<ReglagesCardio> {
  const suite = fileReglages.then(async () => {
    const r = await chargerReglagesCardio();
    const val = valeursPour(infoCardio(type).mesure, v);
    if (!Object.keys(val).length) return r;
    const n = { ...r, [type]: val };
    try {
      await AsyncStorage.setItem(CLE_REGLAGES_CARDIO, JSON.stringify(n));
      signalerASynchroniser();
    } catch {
      // les valeurs restent affichees pour cette seance
    }
    return n;
  });
  fileReglages = suite.catch(() => {});
  return suite;
}

/** Le type de depart d'un cardio de fin de seance : le nom de la machine choisie par le programme */
export const typeDepart = (nom: string): TypeCardio => typeDeNom(nom) ?? TYPE_DEFAUT;
export { CARDIO_DEFAUT };
