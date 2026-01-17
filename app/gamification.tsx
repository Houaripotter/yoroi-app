// ============================================
// YOROI - PAGE DOJO
// Design Gaming Premium - Ton parcours champion
// ============================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path, G } from 'react-native-svg';
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
  ChevronRight,
  Play,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
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

// Composant Progress Ring animé
const ProgressRing: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  bgColor?: string;
}> = ({ progress, size, strokeWidth, color, bgColor = 'rgba(255,255,255,0.1)' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={bgColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};

export default function DojoScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [weightsCount, setWeightsCount] = useState(0);
  const [trainingsCount, setTrainingsCount] = useState(0);
  const [photosCount, setPhotosCount] = useState(0);
  const [hydrationDays, setHydrationDays] = useState(0);
  const [goalReached, setGoalReached] = useState(false);

  const [selectedTab, setSelectedTab] = useState<'rangs' | 'badges' | 'historique'>('rangs');

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Célébration
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);

  // Historique
  const [achievementsHistory, setAchievementsHistory] = useState<AchievementUnlock[]>([]);
  const [todayAchievements, setTodayAchievements] = useState<AchievementUnlock[]>([]);

  // Animations
  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );

    // Glow animation
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );

    // Rotate animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 20000, useNativeDriver: true })
    );

    pulse.start();
    glow.start();
    rotate.start();

    return () => {
      pulse.stop();
      glow.stop();
      rotate.stop();
    };
  }, []);

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

  // Rotation interpolation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={isDark ? ['#1F1F3D', '#0F0F1F'] : ['#667EEA', '#764BA2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        {/* Particules décoratives animées */}
        <Animated.View style={[styles.particle, styles.particle1, { transform: [{ rotate: spin }] }]}>
          <Star size={12} color="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.3)" />
        </Animated.View>
        <Animated.View style={[styles.particle, styles.particle2, { transform: [{ rotate: spin }] }]}>
          <Sparkles size={10} color="rgba(255,255,255,0.2)" />
        </Animated.View>
        <Animated.View style={[styles.particle, styles.particle3, { transform: [{ rotate: spin }] }]}>
          <Zap size={8} color="rgba(255,215,0,0.4)" />
        </Animated.View>

        {/* Navigation */}
        <View style={styles.headerNav}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backBtn}
          >
            <ChevronLeft size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{t('gamification.dojo')}</Text>
            <Text style={styles.headerSubtitle}>殿堂 - {t('gamification.yourJourney')}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Hero Section - Rang & Niveau */}
        <View style={styles.heroSection}>
          {/* Rang actuel avec anneau de progression */}
          <Animated.View style={[styles.rankHero, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.rankRingContainer}>
              <ProgressRing
                progress={rankProgress}
                size={100}
                strokeWidth={6}
                color={currentRank.color}
                bgColor="rgba(255,255,255,0.15)"
              />
              <View style={[styles.rankIconHero, { backgroundColor: currentRank.color }]}>
                {React.createElement(RankIconMap[currentRank.icon] || Target, {
                  size: 36,
                  color: '#FFFFFF'
                })}
              </View>
            </View>
            <Text style={styles.rankNameHero}>{currentRank.name}</Text>
            <Text style={styles.rankNameJpHero}>{currentRank.nameJp}</Text>
          </Animated.View>

          {/* Stats rapides */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <View style={styles.quickStatIcon}>
                <Flame size={20} color="#F97316" />
              </View>
              <Text style={styles.quickStatValue}>{streak}</Text>
              <Text style={styles.quickStatLabel}>{t('common.days')}</Text>
            </View>

            <View style={styles.quickStatDivider} />

            <View style={styles.quickStatItem}>
              <View style={styles.quickStatIcon}>
                <Zap size={20} color="#FFD700" />
              </View>
              <Text style={styles.quickStatValue}>{totalPoints}</Text>
              <Text style={styles.quickStatLabel}>XP</Text>
            </View>

            <View style={styles.quickStatDivider} />

            <View style={styles.quickStatItem}>
              <View style={styles.quickStatIcon}>
                <Medal size={20} color="#10B981" />
              </View>
              <Text style={styles.quickStatValue}>{unlockedBadges.length}</Text>
              <Text style={styles.quickStatLabel}>{t('gamification.badges').toLowerCase()}</Text>
            </View>
          </View>
        </View>

        {/* Progression vers prochain rang */}
        {nextRank && (
          <View style={styles.nextRankBanner}>
            <View style={styles.nextRankInfo}>
              {React.createElement(RankIconMap[nextRank.icon] || Target, {
                size: 18,
                color: nextRank.color
              })}
              <Text style={styles.nextRankText}>
                <Text style={{ fontWeight: '800', color: nextRank.color }}>{nextRank.name}</Text>
                {' '}{t('gamification.in')} <Text style={{ fontWeight: '800' }}>{daysToNextRank}</Text> {t('common.days').toLowerCase()}
              </Text>
            </View>
            <View style={styles.nextRankProgressBar}>
              <View style={[styles.nextRankProgressFill, { width: `${rankProgress}%`, backgroundColor: nextRank.color }]} />
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Achievements aujourd'hui */}
      {todayAchievements.length > 0 && (
        <Animated.View style={[
          styles.todayBanner,
          {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
          }
        ]}>
          <View style={styles.todayBannerIcon}>
            <Sparkles size={20} color="#10B981" />
          </View>
          <View style={styles.todayBannerContent}>
            <Text style={styles.todayBannerTitle}>
              {todayAchievements.length} achievement{todayAchievements.length > 1 ? 's' : ''} aujourd'hui !
            </Text>
            <Text style={styles.todayBannerSubtitle}>Continue comme ça, champion !</Text>
          </View>
          <ChevronRight size={20} color="#10B981" />
        </Animated.View>
      )}

      {/* Tabs améliorés */}
      <View style={[styles.tabsContainer, { backgroundColor: isDark ? '#1A1A2E' : '#F8FAFC' }]}>
        {[
          { key: 'rangs', icon: Trophy, label: t('gamification.ranks'), color: '#F59E0B' },
          { key: 'badges', icon: Award, label: t('gamification.badges'), color: '#8B5CF6' },
          { key: 'historique', icon: Clock, label: t('gamification.timeline'), color: '#3B82F6' },
        ].map((tab) => {
          const isActive = selectedTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabItem,
                isActive && { backgroundColor: isDark ? `${tab.color}20` : `${tab.color}15` },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedTab(tab.key as any);
              }}
              activeOpacity={0.7}
            >
              <tab.icon
                size={20}
                color={isActive ? tab.color : colors.textMuted}
              />
              <Text style={[
                styles.tabLabel,
                { color: isActive ? tab.color : colors.textMuted }
              ]}>
                {tab.label}
              </Text>
              {isActive && <View style={[styles.tabIndicator, { backgroundColor: tab.color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════ */}
        {/* TAB: RANGS */}
        {/* ═══════════════════════════════════════ */}
        {selectedTab === 'rangs' && (
          <View>
            {/* Niveau XP Section */}
            <View style={[styles.levelCard, { backgroundColor: isDark ? '#1F1F3D' : '#FFFFFF' }]}>
              <LinearGradient
                colors={[`${currentLevel.color}20`, 'transparent']}
                style={styles.levelCardGradient}
              />
              <View style={styles.levelCardHeader}>
                <View style={[styles.levelBadge, { backgroundColor: currentLevel.color }]}>
                  <Text style={styles.levelBadgeText}>{t('gamification.lvl')} {currentLevel.level}</Text>
                </View>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelName, { color: colors.textPrimary }]}>{currentLevel.name}</Text>
                  <Text style={[styles.levelNameJp, { color: colors.textMuted }]}>{currentLevel.nameJp}</Text>
                </View>
                <View style={styles.xpContainer}>
                  <Zap size={18} color="#FFD700" fill="#FFD700" />
                  <Text style={[styles.xpText, { color: colors.textPrimary }]}>{totalPoints}</Text>
                </View>
              </View>

              {nextLevel && (
                <View style={styles.levelProgressSection}>
                  <View style={styles.levelProgressHeader}>
                    <Text style={[styles.levelProgressLabel, { color: colors.textMuted }]}>
                      {t('gamification.next')}: <Text style={{ color: nextLevel.color, fontWeight: '700' }}>{nextLevel.name}</Text>
                    </Text>
                    <Text style={[styles.levelProgressXp, { color: colors.textPrimary }]}>
                      {levelProgressData.pointsToNext} XP
                    </Text>
                  </View>
                  <View style={[styles.levelProgressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
                    <LinearGradient
                      colors={[currentLevel.color, nextLevel.color]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.levelProgressFill, { width: `${levelProgressData.progress}%` }]}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Liste des rangs */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              {t('gamification.ranksProgression')}
            </Text>

            {RANKS.map((rank, index) => {
              const unlocked = streak >= rank.minDays;
              const isCurrent = rank.id === currentRank.id;
              const RankIcon = RankIconMap[rank.icon] || Target;
              const progressToRank = unlocked ? 100 : Math.min((streak / rank.minDays) * 100, 100);

              return (
                <AnimatedCard key={rank.id} index={index}>
                  <View style={[
                    styles.rankCard,
                    { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' },
                    isCurrent && {
                      borderWidth: 2,
                      borderColor: rank.color,
                      shadowColor: rank.color,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    },
                  ]}>
                    {/* Gradient overlay pour le rang actuel */}
                    {isCurrent && (
                      <LinearGradient
                        colors={[`${rank.color}15`, 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.rankCardGradient}
                      />
                    )}

                    {/* Icône avec ring de progression */}
                    <View style={styles.rankCardIconContainer}>
                      {!unlocked && (
                        <ProgressRing
                          progress={progressToRank}
                          size={64}
                          strokeWidth={4}
                          color={rank.color}
                          bgColor={isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}
                        />
                      )}
                      <View style={[
                        styles.rankCardIcon,
                        {
                          backgroundColor: unlocked ? rank.color : (isDark ? '#2D2D4D' : '#F3F4F6'),
                          position: unlocked ? 'relative' : 'absolute',
                        },
                      ]}>
                        {unlocked ? (
                          <RankIcon size={28} color="#FFFFFF" />
                        ) : (
                          <Lock size={24} color={colors.textMuted} />
                        )}
                      </View>
                    </View>

                    {/* Infos du rang */}
                    <View style={styles.rankCardInfo}>
                      <View style={styles.rankCardNameRow}>
                        <Text style={[
                          styles.rankCardName,
                          { color: unlocked ? rank.color : colors.textMuted }
                        ]}>
                          {rank.name}
                        </Text>
                        {isCurrent && (
                          <View style={[styles.currentTag, { backgroundColor: rank.color }]}>
                            <Text style={styles.currentTagText}>ACTUEL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.rankCardNameJp, { color: colors.textMuted }]}>
                        {rank.nameJp}
                      </Text>
                      <Text style={[styles.rankCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {rank.description}
                      </Text>

                      {/* Récompense */}
                      <View style={styles.rankCardReward}>
                        <Gift size={14} color={unlocked ? rank.color : colors.textMuted} />
                        <Text style={[
                          styles.rankCardRewardText,
                          { color: unlocked ? rank.color : colors.textMuted }
                        ]}>
                          {rank.reward}
                        </Text>
                      </View>
                    </View>

                    {/* Status */}
                    <View style={styles.rankCardStatus}>
                      {unlocked ? (
                        <View style={[styles.checkCircle, { backgroundColor: `${rank.color}20` }]}>
                          <Check size={18} color={rank.color} />
                        </View>
                      ) : (
                        <View style={styles.daysNeeded}>
                          <Text style={[styles.daysNeededValue, { color: colors.textPrimary }]}>
                            {rank.minDays - streak}
                          </Text>
                          <Text style={[styles.daysNeededLabel, { color: colors.textMuted }]}>
                            {t('common.days').toLowerCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </AnimatedCard>
              );
            })}
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* TAB: BADGES */}
        {/* ═══════════════════════════════════════ */}
        {selectedTab === 'badges' && (
          <View>
            {/* Stats des badges */}
            <View style={[styles.badgesStatsCard, { backgroundColor: isDark ? '#1F1F3D' : '#FFFFFF' }]}>
              <LinearGradient
                colors={['#8B5CF620', 'transparent']}
                style={styles.badgesStatsGradient}
              />
              <View style={styles.badgesStatsContent}>
                <View style={styles.badgesStatItem}>
                  <View style={[styles.badgesStatCircle, { borderColor: '#10B981' }]}>
                    <Text style={[styles.badgesStatValue, { color: '#10B981' }]}>
                      {unlockedBadges.length}
                    </Text>
                  </View>
                  <Text style={[styles.badgesStatLabel, { color: colors.textMuted }]}>{t('gamification.unlocked')}</Text>
                </View>

                <View style={styles.badgesStatDivider}>
                  <View style={[styles.badgesStatDividerLine, { backgroundColor: colors.border }]} />
                </View>

                <View style={styles.badgesStatItem}>
                  <View style={[styles.badgesStatCircle, { borderColor: colors.textMuted }]}>
                    <Text style={[styles.badgesStatValue, { color: colors.textMuted }]}>
                      {lockedBadges.length}
                    </Text>
                  </View>
                  <Text style={[styles.badgesStatLabel, { color: colors.textMuted }]}>{t('gamification.remaining')}</Text>
                </View>

                <View style={styles.badgesStatDivider}>
                  <View style={[styles.badgesStatDividerLine, { backgroundColor: colors.border }]} />
                </View>

                <View style={styles.badgesStatItem}>
                  <View style={[styles.badgesStatCircle, { borderColor: '#8B5CF6' }]}>
                    <Text style={[styles.badgesStatValue, { color: '#8B5CF6' }]}>
                      {BADGES.length}
                    </Text>
                  </View>
                  <Text style={[styles.badgesStatLabel, { color: colors.textMuted }]}>{t('gamification.total')}</Text>
                </View>
              </View>

              {/* Progress bar global */}
              <View style={styles.badgesProgressGlobal}>
                <View style={[styles.badgesProgressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
                  <LinearGradient
                    colors={['#8B5CF6', '#06B6D4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.badgesProgressFill, { width: `${(unlockedBadges.length / BADGES.length) * 100}%` }]}
                  />
                </View>
                <Text style={[styles.badgesProgressText, { color: colors.textPrimary }]}>
                  {Math.round((unlockedBadges.length / BADGES.length) * 100)}% {t('gamification.completed')}
                </Text>
              </View>
            </View>

            {/* Badges débloqués */}
            {unlockedBadges.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: '#10B981' }]}>
                  {t('gamification.unlockedBadges')}
                </Text>
                {unlockedBadges.map((badge, index) => (
                  <AnimatedCard key={badge.id} index={index}>
                    <View style={[
                      styles.badgeCard,
                      { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' },
                    ]}>
                      <LinearGradient
                        colors={[`${badge.color}15`, 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badgeCardGradient}
                      />

                      <View style={[styles.badgeIconContainer, { backgroundColor: badge.color }]}>
                        <badge.icon size={26} color="#FFFFFF" />
                      </View>

                      <View style={styles.badgeInfo}>
                        <View style={styles.badgeNameRow}>
                          <Text style={[styles.badgeName, { color: badge.color }]}>{badge.name}</Text>
                          <View style={[styles.unlockedTag, { backgroundColor: '#10B98120' }]}>
                            <Check size={12} color="#10B981" />
                          </View>
                        </View>
                        <Text style={[styles.badgeNameJp, { color: colors.textMuted }]}>{badge.nameJp}</Text>
                        <Text style={[styles.badgeDesc, { color: colors.textSecondary }]}>{badge.description}</Text>
                      </View>

                      <View style={[styles.badgeRewardTag, { backgroundColor: `${badge.color}15` }]}>
                        <Zap size={14} color={badge.color} fill={badge.color} />
                        <Text style={[styles.badgeRewardText, { color: badge.color }]}>{badge.reward}</Text>
                      </View>
                    </View>
                  </AnimatedCard>
                ))}
              </>
            )}

            {/* Badges à débloquer */}
            {lockedBadges.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  {t('gamification.toUnlock')}
                </Text>
                {lockedBadges.map((badge, index) => {
                  const progress = badge.getProgress(stats);
                  const progressPercent = (progress.current / progress.target) * 100;
                  const isClose = progressPercent >= 70;

                  return (
                    <AnimatedCard key={badge.id} index={index + unlockedBadges.length}>
                      <View style={[
                        styles.badgeCard,
                        styles.badgeCardLocked,
                        { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' },
                        isClose && { borderWidth: 1, borderColor: `${badge.color}40` },
                      ]}>
                        {isClose && (
                          <View style={[styles.closeBadge, { backgroundColor: badge.color }]}>
                            <Text style={styles.closeBadgeText}>{t('gamification.close')}</Text>
                          </View>
                        )}

                        <View style={styles.badgeIconContainerLocked}>
                          <ProgressRing
                            progress={progressPercent}
                            size={58}
                            strokeWidth={4}
                            color={badge.color}
                            bgColor={isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}
                          />
                          <View style={[styles.badgeIconLocked, { backgroundColor: isDark ? '#2D2D4D' : '#F3F4F6' }]}>
                            <badge.icon size={22} color={colors.textMuted} />
                          </View>
                        </View>

                        <View style={styles.badgeInfo}>
                          <Text style={[styles.badgeName, { color: colors.textMuted }]}>{badge.name}</Text>
                          <Text style={[styles.badgeNameJp, { color: colors.textMuted, opacity: 0.6 }]}>{badge.nameJp}</Text>
                          <Text style={[styles.badgeDesc, { color: colors.textMuted }]}>{badge.description}</Text>

                          {/* Progress info */}
                          <View style={styles.badgeProgressInfo}>
                            <Text style={[styles.badgeProgressText, { color: badge.color }]}>
                              {progress.current}/{progress.target}
                            </Text>
                            <Text style={[styles.badgeConditionText, { color: colors.textMuted }]}>
                              {badge.condition}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.badgeLockedStatus}>
                          <Lock size={18} color={colors.textMuted} />
                        </View>
                      </View>
                    </AnimatedCard>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* TAB: HISTORIQUE (Timeline) */}
        {/* ═══════════════════════════════════════ */}
        {selectedTab === 'historique' && (
          <View>
            {achievementsHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyStateIcon, { backgroundColor: isDark ? '#1F1F3D' : '#F3F4F6' }]}>
                  <Clock size={48} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                  {t('gamification.storyStartsHere')}
                </Text>
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  {t('gamification.timelineDescription')}
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedTab('badges');
                  }}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyStateButtonGradient}
                  >
                    <Play size={18} color="#FFFFFF" />
                    <Text style={styles.emptyStateButtonText}>{t('gamification.viewBadges')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  {t('gamification.yourTimeline')} ({achievementsHistory.length})
                </Text>

                {/* Timeline */}
                <View style={styles.timeline}>
                  {achievementsHistory.map((achievement, index) => (
                    <AnimatedCard key={`${achievement.id}-${achievement.unlockedAt}`} index={index}>
                      <View style={styles.timelineItem}>
                        {/* Ligne verticale */}
                        {index < achievementsHistory.length - 1 && (
                          <View style={[styles.timelineLine, { backgroundColor: achievement.color }]} />
                        )}

                        {/* Point sur la timeline */}
                        <View style={[styles.timelineDot, { backgroundColor: achievement.color }]}>
                          {achievement.type === 'badge' ? (
                            <Medal size={14} color="#FFFFFF" />
                          ) : achievement.type === 'rank' ? (
                            <Trophy size={14} color="#FFFFFF" />
                          ) : (
                            <Zap size={14} color="#FFFFFF" />
                          )}
                        </View>

                        {/* Carte d'achievement */}
                        <View style={[
                          styles.timelineCard,
                          { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' },
                        ]}>
                          <LinearGradient
                            colors={[`${achievement.color}10`, 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.timelineCardGradient}
                          />

                          <View style={styles.timelineCardHeader}>
                            <View>
                              <Text style={[styles.timelineCardName, { color: achievement.color }]}>
                                {achievement.name}
                              </Text>
                              <Text style={[styles.timelineCardNameJp, { color: colors.textMuted }]}>
                                {achievement.nameJp}
                              </Text>
                            </View>
                            <View style={[styles.timelineReward, { backgroundColor: `${achievement.color}15` }]}>
                              <Text style={[styles.timelineRewardText, { color: achievement.color }]}>
                                {achievement.reward}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.timelineCardFooter}>
                            <Text style={[styles.timelineDate, { color: colors.textMuted }]}>
                              {format(new Date(achievement.unlockedAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                            </Text>
                            <View style={[styles.timelineType, { backgroundColor: isDark ? '#2D2D4D' : '#F3F4F6' }]}>
                              <Text style={[styles.timelineTypeText, { color: colors.textMuted }]}>
                                {achievement.type === 'badge' ? t('gamification.badge') : achievement.type === 'rank' ? t('gamification.rank') : t('gamification.level')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </AnimatedCard>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
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

  // ═══════════════════════════════════════
  // HEADER GRADIENT
  // ═══════════════════════════════════════
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    marginTop: 2,
  },

  // Particules décoratives
  particle: { position: 'absolute' },
  particle1: { top: 60, left: 30 },
  particle2: { top: 100, right: 40 },
  particle3: { bottom: 80, left: 60 },

  // ═══════════════════════════════════════
  // HERO SECTION
  // ═══════════════════════════════════════
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  rankHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rankRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankIconHero: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rankNameHero: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
  },
  rankNameJpHero: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 20,
  },
  quickStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  quickStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Next Rank Banner
  nextRankBanner: {
    marginTop: 16,
    paddingHorizontal: 16,
    width: '100%',
  },
  nextRankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  nextRankText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  nextRankProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  nextRankProgressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ═══════════════════════════════════════
  // TODAY BANNER
  // ═══════════════════════════════════════
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  todayBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBannerContent: {
    flex: 1,
  },
  todayBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  todayBannerSubtitle: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
  },

  // ═══════════════════════════════════════
  // TABS
  // ═══════════════════════════════════════
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 6,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 20,
    height: 3,
    borderRadius: 2,
  },

  // ═══════════════════════════════════════
  // SCROLL VIEW
  // ═══════════════════════════════════════
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 14,
    textTransform: 'uppercase',
  },

  // ═══════════════════════════════════════
  // LEVEL CARD
  // ═══════════════════════════════════════
  levelCard: {
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  levelCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  levelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  levelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: 18,
    fontWeight: '800',
  },
  levelNameJp: {
    fontSize: 11,
    marginTop: 2,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpText: {
    fontSize: 18,
    fontWeight: '900',
  },
  levelProgressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  levelProgressLabel: {
    fontSize: 12,
  },
  levelProgressXp: {
    fontSize: 12,
    fontWeight: '700',
  },
  levelProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // ═══════════════════════════════════════
  // RANK CARDS
  // ═══════════════════════════════════════
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  rankCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  rankCardIconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankCardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  rankCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankCardName: {
    fontSize: 16,
    fontWeight: '800',
  },
  currentTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  currentTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  rankCardNameJp: {
    fontSize: 10,
    marginTop: 2,
  },
  rankCardDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  rankCardReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  rankCardRewardText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rankCardStatus: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysNeeded: {
    alignItems: 'center',
  },
  daysNeededValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  daysNeededLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // ═══════════════════════════════════════
  // BADGES STATS CARD
  // ═══════════════════════════════════════
  badgesStatsCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  badgesStatsGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  badgesStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  badgesStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  badgesStatCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgesStatValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  badgesStatLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgesStatDivider: {
    height: 60,
    justifyContent: 'center',
  },
  badgesStatDividerLine: {
    width: 1,
    height: 40,
  },
  badgesProgressGlobal: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgesProgressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgesProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  badgesProgressText: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'right',
  },

  // ═══════════════════════════════════════
  // BADGE CARDS
  // ═══════════════════════════════════════
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  badgeCardLocked: {
    opacity: 0.85,
  },
  badgeCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  badgeIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeIconContainerLocked: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeIconLocked: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  badgeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  unlockedTag: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNameJp: {
    fontSize: 10,
    marginTop: 2,
  },
  badgeDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  badgeProgressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  badgeProgressText: {
    fontSize: 13,
    fontWeight: '800',
  },
  badgeConditionText: {
    fontSize: 11,
  },
  badgeRewardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeRewardText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeLockedStatus: {
    marginLeft: 10,
  },
  closeBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 16,
  },
  closeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ═══════════════════════════════════════
  // TIMELINE (HISTORIQUE)
  // ═══════════════════════════════════════
  timeline: {
    paddingLeft: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 40,
    bottom: -20,
    width: 2,
    borderRadius: 1,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  timelineCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timelineCardName: {
    fontSize: 15,
    fontWeight: '700',
  },
  timelineCardNameJp: {
    fontSize: 10,
    marginTop: 2,
  },
  timelineReward: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timelineRewardText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  timelineDate: {
    fontSize: 10,
  },
  timelineType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timelineTypeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ═══════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyStateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
