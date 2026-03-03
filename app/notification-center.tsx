// ============================================
// YOROI - CENTRE DE NOTIFICATIONS
// ============================================
// Historique de toutes les notifications recues
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Settings,
  Trash2,
  CheckCheck,
  Dumbbell,
  Droplets,
  Flame,
  Moon,
  Trophy,
  Zap,
  MessageCircle,
  Share2,
  Brain,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
  NotificationHistoryItem,
} from '@/lib/notificationHistoryService';

// ============================================
// HELPERS
// ============================================

function getNotifIcon(type: string) {
  switch (type) {
    case 'training':
    case 'workout_completed':
      return Dumbbell;
    case 'hydration':
      return Droplets;
    case 'streak':
      return Flame;
    case 'sleep':
      return Moon;
    case 'achievement':
      return Trophy;
    case 'briefing':
    case 'smart_check':
    case 'smart_missed':
    case 'smart_rest':
    case 'smart_frequency':
    case 'smart_test':
      return Brain;
    case 'social_card_weekly':
    case 'social_card_monthly':
      return Share2;
    case 'weighing':
      return Zap;
    case 'citation':
      return MessageCircle;
    default:
      return Bell;
  }
}

function getNotifColor(type: string, accent: string): string {
  switch (type) {
    case 'training':
    case 'workout_completed':
      return '#FF6B35';
    case 'hydration':
      return '#4FC3F7';
    case 'streak':
      return '#FF5252';
    case 'sleep':
      return '#7C4DFF';
    case 'achievement':
      return '#FFD700';
    case 'briefing':
    case 'smart_check':
    case 'smart_missed':
    case 'smart_rest':
    case 'smart_frequency':
    case 'smart_test':
      return '#26A69A';
    case 'social_card_weekly':
    case 'social_card_monthly':
      return '#42A5F5';
    case 'weighing':
      return '#66BB6A';
    case 'citation':
      return '#AB47BC';
    default:
      return accent;
  }
}

function formatTimeAgo(timestamp: number, locale: string): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  const isFr = locale.startsWith('fr');

  if (minutes < 1) return isFr ? "A l'instant" : 'Just now';
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;

  const date = new Date(timestamp);
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

type DateGroup = 'today' | 'yesterday' | 'week' | 'older';

function getDateGroup(timestamp: number): DateGroup {
  const now = new Date();
  const date = new Date(timestamp);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 7 * 86400000;

  if (timestamp >= todayStart) return 'today';
  if (timestamp >= yesterdayStart) return 'yesterday';
  if (timestamp >= weekStart) return 'week';
  return 'older';
}

function getGroupLabel(group: DateGroup, isFr: boolean): string {
  switch (group) {
    case 'today':
      return isFr ? "Aujourd'hui" : 'Today';
    case 'yesterday':
      return isFr ? 'Hier' : 'Yesterday';
    case 'week':
      return isFr ? 'Cette semaine' : 'This week';
    case 'older':
      return isFr ? 'Plus ancien' : 'Older';
  }
}

// ============================================
// COMPOSANT
// ============================================

export default function NotificationCenterScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { locale } = useI18n();
  const isFr = locale.startsWith('fr');

  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    const data = await getNotifications();
    setNotifications(data);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handleMarkAsRead = useCallback(async (item: NotificationHistoryItem) => {
    if (!item.read) {
      await markAsRead(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
      DeviceEventEmitter.emit('YOROI_NOTIF_READ');
    }
    // Naviguer si l'item a un ecran cible
    if (item.data?.screen) {
      router.push(`/${item.data.screen}` as any);
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    impactAsync(ImpactFeedbackStyle.Light);
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    DeviceEventEmitter.emit('YOROI_NOTIF_READ');
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      isFr ? 'Tout effacer' : 'Clear all',
      isFr ? 'Supprimer toutes les notifications ?' : 'Delete all notifications?',
      [
        { text: isFr ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: isFr ? 'Effacer' : 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            setNotifications([]);
          },
        },
      ],
    );
  }, [isFr]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Grouper par date
  const grouped = notifications.reduce<Record<DateGroup, NotificationHistoryItem[]>>(
    (acc, item) => {
      const group = getDateGroup(item.timestamp);
      acc[group].push(item);
      return acc;
    },
    { today: [], yesterday: [], week: [], older: [] },
  );

  const groupOrder: DateGroup[] = ['today', 'yesterday', 'week', 'older'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.backgroundCard }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Notifications
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/notifications' as any)}
          style={[styles.settingsBtn, { backgroundColor: colors.backgroundCard }]}
          activeOpacity={0.7}
        >
          <Settings size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Actions bar */}
      {notifications.length > 0 && (
        <View style={styles.actionsBar}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              style={[styles.actionBtn, { backgroundColor: `${colors.accent}15` }]}
              activeOpacity={0.7}
            >
              <CheckCheck size={16} color={colors.accent} />
              <Text style={[styles.actionText, { color: colors.accent }]}>
                {isFr ? 'Tout marquer lu' : 'Mark all read'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleClearAll}
            style={[styles.actionBtn, { backgroundColor: `${colors.error || '#FF5252'}15` }]}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={colors.error || '#FF5252'} />
            <Text style={[styles.actionText, { color: colors.error || '#FF5252' }]}>
              {isFr ? 'Tout effacer' : 'Clear all'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Liste */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.textMuted}15` }]}>
              <BellOff size={48} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {isFr ? 'Aucune notification' : 'No notifications'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {isFr
                ? 'Les notifications apparaitront ici'
                : 'Notifications will appear here'}
            </Text>
          </View>
        ) : (
          groupOrder.map(group => {
            const items = grouped[group];
            if (items.length === 0) return null;

            return (
              <View key={group} style={styles.group}>
                <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
                  {getGroupLabel(group, isFr)}
                </Text>

                {items.map(item => {
                  const Icon = getNotifIcon(item.type);
                  const iconColor = getNotifColor(item.type, colors.accent);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleMarkAsRead(item)}
                      onLongPress={() => handleDelete(item.id)}
                      activeOpacity={0.7}
                      style={[
                        styles.notifItem,
                        {
                          backgroundColor: item.read
                            ? colors.backgroundCard
                            : isDark ? `${colors.accent}08` : `${colors.accent}06`,
                          borderColor: item.read
                            ? `${colors.border || colors.textMuted}20`
                            : `${colors.accent}20`,
                        },
                      ]}
                    >
                      {/* Indicateur non-lu */}
                      {!item.read && (
                        <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
                      )}

                      {/* Icone */}
                      <View style={[styles.notifIconContainer, { backgroundColor: `${iconColor}15` }]}>
                        <Icon size={24} color={iconColor} />
                      </View>

                      {/* Contenu */}
                      <View style={styles.notifContent}>
                        <Text
                          style={[
                            styles.notifTitle,
                            { color: colors.textPrimary, fontWeight: item.read ? '600' : '700' },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[styles.notifBody, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {item.body}
                        </Text>
                      </View>

                      {/* Heure */}
                      <Text style={[styles.notifTime, { color: colors.textMuted }]}>
                        {formatTimeAgo(item.timestamp, locale)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  group: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 14,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  notifIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
    gap: 4,
  },
  notifTitle: {
    fontSize: 16,
  },
  notifBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  notifTime: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
