/**
 * Petites listes du corps gardees dans AsyncStorage (1er novembre 2026, demandes AT et AU) :
 * contexte des pesees, mensurations en plus, forme du matin, biomarqueurs, plis cutanes.
 * Memes garanties que le sac des mesures (./stockage.ts) :
 * - lecture sure avant ecriture (lib/v2/sauvegarde/lectureSure.ts) : une valeur illisible n'est jamais ecrasee ;
 * - une ecriture a la fois par cle (avecVerrou) ;
 * - synchronisees par element (lib/v2/synchro/cles.ts, idChamp id) et sauvegardees avec toutes les cles de l'app.
 * Une ecriture previent les ecrans ouverts (YOROI_DATA_CHANGED) et la synchro.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { logger } from '@/lib/security/logger';
import { avecVerrou, lireListePourEcriture } from '@/lib/v2/sauvegarde/lectureSure';
import { signalerASynchroniser } from '@/lib/v2/synchro/cles';

export const EVENEMENT_CORPS = 'YOROI_DATA_CHANGED';

/** La liste gardee sous cette cle, filtree par valide ; [] si rien ou si la valeur est illisible (elle n'est pas touchee) */
export async function lireListe<T>(cle: string, valide: (x: unknown) => x is T): Promise<T[]> {
  try {
    const brut = await AsyncStorage.getItem(cle);
    if (!brut) return [];
    const l = JSON.parse(brut) as unknown;
    return Array.isArray(l) ? l.filter(valide) : [];
  } catch (e) {
    logger.warn(`[Corps] lecture impossible (${cle})`, e);
    return [];
  }
}

/**
 * Modifie la liste : changer recoit la liste actuelle et rend la nouvelle (ou la meme pour ne rien ecrire).
 * Ne lance jamais : un echec est journalise et rend false.
 */
export async function modifierListe<T>(cle: string, changer: (avant: T[]) => T[]): Promise<boolean> {
  try {
    const ecrit = await avecVerrou(cle, async () => {
      const avant = await lireListePourEcriture<T>(cle);
      const apres = changer(avant);
      if (apres === avant) return false;
      await AsyncStorage.setItem(cle, JSON.stringify(apres));
      return true;
    });
    if (ecrit) {
      try { DeviceEventEmitter.emit(EVENEMENT_CORPS); } catch { /* sans ecran ouvert */ }
      signalerASynchroniser();
    }
    return ecrit;
  } catch (e) {
    logger.warn(`[Corps] enregistrement impossible (${cle})`, e);
    return false;
  }
}

/** Remplace ou ajoute chaque element par son id, sans rien retirer d'autre */
export function remplacerParId<T extends { id: string }>(liste: T[], nouveaux: T[], fusion?: (ancien: T, nouveau: T) => T): T[] {
  if (!nouveaux.length) return liste;
  const out = [...liste];
  let change = false;
  for (const n of nouveaux) {
    const i = out.findIndex((x) => x && x.id === n.id);
    if (i < 0) {
      out.push(n);
      change = true;
    } else {
      const f = fusion ? fusion(out[i], n) : n;
      if (JSON.stringify(f) !== JSON.stringify(out[i])) {
        out[i] = f;
        change = true;
      }
    }
  }
  return change ? out : liste;
}

/** Date locale AAAA-MM-JJ */
export function jourLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Heure locale HH:MM */
export function heureLocale(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Nombre fini, ou undefined (accepte la virgule) */
export function nombre(x: unknown): number | undefined {
  if (typeof x === 'number') return Number.isFinite(x) ? x : undefined;
  if (typeof x !== 'string') return undefined;
  const n = Number(x.replace(',', '.').replace(/\s+/g, ''));
  return x.trim() && Number.isFinite(n) ? n : undefined;
}
