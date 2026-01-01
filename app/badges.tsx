import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, Check, X, ChevronRight, Flame, Scale, Dumbbell, Star, Calendar, Award } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import {
  Badge,
  BadgeCategory,
  BadgeProgress,
  getAllBadgesProgress,
  getTotalBadgesCount,
  getUnlockedBadges,
  STREAK_BADGES,
  WEIGHT_BADGES,
  TRAINING_BADGES,
  SPECIAL_BADGES,
  TIME_BADGES,
} from '@/lib/badges';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logger from '@/lib/security/logger';

// ============================================
// ECRAN COLLECTION DE BADGES
// ============================================

interface BadgeItemProps {
  badgeProgress: BadgeProgress;
  onPress: () => void;
}

const BadgeItem: React.FC<BadgeItemProps> = ({ badgeProgress, onPress }) => {
  const { colors } = useTheme();
  const { badge, isUnlocked, progressPercent } = badgeProgress;

  return (
    <TouchableOpacity
      style={[
        styles.badgeItem,
        {
          backgroundColor: isUnlocked ? colors.goldMuted : colors.cardHover,
          borderColor: isUnlocked ? colors.gold : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.badgeIconContainer}>
        <View style={[styles.badgeIcon, !isUnlocked && styles.badgeIconLocked]}>
          {React.createElement(badge.iconComponent, {
            size: 32,
            color: isUnlocked ? colors.gold : colors.textMuted,
            strokeWidth: 2.5,
          })}
        </View>
        {isUnlocked ? (
          <View style={[styles.checkBadge, { backgroundColor: colors.success }]}>
            <Check size={10} color="#fff" strokeWidth={3} />
          </View>
        ) : (
          <View style={[styles.lockBadge, { backgroundColor: colors.textMuted }]}>
            <Lock size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* Barre de progression pour badges non debloques */}
      {!isUnlocked && (
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.gold, width: `${progressPercent}%` },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

interface CategorySectionProps {
  title: string;
  IconComponent: React.ComponentType<any>;
  badges: BadgeProgress[];
  unlockedCount: number;
  onBadgePress: (badge: BadgeProgress) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  IconComponent,
  badges,
  unlockedCount,
  onBadgePress,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.categorySection}>
      <View style={[styles.categoryHeader, { borderBottomColor: colors.border }]}>
        <View style={[styles.categoryIconContainer, { backgroundColor: colors.goldMuted }]}>
          <IconComponent size={20} color={colors.gold} strokeWidth={2.5} />
        </View>
        <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <View style={[styles.categoryCount, { backgroundColor: colors.goldMuted }]}>
          <Text style={[styles.categoryCountText, { color: colors.gold }]}>
            {unlockedCount}/{badges.length}
          </Text>
        </View>
      </View>

      <View style={styles.badgesGrid}>
        {badges.map((badgeProgress) => (
          <BadgeItem
            key={badgeProgress.badge.id}
            badgeProgress={badgeProgress}
            onPress={() => onBadgePress(badgeProgress)}
          />
        ))}
      </View>
    </View>
  );
};

// Configuration des categories
const CATEGORIES: { key: BadgeCategory; title: string; IconComponent: React.ComponentType<any>; badges: Badge[] }[] = [
  { key: 'streak', title: 'STREAK', IconComponent: Flame, badges: STREAK_BADGES },
  { key: 'weight', title: 'POIDS', IconComponent: Scale, badges: WEIGHT_BADGES },
  { key: 'training', title: 'ENTRAINEMENT', IconComponent: Dumbbell, badges: TRAINING_BADGES },
  { key: 'special', title: 'SPECIAUX', IconComponent: Star, badges: SPECIAL_BADGES },
  { key: 'time', title: 'TEMPS', IconComponent: Calendar, badges: TIME_BADGES },
];

export default function BadgesScreen() {
  const { colors, gradients } = useTheme();
  const [allBadges, setAllBadges] = useState<BadgeProgress[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [selectedBadge, setSelectedBadge] = useState<BadgeProgress | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Animations
  const modalScale = useRef(new Animated.Value(0.5)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const loadBadges = useCallback(async () => {
    try {
      const progress = await getAllBadgesProgress();
      setAllBadges(progress);

      const unlocked = await getUnlockedBadges();
      setUnlockedCount(unlocked.length);
    } catch (error) {
      logger.error('Erreur chargement badges:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBadges();
    }, [loadBadges])
  );

  const handleBadgePress = (badgeProgress: BadgeProgress) => {
    setSelectedBadge(badgeProgress);
    setModalVisible(true);

    // Animation d'entree
    modalScale.setValue(0.5);
    modalOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedBadge(null);
    });
  };

  const getBadgesForCategory = (category: BadgeCategory): BadgeProgress[] => {
    return allBadges.filter((bp) => bp.badge.category === category);
  };

  const getUnlockedCountForCategory = (category: BadgeCategory): number => {
    return allBadges.filter((bp) => bp.badge.category === category && bp.isUnlocked).length;
  };

  const totalBadges = getTotalBadgesCount();

  return (
    <ScreenWrapper noPadding>
      <Header title="Ma Collection" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER STATS */}
        <Card variant="gold" style={styles.statsCard}>
          <LinearGradient
            colors={gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsGradient}
          >
            <View style={styles.statsMainContent}>
              <View style={styles.statsIconContainer}>
                <Award size={56} color="rgba(255,255,255,0.95)" strokeWidth={2.5} />
              </View>
              <View style={styles.statsTextContent}>
                <Text style={[styles.statsCount, { color: colors.background }]}>
                  {unlockedCount}/{totalBadges}
                </Text>
                <Text style={[styles.statsLabel, { color: colors.background }]}>
                  BADGES DÉBLOQUÉS
                </Text>
              </View>
            </View>

            <View style={styles.statsProgressSection}>
              <View style={[styles.statsProgressBg, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                <View
                  style={[
                    styles.statsProgressFill,
                    {
                      backgroundColor: colors.background,
                      width: `${(unlockedCount / totalBadges) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.statsProgressText, { color: colors.background }]}>
                {Math.round((unlockedCount / totalBadges) * 100)}% Collection complète
              </Text>
            </View>
          </LinearGradient>
        </Card>

        {/* CATEGORIES */}
        {CATEGORIES.map((cat) => {
          const categoryBadges = getBadgesForCategory(cat.key);
          const categoryUnlocked = getUnlockedCountForCategory(cat.key);

          return (
            <CategorySection
              key={cat.key}
              title={cat.title}
              IconComponent={cat.IconComponent}
              badges={categoryBadges}
              unlockedCount={categoryUnlocked}
              onBadgePress={handleBadgePress}
            />
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL BADGE DETAIL */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeModal}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
              },
            ]}
          >
            {selectedBadge && (
              <>
                {/* Close button */}
                <TouchableOpacity
                  style={[styles.modalClose, { backgroundColor: colors.cardHover }]}
                  onPress={closeModal}
                >
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {/* Badge Icon */}
                <View
                  style={[
                    styles.modalIconContainer,
                    {
                      backgroundColor: selectedBadge.isUnlocked
                        ? colors.goldMuted
                        : colors.cardHover,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.modalIcon,
                      !selectedBadge.isUnlocked && styles.modalIconLocked,
                    ]}
                  >
                    {React.createElement(selectedBadge.badge.iconComponent, {
                      size: 64,
                      color: selectedBadge.isUnlocked ? colors.gold : colors.textMuted,
                      strokeWidth: 2.5,
                    })}
                  </View>
                </View>

                {/* Badge Name */}
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {selectedBadge.badge.name}
                </Text>

                {/* Badge Description */}
                <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                  {selectedBadge.badge.description}
                </Text>

                {/* Status */}
                {selectedBadge.isUnlocked ? (
                  <View style={[styles.unlockedBadge, { backgroundColor: colors.successMuted }]}>
                    <Check size={16} color={colors.success} />
                    <Text style={[styles.unlockedText, { color: colors.success }]}>
                      Debloque !
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.progressContainer, { backgroundColor: colors.cardHover }]}>
                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                        Progression
                      </Text>
                      <Text style={[styles.progressValue, { color: colors.gold }]}>
                        {selectedBadge.currentProgress}/{selectedBadge.badge.requirement}
                      </Text>
                    </View>
                    <View style={[styles.modalProgressBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.modalProgressFill,
                          {
                            backgroundColor: colors.gold,
                            width: `${selectedBadge.progressPercent}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressPercent, { color: colors.textMuted }]}>
                      {Math.round(selectedBadge.progressPercent)}%
                    </Text>
                  </View>
                )}

                {/* Date de deblocage */}
                {selectedBadge.isUnlocked && selectedBadge.unlockedAt && (
                  <Text style={[styles.unlockedDate, { color: colors.textMuted }]}>
                    Obtenu le{' '}
                    {format(new Date(selectedBadge.unlockedAt), 'd MMMM yyyy', { locale: fr })}
                  </Text>
                )}

                {/* XP Reward */}
                <View style={[styles.xpReward, { borderTopColor: colors.border }]}>
                  <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>Recompense</Text>
                  <LinearGradient
                    colors={gradients.gold}
                    style={styles.xpBadge}
                  >
                    <Text style={[styles.xpValue, { color: colors.background }]}>
                      +{selectedBadge.badge.xpReward} XP
                    </Text>
                  </LinearGradient>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // STATS CARD
  statsCard: {
    marginBottom: 28,
    padding: 0,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 24,
  },
  statsMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsIconContainer: {
    marginRight: 20,
  },
  statsTextContent: {
    flex: 1,
  },
  statsCount: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    opacity: 0.95,
  },
  statsProgressSection: {
    gap: 10,
  },
  statsProgressBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  statsProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  statsProgressText: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.95,
    textAlign: 'center',
  },

  // CATEGORY
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    flex: 1,
  },
  categoryCount: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  categoryCountText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // BADGES GRID
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  badgeItem: {
    width: 84,
    height: 84,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeIconContainer: {
    position: 'relative',
  },
  badgeIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconLocked: {
    opacity: 0.35,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -6,
    right: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -6,
    right: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  progressBar: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  modalIcon: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconLocked: {
    opacity: 0.4,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontWeight: '500',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 16,
  },
  unlockedText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  progressContainer: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressValue: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  modalProgressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  unlockedDate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  xpReward: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    borderTopWidth: 2,
    marginTop: 12,
  },
  xpLabel: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  xpBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
});
