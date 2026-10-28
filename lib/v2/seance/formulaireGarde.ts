/**
 * Saisies en cours gardées sur le téléphone (28 octobre 2026, audit « ne jamais perdre de données ») :
 * séance déjà faite (app/seance/deja-faite.tsx), saisie dictée (app/quick-log.tsx). App fermée par le système
 * pendant que tu tapais : à la réouverture, l'écran propose de reprendre.
 *
 * Écrit 400 ms après le dernier changement, tout de suite au passage en arrière plan et à la fermeture de
 * l'écran ; une écriture à la fois, la dernière gagne ; rien n'est écrit après l'effacement (enregistrée ou
 * abandonnée). Gardée 7 jours.
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIXE = 'yoroi_formulaire_v1:';
export const FORMULAIRE_MAX_MS = 7 * 24 * 3600 * 1000;

type Garde<T> = { valeur: T; savedAt: number };

let file: Promise<unknown> = Promise.resolve();
const generations = new Map<string, number>();
const gen = (cle: string) => generations.get(cle) ?? 0;

function enFile<T>(fn: () => Promise<T>): Promise<T> {
  const p = file.then(fn, fn);
  file = p.catch(() => undefined);
  return p;
}

export function generationFormulaire(cle: string): number {
  return gen(cle);
}

export function garderFormulaire<T>(cle: string, valeur: T, g: number = gen(cle)): Promise<void> {
  return enFile(async () => {
    if (g !== gen(cle)) return;
    try {
      await AsyncStorage.setItem(PREFIXE + cle, JSON.stringify({ valeur, savedAt: Date.now() } satisfies Garde<T>));
    } catch {
      // la saisie continue en mémoire
    }
  });
}

export async function lireFormulaire<T>(cle: string): Promise<{ valeur: T; savedAt: number } | null> {
  await file.catch(() => undefined);
  try {
    const raw = await AsyncStorage.getItem(PREFIXE + cle);
    if (!raw) return null;
    const v = JSON.parse(raw) as Garde<T>;
    if (!v || typeof v !== 'object' || !('valeur' in v) || Date.now() - (v.savedAt ?? 0) > FORMULAIRE_MAX_MS) return null;
    return v;
  } catch {
    return null;
  }
}

export function effacerFormulaire(cle: string): Promise<void> {
  generations.set(cle, gen(cle) + 1);
  return enFile(async () => {
    try {
      await AsyncStorage.removeItem(PREFIXE + cle);
    } catch {
      // rien
    }
  });
}

/**
 * Garde `valeur` tant que `actif` est vrai. La génération est relevée à l'activation : après un effacement
 * (enregistrement), les écritures en retard de cet écran sont ignorées.
 */
export function useFormulaireGarde<T>(cle: string, valeur: T, actif: boolean): void {
  const dernier = useRef(valeur);
  dernier.current = valeur;
  const actifRef = useRef(actif);
  actifRef.current = actif;
  const g = useRef<number | null>(null);
  if (actif && g.current === null) g.current = gen(cle);
  if (!actif) g.current = null;
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ecrire = () => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    if (!actifRef.current || g.current === null) return;
    void garderFormulaire(cle, dernier.current, g.current);
  };
  const ecrireRef = useRef(ecrire);
  ecrireRef.current = ecrire;

  useEffect(() => {
    if (!actif) return;
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => ecrireRef.current(), 400);
  }, [valeur, actif]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') ecrireRef.current();
    });
    return () => {
      sub.remove();
      ecrireRef.current();
    };
  }, []);
}
