/**
 * onboarding-neuf/theme.ts
 *
 * Le nouvel onboarding de YOROI, copie de celui d'INRO (components/onboarding-nuit, 21 novembre 2026).
 * Palette « Pastel et Ciel » de l'app (components/yoroi/tokens.ts) posee sur un fond blanc, avec le bleu nuit
 * comme seule couleur d'action, et l'or pour le prenom, les etoiles et les lauriers (decision de Houari).
 * Police : Archivo, la police de YOROI (aucune police ajoutee).
 *
 * Les photos : 18 fichiers photo_01 a photo_18 dans assets/onboarding-neuf/ (et leurs copies reduites dans
 * assets/onboarding-neuf/mini/ pour le mur). Pour les remplacer, il suffit de remettre des fichiers sous les memes
 * noms : aucun ecran ne change. Correspondance photo et ecran : assets/onboarding-neuf/correspondance_photos.md.
 */

import { createContext, useContext } from 'react';
import type { ImageSourcePropType } from 'react-native';

export type Palette = {
  /** Fond des ecrans */
  bg: string;
  /** Cartes de choix, champs */
  card: string;
  /** Traits, barre vide */
  line: string;
  /** Texte principal */
  ink: string;
  /** Texte secondaire */
  sub: string;
  /** La couleur d'action : bouton, choix coche, barre remplie */
  acc: string;
  /** Texte pose sur la couleur d'action */
  accInk: string;
  /** Bouton pas encore actif (le pastel de l'app) */
  mute: string;
  /** Fond de l'interlude */
  inter: string;
  interInk: string;
  /** Bouton creme des moments forts (interlude) */
  creme: string;
  cremeInk: string;
  /** Or : prenom sur l'interlude, etoiles, lauriers */
  or: string;
  orFonce: string;
  /** Ambiance claire : barre d'etat en texte sombre */
  clair: boolean;
};

/** Section C du plan : la palette de l'app, sur fond blanc */
export const PALETTE: Palette = {
  bg: '#FFFFFF',
  card: '#F5F6FB',
  line: '#E4E7F1',
  ink: '#1D2033',
  sub: '#646985',
  acc: '#23358F',
  accInk: '#FFFFFF',
  mute: '#DCE3FF',
  inter: '#23358F',
  interInk: '#FFFFFF',
  creme: '#FFFFFF',
  cremeInk: '#23358F',
  or: '#E3C47B',
  orFonce: '#C59D45',
  clair: true,
};

const Ctx = createContext<Palette>(PALETTE);
export const PaletteProvider = Ctx.Provider;
/** La palette en cours (une seule aujourd'hui, gardee en contexte comme INRO) */
export function useNuit(): Palette {
  return useContext(Ctx);
}

/**
 * Les graisses d'Archivo chargees par l'app (components/yoroi/fonts.ts). INRO a 800, 700, 500 pour les titres
 * et 400, 500, 600 pour le texte : YOROI n'a que 500, 700, 800 et 900. Correspondance au plus proche.
 */
export const FONT = {
  titre: 'Archivo_900Black',
  titreBold: 'Archivo_800ExtraBold',
  titreMedium: 'Archivo_700Bold',
  texte: 'Archivo_500Medium',
  texteMedium: 'Archivo_500Medium',
  texteSemi: 'Archivo_700Bold',
} as const;

/** Les 18 photos (section D du plan). Metro exige des require() statiques. */
export const PHOTOS: Record<string, ImageSourcePropType> = {
  photo_01: require('@/assets/onboarding-neuf/photo_01.jpg'),
  photo_02: require('@/assets/onboarding-neuf/photo_02.jpg'),
  photo_03: require('@/assets/onboarding-neuf/photo_03.jpg'),
  photo_04: require('@/assets/onboarding-neuf/photo_04.jpg'),
  photo_05: require('@/assets/onboarding-neuf/photo_05.jpg'),
  photo_06: require('@/assets/onboarding-neuf/photo_06.jpg'),
  photo_07: require('@/assets/onboarding-neuf/photo_07.jpg'),
  photo_08: require('@/assets/onboarding-neuf/photo_08.jpg'),
  photo_09: require('@/assets/onboarding-neuf/photo_09.jpg'),
  photo_10: require('@/assets/onboarding-neuf/photo_10.jpg'),
  photo_11: require('@/assets/onboarding-neuf/photo_11.jpg'),
  photo_12: require('@/assets/onboarding-neuf/photo_12.jpg'),
  photo_13: require('@/assets/onboarding-neuf/photo_13.jpg'),
  photo_14: require('@/assets/onboarding-neuf/photo_14.jpg'),
  photo_15: require('@/assets/onboarding-neuf/photo_15.jpg'),
  photo_16: require('@/assets/onboarding-neuf/photo_16.jpg'),
  photo_17: require('@/assets/onboarding-neuf/photo_17.jpg'),
  photo_18: require('@/assets/onboarding-neuf/photo_18.jpg'),
};
export type CleePhoto = keyof typeof PHOTOS;

/** Les memes en petit (360 de large) : le mur de l'interlude arrive d'un coup, sans photo qui se charge une par une */
export const MINIS: Record<string, ImageSourcePropType> = {
  photo_01: require('@/assets/onboarding-neuf/mini/photo_01.jpg'),
  photo_02: require('@/assets/onboarding-neuf/mini/photo_02.jpg'),
  photo_03: require('@/assets/onboarding-neuf/mini/photo_03.jpg'),
  photo_04: require('@/assets/onboarding-neuf/mini/photo_04.jpg'),
  photo_05: require('@/assets/onboarding-neuf/mini/photo_05.jpg'),
  photo_06: require('@/assets/onboarding-neuf/mini/photo_06.jpg'),
  photo_07: require('@/assets/onboarding-neuf/mini/photo_07.jpg'),
  photo_08: require('@/assets/onboarding-neuf/mini/photo_08.jpg'),
  photo_09: require('@/assets/onboarding-neuf/mini/photo_09.jpg'),
  photo_10: require('@/assets/onboarding-neuf/mini/photo_10.jpg'),
  photo_11: require('@/assets/onboarding-neuf/mini/photo_11.jpg'),
  photo_12: require('@/assets/onboarding-neuf/mini/photo_12.jpg'),
  photo_13: require('@/assets/onboarding-neuf/mini/photo_13.jpg'),
  photo_14: require('@/assets/onboarding-neuf/mini/photo_14.jpg'),
  photo_15: require('@/assets/onboarding-neuf/mini/photo_15.jpg'),
  photo_16: require('@/assets/onboarding-neuf/mini/photo_16.jpg'),
  photo_17: require('@/assets/onboarding-neuf/mini/photo_17.jpg'),
  photo_18: require('@/assets/onboarding-neuf/mini/photo_18.jpg'),
};

/** L'entree : 9 plans, photos 1 a 9 */
export const PLANS_ENTREE: CleePhoto[] = ['photo_01', 'photo_02', 'photo_03', 'photo_04', 'photo_05', 'photo_06', 'photo_07', 'photo_08', 'photo_09'];
/** Le mur de l'interlude : 17 photos uniques, photos 1 a 17 */
export const MUR: CleePhoto[] = [
  'photo_01', 'photo_02', 'photo_03', 'photo_04', 'photo_05', 'photo_06', 'photo_07', 'photo_08', 'photo_09',
  'photo_10', 'photo_11', 'photo_12', 'photo_13', 'photo_14', 'photo_15', 'photo_16', 'photo_17',
];
/** L'ecran 3 du paywall : photo 18 */
export const PHOTO_PAYWALL: CleePhoto = 'photo_18';
/** L'offre de rattrapage : 3, 7, 16 en haut ; 17 a gauche et 1 a droite au milieu */
export const MOSAIQUE_RATTRAPAGE: { haut: [CleePhoto, CleePhoto, CleePhoto]; gauche: CleePhoto; droite: CleePhoto } = {
  haut: ['photo_03', 'photo_07', 'photo_16'],
  gauche: 'photo_17',
  droite: 'photo_01',
};
/** Le fond de l'ecran verrouille des rappels : photo 9 */
export const PHOTO_RAPPELS: CleePhoto = 'photo_09';

/**
 * Les vrais ecrans de YOROI, floutes pendant le chargement (assets/onboarding-neuf/ecrans) : accueil, carte poids,
 * mensurations, chrono de rounds. Rendus depuis les vrais composants de l'app ; remplacables par des captures.
 */
export const ECRANS_APP: { src: ImageSourcePropType; ratio: number }[] = [
  { src: require('@/assets/onboarding-neuf/ecrans/ecran_1.jpg'), ratio: 390 / 620 },
  { src: require('@/assets/onboarding-neuf/ecrans/ecran_2.jpg'), ratio: 390 / 620 },
  { src: require('@/assets/onboarding-neuf/ecrans/ecran_3.jpg'), ratio: 390 / 620 },
  { src: require('@/assets/onboarding-neuf/ecrans/ecran_4.jpg'), ratio: 390 / 620 },
];

/** L'icone de YOROI (celle des notifications et du rattrapage) */
export const ICONE_YOROI: ImageSourcePropType = require('@/assets/logo d\'app/yoroi-logo2.png');
