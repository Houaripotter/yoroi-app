// ============================================
// YOROI - NOTIFICATION BELL POPUP
// ============================================
// Cloche avec badge + mini popup de notifications recentes
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import { router } from 'expo-router';
import {
  Bell,
  BellOff,
  Settings,
  ChevronRight,
  Dumbbell,
  Droplets,
  Flame,
  Moon,
  Trophy,
  Zap,
  MessageCircle,
  Share2,
  Brain,
  Timer,
  Heart,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  NotificationHistoryItem,
} from '@/lib/notificationHistoryService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// HELPERS (identiques au notification-center)
// ============================================

function getNotifIcon(type: string) {
  switch (type) {
    case 'training':
    case 'workout_completed':
    case 'workout_complete':
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
    case 'timer':
      return Timer;
    case 'health_tip':
      return Heart;
    default:
      return Bell;
  }
}

function getNotifColor(type: string, accent: string): string {
  switch (type) {
    case 'training':
    case 'workout_completed':
    case 'workout_complete':
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
    case 'timer':
      return '#FF9800';
    case 'health_tip':
      return '#EC407A';
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

// ============================================
// PROPS
// ============================================

interface NotificationBellPopupProps {
  unreadCount: number;
  onCountChange?: (count: number) => void;
  variant?: 'light' | 'themed';
}

// ============================================
// COMPOSANT
// ============================================

export const NotificationBellPopup: React.FC<NotificationBellPopupProps> = ({
  unreadCount,
  onCountChange,
  variant = 'themed',
}) => {
  const { colors, isDark } = useTheme();
  const { locale } = useI18n();
  const isFr = locale.startsWith('fr');

  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  // Rafraichir le compteur depuis le storage (au cas ou il a change)
  const refreshCount = useCallback(async () => {
    const count = await getUnreadCount();
    if (count !== unreadCount) {
      onCountChange?.(count);
    }
  }, [unreadCount, onCountChange]);

  const loadNotifications = useCallback(async () => {
    const data = await getNotifications();
    setNotifications(data.slice(0, 8));
  }, []);

  const openPopup = useCallback(async () => {
    impactAsync(ImpactFeedbackStyle.Light);
    await loadNotifications();
    await refreshCount();
    setVisible(true);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [loadNotifications, fadeAnim, scaleAnim]);

  const closePopup = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [fadeAnim, scaleAnim]);

  const handleItemPress = useCallback(async (item: NotificationHistoryItem) => {
    if (!item.read) {
      await markAsRead(item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
      const newCount = await getUnreadCount();
      onCountChange?.(newCount);
    }
    if (item.data?.screen) {
      closePopup();
      setTimeout(() => router.push(`/${item.data!.screen}` as any), 200);
    }
  }, [closePopup, onCountChange]);

  const handleMarkAllRead = useCallback(async () => {
    impactAsync(ImpactFeedbackStyle.Light);
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    onCountChange?.(0);
  }, [onCountChange]);

  const handleOpenFull = useCallback(() => {
    closePopup();
    setTimeout(() => router.push('/notification-center' as any), 200);
  }, [closePopup]);

  const handleOpenSettings = useCallback(() => {
    closePopup();
    setTimeout(() => router.push('/notifications' as any), 200);
  }, [closePopup]);

  const bellColor = variant === 'light' ? '#FFFFFF' : colors.textMuted;
  const badgeBorderColor = variant === 'light' ? '#000000' : (isDark ? '#0D0D0F' : '#FFFFFF');

  const unreadInPopup = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Bouton Cloche */}
      <TouchableOpacity
        onPress={openPopup}
        activeOpacity={0.7}
        style={styles.bellBtn}
      >
        <Bell size={variant === 'light' ? 20 : 22} color={bellColor} strokeWidth={2} />
        {unreadCount > 0 && (
          <View style={[styles.bellBadge, { borderColor: badgeBorderColor }]}>
            <Text style={styles.bellBadgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Popup Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closePopup}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closePopup}
        >
          <Animated.View
            style={[
              styles.popup,
              {
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderColor: isDark ? `${colors.textMuted}20` : '#E5E7EB',
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Header du popup */}
              <View style={styles.popupHeader}>
                <View style={styles.popupHeaderLeft}>
                  <Bell size={18} color={colors.accent} />
                  <Text style={[styles.popupTitle, { color: colors.textPrimary }]}>
                    Notifications
                  </Text>
                  {unreadInPopup > 0 && (
                    <View style={[styles.countChip, { backgroundColor: `${colors.accent}20` }]}>
                      <Text style={[styles.countChipText, { color: colors.accent }]}>
                        {unreadInPopup}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.popupHeaderRight}>
                  {unreadInPopup > 0 && (
                    <TouchableOpacity
                      onPress={handleMarkAllRead}
                      style={[styles.markAllBtn, { backgroundColor: `${colors.accent}12` }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.markAllText, { color: colors.accent }]}>
                        {isFr ? 'Tout lire' : 'Read all'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleOpenSettings}
                    style={[styles.gearBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}
                    activeOpacity={0.7}
                  >
                    <Settings size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Separateur colore */}
              <View style={[styles.separator, { backgroundColor: `${colors.accent}30` }]} />

              {/* Liste */}
              <ScrollView
                style={styles.popupList}
                contentContainerStyle={styles.popupListContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
                      <BellOff size={32} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {isFr ? 'Aucune notification' : 'No notifications'}
                    </Text>
                  </View>
                ) : (
                  notifications.map((item) => {
                    const Icon = getNotifIcon(item.type);
                    const iconColor = getNotifColor(item.type, colors.accent);

                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleItemPress(item)}
                        activeOpacity={0.7}
                        style={[
                          styles.notifRow,
                          {
                            backgroundColor: item.read
                              ? 'transparent'
                              : isDark ? `${iconColor}08` : `${iconColor}06`,
                          },
                        ]}
                      >
                        {/* Dot non lu */}
                        {!item.read && (
                          <View style={[styles.unreadDot, { backgroundColor: iconColor }]} />
                        )}

                        {/* Icone coloree */}
                        <View style={[styles.notifIcon, { backgroundColor: `${iconColor}18` }]}>
                          <Icon size={18} color={iconColor} />
                        </View>

                        {/* Contenu */}
                        <View style={styles.notifTextContainer}>
                          <Text
                            style={[
                              styles.notifTitle,
                              { color: colors.textPrimary, fontWeight: item.read ? '500' : '700' },
                            ]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[styles.notifBody, { color: colors.textSecondary || colors.textMuted }]}
                            numberOfLines={1}
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
                  })
                )}
              </ScrollView>

              {/* Bouton "Ouvrir en grand" */}
              {notifications.length > 0 && (
                <>
                  <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]} />
                  <TouchableOpacity
                    onPress={handleOpenFull}
                    style={styles.openFullBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.openFullText, { color: colors.accent }]}>
                      {isFr ? 'Voir tout' : 'See all'}
                    </Text>
                    <ChevronRight size={16} color={colors.accent} />
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ============================================
// STYLES
// ============================================

const POPUP_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);
const MAX_LIST_HEIGHT = 340;

const styles = StyleSheet.create({
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },

  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 12,
  },

  // Popup
  popup: {
    width: POPUP_WIDTH,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    // Shadow iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    // Shadow Android
    elevation: 12,
  },

  // Header
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  popupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  popupTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  countChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  popupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gearBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Separator
  separator: {
    height: 1,
    marginHorizontal: 16,
  },

  // Liste
  popupList: {
    maxHeight: MAX_LIST_HEIGHT,
  },
  popupListContent: {
    paddingVertical: 6,
  },

  // Item
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    left: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifTextContainer: {
    flex: 1,
    gap: 2,
  },
  notifTitle: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  notifBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Bouton ouvrir en grand
  openFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
  },
  openFullText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
