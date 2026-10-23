/**
 * Copies de securite automatiques (13 octobre 2026, soir).
 *
 * Avant chaque mise a jour qui touche aux donnees, YOROI range une copie complete dans
 * Documents/yoroi_securite/ (lib/v2/sauvegarde/avantMiseAJour.ts). Ce module les rend utiles :
 * - les lister (date, taille, versions) pour les Reglages ;
 * - les partager en un seul fichier (Fichiers, iCloud Drive, Google Drive...) ;
 * - les remettre sur le telephone par FUSION, comme l'import d'une sauvegarde : on ajoute ce qui manque,
 *   on ne remplace jamais ce qui est deja la, aucun doublon.
 * Le meme chemin sert pour un fichier de copie partage puis rouvert par « Restaurer une sauvegarde ».
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';
import { logger } from '@/lib/security/logger';
import { openDatabase } from '@/lib/database';
import { SAFETY_DIR_NAME, buildShareableSafetyFile, type SafetySnapshot } from './avantMiseAJour';
import { restoreAllStorage, restoreSecure, restoreTables, type IdMaps } from './fusion';
import { entreesDeCopieDuCoffre, reprendrePeseesDuCoffre } from '@/lib/databaseReprisePesees';

export const SAFETY_FILE_KIND = 'copie_securite_mise_a_jour';

export type SafetyCopy = SafetySnapshot & { name: string; bytes: number; hasDb: boolean };

export type SafetyRestoreReport = { added: number; same: number; kept: number; failed: number };

const plainPath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));
/** Tables jamais remises : catalogue reconstruit, synchro propre a l'appareil */
const SKIP_TABLES = new Set(['events_catalog', 'app_metadata', 'sync_state', 'sync_tombstones', 'sqlite_sequence', 'android_metadata']);
/** Tables visees par d'autres (remises d'abord, pour que les liens suivent) */
const TARGET_TABLES = ['clubs', 'trainings', 'competitions', 'weekly_plan', 'injuries'];

const rootDir = () => (FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${SAFETY_DIR_NAME}/` : null);

async function sizeOf(dir: string): Promise<number> {
  let total = 0;
  try {
    for (const n of await FileSystem.readDirectoryAsync(dir)) {
      try {
        const info = await FileSystem.getInfoAsync(`${dir}${n}`);
        if (info.exists && !info.isDirectory && typeof (info as { size?: number }).size === 'number') total += (info as { size: number }).size;
      } catch {
        // fichier illisible : compte pour zero
      }
    }
  } catch {
    // dossier illisible
  }
  return total;
}

/** Copies presentes sur le telephone, la plus recente en premier */
export async function listSafetyCopies(): Promise<SafetyCopy[]> {
  const root = rootDir();
  if (Platform.OS === 'web' || !root) return [];
  let names: string[] = [];
  try { names = (await FileSystem.readDirectoryAsync(root)).filter((n) => /^\d{4}-\d{2}-\d{2}_/.test(n)).sort().reverse(); } catch { return []; }
  const out: SafetyCopy[] = [];
  for (const name of names) {
    const dir = `${root}${name}/`;
    let journal: Partial<SafetySnapshot> = {};
    try { journal = JSON.parse(await FileSystem.readAsStringAsync(`${dir}journal.json`)) as SafetySnapshot; } catch { /* journal absent : on garde le nom */ }
    const m = name.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})h(\d{2})(\d{2})/);
    const at = journal.at ?? (m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).toISOString() : new Date(0).toISOString());
    let hasDb = false;
    try { hasDb = (await FileSystem.getInfoAsync(`${dir}yoroi.db`)).exists; } catch { hasDb = false; }
    out.push({
      dir, name, at,
      from: journal.from ?? 'version precedente',
      to: journal.to ?? '',
      db: journal.db ?? (hasDb ? 'ok' : 'absent'),
      storage: journal.storage ?? 0,
      secure: journal.secure ?? 0,
      migrations: journal.migrations,
      unreadableKeys: journal.unreadableKeys,
      ...(journal.reason ? { reason: journal.reason } : {}),
      bytes: await sizeOf(dir),
      hasDb,
    });
  }
  return out;
}

/** Partage une copie en un seul fichier (feuille de partage du telephone). false si rien n'a ete partage. */
export async function shareSafetyCopy(copy: SafetySnapshot): Promise<boolean> {
  const file = await buildShareableSafetyFile({ ...copy, dir: copy.dir });
  if (!file) return false;
  if (!(await isAvailableAsync().catch(() => false))) return false;
  await shareAsync(file, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Range ta copie dans ton cloud' });
  return true;
}

async function readTables(source: SQLite.SQLiteDatabase): Promise<Record<string, Record<string, unknown>[]>> {
  const out: Record<string, Record<string, unknown>[]> = {};
  const tables = (await source.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")) ?? [];
  for (const { name } of tables) {
    if (SKIP_TABLES.has(name) || name.startsWith('sqlite_') || name.startsWith('demo_bak_') || !/^[A-Za-z0-9_]+$/.test(name)) continue;
    try { out[name] = (await source.getAllAsync<Record<string, unknown>>(`SELECT * FROM "${name}"`)) ?? []; } catch { /* table illisible */ }
  }
  return out;
}

const isEmpty = (v: unknown) => v == null || v === '';

/** Profil : une seule ligne. Absent : il est remis. Present : seules les cases vides sont remplies. */
async function mergeProfile(db: SQLite.SQLiteDatabase, rows: Record<string, unknown>[] | undefined, rep: SafetyRestoreReport, maps: IdMaps): Promise<void> {
  const incoming = rows?.[0];
  if (!incoming) return;
  const local = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM profile LIMIT 1').catch(() => null);
  if (!local) {
    const r = await restoreTables(db, { profile: [incoming] }, maps, new Set());
    rep.added += r.added; rep.failed += r.failed;
    return;
  }
  const cols = ((await db.getAllAsync<{ name: string }>('PRAGMA table_info("profile")')) ?? []).map((c) => c.name);
  const fill = cols.filter((c) => c !== 'id' && c !== 'created_at' && c !== 'updated_at' && isEmpty(local[c]) && !isEmpty(incoming[c]));
  rep.kept += cols.filter((c) => c !== 'id' && c !== 'created_at' && c !== 'updated_at' && !isEmpty(local[c]) && !isEmpty(incoming[c]) && local[c] !== incoming[c]).length;
  if (!fill.length) return;
  try {
    await db.runAsync(`UPDATE profile SET ${fill.map((c) => `"${c}" = ?`).join(', ')} WHERE id = ?`, [...fill.map((c) => incoming[c] as never), local.id as never]);
    rep.added += fill.length;
  } catch {
    rep.failed++;
  }
}

/**
 * Remet une copie (base, cles de l'app, coffre) par fusion. Jamais de remplacement.
 * Une sauvegarde complete de l'etat actuel est faite avant.
 */
export async function restoreSafetyContent(
  live: SQLite.SQLiteDatabase,
  content: { source: SQLite.SQLiteDatabase | null; storage: Record<string, unknown> | null; secure: Record<string, unknown> | null },
): Promise<SafetyRestoreReport> {
  const rep: SafetyRestoreReport = { added: 0, same: 0, kept: 0, failed: 0 };
  try {
    const { runSafetyBackup } = await import('@/lib/safetyBackupService');
    await runSafetyBackup('pre-restore-copie-securite');
  } catch {
    // non bloquant
  }
  if (content.source) {
    const tables = await readTables(content.source);
    const maps: IdMaps = {};
    await mergeProfile(live, tables.profile, rep, maps);
    const first: Record<string, unknown> = {};
    for (const t of TARGET_TABLES) if (tables[t]) first[t] = tables[t];
    const r1 = await restoreTables(live, first, maps, new Set(['profile']));
    const r2 = await restoreTables(live, tables, maps, new Set(['profile', ...TARGET_TABLES]));
    rep.added += r1.added + r2.added; rep.same += r1.same + r2.same; rep.failed += r1.failed + r2.failed;
  }
  if (content.storage) {
    const r = await restoreAllStorage(content.storage, new Set());
    rep.added += r.added; rep.kept += r.kept;
  }
  if (content.secure) {
    const r = await restoreSecure(content.secure, new Set());
    rep.added += r.added; rep.kept += r.kept;
    // 19 octobre 2026 : pesees de l'ancien ecran rangees dans le coffre de la copie, visibles comme pesees
    await reprendrePeseesDuCoffre(live, { entrees: entreesDeCopieDuCoffre(content.secure) }).catch(() => 0);
  }
  logger.info(`[Securite] Copie remise par fusion : ${rep.added} ajoute(s), ${rep.same} deja la, ${rep.kept} garde(s), ${rep.failed} illisible(s)`);
  return rep;
}

async function readJson(uri: string): Promise<Record<string, unknown> | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const v = JSON.parse(await FileSystem.readAsStringAsync(uri));
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Remet une copie rangee sur ce telephone */
export async function restoreSafetyCopy(copy: SafetySnapshot): Promise<SafetyRestoreReport | null> {
  try {
    const live = await openDatabase();
    let source: SQLite.SQLiteDatabase | null = null;
    try {
      if ((await FileSystem.getInfoAsync(`${copy.dir}yoroi.db`)).exists) source = await SQLite.openDatabaseAsync('yoroi.db', undefined, plainPath(copy.dir));
    } catch (e) {
      logger.warn('[Securite] Base de la copie illisible', e);
    }
    try {
      return await restoreSafetyContent(live, {
        source,
        storage: await readJson(`${copy.dir}asyncstorage.json`),
        secure: await readJson(`${copy.dir}securestore.json`),
      });
    } finally {
      await source?.closeAsync().catch(() => undefined);
    }
  } catch (e) {
    logger.warn('[Securite] Copie impossible a remettre', e);
    return null;
  }
}

/** Fichier partage par shareSafetyCopy, rouvert par « Restaurer une sauvegarde » */
export function isSafetyFile(data: unknown): boolean {
  return !!data && typeof data === 'object' && (data as { kind?: unknown }).kind === SAFETY_FILE_KIND;
}

export async function restoreSafetyFile(data: { sqliteBase64?: string | null; asyncStorage?: Record<string, unknown>; secureStore?: Record<string, unknown> }): Promise<SafetyRestoreReport | null> {
  try {
    const live = await openDatabase();
    let source: SQLite.SQLiteDatabase | null = null;
    const tmp = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}yoroi_copie_a_remettre_${Date.now()}/`;
    if (typeof data.sqliteBase64 === 'string' && data.sqliteBase64.length) {
      try {
        await FileSystem.makeDirectoryAsync(tmp, { intermediates: true });
        await FileSystem.writeAsStringAsync(`${tmp}yoroi.db`, data.sqliteBase64, { encoding: FileSystem.EncodingType.Base64 });
        source = await SQLite.openDatabaseAsync('yoroi.db', undefined, plainPath(tmp));
      } catch (e) {
        logger.warn('[Securite] Base du fichier illisible', e);
      }
    }
    try {
      return await restoreSafetyContent(live, {
        source,
        storage: data.asyncStorage && typeof data.asyncStorage === 'object' ? data.asyncStorage : null,
        secure: data.secureStore && typeof data.secureStore === 'object' ? data.secureStore : null,
      });
    } finally {
      await source?.closeAsync().catch(() => undefined);
    }
  } catch (e) {
    logger.warn('[Securite] Fichier de copie impossible a remettre', e);
    return null;
  }
}

/** Petit texte de compte rendu, tutoiement */
export function safetyReportText(r: SafetyRestoreReport): string {
  return [
    r.added > 0 ? `${r.added} élément(s) ajouté(s).` : 'Rien de nouveau : tout était déjà sur ce téléphone.',
    r.same > 0 ? `${r.same} déjà présent(s), pas recopié(s).` : null,
    r.kept > 0 ? `${r.kept} valeur(s) différente(s) gardée(s) telle(s) que sur ce téléphone.` : null,
    r.failed > 0 ? `${r.failed} élément(s) n’ont pas pu être lus.` : null,
  ].filter(Boolean).join('\n');
}
