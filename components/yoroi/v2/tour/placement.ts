/**
 * Geometrie de la visite guidee (28 octobre 2026), sans React : le cadre autour de l'element, la place de la bulle,
 * et ce qu'il faut faire defiler pour montrer l'element. Partage par VisiteGuidee.tsx et par les tests.
 *
 * Houari : « la presentation ne s'adapte pas, je veux que tout soit dans l'ordre ». Regles :
 * - le cadre epouse l'element : meme rayon que l'element (plus la marge), a sa taille du moment (un onglet qui grandit,
 *   une carte qui a bouge) ;
 * - la bulle ne cache jamais l'element et ne sort jamais de l'ecran : dessous s'il y a la place, sinon dessus ;
 * - avant de montrer un element plus bas, l'ecran defile pour l'amener a une place ou la bulle tient a cote.
 */

export type Boite = { x: number; y: number; w: number; h: number };
export type Trou = Boite & { r: number };

/** L'ecran : sa taille, la zone ou la bulle peut aller, et le haut de la barre d'onglets */
export type Ecran = {
  W: number;
  H: number;
  /** le plus haut ou la bulle peut monter (sous la pastille Exemple) */
  haut: number;
  /** le plus bas ou la bulle peut descendre (au dessus du bord bas) */
  bas: number;
  /** le haut de la barre d'onglets (un element de page ne s'y montre pas dessous) */
  barre: number;
};

/** Marge entre l'element et son cadre */
export const MARGE_CADRE = 6;
/** Air entre le cadre et la bulle */
export const AIR_BULLE = 12;

/** Le haut de la barre d'onglets, pour un bord bas (insets.bottom) : meme calcul que InkTabBar */
export function hautDeBarre(H: number, insetBas: number): number {
  return H - (Math.max(insetBas - 8, 0) + 14) - 64;
}

/**
 * Le cadre autour de l'element : la marge tout autour, le rayon de l'element plus la marge (coins concentriques),
 * jamais hors de l'ecran. Un element de page plus haut que la place (petit telephone) s'arrete au dessus de la barre.
 */
export function cadreDe(el: Boite & { r: number }, ecran: Ecran, o: { marge?: number; surBarre?: boolean; plafond?: number } = {}): Trou {
  const m = o.marge ?? MARGE_CADRE;
  const x = Math.max(4, el.x - m);
  const droite = Math.min(ecran.W - 4, el.x + el.w + m);
  const y = Math.max(o.plafond ?? 4, el.y - m);
  let bas = Math.min(ecran.H - 4, el.y + el.h + m);
  if (o.surBarre && el.y < ecran.barre - 40) bas = Math.min(bas, ecran.barre - 4);
  const w = Math.max(20, droite - x);
  const h = Math.max(20, bas - y);
  const r = Math.max(0, Math.min(el.r + m, w / 2, h / 2));
  return { x, y, w, h, r };
}

/** La place de la bulle (son haut), a cote du cadre, jamais dessus, jamais hors de l'ecran */
export function placerBulle(trou: Boite | null, hBulle: number, ecran: Ecran): { top: number; cote: 'dessous' | 'dessus' | 'centre'; couvre: boolean } {
  const min = ecran.haut;
  const max = Math.max(min, ecran.bas - hBulle);
  if (!trou) return { top: Math.round(Math.max(min, Math.min(max, (ecran.H - hBulle) / 2 + 40))), cote: 'centre', couvre: false };
  const dessous = trou.y + trou.h + AIR_BULLE;
  const dessus = trou.y - AIR_BULLE - hBulle;
  const tientDessous = dessous + hBulle <= ecran.bas;
  const tientDessus = dessus >= ecran.haut;
  const preferDessous = trou.y + trou.h / 2 < ecran.H / 2;
  if (tientDessous && (preferDessous || !tientDessus)) return { top: Math.round(dessous), cote: 'dessous', couvre: false };
  if (tientDessus) return { top: Math.round(dessus), cote: 'dessus', couvre: false };
  // ni dessous ni dessus en entier : du cote le plus grand, collee au bord, le moins possible sur l'element
  const placeDessous = ecran.bas - (trou.y + trou.h);
  const placeDessus = trou.y - ecran.haut;
  return placeDessous >= placeDessus ? { top: Math.round(max), cote: 'dessous', couvre: true } : { top: Math.round(min), cote: 'dessus', couvre: true };
}

/** Vrai si l'element et sa bulle tiennent ensemble a l'ecran, sans se toucher et hors de la barre */
export function tientAvecBulle(el: Boite, hBulle: number, ecran: Ecran, m = MARGE_CADRE): boolean {
  const haut = el.y - m;
  const bas = el.y + el.h + m;
  const dessous = haut >= ecran.haut && bas <= ecran.barre - 4 && bas + AIR_BULLE + hBulle <= ecran.bas;
  const dessus = haut - AIR_BULLE - hBulle >= ecran.haut && bas <= ecran.barre - 4;
  return dessous || dessus;
}

/**
 * Ce qu'il faut faire defiler (en points, positif : vers le bas du contenu) pour que l'element et sa bulle tiennent.
 * 0 si c'est deja bon. L'element se pose en haut de la zone, la bulle dessous ; trop haut pour ca : il se pose sous
 * une bulle placee en haut ; encore trop haut : son haut en haut de la zone (la bulle le couvre le moins possible).
 */
export function defilementPourMontrer(el: Boite, hBulle: number, ecran: Ecran, m = MARGE_CADRE): number {
  if (tientAvecBulle(el, hBulle, ecran, m)) return 0;
  const yDessous = ecran.haut + m;
  if (yDessous + el.h + m + AIR_BULLE + hBulle <= ecran.bas && yDessous + el.h + m <= ecran.barre - 4) return Math.round(el.y - yDessous);
  const yDessus = ecran.haut + hBulle + AIR_BULLE + m;
  if (yDessus + el.h + m <= ecran.barre - 4) return Math.round(el.y - yDessus);
  return Math.round(el.y - yDessous);
}

/** Hauteur probable d'une bulle (avant de la mesurer) : en-tete, progression, sticker et titre, texte, boutons */
export function estimerBulle(titre: string, texte: string, largeur: number): number {
  const interieur = Math.max(120, largeur - 36);
  const lignes = (s: string, px: number, reserve = 0) => Math.max(1, Math.ceil((s.length * px) / Math.max(60, interieur - reserve)));
  // en-tete (34) + progression (10 + 16) + sticker et titre (10 + 44, ou 24 par ligne de titre) + texte (6 + 21 par ligne)
  // + boutons (12 + 46) + marges et bord (30)
  return Math.round(34 + 26 + 10 + Math.max(44, lignes(titre, 11, 54) * 24) + 6 + lignes(texte, 7.7) * 21 + 58 + 30);
}
