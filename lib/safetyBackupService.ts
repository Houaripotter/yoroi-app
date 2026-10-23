// ============================================
// SAFETY BACKUP SERVICE
// Déclenche un backup silent AVANT des actions destructives/irréversibles.
// Si l'user regrette → il a toujours un backup "juste avant" à restaurer.
//
// Les safety backups sont stockés dans un bucket SÉPARÉ des auto-backups
// (préfixe `yoroi_safety_*`) pour qu'ils ne soient pas affectés par la
// rotation des 10 auto-backups. On garde les 5 derniers safety backups.
// ============================================

import * as FileSystem from 'expo-file-system/legacy';
import logger from './security/logger';
import { exportDataToJSON } from './exportService';

let pendingBackup: Promise<boolean> | null = null;
const SAFETY_BACKUP_PREFIX = 'yoroi_safety_';
const MAX_SAFETY_BACKUPS = 5;

/**
 * Déclenche un backup silent avant une action risquée (reset profil, suppression
 * massive de clubs, trash vidé, import qui écrase, etc.).
 *
 * Idempotent : si un backup est déjà en cours, on attend celui-là.
 * Timeout 5s : si ça prend trop de temps, on n'empêche pas l'action.
 *
 * @param label Description de l'action pour le log (ex: "reset profil")
 * @returns true si le backup a réussi, false sinon
 */
export async function runSafetyBackup(label: string): Promise<boolean> {
  if (pendingBackup) {
    logger.info(`[SafetyBackup] (${label}) Un backup est déjà en cours, on attend`);
    return pendingBackup;
  }

  logger.info(`[SafetyBackup] (${label}) Backup de sécurité avant action risquée`);
  pendingBackup = (async () => {
    try {
      const ok = await Promise.race<boolean>([
        exportDataToJSON({ silent: true }),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
      ]);
      if (ok) {
        // Rename le dernier auto-backup en safety backup (bucket séparé)
        await renameLatestBackupAsSafety(label).catch((e) => logger.warn('[SafetyBackup] Rename échoué:', e));
        await rotateSafetyBackups().catch((e) => logger.warn('[SafetyBackup] Rotation échouée:', e));
        logger.info(`[SafetyBackup] ✅ (${label}) Backup de sécurité créé`);
      } else {
        logger.warn(`[SafetyBackup] ⚠️ (${label}) Backup de sécurité échoué ou timeout, on continue quand même`);
      }
      return ok;
    } catch (e) {
      logger.error(`[SafetyBackup] (${label}) Erreur:`, e);
      return false;
    } finally {
      pendingBackup = null;
    }
  })();

  return pendingBackup;
}

/**
 * Renomme le dernier backup créé pour le déplacer dans le bucket "safety".
 * Ça le protège de la rotation des auto-backups (10 max).
 */
async function renameLatestBackupAsSafety(label: string): Promise<void> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return;
  const files = await FileSystem.readDirectoryAsync(dir);
  const backups = files
    .filter((f) => f.startsWith('yoroi_backup_') && f.endsWith('.json'))
    .sort()
    .reverse();
  const latest = backups[0];
  if (!latest) return;

  const safeLabel = label.replace(/[^a-z0-9-]/gi, '_').toLowerCase();
  const newName = latest.replace('yoroi_backup_', `${SAFETY_BACKUP_PREFIX}${safeLabel}_`);
  await FileSystem.moveAsync({ from: `${dir}${latest}`, to: `${dir}${newName}` });
  logger.info(`[SafetyBackup] Renommé en safety : ${newName}`);
}

/**
 * Garde les N derniers safety backups, supprime les plus vieux.
 */
async function rotateSafetyBackups(): Promise<void> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return;
  const files = await FileSystem.readDirectoryAsync(dir);
  const safeties = files
    .filter((f) => f.startsWith(SAFETY_BACKUP_PREFIX) && f.endsWith('.json'))
    .sort()
    .reverse();
  if (safeties.length <= MAX_SAFETY_BACKUPS) return;
  const toDelete = safeties.slice(MAX_SAFETY_BACKUPS);
  for (const name of toDelete) {
    await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true }).catch(() => {});
  }
  logger.info(`[SafetyBackup] Rotation : ${toDelete.length} anciens safety backups supprimés`);
}

/**
 * Liste les safety backups disponibles (pour l'UI "Restaurer à un état précédent").
 */
export async function listSafetyBackups(): Promise<Array<{ name: string; label: string; date: Date; path: string }>> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return [];
  try {
    const files = await FileSystem.readDirectoryAsync(dir);
    return files
      .filter((f) => f.startsWith(SAFETY_BACKUP_PREFIX) && f.endsWith('.json'))
      .map((name) => {
        // Format : yoroi_safety_<label>_YYYY-MM-DD_HHhMM.json
        const match = name.match(/^yoroi_safety_([a-z0-9-_]+)_(\d{4}-\d{2}-\d{2}_\d{2}h\d{2})\.json$/i);
        const label = match?.[1] ?? 'unknown';
        const dateStr = match?.[2] ?? '';
        const date = dateStr
          ? new Date(dateStr.replace('_', 'T').replace(/h/, ':').concat(':00'))
          : new Date(0);
        return { name, label, date, path: `${dir}${name}` };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch {
    return [];
  }
}
