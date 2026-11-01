/**
 * Mode grand ecran (30 octobre 2026, maquettes _propositions/grand_ecran_2026-10-30 validees par Houari).
 * Sur Mac (app iPhone sur Mac Apple Silicon) et sur iPad, l'interface de telephone etiree etait « horrible ».
 * 31 octobre 2026 (Houari : « on dirait l'iPhone élargi », « les boutons de la tab bar en bas c'est dégueu ») :
 *  - a partir de 700 points de large (iPad en portrait, Split View, Mac en petite fenetre) : plus de barre en bas,
 *    une barre laterale compacte de 84 points, seulement les stickers (le libelle au survol ou a l'appui long) ;
 *  - a partir de 1024 points : la barre laterale large (Enregistrer, Accueil, Seances, Progres, Dojo, Reglages, profil) ;
 *  - les pages en tableau de bord : une grille de 2, 3 ou 4 colonnes (selon la place), des cartes sur 1 ou 2
 *    colonnes rangees en colonnes equilibrees (placerBento), jamais une colonne courte a cote d'une longue.
 * En dessous de 700 (tout iPhone), rien ne change.
 * Aucun import React Native ici : tout se teste avec jest.
 */

/** Largeur a partir de laquelle l'app passe en grand ecran : barre laterale (compacte) et pages en grille */
export const SEUIL_GRAND_ECRAN = 700;
/** Largeur a partir de laquelle la barre laterale est large, avec ses libelles */
export const SEUIL_BARRE_LARGE = 1024;
/** Largeur de la barre laterale large (Accueil, Seances, Progres, Dojo, Reglages) */
export const LARGEUR_BARRE_LATERALE = 220;
/** Largeur de la barre laterale compacte (les stickers seuls) */
export const LARGEUR_BARRE_COMPACTE = 84;
/**
 * Largeur maximale du contenu d'une page, sans ses marges : 4 colonnes de 465 points au plus.
 * 1er novembre 2026 (Houari sur MacBook, fenetre de 2000 points : « sur le côté on peut augmenter des choses ») :
 * 1640 laissait une bande vide a droite des 1932 points de fenetre ; a 1920, une fenetre de 2000 est remplie
 * (barre laterale, puis 1708 points de page) et un ecran de 2560 garde des colonnes lisibles.
 */
export const LARGEUR_MAX_PAGE = 1920;
/** Marge de chaque cote de la page (une fenetre etroite garde plus de place pour les cartes) */
export const MARGE_PAGE = 36;
export const MARGE_PAGE_ETROITE = 24;
/** Espace entre deux colonnes, et entre deux cartes d'une colonne */
export const ESPACE_COLONNES = 20;

/** La gouttiere du tableau de bord : 20 points, 16 sur une page de moins de 1000 points (iPad) */
export function espaceGrille(largeurPage: number): number {
  return largeurPage < 1000 ? 16 : ESPACE_COLONNES;
}

export function estGrandEcran(largeurFenetre: number): boolean {
  return largeurFenetre >= SEUIL_GRAND_ECRAN;
}

/** Vrai quand la barre laterale est large (libelles visibles) */
export function estBarreLarge(largeurFenetre: number): boolean {
  return largeurFenetre >= SEUIL_BARRE_LARGE;
}

/** La largeur de la barre laterale pour cette fenetre (0 sur iPhone, ou elle n'existe pas) */
export function largeurBarre(largeurFenetre: number): number {
  if (!estGrandEcran(largeurFenetre)) return 0;
  return estBarreLarge(largeurFenetre) ? LARGEUR_BARRE_LATERALE : LARGEUR_BARRE_COMPACTE;
}

/** La place laissee a une page : la fenetre, moins la barre laterale quand elle est la */
function zone(largeurFenetre: number, avecBarre: boolean): number {
  return Math.max(0, largeurFenetre - (avecBarre ? largeurBarre(largeurFenetre) : 0));
}

function marge(z: number): number {
  return z < 1000 ? MARGE_PAGE_ETROITE : MARGE_PAGE;
}

/** La largeur du contenu d'une page en grand ecran, sans ses marges */
export function largeurPage(largeurFenetre: number, avecBarre = true): number {
  const z = zone(largeurFenetre, avecBarre);
  return Math.floor(Math.min(z - 2 * marge(z), LARGEUR_MAX_PAGE));
}

/** La marge de chaque cote qui centre la page dans sa zone */
export function margePage(largeurFenetre: number, avecBarre = true): number {
  return Math.floor((zone(largeurFenetre, avecBarre) - largeurPage(largeurFenetre, avecBarre)) / 2);
}

/**
 * Combien de colonnes pour la grille d'une page : 2 sur une page etroite (iPad en portrait, fenetre de 1024),
 * 3 quand chaque colonne garde au moins 270 points, 4 sur une tres grande page (Mac en plein ecran, 1920).
 * Une colonne fait alors entre 270 et 410 points : la largeur d'un iPhone, celle pour laquelle les cartes sont dessinees.
 */
export function colonnesGrille(largeurPage: number): 2 | 3 | 4 {
  if (largeurPage >= 1400) return 4;
  if (largeurPage >= 3 * 270 + 2 * espaceGrille(largeurPage)) return 3;
  return 2;
}

/** La largeur d'une carte qui s'etend sur `span` colonnes d'une grille de `n` colonnes */
export function largeurCase(largeurPage: number, n: number, span = 1, espace = espaceGrille(largeurPage)): number {
  const s = Math.max(1, Math.min(n, span));
  const col = (largeurPage - espace * (n - 1)) / n;
  return Math.floor(col * s + espace * (s - 1));
}

export type CaseAPlacer = { span: number; hauteur: number };
export type CasePlacee = { x: number; y: number; largeur: number; colonne: number; span: number };

/**
 * Le placement du tableau de bord (31 octobre 2026) : chaque carte, dans l'ordre, se pose en haut de la place
 * la plus haute libre sur `span` colonnes voisines (le classique « masonry »). Les colonnes restent equilibrees :
 * une carte ne commence jamais sous une colonne plus longue qu'une autre place possible. Une carte de hauteur 0
 * (rien a montrer) ne prend ni place ni espace.
 */
export function placerBento(cases: CaseAPlacer[], n: number, largeur: number, espace = espaceGrille(largeur)): { places: CasePlacee[]; hauteur: number } {
  const bas = new Array(Math.max(1, n)).fill(0);
  const places: CasePlacee[] = [];
  for (const c of cases) {
    const span = Math.max(1, Math.min(n, Math.round(c.span) || 1));
    let meilleure = 0;
    let haut = Infinity;
    for (let i = 0; i + span <= n; i++) {
      const h = Math.max(...bas.slice(i, i + span));
      if (h < haut - 0.5) {
        haut = h;
        meilleure = i;
      }
    }
    const x = meilleure === 0 ? 0 : largeurCase(largeur, n, meilleure, espace) + espace;
    places.push({ x, y: haut, largeur: largeurCase(largeur, n, span, espace), colonne: meilleure, span });
    if (c.hauteur > 0) for (let i = meilleure; i < meilleure + span; i++) bas[i] = haut + c.hauteur + espace;
  }
  const max = Math.max(...bas);
  return { places, hauteur: max > 0 ? max - espace : 0 };
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

/**
 * La colonne de cote (Ton poids sur l'accueil, Cette semaine dans Seances) : un tiers environ de la page, jamais
 * moins de 300 points (lisible a 1024) ni plus de 420.
 */
export function largeurCote(largeurPage: number): number {
  return Math.max(300, Math.min(420, Math.round(largeurPage * 0.32)));
}

/** Combien de colonnes pour une grille de cartes : 3 sur une page large, 2 sur une page plus etroite (ancienne regle, gardee pour Reglages) */
export function colonnesPour(largeurPage: number): 2 | 3 {
  return colonnesGrille(largeurPage) >= 3 ? 3 : 2;
}

/** Les cartes Tes outils : 7 sur une rangee si elles gardent 140 points, sinon sur plusieurs rangees (au moins 3 par rangee) */
export function colonnesOutils(largeurGrille: number, espace = 12): number {
  return Math.min(7, Math.max(3, Math.floor((largeurGrille + espace) / (140 + espace))));
}
