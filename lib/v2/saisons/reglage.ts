/**
 * Reglage « Décorations de saison » (18 octobre 2026), active par defaut.
 * Il est dans Reglages, Personnaliser, Ton univers, sous le theme clair ou sombre (app/settings/style.tsx).
 * Coupe : aucune decoration de saison sur l'accueil (l'apercu force du Studio reste possible).
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLE_DECORATIONS_SAISON = 'yoroi.saisons.decorations';
/** Emis quand le reglage change (les widgets s'y abonnent : lib/v2/widgets/synchro.ts) */
export const DECORATIONS_SAISON_EVENT = 'YOROI_DECORATIONS_SAISON';
const EVENT = DECORATIONS_SAISON_EVENT;

let memo: boolean | null = null;

/** Tout sauf « off » vaut active : personne n'a encore de reglage, tout le monde part active */
export function decorationsPropre(v: unknown): boolean {
  return v !== 'off' && v !== false;
}

export async function lireDecorationsSaison(): Promise<boolean> {
  if (memo !== null) return memo;
  try {
    memo = decorationsPropre(await AsyncStorage.getItem(CLE_DECORATIONS_SAISON));
  } catch {
    memo = true;
  }
  return memo;
}

export async function ecrireDecorationsSaison(v: boolean): Promise<void> {
  memo = !!v;
  DeviceEventEmitter.emit(EVENT, memo);
  try {
    await AsyncStorage.setItem(CLE_DECORATIONS_SAISON, memo ? 'on' : 'off');
  } catch {
    // le choix reste valable pour la session
  }
}

export function useDecorationsSaison(): { active: boolean; changer: (v: boolean) => void } {
  const [active, setActive] = useState<boolean>(memo ?? true);
  useEffect(() => {
    let vivant = true;
    lireDecorationsSaison().then((v) => vivant && setActive(v));
    const sub = DeviceEventEmitter.addListener(EVENT, (v: boolean) => setActive(v));
    return () => {
      vivant = false;
      sub.remove();
    };
  }, []);
  const changer = useCallback((v: boolean) => {
    setActive(!!v);
    ecrireDecorationsSaison(v);
  }, []);
  return { active, changer };
}
