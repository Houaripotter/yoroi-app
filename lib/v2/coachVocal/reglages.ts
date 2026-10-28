/**
 * Coach vocal : le réglage Off, Discret ou Motivant (AsyncStorage `yoroi_coach_vocal_v1`).
 *
 * Valeur par défaut, décidée une fois puis enregistrée :
 *  - tant qu'aucun fichier audio n'est branché (sons.ts vide) : off, et rien n'est enregistré (la décision
 *    sera prise le jour où les voix arrivent) ;
 *  - avec des fichiers : discret pour une nouvelle installation (aucune séance enregistrée), off pour les
 *    utilisateurs qui ont déjà des séances (pas de voix surprise dans leurs écouteurs après une mise à jour).
 * Tu le changes dans l'en-tête de la séance en direct ou dans Réglages.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { useEffect, useState } from 'react';
import type { NiveauCoach } from './moteur';
import { nombreDeFichiers } from './sons';

export const COACH_VOCAL_KEY = 'yoroi_coach_vocal_v1';
export const COACH_VOCAL_EVENT = 'YOROI_COACH_VOCAL';
export const NIVEAUX: readonly NiveauCoach[] = ['off', 'discret', 'motivant'];

export function estNiveau(v: unknown): v is NiveauCoach {
  return v === 'off' || v === 'discret' || v === 'motivant';
}

/** Valeur par défaut (pure) : null = ne rien enregistrer, garder off pour l'instant */
export function niveauParDefaut(fichiers: number, dejaDesSeances: boolean): { niveau: NiveauCoach; enregistrer: boolean } {
  if (fichiers <= 0) return { niveau: 'off', enregistrer: false };
  return { niveau: dejaDesSeances ? 'off' : 'discret', enregistrer: true };
}

/** Niveau suivant, pour une ligne qui change à chaque appui */
export function niveauSuivant(n: NiveauCoach): NiveauCoach {
  return NIVEAUX[(NIVEAUX.indexOf(n) + 1) % NIVEAUX.length];
}

let cache: NiveauCoach | undefined;
let lecture: Promise<NiveauCoach> | null = null;

async function aDesSeances(): Promise<boolean> {
  try {
    const { getTrainings } = await import('@/lib/database');
    const t = await getTrainings();
    return Array.isArray(t) && t.length > 0;
  } catch {
    // dans le doute, pas de voix surprise
    return true;
  }
}

export function lireNiveauCoach(): Promise<NiveauCoach> {
  if (cache !== undefined) return Promise.resolve(cache);
  if (!lecture) {
    lecture = (async () => {
      let n: NiveauCoach = 'off';
      try {
        const raw = await AsyncStorage.getItem(COACH_VOCAL_KEY);
        if (estNiveau(raw)) n = raw;
        else {
          const fichiers = nombreDeFichiers();
          const d = niveauParDefaut(fichiers, fichiers > 0 ? await aDesSeances() : true);
          n = d.niveau;
          if (d.enregistrer) await AsyncStorage.setItem(COACH_VOCAL_KEY, n).catch(() => undefined);
        }
      } catch {
        n = 'off';
      }
      if (cache === undefined) cache = n;
      lecture = null;
      return cache as NiveauCoach;
    })();
  }
  return lecture;
}

/** Lecture immédiate : off tant que le réglage n'est pas lu */
export function niveauCoach(): NiveauCoach {
  if (cache === undefined) void lireNiveauCoach();
  return cache ?? 'off';
}

export async function ecrireNiveauCoach(n: NiveauCoach): Promise<void> {
  cache = n;
  DeviceEventEmitter.emit(COACH_VOCAL_EVENT, n);
  try {
    await AsyncStorage.setItem(COACH_VOCAL_KEY, n);
  } catch {
    // le réglage reste en mémoire pour cette session
  }
}

/** Le réglage, à jour quand il change ailleurs (en-tête de séance, Réglages) */
export function useNiveauCoach(): [NiveauCoach, (n: NiveauCoach) => void] {
  const [n, setN] = useState<NiveauCoach>(cache ?? 'off');
  useEffect(() => {
    let vivant = true;
    lireNiveauCoach().then((v) => { if (vivant) setN(v); }, () => undefined);
    const sub = DeviceEventEmitter.addListener(COACH_VOCAL_EVENT, (v: unknown) => { if (estNiveau(v)) setN(v); });
    return () => { vivant = false; sub.remove(); };
  }, []);
  return [n, (v: NiveauCoach) => { setN(v); void ecrireNiveauCoach(v); }];
}
