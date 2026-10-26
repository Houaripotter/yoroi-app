/**
 * Animations de test, visibles uniquement en mode createur (26 octobre 2026, Houari : « au public on ne
 * laisse rien, seulement le nom des exercices ; moi et mon frere on teste en cachette jusqu'a l'achat »).
 * Une seule source gardee (Houari, 26 octobre 2026 : « supprime tout sauf Gym visual ») :
 * - gymvisual : GIF de Gym visual (corps anatomique, muscles en rouge), lus depuis github.com/hasaneyldrm/exercises-dataset.
 *   ATTENTION : propriete de Gym visual, test prive seulement. Pour le public, il faut acheter une licence chez Gym visual.
 * Les GIF sont telecharges seulement quand un exercice s'affiche (rien dans l'app livree).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { GIFS_GV } from './demosTestCorrespondances';

export type SourceDemos = 'aucune' | 'gymvisual';
export const SOURCES_DEMOS: SourceDemos[] = ['aucune', 'gymvisual'];
export const CLE_SOURCE_DEMOS = 'yoroi_studio_demos_v1';
export const DEMOS_CHANGEES = 'YOROI_DEMOS_CHANGEES';

/** Version figee par son commit : les fichiers ne bougent plus */
export const RACINE_GV = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/7455efae41b330c265e7cd4b78dfa848e7ce5ebd/';

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
    source = v === 'gymvisual' ? 'gymvisual' : 'aucune';
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

export const sourceSuivante = (s: SourceDemos): SourceDemos => (s === 'aucune' ? 'gymvisual' : 'aucune');

export const NOMBRE_GV = Object.keys(GIFS_GV).length;

/** Le GIF d'un exercice (cle demoSlug), ou null */
export function demoEnLigne(cle: string): ImageSourcePropType[] | null {
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
