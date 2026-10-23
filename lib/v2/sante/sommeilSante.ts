/**
 * Nuit notee a la main vers Apple Santé ou Health Connect, une seule fois par nuit (audit du 18 octobre 2026).
 * Avant, corriger une nuit deja notee (meme date) ecrivait une deuxieme nuit dans Santé : sommeil en double.
 * L'API d'ecriture actuelle (writeSleepData) ne sait ni modifier ni remplacer une nuit : on n'ecrit donc
 * que la premiere saisie d'une nuit, jamais une correction. La nuit de Santé garde ses premiers horaires.
 * Teste dans __tests__/unit/sommeilSante.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLE_NUITS_ECRITES_SANTE = '@yoroi_nuits_ecrites_sante_v1';

/** Ecrire dans Santé seulement une nuit nouvelle : ni deja notee dans YOROI, ni deja envoyee */
export function doitEcrireNuitSante(e: { dejaNoteeDansYoroi: boolean; dejaEcriteDansSante: boolean }): boolean {
  return !e.dejaNoteeDansYoroi && !e.dejaEcriteDansSante;
}

async function lire(): Promise<string[]> {
  try {
    const brut = await AsyncStorage.getItem(CLE_NUITS_ECRITES_SANTE);
    const l = brut ? JSON.parse(brut) : [];
    return Array.isArray(l) ? l.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function nuitDejaEcriteSante(date: string): Promise<boolean> {
  return (await lire()).includes(date.slice(0, 10));
}

/** Retient la date d'une nuit envoyee (les 400 plus recentes) */
export async function retenirNuitEcriteSante(date: string): Promise<void> {
  try {
    const l = await lire();
    const d = date.slice(0, 10);
    if (l.includes(d)) return;
    await AsyncStorage.setItem(CLE_NUITS_ECRITES_SANTE, JSON.stringify([...l, d].slice(-400)));
  } catch {
    // non bloquant
  }
}
