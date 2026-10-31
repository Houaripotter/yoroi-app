/**
 * Superset et circuit (31 octobre 2026, Houari : « dans mes abdos j'aime bien faire un deuxième exercice à la
 * suite, crunch puis roue abdominale »). Generique : marche pour tous les exercices, l'entree principale est le
 * bloc abdos de la seance en direct (app/seance/muscu.tsx).
 *
 * Le modele, le plus simple possible : `enchaine: true` sur un exercice le lie a l'exercice qui le suit dans la
 * seance. Une suite d'exercices lies forme un groupe : deux, un superset ; trois ou plus, un circuit.
 * Pendant la seance : A puis B puis repos. Une serie validee sur un exercice du groupe passe sans repos au suivant
 * du groupe qui a encore une serie a faire ; apres le dernier, le repos se lance (celui du dernier exercice) et
 * l'ecran revient au premier exercice du groupe qui a encore une serie.
 * Le dernier exercice d'une seance n'est jamais lie (nettoyerEnchaines). Donnees pures, testees dans
 * __tests__/unit/superset.test.ts.
 */

export type Enchainable = { id: string; enchaine?: boolean };
type AvecSeries = Enchainable & { sets: { done: boolean }[]; laisse?: boolean };

/** Le dernier exercice d'une liste n'est lie a rien : son drapeau tombe */
export function nettoyerEnchaines<E extends Enchainable>(liste: readonly E[]): E[] {
  return liste.map((e, i) => {
    if (!e.enchaine) return e;
    if (i < liste.length - 1) return e;
    const { enchaine: _e, ...reste } = e;
    return reste as E;
  });
}

/** Debut et fin (inclus) du groupe qui contient l'exercice ; un exercice seul est son propre groupe */
export function bornesGroupe(liste: readonly Enchainable[], id: string): { debut: number; fin: number } | null {
  const i = liste.findIndex((e) => e.id === id);
  if (i < 0) return null;
  let debut = i;
  while (debut > 0 && liste[debut - 1].enchaine) debut--;
  let fin = i;
  while (fin < liste.length - 1 && liste[fin].enchaine) fin++;
  return { debut, fin };
}

/** Les exercices du groupe (un seul si l'exercice n'est lie a rien) */
export function groupeDe<E extends Enchainable>(liste: readonly E[], id: string): E[] {
  const b = bornesGroupe(liste, id);
  return b ? liste.slice(b.debut, b.fin + 1) : [];
}

export const estEnGroupe = (liste: readonly Enchainable[], id: string): boolean => groupeDe(liste, id).length > 1;

/** « Superset » pour deux exercices, « Circuit » au dela (texte francais, traduit a l'affichage) */
export function nomDuGroupe(n: number): 'Superset' | 'Circuit' {
  return n > 2 ? 'Circuit' : 'Superset';
}

/** Les groupes de la seance, dans l'ordre : [debut, fin] de chaque groupe d'au moins deux exercices */
export function groupesDeSeance(liste: readonly Enchainable[]): { debut: number; fin: number }[] {
  const out: { debut: number; fin: number }[] = [];
  let i = 0;
  while (i < liste.length) {
    const b = bornesGroupe(liste, liste[i].id)!;
    if (b.fin > b.debut) out.push(b);
    i = b.fin + 1;
  }
  return out;
}

const resteASerie = (e: AvecSeries): boolean => !e.laisse && e.sets.some((s) => !s.done);

/**
 * Apres une serie validee sur `id` (series deja a jour dans `liste`) : l'exercice suivant a montrer et s'il faut
 * un repos. Hors groupe : pas de changement d'exercice, repos normal.
 */
export function apresSerie(liste: readonly AvecSeries[], id: string): { suivantId: string | null; repos: boolean } {
  const b = bornesGroupe(liste, id);
  if (!b || b.fin === b.debut) return { suivantId: null, repos: true };
  const i = liste.findIndex((e) => e.id === id);
  // le suivant du groupe qui a encore une serie : on y va sans repos
  for (let k = i + 1; k <= b.fin; k++) if (resteASerie(liste[k])) return { suivantId: liste[k].id, repos: false };
  // fin du tour : repos, puis le premier du groupe qui a encore une serie
  for (let k = b.debut; k <= b.fin; k++) if (resteASerie(liste[k])) return { suivantId: liste[k].id === id ? null : liste[k].id, repos: true };
  // tout le groupe est fait : repos normal, l'ecran propose la suite de la seance
  return { suivantId: null, repos: true };
}

/** Lie l'exercice au suivant de la liste (rien s'il est le dernier) */
export function lierAuSuivant<E extends Enchainable>(liste: readonly E[], id: string): E[] {
  const i = liste.findIndex((e) => e.id === id);
  if (i < 0 || i >= liste.length - 1) return [...liste];
  return liste.map((e, k) => (k === i ? { ...e, enchaine: true } : e));
}

/** Sort l'exercice de son groupe : le lien d'avant et le sien tombent, les autres liens restent */
export function delier<E extends Enchainable>(liste: readonly E[], id: string): E[] {
  const i = liste.findIndex((e) => e.id === id);
  if (i < 0) return [...liste];
  return liste.map((e, k) => {
    if ((k === i || k === i - 1) && e.enchaine) {
      const { enchaine: _e, ...reste } = e;
      return reste as E;
    }
    return e;
  });
}

/**
 * Ajoute un exercice a la fin du groupe de `apresId` (le groupe d'un seul exercice compris) et le lie :
 * crunch, puis l'exercice ajoute, puis repos.
 */
export function ajouterAuGroupe<E extends Enchainable>(liste: readonly E[], apresId: string, nouveau: E): E[] {
  const b = bornesGroupe(liste, apresId);
  if (!b) return nettoyerEnchaines([...liste, nouveau]);
  const out = liste.slice();
  out[b.fin] = { ...out[b.fin], enchaine: true };
  // le nouveau garde le lien que le groupe n'avait pas vers la suite : il n'en a pas
  const { enchaine: _e, ...propre } = nouveau;
  out.splice(b.fin + 1, 0, propre as E);
  return out;
}

/** Lettre d'un exercice dans son groupe : A, B, C... */
export function lettreDansGroupe(liste: readonly Enchainable[], id: string): string | null {
  const b = bornesGroupe(liste, id);
  if (!b || b.fin === b.debut) return null;
  const i = liste.findIndex((e) => e.id === id);
  return String.fromCharCode(65 + Math.min(25, i - b.debut));
}
