// ============================================
// AUTO BACKUP SERVICE
// Backup automatique quotidien silencieux pour ne jamais perdre de données.
// ============================================
//
// Fonctionnement :
// - À chaque démarrage de l'app, on check la date du dernier backup auto
// - Si > 24h (config) → on déclenche un backup silent
// - Le fichier est auto-pushé sur iCloud/Google Drive si le dossier cloud est configuré
// - Pour éviter de pourrir les perfs au démarrage, on lance avec un delay
// - L'user peut désactiver dans les réglages
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import logger from './security/logger';
import { exportDataToJSON } from './exportService';
import { logSyncEvent } from './syncHistoryService';

// ─── Clés AsyncStorage ─────────────────────────────────────────────────────
const LAST_AUTO_BACKUP_KEY = '@yoroi_last_auto_backup'; // ISO date du dernier auto-backup
const AUTO_BACKUP_ENABLED_KEY = '@yoroi_auto_backup_enabled'; // 'true' | 'false'
const AUTO_BACKUP_INTERVAL_KEY = '@yoroi_auto_backup_interval'; // heures entre backups

// ─── Config par défaut ─────────────────────────────────────────────────────
const DEFAULT_INTERVAL_HOURS = 24;  // Backup auto toutes les 24h
const ACTIVE_USER_INTERVAL = 48;    // Si user très actif (>3 entrées récentes), 48h suffit
const STARTUP_DELAY_MS = 8000;      // Attendre 8s après startup pour ne pas ralentir l'app

// ─── État interne ──────────────────────────────────────────────────────────
let autoBackupTimer: ReturnType<typeof setTimeout> | null = null;
// Promise-based lock (évite la race condition du simple boolean flag) :
// si un backup est déjà en cours, toute nouvelle requête attend le même résultat.
let runningPromise: Promise<boolean> | null = null;

/**
 * Retourne la date ISO du dernier backup auto, ou null si jamais.
 */
export async function getLastAutoBackupDate(): Promise<Date | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_AUTO_BACKUP_KEY);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

/**
 * Retourne la date du dernier push cloud RÉUSSI (peut être différent du dernier
 * backup local si le cloud était down). null si jamais réussi.
 */
export async function getLastCloudSyncSuccessDate(): Promise<Date | null> {
  try {
    const raw = await AsyncStorage.getItem('@yoroi_last_cloud_sync_success');
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

/**
 * Retourne la date du dernier échec de push cloud (pour alerter l'user).
 */
export async function getLastCloudSyncFailureDate(): Promise<Date | null> {
  try {
    const raw = await AsyncStorage.getItem('@yoroi_last_cloud_sync_failure');
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

/**
 * Retourne si l'auto-backup est activé (par défaut : oui).
 */
export async function isAutoBackupEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(AUTO_BACKUP_ENABLED_KEY);
    return raw !== 'false'; // default true
  } catch { return true; }
}

/**
 * Active/désactive l'auto-backup (l'user peut le faire depuis les réglages).
 */
export async function setAutoBackupEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTO_BACKUP_ENABLED_KEY, enabled ? 'true' : 'false');
    DeviceEventEmitter.emit('YOROI_AUTO_BACKUP_CONFIG_CHANGED');
  } catch { /* ignore */ }
}

/**
 * Intervalle en heures entre chaque auto-backup (par défaut : 24h).
 */
export async function getAutoBackupIntervalHours(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(AUTO_BACKUP_INTERVAL_KEY);
    const n = raw ? parseInt(raw, 10) : DEFAULT_INTERVAL_HOURS;
    return isNaN(n) || n < 1 ? DEFAULT_INTERVAL_HOURS : n;
  } catch { return DEFAULT_INTERVAL_HOURS; }
}

export async function setAutoBackupIntervalHours(hours: number): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTO_BACKUP_INTERVAL_KEY, String(hours));
  } catch { /* ignore */ }
}

/**
 * Indique si un auto-backup est dû (délai dépassé).
 */
export async function isAutoBackupDue(): Promise<boolean> {
  const enabled = await isAutoBackupEnabled();
  if (!enabled) return false;

  const last = await getLastAutoBackupDate();
  if (!last) return true; // jamais fait → faire tout de suite

  const intervalHours = await getAutoBackupIntervalHours();
  const elapsedMs = Date.now() - last.getTime();
  const thresholdMs = intervalHours * 60 * 60 * 1000;
  return elapsedMs >= thresholdMs;
}

/**
 * Déclenche un backup auto silent si les conditions sont remplies.
 * Protection par Promise-lock : si un backup est déjà en cours, on retourne
 * la même promise (évite les doubles créations).
 */
export async function runAutoBackupIfDue(): Promise<boolean> {
  // Si un backup est déjà en cours, on partage son résultat au lieu d'en lancer un autre.
  if (runningPromise) {
    logger.info('[AutoBackup] Déjà en cours, attente du résultat partagé');
    return runningPromise;
  }

  const due = await isAutoBackupDue();
  if (!due) {
    logger.info('[AutoBackup] Pas dû maintenant');
    return false;
  }

  runningPromise = (async (): Promise<boolean> => {
    try {
      logger.info('[AutoBackup] Déclenchement backup automatique silent');
      const ok = await exportDataToJSON({ silent: true });
      if (ok) {
        const now = new Date().toISOString();
        await AsyncStorage.setItem(LAST_AUTO_BACKUP_KEY, now);
        DeviceEventEmitter.emit('YOROI_AUTO_BACKUP_DONE', { date: now });
        logger.info('[AutoBackup] ✅ Backup auto terminé avec succès');
        logSyncEvent({ type: 'auto_backup', success: true }).catch(() => {});
        return true;
      }
      logger.warn('[AutoBackup] Export a échoué');
      logSyncEvent({ type: 'auto_backup', success: false, error: 'Export échoué' }).catch(() => {});
      return false;
    } catch (e) {
      logger.error('[AutoBackup] Erreur:', e);
      return false;
    } finally {
      runningPromise = null;
    }
  })();

  return runningPromise;
}

/**
 * À appeler au démarrage de l'app. Lance un backup auto en arrière-plan
 * après un delay (pour ne pas ralentir le démarrage).
 * Idempotent : safe à appeler plusieurs fois.
 *
 * Le timer est AppState-aware : si l'app passe en background pendant le delay,
 * le timer est annulé et re-schedulé à la prochaine activation (évite les
 * backups déclenchés alors que l'app est inactive).
 */
let appStateSubscription: { remove: () => void } | null = null;

export function scheduleAutoBackupOnStartup(): void {
  if (autoBackupTimer !== null) return; // déjà scheduled
  // Pas de backup lourd si iOS a réveillé l'app en arrière-plan (risque de kill mémoire)
  if (AppState.currentState === 'active') {
    autoBackupTimer = setTimeout(() => {
      runAutoBackupIfDue().catch(e => logger.error('[AutoBackup] Erreur startup:', e));
      autoBackupTimer = null;
    }, STARTUP_DELAY_MS);
  }

  // Observe AppState pour annuler si background (et re-schedule à active)
  if (!appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        if (autoBackupTimer !== null) {
          clearTimeout(autoBackupTimer);
          autoBackupTimer = null;
          logger.info('[AutoBackup] Timer annulé (app en background)');
        }
      } else if (next === 'active' && autoBackupTimer === null) {
        // Re-schedule au retour en foreground (si pas déjà en cours)
        if (!runningPromise) {
          autoBackupTimer = setTimeout(() => {
            runAutoBackupIfDue().catch(() => {});
            autoBackupTimer = null;
          }, STARTUP_DELAY_MS);
        }
      }
    });
  }
}

/**
 * Reset le scheduler (utile si l'user désactive dans les réglages).
 */
export function cancelScheduledAutoBackup(): void {
  if (autoBackupTimer !== null) {
    clearTimeout(autoBackupTimer);
    autoBackupTimer = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}
