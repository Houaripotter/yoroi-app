/**
 * Cartes « Ma semaine » et « Mon année » (18 octobre 2026, sortie 3.0.0) : le meme compteur de seances
 * que l'accueil et l'onglet Seances. Une seance relue depuis Sante n'est comptee qu'une fois (dedupeTrainings),
 * deux seances le meme jour comptent pour deux, le jour est celui enregistre (AAAA-MM-JJ, sans fuseau).
 * Logique pure, testee dans __tests__/unit/compteurSeances.test.ts.
 */
import type { Training } from '@/lib/database';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';

const jourDe = (t: Training) => String(t?.date ?? '').slice(0, 10);

/** Les seances (sans doublon) dont le jour est entre debut et fin inclus (AAAA-MM-JJ) */
export function seancesEntre(trainings: Training[], debut: string, fin: string): Training[] {
  return dedupeTrainings((trainings ?? []).filter((t) => {
    const d = jourDe(t);
    return d >= debut && d <= fin;
  }));
}

/** Nombre de seances entre debut et fin inclus */
export function compterSeances(trainings: Training[], debut: string, fin: string): number {
  return seancesEntre(trainings, debut, fin).length;
}

/** L'objectif d'une carte se lit en seances : tenu quand le nombre de seances atteint l'objectif */
export function objectifTenu(seances: number, objectif: number): boolean {
  return objectif > 0 && seances >= objectif;
}

/** « Objectif : 4 séances » ; rien sans objectif */
export function libelleObjectifSeances(objectif: number): string | undefined {
  if (!(objectif > 0)) return undefined;
  return `Objectif : ${objectif} séance${objectif > 1 ? 's' : ''}`;
}
