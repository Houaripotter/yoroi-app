/**
 * Vitesse de la voix des visites (18 octobre 2026), Houari : « un bouton 1x / 2x ».
 * Une seule vitesse pour la visite guidee et la visite du Dojo, gardee entre les etapes et entre les lancements.
 * La hauteur de la voix est corrigee (shouldCorrectPitch, qualite haute) : plus rapide, mais pas plus aigue.
 */
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AudioPlayer } from 'expo-audio';
import { DECIMAL } from '@/lib/i18n/tr';

/** Commence par @yoroi_visite_ : gardee pour de vrai, meme pendant l'exemple */
export const CLE_VITESSE_VOIX = '@yoroi_visite_vitesse_voix';
export const VITESSES = [1, 1.5, 2] as const;
export type Vitesse = (typeof VITESSES)[number];
const EVENT = 'YOROI_VISITE_VITESSE';

let courante: Vitesse = 1;
let lue = false;

export function normaliserVitesse(v: unknown): Vitesse {
  const n = Number(v);
  return (VITESSES as readonly number[]).includes(n) ? (n as Vitesse) : 1;
}

/** 1 → 1,5 → 2 → 1 */
export function vitesseSuivante(v: Vitesse): Vitesse {
  const i = VITESSES.indexOf(v);
  return VITESSES[(i + 1) % VITESSES.length];
}

/** « 1x », « 1,5x », « 2x » */
export function libelleVitesse(v: Vitesse): string {
  return `${String(v).replace('.', DECIMAL)}x`;
}

export function vitesseCourante(): Vitesse {
  return courante;
}

export async function lireVitesse(): Promise<Vitesse> {
  try {
    courante = normaliserVitesse(await AsyncStorage.getItem(CLE_VITESSE_VOIX));
  } catch {
    // 1x
  }
  lue = true;
  return courante;
}

export async function choisirVitesse(v: Vitesse): Promise<void> {
  courante = normaliserVitesse(v);
  DeviceEventEmitter.emit(EVENT, courante);
  try {
    await AsyncStorage.setItem(CLE_VITESSE_VOIX, String(courante));
  } catch {
    // gardee pour ce lancement
  }
}

/** Applique la vitesse a un lecteur (expo-audio), sans voix aigue */
export function appliquerVitesse(p: AudioPlayer | null | undefined, v: Vitesse = courante): void {
  if (!p) return;
  try {
    p.shouldCorrectPitch = true;
    p.setPlaybackRate(v, 'high');
  } catch {
    // lecteur deja libere
  }
}

/** La vitesse, a jour partout (visite guidee et Dojo) */
export function useVitesseVoix(): [Vitesse, () => void] {
  const [v, setV] = useState<Vitesse>(courante);
  useEffect(() => {
    if (!lue) lireVitesse().then(setV).catch(() => undefined);
    const sub = DeviceEventEmitter.addListener(EVENT, (n: Vitesse) => setV(n));
    return () => sub.remove();
  }, []);
  const suivante = () => {
    void choisirVitesse(vitesseSuivante(courante));
  };
  return [v, suivante];
}
