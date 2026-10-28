/**
 * Lecture sure avant une ecriture (28 octobre 2026, audit « ne jamais perdre de donnees »).
 *
 * Le piege : une liste est lue, la lecture echoue (valeur abimee, valeur trop grosse sur Android,
 * coffre verrouille), le code renvoie [] « pour ne pas planter »... puis ajoute la nouvelle entree
 * et reecrit [nouvelle entree] par dessus tout l'historique.
 *
 * Ici :
 * - listePourEcriture / objetPourEcriture : null ou vide donne une liste (ou un objet) vide, mais une
 *   valeur presente et illisible LANCE une erreur. L'ecriture est alors abandonnee, rien n'est perdu ;
 * - mettreDeCote : la valeur illisible est recopiee une fois sous <cle>__illisible pour pouvoir la reprendre ;
 * - avecVerrou : les lectures puis ecritures d'une meme cle passent une par une (deux ajouts rapproches,
 *   ou une synchro Sante pendant une saisie, ne s'ecrasent plus l'un l'autre).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';

export class LectureIllisible extends Error {
  readonly cle: string;
  constructor(cle: string, detail?: string) {
    super(`Valeur illisible pour ${cle}${detail ? ` (${detail})` : ''} : ecriture abandonnee pour ne rien perdre`);
    this.name = 'LectureIllisible';
    this.cle = cle;
  }
}

export const CLE_MISE_DE_COTE = (cle: string) => `${cle}__illisible`;

/** Recopie une valeur illisible a cote (une seule fois : la premiere copie, la plus ancienne, est gardee) */
export async function mettreDeCote(cle: string, brut: string): Promise<void> {
  try {
    const dest = CLE_MISE_DE_COTE(cle);
    if ((await AsyncStorage.getItem(dest)) != null) return;
    await AsyncStorage.setItem(dest, brut);
    logger.warn(`[LectureSure] valeur illisible de ${cle} mise de cote sous ${dest}`);
  } catch {
    // jamais bloquant
  }
}

/**
 * Texte stocke -> liste, pour une ecriture. Vide ou absent : []. Deja une liste (coffre deja decode) : telle quelle.
 * Present mais pas une liste valide : erreur LectureIllisible (et copie mise de cote si c'est du texte).
 */
export function listePourEcriture<T>(brut: unknown, cle: string): T[] {
  if (brut == null || brut === '') return [];
  if (Array.isArray(brut)) return brut as T[];
  if (typeof brut === 'string') {
    let v: unknown;
    try {
      v = JSON.parse(brut);
    } catch {
      void mettreDeCote(cle, brut);
      throw new LectureIllisible(cle, 'texte abime');
    }
    if (v == null) return [];
    if (Array.isArray(v)) return v as T[];
    void mettreDeCote(cle, brut);
    throw new LectureIllisible(cle, 'pas une liste');
  }
  throw new LectureIllisible(cle, typeof brut);
}

/** Meme regle pour un objet (reglages) : absent -> null, present mais pas un objet -> erreur */
export function objetPourEcriture<T extends object>(brut: unknown, cle: string): T | null {
  if (brut == null || brut === '') return null;
  if (typeof brut === 'object' && !Array.isArray(brut)) return brut as T;
  if (typeof brut === 'string') {
    let v: unknown;
    try {
      v = JSON.parse(brut);
    } catch {
      void mettreDeCote(cle, brut);
      throw new LectureIllisible(cle, 'texte abime');
    }
    if (v == null) return null;
    if (typeof v === 'object' && !Array.isArray(v)) return v as T;
  }
  if (typeof brut === 'string') void mettreDeCote(cle, brut);
  throw new LectureIllisible(cle, 'pas un objet');
}

/** Lit une liste AsyncStorage pour la reecrire : une lecture ratee LANCE (jamais [] par defaut) */
export async function lireListePourEcriture<T>(cle: string): Promise<T[]> {
  const brut = await AsyncStorage.getItem(cle);
  return listePourEcriture<T>(brut, cle);
}

const files = new Map<string, Promise<unknown>>();

/** Les operations sur une meme cle passent l'une apres l'autre, dans l'ordre d'arrivee */
export function avecVerrou<T>(cle: string, fn: () => Promise<T>): Promise<T> {
  const avant = files.get(cle) ?? Promise.resolve();
  const p = avant.then(fn, fn);
  const suite = p.catch(() => undefined);
  files.set(cle, suite);
  void suite.then(() => {
    if (files.get(cle) === suite) files.delete(cle);
  });
  return p;
}
