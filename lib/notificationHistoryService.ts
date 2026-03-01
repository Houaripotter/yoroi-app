// ============================================
// YOROI - SERVICE HISTORIQUE DES NOTIFICATIONS
// ============================================
// Stocke, recupere et gere l'historique des notifications
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export interface NotificationHistoryItem {
  id: string;
  type: string; // training, hydration, streak, briefing, etc.
  title: string;
  body: string;
  timestamp: number; // Date.now()
  read: boolean;
  data?: Record<string, any>;
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY = '@yoroi_notification_history';
const MAX_NOTIFICATIONS = 100;

// ============================================
// SERVICE
// ============================================

/**
 * Sauvegarde une notification dans l'historique
 */
export async function saveNotification(
  title: string,
  body: string,
  type: string = 'general',
  data?: Record<string, any>,
): Promise<void> {
  try {
    const notifications = await getNotifications();

    const item: NotificationHistoryItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type,
      title,
      body,
      timestamp: Date.now(),
      read: false,
      data,
    };

    notifications.unshift(item);

    // Purge si > MAX_NOTIFICATIONS
    if (notifications.length > MAX_NOTIFICATIONS) {
      notifications.length = MAX_NOTIFICATIONS;
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    logger.error('[NotificationHistory] Erreur sauvegarde:', error);
  }
}

/**
 * Retourne toutes les notifications triees par date desc
 */
export async function getNotifications(): Promise<NotificationHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationHistoryItem[];
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    logger.error('[NotificationHistory] Erreur lecture:', error);
    return [];
  }
}

/**
 * Marque une notification comme lue
 */
export async function markAsRead(id: string): Promise<void> {
  try {
    const notifications = await getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    }
  } catch (error) {
    logger.error('[NotificationHistory] Erreur markAsRead:', error);
  }
}

/**
 * Marque toutes les notifications comme lues
 */
export async function markAllAsRead(): Promise<void> {
  try {
    const notifications = await getNotifications();
    for (const n of notifications) {
      n.read = true;
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    logger.error('[NotificationHistory] Erreur markAllAsRead:', error);
  }
}

/**
 * Supprime une notification
 */
export async function deleteNotification(id: string): Promise<void> {
  try {
    const notifications = await getNotifications();
    const filtered = notifications.filter(n => n.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    logger.error('[NotificationHistory] Erreur deleteNotification:', error);
  }
}

/**
 * Supprime tout l'historique
 */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    logger.error('[NotificationHistory] Erreur clearAll:', error);
  }
}

/**
 * Retourne le nombre de notifications non lues
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const notifications = await getNotifications();
    return notifications.filter(n => !n.read).length;
  } catch (error) {
    logger.error('[NotificationHistory] Erreur getUnreadCount:', error);
    return 0;
  }
}
