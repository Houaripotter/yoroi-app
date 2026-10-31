/**
 * Le cardio de fin de seance dans la seance en direct (31 octobre 2026) : appliquer le choix (type, duree),
 * preremplir pente et vitesse, et trouver l'exercice suivant (les abdos, superset compris, puis le cardio).
 * Donnees pures, testees dans __tests__/unit/cardioChoix.test.ts.
 */
import { infoCardio, prerempli, typeDepart, valeursPour } from './cardioChoix';
import type { ChoixCardio, ReglagesCardio } from './cardioChoix';
import type { ChronoCardio } from './cardioFin';

type ExoAvecCardio = { id: string; name: string; laisse?: boolean; sets: { done: boolean; reps: number }[]; cardio?: ChronoCardio };

/** Le chrono avec son type et ses valeurs de depart (la derniere fois pour ce type), sans toucher a un chrono lance */
export function preparerCardio(c: ChronoCardio, nom: string, reglages: ReglagesCardio): ChronoCardio {
  const type = c.type ?? typeDepart(nom);
  if (c.segments?.length || c.premierDebutMs) return { ...c, type };
  const v = valeursPour(infoCardio(type).mesure, prerempli(reglages, type));
  return { ...c, type, segments: [{ aSec: 0, ...v }] };
}

/**
 * Le choix de la feuille : le nom de l'exercice, l'objectif et le type changent. Pas encore lance : les valeurs de
 * depart suivent le nouveau type. Deja lance : le temps fait reste, seul l'objectif et le type changent.
 */
export function appliquerChoix<E extends ExoAvecCardio>(ex: E, choix: ChoixCardio, reglages: ReglagesCardio): E {
  if (!ex.cardio) return ex;
  const info = infoCardio(choix.type);
  const objectifSec = Math.max(60, Math.round(choix.minutes) * 60);
  const lance = !!ex.cardio.premierDebutMs || ex.cardio.cumulMs > 0;
  const changeType = ex.cardio.type !== choix.type;
  const segments = !lance && changeType ? [{ aSec: 0, ...valeursPour(info.mesure, prerempli(reglages, choix.type)) }] : ex.cardio.segments;
  const cardio: ChronoCardio = { ...ex.cardio, type: choix.type, choisi: true, objectifSec, ...(segments ? { segments } : {}), ...(changeType ? { signale: false } : {}) };
  const sets = ex.sets.map((s, i) => (i === 0 && !s.done ? { ...s, reps: objectifSec } : s));
  return { ...ex, name: info.nom, cardio, sets };
}

const reste = (e: ExoAvecCardio) => !e.laisse && e.sets.some((s) => !s.done);

/** L'exercice suivant de la seance : le premier apres l'exercice en cours qui a encore une serie, sinon avant */
export function exerciceSuivant<E extends ExoAvecCardio>(liste: readonly E[], currentId: string | null): E | undefined {
  const i = liste.findIndex((e) => e.id === currentId);
  if (i < 0) return undefined;
  return liste.find((e, k) => k > i && reste(e)) ?? liste.find((e) => e.id !== currentId && reste(e));
}
