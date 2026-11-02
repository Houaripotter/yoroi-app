/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : la grille validee, en pixels sur 1080 de large.
 * Source : _propositions/cartes_v10_2026-11-02/html/a.js et fam.js (GRILLE, AIR_VISAGE). Rien d'invente :
 * marges, hauteur de la pastille, du chiffre, du panneau des chiffres, de la bande du bas, 48 px d'air autour du visage.
 * Le carre (1:1) n'existe pas dans ce moteur : il s'ouvre en 4:5 (voir formatMoteur).
 *
 * 2 novembre 2026 (studio unique), Houari : « la bande du bas doit descendre et prendre moins de place, pour que la
 * photo fasse le beau gosse ». La bande passe de 300 a 216 px en story (de 152 a 124 en 4:5), le logo et les badges
 * de 88 a 72 px, colles vers le bas. En story, le bas des badges reste a MARGE_SURE_BAS (120 px) du bord : la barre
 * de reponse d'Instagram ne les couvre pas. La zone photo gagne 84 px en story et 28 px en 4:5.
 */
import type { FormatId } from '../types';

export type FormatMoteur = 'story' | 'post';

export type Cotes = {
  W: number;
  H: number;
  /** marge gauche et droite */
  M: number;
  /** haut de la pastille du sport */
  HAUT: number;
  PASTILLE: number;
  /** la bande du bas (logo et badges) */
  BANDE: number;
  BANDE_RANG: number;
  BADGE: number;
  /** air entre le bloc et la bande */
  AIR_BANDE: number;
  LIB: number;
  G1: number;
  HERO: number;
  G2: number;
  STATS: number;
  STAT_V: number;
  STAT_L: number;
};

export type CotesCompactes = Pick<Cotes, 'LIB' | 'HERO' | 'STATS' | 'STAT_V' | 'STAT_L' | 'G2'>;

export const GRILLE: Record<FormatMoteur, Cotes & { COMPACT: CotesCompactes }> = {
  story: {
    W: 1080, H: 1920, M: 64, HAUT: 200, PASTILLE: 64, BANDE: 216, BANDE_RANG: 24, BADGE: 72, AIR_BANDE: 40, LIB: 34, G1: 12, HERO: 300, G2: 32, STATS: 176, STAT_V: 96, STAT_L: 32,
    COMPACT: { LIB: 30, HERO: 210, STATS: 140, STAT_V: 76, STAT_L: 28, G2: 24 },
  },
  post: {
    W: 1080, H: 1350, M: 56, HAUT: 48, PASTILLE: 60, BANDE: 124, BANDE_RANG: 26, BADGE: 72, AIR_BANDE: 32, LIB: 30, G1: 10, HERO: 230, G2: 24, STATS: 150, STAT_V: 84, STAT_L: 28,
    COMPACT: { LIB: 28, HERO: 170, STATS: 120, STAT_V: 66, STAT_L: 24, G2: 18 },
  },
};

/**
 * La marge de securite du bas : le bas du logo et des badges reste au moins a cette distance du bord.
 * Story : la barre de reponse d'Instagram (environ 6 % du bas sur un telephone 16:9). 4:5 : rien ne la couvre.
 */
export const MARGE_SURE_BAS: Record<FormatMoteur, number> = { story: 120, post: 24 };

/** Le bas du logo et des badges, en pixels depuis le haut */
export function basDesBadges(f: FormatMoteur): number {
  const g = GRILLE[f];
  return g.H - g.BANDE + g.BANDE_RANG + g.BADGE;
}

/** Jamais moins de 48 px entre la zone protegee (visage, corps) et le texte */
export const AIR_VISAGE = 48;

/** Taille de l'export, en pixels */
export const TAILLE_EXPORT: Record<FormatMoteur, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
};

/** Le carre (anciens reglages) s'ouvre en 4:5 dans le nouveau moteur */
export function formatMoteur(f: FormatId | null | undefined): FormatMoteur {
  return f === 'story' ? 'story' : 'post';
}

export function cotes(f: FormatMoteur, compact = false): Cotes {
  const g = GRILLE[f];
  return compact ? { ...g, ...g.COMPACT } : g;
}

/** Hauteur de la zone photo (tout sauf la bande) */
export function hauteurPhoto(f: FormatMoteur): number {
  return GRILLE[f].H - GRILLE[f].BANDE;
}

/** Hauteur du bloc resultat (libelle, chiffre, panneau) ; sans le chiffre quand il est dans le dessin (anneau) */
export function hauteurBloc(f: FormatMoteur, compact: boolean, sansHero = false): number {
  const k = cotes(f, compact);
  return k.LIB * 1.2 + (sansHero ? 0 : GRILLE[f].G1 + k.HERO * 0.86) + k.G2 + k.STATS;
}

// ============================================
// MESURE DU TEXTE (sans dessin) : largeurs des polices de l'app, en millieme de leur taille
// ============================================

/** Polices : Anton (chiffres) et Archivo 700, 800, 900 (textes), memes fichiers que assets/fonts */
export type PoliceMesure = 'anton' | 'x700' | 'x800' | 'x900';

const CARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒÆ−’«»·…°";
// mesurees sur les fichiers TTF de l'app (PIL, taille 1000)
const LARGEURS: Record<PoliceMesure, number[]> = {
  anton: [234, 229, 429, 546, 462, 1057, 520, 214, 291, 291, 452, 355, 236, 311, 229, 405, 494, 331, 494, 494, 494, 494, 494, 494, 494, 494, 242, 245, 321, 311, 321, 492, 864, 485, 479, 474, 493, 412, 399, 485, 499, 227, 466, 472, 397, 746, 498, 486, 472, 494, 477, 461, 396, 474, 469, 712, 484, 446, 410, 318, 405, 318, 474, 365, 317, 483, 501, 491, 498, 488, 280, 504, 505, 243, 263, 491, 248, 758, 499, 497, 501, 498, 347, 475, 305, 499, 461, 696, 459, 461, 386, 340, 216, 340, 493, 483, 483, 483, 491, 488, 488, 488, 488, 235, 235, 497, 497, 499, 499, 499, 461, 739, 731, 485, 485, 485, 474, 412, 412, 412, 412, 227, 227, 486, 486, 474, 474, 474, 649, 640, 311, 232, 578, 578, 234, 708, 389],
  x800: [189, 314, 473, 625, 579, 984, 816, 263, 374, 374, 407, 649, 318, 333, 318, 302, 625, 625, 625, 625, 626, 625, 625, 625, 625, 625, 334, 334, 649, 649, 649, 612, 1005, 746, 745, 752, 755, 699, 641, 815, 787, 329, 630, 770, 623, 914, 787, 810, 698, 810, 750, 697, 675, 783, 729, 979, 736, 732, 682, 366, 302, 366, 649, 534, 257, 616, 633, 612, 633, 619, 352, 632, 629, 288, 286, 610, 288, 937, 629, 635, 633, 633, 407, 579, 385, 629, 574, 859, 612, 574, 535, 391, 265, 391, 649, 616, 616, 616, 612, 619, 619, 619, 619, 288, 288, 635, 635, 629, 629, 629, 574, 986, 956, 746, 746, 746, 752, 699, 699, 699, 699, 329, 329, 810, 810, 783, 783, 783, 1204, 1010, 649, 279, 584, 584, 333, 984, 400],
  x700: [196, 301, 456, 600, 556, 973, 764, 253, 364, 364, 407, 641, 307, 333, 307, 300, 595, 596, 596, 596, 597, 595, 596, 596, 596, 595, 335, 335, 641, 641, 641, 613, 1001, 724, 722, 733, 739, 683, 622, 802, 754, 301, 603, 725, 591, 872, 754, 793, 681, 793, 730, 679, 641, 748, 694, 964, 706, 699, 653, 350, 300, 350, 641, 518, 228, 580, 608, 573, 608, 584, 325, 607, 602, 267, 264, 570, 267, 891, 602, 613, 608, 608, 380, 556, 342, 601, 547, 798, 572, 547, 519, 393, 253, 393, 641, 580, 580, 580, 573, 584, 584, 584, 584, 267, 267, 613, 613, 601, 601, 601, 547, 965, 920, 724, 724, 724, 733, 683, 683, 683, 683, 301, 301, 793, 793, 748, 748, 748, 1202, 1004, 641, 280, 576, 576, 333, 973, 400],
  x900: [180, 333, 497, 660, 611, 1000, 889, 278, 389, 389, 407, 660, 333, 333, 333, 306, 667, 667, 667, 667, 667, 667, 667, 667, 667, 667, 333, 333, 660, 660, 660, 611, 1010, 778, 778, 778, 778, 722, 667, 833, 833, 369, 667, 833, 667, 972, 833, 833, 722, 833, 778, 722, 722, 833, 778, 1000, 778, 778, 722, 389, 306, 389, 660, 556, 297, 667, 667, 667, 667, 667, 389, 666, 667, 319, 316, 667, 319, 1000, 667, 667, 667, 667, 444, 611, 444, 667, 611, 944, 667, 611, 556, 389, 282, 389, 660, 667, 667, 667, 667, 667, 667, 667, 667, 319, 319, 667, 667, 667, 667, 667, 611, 1017, 1008, 778, 778, 778, 778, 722, 722, 722, 722, 369, 369, 833, 833, 833, 833, 833, 1207, 1020, 660, 278, 595, 595, 333, 1000, 400],
};

/** Largeur d'un texte en pixels, avec l'espacement des lettres en part de la taille (0,12 pour 0,12 em) */
export function largeurTexte(texte: string, police: PoliceMesure, taille: number, espacement = 0): number {
  const t = LARGEURS[police];
  let s = 0;
  for (const ch of texte) {
    const i = CARS.indexOf(ch === ' ' || ch === ' ' ? ' ' : ch);
    s += i >= 0 ? t[i] : police === 'anton' ? 494 : 640;
  }
  const n = [...texte].length;
  return (s / 1000) * taille + Math.max(0, n) * espacement * taille;
}

/** La plus grande taille (au plus max) pour que le texte tienne dans la largeur, jamais sous min */
export function tailleQuiTient(texte: string, police: PoliceMesure, largeur: number, max: number, espacement = 0, min = 12): number {
  const w = largeurTexte(texte, police, max, espacement);
  if (w <= largeur) return max;
  return Math.max(min, Math.floor((max * largeur) / w));
}
