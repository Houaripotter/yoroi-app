/**
 * Scenes animees en code de YOROI 3.0.0 (18 octobre 2026), brief _propositions/scenes_2026-10-18/brief_scenes.md.
 *
 * Principe : l'image fixe de la scene, et par dessus des calques d'effets dessines en code
 * (pluie, neige, etoiles, brume, lueurs, train, reflets).
 * 19 octobre 2026 : en plus, le mouvement reel de chaque scene (MOUVEMENT_SCENE plus bas) : une video en
 * boucle ou des calques mobiles (bateau qui passe, balancoire qui se balance, nuages qui defilent...).
 * L'affichage est dans components/yoroi/v2/scenes/SceneAnimee.tsx.
 *
 * Toutes les zones sont en POURCENTAGE DE L'IMAGE (x et l sur sa largeur, y et h sur sa hauteur,
 * r d'une lueur sur sa largeur). SceneAnimee affiche l'image en « cover » et pose les calques sur
 * l'image entiere, rognee comme elle : les effets restent sur les lanternes quel que soit le cadre.
 *
 * Les images : _propositions/scenes_2026-10-18/sc01 a sc12, 1200 x 670, en paysage (RATIO_SCENES).
 * Les zones sont mesurees sur ces images avec une grille de 10 % (18 octobre 2026) : c'est un premier
 * calage, A AFFINER a l'oeil dans l'apercu du Studio (Tests de l'appareil, Apercu des scenes animees)
 * une fois les images copiees dans assets/.
 *
 * Fichier pur (aucun import React Native) : teste dans __tests__/unit/scenesAnimations.test.ts.
 */

/** Au plus 60 elements animes par scene, pour rester fluide sur un vieil iPhone */
import { traduire } from '@/lib/i18n/tr';
export const MAX_PARTICULES = 60;

/** Rapport largeur sur hauteur des images de scene (1200 x 670) */
export const RATIO_SCENES = 1200 / 670;

/** Rectangle en pourcentage du cadre : x, y = coin haut gauche ; l, h = largeur et hauteur */
export type Zone = { x: number; y: number; l: number; h: number };

/** Centre d'une lueur en pourcentage du cadre, r = rayon en pourcentage de la largeur */
export type PointLueur = {
  x: number;
  y: number;
  r: number;
  /** mode clignote : decalage dans le cycle, de 0 a 1 (0,5 = allume quand l'autre est eteint) */
  decalage?: number;
};

/** Pluie fine en diagonale */
export type EffetPluie = {
  type: 'pluie';
  zone: Zone;
  nombre: number;
  /** degres, positif : la pluie tombe vers la droite */
  angle: number;
  /** secondes pour traverser la zone */
  duree: number;
  /** longueur d'une goutte, en pourcentage de la hauteur du cadre */
  longueur: number;
  opacite: number;
  couleur: string;
};

/** Petites eclaboussures discretes au sol (avec la pluie) */
export type EffetEclaboussures = { type: 'eclaboussures'; zone: Zone; nombre: number; opacite: number; couleur: string };

/** Neige qui tombe en flottant, ou braises qui montent (meme dessin, sens inverse) */
export type EffetFlocons = {
  type: 'neige' | 'braises';
  zone: Zone;
  nombre: number;
  /** secondes pour traverser la zone */
  duree: number;
  /** diametre en points, mini et maxi */
  taille: [number, number];
  /** balancement de cote, en pourcentage de la largeur de la zone */
  derive: number;
  opacite: number;
  couleur: string;
};

/** Etoiles (ou lumieres de ville lointaines) qui scintillent */
export type EffetEtoiles = {
  type: 'etoiles';
  zone: Zone;
  nombre: number;
  taille: [number, number];
  /** 0 : fixes, 1 : scintillement franc */
  scintillement: number;
  couleur: string;
};

/** Nappes de nuages ou de brume qui defilent lentement */
export type EffetBrume = {
  type: 'brume';
  zone: Zone;
  nappes: number;
  /** secondes pour qu'une nappe traverse la zone */
  duree: number;
  /** 1 : vers la droite, -1 : vers la gauche */
  sens: 1 | -1;
  opacite: number;
  couleur: string;
};

/** Lueur douce : lanterne qui vacille, soleil qui respire, feu qui clignote */
export type EffetLueur = {
  type: 'lueur';
  points: PointLueur[];
  mode: 'vacille' | 'respire' | 'clignote';
  /** secondes d'un cycle (respire et clignote) ; en mode clignote, chaque point suit son decalage */
  periode: number;
  /** 0 a 1 */
  intensite: number;
  couleur: string;
};

/** Bande de fenetres eclairees qui traverse de temps en temps (train sur un pont) */
export type EffetTrain = {
  type: 'train';
  zone: Zone;
  /** secondes entre deux passages (passage compris) */
  intervalle: number;
  /** secondes pour traverser le cadre */
  traversee: number;
  fenetres: number;
  sens: 1 | -1;
  /** inclinaison de la voie en degres (negatif : la voie monte vers la droite) */
  pente?: number;
  couleur: string;
};

/** Reflets d'eau qui ondulent (mer, flaques) */
export type EffetReflets = { type: 'reflets'; zone: Zone; nombre: number; opacite: number; couleur: string };

export type Effet = EffetPluie | EffetEclaboussures | EffetFlocons | EffetEtoiles | EffetBrume | EffetLueur | EffetTrain | EffetReflets;
export type TypeEffet = Effet['type'];

export type SceneAnimeeId =
  | 'yatai_pont'
  | 'moto_tour_eiffel'
  | 'rue_tokyo'
  | 'passage_niveau_mer'
  | 'toit_train'
  | 'hublot_avion'
  | 'aile_avion'
  | 'balancoire_plage'
  | 'bivouac_desert'
  | 'voie_lactee_nuages'
  | 'lampadaire_hiver'
  | 'voie_lactee_cote'
  // 27 octobre 2026 : Marseille et les aurores (lib/v2/espace/voyages.ts, sc13 a sc19)
  | 'calanque_couchant'
  | 'paddle_couchant'
  | 'corniche_monument'
  | 'corniche_moto'
  | 'aurores_boreales'
  | 'corniche_guidon'
  | 'corniche_heure_bleue';

export type ConfigScene = {
  id: SceneAnimeeId;
  /** numero dans le brief (13 a 19 : scenes de Marseille du 27 octobre 2026, hors brief du 18 octobre) */
  numero: number;
  /** nom du fichier image dans _propositions/scenes_2026-10-18/ */
  fichier: string;
  nom: string;
  /** degrade de remplacement tant que l'image n'existe pas, du haut vers le bas */
  fond: [string, string, string];
  effets: Effet[];
  /** ce qui bouge vraiment dans la scene, en une ligne (video ou calques mobiles, 19 octobre 2026) */
  mouvement?: string;
  /** objets detoures qui bougent par dessus l'image (bateau, passant, balancoire...), voir CalqueMobile */
  calques?: CalqueMobile[];
  /** effets en code a cacher quand la video joue (la video montre deja ce mouvement, ex. le train) */
  masquesAvecVideo?: TypeEffet[];
};

/** Point en pourcentage de l'image (centre d'un calque) */
export type Point = { x: number; y: number };

/**
 * Mouvement d'un calque mobile (19 octobre 2026), calcule sur l'horloge de la scene.
 * - fixe : ne bouge pas (morceau de fond qui efface l'objet peint, premier plan qui passe devant).
 * - traversee : le centre du calque va de « de » a « vers » (pourcentage de l'image) en « duree » secondes,
 *   puis le calque disparait jusqu'au passage suivant (« intervalle » secondes, passage compris).
 *   echelle [debut, fin] : taille qui change en perspective (bateau qui approche, passant qui s'eloigne,
 *   poteau qui file) ; la vitesse suit la perspective. pas : petit rebond de la marche (en % de la hauteur).
 * - balancier : oscillation de pendule autour du pivot (balancoire, lanterne), amplitude en degres.
 * - roulis : rotation lente autour du pivot (aile qui penche), amplitude en degres.
 * - clignote : opacite « repos » la plupart du temps, « eclat » selon la forme :
 *   doux (va et vient), carre (moitie du cycle chacun), eclats (trois eclats courts en debut de cycle).
 * - flamme : la flamme danse (etirement et penche irreguliers autour du pivot, en bas).
 * - defile : bande qui glisse sans fin (nuages, vagues) ; l'image fait « largeur » % de l'image de la scene
 *   et se repete tous les « periode » %.
 */
export type MouvementCalque =
  | { type: 'fixe' }
  | { type: 'traversee'; de: Point; vers: Point; duree: number; intervalle: number; depart?: number; echelle?: [number, number]; pas?: number }
  | { type: 'balancier'; amplitude: number; periode: number }
  | { type: 'roulis'; amplitude: number; periode: number }
  | { type: 'clignote'; periode: number; repos: number; eclat: number; forme: 'doux' | 'carre' | 'eclats'; decalage?: number }
  | { type: 'flamme'; amplitude: number; periode: number }
  | { type: 'defile'; largeur: number; periode: number; duree: number; sens: 1 | -1 };

export type CalqueMobile = {
  /** cle de l'image detouree dans lib/v2/scenes/medias.ts (IMAGES_CALQUES) */
  image: string;
  /** position et taille du calque a echelle 1, en pourcentage de l'image (x, l sur la largeur ; y, h sur la hauteur) */
  zone: Zone;
  /** pivot du balancier, du roulis ou de la flamme, en pourcentage du calque (0,0 = coin haut gauche) */
  pivot?: { x: number; y: number };
  /** le calque ne se voit que dans ce rectangle de l'image (reflet sur les vitres du tramway) */
  coupe?: Zone;
  mouvement: MouvementCalque;
};

/** Taille d'un calque en traversee a l'instant p (0 a 1) : la perspective, constante sans echelle */
export function echelleTraversee(echelle: [number, number] | undefined, p: number): number {
  'worklet';
  if (!echelle) return 1;
  const [a, b] = echelle;
  if (a === b || a <= 0 || b <= 0) return a;
  // distance qui varie a vitesse constante : la taille est son inverse
  return 1 / (1 / a + (1 / b - 1 / a) * p);
}

/** Avancee sur le trajet (0 a 1) a l'instant p : suit la taille en perspective, sinon lineaire */
export function avanceeTraversee(echelle: [number, number] | undefined, p: number): number {
  'worklet';
  if (!echelle || echelle[0] === echelle[1]) return p;
  return (echelleTraversee(echelle, p) - echelle[0]) / (echelle[1] - echelle[0]);
}

export const LIBELLES_MOUVEMENTS: Record<MouvementCalque['type'], string> = {
  fixe: 'Fond',
  traversee: traduire('Traversée'),
  balancier: 'Balancier',
  roulis: 'Roulis',
  clignote: 'Clignotement',
  flamme: 'Flamme',
  defile: traduire('Défilement'),
};

/** Les effets en code a montrer : tous, sauf ceux que la video montre deja quand elle joue */
export function effetsVisibles(s: ConfigScene, videoJoue: boolean): Effet[] {
  if (!videoJoue || !s.masquesAvecVideo?.length) return s.effets;
  const masques = s.masquesAvecVideo;
  return s.effets.filter((e) => !masques.includes(e.type));
}

export const LIBELLES_EFFETS: Record<TypeEffet, string> = {
  pluie: 'Pluie fine',
  eclaboussures: traduire('Éclaboussures'),
  neige: 'Neige',
  braises: 'Braises',
  etoiles: traduire('Étoiles'),
  brume: traduire('Nuages et brume'),
  lueur: 'Lueur',
  train: 'Train lumineux',
  reflets: traduire('Reflets d’eau'),
};

/**
 * Le mouvement reel de chaque scene (19 octobre 2026) : video en boucle (lib/v2/scenes/medias.ts) et/ou
 * calques mobiles, dessines dans l'ordre (le premier est dessous). Les zones sont mesurees au pixel sur les
 * images 1200 x 670 (scripts et planche : _propositions/scenes_2026-10-18/animees_v2/).
 * Un calque « fixe » efface l'objet peint qui bouge (fond refait) ou repasse devant ce qui defile.
 */
type MouvementScene = Pick<ConfigScene, 'mouvement' | 'calques' | 'masquesAvecVideo'>;

const ETOILE_FILANTE = { l: 18.333, h: 13.433 };

const MOUVEMENT_SCENE: Record<SceneAnimeeId, MouvementScene> = {
  // 27 octobre 2026 : scenes de Marseille et aurores. Le mouvement vient de la video en boucle quand elle existe
  // (lib/v2/scenes/medias.ts), sinon des effets en code ci-dessous (reflets, nuages, etoiles, lueurs).
  calanque_couchant: { mouvement: traduire('Les vagues roulent contre les rochers, le soleil scintille sur la mer.'), masquesAvecVideo: ['reflets'] },
  paddle_couchant: { mouvement: traduire('La mer ondule sous la planche, les reflets du couchant dansent.'), masquesAvecVideo: ['reflets'] },
  corniche_monument: { mouvement: traduire('La mer scintille au pied de la Corniche, les nuages glissent.'), masquesAvecVideo: ['reflets'] },
  corniche_moto: { mouvement: traduire('La mer scintille derrière la moto, les nuages glissent doucement.'), masquesAvecVideo: ['reflets'] },
  aurores_boreales: { mouvement: traduire('Les aurores ondulent dans le ciel, les étoiles scintillent.'), masquesAvecVideo: ['brume'] },
  corniche_guidon: { mouvement: traduire('La mer scintille devant le guidon, les nuages glissent.'), masquesAvecVideo: ['reflets'] },
  corniche_heure_bleue: { mouvement: traduire('Les lampadaires brillent, la mer reflète les lumières.'), masquesAvecVideo: ['reflets'] },
  yatai_pont: {
    mouvement: traduire('Les deux lanternes se balancent au vent, le train lumineux passe sur le pont.'),
    calques: [
      { image: 'sc01_fond_g', zone: { x: 29.833, y: 34.776, l: 7.917, h: 22.537 }, mouvement: { type: 'fixe' } },
      { image: 'sc01_fond_d', zone: { x: 50.5, y: 42.836, l: 6.583, h: 17.164 }, mouvement: { type: 'fixe' } },
      { image: 'sc01_lanterne_g', zone: { x: 30.333, y: 35.672, l: 6.917, h: 20.746 }, pivot: { x: 48.2, y: 6.5 }, mouvement: { type: 'balancier', amplitude: 5.5, periode: 3.4 } },
      { image: 'sc01_lanterne_d', zone: { x: 51, y: 43.731, l: 5.583, h: 15.373 }, pivot: { x: 49.3, y: 6.8 }, mouvement: { type: 'balancier', amplitude: 6, periode: 3.9 } },
    ],
  },
  moto_tour_eiffel: {
    mouvement: traduire('Un bateau-mouche passe sur la Seine devant la tour Eiffel, l’eau scintille (vidéo en boucle).'),
    // la video (video/sc02.mp4) montre le bateau et l'eau : plus de calque bateau, plus de reflets en code.
    // Calque d'avant la video, a remettre si on retire la video :
    // { image: 'sc02_bateau', zone: { x: 33.75, y: 58.209, l: 19.167, h: 10.448 }, mouvement: { type: 'traversee', de: { x: 43.333, y: 63.433 }, vers: { x: -11.667, y: 68.358 }, echelle: [0.42, 1.05], duree: 24, intervalle: 45, depart: 3 } },
    masquesAvecVideo: ['reflets'],
  },
  rue_tokyo: {
    mouvement: traduire('Un passant remonte la ruelle et s’éloigne, l’enseigne du konbini grésille.'),
    calques: [
      { image: 'sc03_fond', zone: { x: 15.833, y: 52.985, l: 6.25, h: 24.627 }, mouvement: { type: 'fixe' } },
      { image: 'sc03_passant', zone: { x: 15.917, y: 52.985, l: 6.083, h: 25.075 }, mouvement: { type: 'traversee', de: { x: 17.083, y: 85.8 }, vers: { x: 21.833, y: 59.403 }, echelle: [1.3, 0.42], pas: 1.2, duree: 16, intervalle: 26, depart: 1 } },
      { image: 'sc03_enseigne_eteinte', zone: { x: 38.083, y: 32.836, l: 36.583, h: 16.418 }, mouvement: { type: 'clignote', periode: 6.5, repos: 0, eclat: 1, forme: 'eclats' } },
    ],
  },
  passage_niveau_mer: {
    mouvement: traduire('Le tramway vert glisse le long de la côte au coucher du soleil, la mer scintille (vidéo en boucle).'),
    // la video (video/sc04.mp4) montre le tramway qui passe et la mer : l'image a ete retouchee sans passage a niveau
    // (19 octobre 2026, ancienne image et calques archives dans _archive_ancien_design_2026-10-09/scenes_animees_v5/).
    // Plus de calques feux ni reflet, plus de feux rouges ni de reflets en code.
    // Calques d'avant la video, a remettre seulement avec l'ancienne image :
    // { image: 'sc04_feux_g', zone: { x: 19.083, y: 40.448, l: 2.917, h: 10.597 }, mouvement: { type: 'clignote', periode: 1.2, repos: 0, eclat: 1, forme: 'carre' } },
    // { image: 'sc04_feux_d', zone: { x: 73.583, y: 40.299, l: 3, h: 10.448 }, mouvement: { type: 'clignote', periode: 1.2, repos: 0, eclat: 1, forme: 'carre' } },
    // { image: 'sc04_reflet', zone: { x: 38.75, y: 47.612, l: 9.167, h: 8.358 }, coupe: { x: 47.083, y: 47.761, l: 52.917, h: 8.06 }, mouvement: { type: 'traversee', de: { x: 43.333, y: 51.791 }, vers: { x: 105, y: 51.791 }, duree: 2.6, intervalle: 7, depart: 1.5 } },
    masquesAvecVideo: ['reflets'],
  },
  toit_train: {
    mouvement: traduire('Le train roule vers la ville, les portiques et les poteaux de la voie défilent (vidéo en boucle).'),
    // la video (video/sc05.mp4) montre le train qui avance : plus de calque poteau, plus de brume en code.
    // Calques d'avant la video, a remettre si on retire la video :
    // { image: 'sc05_fond', zone: { x: 4.333, y: 30.448, l: 8.75, h: 60.448 }, mouvement: { type: 'fixe' } },
    // { image: 'sc05_poteau', zone: { x: 4.5, y: 31.045, l: 8.25, h: 59.403 }, mouvement: { type: 'traversee', de: { x: 45.4, y: 51.284 }, vers: { x: -28.99, y: 70.418 }, echelle: [0.12, 1.9], duree: 1.7, intervalle: 2.6, depart: 0.3 } },
    masquesAvecVideo: ['brume'],
  },
  hublot_avion: {
    mouvement: traduire('La mer de nuages défile sous l’aile, derrière le hublot.'),
    calques: [
      { image: 'sc06_nuages', zone: { x: 19.833, y: 50.149, l: 63, h: 34.328 }, mouvement: { type: 'defile', largeur: 112, periode: 37.333, duree: 30, sens: -1 } },
      { image: 'sc06_premier_plan', zone: { x: 19.5, y: 49.552, l: 63.667, h: 35.522 }, mouvement: { type: 'fixe' } },
    ],
  },
  aile_avion: {
    mouvement: traduire('L’aile penche doucement puis revient, les nuages défilent dessous (vidéo en boucle).'),
    masquesAvecVideo: ['brume'],
  },
  balancoire_plage: {
    mouvement: traduire('La balançoire se balance doucement sous le palmier, les vagues roulent sur le sable (vidéo en boucle).'),
    // la video (video/sc08.mp4) montre la balancoire et les vagues : plus de calque balancoire, plus de reflets en code.
    // Calques d'avant la video, a remettre si on retire la video :
    // { image: 'sc08_fond', zone: { x: 58.333, y: 3.284, l: 18.917, h: 81.791 }, mouvement: { type: 'fixe' } },
    // { image: 'sc08_balancoire', zone: { x: 61.667, y: 5.075, l: 12.25, h: 78.209 }, pivot: { x: 49, y: 8.4 }, mouvement: { type: 'balancier', amplitude: 4.5, periode: 3.4 } },
    masquesAvecVideo: ['reflets'],
  },
  bivouac_desert: {
    mouvement: traduire('Les flammes du feu de camp dansent, les braises montent.'),
    calques: [
      { image: 'sc09_fond', zone: { x: 38.583, y: 53.582, l: 7.333, h: 19.104 }, mouvement: { type: 'fixe' } },
      { image: 'sc09_flamme', zone: { x: 38.667, y: 53.731, l: 7.083, h: 17.761 }, pivot: { x: 50, y: 98 }, mouvement: { type: 'flamme', amplitude: 0.14, periode: 0.9 } },
    ],
  },
  voie_lactee_nuages: {
    mouvement: traduire('La mer de nuages glisse lentement à l’horizon, une étoile filante passe de temps en temps.'),
    calques: [
      { image: 'sc10_nuages', zone: { x: 38.5, y: 52.537, l: 61.5, h: 14.328 }, mouvement: { type: 'defile', largeur: 246, periode: 123, duree: 95, sens: 1 } },
      { image: 'sc10_bord', zone: { x: 38.5, y: 52.537, l: 4.833, h: 14.328 }, mouvement: { type: 'fixe' } },
      { image: 'etoile_filante', zone: { x: 15.833, y: 15.672, ...ETOILE_FILANTE }, mouvement: { type: 'traversee', de: { x: 25, y: 22.388 }, vers: { x: 70, y: -4.478 }, duree: 1.1, intervalle: 13, depart: 5 } },
    ],
  },
  lampadaire_hiver: {
    mouvement: traduire('La neige tombe, la lumière du lampadaire grésille et baisse par instants.'),
    calques: [
      { image: 'sc11_lampe_eteinte', zone: { x: 6.583, y: 0.896, l: 71.75, h: 99.104 }, mouvement: { type: 'clignote', periode: 9, repos: 0, eclat: 1, forme: 'eclats' } },
    ],
  },
  voie_lactee_cote: {
    mouvement: traduire('Les vagues roulent vers la falaise, une étoile filante traverse le ciel de temps en temps.'),
    calques: [
      { image: 'sc12_mer', zone: { x: 61.25, y: 69.851, l: 38.75, h: 30.149 }, mouvement: { type: 'defile', largeur: 126.667, periode: 63.333, duree: 40, sens: -1 } },
      { image: 'sc12_bord', zone: { x: 61.25, y: 69.851, l: 4.083, h: 30.149 }, mouvement: { type: 'fixe' } },
      { image: 'etoile_filante', zone: { x: 54.167, y: 29.104, ...ETOILE_FILANTE }, mouvement: { type: 'traversee', de: { x: 63.333, y: 35.821 }, vers: { x: 103.333, y: 11.94 }, duree: 1.2, intervalle: 15, depart: 8 } },
    ],
  },
};

// Zones mesurees sur les images (grille de 10 %), a affiner a l'oeil dans l'apercu du Studio.
export const SCENES_ANIMEES_CODE: ConfigScene[] = [
  {
    id: 'yatai_pont',
    numero: 1,
    fichier: 'sc01_yatai_pont.webp',
    nom: traduire('Yatai sous le pont'),
    ...MOUVEMENT_SCENE.yatai_pont,
    fond: ['#3C4555', '#46414F', '#33384A'],
    effets: [
      // le train de banlieue sur le pont : la voie monte de gauche (30 %) a droite (2 %)
      { type: 'train', zone: { x: 0, y: 11, l: 100, h: 7 }, intervalle: 14, traversee: 4.5, fenetres: 14, sens: 1, pente: -10, couleur: '#FFE6A8' },
      // vapeur du bol, au dessus du comptoir
      { type: 'brume', zone: { x: 36, y: 44, l: 16, h: 20 }, nappes: 2, duree: 9, sens: 1, opacite: 0.18, couleur: '#FFFFFF' },
      // les deux lanternes rouges : la grande au centre gauche, la petite a droite du stand
      { type: 'lueur', points: [{ x: 34, y: 46, r: 9 }, { x: 54, y: 52, r: 6.5 }], mode: 'vacille', periode: 1, intensite: 0.6, couleur: '#FF5A3C' },
      { type: 'pluie', zone: { x: 0, y: 0, l: 100, h: 100 }, nombre: 30, angle: 10, duree: 0.75, longueur: 4, opacite: 0.4, couleur: '#DCE8FF' },
      // les flaques au pied du stand, reflets rouges et orange
      { type: 'reflets', zone: { x: 25, y: 86, l: 65, h: 13 }, nombre: 8, opacite: 0.5, couleur: '#FF9A5A' },
      { type: 'eclaboussures', zone: { x: 0, y: 84, l: 100, h: 15 }, nombre: 6, opacite: 0.55, couleur: '#DCE8FF' },
    ],
  },
  {
    id: 'moto_tour_eiffel',
    numero: 2,
    fichier: 'sc02_moto_tour_eiffel.webp',
    nom: traduire('Moto face à la tour Eiffel'),
    ...MOUVEMENT_SCENE.moto_tour_eiffel,
    fond: ['#9A9E92', '#A79273', '#7E736B'],
    effets: [
      // nuages du ciel de fin de journee, a gauche de la tour et vers l'horizon
      { type: 'brume', zone: { x: 0, y: 2, l: 70, h: 40 }, nappes: 3, duree: 75, sens: 1, opacite: 0.3, couleur: '#FFF4E0' },
      // la Seine, a gauche du quai
      { type: 'reflets', zone: { x: 0, y: 65, l: 52, h: 16 }, nombre: 12, opacite: 0.5, couleur: '#FFF4D8' },
    ],
  },
  {
    id: 'rue_tokyo',
    numero: 3,
    fichier: 'sc03_rue_tokyo.webp',
    nom: traduire('Rue de Tokyo au crépuscule'),
    ...MOUVEMENT_SCENE.rue_tokyo,
    fond: ['#957897', '#8B7678', '#635560'],
    effets: [
      { type: 'etoiles', zone: { x: 0, y: 0, l: 100, h: 18 }, nombre: 8, taille: [1, 1.8], scintillement: 0.7, couleur: '#FFFFFF' },
      { type: 'brume', zone: { x: 0, y: 4, l: 100, h: 26 }, nappes: 2, duree: 80, sens: -1, opacite: 0.2, couleur: '#FFD1E0' },
      // la superette au centre : l'enseigne et la vitrine, a peine vivantes
      { type: 'lueur', points: [{ x: 56, y: 42, r: 22 }, { x: 56, y: 58, r: 18 }], mode: 'vacille', periode: 1, intensite: 0.28, couleur: '#FFF6DC' },
      // les trois lampadaires de la rue
      { type: 'lueur', points: [{ x: 21, y: 22, r: 4 }, { x: 31, y: 29, r: 3.5 }, { x: 84, y: 11, r: 4 }], mode: 'vacille', periode: 1, intensite: 0.5, couleur: '#FFE7B0' },
    ],
  },
  {
    id: 'passage_niveau_mer',
    numero: 4,
    fichier: 'sc04_passage_niveau_mer.webp',
    nom: traduire('Tramway au bord de la mer'),
    ...MOUVEMENT_SCENE.passage_niveau_mer,
    fond: ['#D39B90', '#A87F6C', '#865D52'],
    effets: [
      { type: 'brume', zone: { x: 0, y: 2, l: 100, h: 30 }, nappes: 2, duree: 90, sens: 1, opacite: 0.25, couleur: '#FFE3D0' },
      // les feux rouges du passage a niveau : retires avec la nouvelle image (19 octobre 2026), plus de feux a eclairer
      // {
      //   type: 'lueur',
      //   points: [
      //     { x: 20.5, y: 43.5, r: 3, decalage: 0 },
      //     { x: 20.5, y: 48.5, r: 3, decalage: 0.5 },
      //     { x: 75, y: 43.3, r: 3, decalage: 0 },
      //     { x: 75, y: 48.3, r: 3, decalage: 0.5 },
      //   ],
      //   mode: 'clignote',
      //   periode: 1.2,
      //   intensite: 0.95,
      //   couleur: '#FF2A1A',
      // },
      // la mer, a gauche du tramway
      { type: 'reflets', zone: { x: 0, y: 49, l: 46, h: 9 }, nombre: 12, opacite: 0.55, couleur: '#FFE0B0' },
    ],
  },
  {
    id: 'toit_train',
    numero: 5,
    fichier: 'sc05_toit_train.webp',
    nom: traduire('Sur le toit du train'),
    ...MOUVEMENT_SCENE.toit_train,
    fond: ['#314363', '#534A4B', '#4D4646'],
    effets: [
      { type: 'etoiles', zone: { x: 0, y: 0, l: 100, h: 26 }, nombre: 12, taille: [1, 1.8], scintillement: 0.7, couleur: '#FFFFFF' },
      // fenetres allumees des gratte ciel, au loin
      { type: 'etoiles', zone: { x: 0, y: 30, l: 100, h: 22 }, nombre: 22, taille: [1, 2], scintillement: 0.5, couleur: '#FFE7A8' },
      { type: 'brume', zone: { x: 30, y: 0, l: 70, h: 30 }, nappes: 2, duree: 60, sens: -1, opacite: 0.18, couleur: '#8FA0C8' },
    ],
  },
  {
    id: 'hublot_avion',
    numero: 6,
    fichier: 'sc06_hublot_avion.webp',
    nom: traduire('Hublot au coucher du soleil'),
    ...MOUVEMENT_SCENE.hublot_avion,
    fond: ['#AC888E', '#C09371', '#9D8578'],
    effets: [
      // la bande orange du soleil couchant sur l'horizon
      { type: 'lueur', points: [{ x: 52, y: 49, r: 24 }], mode: 'respire', periode: 6, intensite: 0.35, couleur: '#FF9A4A' },
      // mer de nuages sombres, dans le hublot seulement
      { type: 'brume', zone: { x: 22, y: 54, l: 56, h: 32 }, nappes: 3, duree: 50, sens: -1, opacite: 0.28, couleur: '#8A8FA8' },
      // nuages roses du ciel
      { type: 'brume', zone: { x: 22, y: 8, l: 56, h: 30 }, nappes: 2, duree: 70, sens: -1, opacite: 0.2, couleur: '#FFC8B0' },
    ],
  },
  {
    id: 'aile_avion',
    numero: 7,
    fichier: 'sc07_aile_avion.webp',
    nom: traduire('Aile au-dessus des nuages'),
    ...MOUVEMENT_SCENE.aile_avion,
    fond: ['#B88790', '#D3A482', '#B3826F'],
    effets: [
      { type: 'lueur', points: [{ x: 74, y: 46, r: 16 }], mode: 'respire', periode: 7, intensite: 0.35, couleur: '#FFE3A0' },
      // mer de nuages doree sous l'aile
      { type: 'brume', zone: { x: 0, y: 48, l: 100, h: 50 }, nappes: 4, duree: 36, sens: -1, opacite: 0.28, couleur: '#FFE6D0' },
      // feu de navigation au bout du winglet
      { type: 'lueur', points: [{ x: 45.5, y: 13, r: 2.5 }], mode: 'clignote', periode: 1.5, intensite: 0.9, couleur: '#FFFFFF' },
    ],
  },
  {
    id: 'balancoire_plage',
    numero: 8,
    fichier: 'sc08_balancoire_plage.webp',
    nom: traduire('Balançoire sur la plage'),
    ...MOUVEMENT_SCENE.balancoire_plage,
    fond: ['#9DA592', '#A4AF9B', '#AFB9A6'],
    effets: [
      // la balancoire ne bouge pas : elle est dans l'image (voir effets/index.tsx)
      { type: 'brume', zone: { x: 55, y: 4, l: 45, h: 40 }, nappes: 2, duree: 75, sens: 1, opacite: 0.3, couleur: '#FFFFFF' },
      // l'eau turquoise, a droite de la plage
      { type: 'reflets', zone: { x: 50, y: 50, l: 50, h: 48 }, nombre: 22, opacite: 0.5, couleur: '#FFFFFF' },
    ],
  },
  {
    id: 'bivouac_desert',
    numero: 9,
    fichier: 'sc09_bivouac_desert.webp',
    nom: traduire('Bivouac dans le désert'),
    ...MOUVEMENT_SCENE.bivouac_desert,
    fond: ['#7E3D48', '#8A493C', '#854534'],
    effets: [
      { type: 'etoiles', zone: { x: 0, y: 0, l: 100, h: 14 }, nombre: 8, taille: [1, 1.8], scintillement: 0.7, couleur: '#FFF2DC' },
      // le feu de camp : la flamme, et sa lumiere sur le sable
      { type: 'lueur', points: [{ x: 42, y: 66, r: 7 }, { x: 42, y: 71, r: 20 }], mode: 'vacille', periode: 1, intensite: 0.7, couleur: '#FF8A2A' },
      { type: 'braises', zone: { x: 38, y: 46, l: 9, h: 22 }, nombre: 14, duree: 2.6, taille: [1.5, 3], derive: 30, opacite: 0.9, couleur: '#FFB050' },
    ],
  },
  {
    id: 'voie_lactee_nuages',
    numero: 10,
    fichier: 'sc10_voie_lactee_nuages.webp',
    nom: traduire('Voie lactée sur la mer de nuages'),
    ...MOUVEMENT_SCENE.voie_lactee_nuages,
    fond: ['#304062', '#60687F', '#5D5454'],
    effets: [
      { type: 'etoiles', zone: { x: 0, y: 0, l: 100, h: 50 }, nombre: 40, taille: [0.8, 2.2], scintillement: 0.8, couleur: '#FFFFFF' },
      // la ville sous les nuages
      { type: 'lueur', points: [{ x: 65, y: 74, r: 24 }], mode: 'respire', periode: 8, intensite: 0.3, couleur: '#FFB86A' },
      { type: 'brume', zone: { x: 20, y: 54, l: 80, h: 40 }, nappes: 3, duree: 90, sens: 1, opacite: 0.25, couleur: '#E0D8F0' },
    ],
  },
  {
    id: 'lampadaire_hiver',
    numero: 11,
    fichier: 'sc11_lampadaire_hiver.webp',
    nom: traduire('Lampadaire dans la nuit d’hiver'),
    ...MOUVEMENT_SCENE.lampadaire_hiver,
    fond: ['#30455B', '#394D63', '#677F9A'],
    effets: [
      // le vieux lampadaire turquoise, a gauche du chemin
      { type: 'lueur', points: [{ x: 31, y: 20, r: 14 }], mode: 'vacille', periode: 1, intensite: 0.45, couleur: '#9FF0E0' },
      { type: 'neige', zone: { x: 0, y: 0, l: 100, h: 100 }, nombre: 44, duree: 9, taille: [1.5, 4], derive: 4, opacite: 0.85, couleur: '#FFFFFF' },
    ],
  },
  {
    id: 'voie_lactee_cote',
    numero: 12,
    fichier: 'sc12_voie_lactee_cote.webp',
    nom: traduire('Voie lactée sur la côte'),
    ...MOUVEMENT_SCENE.voie_lactee_cote,
    fond: ['#1F2951', '#38466E', '#2A3750'],
    effets: [
      { type: 'etoiles', zone: { x: 20, y: 0, l: 80, h: 55 }, nombre: 34, taille: [0.8, 2.2], scintillement: 0.8, couleur: '#FFFFFF' },
      // la petite lanterne posee pres du personnage
      { type: 'lueur', points: [{ x: 36, y: 63, r: 6 }], mode: 'vacille', periode: 1, intensite: 0.65, couleur: '#FFC870' },
      // la ville lointaine au bout de la cote
      { type: 'lueur', points: [{ x: 63, y: 61, r: 9 }], mode: 'respire', periode: 9, intensite: 0.3, couleur: '#FFB070' },
      { type: 'reflets', zone: { x: 52, y: 62, l: 48, h: 36 }, nombre: 12, opacite: 0.35, couleur: '#B8C8FF' },
    ],
  },
  // 27 octobre 2026 : Marseille et les aurores, zones mesurees sur la planche (_propositions/scenes_marseille_2026-10-27/planche_grille.jpg)
  {
    id: 'calanque_couchant',
    numero: 13,
    fichier: 'sc13_calanque_couchant.webp',
    nom: traduire('Calanque au couchant'),
    ...MOUVEMENT_SCENE.calanque_couchant,
    fond: ['#E9A89A', '#D99A78', '#6E6A78'],
    effets: [
      { type: 'brume', zone: { x: 0, y: 4, l: 100, h: 34 }, nappes: 2, duree: 90, sens: 1, opacite: 0.22, couleur: '#FFE3D0' },
      { type: 'lueur', points: [{ x: 62, y: 38, r: 9 }], mode: 'respire', periode: 8, intensite: 0.35, couleur: '#FFE0A8' },
      { type: 'reflets', zone: { x: 4, y: 48, l: 58, h: 44 }, nombre: 16, opacite: 0.45, couleur: '#FFE6C0' },
    ],
  },
  {
    id: 'paddle_couchant',
    numero: 14,
    fichier: 'sc14_paddle_couchant.webp',
    nom: traduire('Paddle au couchant'),
    ...MOUVEMENT_SCENE.paddle_couchant,
    fond: ['#E58B5A', '#A07A78', '#3E4A62'],
    effets: [
      { type: 'brume', zone: { x: 40, y: 4, l: 60, h: 34 }, nappes: 2, duree: 85, sens: -1, opacite: 0.2, couleur: '#E8EEF8' },
      { type: 'reflets', zone: { x: 0, y: 46, l: 60, h: 42 }, nombre: 18, opacite: 0.5, couleur: '#FFC890' },
    ],
  },
  {
    id: 'corniche_monument',
    numero: 15,
    fichier: 'sc15_corniche_monument.webp',
    nom: traduire('Corniche, le monument'),
    ...MOUVEMENT_SCENE.corniche_monument,
    fond: ['#9DB0C8', '#E8B88A', '#9A8678'],
    effets: [
      { type: 'brume', zone: { x: 30, y: 4, l: 70, h: 30 }, nappes: 2, duree: 90, sens: 1, opacite: 0.22, couleur: '#FFE8D8' },
      { type: 'lueur', points: [{ x: 62, y: 37, r: 8 }], mode: 'respire', periode: 8, intensite: 0.3, couleur: '#FFE7B0' },
      { type: 'reflets', zone: { x: 40, y: 44, l: 58, h: 8 }, nombre: 10, opacite: 0.5, couleur: '#FFF0D0' },
    ],
  },
  {
    id: 'corniche_moto',
    numero: 16,
    fichier: 'sc16_corniche_moto.webp',
    nom: traduire('Corniche à moto'),
    ...MOUVEMENT_SCENE.corniche_moto,
    fond: ['#F2C27A', '#D8A878', '#A08A80'],
    effets: [
      { type: 'brume', zone: { x: 0, y: 2, l: 60, h: 26 }, nappes: 2, duree: 90, sens: 1, opacite: 0.18, couleur: '#FFF0D8' },
      { type: 'reflets', zone: { x: 0, y: 34, l: 42, h: 18 }, nombre: 12, opacite: 0.5, couleur: '#FFE8B8' },
    ],
  },
  {
    id: 'aurores_boreales',
    numero: 17,
    fichier: 'sc17_aurores_boreales.webp',
    nom: traduire('Aurores boréales'),
    ...MOUVEMENT_SCENE.aurores_boreales,
    fond: ['#1E2A50', '#2E4A6A', '#5A6A8A'],
    effets: [
      { type: 'etoiles', zone: { x: 0, y: 0, l: 100, h: 45 }, nombre: 30, taille: [0.8, 2], scintillement: 0.8, couleur: '#FFFFFF' },
      { type: 'brume', zone: { x: 10, y: 10, l: 80, h: 50 }, nappes: 3, duree: 40, sens: 1, opacite: 0.22, couleur: '#7FFFC8' },
      { type: 'lueur', points: [{ x: 45, y: 42, r: 18 }, { x: 75, y: 25, r: 14 }], mode: 'respire', periode: 7, intensite: 0.3, couleur: '#7AF5B8' },
    ],
  },
  {
    id: 'corniche_guidon',
    numero: 18,
    fichier: 'sc18_corniche_guidon.webp',
    nom: traduire('Corniche, vue du guidon'),
    ...MOUVEMENT_SCENE.corniche_guidon,
    fond: ['#E8A878', '#D8A878', '#A08A80'],
    effets: [
      { type: 'brume', zone: { x: 0, y: 2, l: 70, h: 26 }, nappes: 2, duree: 90, sens: 1, opacite: 0.2, couleur: '#FFE8D0' },
      { type: 'reflets', zone: { x: 0, y: 34, l: 45, h: 16 }, nombre: 12, opacite: 0.5, couleur: '#FFE8B8' },
    ],
  },
  {
    id: 'corniche_heure_bleue',
    numero: 19,
    fichier: 'sc19_corniche_heure_bleue.webp',
    nom: traduire('Corniche à l’heure bleue'),
    ...MOUVEMENT_SCENE.corniche_heure_bleue,
    fond: ['#2A3260', '#5A5A80', '#8A8098'],
    effets: [
      { type: 'etoiles', zone: { x: 0, y: 0, l: 100, h: 18 }, nombre: 12, taille: [0.8, 1.8], scintillement: 0.7, couleur: '#FFFFFF' },
      { type: 'lueur', points: [{ x: 80, y: 21, r: 4 }, { x: 85, y: 26, r: 3 }, { x: 89, y: 28, r: 2.5 }], mode: 'vacille', periode: 1, intensite: 0.5, couleur: '#FFD890' },
      { type: 'reflets', zone: { x: 0, y: 30, l: 50, h: 16 }, nombre: 12, opacite: 0.45, couleur: '#FFD8A0' },
    ],
  },
];

const PAR_ID: Record<string, ConfigScene> = Object.fromEntries(SCENES_ANIMEES_CODE.map((s) => [s.id, s]));

/** La config d'une scene, ou null si la scene n'a pas d'effets */
export function configScene(id: string | null | undefined): ConfigScene | null {
  if (!id) return null;
  return PAR_ID[id] ?? null;
}

/** Nombre d'elements animes d'un effet (un train compte pour un : une seule bande qui bouge) */
export function particulesEffet(e: Effet): number {
  switch (e.type) {
    case 'brume':
      return e.nappes;
    case 'lueur':
      return e.points.length;
    case 'train':
      return 1;
    default:
      return e.nombre;
  }
}

/** Nombre total d'elements animes d'une scene, a garder sous MAX_PARTICULES */
export function particulesScene(s: ConfigScene): number {
  return s.effets.reduce((n, e) => n + particulesEffet(e), 0);
}

/** Les effets d'une scene en clair, sans doublon (« Pluie fine, Lueur, Train lumineux ») */
export function resumeEffets(s: ConfigScene): string[] {
  const vus: string[] = [];
  for (const e of s.effets) {
    const l = LIBELLES_EFFETS[e.type];
    if (!vus.includes(l)) vus.push(l);
  }
  return vus;
}

/** Generateur pseudo aleatoire stable (meme scene, memes positions a chaque ouverture) */
export function hasard(graine: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < graine.length; i++) {
    h ^= graine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
