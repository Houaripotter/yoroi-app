/**
 * Les series en seance (30 octobre 2026, retour de Houari : « j'ai ajoute une serie par erreur, je ne peux ni
 * l'effacer ni la remettre a zero, et Valider reste grise »).
 * Une serie vide (ni charge ni repetitions) est ignoree : elle ne bloque plus rien. Une serie a moitie remplie
 * (une charge sans repetitions) est signalee, sans rien bloquer d'autre. Une serie aux repetitions remplies et
 * sans charge reste valable : poids du corps. Il reste toujours au moins une serie.
 * Encouragement : la derniere fois, toutes tes series au haut de l'objectif de repetitions, on te propose un
 * palier de plus, sans chiffre de kilos (chaque machine a son pas). Donnees pures.
 */

export type SerieSaisie = { weight: number; reps: number; done?: boolean };
export type EtatSerie = 'vide' | 'moitie' | 'remplie';

export function etatSerie(s: SerieSaisie): EtatSerie {
  const reps = Number(s.reps) || 0;
  const poids = Number(s.weight) || 0;
  if (reps > 0) return 'remplie';
  return poids > 0 ? 'moitie' : 'vide';
}

/** Valider est possible des qu'une serie restante est remplie ; les vides sont ignorees */
export function peutValider(sets: readonly SerieSaisie[]): boolean {
  return sets.some((s) => !s.done && etatSerie(s) === 'remplie');
}

/** Les series restantes qui comptent (les vides sont ignorees) */
export function seriesAFaire(sets: readonly SerieSaisie[]): number {
  return sets.filter((s) => !s.done && etatSerie(s) !== 'vide').length;
}

/** La liste sans la serie `index` ; la derniere serie restante ne se supprime pas */
export function sansSerie<S>(sets: readonly S[], index: number): S[] {
  if (sets.length <= 1 || index < 0 || index >= sets.length) return [...sets];
  return sets.filter((_, i) => i !== index);
}

/** La serie remise a sa place apres « Annuler » */
export function remettreSerie<S>(sets: readonly S[], serie: S, index: number): S[] {
  const out = [...sets];
  out.splice(Math.max(0, Math.min(index, out.length)), 0, serie);
  return out;
}

/** Valeurs d'une serie ajoutee : celles de la serie d'avant, repetitions de l'objectif si elle n'en a pas */
export function nouvelleSerie(precedente: SerieSaisie | undefined, repsObjectif?: number | null): { weight: number; reps: number } {
  const reps = Number(precedente?.reps) || 0;
  return { weight: Number(precedente?.weight) || 0, reps: reps > 0 ? reps : repsObjectif && repsObjectif > 0 ? repsObjectif : 10 };
}

/**
 * La meilleure serie de la derniere fois quand toutes ses series de travail ont atteint le haut de l'objectif
 * de repetitions ; null sinon (pas de derniere fois, pas d'objectif connu, exercice en secondes).
 */
export function encouragement(
  derniere: readonly { weight: number; reps: number }[] | undefined,
  objectif: { repsMax?: number; secondes?: boolean } | null | undefined,
): { weight: number; reps: number } | null {
  if (!derniere || derniere.length === 0 || !objectif || objectif.secondes) return null;
  const cible = Number(objectif.repsMax) || 0;
  if (cible <= 0) return null;
  const travail = derniere.filter((s) => (Number(s.reps) || 0) > 0);
  if (travail.length === 0 || !travail.every((s) => s.reps >= cible)) return null;
  return [...travail].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
}

/**
 * 17 novembre 2026, retour de Houari : « a la poulie je note 20 a la premiere serie, et a la deuxieme ca me met
 * direct 40, alors que j'etais a 20. Pareil pour les repetitions ».
 * Cause : apres une serie validee, la suivante ne reprenait ses valeurs que si elle n'avait aucune reference
 * (prevWeight absent). Avec une derniere fois connue, ou une seance de programme, les series suivantes gardaient
 * les charges et repetitions pre-remplies au lancement (ta derniere fois, ou la proposition du programme), meme
 * quand tu venais de faire autre chose. D'ou 40 kg affiches juste apres une serie a 20 kg.
 * Regle : la serie validee est recopiee, telle quelle (jamais additionnee ni doublee), dans les series suivantes
 * pas encore faites, jusqu'a la prochaine serie deja faite. L'aide « la derniere fois » (prevWeight, prevReps)
 * reste affichee. Exceptions : un echauffement ou un drop set valide ne se recopie pas (la serie de travail
 * d'apres n'a pas sa charge), et une serie suivante d'echauffement ou de drop set garde ses valeurs.
 */
type SerieRecopiable = SerieSaisie & { type?: string; plaques?: number };

export function reporterSerie<S extends SerieRecopiable>(sets: readonly S[], index: number): S[] {
  const ref = sets[index];
  const out = [...sets];
  if (!ref || ref.type === 'warmup' || ref.type === 'dropset') return out;
  for (let i = index + 1; i < out.length; i++) {
    const s = out[i];
    if (s.done) break;
    if (s.type === 'warmup' || s.type === 'dropset') continue;
    out[i] = { ...s, weight: ref.weight, reps: ref.reps, ...(typeof ref.plaques === 'number' ? { plaques: ref.plaques } : {}) };
  }
  return out;
}
