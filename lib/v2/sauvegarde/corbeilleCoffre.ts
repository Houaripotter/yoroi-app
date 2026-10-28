/**
 * Corbeille des listes du coffre (28 octobre 2026, audit « ne jamais perdre de donnees ») :
 * composition corporelle (@yoroi_body_composition) et anciennes mensurations (@yoroi_measurements),
 * rangees dans le coffre par lib/bodyComposition.ts. Un element supprime est garde 30 jours dans
 * @yoroi_corbeille_coffre et se remet tel quel : barre « Annuler » (un jour entier supprime d'un coup
 * se remet en un seul toucher, avec sa pesee et ses mensurations) et Corbeille (app/corbeille.tsx).
 * Verrous : jamais celui de la corbeille autour de celui d'une liste du coffre (pas d'interblocage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import secureStorage from '@/lib/security/secureStorage';
import { logger } from '@/lib/security/logger';
import { avecVerrou, lireListePourEcriture, listePourEcriture } from './lectureSure';

export const CLE_CORBEILLE_COFFRE = '@yoroi_corbeille_coffre';
export const EVENEMENT_COFFRE_SUPPRIME = 'YOROI_COFFRE_SUPPRIME';
export const CLES_COFFRE = { composition: '@yoroi_body_composition', mesures: '@yoroi_measurements' } as const;
export type GenreCoffre = keyof typeof CLES_COFFRE;
const JOURS = 30;

type Element = { id: string; date?: string } & Record<string, unknown>;
export type ElementCoffreEnCorbeille = { trashId: number; genre: GenreCoffre; item: Element; deleted_at: string };

let compteur = 0;
const nouvelId = () => Date.now() * 100 + (compteur++ % 100);

const lire = () => lireListePourEcriture<ElementCoffreEnCorbeille>(CLE_CORBEILLE_COFFRE);

export async function coffreDansLaCorbeille(): Promise<ElementCoffreEnCorbeille[]> {
  try {
    return [...(await lire())].sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1));
  } catch {
    return [];
  }
}

/** Range l'element a la corbeille (a faire AVANT de le retirer de sa liste). Erreur : rien n'a change. */
export async function mettreALaCorbeilleCoffre(genre: GenreCoffre, item: Element): Promise<ElementCoffreEnCorbeille> {
  return avecVerrou(CLE_CORBEILLE_COFFRE, async () => {
    const liste = await lire();
    const e: ElementCoffreEnCorbeille = { trashId: nouvelId(), genre, item, deleted_at: new Date().toISOString() };
    await AsyncStorage.setItem(CLE_CORBEILLE_COFFRE, JSON.stringify([...liste, e]));
    return e;
  });
}

export function annoncerCoffreSupprime(e: ElementCoffreEnCorbeille): void {
  try {
    DeviceEventEmitter.emit(EVENEMENT_COFFRE_SUPPRIME, { trashId: e.trashId, kind: e.genre });
  } catch {
    // reste 30 jours dans la corbeille
  }
}

async function retirer(trashId: number): Promise<void> {
  await avecVerrou(CLE_CORBEILLE_COFFRE, async () => {
    const liste = await lire();
    await AsyncStorage.setItem(CLE_CORBEILLE_COFFRE, JSON.stringify(liste.filter((x) => x.trashId !== trashId)));
  });
}

const enCours = new Set<number>();

/** Remet l'element dans sa liste du coffre. false : deja remis. */
export async function restaurerCoffre(trashId: number): Promise<boolean> {
  if (enCours.has(trashId)) return false;
  enCours.add(trashId);
  try {
    const e = (await lire()).find((x) => x.trashId === trashId);
    if (!e) return false;
    const cle = CLES_COFFRE[e.genre];
    await avecVerrou(cle, async () => {
      const liste = listePourEcriture<Element>(await secureStorage.getItemStrict(cle), cle);
      if (!liste.some((x) => x && x.id === e.item.id)) {
        if (!(await secureStorage.setItem(cle, [e.item, ...liste]))) throw new Error('liste du coffre non enregistree');
      }
    });
    await retirer(trashId);
    return true;
  } finally {
    enCours.delete(trashId);
  }
}

/** Efface pour de bon ce qui a plus de 30 jours (au lancement) */
export async function purgerCorbeilleCoffre(now = Date.now()): Promise<number> {
  try {
    return await avecVerrou(CLE_CORBEILLE_COFFRE, async () => {
      const liste = await lire();
      const limite = now - JOURS * 86400000;
      const reste = liste.filter((x) => new Date(x.deleted_at).getTime() >= limite);
      if (reste.length === liste.length) return 0;
      await AsyncStorage.setItem(CLE_CORBEILLE_COFFRE, JSON.stringify(reste));
      return liste.length - reste.length;
    });
  } catch (e) {
    logger.warn('[Corbeille coffre] nettoyage remis a plus tard', e);
    return 0;
  }
}

/** Suppression definitive demandee (categorie de l'ecran Confidentialite) */
export async function viderCorbeilleCoffre(): Promise<void> {
  await avecVerrou(CLE_CORBEILLE_COFFRE, () => AsyncStorage.removeItem(CLE_CORBEILLE_COFFRE));
}
