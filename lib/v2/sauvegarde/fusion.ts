/**
 * Sauvegarde complete et fusion sans perte (13 octobre 2026).
 *
 * Avant : la sauvegarde listait les donnees une par une. Tout ce qui avait ete ajoute depuis
 * (Dojo, scenes, personnages, reglages de style, minuteurs, carnet, objectifs, combats, eau...)
 * n'y etait pas, et la restauration remplacait certaines listes au lieu de les completer.
 *
 * Maintenant la sauvegarde contient en plus :
 * - allStorage : toutes les cles de l'app (sauf caches, abonnement, appareil, mots de passe) ;
 * - allSecure : les donnees rangees dans le coffre du telephone ;
 * - allTables : toutes les tables de la base qui ne sont pas deja sauvegardees a part.
 *
 * Restauration : on AJOUTE ce qui manque, on ne remplace jamais ce qui existe deja sur le telephone.
 * - une cle absente est ajoutee ;
 * - deux listes sont fusionnees (par identifiant, sinon par contenu identique) ;
 * - une valeur deja presente et differente est gardee telle quelle (comptee dans "gardees").
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';

/** Cles jamais sauvegardees ni restaurees : propres a ce telephone, a l'abonnement, ou reconstruites seules */
const STORAGE_SKIP: RegExp[] = [
  /cache/i,
  /premium|revenuecat|purchase|entitlement|subscri|legacy_free|paywall|trial/i,
  /creator|token|password|secret|encrypt/i,
  /demo/i,
  /dedupe_v1_backup/,
  /^@yoroi_(safety|data_version|migration_|last_auto_backup|last_cloud|install_date|last_known_cloud|cloud_sync|cloud_folder|last_full_import)/,
  /peer|pairing|appair|paired|_sync_|sync_state|tombstone|last_?sync/i,
  /notif(ication)?_?ids?$|scheduled_notif/i,
  /healthkit_asked|healthconnect_connected/i,
  /^(expo|RCT|@RNC|persist:|EXDevMenu|EXDevLauncher)/,
  // le style des widgets (yoroi_widgets_style_v1) est un choix de l'utilisateur : il est sauvegarde
  /widget(?!s_style)/i,
];

/** Une valeur plus grosse que ca est un cache, pas une donnee saisie */
const MAX_VALUE_CHARS = 4 * 1024 * 1024;

export function isStorageKeySkipped(key: string): boolean {
  return STORAGE_SKIP.some((r) => r.test(key));
}

/** Donnees rangees dans le coffre (SecureStore). Le mot de passe de chiffrement n'en fait jamais partie. */
export const SECURE_DATA_KEYS = [
  '@yoroi_user_settings', '@yoroi_measurements', '@yoroi_photos', '@yoroi_body_composition',
  '@yoroi_user_body_status', '@yoroi_hydration_settings', '@yoroi_mood_log', '@yoroi_sleep_entries',
  '@yoroi_fasting_history', '@yoroi_fasting_active_mode', '@yoroi_fasting_start_time', '@yoroi_fasting_custom',
  '@yoroi_fasting_ramadan', '@yoroi_injuries', '@yoroi_water_intake', '@yoroi_health_last_weight',
  '@yoroi_current_weight', '@yoroi_target_weight',
] as const;

const secureKey = (k: string) => k.replace(/[^a-zA-Z0-9._-]/g, '_');

/** Tables jamais copiees telles quelles : catalogue reconstruit, synchro propre a l'appareil, sauvegardes de demo */
const TABLE_SKIP = new Set(['events_catalog', 'app_metadata', 'sync_state', 'sync_tombstones', 'sqlite_sequence', 'android_metadata']);

export async function collectAllStorage(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const keys = ((await AsyncStorage.getAllKeys()) ?? []).filter((k) => !isStorageKeySkipped(k));
  const CHUNK = 50;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const part = keys.slice(i, i + CHUNK);
    let pairs: readonly (readonly [string, string | null])[] = [];
    try {
      pairs = (await AsyncStorage.multiGet(part)) ?? [];
    } catch {
      // une cle illisible (trop grosse sur Android) : on lit une par une
      const one: [string, string | null][] = [];
      for (const k of part) {
        try { one.push([k, await AsyncStorage.getItem(k)]); } catch { /* cle ignoree */ }
      }
      pairs = one;
    }
    for (const [k, v] of pairs) {
      if (typeof v === 'string' && v.length <= MAX_VALUE_CHARS) out[k] = v;
    }
  }
  return out;
}

export async function collectSecure(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const k of SECURE_DATA_KEYS) {
    try {
      const v = await SecureStore.getItemAsync(secureKey(k));
      if (typeof v === 'string' && v.length) out[k] = v;
    } catch {
      // coffre verrouille : la donnee reste aussi dans les sections classiques de la sauvegarde
    }
  }
  return out;
}

export async function collectAllTables(db: SQLiteDatabase, alreadySaved: string[]): Promise<Record<string, Record<string, unknown>[]>> {
  const out: Record<string, Record<string, unknown>[]> = {};
  const skip = new Set([...TABLE_SKIP, ...alreadySaved]);
  const tables = (await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")) ?? [];
  for (const { name } of tables) {
    if (skip.has(name) || name.startsWith('sqlite_') || name.startsWith('demo_bak_') || !/^[A-Za-z0-9_]+$/.test(name)) continue;
    try {
      out[name] = (await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM "${name}"`)) ?? [];
    } catch {
      // table illisible : ignoree
    }
  }
  return out;
}

// ─── Fusion de deux valeurs texte (JSON ou non) ───────────────────────────

type Merge = { value: string | null; added: number; kept: boolean };

const idOf = (x: unknown): string | null => {
  if (x && typeof x === 'object' && !Array.isArray(x)) {
    const o = x as Record<string, unknown>;
    const id = o.id ?? o.uuid ?? o.key;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return null;
};

const parse = (s: string | null | undefined): unknown => {
  if (s == null) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
};

/**
 * Fusionne la valeur d'une sauvegarde dans la valeur du telephone.
 * value = null : rien a ecrire. kept = true : une valeur differente existait, on l'a gardee.
 */
export function mergeStoredValue(localRaw: string | null | undefined, incomingRaw: string | null | undefined, preferIncoming = false): Merge {
  if (incomingRaw == null || incomingRaw === '') return { value: null, added: 0, kept: false };
  if (localRaw == null || localRaw === '' || localRaw === 'null' || localRaw === '[]' || localRaw === '{}') {
    return localRaw === incomingRaw ? { value: null, added: 0, kept: false } : { value: incomingRaw, added: 1, kept: false };
  }
  if (localRaw === incomingRaw) return { value: null, added: 0, kept: false };
  const a = parse(localRaw);
  const b = parse(incomingRaw);
  if (Array.isArray(a) && Array.isArray(b)) {
    const ids = new Set(a.map(idOf).filter((x): x is string => x != null));
    const same = new Set(a.map((x) => JSON.stringify(x)));
    const extra = b.filter((x) => {
      const id = idOf(x);
      return id != null ? !ids.has(id) : !same.has(JSON.stringify(x));
    });
    if (!extra.length) return { value: null, added: 0, kept: false };
    return { value: JSON.stringify([...a, ...extra]), added: extra.length, kept: false };
  }
  // Telephone neuf (aucune pesee ni seance avant la restauration) : les reglages de la sauvegarde passent avant
  // les valeurs par defaut posees a l'installation
  if (preferIncoming) return { value: incomingRaw, added: 1, kept: false };
  return { value: null, added: 0, kept: true };
}

export type StorageRestoreReport = { added: number; kept: number; skipped: number };

/** Restaure les cles de l'app (AsyncStorage) en ajoutant seulement ce qui manque */
export async function restoreAllStorage(map: unknown, alreadyHandled: Set<string>, preferIncoming = false): Promise<StorageRestoreReport> {
  const rep: StorageRestoreReport = { added: 0, kept: 0, skipped: 0 };
  if (!map || typeof map !== 'object') return rep;
  for (const [k, v] of Object.entries(map as Record<string, unknown>)) {
    if (typeof v !== 'string' || alreadyHandled.has(k) || isStorageKeySkipped(k)) { rep.skipped++; continue; }
    try {
      const m = mergeStoredValue(await AsyncStorage.getItem(k), v, preferIncoming);
      if (m.value != null) { await AsyncStorage.setItem(k, m.value); rep.added++; }
      if (m.kept) rep.kept++;
    } catch {
      rep.skipped++;
    }
  }
  return rep;
}

/** Restaure les donnees du coffre en ajoutant seulement ce qui manque */
export async function restoreSecure(map: unknown, alreadyHandled: Set<string>, preferIncoming = false): Promise<StorageRestoreReport> {
  const rep: StorageRestoreReport = { added: 0, kept: 0, skipped: 0 };
  if (!map || typeof map !== 'object') return rep;
  const allowed = new Set<string>(SECURE_DATA_KEYS);
  for (const [k, v] of Object.entries(map as Record<string, unknown>)) {
    if (typeof v !== 'string' || !allowed.has(k) || alreadyHandled.has(k)) { rep.skipped++; continue; }
    try {
      const m = mergeStoredValue(await SecureStore.getItemAsync(secureKey(k)), v, preferIncoming);
      if (m.value != null) {
        await SecureStore.setItemAsync(secureKey(k), m.value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
        rep.added++;
      }
      if (m.kept) rep.kept++;
    } catch {
      rep.skipped++;
    }
  }
  return rep;
}

// ─── Tables ───────────────────────────────────────────────────────────────

/** Colonnes qui pointent vers une autre table : renumerotees si la ligne visee a change de numero */
const FK_RULES: Record<string, Record<string, string>> = {
  injury_eva_history: { injury_id: 'injuries' },
  injury_treatments: { injury_id: 'injuries' },
  treatment_reminders: { injury_id: 'injuries' },
  slot_occurrences: { weekly_plan_id: 'weekly_plan', training_id: 'trainings', injury_id: 'injuries' },
  combats: { competition_id: 'competitions' },
  objectifs_poids: { competition_id: 'competitions' },
  trash_trainings: { club_id: 'clubs' },
};
/** Ordre : les tables visees avant celles qui les visent */
const TABLE_ORDER = ['injury_treatments', 'injury_eva_history', 'treatment_reminders', 'slot_occurrences', 'combats', 'objectifs_poids'];
const IGNORED_IN_COMPARE = new Set(['id', 'created_at', 'updated_at', 'sync_uid']);

export type IdMaps = Record<string, Map<number, number>>;
export type TableRestoreReport = { added: number; same: number; failed: number; tables: number };

const sig = (row: Record<string, unknown>, cols: string[]) =>
  JSON.stringify(cols.filter((c) => !IGNORED_IN_COMPARE.has(c)).map((c) => (row[c] === undefined ? null : row[c])));

/**
 * Remet les tables d'une sauvegarde : une ligne deja presente (meme contenu) n'est pas recopiee,
 * une ligne nouvelle garde son numero s'il est libre, sinon elle en recoit un nouveau (et les liens suivent).
 */
export async function restoreTables(db: SQLiteDatabase, tables: unknown, maps: IdMaps, alreadyHandled: Set<string>): Promise<TableRestoreReport> {
  const rep: TableRestoreReport = { added: 0, same: 0, failed: 0, tables: 0 };
  if (!tables || typeof tables !== 'object') return rep;
  const all = tables as Record<string, unknown>;
  const existing = new Set(((await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")) ?? []).map((t) => t.name));
  const names = Object.keys(all)
    .filter((n) => !alreadyHandled.has(n) && !TABLE_SKIP.has(n) && existing.has(n) && /^[A-Za-z0-9_]+$/.test(n) && !n.startsWith('demo_bak_'))
    .sort((x, y) => {
      const ix = TABLE_ORDER.indexOf(x); const iy = TABLE_ORDER.indexOf(y);
      return (ix === -1 ? 99 : ix) - (iy === -1 ? 99 : iy) || x.localeCompare(y);
    });
  for (const name of names) {
    const rows = all[name];
    if (!Array.isArray(rows) || !rows.length) continue;
    rep.tables++;
    const cols = ((await db.getAllAsync<{ name: string }>(`PRAGMA table_info("${name}")`)) ?? []).map((c) => c.name);
    const colSet = new Set(cols);
    const hasId = colSet.has('id');
    // Comparaison sur les colonnes que la sauvegarde connait : une colonne ajoutee depuis (avec une valeur
    // par defaut sur le telephone) ne fait pas prendre une ligne deja la pour une nouvelle
    const known = new Set<string>();
    for (const r of rows as Record<string, unknown>[]) if (r && typeof r === 'object') for (const k of Object.keys(r)) known.add(k);
    const sigCols = cols.filter((c) => known.has(c));
    const local = (await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM "${name}"`)) ?? [];
    const bySig = new Map<string, number>();
    const usedIds = new Set<number>();
    for (const r of local) {
      bySig.set(sig(r, sigCols), Number(r.id));
      if (hasId) usedIds.add(Number(r.id));
    }
    const map = maps[name] ?? (maps[name] = new Map());
    const fks = FK_RULES[name] ?? {};
    for (const raw of rows as Record<string, unknown>[]) {
      if (!raw || typeof raw !== 'object') continue;
      const row: Record<string, unknown> = {};
      for (const c of cols) if (c in raw) row[c] = raw[c];
      let orphan = false;
      for (const [col, target] of Object.entries(fks)) {
        const v = row[col];
        if (v == null) continue;
        const tm = maps[target];
        const mapped = tm?.get(Number(v));
        if (mapped != null) row[col] = mapped;
        else if (tm && tm.size > 0 && !tm.has(Number(v))) {
          // la ligne visee n'a pas ete restauree : un lien obligatoire rendrait la ligne fausse
          if (target === 'injuries' || col === 'weekly_plan_id') orphan = true;
          else row[col] = null;
        }
      }
      if (orphan) { rep.failed++; continue; }
      const oldId = hasId ? Number(raw.id) : NaN;
      const s = sig(row, sigCols);
      const dup = bySig.get(s);
      if (dup != null) {
        if (hasId && Number.isFinite(oldId)) map.set(oldId, dup);
        rep.same++;
        continue;
      }
      const keepId = hasId && Number.isFinite(oldId) && !usedIds.has(oldId);
      const keys = Object.keys(row).filter((c) => (c === 'id' ? keepId : true) && colSet.has(c));
      try {
        const res = await db.runAsync(
          `INSERT INTO "${name}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          keys.map((k) => (row[k] === undefined ? null : (row[k] as never))),
        );
        const newId = keepId ? oldId : Number(res?.lastInsertRowId);
        if (hasId && Number.isFinite(oldId) && Number.isFinite(newId)) map.set(oldId, newId);
        if (hasId && Number.isFinite(newId)) usedIds.add(newId);
        bySig.set(s, newId);
        rep.added++;
      } catch {
        rep.failed++;
      }
    }
  }
  return rep;
}

/** Version de sauvegarde plus recente que celle que cette app sait lire */
export function isNewerBackupVersion(version: unknown, current: string): boolean {
  const p = (v: string) => v.split('.').map((x) => parseInt(x, 10) || 0);
  if (typeof version !== 'string' && typeof version !== 'number') return false;
  const a = p(String(version)); const b = p(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}
