/**
 * Bilan automatique (16 octobre 2026) : le reglage (actif par defaut), les liens vers la page de bilan
 * et la demande de bilan pour ce qui arrive sans ecran (montre, widgets).
 * Les imports en masse (Apple Sante, Health Connect, photos de plusieurs pesees) ne demandent jamais
 * un bilan par mesure : au plus un seul resume.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import type { OrigineCorps } from './texte';

const KEY = 'yoroi_bilan_auto_v1';
export const BILAN_REGLAGE_EVENT = 'YOROI_BILAN_REGLAGE';
/** demande de bilan venue d'ailleurs que d'un ecran (montre) */
export const BILAN_DEMANDE_EVENT = 'YOROI_BILAN_DEMANDE';

let cache: boolean | undefined;

export async function lireBilanAuto(): Promise<boolean> {
  if (cache !== undefined) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw !== '0';
  } catch {
    cache = true;
  }
  return cache;
}

export async function ecrireBilanAuto(on: boolean): Promise<void> {
  cache = on;
  DeviceEventEmitter.emit(BILAN_REGLAGE_EVENT, on);
  try {
    await AsyncStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // le reglage reste en memoire pour cette session
  }
}

export type DemandeBilan = { type: 'corps'; date: string; origine: OrigineCorps } | { type: 'seance'; id: number; recues?: number };

/** Le lien de la page de bilan */
export function lienBilan(d: DemandeBilan): string {
  if (d.type === 'seance') return `/bilan?type=seance&id=${d.id}${d.recues && d.recues > 1 ? `&recues=${d.recues}` : ''}`;
  return `/bilan?type=corps&date=${d.date.slice(0, 10)}&origine=${d.origine}`;
}

/** Une mesure ou une seance arrivee sans ecran (montre) : la page de bilan s'ouvre si le reglage le permet */
export function demanderBilan(d: DemandeBilan): void {
  DeviceEventEmitter.emit(BILAN_DEMANDE_EVENT, d);
}

/**
 * Apres l'enregistrement d'une mesure : la page de bilan remplace l'ecran de saisie si le bilan
 * automatique est actif, sinon on revient en arriere comme avant.
 */
export async function apresMesure(router: { replace: (h: never) => void; back: () => void }, d: DemandeBilan): Promise<boolean> {
  const on = await lireBilanAuto();
  if (on) router.replace(lienBilan(d) as never);
  else router.back();
  return on;
}
