/**
 * Trajets des chauves souris et du fantome d'Halloween sur la scene de l'accueil (18 octobre 2026, v3).
 * Houari : ils traversent la page ENTIERE, d'un bord a l'autre. Un passage en mouvement a le droit de passer
 * devant le personnage (seuls les decors fixes devaient le laisser libre).
 *
 * La bande de vol : sous la lanterne du theme et la cloche (haut + 42), jusqu'aux deux tiers de la scene.
 * Le rythme : un passage toutes les 15 secondes, chauves souris puis fantome, en alternance.
 * Les chauves souris d'un meme vol sont bien espacees (VOL_CHAUVES) : decalees dans le temps et dans la hauteur.
 *
 * Fichier pur : teste dans __tests__/unit/saisonsVols.test.ts. positionVol et avancementPassage tournent aussi
 * sur le fil d'affichage.
 */

export type ZoneVol = { largeur: number; yMin: number; yMax: number };

/** Sous la lanterne du theme et la cloche */
export const MARGE_HAUT_VOL = 42;
/** Le bas de la bande, en part de la hauteur de la scene */
export const BAS_VOL = 0.66;

export function zoneDeVol(o: { largeur: number; hauteur: number; haut: number; hSprite: number }): ZoneVol {
  const yMin = o.haut + MARGE_HAUT_VOL;
  const yMax = Math.max(yMin, o.hauteur * BAS_VOL - o.hSprite);
  return { largeur: o.largeur, yMin, yMax };
}

/**
 * Coin haut gauche d'un sprite de largeur s a l'avancement q (0 a 1) : il entre par le bord gauche et sort
 * entierement par le bord droit. k (0 a 1) : sa hauteur dans la bande.
 */
export function positionVol(q: number, z: ZoneVol, s: number, k: number): { x: number; y: number } {
  'worklet';
  const p = Math.max(0, Math.min(1, q));
  return { x: -s + p * (z.largeur + 2 * s), y: z.yMin + k * (z.yMax - z.yMin) };
}

/** Le rythme : toutes les 15 s, d'abord les chauves souris (1,5 s apres l'ouverture), puis le fantome 7,5 s apres */
export const BATTEMENT_S = 15;
export const DEPART_CHAUVES_S = 1.5;
export const DEPART_FANTOME_S = DEPART_CHAUVES_S + BATTEMENT_S / 2;
export const DUREE_CHAUVES_S = 5.5;
export const DUREE_FANTOME_S = 7;

/** Un vol de trois chauves souris : taille, hauteur dans la bande, retard sur la premiere (secondes) */
export const VOL_CHAUVES: { s: number; k: number; retard: number }[] = [
  { s: 30, k: 0, retard: 0 },
  { s: 23, k: 0.5, retard: 0.9 },
  { s: 19, k: 1, retard: 1.8 },
];

/** Avancement d'un passage qui revient toutes les `periode` secondes, depart a `depart`, sur `duree` ; null hors passage */
export function avancementPassage(t: number, depart: number, periode: number, duree: number): number | null {
  'worklet';
  if (t < depart) return null;
  const d = (t - depart) % periode;
  return d <= duree ? d / duree : null;
}

/**
 * Noel (v4) : le traineau puis l'etoile filante, en alternance, chacun toutes les 30 secondes ;
 * le traineau traverse tout le ciel en 9 secondes, l'etoile file en 1,4 seconde, 15 secondes apres.
 */
export const PERIODE_NOEL_S = 30;
export const DEPART_TRAINEAU_S = 3;
export const DUREE_TRAINEAU_S = 9;
export const DEPART_ETOILE_S = DEPART_TRAINEAU_S + PERIODE_NOEL_S / 2;
export const DUREE_ETOILE_S = 1.4;
