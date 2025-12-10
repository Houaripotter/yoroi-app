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
  Alert,
} from 'react-native';
import { X, Award } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import { BADGES, BADGE_CATEGORIES, Badge, BadgeId, BadgeCategory } from '@/types/badges';
import { BadgeItem } from './BadgeItem';
import { useFocusEffect } from 'expo-router';
import { getAllMeasurements, getAllWorkouts, getUnlockedBadges, unlockBadge } from '@/lib/storage';

interface BadgesScreenProps {
  visible: boolean;
  onClose: () => void;
}

// Définition des conditions de déblocage des badges
const calculateUnlockedBadges = async (): Promise<Set<BadgeId>> => {
  const initiallyUnlocked = await getUnlockedBadges(); // Récupérer les badges déjà débloqués
  const unlocked = new Set<BadgeId>(initiallyUnlocked.map(b => b.badge_id));
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
      console.error('❌ Erreur lors du calcul des badges:', error);
      Alert.alert('Erreur', 'Impossible de charger les badges.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  if (loading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Chargement des badges...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.title}>Mes Badges</Text>
          <View style={styles.iconContainer}>
            <Award size={24} color={theme.colors.primary} strokeWidth={2.5} />
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progression</Text>
            <Text style={styles.progressCount}>
              {unlockedCount} / {totalCount}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress.toFixed(0)}% complété</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
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
                  <Text style={styles.categoryTitle}>{categoryInfo.name}</Text>
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
              <View style={styles.badgeDetailCard}>
                <View
                  style={[
                    styles.badgeDetailIcon,
                    {
                      backgroundColor: unlockedBadges.has(selectedBadge.id)
                        ? selectedBadge.color
                        : theme.colors.borderLight,
                    },
                  ]}
                >
                  <Text style={styles.badgeDetailEmoji}>{selectedBadge.icon}</Text>
                </View>
                <Text style={styles.badgeDetailName}>{selectedBadge.name}</Text>
                <Text style={styles.badgeDetailDescription}>{selectedBadge.description}</Text>
                <View style={styles.badgeDetailRequirement}>
                  <Text style={styles.requirementLabel}>Condition :</Text>
                  <Text style={styles.requirementText}>{selectedBadge.requirement}</Text>
                </View>
                {unlockedBadges.has(selectedBadge.id) && (
                  <View style={styles.unlockedBanner}>
                    <Text style={styles.unlockedText}>✓ Badge débloqué</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  title: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  progressCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    ...theme.shadow.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  progressCount: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.primary,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
  },
  progressText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  category: {
    gap: theme.spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  badgesList: {
    gap: theme.spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  badgeDetailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.md,
    width: '100%',
    maxWidth: 400,
    ...theme.shadow.lg,
  },
  badgeDetailIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.md,
  },
  badgeDetailEmoji: {
    fontSize: 48,
  },
  badgeDetailName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  badgeDetailDescription: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.fontSize.md * 1.5,
  },
  badgeDetailRequirement: {
    backgroundColor: '#F0F3F5',
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
    width: '100%',
    marginTop: theme.spacing.md,
  },
  requirementLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requirementText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    lineHeight: theme.fontSize.sm * 1.4,
  },
  unlockedBanner: {
    backgroundColor: '#E0F2F1',
    borderRadius: theme.radius.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  unlockedText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
});