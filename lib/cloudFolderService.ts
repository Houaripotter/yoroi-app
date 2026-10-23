// ============================================================
// YOROI : Service de connexion au dossier cloud natif
// ============================================================
// Wraps YoroiCloudModule (Swift sur iOS, Kotlin sur Android)
// pour accéder à un dossier sélectionné par l'utilisateur.
//
// iOS  : UIDocumentPickerViewController + security-scoped bookmark
// Android : Storage Access Framework (ACTION_OPEN_DOCUMENT_TREE)
//           + permission URI persistante dans SharedPreferences
//
// Compatible iCloud Drive, Google Drive, OneDrive, Dropbox,
// stockage local… (tout ce que l'app Fichiers / le gestionnaire
// de fichiers Android expose).
// ============================================================

import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import logger from '@/lib/security/logger';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CloudFolder {
  displayName: string;
  bookmark: string; // URI string (iOS : base64 bookmark / Android : content URI)
}

export interface CloudBackupFile {
  name: string;
  size: number;
  modifiedAt: number; // ms
  source: 'cloud';
}

// ─────────────────────────────────────────────
// Accès au module natif
// ─────────────────────────────────────────────

const { YoroiCloudModule } = NativeModules;

function isSupported(): boolean {
  return !!YoroiCloudModule;
}

// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────

/**
 * Ouvre le sélecteur de dossier natif (iOS : UIDocumentPicker, Android : SAF).
 * Retourne les infos du dossier sélectionné, ou null si annulé.
 */
export async function pickCloudFolder(): Promise<CloudFolder | null> {
  if (!isSupported()) return null;
  try {
    const result = await YoroiCloudModule.pickFolder();
    if (!result || result === null) return null;
    return result as CloudFolder;
  } catch (error) {
    logger.error('[CloudFolder] Erreur pickFolder:', error);
    return null;
  }
}

/**
 * Retourne le dossier cloud actuellement connecté, ou null.
 */
export async function getSavedCloudFolder(): Promise<CloudFolder | null> {
  if (!isSupported()) return null;
  try {
    const result = await YoroiCloudModule.getSavedFolder();
    if (!result || result === null) return null;
    return result as CloudFolder;
  } catch (error) {
    logger.error('[CloudFolder] Erreur getSavedFolder:', error);
    return null;
  }
}

/**
 * Liste les fichiers yoroi_backup_*.json dans le dossier cloud connecté.
 * Retourne un tableau vide si aucun dossier connecté ou erreur.
 */
export async function listCloudBackups(): Promise<CloudBackupFile[]> {
  if (!isSupported()) return [];
  try {
    const result = await YoroiCloudModule.listBackups();
    return Array.isArray(result) ? (result as CloudBackupFile[]) : [];
  } catch (error) {
    logger.error('[CloudFolder] Erreur listBackups:', error);
    return [];
  }
}

/**
 * Lit le contenu d'un fichier backup dans le dossier cloud.
 * Retourne la chaîne JSON ou null si erreur.
 */
export async function readCloudBackupFile(fileName: string): Promise<string | null> {
  if (!isSupported()) return null;
  try {
    const content = await YoroiCloudModule.readBackupFile(fileName);
    return typeof content === 'string' ? content : null;
  } catch (error) {
    logger.error('[CloudFolder] Erreur readBackupFile:', error);
    return null;
  }
}

/**
 * Copie un fichier local vers le dossier cloud connecté.
 * Accepte un URI expo-file-system (file://...) ou un chemin absolu.
 * Retourne true si succès.
 */
export async function copyToCloudFolder(localUri: string): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    // Android : le module natif attend un chemin absolu (pas de file://)
    // iOS     : idem, le module Swift accepte un chemin sans file://
    const cleanPath = localUri.startsWith('file://')
      ? decodeURIComponent(localUri.slice(7))
      : localUri;

    const result = await YoroiCloudModule.copyToCloudFolder(cleanPath);
    return result === true;
  } catch (error) {
    logger.error('[CloudFolder] Erreur copyToCloudFolder:', error);
    return false;
  }
}

/**
 * Copie le dernier backup local vers le dossier cloud connecté.
 * Utile pour sync automatique après chaque export.
 * Retourne true si succès.
 */
export async function syncLatestBackupToCloud(): Promise<boolean> {
  if (!isSupported()) return false;
  try {
    const dir = FileSystem.documentDirectory!;
    const files = await FileSystem.readDirectoryAsync(dir);
    const backupFiles = files
      .filter(f => f.startsWith('yoroi_backup_') && f.endsWith('.json'))
      .sort()
      .reverse(); // plus récent en premier

    if (backupFiles.length === 0) return false;

    const latestUri = `${dir}${backupFiles[0]}`;
    return await copyToCloudFolder(latestUri);
  } catch (error) {
    logger.error('[CloudFolder] Erreur syncLatestBackupToCloud:', error);
    return false;
  }
}

/**
 * Déconnecte le dossier cloud (supprime le bookmark / l'URI persisté).
 */
export async function disconnectCloudFolder(): Promise<void> {
  if (!isSupported()) return;
  try {
    await YoroiCloudModule.disconnectFolder();
  } catch (error) {
    logger.error('[CloudFolder] Erreur disconnectFolder:', error);
  }
}
