/**
 * Animations de test, visibles uniquement en mode createur (26 octobre 2026, Houari : « au public on ne
 * laisse rien, seulement le nom des exercices ; moi et mon frere on teste en cachette jusqu'a l'achat »).
 *
 * Sources au choix dans le Studio :
 * - aucune : comme le public, aucune animation ;
 * - yoroi : nos animations actuelles (lib/v2/programmes/demosArt.ts), pour comparer ;
 * - photos : Free Exercise DB, domaine public (Unlicense), github.com/yuhonas/free-exercise-db ;
 * - dessins : Everkinetic, licence CC BY-SA 4.0, github.com/everkinetic/data ;
 * - repdb : RepDB, edition gratuite, usage commercial permis avec la mention « Exercise data by RepDB (repdb.co) »,
 *   github.com/RepDB/exercise-dataset (jamais le dossier premium-samples, reserve a l'evaluation).
 * - figures : Open Exercise Figures, domaine public (CC0), mannequin anime, muscle cible en rouge,
 *   github.com/AbanoubAmir/open-exercise-figures (version figee par son commit).
 * Les images en ligne sont telechargees seulement quand un exercice s'affiche (rien dans l'app livree).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { DESSINS_EK, DESSINS_REPDB, FIGURES_OEF, PHOTOS_FEDB } from './demosTestCorrespondances';

export type SourceDemos = 'aucune' | 'yoroi' | 'photos' | 'dessins' | 'repdb' | 'figures';
export type SourceEnLigne = 'photos' | 'dessins' | 'repdb' | 'figures';
export const SOURCES_DEMOS: SourceDemos[] = ['aucune', 'figures', 'repdb', 'photos', 'dessins', 'yoroi'];
export const CLE_SOURCE_DEMOS = 'yoroi_studio_demos_v1';
export const DEMOS_CHANGEES = 'YOROI_DEMOS_CHANGEES';

const RACINE_PHOTOS = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const RACINE_DESSINS = 'https://raw.githubusercontent.com/everkinetic/data/main/dist/png/';
export const RACINE_FIGURES = 'https://raw.githubusercontent.com/AbanoubAmir/open-exercise-figures/a0574d54baaf23f5784dfdebd5c65f6a87fd5194/';
const RACINE_REPDB = 'https://raw.githubusercontent.com/RepDB/exercise-dataset/main/images/flat/';

let createur = false;
let source: SourceDemos = 'aucune';

/** La source vraiment utilisee : toujours « aucune » hors mode createur */
export const sourceDemosActive = (): SourceDemos => (createur ? source : 'aucune');
export const sourceDemosChoisie = (): SourceDemos => source;

const prevenir = () => DeviceEventEmitter.emit(DEMOS_CHANGEES, sourceDemosActive());

/** Appele par CreatorModeProvider a chaque ouverture ou fermeture du mode createur */
export function setDemosCreateur(actif: boolean): void {
  if (createur === actif) return;
  createur = actif;
  prevenir();
}

export async function chargerSourceDemos(): Promise<SourceDemos> {
  try {
    const v = await AsyncStorage.getItem(CLE_SOURCE_DEMOS);
    if (v && (SOURCES_DEMOS as string[]).includes(v)) source = v as SourceDemos;
  } catch {
    // reste sur « aucune »
  }
  prevenir();
  return source;
}

export async function choisirSourceDemos(s: SourceDemos): Promise<void> {
  source = s;
  prevenir();
  try {
    await AsyncStorage.setItem(CLE_SOURCE_DEMOS, s);
  } catch {
    // le choix reste pour cette ouverture de l'app
  }
}

export const sourceSuivante = (s: SourceDemos): SourceDemos => SOURCES_DEMOS[(SOURCES_DEMOS.indexOf(s) + 1) % SOURCES_DEMOS.length];

export const NOMS_SOURCES: Record<SourceDemos, string> = {
  aucune: 'Aucune, comme le public',
  yoroi: 'Nos animations actuelles',
  photos: 'Photos, Free Exercise DB',
  dessins: 'Dessins, Everkinetic',
  repdb: 'Illustrations, RepDB',
  figures: 'Mannequin animé, muscles en rouge',
};

export const NOMBRE_PAR_SOURCE: Record<SourceEnLigne, number> = {
  photos: Object.keys(PHOTOS_FEDB).length,
  dessins: Object.keys(DESSINS_EK).length,
  repdb: Object.keys(DESSINS_REPDB).length,
  figures: Object.keys(FIGURES_OEF).length,
};
export const estEnLigne = (s: SourceDemos): s is SourceEnLigne => s === 'photos' || s === 'dessins' || s === 'repdb' || s === 'figures';

/** Les deux images en ligne d'un exercice (cle demoSlug), ou null */
export function demoEnLigne(s: SourceEnLigne, cle: string): ImageSourcePropType[] | null {
  if (s === 'figures') {
    // une seule image : un WebP deja anime
    const id = FIGURES_OEF[cle];
    return id ? [{ uri: `${RACINE_FIGURES}animations/${id}.webp` }] : null;
  }
  if (s === 'photos') {
    const id = PHOTOS_FEDB[cle];
    return id ? [{ uri: `${RACINE_PHOTOS}${id}/0.jpg` }, { uri: `${RACINE_PHOTOS}${id}/1.jpg` }] : null;
  }
  if (s === 'repdb') {
    const id = DESSINS_REPDB[cle];
    return id ? [{ uri: `${RACINE_REPDB}${id}-start.webp` }, { uri: `${RACINE_REPDB}${id}-peak.webp` }] : null;
  }
  const id = DESSINS_EK[cle];
  return id ? [{ uri: `${RACINE_DESSINS}${id}-relaxation.png` }, { uri: `${RACINE_DESSINS}${id}-tension.png` }] : null;
}

/** Re-rend un composant quand la source change */
export function useSourceDemos(): SourceDemos {
  const [s, setS] = useState<SourceDemos>(sourceDemosActive());
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DEMOS_CHANGEES, (v: SourceDemos) => setS(v));
    setS(sourceDemosActive());
    return () => sub.remove();
  }, []);
  return s;
}
