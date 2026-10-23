/**
 * Eau vers Apple Santé, un verre une seule fois.
 * - ajout avec un id (action de la montre ou d'un widget) : écrit avec HKMetadataKeyExternalUUID = id,
 *   jamais deux fois le même id ; sans id (écrans de l'iPhone) : écrit la différence seulement ;
 * - retrait : supprime un verre écrit par YOROI ce jour-là ; si c'est impossible (verre écrit par une autre app,
 *   droit refusé, ancien binaire), une note est gardée (NOTES_EAU_SANTE_KEY) : Apple Santé n'accepte pas de quantité négative.
 * Les verres que la montre a déjà écrits (dansSante) n'arrivent jamais ici.
 * Android : même règle vers Health Connect (eauHealthConnect.ts, clientRecordId par verre).
 * Teste dans __tests__/unit/eauSante.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '@/lib/security/logger';
import * as HK from '@/lib/yoroiHealthKit';
import { ecrireVerreHC, retirerVerreHC } from '@/lib/v2/sante/eauHealthConnect';

export type ResultatEauSante = 'ecrit' | 'retire' | 'note' | 'rien';
/** false : ne pas toucher à Apple Santé (déjà fait ailleurs, par la montre) */
export type EauVersSante = false | { id?: string; date?: Date };

export const NOTES_EAU_SANTE_KEY = '@yoroi_eau_sante_notes';
export type NoteEauSante = { date: string; ml: number };

async function noter(ml: number, date: Date): Promise<void> {
  logger.info(`[Eau] ${ml} ml retirés dans YOROI mais pas dans Apple Santé ou Health Connect`);
  try {
    const brut = await AsyncStorage.getItem(NOTES_EAU_SANTE_KEY);
    const liste: NoteEauSante[] = brut ? JSON.parse(brut) : [];
    const suite = [...(Array.isArray(liste) ? liste : []), { date: date.toISOString(), ml }].slice(-50);
    await AsyncStorage.setItem(NOTES_EAU_SANTE_KEY, JSON.stringify(suite));
  } catch {
    // non bloquant
  }
}

/** Notes des retraits qu'Apple Santé n'a pas pu suivre (les plus récentes en dernier) */
export async function lireNotesEauSante(): Promise<NoteEauSante[]> {
  try {
    const brut = await AsyncStorage.getItem(NOTES_EAU_SANTE_KEY);
    const l = brut ? JSON.parse(brut) : [];
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
}

/** Android : le même changement vers Health Connect */
async function ecrireDeltaEauHC(ml: number, opts: { id?: string; date?: Date }): Promise<ResultatEauSante> {
  const date = opts.date ?? new Date();
  if (ml > 0) return (await ecrireVerreHC(ml, opts.id, date)) ? 'ecrit' : 'rien';
  const r = await retirerVerreHC(-ml, date);
  if (r === true) return 'retire';
  if (r === null) return 'rien';
  await noter(-ml, date);
  return 'note';
}

/** Reporte dans Apple Santé (iOS) ou Health Connect (Android) un changement d'eau de deltaMl (positif : verre ajouté, négatif : retiré). */
export async function ecrireDeltaEauSante(deltaMl: number, opts: { id?: string; date?: Date } = {}): Promise<ResultatEauSante> {
  const ml = Math.round(deltaMl);
  if (!Number.isFinite(ml) || ml === 0) return 'rien';
  if (Platform?.OS === 'android') return ecrireDeltaEauHC(ml, opts);
  if (Platform?.OS && Platform.OS !== 'ios') return 'rien';
  const date = opts.date ?? new Date();
  if (ml > 0) {
    if (opts.id && typeof HK.saveDietaryWaterAvecIdNative === 'function') {
      const r = await HK.saveDietaryWaterAvecIdNative(ml, opts.id, date);
      if (r !== null) return r ? 'ecrit' : 'rien';
    }
    // binaire sans la nouvelle méthode : écriture simple de la différence
    if (typeof HK.saveDietaryWaterNative === 'function') return (await HK.saveDietaryWaterNative(ml)) ? 'ecrit' : 'rien';
    return 'rien';
  }
  const r = typeof HK.retirerEauNative === 'function' ? await HK.retirerEauNative(-ml, date) : null;
  if (r === true) return 'retire';
  await noter(-ml, date);
  return 'note';
}
