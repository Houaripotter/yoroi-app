// ============================================
// YOROI - PAGE DOJO
// ============================================
// Ton parcours champion : Rangs, Niveaux, Badges, Timeline

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Trophy,
  Star,
  Crown,
  Target,
  Flame,
  Zap,
  Shield,
  Award,
  Gift,
  Lock,
  Check,
  Swords,
  Sword,
  Moon,
  GraduationCap,
  Castle,
  Medal,
  Sparkles,
  TrendingUp,
  Heart,
  Scale,
  Dumbbell,
  Camera,
  Droplets,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { RANKS, getCurrentRank, getNextRank, getRankProgress, getDaysToNextRank } from '@/lib/ranks';
import { LEVELS, getLevel, getNextLevel, getLevelProgress } from '@/lib/gamification';
import { getProfile, getWeights, getTrainings, calculateStreak } from '@/lib/database';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AchievementCelebration } from '@/components/AchievementCelebration';
import { getAchievementsHistory, getTodayAchievements, AchievementUnlock } from '@/lib/achievementsService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Map des icônes pour les rangs
const RankIconMap: Record<string, any> = {
  'target': Target,
  'swords': Swords,
  'sword': Sword,
  'moon': Moon,
  'graduation-cap': GraduationCap,
  'crown': Crown,
  'castle': Castle,
  'shield': Shield,
  'star': Star,
};

// Map des icônes pour les niveaux
const LevelIconMap: Record<string, any> = {
  'Sprout': TrendingUp,
  'Shield': Shield,
  'Swords': Swords,
  'Trophy': Trophy,
  'Crown': Crown,
};

// Définition des badges
interface Badge {
  id: string;
  name: string;
  nameJp: string;
  description: string;
  icon: any;
  color: string;
  condition: string;
  unlockCondition: (stats: any) => boolean;
  getProgress: (stats: any) => { current: number; target: number };
  reward: string;
}

const BADGES: Badge[] = [
  {
    id: 'first_weigh',
    name: 'Premier Pas',
    nameJp: '最初の一歩',
    description: 'Première pesée enregistrée',
    icon: Scale,
    color: '#3B82F6',
    condition: '1 pesée',
    unlockCondition: (stats) => stats.weightsCount >= 1,
    getProgress: (stats) => ({ current: Math.min(stats.weightsCount, 1), target: 1 }),
    reward: '+5 XP',
  },
  {
    id: 'first_training',
    name: 'Éveil du Guerrier',
    nameJp: '戦士の目覚め',
    description: 'Premier entraînement complété',
    icon: Dumbbell,
    color: '#10B981',
    condition: '1 entraînement',
    unlockCondition: (stats) => stats.trainingsCount >= 1,
    getProgress: (stats) => ({ current: Math.min(stats.trainingsCount, 1), target: 1 }),
    reward: '+20 XP',
  },
  {
    id: 'streak_7',
    name: 'Semaine Parfaite',
    nameJp: '完璧な週',
    description: '7 jours de suite',
    icon: Flame,
    color: '#F97316',
    condition: '7 jours consécutifs',
    unlockCondition: (stats) => stats.streak >= 7,
    getProgress: (stats) => ({ current: Math.min(stats.streak, 7), target: 7 }),
    reward: '+50 XP',
  },
  {
    id: 'streak_30',
    name: 'Mois Légendaire',
    nameJp: '伝説の月',
    description: '30 jours de suite',
    icon: Crown,
    color: '#F59E0B',
    condition: '30 jours consécutifs',
    unlockCondition: (stats) => stats.streak >= 30,
    getProgress: (stats) => ({ current: Math.min(stats.streak, 30), target: 30 }),
    reward: '+200 XP',
  },
  {
    id: 'streak_100',
    name: 'Centenaire',
    nameJp: '百日',
    description: '100 jours de suite',
    icon: Star,
    color: '#FFD700',
    condition: '100 jours consécutifs',
    unlockCondition: (stats) => stats.streak >= 100,
    getProgress: (stats) => ({ current: Math.min(stats.streak, 100), target: 100 }),
    reward: '+500 XP',
  },
  {
    id: 'photo_first',
    name: 'Capture',
    nameJp: '写真',
    description: 'Première photo de transformation',
    icon: Camera,
    color: '#8B5CF6',
    condition: '1 photo',
    unlockCondition: (stats) => stats.photosCount >= 1,
    getProgress: (stats) => ({ current: Math.min(stats.photosCount, 1), target: 1 }),
    reward: '+15 XP',
  },
  {
    id: 'weight_goal',
    name: 'Objectif Atteint',
    nameJp: '目標達成',
    description: 'Poids cible atteint',
    icon: Target,
    color: '#10B981',
    condition: 'Atteindre le poids cible',
    unlockCondition: (stats) => stats.goalReached,
    getProgress: (stats) => ({ current: stats.goalReached ? 1 : 0, target: 1 }),
    reward: '+100 XP',
  },
  {
    id: 'hydration_master',
    name: 'Maître de l\'Hydratation',
    nameJp: '水の達人',
    description: '30 jours d\'objectif hydratation',
    icon: Droplets,
    color: '#06B6D4',
    condition: '30 jours objectif eau',
    unlockCondition: (stats) => stats.hydrationDays >= 30,
    getProgress: (stats) => ({ current: Math.min(stats.hydrationDays, 30), target: 30 }),
    reward: '+75 XP',
  },
  {
    id: 'training_master',
    name: 'Maître Entraîneur',
    nameJp: 'トレーニングマスター',
    description: '100 entraînements complétés',
    icon: Medal,
    color: '#EF4444',
    condition: '100 entraînements',
    unlockCondition: (stats) => stats.trainingsCount >= 100,
    getProgress: (stats) => ({ current: Math.min(stats.trainingsCount, 100), target: 100 }),
    reward: '+150 XP',
  },
  {
    id: 'consistency_king',
    name: 'Roi de la Régularité',
    nameJp: '一貫性の王',
    description: '50 pesées enregistrées',
    icon: Heart,
    color: '#EC4899',
    condition: '50 pesées',
    unlockCondition: (stats) => stats.weightsCount >= 50,
    getProgress: (stats) => ({ current: Math.min(stats.weightsCount, 50), target: 50 }),
    reward: '+100 XP',
  },
];

export default function DojoScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [weightsCount, setWeightsCount] = useState(0);
  const [trainingsCount, setTrainingsCount] = useState(0);
  const [photosCount, setPhotosCount] = useState(0);
  const [hydrationDays, setHydrationDays] = useState(0);
  const [goalReached, setGoalReached] = useState(false);

  const [selectedTab, setSelectedTab] = useState<'rangs' | 'niveaux' | 'historique'>('rangs');

  // Célébration
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);

  // Historique
  const [achievementsHistory, setAchievementsHistory] = useState<AchievementUnlock[]>([]);
  const [todayAchievements, setTodayAchievements] = useState<AchievementUnlock[]>([]);

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      const [profile, weights, trainings, streakDays, history, today] = await Promise.all([
        getProfile(),
        getWeights(365),
        getTrainings(),
        calculateStreak(),
        getAchievementsHistory(),
        getTodayAchievements(),
      ]);

      setStreak(streakDays);
      setWeightsCount(weights.length);
      setTrainingsCount(trainings.length);
      setPhotosCount(0);
      setHydrationDays(0);
      setAchievementsHistory(history);
      setTodayAchievements(today);

      if (profile && weights.length > 0) {
        const currentWeight = weights[0].weight;
        const targetWeight = profile.target_weight;
        if (targetWeight && currentWeight <= targetWeight) {
          setGoalReached(true);
        }
      }

      const points = weights.length * 5 + trainings.length * 20 + (streakDays >= 100 ? 500 : streakDays >= 30 ? 200 : streakDays >= 7 ? 50 : 0);
      setTotalPoints(points);
    } catch (error) {
      logger.error('Erreur chargement Dojo:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculs
  const currentRank = getCurrentRank(streak);
  const nextRank = getNextRank(streak);
  const rankProgress = getRankProgress(streak);
  const daysToNextRank = getDaysToNextRank(streak);

  const currentLevel = getLevel(totalPoints);
  const nextLevel = getNextLevel(totalPoints);
  const levelProgressData = getLevelProgress(totalPoints);

  // Stats pour les badges
  const stats = {
    weightsCount,
    trainingsCount,
    photosCount,
    streak,
    hydrationDays,
    goalReached,
  };

  const unlockedBadges = BADGES.filter(badge => badge.unlockCondition(stats));
  const lockedBadges = BADGES.filter(badge => !badge.unlockCondition(stats));

  // Badges proches du déblocage (>70%)
  const closeToBadges = lockedBadges.filter(badge => {
    const progress = badge.getProgress(stats);
    return (progress.current / progress.target) >= 0.7;
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Dojo</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>殿堂 - Ton Parcours Guerrier</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* Achievements aujourd'hui */}
      {todayAchievements.length > 0 && (
        <View style={[styles.todayBanner, { backgroundColor: colors.successLight }]}>
          <Sparkles size={16} color={colors.success} />
          <Text style={[styles.todayText, { color: colors.success }]}>
            {todayAchievements.length} achievement{todayAchievements.length > 1 ? 's' : ''} débloqué{todayAchievements.length > 1 ? 's' : ''} aujourd'hui !
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'rangs' && { borderBottomColor: colors.accent, borderBottomWidth: 3 },
          ]}
          onPress={() => setSelectedTab('rangs')}
        >
          <Trophy size={18} color={selectedTab === 'rangs' ? colors.accent : colors.textMuted} />
          <Text style={[styles.tabText, { color: selectedTab === 'rangs' ? colors.accent : colors.textMuted }]}>
            Rangs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'niveaux' && { borderBottomColor: colors.accent, borderBottomWidth: 3 },
          ]}
          onPress={() => setSelectedTab('niveaux')}
        >
          <Zap size={18} color={selectedTab === 'niveaux' ? colors.accent : colors.textMuted} />
          <Text style={[styles.tabText, { color: selectedTab === 'niveaux' ? colors.accent : colors.textMuted }]}>
            Niveaux
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'historique' && { borderBottomColor: colors.accent, borderBottomWidth: 3 },
          ]}
          onPress={() => setSelectedTab('historique')}
        >
          <Clock size={18} color={selectedTab === 'historique' ? colors.accent : colors.textMuted} />
          <Text style={[styles.tabText, { color: selectedTab === 'historique' ? colors.accent : colors.textMuted }]}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* RANGS */}
        {selectedTab === 'rangs' && (
          <View>
            {/* Carte rang actuel */}
            <AnimatedCard index={0}>
              <View style={[styles.currentCard, { backgroundColor: `${currentRank.color}15`, borderColor: currentRank.color }]}>
                <View style={styles.currentCardHeader}>
                  <View style={[styles.currentRankIcon, { backgroundColor: currentRank.color }]}>
                    {React.createElement(RankIconMap[currentRank.icon] || Target, { size: 32, color: '#FFFFFF' })}
                  </View>
                  <View style={styles.currentRankInfo}>
                    <Text style={[styles.currentRankName, { color: currentRank.color }]}>
                      {currentRank.name}
                    </Text>
                    <Text style={[styles.currentRankJp, { color: colors.textMuted }]}>
                      {currentRank.nameJp}
                    </Text>
                  </View>
                  <View style={styles.streakBadge}>
                    <Flame size={18} color="#F97316" />
                    <Text style={[styles.streakValue, { color: colors.textPrimary }]}>{streak}</Text>
                  </View>
                </View>
                <Text style={[styles.currentRankDesc, { color: colors.textSecondary }]}>
                  {currentRank.description}
                </Text>

                {/* Récompenses débloquées */}
                <View style={[styles.rewardUnlockedBadge, { backgroundColor: `${currentRank.color}20` }]}>
                  <Gift size={14} color={currentRank.color} />
                  <Text style={[styles.rewardUnlockedText, { color: currentRank.color }]}>
                    {currentRank.reward}
                  </Text>
                </View>

                {/* Progression vers prochain rang */}
                {nextRank && (
                  <View style={styles.nextRankSection}>
                    <View style={styles.nextRankHeader}>
                      <Text style={[styles.nextRankLabel, { color: colors.textMuted }]}>Prochain rang</Text>
                      <Text style={[styles.daysRemaining, { color: colors.textPrimary }]}>
                        {daysToNextRank} jours restants
                      </Text>
                    </View>
                    <View style={styles.nextRankRow}>
                      {React.createElement(RankIconMap[nextRank.icon] || Target, { size: 16, color: nextRank.color })}
                      <Text style={[styles.nextRankName, { color: nextRank.color }]}>
                        {nextRank.name}
                      </Text>
                      <Text style={[styles.nextRankPercent, { color: colors.textMuted }]}>
                        {Math.round(rankProgress)}%
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View style={[styles.progressFill, { width: `${rankProgress}%`, backgroundColor: nextRank.color }]} />
                    </View>

                    {/* Aperçu récompense */}
                    <View style={styles.nextRewardPreview}>
                      <Gift size={12} color={nextRank.color} />
                      <Text style={[styles.nextRewardText, { color: colors.textMuted }]}>
                        Récompense : {nextRank.reward}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </AnimatedCard>

            {/* Liste de tous les rangs */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TOUS LES RANGS</Text>
            {RANKS.map((rank, index) => {
              const unlocked = streak >= rank.minDays;
              const isCurrent = rank.id === currentRank.id;
              const RankIcon = RankIconMap[rank.icon] || Target;

              return (
                <AnimatedCard key={rank.id} index={index + 1}>
                  <View
                    style={[
                      styles.rankCard,
                      { backgroundColor: colors.backgroundCard },
                      isCurrent && { borderColor: rank.color, borderWidth: 2 },
                      !unlocked && { opacity: 0.6 },
                    ]}
                  >
                    <View style={[styles.rankIconContainer, { backgroundColor: unlocked ? `${rank.color}20` : colors.border }]}>
                      {unlocked ? (
                        <RankIcon size={28} color={rank.color} />
                      ) : (
                        <Lock size={24} color={colors.textMuted} />
                      )}
                    </View>

                    <View style={styles.rankInfo}>
                      <View style={styles.rankNameRow}>
                        <Text style={[styles.rankName, { color: unlocked ? rank.color : colors.textMuted }]}>
                          {rank.name}
                        </Text>
                        {isCurrent && (
                          <View style={[styles.currentBadge, { backgroundColor: rank.color }]}>
                            <Text style={styles.currentBadgeText}>ACTUEL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.rankNameJp, { color: colors.textMuted }]}>{rank.nameJp}</Text>
                      <Text style={[styles.rankDesc, { color: colors.textSecondary }]}>{rank.description}</Text>

                      {/* Récompense */}
                      <View style={styles.rewardRow}>
                        <Gift size={14} color={unlocked ? rank.color : colors.textMuted} />
                        <Text style={[styles.rewardText, { color: unlocked ? rank.color : colors.textMuted }]}>
                          {rank.reward}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.statusContainer}>
                      {unlocked ? (
                        <Check size={20} color={rank.color} />
                      ) : (
                        <View style={styles.daysRequiredBadge}>
                          <Text style={[styles.daysRequired, { color: colors.textMuted }]}>{rank.minDays}</Text>
                          <Text style={[styles.daysLabel, { color: colors.textMuted }]}>jours</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </AnimatedCard>
              );
            })}
          </View>
        )}

        {/* NIVEAUX - Similaire mais avec XP */}
        {selectedTab === 'niveaux' && (
          <View>
            <AnimatedCard index={0}>
              <View style={[styles.currentCard, { backgroundColor: `${currentLevel.color}15`, borderColor: currentLevel.color }]}>
                <View style={styles.currentCardHeader}>
                  <View style={[styles.currentLevelIcon, { backgroundColor: currentLevel.color }]}>
                    <Text style={styles.levelNumber}>{currentLevel.level}</Text>
                  </View>
                  <View style={styles.currentLevelInfo}>
                    <Text style={[styles.currentLevelName, { color: currentLevel.color }]}>
                      {currentLevel.name}
                    </Text>
                    <Text style={[styles.currentLevelJp, { color: colors.textMuted }]}>
                      {currentLevel.nameJp}
                    </Text>
                  </View>
                  <View style={styles.xpBadge}>
                    <Sparkles size={18} color={colors.accent} />
                    <Text style={[styles.xpValue, { color: colors.textPrimary }]}>{totalPoints} XP</Text>
                  </View>
                </View>
                <Text style={[styles.currentLevelDesc, { color: colors.textSecondary }]}>
                  {currentLevel.description}
                </Text>

                {nextLevel && (
                  <View style={styles.nextLevelSection}>
                    <View style={styles.nextLevelHeader}>
                      <Text style={[styles.nextLevelLabel, { color: colors.textMuted }]}>Prochain niveau</Text>
                      <Text style={[styles.xpRemaining, { color: colors.textPrimary }]}>
                        {levelProgressData.pointsToNext} XP restants
                      </Text>
                    </View>
                    <View style={styles.nextLevelRow}>
                      <Text style={[styles.nextLevelNumber, { color: nextLevel.color }]}>
                        Niv. {nextLevel.level}
                      </Text>
                      <Text style={[styles.nextLevelName, { color: nextLevel.color }]}>
                        {nextLevel.name}
                      </Text>
                      <Text style={[styles.nextLevelPercent, { color: colors.textMuted }]}>
                        {levelProgressData.progress}%
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View style={[styles.progressFill, { width: `${levelProgressData.progress}%`, backgroundColor: nextLevel.color }]} />
                    </View>
                  </View>
                )}
              </View>
            </AnimatedCard>

            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TOUS LES NIVEAUX</Text>
            {LEVELS.map((level, index) => {
              const unlocked = totalPoints >= level.pointsRequired;
              const isCurrent = level.level === currentLevel.level;
              const LevelIcon = LevelIconMap[level.icon] || Shield;

              return (
                <AnimatedCard key={level.level} index={index + 1}>
                  <View
                    style={[
                      styles.levelCard,
                      { backgroundColor: colors.backgroundCard },
                      isCurrent && { borderColor: level.color, borderWidth: 2 },
                      !unlocked && { opacity: 0.6 },
                    ]}
                  >
                    <View style={[styles.levelIconContainer, { backgroundColor: unlocked ? `${level.color}20` : colors.border }]}>
                      {unlocked ? (
                        <LevelIcon size={28} color={level.color} />
                      ) : (
                        <Lock size={24} color={colors.textMuted} />
                      )}
                      <View style={[styles.levelNumberBadge, { backgroundColor: unlocked ? level.color : colors.textMuted }]}>
                        <Text style={styles.levelNumberSmall}>{level.level}</Text>
                      </View>
                    </View>

                    <View style={styles.levelInfo}>
                      <View style={styles.levelNameRow}>
                        <Text style={[styles.levelName, { color: unlocked ? level.color : colors.textMuted }]}>
                          {level.name}
                        </Text>
                        {isCurrent && (
                          <View style={[styles.currentBadge, { backgroundColor: level.color }]}>
                            <Text style={styles.currentBadgeText}>ACTUEL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.levelNameJp, { color: colors.textMuted }]}>{level.nameJp}</Text>
                      <Text style={[styles.levelDesc, { color: colors.textSecondary }]}>{level.description}</Text>
                    </View>

                    <View style={styles.statusContainer}>
                      {unlocked ? (
                        <Check size={20} color={level.color} />
                      ) : (
                        <View style={styles.xpRequiredBadge}>
                          <Text style={[styles.xpRequired, { color: colors.textMuted }]}>{level.pointsRequired}</Text>
                          <Text style={[styles.xpLabel, { color: colors.textMuted }]}>XP</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </AnimatedCard>
              );
            })}
          </View>
        )}

        {/* HISTORIQUE */}
        {selectedTab === 'historique' && (
          <View>
            {achievementsHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Clock size={48} color={colors.textMuted} />
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  Aucun achievement débloqué pour le moment
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textMuted }]}>
                  Continue ton effort et reviens ici !
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  HISTORIQUE DES ACHIEVEMENTS ({achievementsHistory.length})
                </Text>
                {achievementsHistory.map((achievement, index) => (
                  <AnimatedCard key={`${achievement.id}-${achievement.unlockedAt}`} index={index}>
                    <View style={[styles.historyCard, { backgroundColor: colors.backgroundCard, borderLeftColor: achievement.color }]}>
                      <View style={[styles.historyIconContainer, { backgroundColor: `${achievement.color}20` }]}>
                        <View style={styles.historyIconContainer}>
                          {achievement.type === 'badge' ? (
                            <Medal size={20} color={colors.textPrimary} />
                          ) : achievement.type === 'rank' ? (
                            <Trophy size={20} color={colors.textPrimary} />
                          ) : (
                            <Zap size={20} color={colors.textPrimary} />
                          )}
                        </View>
                      </View>

                      <View style={styles.historyInfo}>
                        <Text style={[styles.historyName, { color: achievement.color }]}>{achievement.name}</Text>
                        <Text style={[styles.historyNameJp, { color: colors.textMuted }]}>{achievement.nameJp}</Text>
                        <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                          {format(new Date(achievement.unlockedAt), 'dd MMMM yyyy', { locale: fr })}
                        </Text>
                      </View>

                      <View style={[styles.historyRewardBadge, { backgroundColor: `${achievement.color}15` }]}>
                        <Text style={[styles.historyRewardText, { color: achievement.color }]}>{achievement.reward}</Text>
                      </View>
                    </View>
                  </AnimatedCard>
                ))}
              </>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Popup de célébration */}
      {celebrationData && (
        <AchievementCelebration
          visible={celebrationVisible}
          achievementName={celebrationData.name}
          achievementNameJp={celebrationData.nameJp}
          icon={celebrationData.icon}
          color={celebrationData.color}
          reward={celebrationData.reward}
          type={celebrationData.type}
          onClose={() => setCelebrationVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  headerSubtitle: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },

  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  todayText: { fontSize: 13, fontWeight: '700' },

  closeToUnlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  closeToUnlockText: { fontSize: 13, fontWeight: '700' },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  tabText: { fontSize: 11, fontWeight: '700' },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 16, marginBottom: 12 },

  currentCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  currentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  currentRankIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentRankInfo: { flex: 1 },
  currentRankName: { fontSize: 20, fontWeight: '900' },
  currentRankJp: { fontSize: 12, marginTop: 2 },
  currentRankDesc: { fontSize: 13, marginBottom: 12, lineHeight: 20 },
  streakBadge: { alignItems: 'center', gap: 2 },
  streakValue: { fontSize: 24, fontWeight: '900' },

  rewardUnlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
  },
  rewardUnlockedText: { fontSize: 12, fontWeight: '700' },

  currentLevelIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  currentLevelInfo: { flex: 1 },
  currentLevelName: { fontSize: 20, fontWeight: '900' },
  currentLevelJp: { fontSize: 12, marginTop: 2 },
  currentLevelDesc: { fontSize: 13, marginBottom: 12, lineHeight: 20 },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpValue: { fontSize: 16, fontWeight: '800' },

  nextRankSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  nextRankHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  nextRankLabel: { fontSize: 11, fontWeight: '600' },
  daysRemaining: { fontSize: 13, fontWeight: '700' },
  nextRankRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  nextRankName: { fontSize: 15, fontWeight: '700', flex: 1 },
  nextRankPercent: { fontSize: 12, fontWeight: '600' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  nextRewardPreview: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  nextRewardText: { fontSize: 11, fontWeight: '600' },

  nextLevelSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  nextLevelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  nextLevelLabel: { fontSize: 11, fontWeight: '600' },
  xpRemaining: { fontSize: 13, fontWeight: '700' },
  nextLevelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  nextLevelNumber: { fontSize: 15, fontWeight: '900' },
  nextLevelName: { fontSize: 15, fontWeight: '700', flex: 1 },
  nextLevelPercent: { fontSize: 12, fontWeight: '600' },

  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  rankIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankInfo: { flex: 1, marginLeft: 12 },
  rankNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankName: { fontSize: 16, fontWeight: '700' },
  rankNameJp: { fontSize: 11, marginTop: 2 },
  rankDesc: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  rewardText: { fontSize: 11, fontWeight: '600' },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statusContainer: { alignItems: 'center', justifyContent: 'center', minWidth: 50 },
  daysRequiredBadge: { alignItems: 'center' },
  daysRequired: { fontSize: 16, fontWeight: '800' },
  daysLabel: { fontSize: 9, fontWeight: '600' },

  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  levelIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  levelNumberBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumberSmall: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },
  levelInfo: { flex: 1, marginLeft: 12 },
  levelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelName: { fontSize: 16, fontWeight: '700' },
  levelNameJp: { fontSize: 11, marginTop: 2 },
  levelDesc: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  xpRequiredBadge: { alignItems: 'center' },
  xpRequired: { fontSize: 16, fontWeight: '800' },
  xpLabel: { fontSize: 9, fontWeight: '600' },

  statsCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  statsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  badgesProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  badgesStat: { alignItems: 'center', flex: 1 },
  badgesStatValue: { fontSize: 28, fontWeight: '900' },
  badgesStatLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  badgesDivider: { width: 1, height: 40, backgroundColor: 'rgba(0,0,0,0.1)' },

  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  badgeIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInfo: { flex: 1, marginLeft: 12 },
  badgeName: { fontSize: 16, fontWeight: '700' },
  badgeNameJp: { fontSize: 11, marginTop: 2 },
  badgeDesc: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  badgeProgressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  badgeProgressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  badgeProgressFill: { height: '100%', borderRadius: 3 },
  badgeProgressText: { fontSize: 11, fontWeight: '700', minWidth: 50, textAlign: 'right' },
  conditionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  conditionText: { fontSize: 11, fontWeight: '600' },
  unlockedBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  historyIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconPlaceholder: { fontSize: 24 },
  historyInfo: { flex: 1, marginLeft: 12 },
  historyName: { fontSize: 15, fontWeight: '700' },
  historyNameJp: { fontSize: 10, marginTop: 2 },
  historyDate: { fontSize: 10, marginTop: 4 },
  historyRewardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  historyRewardText: { fontSize: 10, fontWeight: '700' },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyStateSubtext: { fontSize: 13, textAlign: 'center' },
});
