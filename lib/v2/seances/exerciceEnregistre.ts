/**
 * Ce qu'un exercice de la seance en direct ajoute a l'exercice enregistre (revue du 30 octobre 2026) : sa note,
 * et pour un exercice cardio sa duree reelle (minutes) et sa distance. Donnees pures, testees dans
 * __tests__/unit/exerciceEnregistre.test.ts.
 */
export type ExoLive = { notes?: string; cardio?: { distanceKm?: number } | null };
export type ExoEnregistre = { notes?: string; duration?: number; distance?: number };

export function completerExercice<T extends ExoEnregistre>(out: T, e: ExoLive, dureeSec: number): T {
  // le bloc cardio avait ete pose entre le « if » de la note et son « else » : toute note de musculation
  // etait effacee a l'enregistrement (commit b27183e3). La note et le cardio sont maintenant separes.
  if (e.notes && e.notes.trim()) out.notes = e.notes.trim();
  else delete out.notes;
  if (e.cardio) {
    out.duration = Math.round((dureeSec || 0) / 60);
    if (e.cardio.distanceKm && e.cardio.distanceKm > 0) out.distance = e.cardio.distanceKm;
  }
  return out;
}
