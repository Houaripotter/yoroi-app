/**
 * Mode grand ecran (30 octobre 2026, maquettes _propositions/grand_ecran_2026-10-30 validees par Houari).
 * Sur Mac (app iPhone sur Mac Apple Silicon) et sur iPad en grande fenetre, l'interface de telephone etiree sur
 * 1900 points etait « horrible ». A partir de 1024 points de large : une barre laterale a gauche a la place de la
 * barre d'onglets, le contenu centre (1300 points au plus, marges de 40) et range en 2 ou 3 colonnes.
 * En dessous de 1024 (tout iPhone, iPad en portrait), rien ne change.
 * Aucun import React Native ici : tout se teste avec jest.
 */

/** Largeur a partir de laquelle l'app passe en grand ecran */
export const SEUIL_GRAND_ECRAN = 1024;
/** Largeur de la barre laterale (Accueil, Seances, Progres, Dojo, Reglages) */
export const LARGEUR_BARRE_LATERALE = 252;
/** Largeur maximale d'une page, marges comprises */
export const LARGEUR_MAX_PAGE = 1300;
/** Marge de chaque cote de la page */
export const MARGE_PAGE = 40;
/** Espace entre deux colonnes */
export const ESPACE_COLONNES = 20;

export function estGrandEcran(largeurFenetre: number): boolean {
  return largeurFenetre >= SEUIL_GRAND_ECRAN;
}

/** La place laissee a une page : la fenetre, moins la barre laterale quand elle est la */
function zone(largeurFenetre: number, avecBarre: boolean): number {
  return Math.max(0, largeurFenetre - (avecBarre ? LARGEUR_BARRE_LATERALE : 0));
}

/** La largeur du contenu d'une page en grand ecran, sans ses marges */
export function largeurPage(largeurFenetre: number, avecBarre = true): number {
  return Math.floor(Math.min(zone(largeurFenetre, avecBarre), LARGEUR_MAX_PAGE) - 2 * MARGE_PAGE);
}

/** La marge de chaque cote qui centre la page dans sa zone */
export function margePage(largeurFenetre: number, avecBarre = true): number {
  return Math.floor((zone(largeurFenetre, avecBarre) - largeurPage(largeurFenetre, avecBarre)) / 2);
}

/** La largeur d'une colonne quand `total` est partage en `n` colonnes egales */
export function largeurColonne(total: number, n: number, espace = ESPACE_COLONNES): number {
  return Math.floor((total - espace * (n - 1)) / n);
}

/**
 * Les cartes de l'app calculent leur largeur depuis celle de l'ecran (ecran moins 2 x 16). En grand ecran, chaque
 * colonne leur donne une « largeur d'ecran » qui retombe sur la sienne : sa largeur plus 32.
 */
export function largeurEcranPourColonne(largeurColonne: number): number {
  return largeurColonne + 32;
}

export type TuileTrois<T> = { cle: string; taille: 'pleine' | 'demi'; contenu: T; groupe?: string };
export type RangeeTrois<T> = { cle: string; tuiles: { tuile: TuileTrois<T>; parts: number }[] };

/**
 * La grille de l'accueil en 3 colonnes : une demi tuile prend 1 colonne, une pleine 2. Les tuiles se rangent dans
 * l'ordre ; une tuile qui ne tient plus commence la rangee suivante. Une rangee incomplete s'elargit : la derniere
 * tuile prend la place restante, jamais de trou.
 */
export function rangeesTrois<T>(tuiles: (TuileTrois<T> | null | undefined | false)[]): RangeeTrois<T>[] {
  const out: RangeeTrois<T>[] = [];
  let courante: { tuile: TuileTrois<T>; parts: number }[] = [];
  let pris = 0;
  const fermer = () => {
    if (!courante.length) return;
    const reste = 3 - pris;
    if (reste > 0) courante[courante.length - 1].parts += reste;
    out.push({ cle: courante.map((x) => x.tuile.cle).join('+'), tuiles: courante });
    courante = [];
    pris = 0;
  };
  for (const t of tuiles) {
    if (!t) continue;
    const parts = t.taille === 'pleine' ? 2 : 1;
    if (pris + parts > 3) fermer();
    courante.push({ tuile: t, parts });
    pris += parts;
    if (pris === 3) fermer();
  }
  fermer();
  return out;
}
