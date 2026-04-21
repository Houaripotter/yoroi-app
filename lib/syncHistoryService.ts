// ============================================
// SYNC HISTORY SERVICE
// Log de toutes les opérations de backup / sync pour diagnostic et transparence.
// L'user peut voir quand et comment ses données ont été sauvegardées.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import logger from './security/logger';

const HISTORY_KEY = '@yoroi_sync_history';
const MAX_ENTRIES = 100;

export type SyncEventType =
  | 'auto_backup'        // Backup auto quotidien
  | 'manual_backup'      // Backup manuel (bouton Sauvegarder)
  | 'safety_backup'      // Safety backup avant action risquée
  | 'cloud_push'         // Push vers iCloud/Drive
  | 'cloud_pull'         // Restauration depuis cloud (CloudSync)
  | 'peer_sync'          // Sync Bluetooth/WiFi iPhone ↔ iPad
  | 'import_file'        // Import manuel d'un fichier .json
  | 'restore_safety'     // Restauration depuis safety backup
  | 'watch_sync'         // Sync Apple Watch / Wear OS
  | 'export_share';      // Partage via email/WhatsApp/etc.

export interface SyncEvent {
  type: SyncEventType;
  timestamp: string;     // ISO
  success: boolean;
  details?: string;
  itemsCount?: number;
  sizeBytes?: number;
  device?: string;       // ex: "iPad de Houari"
  error?: string;
}

/**
 * Log un événement de sync.
 * Garde les 100 derniers événements.
 */
export async function logSyncEvent(event: Omit<SyncEvent, 'timestamp'>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const list: SyncEvent[] = raw ? JSON.parse(raw) : [];
    const entry: SyncEvent = { ...event, timestamp: new Date().toISOString() };
    list.unshift(entry); // plus récent en premier
    if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES;
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    DeviceEventEmitter.emit('YOROI_SYNC_HISTORY_UPDATED');
  } catch (e) {
    logger.warn('[SyncHistory] Erreur log:', e);
  }
}

/**
 * Récupère l'historique complet (max 100 entrées).
 */
export async function getSyncHistory(): Promise<SyncEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/**
 * Efface tout l'historique.
 */
export async function clearSyncHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
    DeviceEventEmitter.emit('YOROI_SYNC_HISTORY_UPDATED');
  } catch { /* ignore */ }
}

/**
 * Helpers de labels pour l'UI.
 */
export const SYNC_EVENT_LABELS: Record<SyncEventType, { label: string; emoji: string; color: string }> = {
  auto_backup:     { label: 'Backup automatique', emoji: '🔄', color: '#0EA5E9' },
  manual_backup:   { label: 'Backup manuel',      emoji: '💾', color: '#3B82F6' },
  safety_backup:   { label: 'Backup de sécurité', emoji: '🛡️', color: '#F59E0B' },
  cloud_push:      { label: 'Push cloud',          emoji: '☁️', color: '#10B981' },
  cloud_pull:      { label: 'Sync depuis cloud',   emoji: '⬇️', color: '#06B6D4' },
  peer_sync:       { label: 'Sync iPhone ↔ iPad',  emoji: '📱', color: '#8B5CF6' },
  import_file:     { label: 'Import fichier',      emoji: '📥', color: '#EF4444' },
  restore_safety:  { label: 'Retour état précédent', emoji: '↩️', color: '#F97316' },
  watch_sync:      { label: 'Sync Watch',          emoji: '⌚', color: '#6366F1' },
  export_share:    { label: 'Partage',             emoji: '📤', color: '#EC4899' },
};
