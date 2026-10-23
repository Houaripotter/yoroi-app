/**
 * Grille de l'accueil (16 octobre 2026). Houari : « un truc beau, carré, facile à comprendre ».
 * Sous la carte Ton poids, chaque bloc donne une ou plusieurs tuiles : pleine largeur ou demi largeur.
 * Les demi tuiles se rangent deux par deux, dans l'ordre, seulement avec une voisine du meme bloc (groupe) : une tuile
 * de seances ne se colle jamais a une tuile de sommeil. Une demi tuile seule (bloc cache, donnee absente) prend toute
 * la largeur : la grille se recompose toujours sans trou.
 * Aucun import React Native ici : tout se teste avec jest.
 */

export type TailleTuile = 'pleine' | 'demi';

export type TuileGrille<T> = { cle: string; taille: TailleTuile; contenu: T; groupe?: string };

export type RangeeGrille<T> = { cle: string; tuiles: TuileGrille<T>[] };

/** Range les tuiles en rangees de une (pleine, ou demi seule) ou deux (deux demi) tuiles, sans trou */
export function rangees<T>(tuiles: (TuileGrille<T> | null | undefined | false)[]): RangeeGrille<T>[] {
  const out: RangeeGrille<T>[] = [];
  let attente: TuileGrille<T> | null = null;
  const vider = () => {
    if (attente) out.push({ cle: attente.cle, tuiles: [attente] });
    attente = null;
  };
  for (const t of tuiles) {
    if (!t) continue;
    if (t.taille === 'pleine') {
      vider();
      out.push({ cle: t.cle, tuiles: [t] });
    } else if (attente && (attente.groupe ?? '') === (t.groupe ?? '')) {
      out.push({ cle: `${attente.cle}+${t.cle}`, tuiles: [attente, t] });
      attente = null;
    } else {
      vider();
      attente = t;
    }
  }
  vider();
  return out;
}
