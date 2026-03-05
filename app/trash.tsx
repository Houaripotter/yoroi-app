import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Clock,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  getTrashItems,
  restoreFromTrash,
  permanentlyDeleteFromTrash,
  emptyTrash,
  TrashItem,
} from '@/lib/database';
import { getSportIcon, getSportColor, getSportName, getClubLogoSource } from '@/lib/sports';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

export default function TrashScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    try {
      const data = await getTrashItems();
      setItems(data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleRestore = (item: TrashItem) => {
    showPopup(
      'Restaurer',
      `Restaurer la seance ${item.club_name || getSportName(item.sport)} du ${format(new Date(item.date + 'T00:00:00'), 'd MMM yyyy', { locale: fr })} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'primary',
          onPress: async () => {
            await restoreFromTrash(item.id);
            notificationAsync(NotificationFeedbackType.Success);
            loadItems();
          },
        },
      ]
    );
  };

  const handlePermanentDelete = (item: TrashItem) => {
    showPopup(
      'Supprimer definitivement',
      `Cette action est irreversible. Supprimer definitivement cette seance ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await permanentlyDeleteFromTrash(item.id);
            impactAsync(ImpactFeedbackStyle.Heavy);
            loadItems();
          },
        },
      ]
    );
  };

  const handleEmptyTrash = () => {
    if (items.length === 0) return;
    showPopup(
      'Vider la corbeille',
      `Supprimer definitivement ${items.length} seance${items.length > 1 ? 's' : ''} ? Cette action est irreversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            await emptyTrash();
            impactAsync(ImpactFeedbackStyle.Heavy);
            loadItems();
          },
        },
      ]
    );
  };

  const formatDuration = (min?: number): string => {
    if (!min) return '1h';
    if (min < 60) return `${min}min`;
    const hours = Math.floor(min / 60);
    const mins = min % 60;
    return mins > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : `${hours}h`;
  };

  const formatDeletedAt = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'A l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins}min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return `Il y a ${diffDays} jours`;
      return format(d, 'd MMM', { locale: fr });
    } catch {
      return '';
    }
  };

  return (
    <ScreenWrapper>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Corbeille</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {items.length} element{items.length > 1 ? 's' : ''} - suppression auto apres 30 jours
          </Text>
        </View>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleEmptyTrash} style={[styles.emptyButton, { backgroundColor: `${colors.error}15` }]}>
            <Trash2 size={16} color={colors.error || '#EF4444'} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Trash2 size={48} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>
              Corbeille vide
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Les seances supprimees apparaitront ici
            </Text>
          </View>
        )}

        {items.map((item) => {
          const sportColor = getSportColor(item.sport || 'autre');
          const sportIcon = getSportIcon(item.sport || 'autre');
          const logoSource = item.club_logo ? getClubLogoSource(item.club_logo) : null;

          return (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            >
              <View style={styles.cardMain}>
                <View style={[styles.cardIcon, { backgroundColor: `${sportColor}20` }]}>
                  {logoSource ? (
                    <Image source={logoSource} style={{ width: 28, height: 28, borderRadius: 14 }} />
                  ) : (
                    <MaterialCommunityIcons name={sportIcon as any} size={22} color={sportColor} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {item.club_name || getSportName(item.sport || 'autre')}
                  </Text>
                  <View style={styles.cardMeta}>
                    <Calendar size={12} color={colors.textMuted} />
                    <Text style={[styles.cardMetaText, { color: colors.textSecondary }]}>
                      {format(new Date(item.date + 'T00:00:00'), 'EEEE d MMM', { locale: fr })}
                    </Text>
                    {item.start_time && (
                      <>
                        <Clock size={12} color={colors.textMuted} />
                        <Text style={[styles.cardMetaText, { color: colors.textSecondary }]}>
                          {item.start_time}
                        </Text>
                      </>
                    )}
                    <Text style={[styles.cardMetaText, { color: colors.textSecondary }]}>
                      {formatDuration(item.duration_minutes)}
                    </Text>
                  </View>
                  <Text style={[styles.deletedAt, { color: colors.textMuted }]}>
                    Supprime {formatDeletedAt(item.deleted_at)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => handleRestore(item)}
                  style={[styles.actionBtn, { backgroundColor: `${colors.accent}15` }]}
                >
                  <RotateCcw size={18} color={colors.accent} />
                  <Text style={[styles.actionText, { color: colors.accent }]}>Restaurer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handlePermanentDelete(item)}
                  style={[styles.actionBtn, { backgroundColor: `${colors.error || '#EF4444'}15` }]}
                >
                  <Trash2 size={18} color={colors.error || '#EF4444'} />
                  <Text style={[styles.actionText, { color: colors.error || '#EF4444' }]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {items.length > 0 && (
          <View style={[styles.warningBanner, { backgroundColor: `${colors.warning || '#F59E0B'}10`, borderColor: `${colors.warning || '#F59E0B'}30` }]}>
            <AlertTriangle size={16} color={colors.warning || '#F59E0B'} />
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              Les elements sont automatiquement supprimes apres 30 jours
            </Text>
          </View>
        )}
      </ScrollView>

      <PopupComponent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardMetaText: {
    fontSize: 12,
  },
  deletedAt: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
  },
});
