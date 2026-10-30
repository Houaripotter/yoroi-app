/**
 * Les grosses donnees du coffre passent dans une base SQLite (28 octobre 2026).
 *
 * Le coffre du telephone (SecureStore, trousseau iOS) est fait pour de petits secrets : au dela d'environ 2 Ko par
 * valeur, Expo previent que l'ecriture peut echouer. Or tes mensurations, blessures, nuits, humeur, compositions et
 * jeunes y etaient rangees en une seule liste qui grossit avec les annees.
 *
 * Ces listes vont maintenant dans une petite base a part (FICHIER_COFFRE, table donnees_protegees), a cote de la
 * base de l'app et protegee comme elle par le chiffrement des fichiers de l'iPhone (la base de l'app n'est pas
 * chiffree en plus, celle ci non plus). Le coffre garde seulement les petits secrets (paires d'appareils, jetons,
 * mot de passe de la sauvegarde, reglages courts).
 *
 * Migration sure, cle par cle, la premiere fois que la valeur est lue :
 *  1. la valeur du coffre est ecrite dans la base, etat « copie » ;
 *  2. elle est relue et comparee : seulement si elle est identique, l'etat passe a « migre » ;
 *  3. seulement ensuite elle est retiree du coffre.
 * L'app tuee entre deux etapes : « copie » ne fait jamais foi, la lecture retombe sur le coffre et la migration
 * recommence ; « migre » avec encore une valeur dans le coffre : le coffre est vide a la lecture suivante.
 * Base indisponible (tests, web, erreur) : tout continue dans le coffre, comme avant.
 *
 * Une base a part et non la base de l'app : sa lecture ne depend pas de l'ouverture de la base de l'app (qui lit
 * elle meme ces listes pendant ses migrations, lib/databaseReprisePesees.ts). Teste dans
 * __tests__/unit/migrationCoffre.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import logger from '@/lib/security/logger';

export const FICHIER_COFFRE = 'yoroi_donnees_protegees.db';

/** Les listes qui grossissent : elles quittent le coffre */
export const CLES_VOLUMINEUSES = [
  '@yoroi_measurements', '@yoroi_injuries', '@yoroi_sleep_entries', '@yoroi_mood_log', '@yoroi_body_composition',
  '@yoroi_fasting_history',
] as const;

const VOLUMINEUSES = new Set<string>(CLES_VOLUMINEUSES);

/** Meme nettoyage du nom que lib/security/secureStorage.ts */
export const nomCoffre = (cle: string) => cle.replace(/[^a-zA-Z0-9._-]/g, '_');
const CLE_PAR_NOM = new Map(CLES_VOLUMINEUSES.map((c) => [nomCoffre(c), c as string]));

export const estVolumineuse = (cle: string): boolean => Platform.OS !== 'web' && VOLUMINEUSES.has(cle);

type Base = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
};

let ouverture: Promise<Base | null> | null = null;
let echecA = 0;
let baseDeTest: Base | null | undefined;

const SCHEMA = `CREATE TABLE IF NOT EXISTS donnees_protegees (
  cle TEXT PRIMARY KEY NOT NULL,
  valeur TEXT,
  etat TEXT NOT NULL,
  modifie_le INTEGER NOT NULL
);`;

async function base(): Promise<Base | null> {
  if (baseDeTest !== undefined) return baseDeTest;
  if (ouverture) return ouverture;
  // apres un echec, nouvel essai au plus tot 30 secondes plus tard (pas a chaque lecture)
  if (Date.now() - echecA < 30_000) return null;
  ouverture = (async () => {
    const db = (await SQLite.openDatabaseAsync(FICHIER_COFFRE)) as unknown as Base | undefined;
    if (!db || typeof db.execAsync !== 'function') throw new Error('base indisponible');
    await db.execAsync(SCHEMA);
    return db;
  })().catch((e) => {
    ouverture = null;
    echecA = Date.now();
    logger.warn('[Coffre] base des donnees protegees indisponible, le coffre reste utilise', e);
    return null;
  });
  return ouverture;
}

type Ligne = { valeur: string | null; etat: string };

async function ligne(db: Base, cle: string): Promise<Ligne | null> {
  return db.getFirstAsync<Ligne>('SELECT valeur, etat FROM donnees_protegees WHERE cle = ?', [cle]);
}

/** Miroir du coffre tenu par lib/security/secureStorage.ts (meme nom, sans l'importer : il nous importe) */
const miroir = (cle: string) => `@yoroi_miroir_coffre:${cle}`;

/** Cles dont le coffre est vide depuis ce lancement (la valeur fait foi dans la base) */
const coffresVides = new Set<string>();
async function viderCoffre(cle: string): Promise<void> {
  if (coffresVides.has(cle)) return;
  try {
    await SecureStore.deleteItemAsync(nomCoffre(cle));
    coffresVides.add(cle);
  } catch (e) {
    logger.warn(`[Coffre] ${cle} pas encore retire du coffre`, e);
  }
}

/**
 * Effacement demande pendant que la base ne repondait pas : note a part (propre au telephone, jamais sauvegarde),
 * applique a la base a la lecture suivante. Sans cette note, l'ancienne valeur de la base reviendrait.
 */
export const CLE_EFFACEMENT_EN_ATTENTE = '@yoroi_safety_coffre_efface:';

/** Une ecriture est partie dans le coffre (base indisponible a ce moment) : a reprendre a la prochaine lecture */
export async function ecritDansLeCoffre(cle: string): Promise<void> {
  coffresVides.delete(cle);
  try { await AsyncStorage.removeItem(CLE_EFFACEMENT_EN_ATTENTE + cle); } catch { /* rien en attente */ }
}

/**
 * La base fait foi, mais une valeur est encore dans le coffre : soit un reste d'une migration interrompue, soit
 * une ecriture faite pendant que la base ne repondait pas. Le miroir (toujours ecrit en dernier, par les deux
 * chemins) les departage : si le coffre est identique au miroir, c'est la valeur la plus recente.
 */
async function reconcilier(db: Base, cle: string, l: Ligne): Promise<string | null> {
  if (coffresVides.has(cle)) return l.valeur;
  let coffre: string | null;
  try {
    coffre = await SecureStore.getItemAsync(nomCoffre(cle));
  } catch {
    return l.valeur; // coffre verrouille : la base fait foi, le coffre sera regarde plus tard
  }
  if (coffre && coffre !== l.valeur) {
    let m: string | null = null;
    try { m = await AsyncStorage.getItem(miroir(cle)); } catch { m = null; }
    if (m === coffre) {
      await db.runAsync(`UPDATE donnees_protegees SET valeur = ?, etat = 'migre', modifie_le = ? WHERE cle = ?`, [coffre, Date.now(), cle]);
      const verifie = await ligne(db, cle);
      if (!verifie || verifie.valeur !== coffre) return coffre; // la base ne suit pas : le coffre reste la source
      logger.info(`[Coffre] ${cle} : ecriture faite pendant une panne de la base reprise`);
      await viderCoffre(cle);
      return coffre;
    }
  }
  await viderCoffre(cle);
  return l.valeur;
}

export type LectureRoute = { trouve: true; valeur: string | null } | { trouve: false };

/** La valeur dans la base si la migration de cette cle est faite ; sinon { trouve: false } : lire le coffre */
export async function lireRoute(cle: string): Promise<LectureRoute> {
  if (!estVolumineuse(cle)) return { trouve: false };
  try {
    const db = await base();
    if (!db) return { trouve: false };
    const l = await ligne(db, cle);
    if (!l || l.etat !== 'migre') return { trouve: false };
    if ((await AsyncStorage.getItem(CLE_EFFACEMENT_EN_ATTENTE + cle).catch(() => null)) === '1') {
      await db.runAsync(`UPDATE donnees_protegees SET valeur = NULL, etat = 'migre', modifie_le = ? WHERE cle = ?`, [Date.now(), cle]);
      await AsyncStorage.removeItem(CLE_EFFACEMENT_EN_ATTENTE + cle).catch(() => undefined);
      return { trouve: true, valeur: null };
    }
    return { trouve: true, valeur: await reconcilier(db, cle, l) };
  } catch (e) {
    logger.warn(`[Coffre] lecture de ${cle} dans la base impossible, lecture du coffre`, e);
    return { trouve: false };
  }
}

/** Ecrit dans la base et verifie. Vrai : la valeur fait foi dans la base. Faux : ecrire dans le coffre comme avant. */
export async function ecrireRoute(cle: string, valeur: string): Promise<boolean> {
  if (!estVolumineuse(cle)) return false;
  try {
    const db = await base();
    if (!db) return false;
    await db.runAsync(
      `INSERT INTO donnees_protegees (cle, valeur, etat, modifie_le) VALUES (?, ?, 'migre', ?)
       ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, etat = 'migre', modifie_le = excluded.modifie_le`,
      [cle, valeur, Date.now()],
    );
    const l = await ligne(db, cle);
    if (!l || l.etat !== 'migre' || l.valeur !== valeur) throw new Error('verification echouee');
    // l'ancienne copie du coffre ne doit jamais revenir a la place de celle ci
    coffresVides.delete(cle);
    await viderCoffre(cle);
    await AsyncStorage.removeItem(CLE_EFFACEMENT_EN_ATTENTE + cle).catch(() => undefined);
    return true;
  } catch (e) {
    logger.warn(`[Coffre] ${cle} non ecrit dans la base, ecrit dans le coffre`, e);
    return false;
  }
}

/**
 * Efface la valeur : dans la base, une valeur vide qui fait foi (l'ancienne copie du coffre ne revient pas).
 * Base indisponible : l'effacement est note et applique a la lecture suivante.
 */
export async function effacerRoute(cle: string): Promise<boolean> {
  if (!estVolumineuse(cle)) return false;
  try {
    const db = await base();
    if (!db) throw new Error('base indisponible');
    await db.runAsync(
      `INSERT INTO donnees_protegees (cle, valeur, etat, modifie_le) VALUES (?, NULL, 'migre', ?)
       ON CONFLICT(cle) DO UPDATE SET valeur = NULL, etat = 'migre', modifie_le = excluded.modifie_le`,
      [cle, Date.now()],
    );
    await AsyncStorage.removeItem(CLE_EFFACEMENT_EN_ATTENTE + cle).catch(() => undefined);
    return true;
  } catch {
    try {
      await AsyncStorage.setItem(CLE_EFFACEMENT_EN_ATTENTE + cle, '1');
      return true;
    } catch (e) {
      logger.warn(`[Coffre] effacement de ${cle} non note`, e);
      return false;
    }
  }
}

/**
 * Migration d'une cle a partir de la valeur lue dans le coffre. Rend vrai si la valeur fait desormais foi dans la base.
 * Une ecriture faite entre temps (etat « migre ») n'est jamais remplacee par l'ancienne valeur du coffre.
 */
export async function migrerDepuisCoffre(cle: string, valeurCoffre: string): Promise<boolean> {
  if (!estVolumineuse(cle) || typeof valeurCoffre !== 'string' || !valeurCoffre) return false;
  try {
    const db = await base();
    if (!db) return false;
    // 1. copie
    await db.runAsync(
      `INSERT INTO donnees_protegees (cle, valeur, etat, modifie_le) VALUES (?, ?, 'copie', ?)
       ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur, etat = 'copie', modifie_le = excluded.modifie_le
       WHERE donnees_protegees.etat != 'migre'`,
      [cle, valeurCoffre, Date.now()],
    );
    // 2. verification, puis la copie fait foi
    const copie = await ligne(db, cle);
    if (!copie) return false;
    if (copie.etat === 'migre') return true; // ecrite entre temps : elle fait foi
    if (copie.valeur !== valeurCoffre) return false;
    await db.runAsync(
      `UPDATE donnees_protegees SET etat = 'migre' WHERE cle = ? AND etat = 'copie' AND valeur = ?`,
      [cle, valeurCoffre],
    );
    const fini = await ligne(db, cle);
    if (!fini || fini.etat !== 'migre') return false;
    // 3. seulement maintenant, retiree du coffre
    await viderCoffre(cle);
    logger.info(`[Coffre] ${cle} range dans la base des donnees protegees`);
    return true;
  } catch (e) {
    logger.warn(`[Coffre] migration de ${cle} remise a plus tard`, e);
    return false;
  }
}

/** Migre toutes les listes du coffre (lecture stricte : un coffre verrouille ne fait rien, nouvel essai plus tard) */
export async function migrerTout(): Promise<{ migrees: string[]; restantes: string[] }> {
  const out = { migrees: [] as string[], restantes: [] as string[] };
  for (const cle of CLES_VOLUMINEUSES) {
    if (!estVolumineuse(cle)) continue;
    if ((await lireRoute(cle)).trouve) { out.migrees.push(cle); continue; }
    try {
      const v = await SecureStore.getItemAsync(nomCoffre(cle));
      if (!v) continue;
      if (await migrerDepuisCoffre(cle, v)) out.migrees.push(cle);
      else out.restantes.push(cle);
    } catch {
      out.restantes.push(cle);
    }
  }
  return out;
}

// ─── Lecture et ecriture brutes, pour la sauvegarde et le Studio ─────────

/** Valeur texte d'une cle du coffre, ou qu'elle soit rangee. Lance si le coffre est illisible. */
export async function lireCoffreBrut(cle: string): Promise<string | null> {
  const r = await lireRoute(cle);
  if (r.trouve) return r.valeur;
  return SecureStore.getItemAsync(nomCoffre(cle));
}

/** Ecrit une valeur texte : la base pour les listes, le coffre pour le reste */
export async function ecrireCoffreBrut(cle: string, valeur: string): Promise<void> {
  if (await ecrireRoute(cle, valeur)) return;
  await SecureStore.setItemAsync(nomCoffre(cle), valeur, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  if (estVolumineuse(cle)) await ecritDansLeCoffre(cle);
}

/** Meme chose par nom deja nettoye (Studio : lib/v2/creator/nouvelUtilisateurAppareil.ts) */
export const coffreParNom = {
  lire: (nom: string) => {
    const cle = CLE_PAR_NOM.get(nom);
    return cle ? lireCoffreBrut(cle) : SecureStore.getItemAsync(nom);
  },
  ecrire: (nom: string, v: string) => {
    const cle = CLE_PAR_NOM.get(nom);
    return cle ? ecrireCoffreBrut(cle, v) : SecureStore.setItemAsync(nom, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  },
  effacer: async (nom: string) => {
    const cle = CLE_PAR_NOM.get(nom);
    if (cle) await effacerRoute(cle);
    await SecureStore.deleteItemAsync(nom);
  },
};

export const __test__ = {
  /** base a utiliser (null : indisponible, undefined : la vraie) */
  utiliserBase: (db: Base | null | undefined) => { baseDeTest = db; ouverture = null; echecA = 0; coffresVides.clear(); },
  SCHEMA,
};
