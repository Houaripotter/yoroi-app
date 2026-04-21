// ============================================
// BACKUP SHARE SERVICE
// Partage un backup via le sheet système natif (email, WhatsApp, AirDrop,
// Drive, Dropbox, etc.). Fallback pour les users qui n'ont pas configuré
// de dossier cloud mais veulent quand même une sauvegarde externe.
// ============================================

import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { Alert } from 'react-native';
import logger from './security/logger';

/**
 * Retourne le chemin du dernier backup local disponible, ou null si aucun.
 */
export async function getLatestLocalBackupPath(): Promise<string | null> {
  const dir = FileSystem.documentDirectory;
  if (!dir) return null;
  try {
    const files = await FileSystem.readDirectoryAsync(dir);
    const backups = files
      .filter((f) => f.startsWith('yoroi_backup_') && f.endsWith('.json'))
      .sort()
      .reverse();
    if (backups.length === 0) return null;
    return `${dir}${backups[0]}`;
  } catch (e) {
    logger.error('[BackupShare] Erreur listing backups:', e);
    return null;
  }
}

/**
 * Ouvre le partage système natif pour envoyer le dernier backup.
 * L'user choisit : email, WhatsApp, Telegram, AirDrop, Google Drive, etc.
 */
export async function shareLatestBackup(): Promise<boolean> {
  try {
    const path = await getLatestLocalBackupPath();
    if (!path) {
      Alert.alert('Aucune sauvegarde', 'Crée d\'abord une sauvegarde avant de la partager.');
      return false;
    }

    const canShare = await isAvailableAsync();
    if (!canShare) {
      Alert.alert('Partage indisponible', "Le partage n'est pas disponible sur ce device.");
      return false;
    }

    await shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Partager ta sauvegarde',
      UTI: 'public.json',
    });
    logger.info('[BackupShare] Backup partagé:', path.split('/').pop());
    return true;
  } catch (e) {
    logger.error('[BackupShare] Erreur partage:', e);
    Alert.alert('Erreur', 'Impossible de partager la sauvegarde.');
    return false;
  }
}

/**
 * Partage un fichier backup spécifique (par ex. un safety backup).
 */
export async function shareBackupFile(path: string): Promise<boolean> {
  try {
    const canShare = await isAvailableAsync();
    if (!canShare) {
      Alert.alert('Partage indisponible', "Le partage n'est pas disponible sur ce device.");
      return false;
    }
    await shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Partager cette sauvegarde',
      UTI: 'public.json',
    });
    return true;
  } catch (e) {
    logger.error('[BackupShare] Erreur partage fichier:', e);
    return false;
  }
}
