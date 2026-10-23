/**
 * Choix des jours quand une frequence est choisie (15 octobre 2026, retour de Houari) :
 * « 1 fois par semaine » puis toucher un jour ne doit jamais passer a 2.
 * La frequence choisie est respectee : toucher un jour le prend ; si le nombre de jours pris atteint deja
 * la frequence, le nouveau jour REMPLACE le plus ancien pris. Toucher un jour pris le retire.
 * La frequence ne change que si l'utilisateur la touche lui meme.
 * Les jours sont numerotes 0 = lundi a 6 = dimanche. `ordre` garde les jours dans l'ordre ou ils ont ete pris
 * (le plus ancien en tete) ; on enregistre toujours la liste triee (joursTries).
 */

const valide = (j: number) => Number.isInteger(j) && j >= 0 && j <= 6;

/** Liste triee, sans doublon ni valeur hors semaine */
export function joursTries(jours: readonly number[]): number[] {
  return Array.from(new Set(jours.filter(valide))).sort((a, b) => a - b);
}

/** Frequence utilisable (1 a 7), sinon null : pas de limite */
export function frequenceValide(f: number | null | undefined): number | null {
  if (f == null || !Number.isFinite(f)) return null;
  const k = Math.round(f);
  return k >= 1 && k <= 7 ? k : null;
}

/**
 * Toucher un jour. Rend le nouvel ordre (le plus ancien en tete).
 * - jour deja pris : il est retire (la frequence ne bouge pas) ;
 * - sinon, s'il reste de la place (ou sans frequence) : il est ajoute ;
 * - sinon : il remplace le plus ancien pris.
 */
export function toucherJour(ordre: readonly number[], jour: number, frequence: number | null | undefined): number[] {
  const base = ordre.filter((j, i) => valide(j) && ordre.indexOf(j) === i);
  if (!valide(jour)) return base;
  if (base.includes(jour)) return base.filter((j) => j !== jour);
  const f = frequenceValide(frequence);
  if (f == null || base.length < f) return [...base, jour];
  // deja plein : on garde les (f - 1) plus recents et on ajoute le nouveau
  return [...base.slice(base.length - (f - 1)), jour];
}

/**
 * Remet l'ordre en phase avec une liste venue d'ailleurs (brouillon, reglages) :
 * garde l'ordre connu des jours encore pris, ajoute les autres (tries) a la fin.
 */
export function synchroniserOrdre(ordre: readonly number[], jours: readonly number[]): number[] {
  const l = joursTries(jours);
  const gardes = ordre.filter((j, i) => l.includes(j) && ordre.indexOf(j) === i);
  return [...gardes, ...l.filter((j) => !gardes.includes(j))];
}

/**
 * La frequence change (choisie par l'utilisateur) : on garde les jours deja pris s'ils tiennent,
 * sinon les plus recents. Rend l'ordre.
 */
export function ajusterAFrequence(ordre: readonly number[], frequence: number | null | undefined): number[] {
  const base = ordre.filter((j, i) => valide(j) && ordre.indexOf(j) === i);
  const f = frequenceValide(frequence);
  if (f == null || base.length <= f) return base;
  return base.slice(base.length - f);
}
