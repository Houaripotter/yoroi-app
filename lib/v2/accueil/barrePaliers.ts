/**
 * La barre des paliers de la carte « Ton poids » de l'accueil (14 novembre 2026, bloc A « Barre degradee en
 * 4 tranches » choisi par Houari, maquette paliers_version2.png). Elle remplace la montagne du 13 novembre, jugee
 * trop haute et peu lisible (archivee dans _archive_ancien_design_2026-10-09/paliers_montagne_2026-11-13/).
 * La geometrie seule, sans dessin : une tranche arrondie par palier, une coche au-dessus de chaque palier franchi
 * avec son poids, ta bulle a ta position, le fanion au bout de la barre. 80 points de haut au plus.
 * Fichier pur : les paliers, ceux qui sont franchis et ton avance dans la tranche en cours viennent de
 * etatsLignePaliers (lib/v2/accueil/lignePaliers.ts), rien n'est recalcule ici. Perte ou prise de masse : pareil.
 * La phrase lue par VoiceOver reste texteMontagne (lib/v2/accueil/montagnePaliers.ts).
 */
import type { LignePaliers } from '@/lib/v2/accueil/lignePaliers';
import { progressionPropre } from '@/lib/v2/accueil/montagnePaliers';

/** Mesures de la barre, en points */
export const BARRE = {
  /** une coche : rond blanc et son ombre */
  coche: 26,
  /** le poids du palier sous sa coche : haut de la ligne, hauteur */
  poidsY: 27,
  poidsH: 14,
  /** la barre : haut, epaisseur, espace entre deux tranches */
  barreY: 44,
  barreH: 12,
  ecart: 6,
  /** le fanion, au bout de la barre, et l'espace entre la barre et lui */
  fanion: 28,
  fanionEcart: 4,
  fanionY: 30,
  /** la bulle de ton poids : hauteur, pointe, ecart a la barre, marge de la pointe au bord, largeur par defaut */
  bulleH: 20,
  bulleFleche: 5,
  bulleEcart: 2,
  bulleMarge: 9,
  bulleL: 58,
  /** espace minimal entre une coche (ou son poids) et la bulle ou la coche voisine */
  jeu: 2,
  /** la ligne « Depart 86,4 · Objectif 80,0 · encore 0,6 kg » sous la barre */
  ligneEcart: 8,
  ligneH: 16,
  /** sous cette largeur (petit ecran de 320), « Depart 86,4 » laisse toute la ligne a ton objectif */
  departMin: 280,
  /** largeur estimee du poids sous une coche, par caractere (11 points, extra gras) */
  parCaractere: 6.4,
} as const;

/** Le degrade de la barre, du debut a la fin (violet, rose, orange) */
export const DEGRADE_BARRE = [
  { t: 0, c: '#6E4BFF' },
  { t: 0.6, c: '#C55BEA' },
  { t: 1, c: '#FF8A5B' },
] as const;

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const enHex = (v: number[]) => `#${v.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

/** La couleur du degrade a la part t de la barre (0 au debut, 1 a la fin) : celle de la coche et de son poids */
export function couleurDegrade(t: number): string {
  const x = progressionPropre(t);
  for (let i = 1; i < DEGRADE_BARRE.length; i++) {
    const a = DEGRADE_BARRE[i - 1];
    const b = DEGRADE_BARRE[i];
    if (x <= b.t) {
      const k = (x - a.t) / (b.t - a.t);
      const ca = hex(a.c);
      const cb = hex(b.c);
      return enHex(ca.map((v, j) => v + (cb[j] - v) * k));
    }
  }
  return DEGRADE_BARRE[DEGRADE_BARRE.length - 1].c;
}

/** La largeur estimee d'un poids sous sa coche (« 84,8 ») */
export function largeurPoids(texte: string): number {
  return Math.ceil(texte.length * BARRE.parCaractere + 2);
}

export type GeometrieBarre = {
  largeur: number;
  /** la hauteur totale du bloc (80 au plus, sauf si la bulle a du passer sous la barre) */
  hauteur: number;
  /** la fin de la barre (le fanion est juste apres) et le coin haut gauche du fanion */
  finBarre: number;
  fanion: { x: number; y: number };
  /** une tranche par palier : debut, largeur, part remplie (0 a 1) */
  tranches: { x: number; largeur: number; rempli: number }[];
  /** ta position sur la barre (null objectif atteint : la barre est pleine) */
  toi: number | null;
  /** une coche par palier franchi (pas l'objectif : le fanion le tient) : centre, place sur la barre, couleur */
  coches: { x: number; xPalier: number; couleur: string; indice: number }[];
  /** les poids sous les coches, caches quand ils ne tiennent pas (petit ecran, beaucoup de paliers) */
  poidsVisibles: boolean;
  /** la bulle de ton poids, au-dessus de la barre (ou dessous si la place manque), et la position de sa pointe */
  bulle: { cote: 'haut' | 'bas'; x: number; y: number; largeur: number; pointe: number } | null;
  /** le haut de la ligne Depart / Objectif, et si « Depart 86,4 » y tient */
  ligneY: number;
  departVisible: boolean;
};

/**
 * La geometrie de la barre pour une largeur et l'etat des paliers (etatsLignePaliers).
 * atteint : ton objectif est atteint (toutes les tranches pleines, pas de bulle).
 * largeurBulle : la largeur mesuree de ta bulle (BARRE.bulleL tant qu'elle ne l'est pas).
 * poids : la largeur du plus long poids sous une coche (largeurPoids).
 */
export function geometrieBarre(
  largeur: number,
  ligne: Pick<LignePaliers, 'atteints' | 'avance'> & { paliers: unknown[] },
  atteint: boolean,
  largeurBulle: number = BARRE.bulleL,
  poids: number = largeurPoids('00,0'),
): GeometrieBarre {
  const B = BARRE;
  const W = Math.max(80, Number.isFinite(largeur) ? largeur : 0);
  const n = Math.max(1, ligne.paliers.length);
  const finBarre = W - B.fanion - B.fanionEcart;
  const wT = Math.max(1, (finBarre - (n - 1) * B.ecart) / n);
  const debut = (i: number) => i * (wT + B.ecart);
  const atteints = atteint ? n : Math.max(0, Math.min(n, Math.floor(Number.isFinite(ligne.atteints) ? ligne.atteints : 0)));
  const avance = atteint ? 0 : progressionPropre(ligne.avance);

  const tranches = Array.from({ length: n }, (_, i) => ({
    x: debut(i),
    largeur: wT,
    rempli: i < atteints ? 1 : i === atteints ? avance : 0,
  }));
  const toi = atteint ? null : atteints >= n ? finBarre : debut(atteints) + avance * wT;

  // une coche au milieu de l'espace entre deux tranches, pour chaque palier franchi avant l'objectif
  const nbCoches = Math.min(atteints, n - 1);
  const xPalier = (k: number) => debut(k) - B.ecart / 2;
  const nominal = Array.from({ length: nbCoches }, (_, i) => xPalier(i + 1));

  /** essaie de poser la bulle sans gener les coches de largeur col ; renvoie null si c'est impossible */
  const essai = (col: number, decalageLibre = false): { xs: number[]; bx: number } | null => {
    const xs = [...nominal];
    // deux coches voisines trop proches : impossible, quelle que soit la bulle
    for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] < col + B.jeu) return null;
    if (toi === null) return { xs, bx: 0 };
    const bl = Math.min(finBarre, Math.max(30, largeurBulle));
    const maxBx = Math.max(0, finBarre - bl);
    let bx = Math.max(0, Math.min(maxBx, toi - bl / 2));
    const derniere = xs.length ? xs[xs.length - 1] + col / 2 + B.jeu : -Infinity;
    // 1. la bulle glisse vers la droite, tant que sa pointe reste dessous
    if (bx < derniere) bx = Math.min(maxBx, derniere);
    if (bx >= derniere && toi - bx >= B.bulleMarge) return { xs, bx };
    // 2. la bulle se pose le plus a droite possible au-dessus de toi, et les coches se decalent vers la gauche
    bx = Math.max(0, Math.min(maxBx, toi - B.bulleMarge));
    let limite = bx - B.jeu;
    for (let i = xs.length - 1; i >= 0; i--) {
      xs[i] = Math.min(xs[i], limite - col / 2);
      limite = xs[i] - col / 2 - B.jeu;
    }
    if (xs.length && xs[0] - col / 2 < 0) return null;
    // une coche ne s'eloigne pas de plus d'une demi tranche de son palier (sauf en dernier recours, poids caches)
    if (!decalageLibre && xs.some((x, i) => nominal[i] - x > wT / 2 + B.ecart)) return null;
    return { xs, bx };
  };

  const colPoids = Math.max(B.coche, poids);
  let poidsVisibles = true;
  let r = essai(colPoids);
  if (!r) {
    poidsVisibles = false;
    r = essai(B.coche) ?? essai(B.coche, true);
  }
  let bulle: GeometrieBarre['bulle'] = null;
  let ligneY = B.barreY + B.barreH + B.ligneEcart;
  let xs = r ? r.xs : nominal;
  if (toi !== null) {
    const bl = Math.min(finBarre, Math.max(30, largeurBulle));
    if (r) {
      bulle = { cote: 'haut', x: r.bx, y: B.barreY - B.bulleEcart - B.bulleFleche - B.bulleH, largeur: bl, pointe: Math.max(B.bulleMarge, Math.min(bl - B.bulleMarge, toi - r.bx)) };
    } else {
      // 3. rien ne tient au-dessus : la bulle passe sous la barre, la ligne du dessous descend d'autant
      xs = nominal;
      const bx = Math.max(0, Math.min(Math.max(0, finBarre - bl), toi - bl / 2));
      const by = B.barreY + B.barreH + B.bulleEcart + B.bulleFleche;
      bulle = { cote: 'bas', x: bx, y: by, largeur: bl, pointe: Math.max(B.bulleMarge, Math.min(bl - B.bulleMarge, toi - bx)) };
      ligneY = by + B.bulleH + 4;
    }
  }

  const coches = xs.map((x, i) => ({ x, xPalier: nominal[i], couleur: couleurDegrade(nominal[i] / finBarre), indice: i }));
  return {
    largeur: W,
    hauteur: ligneY + B.ligneH,
    finBarre,
    fanion: { x: W - B.fanion, y: B.fanionY },
    tranches,
    toi,
    coches,
    poidsVisibles,
    bulle,
    ligneY,
    departVisible: W >= B.departMin,
  };
}
