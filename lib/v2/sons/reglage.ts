/**
 * 27 octobre 2026 (Houari) : un seul reglage pour couper tous les sons de l'app (badges, rangs, records, chronos).
 * Actif par defaut. Lu une fois au lancement puis garde en memoire : lib/sounds.ts et lib/soundManager.ts
 * le consultent avant chaque son, sans attendre. Les vibrations ne changent pas. La musique et l'ambiance
 * de la scene et les voix des visites gardent leurs propres boutons.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

export const SONS_KEY = 'yoroi_sons_app_v1';
export const SONS_REGLAGE_EVENT = 'YOROI_SONS_REGLAGE';

let cache: boolean | undefined;
let lecture: Promise<boolean> | null = null;

export function lireSonsActifs(): Promise<boolean> {
  if (cache !== undefined) return Promise.resolve(cache);
  if (!lecture) {
    lecture = (async () => {
      try {
        const raw = await AsyncStorage.getItem(SONS_KEY);
        if (cache === undefined) cache = raw !== '0';
      } catch {
        if (cache === undefined) cache = true;
      }
      return cache as boolean;
    })();
  }
  return lecture;
}

/** Lecture immediate pour les sons : vrai tant que le reglage n'est pas encore lu (par defaut, les sons sont actifs) */
export function sonsActifs(): boolean {
  if (cache === undefined) void lireSonsActifs();
  return cache !== false;
}

export async function ecrireSonsActifs(on: boolean): Promise<void> {
  cache = on;
  DeviceEventEmitter.emit(SONS_REGLAGE_EVENT, on);
  try {
    await AsyncStorage.setItem(SONS_KEY, on ? '1' : '0');
  } catch {
    // le reglage reste en memoire pour cette session
  }
}

// lu des le chargement du module, pour que le premier son respecte deja le reglage
void lireSonsActifs();
