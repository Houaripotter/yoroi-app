// ============================================
// MULTI-DEVICE SYNC SERVICE
// Détecte si un backup plus récent existe dans le dossier cloud partagé
// (iCloud Drive ou Google Drive), et propose à l'user de restaurer.
// ============================================
//
// Fonctionnement :
// 1. Au démarrage, si cloud configuré → lister les backups cloud
// 2. Comparer la date du plus récent avec la date du dernier backup LOCAL
// 3. Si cloud > local de > 10 min → proposer à l'user
// 4. User tap "Restaurer" → télécharger le fichier cloud + importer
//
// Ça permet : iPhone crée backup → iPad démarre, voit le backup plus récent,
// propose "Ton iPhone a du nouveau contenu, synchroniser ?" → sync auto
//
// Plateforme : iOS (iCloud Drive auto-sync) + Android (dossier Google Drive/Dropbox)
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import logger from './security/logger';
import { getSavedCloudFolder, listCloudBackups, readCloudBackupFile } from './cloudFolderService';
import { importDataFromBackupObject } from './exportService';
import { vitrineActive } from './v2/visite/vitrine';
import { traduire } from '@/lib/i18n/tr';

// Clé pour tracker le dernier backup cloud déjà connu (éviter double-prompt)
const LAST_KNOWN_CLOUD_BACKUP_KEY = '@yoroi_last_known_cloud_backup';
const LAST_KNOWN_CLOUD_FINGERPRINT_KEY = '@yoroi_last_known_cloud_fingerprint';

// Seuil : si le backup cloud est plus récent que notre "dernier connu" de X minutes, on propose
const FRESHNESS_THRESHOLD_MIN = 5;
// Tolerance : on considère un backup comme "probablement le nôtre" s'il est
// créé dans les N secondes après notre dernier push cloud
const OWN_BACKUP_TOLERANCE_SEC = 120;

// Delay au démarrage avant de check (ne pas ralentir le lancement)
const STARTUP_CHECK_DELAY_MS = 12000; // 12s

let scheduledTimer: ReturnType<typeof setTimeout> | null = null;
let isChecking = false;

export interface CloudSyncPrompt {
  cloudBackupName: string;
  cloudBackupDate: Date;
  cloudBackupSize: number;
  onAccept: () => Promise<boolean>;
  onDismiss: () => void;
}

/**
 * Check si un backup plus récent existe dans le cloud partagé.
 * Émet l'event 'YOROI_CLOUD_SYNC_AVAILABLE' avec les infos si oui.
 * L'UI (banner sur l'accueil) écoute cet event pour afficher le prompt.
 */
export async function checkForCloudSync(): Promise<void> {
  if (isChecking) return;
  // 18 octobre 2026 : pendant la visite guidee avec l'exemple, pas de comparaison avec le cloud (l'exemple n'est pas tes donnees)
  if (vitrineActive()) return;
  isChecking = true;
  try {
    const cloud = await getSavedCloudFolder();
    if (!cloud) {
      logger.info('[MultiDeviceSync] Pas de cloud configuré, skip');
      return;
    }

    // Liste les backups cloud
    let backups: Array<{ name: string; size: number; modifiedAt: number }> = [];
    try {
      backups = await listCloudBackups();
    } catch (e) {
      logger.warn('[MultiDeviceSync] Erreur listing cloud:', e);
      return;
    }

    if (!backups.length) return;

    // Le plus récent
    const sorted = backups.slice().sort((a, b) => b.modifiedAt - a.modifiedAt);
    const latest = sorted[0];

    // Compare avec notre "dernier connu" (timestamp + fingerprint nom)
    const lastKnownRaw = await AsyncStorage.getItem(LAST_KNOWN_CLOUD_BACKUP_KEY);
    const lastKnownMs = lastKnownRaw ? parseInt(lastKnownRaw, 10) : 0;
    const lastKnownFingerprint = await AsyncStorage.getItem(LAST_KNOWN_CLOUD_FINGERPRINT_KEY);

    // Fingerprint = nom du fichier (contient date+heure unique) + size
    // Plus fiable que le timestamp seul (qui varie selon le système de fichier cloud)
    const currentFingerprint = `${latest.name}|${latest.size}`;

    // Si le fingerprint est le même → c'est exactement le même fichier, rien à faire
    if (currentFingerprint === lastKnownFingerprint) {
      logger.info('[MultiDeviceSync] Même fichier que dernière vue, skip');
      return;
    }

    // Si le plus récent est plus vieux OU identique → rien à faire
    if (latest.modifiedAt <= lastKnownMs) {
      logger.info('[MultiDeviceSync] Pas de backup plus récent dans le cloud');
      return;
    }

    // Si le backup cloud correspond probablement à notre dernier push cloud,
    // on le mémorise sans prompt. On compare avec `@yoroi_last_cloud_sync_success`.
    const ourLastPushRaw = await AsyncStorage.getItem('@yoroi_last_cloud_sync_success');
    const ourLastPushMs = ourLastPushRaw ? new Date(ourLastPushRaw).getTime() : 0;
    if (ourLastPushMs > 0 && Math.abs(latest.modifiedAt - ourLastPushMs) < OWN_BACKUP_TOLERANCE_SEC * 1000) {
      logger.info('[MultiDeviceSync] Backup cloud correspond à notre dernier push, on mémorise sans prompter');
      await AsyncStorage.setItem(LAST_KNOWN_CLOUD_BACKUP_KEY, String(latest.modifiedAt));
      await AsyncStorage.setItem(LAST_KNOWN_CLOUD_FINGERPRINT_KEY, currentFingerprint);
      return;
    }

    // Seuil : on ne prompte que si l'écart est significatif (5 min par défaut)
    const diffMs = latest.modifiedAt - lastKnownMs;
    if (diffMs < FRESHNESS_THRESHOLD_MIN * 60 * 1000 && lastKnownMs > 0) {
      logger.info('[MultiDeviceSync] Écart trop faible, skip');
      return;
    }

    logger.info(`[MultiDeviceSync] ✨ Backup cloud plus récent détecté : ${latest.name}`);

    // Émet l'event pour que l'UI affiche le prompt
    DeviceEventEmitter.emit('YOROI_CLOUD_SYNC_AVAILABLE', {
      cloudBackupName: latest.name,
      cloudBackupDate: new Date(latest.modifiedAt),
      cloudBackupSize: latest.size,
    });

    // Notification locale : une seule fois par sauvegarde (avant, elle revenait à chaque ouverture)
    const NOTIFIED_KEY = '@yoroi_cloud_sync_notified_fp';
    const notifFingerprint = `${latest.name}|${latest.modifiedAt}`;
    try {
      if ((await AsyncStorage.getItem(NOTIFIED_KEY)) === notifFingerprint) return;
      await AsyncStorage.setItem(NOTIFIED_KEY, notifFingerprint);
    } catch {}
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: traduire('Nouveau contenu depuis ton autre appareil'),
          body: traduire('Une copie plus récente t’attend. Ouvre YOROI pour la récupérer.'),
          data: { type: 'cloud_sync_available', backupName: latest.name },
          sound: 'default',
        },
        trigger: null, // immédiate
      });
    } catch (e) {
      logger.warn('[MultiDeviceSync] Notification push échouée:', e);
    }
  } finally {
    isChecking = false;
  }
}

/**
 * Accepte la sync : télécharge le backup cloud et l'importe.
 */
export async function acceptCloudSync(cloudBackupName: string): Promise<boolean> {
  try {
    logger.info(`[MultiDeviceSync] Début sync depuis : ${cloudBackupName}`);
    const content = await readCloudBackupFile(cloudBackupName);
    if (!content) {
      logger.warn('[MultiDeviceSync] Fichier cloud vide');
      return false;
    }
    const data = JSON.parse(content);
    const ok = await importDataFromBackupObject(data);
    if (ok) {
      // Mémoriser qu'on connaît ce backup pour ne pas re-prompter
      const backups = await listCloudBackups().catch(() => []);
      const found = backups.find(b => b.name === cloudBackupName);
      if (found) {
        await AsyncStorage.setItem(LAST_KNOWN_CLOUD_BACKUP_KEY, String(found.modifiedAt));
        await AsyncStorage.setItem(LAST_KNOWN_CLOUD_FINGERPRINT_KEY, `${found.name}|${found.size}`);
      }
      DeviceEventEmitter.emit('YOROI_CLOUD_SYNC_DONE');
    }
    return ok;
  } catch (e) {
    logger.error('[MultiDeviceSync] Erreur sync:', e);
    return false;
  }
}

/**
 * Dismiss : l'user refuse cette fois. On mémorise qu'on a vu ce backup pour
 * ne pas lui redemander au prochain démarrage.
 */
export async function dismissCloudSync(cloudBackupDate: Date): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_KNOWN_CLOUD_BACKUP_KEY, String(cloudBackupDate.getTime()));
  } catch { /* ignore */ }
}

/**
 * Schedule un check au démarrage après un delay (non bloquant).
 * AppState-aware : annule le timer si l'app passe en background pendant le delay.
 */
let syncAppStateSub: { remove: () => void } | null = null;

export function scheduleCloudSyncCheckOnStartup(): void {
  if (scheduledTimer !== null) return;
  // Pas de vérification si iOS a réveillé l'app en arrière-plan (HealthKit, Watch)
  if (AppState.currentState === 'active') {
    scheduledTimer = setTimeout(() => {
      checkForCloudSync().catch(e => logger.error('[MultiDeviceSync] Erreur startup:', e));
      scheduledTimer = null;
    }, STARTUP_CHECK_DELAY_MS);
  }

  if (!syncAppStateSub) {
    syncAppStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if ((next === 'background' || next === 'inactive') && scheduledTimer !== null) {
        clearTimeout(scheduledTimer);
        scheduledTimer = null;
        logger.info('[MultiDeviceSync] Timer annulé (app en background)');
      } else if (next === 'active' && scheduledTimer === null && !isChecking) {
        scheduledTimer = setTimeout(() => {
          checkForCloudSync().catch(() => {});
          scheduledTimer = null;
        }, STARTUP_CHECK_DELAY_MS);
      }
    });
  }
}

export function cancelScheduledCloudSyncCheck(): void {
  if (scheduledTimer !== null) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
  if (syncAppStateSub) {
    syncAppStateSub.remove();
    syncAppStateSub = null;
  }
}
