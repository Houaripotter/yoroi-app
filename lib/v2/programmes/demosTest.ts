/**
 * Animations de test, visibles uniquement en mode createur (26 octobre 2026, Houari : « au public on ne
 * laisse rien, seulement le nom des exercices ; moi et mon frere on teste en cachette jusqu'a l'achat »).
 * Une seule source gardee (Houari, 26 octobre 2026 : « supprime tout sauf Gym visual ») :
 * - gymvisual : GIF de Gym visual (corps anatomique, muscles en rouge), lus depuis github.com/hasaneyldrm/exercises-dataset.
 *   ATTENTION : propriete de Gym visual, test prive seulement. Pour le public, il faut acheter une licence chez Gym visual.
 * - flow : dessins blancs Flow (3 images SVG qui s'enchainent), github.com/ozansozuozgit/flow-exercise-dataset, CC0 annonce,
 *   dessins generes par intelligence artificielle, mouvements non verifies par un coach (Houari, 26 octobre 2026 : « je peux voir ce que ca donne »).
 * Les GIF sont telecharges seulement quand un exercice s'affiche (rien dans l'app livree).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { DESSINS_FLOW, GIFS_GV } from './demosTestCorrespondances';

export type SourceDemos = 'aucune' | 'gymvisual' | 'flow';
export const SOURCES_DEMOS: SourceDemos[] = ['aucune', 'gymvisual', 'flow'];
export const CLE_SOURCE_DEMOS = 'yoroi_studio_demos_v1';
export const DEMOS_CHANGEES = 'YOROI_DEMOS_CHANGEES';

/** Version figee par son commit : les fichiers ne bougent plus */
export const RACINE_GV = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/7455efae41b330c265e7cd4b78dfa848e7ce5ebd/';

export const RACINE_FLOW = 'https://raw.githubusercontent.com/ozansozuozgit/flow-exercise-dataset/961bb2739015da373daa43b960c28ee839fe93e6/';
/** Flow : images 0, 1, 2, 1 en boucle, 180 ms chacune (reglage du jeu de donnees) */
export const SEQUENCE_FLOW = [0, 1, 2, 1];
export const DUREE_IMAGE_FLOW = 180;

let createur = false;
let source: SourceDemos = 'aucune';

/** La source vraiment utilisee : toujours « aucune » hors mode createur */
export const sourceDemosActive = (): SourceDemos => (createur ? source : 'aucune');

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
    // les anciennes sources supprimees reviennent a « aucune »
    source = v === 'gymvisual' || v === 'flow' ? v : 'aucune';
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

export const NOMBRE_GV = Object.keys(GIFS_GV).length;
export const NOMBRE_FLOW = Object.keys(DESSINS_FLOW).length;

/** Les images d'un exercice (cle demoSlug) : un GIF Gym visual, ou les 3 dessins Flow ; null sinon */
export function demoEnLigne(cle: string, s: SourceDemos = 'gymvisual'): ImageSourcePropType[] | null {
  if (s === 'flow') {
    const id = DESSINS_FLOW[cle];
    return id ? [0, 1, 2].map((i) => ({ uri: `${RACINE_FLOW}assets/${id}/frame-0${i}.svg` })) : null;
  }
  // valeur : nom du fichier GIF sans extension (id-media)
  const f = GIFS_GV[cle];
  return f ? [{ uri: `${RACINE_GV}videos/${f}.gif` }] : null;
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
