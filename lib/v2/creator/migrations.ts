/**
 * Etat des migrations de YOROI, en lecture seule, pour la rubrique Donnees du Studio.
 * Rien n'est ecrit ici : le retour du nettoyage des doublons passe par restoreDedupeBackup()
 * (lib/v2/seances/dedupeMigration.ts), derriere une double confirmation dans le Studio.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEDUPE_BACKUP_KEY, DEDUPE_MIGRATION_KEY } from '@/lib/v2/seances/dedupeMigration';
import { formatDateTime } from './deviceInfo';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type MigrationRow = { id: string; label: string; state: string; done: boolean; detail?: string };

export type DedupeBackupInfo = { exists: boolean; rows: number; at: string | null; restoredAt: string | null };

function when(iso: unknown): string | null {
  if (typeof iso !== 'string' || !iso) return null;
  const t = Date.parse(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return Number.isFinite(t) ? formatDateTime(t) : iso;
}

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function readDedupeBackup(): Promise<DedupeBackupInfo> {
  const b = parse<{ at?: string; rows?: unknown[]; restoredAt?: string }>(await AsyncStorage.getItem(DEDUPE_BACKUP_KEY).catch(() => null));
  if (!b) return { exists: false, rows: 0, at: null, restoredAt: null };
  return { exists: true, rows: Array.isArray(b.rows) ? b.rows.length : 0, at: when(b.at), restoredAt: when(b.restoredAt) };
}

export async function readMigrations(): Promise<MigrationRow[]> {
  const keys = [DEDUPE_MIGRATION_KEY, 'yoroi_armure_meta_v1', '@yoroi_avatar_migration_v2_done', '@yoroi_sleep_migrated_to_async', '@yoroi_import_version', '@yoroi_full_history_imported', '@yoroi_last_health_sync'];
  const got = Object.fromEntries(await AsyncStorage.multiGet(keys).catch(() => keys.map((k) => [k, null] as [string, null])));
  const rows: MigrationRow[] = [];

  const dedupe = await readDedupeBackup();
  const dedupeDone = got[DEDUPE_MIGRATION_KEY] === 'done';
  rows.push({
    id: 'dedupe',
    label: traduire('Nettoyage des doublons (yoroi_dedupe_v1)'),
    done: dedupeDone,
    state: dedupeDone ? 'Fait' : traduire('Pas encore lancé'),
    detail: dedupe.exists
      ? traduirePluriel(dedupe.rows, dedupe.rows > 1, "{0} séance mise de côté{1}{2}", "{0} séances mises de côté{1}{2}", dedupe.rows, dedupe.at ? ` le ${dedupe.at}` : '', dedupe.restoredAt ? `, remises le ${dedupe.restoredAt}` : '')
      : dedupeDone
        ? traduire('Aucun doublon trouvé, rien de mis de côté')
        : undefined,
  });

  const meta = parse<{ v?: number; migratedAt?: string | null; catchupDone?: string | null; catchupPending?: string | null; welcomeSeen?: boolean }>(got['yoroi_armure_meta_v1']);
  const v = Number(meta?.v ?? 0);
  rows.push({
    id: 'armure',
    label: traduire('Reprise des rangs (armure v3)'),
    done: v >= 3,
    state: meta ? (v >= 3 ? 'Faite, version 3' : traduire("Version {0}, la reprise v3 se fera au prochain calcul", v)) : traduire('Pas encore lancée'),
    detail: meta
      ? [
          meta.migratedAt ? `première reprise le ${when(meta.migratedAt)}` : null,
          meta.catchupDone ? `dernier rattrapage le ${when(meta.catchupDone)}` : null,
          meta.catchupPending ? `rattrapage demandé jusqu’au ${when(meta.catchupPending)}` : null,
          meta.welcomeSeen ? 'bienvenue des anciens vue' : null,
        ]
          .filter(Boolean)
          .join(', ') || undefined
      : undefined,
  });

  const flag = (id: string, label: string, key: string, doneValue?: string) => {
    const val = got[key];
    const done = doneValue ? val === doneValue : val !== null && val !== undefined && val !== 'false';
    rows.push({ id, label, done, state: done ? 'Fait' : traduire('Pas encore'), detail: val && val !== 'true' && val !== 'done' ? `valeur ${String(val).slice(0, 40)}` : undefined });
  };
  flag('avatar', traduire('Anciens avatars vers le personnage'), '@yoroi_avatar_migration_v2_done');
  flag('sommeil', traduire('Sommeil déplacé dans le stockage local'), '@yoroi_sleep_migrated_to_async');
  flag('import', traduire('Import de l’historique santé'), '@yoroi_full_history_imported');
  const ver = got['@yoroi_import_version'];
  if (ver) rows.push({ id: 'import_version', label: traduire('Version de l’import santé'), done: true, state: String(ver) });
  return rows;
}
