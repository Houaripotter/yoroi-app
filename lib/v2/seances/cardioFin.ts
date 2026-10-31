/**
 * Le cardio de fin de seance devient un vrai exercice, avec son chrono (30 octobre 2026, demande de Houari).
 * Avant : un bloc de texte dans les notes de la seance (lib/v2/programmes/lancer.ts).
 *
 * Mecanisme reutilise : un exercice en duree existait deja en musculation (la planche, cible.secondes) : la duree
 * est rangee en secondes dans les repetitions de la serie, charge 0 (pas de tonnage, pas de record). L'exercice
 * cardio a une seule serie ; le chrono vit dans `cardio` (heure de depart et temps deja cumule), donc il tient
 * en arriere plan, telephone verrouille, et meme si l'app est fermee (le brouillon est enregistre).
 *
 * Machines : des noms sans marque, chacun relie a un exercice cardio de constants/exerciseLibrary.ts.
 * Donnees pures, sauf programmer/annulerFinCardio (notification de fin d'objectif).
 */
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { TYPE_FIN_REPOS } from '@/lib/v2/seance/rappelRepos';
import { NOM_AUTRE_CARDIO } from './cardioJour';

/** Une machine de cardio : nom affiche (sans marque) et l'exercice de la bibliotheque qui la decrit */
export const CARDIO_FIN: { nom: string; biblio: string }[] = [
  { nom: 'Marche inclinée sur tapis', biblio: 'Marche Inclinée (Matrix)' },
  { nom: 'Vélo d’appartement', biblio: 'Vélo Statique (Technogym)' },
  { nom: 'Rameur', biblio: 'Rameur Concept2' },
  { nom: 'Vélo Elliptique', biblio: 'Vélo Elliptique' },
  { nom: 'Course sur tapis', biblio: 'Course (Tapis Matrix)' },
  { nom: 'Vélo de Biking / Spinning', biblio: 'Vélo de Biking / Spinning' },
  { nom: 'Escaliers', biblio: 'Stairmaster / Escaliers' },
  // 31 octobre 2026 : la corde a sauter, pour le choix du cardio de fin de seance (cardioChoix.ts)
  { nom: 'Corde à sauter', biblio: 'Corde à sauter Speed' },
];
/** 31 octobre 2026 : « Autre », un cardio que la liste ne connait pas (cardioJour.ts) */
export { NOM_AUTRE_CARDIO };
export const CARDIO_DEFAUT = CARDIO_FIN[0].nom;

export const estCardioFin = (nom: string): boolean => nom === NOM_AUTRE_CARDIO || CARDIO_FIN.some((c) => c.nom === nom);
export const biblioDe = (nom: string): string | undefined => CARDIO_FIN.find((c) => c.nom === nom)?.biblio;

const existe = (biblio: string) => EXERCISE_LIBRARY.some((e) => e.name === biblio && e.category === 'cardio');

/** Le cardio propose : la marche inclinee, sinon la premiere machine pas ecartee */
export function nomCardioFin(ecartes: Iterable<string> = []): string {
  const ex = new Set(ecartes);
  return CARDIO_FIN.find((c) => existe(c.biblio) && !ex.has(c.nom))?.nom ?? CARDIO_DEFAUT;
}

/** « Remplacer » sur un exercice cardio : seulement les autres machines de cardio, sans les ecartees */
export function alternativesCardio(nom: string, ecartes: Iterable<string> = [], max = 5): string[] {
  const ex = new Set(ecartes);
  return CARDIO_FIN.filter((c) => c.nom !== nom && existe(c.biblio) && !ex.has(c.nom)).slice(0, max).map((c) => c.nom);
}

export type ChronoCardio = {
  /** objectif en secondes */
  objectifSec: number;
  /** heure de depart du chrono en cours (ms), null : arrete ou en pause */
  debutMs: number | null;
  /** temps deja fait avant la derniere pause (ms) */
  cumulMs: number;
  /** la fin de l'objectif a deja ete signalee (son ou petit message) */
  signale?: boolean;
  /** duree saisie a la main (minutes), quand le chrono n'a pas ete lance */
  manuelMin?: number;
  /** distance facultative (km) */
  distanceKm?: number;
  /* 31 octobre 2026 (Houari : « choisir ce que je fais, noter la pente et la vitesse, tenir compte de ma zone 2 ») */
  /** le type de cardio choisi (cardioChoix.ts) */
  type?: TypeCardio;
  /** la feuille de choix a deja ete vue pour cet exercice */
  choisi?: boolean;
  /** pente, vitesse ou niveau, par segments (un seul par defaut), `aSec` : debut du segment dans le chrono */
  segments?: SegmentCardio[];
  /** heure du tout premier depart et heure de fin (ms) : la fenetre ou lire la FC */
  premierDebutMs?: number;
  finMs?: number;
  /** FC moyenne lue dans Sante pendant le cardio, absente si rien de fiable */
  fcMoy?: number;
  /** sans FC : « Tu pouvais parler ? » */
  parler?: boolean;
  /** la plage de zone 2 de l'utilisateur au moment du cardio (bpm) */
  zone2?: { min: number; max: number };
  /** ce que tu as decide pour la prochaine fois : garder, ou la suggestion */
  suite?: 'garder' | 'suggestion';
};

export type TypeCardio = 'marche_inclinee' | 'tapis_course' | 'velo' | 'rameur' | 'elliptique' | 'escalier' | 'corde' | 'autre';
/** Un reglage pendant le cardio : pente (%) et vitesse (km/h) sur tapis, niveau sur velo, rameur... */
export type SegmentCardio = { aSec: number; pente?: number; vitesse?: number; niveau?: number };

export const nouveauChrono = (minutes: number): ChronoCardio => ({ objectifSec: Math.max(60, Math.round(minutes) * 60), debutMs: null, cumulMs: 0 });

/** Temps ecoule (ms), calcule depuis l'heure de depart : juste meme apres une pause de l'app */
export function ecouleMs(c: ChronoCardio, maintenant: number): number {
  return Math.max(0, c.cumulMs + (c.debutMs !== null ? Math.max(0, maintenant - c.debutMs) : 0));
}

export const enCours = (c: ChronoCardio): boolean => c.debutMs !== null;

export function demarrer(c: ChronoCardio, maintenant: number): ChronoCardio {
  return c.debutMs !== null ? c : { ...c, debutMs: maintenant, premierDebutMs: c.premierDebutMs ?? maintenant };
}

export function pause(c: ChronoCardio, maintenant: number): ChronoCardio {
  return c.debutMs === null ? c : { ...c, cumulMs: ecouleMs(c, maintenant), debutMs: null };
}

/** Heure (ms) ou l'objectif sera atteint, chrono en marche ; null en pause ou objectif deja passe a l'arret */
export function finObjectifMs(c: ChronoCardio): number | null {
  if (c.debutMs === null) return null;
  return c.debutMs + (c.objectifSec * 1000 - c.cumulMs);
}

export const objectifAtteint = (c: ChronoCardio, maintenant: number): boolean => ecouleMs(c, maintenant) >= c.objectifSec * 1000;

/** La duree enregistree (secondes) : le chrono s'il a tourne, sinon la saisie a la main, sinon 0 */
export function dureeFinaleSec(c: ChronoCardio, maintenant: number): number {
  const chrono = Math.round(ecouleMs(c, maintenant) / 1000);
  if (chrono > 0) return chrono;
  return c.manuelMin && c.manuelMin > 0 ? Math.round(c.manuelMin * 60) : 0;
}

/** « 12:34 », « 1:05:00 » */
export function fmtChrono(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(r)}` : `${p(m)}:${p(r)}`;
}

/**
 * Revue du 30 octobre 2026 : un cardio supprime ou remplace pendant la seance. La notification « Cardio terminé »
 * n'existe que si son chrono tourne et que la fin n'a pas encore ete signalee : alors on l'annule, et pour un
 * remplacement on la reprogramme (nouveau nom) sur le temps qui reste. Sinon on ne touche a rien : la
 * notification d'un autre cardio de la seance (meme identifiant) n'est pas annulee par erreur.
 */
export function suiteFinCardio(c: ChronoCardio | null | undefined, maintenant: number, remplace: boolean): { annuler: boolean; reprogrammerDans: number | null } {
  if (!c || !enCours(c) || c.signale) return { annuler: false, reprogrammerDans: null };
  const resteSec = Math.floor((c.objectifSec * 1000 - ecouleMs(c, maintenant)) / 1000);
  return { annuler: true, reprogrammerDans: remplace && resteSec > 0 ? resteSec : null };
}

/* eslint-disable @typescript-eslint/no-require-imports */
export const ID_FIN_CARDIO = 'yoroi.seance.cardio';

/**
 * Notification « Cardio terminé » a l'heure de fin de l'objectif. Elle porte le type du rappel de fin de repos :
 * le gestionnaire des notifications de l'app la masque deja quand l'app est ouverte (lib/v2/notifications/gestionnaire.ts),
 * le son de l'ecran suffit alors. Rien sans autorisation deja donnee.
 */
export async function programmerFinCardio(secondes: number, titre: string, corps: string): Promise<void> {
  try {
    const Notif = require('expo-notifications');
    await Notif.cancelScheduledNotificationAsync(ID_FIN_CARDIO).catch(() => {});
    if (secondes < 2) return;
    const perm = await Notif.getPermissionsAsync();
    if (perm?.status !== 'granted') return;
    await Notif.scheduleNotificationAsync({
      identifier: ID_FIN_CARDIO,
      content: { title: titre, body: corps, sound: 'default', data: { type: TYPE_FIN_REPOS } },
      trigger: { type: Notif.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.ceil(secondes) },
    });
  } catch {
    // pas de notification possible : le chrono reste juste a l'ecran
  }
}

export async function annulerFinCardio(): Promise<void> {
  try {
    const Notif = require('expo-notifications');
    await Notif.cancelScheduledNotificationAsync(ID_FIN_CARDIO);
  } catch {
    // rien de programme
  }
}
/* eslint-enable @typescript-eslint/no-require-imports */
