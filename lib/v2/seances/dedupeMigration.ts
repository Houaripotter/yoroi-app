/**
 * Nettoyage unique des doublons deja en base (vague 20).
 * Avant la vague 19, YOROI ecrivait chaque seance dans Apple Sante (ou Health Connect) puis la relisait
 * comme une seance importee : l'historique contient donc des copies. Ce nettoyage tourne une seule fois
 * au demarrage, apres l'ouverture de la base, et efface UNIQUEMENT :
 * 1. les seances importees qui doublonnent une seance notee dans YOROI (meme regle que l'affichage) ;
 * 2. les imports en double avec le meme identifiant de source (on garde le plus ancien).
 * Jamais une seance notee dans YOROI. Les lignes effacees sont gardees dans AsyncStorage
 * (yoroi_dedupe_v1_backup) et restoreDedupeBackup() les remet en place.
 * Les XP du Dojo ne sont pas touchees : leur registre ne descend jamais.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { openDatabase } from '@/lib/database';
import type { Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { findDuplicatesToDelete } from './dedupe';
import { addDismissedImportIds, removeDismissedImportIds } from './dismissedImports';

export const DEDUPE_MIGRATION_KEY = 'yoroi_dedupe_v1';
export const DEDUPE_BACKUP_KEY = 'yoroi_dedupe_v1_backup';
const LOADS_KEY = '@yoroi_training_loads';

type Row = Record<string, any>;
type Load = { trainingId?: number; date: string; duration: number; rpe: number; load: number; [k: string]: any };

type Backup = {
  version: 1;
  at: string;
  /** Lignes completes de la table trainings, telles qu'avant l'effacement */
  rows: Row[];
  /** Seance gardee a la place de chaque seance effacee */
  keptFor: Record<string, number>;
  /** Identifiants de source ajoutes a la liste des imports ecartes */
  dismissed: string[];
  /** Creneaux du planning qui pointaient sur une seance effacee */
  slots: { id: number; trainingId: number }[];
  /** Ressentis (charge Foster) rattaches a une seance effacee */
  loads: Load[];
  /** Seances gardees qui ont recu le ressenti d'une seance effacee */
  movedLoadsTo: number[];
  /** Vrai si les details lourds (trace, frequence cardiaque) n'ont pas pu etre gardes */
  light?: boolean;
  restoredAt?: string;
};

let running: Promise<number> | null = null;

/** Lance le nettoyage s'il n'a jamais tourne. Renvoie le nombre de seances effacees. */
export function runDedupeMigrationOnce(): Promise<number> {
  if (!running) running = run().finally(() => { running = null; });
  return running;
}

async function readLoads(): Promise<Load[]> {
  try {
    const raw = await AsyncStorage.getItem(LOADS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function run(): Promise<number> {
  if ((await AsyncStorage.getItem(DEDUPE_MIGRATION_KEY)) === 'done') return 0;
  const db = await openDatabase();
  const rows = (await db.getAllAsync<Row>('SELECT * FROM trainings')) ?? [];
  const plan = findDuplicatesToDelete(rows as unknown as Training[]);
  if (!plan.length) {
    await AsyncStorage.setItem(DEDUPE_MIGRATION_KEY, 'done');
    return 0;
  }

  const ids = plan.map((p) => p.drop.id as number);
  const idSet = new Set(ids);
  const keptFor: Record<string, number> = {};
  for (const p of plan) keptFor[String(p.drop.id)] = p.keep.id as number;
  const dropRows = rows.filter((r) => idSet.has(r.id));
  // Identifiant de source a ecarter seulement si plus aucune ligne gardee ne le porte
  const keptUuids = new Set(rows.filter((r) => !idSet.has(r.id) && r.healthkit_uuid).map((r) => String(r.healthkit_uuid)));
  const dismissed = [...new Set(plan.filter((p) => p.reason === 'yoroi').map((p) => String(p.drop.healthkit_uuid ?? '')))]
    .filter((u) => u && !keptUuids.has(u));

  const marks = ids.map(() => '?').join(', ');
  let slots: { id: number; trainingId: number }[] = [];
  try {
    slots = ((await db.getAllAsync<{ id: number; training_id: number }>(
      `SELECT id, training_id FROM slot_occurrences WHERE training_id IN (${marks})`, ids,
    )) ?? []).map((s) => ({ id: s.id, trainingId: s.training_id }));
  } catch {
    slots = [];
  }

  const allLoads = await readLoads();
  const loads = allLoads.filter((l) => l.trainingId != null && idSet.has(l.trainingId));
  const withLoad = new Set(allLoads.filter((l) => l.trainingId != null && !idSet.has(l.trainingId)).map((l) => l.trainingId as number));
  const movedLoadsTo: number[] = [];
  const nextLoads: Load[] = [];
  for (const l of allLoads) {
    if (l.trainingId == null || !idSet.has(l.trainingId)) { nextLoads.push(l); continue; }
    const keep = keptFor[String(l.trainingId)];
    // Le ressenti passe sur la seance YOROI gardee si elle n'en a pas, sinon il part avec le doublon
    if (keep != null && !withLoad.has(keep)) {
      withLoad.add(keep);
      movedLoadsTo.push(keep);
      nextLoads.push({ ...l, trainingId: keep });
    }
  }

  // Sauvegarde AVANT d'effacer : sans elle, on n'efface rien et on reessaie au prochain demarrage
  const backup: Backup = { version: 1, at: new Date().toISOString(), rows: dropRows, keptFor, dismissed, slots, loads, movedLoadsTo };
  try {
    await AsyncStorage.setItem(DEDUPE_BACKUP_KEY, JSON.stringify(backup));
  } catch {
    try {
      const light: Backup = { ...backup, light: true, rows: dropRows.map((r) => ({ ...r, workout_details_json: null })) };
      await AsyncStorage.setItem(DEDUPE_BACKUP_KEY, JSON.stringify(light));
    } catch (e) {
      logger.warn('[Doublons] sauvegarde impossible, rien n est efface', e);
      return 0;
    }
  }

  await db.withTransactionAsync(async () => {
    for (const s of slots) {
      const keep = keptFor[String(s.trainingId)];
      await db.runAsync('UPDATE slot_occurrences SET training_id = ? WHERE id = ?', [keep ?? null, s.id]);
    }
    await db.runAsync(`DELETE FROM trainings WHERE id IN (${marks})`, ids);
  });
  if (dismissed.length) await addDismissedImportIds(dismissed);
  if (loads.length) await AsyncStorage.setItem(LOADS_KEY, JSON.stringify(nextLoads));
  await AsyncStorage.setItem(DEDUPE_MIGRATION_KEY, 'done');
  logger.info(`[Doublons] ${ids.length} seance(s) importee(s) en double effacee(s)`);
  DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  return ids.length;
}

/**
 * Remet en base les seances effacees par le nettoyage, avec leurs liens (planning, ressenti),
 * et les retire de la liste des imports ecartes. Renvoie le nombre de seances remises.
 */
export async function restoreDedupeBackup(): Promise<number> {
  const raw = await AsyncStorage.getItem(DEDUPE_BACKUP_KEY);
  if (!raw) return 0;
  const backup = JSON.parse(raw) as Backup;
  if (backup.restoredAt || !Array.isArray(backup.rows) || !backup.rows.length) return 0;
  const db = await openDatabase();
  const cols = new Set(((await db.getAllAsync<{ name: string }>('PRAGMA table_info(trainings)')) ?? []).map((c) => c.name));
  let restored = 0;
  await db.withTransactionAsync(async () => {
    for (const row of backup.rows) {
      const exists = await db.getFirstAsync<{ id: number }>('SELECT id FROM trainings WHERE id = ?', [row.id]);
      if (exists) continue;
      const keys = Object.keys(row).filter((k) => cols.has(k));
      await db.runAsync(
        `INSERT INTO trainings (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
        keys.map((k) => row[k] ?? null),
      );
      restored++;
    }
    for (const s of backup.slots ?? []) {
      const keep = backup.keptFor?.[String(s.trainingId)];
      await db.runAsync(
        'UPDATE slot_occurrences SET training_id = ? WHERE id = ? AND (training_id IS NULL OR training_id = ?)',
        [s.trainingId, s.id, keep ?? -1],
      );
    }
  });
  if (backup.dismissed?.length) await removeDismissedImportIds(backup.dismissed);
  if (backup.loads?.length) {
    const moved = new Set(backup.movedLoadsTo ?? []);
    const same = (a: Load, b: Load) => a.date === b.date && a.rpe === b.rpe && a.duration === b.duration;
    const current = (await readLoads()).filter(
      (l) => !(l.trainingId != null && moved.has(l.trainingId) && backup.loads.some((o) => same(o, l))),
    );
    await AsyncStorage.setItem(LOADS_KEY, JSON.stringify([...current, ...backup.loads]));
  }
  await AsyncStorage.setItem(DEDUPE_BACKUP_KEY, JSON.stringify({ ...backup, restoredAt: new Date().toISOString() }));
  DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  return restored;
}
