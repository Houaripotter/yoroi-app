import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { X, Award } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useCustomPopup } from '@/components/CustomPopup';
import { BADGES, BADGE_CATEGORIES, Badge, BadgeId, BadgeCategory } from '@/types/badges';
import { BadgeItem } from './BadgeItem';
import { useFocusEffect } from 'expo-router';
import { getAllMeasurements, getAllWorkouts, getUnlockedBadges, unlockBadge } from '@/lib/storage';
import logger from '@/lib/security/logger';

interface BadgesScreenProps {
  visible: boolean;
  onClose: () => void;
}

// Définition des conditions de déblocage des badges
const calculateUnlockedBadges = async (): Promise<Set<BadgeId>> => {
  const initiallyUnlocked = await getUnlockedBadges(); // Récupérer les badges déjà débloqués
  const unlocked = new Set<BadgeId>(initiallyUnlocked.map(b => b.badge_id as BadgeId));
  const allMeasurements = await getAllMeasurements();
  const allWorkouts = await getAllWorkouts();

  const checkAndUnlock = async (badgeId: BadgeId, condition: boolean) => {
    if (condition && !unlocked.has(badgeId)) {
      await unlockBadge(badgeId);
      unlocked.add(badgeId);
  }
  };

  // Logique de déblocage des badges
  await checkAndUnlock('first_step', allMeasurements.length > 0);
  await checkAndUnlock('assidu', allMeasurements.length >= 10);
  await checkAndUnlock('bushi', allWorkouts.length >= 10);

  // Ajoutez d'autres logiques de badge ici
  // Exemple: Badge "Force Herculéenne" si 50 entraînements enregistrés
  await checkAndUnlock('herculean_strength', allWorkouts.length >= 50);
  // Exemple: Badge "Maître des données" si 100 mesures enregistrées
  await checkAndUnlock('data_master', allMeasurements.length >= 100);

  return unlocked;
};


export function BadgesScreen({ visible, onClose }: BadgesScreenProps) {
  const { colors, themeName } = useTheme();
  const { t } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const isWellness = false;

  const [unlockedBadges, setUnlockedBadges] = useState<Set<BadgeId>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const fetchUnlockedBadges = useCallback(async () => {
    try {
      setLoading(true);
      const badges = await calculateUnlockedBadges();
      setUnlockedBadges(badges);
    } catch (error) {
      logger.error('Error loading badges:', error);
      showPopup(t('common.error'), t('badges.loadError'), [{ text: 'OK', style: 'primary' }]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, showPopup]);

  useFocusEffect(
    useCallback(() => {
      if (visible) {
        fetchUnlockedBadges();
      }
    }, [visible, fetchUnlockedBadges])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUnlockedBadges();
  }, [fetchUnlockedBadges]);

  const handleBadgePress = (badge: Badge) => {
    setSelectedBadge(badge);
  };

  const getBadgesByCategory = (category: BadgeCategory): Badge[] => {
    return Object.values(BADGES).filter(badge => badge.category === category);
  };

  const unlockedCount = unlockedBadges.size;
  const totalCount = Object.keys(BADGES).length;
  const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const cardShadow = isWellness ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  };

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('badges.loading')}</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.card }, cardShadow]}>
            <X size={24} color={colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('badges.myBadges')}</Text>
          <View style={[styles.iconContainer, { backgroundColor: colors.card }, cardShadow]}>
            <Award size={24} color={colors.gold} strokeWidth={2.5} />
          </View>
        </View>

        {/* Progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.card }, cardShadow]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>{t('badges.progression')}</Text>
            <Text style={[styles.progressCount, { color: colors.gold }]}>
              {unlockedCount} / {totalCount}
            </Text>
          </View>
          <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
            <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: colors.gold }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>{progress.toFixed(0)}% {t('badges.completed')}</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold}
              colors={[colors.gold]}
            />
          }
        >
          {/* Badges par catégorie */}
          {(Object.keys(BADGE_CATEGORIES) as BadgeCategory[]).map((category) => {
            const categoryBadges = getBadgesByCategory(category);
            const categoryInfo = BADGE_CATEGORIES[category];

            return (
              <View key={category} style={styles.category}>
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryDot, { backgroundColor: categoryInfo.color }]} />
                  <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>{categoryInfo.name}</Text>
                </View>
                <View style={styles.badgesList}>
                  {categoryBadges.map((badge) => (
                    <BadgeItem
                      key={badge.id}
                      badge={badge}
                      unlocked={unlockedBadges.has(badge.id)}
                      onPress={() => handleBadgePress(badge)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Badge Detail Modal */}
        {selectedBadge && (
          <Modal
            visible={!!selectedBadge}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedBadge(null)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setSelectedBadge(null)}
            >
              <View style={[styles.badgeDetailCard, { backgroundColor: colors.card }, cardShadow]}>
                <View
                  style={[
                    styles.badgeDetailIcon,
                    {
                      backgroundColor: unlockedBadges.has(selectedBadge.id)
                        ? selectedBadge.color
                        : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.badgeDetailEmoji}>{selectedBadge.icon}</Text>
                </View>
                <Text style={[styles.badgeDetailName, { color: colors.textPrimary }]}>{selectedBadge.name}</Text>
                <Text style={[styles.badgeDetailDescription, { color: colors.textSecondary }]}>{selectedBadge.description}</Text>
                <View style={[styles.badgeDetailRequirement, { backgroundColor: colors.cardHover }]}>
                  <Text style={[styles.requirementLabel, { color: colors.textSecondary }]}>{t('badges.condition')}</Text>
                  <Text style={[styles.requirementText, { color: colors.textPrimary }]}>{selectedBadge.requirement}</Text>
                </View>
                {unlockedBadges.has(selectedBadge.id) && (
                  <View style={styles.unlockedBanner}>
                    <Text style={[styles.unlockedText, { color: colors.gold }]}>{t('badges.badgeUnlocked')}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        )}
        <PopupComponent />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 24,
  },
  category: {
    gap: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  badgesList: {
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  badgeDetailCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 400,
  },
  badgeDetailIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  badgeDetailEmoji: {
    fontSize: 48,
  },
  badgeDetailName: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  badgeDetailDescription: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  badgeDetailRequirement: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
    width: '100%',
    marginTop: 12,
  },
  requirementLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requirementText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  unlockedBanner: {
    backgroundColor: '#E0F2F1',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  unlockedText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
