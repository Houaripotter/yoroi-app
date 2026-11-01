/**
 * 1er novembre 2026 (audit de performance, valide par Houari) : une seule lecture de l'historique des seances,
 * partagee entre les ecrans qui le lisent en entier (Accueil, Seances, Progres...).
 *
 * Avant : apres un enregistrement, 10 a 12 lectures completes de la table partaient en meme temps, chacune
 * relisait et decodait les exercices de toutes les seances. Maintenant la premiere lecture est partagee avec
 * celles qui arrivent pendant qu'elle tourne, puis gardee tant que la base n'a pas change.
 *
 * Invalidation, sans toucher lib/database*.ts :
 * - jeton de la base, relu a chaque appel (deux requetes de quelques microsecondes) : total_changes() compte
 *   chaque ecriture faite par l'app (seance, pesee, import, synchro...), PRAGMA data_version compte celles
 *   d'une autre connexion, et l'identite de la base distingue la vraie base de la vitrine de la visite ;
 * - et l'evenement YOROI_DATA_CHANGED, par prudence.
 * Si le jeton ne peut pas etre lu (web, tests avec une base simulee), on relit comme avant, sans cache.
 *
 * Chaque appelant recoit sa propre copie du tableau : il peut le trier ou le filtrer sans gener les autres.
 * Les objets seance sont partages : ne pas les modifier (aucun appelant ne le fait au 1er novembre 2026).
 */
import { DeviceEventEmitter } from 'react-native';
import { getTrainings, openDatabase } from '@/lib/database';
import type { Training } from '@/lib/database';

/** Meme valeur que DATA_CHANGED_EVENT (lib/v2/useWeightData), ecrite ici pour ne pas importer un hook */
const DONNEES_CHANGEES = 'YOROI_DATA_CHANGED';

type Entree = { jeton: string; generation: number; promesse: Promise<Training[]> };

let cache: Entree | null = null;
let generation = 0;
let actifEnTest = false;
const idsBases = new WeakMap<object, number>();
let prochainId = 1;

/** Oublie la lecture gardee : la prochaine lecture repart de la base */
export function invaliderSeances(): void {
  generation += 1;
  cache = null;
}

try {
  DeviceEventEmitter.addListener(DONNEES_CHANGEES, invaliderSeances);
} catch {
  // environnement sans emetteur : le jeton de la base suffit
}

function cacheActif(): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') return actifEnTest;
  return true;
}

/** Jeton qui change a chaque ecriture dans la base. null si on ne peut pas le lire. */
async function lireJeton(): Promise<string | null> {
  try {
    if (typeof openDatabase !== 'function') return null;
    const base = (await openDatabase()) as unknown as {
      getFirstAsync?: <T>(sql: string) => Promise<T | null>;
    } | null;
    if (!base || typeof base.getFirstAsync !== 'function') return null;
    let id = idsBases.get(base);
    if (id === undefined) {
      id = prochainId++;
      idsBases.set(base, id);
    }
    const ecritures = await base.getFirstAsync<{ c: number }>('SELECT total_changes() AS c');
    const version = await base.getFirstAsync<{ data_version: number }>('PRAGMA data_version');
    if (!ecritures || typeof ecritures.c !== 'number') return null;
    return `${id}:${ecritures.c}:${version?.data_version ?? 'x'}`;
  } catch {
    return null;
  }
}

/** Tout l'historique des seances, comme getTrainings(), lu une seule fois tant que rien ne change */
export async function lireSeances(): Promise<Training[]> {
  if (!cacheActif()) return getTrainings();
  const generationAvant = generation;
  const jeton = await lireJeton();
  if (jeton === null) return getTrainings();
  if (cache && cache.jeton === jeton && cache.generation === generation) {
    const liste = await cache.promesse;
    return liste.slice();
  }
  const promesse = getTrainings().then((l) => l ?? []);
  // une invalidation arrivee pendant la lecture du jeton : on lit quand meme, mais on ne garde pas
  const entree: Entree = { jeton, generation: generationAvant, promesse };
  if (generationAvant === generation) cache = entree;
  promesse.catch(() => {
    if (cache === entree) cache = null;
  });
  const liste = await promesse;
  return liste.slice();
}

/** Tests seulement : active le cache sous Jest (desactive par defaut pour ne pas gener les autres tests) */
export function _activerCacheEnTest(actif: boolean): void {
  actifEnTest = actif;
  invaliderSeances();
}
