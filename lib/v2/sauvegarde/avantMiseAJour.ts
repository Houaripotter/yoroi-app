/**
 * Copie de securite locale avant les migrations d'une nouvelle version (13 octobre 2026).
 *
 * A la premiere ouverture apres une mise a jour (ou la premiere fois que cette version voit des donnees
 * d'une ancienne version), AVANT de toucher a la base :
 * - copie complete de la base SQLite (sauvegarde en ligne de SQLite, coherente meme base ouverte) ;
 * - copie de toutes les cles de l'app (AsyncStorage) et des donnees du coffre (SecureStore) ;
 * - un journal (versions, ce qui a reussi, resultat des migrations).
 * Rangement : Documents/yoroi_securite/<date>_<ancienne>_vers_<nouvelle>/. Les 3 dernieres sont gardees.
 * Jamais bloquant : si la copie echoue, l'app continue et le journal le dit.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '@/lib/security/logger';
import { SECURE_DATA_KEYS } from './fusion';

export const DATA_VERSION_KEY = '@yoroi_data_version';
export const SAFETY_LAST_KEY = '@yoroi_safety_snapshot_last';
export const MIGRATION_FAIL_KEY = '@yoroi_migration_echec';
/** Dossier des copies, dans Documents (liste et partage : lib/v2/sauvegarde/copiesSecurite.ts) */
export const SAFETY_DIR_NAME = 'yoroi_securite';
const DIR_NAME = SAFETY_DIR_NAME;
const KEEP = 3;
const TIMEOUT_MS = 15000;

export type SafetySnapshot = {
  dir: string;
  at: string;
  from: string;
  to: string;
  db: 'ok' | 'absent' | string;
  storage: number | string;
  secure: number | string;
  migrations?: 'ok' | string;
  warnings?: string[];
  /** cles AsyncStorage qui n'ont pas pu etre lues pendant la copie (le reste est copie) */
  unreadableKeys?: string[];
  /** IMPORT MULTI : copie faite pour une autre raison qu'une mise a jour (texte affiche tel quel) */
  reason?: string;
};

/** IMPORT MULTI : marque des dossiers des copies faites avant un import (rangees a part des copies de mise a jour) */
const IMPORT_TAG = '_avant-import_';
const KEEP_IMPORT = 2;

let current: SafetySnapshot | null = null;

/** Version installee : numero de version + numero de build ("3.0.0 (24)") */
export function installedVersion(): string {
  const c = Constants as unknown as { expoConfig?: { version?: string; ios?: { buildNumber?: string }; android?: { versionCode?: number } }; nativeBuildVersion?: string; nativeAppVersion?: string };
  const v = c.expoConfig?.version ?? c.nativeAppVersion ?? '';
  const b = Platform.OS === 'ios' ? c.expoConfig?.ios?.buildNumber : c.expoConfig?.android?.versionCode;
  const build = c.nativeBuildVersion ?? (b != null ? String(b) : '');
  return build ? `${v} (${build})` : v;
}

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}h${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const safeName = (s: string) => s.replace(/[^0-9A-Za-z.]+/g, '-').replace(/^-|-$/g, '') || 'inconnue';
const plainPath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));

async function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const r = await Promise.race([p, new Promise<T>((res) => { t = setTimeout(() => res(fallback), TIMEOUT_MS); })]);
  if (t) clearTimeout(t);
  return r;
}

/**
 * Lit toutes les cles par paquets de 50. Si un paquet echoue (valeur trop grosse sur Android),
 * ses cles sont relues une par une ; celles qui restent illisibles sont rendues a part.
 */
export async function readAllKeysSafely(keys: string[]): Promise<{ values: Record<string, string | null>; unreadable: string[] }> {
  const values: Record<string, string | null> = {};
  const unreadable: string[] = [];
  const CHUNK = 50;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const part = keys.slice(i, i + CHUNK);
    try {
      const pairs = (await AsyncStorage.multiGet(part)) ?? [];
      for (const [k, v] of pairs) values[k] = v;
    } catch {
      for (const k of part) {
        try { values[k] = await AsyncStorage.getItem(k); } catch { unreadable.push(k); }
      }
    }
  }
  return { values, unreadable };
}

async function hasUserTables(database: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const row = await database.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('weights','trainings','profile')");
    return Number(row?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

async function rotate(root: string, imports = false): Promise<void> {
  try {
    // les copies d'avant un import ne chassent jamais celles d'avant une mise a jour, et inversement
    const names = (await FileSystem.readDirectoryAsync(root))
      .filter((n) => /^\d{4}-\d{2}-\d{2}_/.test(n) && n.includes(IMPORT_TAG) === imports)
      .sort()
      .reverse();
    for (const old of names.slice(imports ? KEEP_IMPORT : KEEP)) {
      await FileSystem.deleteAsync(`${root}${old}`, { idempotent: true }).catch(() => undefined);
    }
  } catch {
    // dossier absent : rien a ranger
  }
}

/** La copie elle-meme : base SQLite, cles de l'app, coffre, journal */
async function writeSnapshot(database: SQLite.SQLiteDatabase, keys: string[], hasDb: boolean, from: string, to: string, reason?: string): Promise<SafetySnapshot> {
  const root = `${FileSystem.documentDirectory}${DIR_NAME}/`;
  const now = new Date();
  const dir = reason ? `${root}${stamp(now)}${IMPORT_TAG}${safeName(to)}/` : `${root}${stamp(now)}_${safeName(from)}_vers_${safeName(to)}/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const snap: SafetySnapshot = { dir, at: now.toISOString(), from, to, db: 'absent', storage: 0, secure: 0, ...(reason ? { reason } : {}) };

  // 1. Base SQLite : sauvegarde en ligne (copie coherente)
  if (hasDb) {
    snap.db = await withTimeout((async () => {
      try {
        const dest = await SQLite.openDatabaseAsync('yoroi.db', undefined, plainPath(dir));
        await SQLite.backupDatabaseAsync({ sourceDatabase: database, destDatabase: dest });
        await dest.closeAsync().catch(() => undefined);
        return 'ok';
      } catch (e) {
        return `echec : ${String((e as Error)?.message ?? e).slice(0, 160)}`;
      }
    })(), 'echec : trop long');
  }

  // 2. Cles de l'app (tout, y compris les caches : c'est une copie de secours)
  // Lecture par paquets, puis cle par cle si un paquet echoue (sur Android, une valeur de plus de 2 Mo
  // fait echouer toute la lecture groupee) : une cle illisible est notee au journal, la copie continue
  snap.storage = await withTimeout((async () => {
    try {
      const { values: obj, unreadable } = await readAllKeysSafely(keys as string[]);
      if (unreadable.length) snap.unreadableKeys = unreadable.slice(0, 50);
      await FileSystem.writeAsStringAsync(`${dir}asyncstorage.json`, JSON.stringify(obj));
      return Object.keys(obj).length;
    } catch (e) {
      return `echec : ${String((e as Error)?.message ?? e).slice(0, 160)}`;
    }
  })(), 'echec : trop long');

  // 3. Coffre (sans le mot de passe de chiffrement)
  snap.secure = await withTimeout((async () => {
    try {
      const obj: Record<string, string> = {};
      for (const k of SECURE_DATA_KEYS) {
        const v = await SecureStore.getItemAsync(k.replace(/[^a-zA-Z0-9._-]/g, '_')).catch(() => null);
        if (v) obj[k] = v;
      }
      await FileSystem.writeAsStringAsync(`${dir}securestore.json`, JSON.stringify(obj));
      return Object.keys(obj).length;
    } catch (e) {
      return `echec : ${String((e as Error)?.message ?? e).slice(0, 160)}`;
    }
  })(), 'echec : trop long');

  await FileSystem.writeAsStringAsync(`${dir}journal.json`, JSON.stringify(snap, null, 2)).catch(() => undefined);
  return snap;
}

/**
 * IMPORT MULTI : copie de securite locale juste avant un gros import (plus de 3 pesees d'un coup).
 * Meme contenu que la copie d'avant mise a jour, listee au meme endroit (Reglages, copies de securite),
 * les 2 dernieres gardees. Jamais bloquante : null si elle n'a pas pu etre faite (ou sur le web).
 */
export async function snapshotBeforeImport(database: SQLite.SQLiteDatabase, reason: string): Promise<SafetySnapshot | null> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return null;
  try {
    const hasDb = await hasUserTables(database);
    let keys: readonly string[] = [];
    try { keys = (await AsyncStorage.getAllKeys()) ?? []; } catch { keys = []; }
    if (!hasDb && keys.length === 0) return null;
    const to = installedVersion();
    const snap = await writeSnapshot(database, keys as string[], hasDb, 'import', to, reason);
    await rotate(`${FileSystem.documentDirectory}${DIR_NAME}/`, true);
    logger.info(`[Securite] Copie avant import : base ${snap.db}, cles ${snap.storage}, coffre ${snap.secure}`);
    return snap;
  } catch (e) {
    logger.warn('[Securite] Copie avant import impossible', e);
    return null;
  }
}

/**
 * A appeler avec la base ouverte, AVANT toute creation ou modification de table.
 * Ne fait rien si cette version a deja tourne sur ce telephone, ou si c'est une premiere installation.
 */
export async function snapshotBeforeMigrations(database: SQLite.SQLiteDatabase): Promise<SafetySnapshot | null> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return null;
  try {
    const to = installedVersion();
    const seen = await AsyncStorage.getItem(DATA_VERSION_KEY);
    if (seen && seen === to) return null;
    // Deja une copie pour cette version (migrations ratees puis relancees) : on garde la premiere,
    // celle d'avant tout changement, au lieu d'en refaire une
    try {
      const last = JSON.parse((await AsyncStorage.getItem(SAFETY_LAST_KEY)) ?? 'null') as SafetySnapshot | null;
      if (last && last.to === to) { current = last; return null; }
    } catch {
      // illisible : on refait une copie
    }
    const hasDb = await hasUserTables(database);
    let keys: readonly string[] = [];
    try { keys = (await AsyncStorage.getAllKeys()) ?? []; } catch { keys = []; }
    if (!hasDb && keys.length === 0) return null; // premiere installation : rien a proteger
    const from = seen ?? 'version precedente';
    const snap = await writeSnapshot(database, keys as string[], hasDb, from, to);
    await AsyncStorage.setItem(SAFETY_LAST_KEY, JSON.stringify(snap)).catch(() => undefined);
    await rotate(`${FileSystem.documentDirectory}${DIR_NAME}/`);
    current = snap;
    logger.info(`[Securite] Copie avant mise a jour ${from} -> ${to} : base ${snap.db}, cles ${snap.storage}, coffre ${snap.secure}${snap.unreadableKeys?.length ? `, ${snap.unreadableKeys.length} cle(s) illisible(s)` : ''}`);
    return snap;
  } catch (e) {
    logger.warn('[Securite] Copie avant mise a jour impossible', e);
    return null;
  }
}

/**
 * A appeler a la fin des migrations. Succes : la version est notee (plus de copie au prochain lancement).
 * Echec : la version n'est PAS notee (nouvelle tentative au prochain lancement) et l'echec est garde pour le message.
 */
export async function recordMigrationResult(ok: boolean, detail?: string, warnings: string[] = []): Promise<void> {
  try {
    if (ok) {
      await AsyncStorage.setItem(DATA_VERSION_KEY, installedVersion());
      await AsyncStorage.removeItem(MIGRATION_FAIL_KEY);
    } else {
      await AsyncStorage.setItem(MIGRATION_FAIL_KEY, JSON.stringify({ at: new Date().toISOString(), version: installedVersion(), detail: (detail ?? '').slice(0, 300) }));
    }
    if (current) {
      current = { ...current, migrations: ok ? 'ok' : `echec : ${(detail ?? '').slice(0, 300)}`, warnings: warnings.slice(0, 20) };
      await FileSystem.writeAsStringAsync(`${current.dir}journal.json`, JSON.stringify(current, null, 2)).catch(() => undefined);
      await AsyncStorage.setItem(SAFETY_LAST_KEY, JSON.stringify(current)).catch(() => undefined);
    }
  } catch {
    // jamais bloquant
  }
}

/** Derniere copie de securite (pour les Reglages et le message d'echec) */
export async function getLastSafetySnapshot(): Promise<SafetySnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(SAFETY_LAST_KEY);
    return raw ? (JSON.parse(raw) as SafetySnapshot) : null;
  } catch {
    return null;
  }
}

/**
 * Fabrique un seul fichier a partager (base en base64 + cles + coffre), pour le mettre dans ton cloud
 * ou nous l'envoyer si la mise a jour a echoue. Renvoie son adresse, ou null.
 */
export async function buildShareableSafetyFile(snap?: SafetySnapshot | null): Promise<string | null> {
  try {
    const s = snap ?? (await getLastSafetySnapshot());
    if (!s) return null;
    const read = async (name: string, enc: 'utf8' | 'base64') => {
      try {
        const info = await FileSystem.getInfoAsync(`${s.dir}${name}`);
        if (!info.exists) return null;
        return await FileSystem.readAsStringAsync(`${s.dir}${name}`, { encoding: enc === 'base64' ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8 });
      } catch {
        return null;
      }
    };
    const payload = {
      appName: 'Yoroi',
      kind: 'copie_securite_mise_a_jour',
      journal: s,
      sqliteBase64: await read('yoroi.db', 'base64'),
      asyncStorage: Object.fromEntries(
        Object.entries(JSON.parse((await read('asyncstorage.json', 'utf8')) ?? '{}') as Record<string, unknown>)
          .filter(([k]) => !/token|password|secret|creator|encrypt/i.test(k)),
      ),
      secureStore: JSON.parse((await read('securestore.json', 'utf8')) ?? '{}'),
    };
    const out = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}yoroi_copie_securite_${s.at.slice(0, 10)}.json`;
    await FileSystem.writeAsStringAsync(out, JSON.stringify(payload));
    return out;
  } catch (e) {
    logger.warn('[Securite] Fichier de la copie impossible a preparer', e);
    return null;
  }
}
