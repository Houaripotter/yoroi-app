// ============================================
// PAGE 1 - MONITORING (Redesign Premium)
// ============================================

import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Animated, FlatList, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { router } from 'expo-router';
import { Sparkles, TrendingUp, TrendingDown, Minus, Target, Home, Grid, LineChart, Dumbbell, Apple, Droplet, Share2, X, Calendar, CalendarDays, CalendarRange } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AnimatedCounter from '@/components/AnimatedCounter';
import AvatarDisplay from '@/components/AvatarDisplay';
import { HydrationCardFullWidth } from '@/components/cards/HydrationCardFullWidth';
import { SleepCardFullWidth } from '@/components/cards/SleepCardFullWidth';
import { ChargeCardFullWidth } from '@/components/cards/ChargeCardFullWidth';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserSettings } from '@/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLatestBodyComposition, BodyComposition } from '@/lib/bodyComposition';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375; // iPhone SE, petits téléphones
const IS_VERY_SMALL_SCREEN = SCREEN_WIDTH < 350; // Très petits téléphones
const CARD_PADDING = 12; // Padding horizontal pour réduire la largeur des cartes

interface Page1MonitoringProps {
  userName?: string;
  profilePhoto?: string | null;
  dailyQuote?: string | null;
  steps?: number;
  streak?: number;
  level?: number;
  rankName?: string;
  rankColor?: string;
  currentWeight?: number;
  targetWeight?: number;
  weightHistory?: number[];
  weightTrend?: 'up' | 'down' | 'stable';
  hydration?: number;
  hydrationGoal?: number;
  sleepHours?: number;
  sleepDebt?: number;
  sleepGoal?: number;
  workloadStatus?: 'none' | 'light' | 'moderate' | 'intense';
  onAddWeight?: () => void;
  onAddWater?: (ml: number) => void;
  refreshTrigger?: number;
}

// ============================================
// COMPOSANT BARRE DE PROGRESSION POIDS (Simple avec couleurs)
// ============================================
interface WeightProgressProps {
  currentWeight: number;
  targetWeight: number;
  startWeight: number;
  userGoal: 'lose' | 'maintain' | 'gain';
  isDark: boolean;
  colors: any;
}

const WeightProgressWithCharacter: React.FC<WeightProgressProps> = ({
  currentWeight,
  targetWeight,
  startWeight,
  userGoal,
  isDark,
  colors,
}) => {
  // Calcul du pourcentage de progression
  const calculateProgress = () => {
    if (targetWeight <= 0 || startWeight <= 0) return 50;

    if (userGoal === 'lose') {
      const totalToLose = startWeight - targetWeight;
      if (totalToLose <= 0) return 100;
      const lost = startWeight - currentWeight;
      return Math.min(100, Math.max(0, (lost / totalToLose) * 100));
    } else if (userGoal === 'gain') {
      const totalToGain = targetWeight - startWeight;
      if (totalToGain <= 0) return 100;
      const gained = currentWeight - startWeight;
      return Math.min(100, Math.max(0, (gained / totalToGain) * 100));
    }
    return 50;
  };

  const progress = calculateProgress();

  // Couleur selon la progression (rouge -> orange -> jaune -> vert)
  const getProgressColor = (percent: number) => {
    if (percent < 25) return '#EF4444'; // Rouge - loin
    if (percent < 50) return '#F97316'; // Orange - commence
    if (percent < 75) return '#EAB308'; // Jaune - se rapproche
    return '#10B981'; // Vert - proche/atteint
  };

  const progressColor = getProgressColor(progress);

  return (
    <View style={progressStyles.container}>
      {/* Barre de progression */}
      <View style={[progressStyles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
        {/* Fond dégradé complet */}
        <LinearGradient
          colors={['#EF4444', '#F97316', '#EAB308', '#10B981']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={progressStyles.gradientBackground}
        />
        {/* Masque pour cacher la partie non atteinte */}
        <View
          style={[
            progressStyles.mask,
            {
              left: `${Math.min(100, Math.max(5, progress))}%`,
              backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
            }
          ]}
        />
        {/* Indicateur de position */}
        <View
          style={[
            progressStyles.indicator,
            {
              left: `${Math.min(95, Math.max(2, progress))}%`,
              backgroundColor: progressColor,
            }
          ]}
        />
      </View>

      {/* Labels */}
      <View style={progressStyles.labels}>
        <Text style={[progressStyles.label, { color: colors.textMuted }]}>
          {startWeight.toFixed(1)} kg
        </Text>
        <Text style={[progressStyles.progressText, { color: progressColor }]}>
          {progress.toFixed(0)}%
        </Text>
        <Text style={[progressStyles.label, { color: '#10B981' }]}>
          {targetWeight > 0 ? targetWeight.toFixed(1) : currentWeight.toFixed(1)} kg
        </Text>
      </View>
    </View>
  );
};

const progressStyles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 8,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  mask: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.85,
  },
  indicator: {
    position: 'absolute',
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

const Page1MonitoringComponent: React.FC<Page1MonitoringProps> = ({
  userName = 'Athlète',
  profilePhoto,
  dailyQuote,
  steps = 0,
  streak = 0,
  level = 1,
  rankName = 'Novice',
  rankColor = '#94A3B8',
  currentWeight = 0,
  targetWeight = 0,
  weightHistory = [],
  weightTrend = 'stable',
  hydration = 0,
  hydrationGoal = 2500,
  sleepHours = 0,
  sleepDebt = 0,
  sleepGoal = 8,
  workloadStatus = 'none',
  onAddWeight,
  onAddWater,
  refreshTrigger = 0,
}) => {
  const { colors, isDark } = useTheme();
  const { t, locale } = useI18n();
  const [userGoal, setUserGoal] = useState<'lose' | 'maintain' | 'gain'>('lose');
  const [bodyComposition, setBodyComposition] = useState<BodyComposition | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Localized greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greetingMorning');
    if (hour < 18) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
  };

  // Localized month names
  const monthNames = useMemo(() => [
    t('dates.januaryShort'), t('dates.februaryShort'), t('dates.marchShort'),
    t('dates.aprilShort'), t('dates.mayShort'), t('dates.juneShort'),
    t('dates.julyShort'), t('dates.augustShort'), t('dates.septemberShort'),
    t('dates.octoberShort'), t('dates.novemberShort'), t('dates.decemberShort')
  ], [t]);

  // Share button state
  const [showShareButton, setShowShareButton] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareButtonScale = useRef(new Animated.Value(1)).current;
  const shareButtonGlow = useRef(new Animated.Value(0.4)).current;
  const shareButtonRotate = useRef(new Animated.Value(0)).current;
  const shareMenuAnim = useRef(new Animated.Value(0)).current;
  const menuItem1Anim = useRef(new Animated.Value(0)).current;
  const menuItem2Anim = useRef(new Animated.Value(0)).current;
  const menuItem3Anim = useRef(new Animated.Value(0)).current;

  // Animations citation - apparition simple
  const quoteFadeAnim = useRef(new Animated.Value(0)).current;
  const quoteScaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Animation apparition de la citation
    if (dailyQuote) {
      Animated.parallel([
        Animated.timing(quoteFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(quoteScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [dailyQuote]);

  // Load user's goal from settings
  useEffect(() => {
    const loadGoal = async () => {
      try {
        const settings = await getUserSettings();
        if (settings.goal === 'gain') {
          setUserGoal('gain');
        } else if (settings.goal === 'maintain') {
          setUserGoal('maintain');
        } else {
          setUserGoal('lose');
        }
      } catch (error) {
        console.error('Error loading goal:', error);
      }
    };
    loadGoal();
  }, []);

  // Load body composition data
  useEffect(() => {
    const loadBodyComposition = async () => {
      try {
        const data = await getLatestBodyComposition();
        setBodyComposition(data);
      } catch (error) {
        console.error('Error loading body composition:', error);
      }
    };
    loadBodyComposition();
  }, [refreshTrigger]);

  // Check if share button was dismissed
  useEffect(() => {
    const checkShareButtonDismissed = async () => {
      try {
        const dismissed = await AsyncStorage.getItem('@share_button_dismissed');
        if (dismissed === 'true') {
          setShowShareButton(false);
        }
      } catch (error) {
        console.error('Error checking share button:', error);
      }
    };
    checkShareButtonDismissed();
  }, []);

  // Share button animations
  useEffect(() => {
    if (!showShareButton) return;

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shareButtonScale, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shareButtonScale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shareButtonGlow, {
          toValue: 0.8,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shareButtonGlow, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [showShareButton]);

  const openShareMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowShareMenu(true);

    // Animation d'ouverture du menu avec effet cascade
    Animated.parallel([
      Animated.spring(shareMenuAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(shareButtonRotate, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation cascade des items
    Animated.stagger(80, [
      Animated.spring(menuItem1Anim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.spring(menuItem2Anim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      Animated.spring(menuItem3Anim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const closeShareMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animation de fermeture
    Animated.parallel([
      Animated.timing(shareMenuAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(shareButtonRotate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(menuItem1Anim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(menuItem2Anim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(menuItem3Anim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setShowShareMenu(false));
  };

  const handleSharePress = () => {
    if (showShareMenu) {
      closeShareMenu();
    } else {
      openShareMenu();
    }
  };

  const handleShareCard = (type: 'weekly' | 'monthly' | 'yearly') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeShareMenu();

    // Naviguer vers la carte appropriée
    setTimeout(() => {
      switch (type) {
        case 'weekly':
          router.push('/social-share/weekly-recap-v2');
          break;
        case 'monthly':
          router.push('/social-share/monthly-recap-v2');
          break;
        case 'yearly':
          router.push('/social-share/year-counter-v2');
          break;
      }
    }, 200);
  };

  const handleDismissShareButton = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showShareMenu) {
      closeShareMenu();
    }
    setShowShareButton(false);
    try {
      await AsyncStorage.setItem('@share_button_dismissed', 'true');
    } catch (error) {
      console.error('Error saving share button state:', error);
    }
  };

  const weightDiff = currentWeight - targetWeight;
  const startWeight = weightHistory.length > 0 ? weightHistory[0] : currentWeight;
  const totalLoss = startWeight - currentWeight;
  const progressPercentage = Math.abs(((startWeight - currentWeight) / (startWeight - targetWeight)) * 100);

  const getTrendIcon = () => {
    if (weightTrend === 'down') return TrendingDown;
    if (weightTrend === 'up') return TrendingUp;
    return Minus;
  };

  const getWeightLabel = () => {
    if (userGoal === 'lose') return t('home.lost');
    if (userGoal === 'gain') return t('home.gained');
    return t('home.stable');
  };

  const TrendIcon = getTrendIcon();
  const trendColor = weightTrend === 'down' ? '#10B981' : weightTrend === 'up' ? '#EF4444' : '#94A3B8';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background, overflow: 'visible' }]}
      contentContainerStyle={[styles.scrollContent, { overflow: 'visible' }]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {/* HERO HEADER - Agrandi */}
      <View style={styles.heroHeader}>
        {/* Photo + Greeting + Avatar Row */}
        <View style={styles.heroTop}>
          <TouchableOpacity
            style={[styles.profilePhotoLarge, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
            onPress={() => router.push('/profile')}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profilePhotoImage} />
            ) : (
              <Ionicons name="person" size={28} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Greeting + Name au centre */}
          <View style={styles.greetingSection}>
            <Text style={[styles.greetingLarge, { color: colors.textMuted }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.userNameLarge, { color: colors.textPrimary }]}>
              {userName}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/avatar-selection')}
            style={styles.avatarLarge}
          >
            <AvatarDisplay size="small" refreshTrigger={refreshTrigger} />
          </TouchableOpacity>
        </View>

        {/* CITATION MOTIVANTE - TRÈS TRÈS COLLÉE AU HEADER */}
        {dailyQuote && (
          <Animated.View
            style={[
              { paddingHorizontal: CARD_PADDING, marginTop: 10 },
              { opacity: quoteFadeAnim, transform: [{ scale: quoteScaleAnim }] }
            ]}
          >
            {/* Badge "Citation du jour" - AU-DESSUS */}
            <View style={[styles.quoteBadgeTop, {
              backgroundColor: `${colors.accent}15`,
              borderColor: `${colors.accent}40`,
            }]}>
              <Text style={[styles.quoteBadgeTextTop, { color: isDark ? colors.accent : colors.textPrimary }]}>{t('home.dailyQuote')}</Text>
            </View>

            {/* Carte citation avec fond adaptatif - PLEINE LARGEUR */}
            <View style={[styles.cloudBubble, {
              backgroundColor: colors.backgroundCard,
              shadowColor: isDark ? colors.accent : '#000',
              borderColor: colors.border,
            }]}>
              <Text style={[styles.quoteTextCloud, { color: colors.textPrimary }]}>
                "{dailyQuote}"
              </Text>
            </View>
          </Animated.View>
        )}
      </View>

        {/* Fond qui couvre les onglets quand on scrolle */}
        <View style={[styles.contentBackground, { backgroundColor: colors.background }]}>

        {/* STATS COMPACT ROW - Gradient Cards avec navigation */}
        <View style={styles.statsRow}>
        {/* Pas - navigation vers vitalité */}
        <TouchableOpacity
          style={styles.statCardTouchable}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/vitality-detail');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCardGradient}
          >
            <MaterialCommunityIcons name="walk" size={10} color="#FFFFFF" />
            <AnimatedCounter
              value={steps}
              style={styles.statValueWhite}
              duration={800}
            />
            <Text style={styles.statLabelWhite}>{t('home.stepsLabel')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Série - navigation vers records */}
        <TouchableOpacity
          style={styles.statCardTouchable}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/records');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCardGradient}
          >
            <Ionicons name="flame" size={10} color="#FFFFFF" />
            <AnimatedCounter
              value={streak}
              style={styles.statValueWhite}
              duration={800}
            />
            <Text style={styles.statLabelWhite}>{t('home.streakLabel')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Niveau - navigation vers gamification */}
        <TouchableOpacity
          style={styles.statCardTouchable}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/gamification');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCardGradient}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={10} color="#FFFFFF" />
            <AnimatedCounter
              value={level}
              style={styles.statValueWhite}
              duration={800}
            />
            <Text style={styles.statLabelWhite}>{t('home.levelLabel')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Rang - navigation vers gamification */}
        <TouchableOpacity
          style={styles.statCardTouchable}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/gamification');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.accent, `${colors.accent}DD`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCardGradient}
          >
            <MaterialCommunityIcons name="trophy" size={10} color={colors.textOnAccent} />
            <Text style={[styles.statValueWhite, { color: colors.textOnAccent }]} numberOfLines={1} ellipsizeMode="tail">
              {rankName}
            </Text>
            <Text style={[styles.statLabelWhite, { color: colors.textOnAccent }]}>{t('home.rankLabel')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* GRAPHIQUE POIDS - Redesign Complet Premium */}
      <View style={[styles.weightCardPremium, { backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/stats?tab=poids')}
          activeOpacity={0.9}
        >
        {/* Header */}
        <View style={styles.weightHeader}>
          <View style={styles.weightHeaderLeft}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.weightIcon}
            >
              <Ionicons name="fitness" size={18} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.weightTitle, { color: colors.textPrimary }]}>
                {t('home.currentWeight')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Target size={12} color="#EF4444" strokeWidth={2.5} />
                <Text style={[styles.weightSubtitle, { color: colors.textMuted }]}>
                  {t('home.objective')} {targetWeight} kg
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.trendBadge, { backgroundColor: `${trendColor}15` }]}>
            <TrendIcon size={12} color={trendColor} strokeWidth={2.5} />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {Math.abs(totalLoss).toFixed(1)} kg
            </Text>
          </View>
        </View>

        {/* Ligne optimisée: Évolution - Poids - Reste */}
        <View style={styles.weightOptimizedRow}>
          {/* Évolution à gauche */}
          <View style={styles.weightSideMetric}>
            <Text style={[styles.metricTopLabel, { color: '#10B981' }]}>
              {getWeightLabel()}
            </Text>
            <Text style={[styles.metricTopValue, { color: '#10B981' }]}>
              {totalLoss >= 0 ? '-' : '+'}{Math.abs(totalLoss).toFixed(1)} kg
            </Text>
          </View>

          {/* Poids au centre */}
          <View style={styles.weightCenterMetric}>
            <View style={styles.weightValueRow}>
              <Text style={[styles.weightValueLarge, { color: colors.textPrimary }]}>
                {currentWeight.toFixed(1)}
              </Text>
              <Text style={[styles.weightUnit, { color: colors.textSecondary }]}>kg</Text>
            </View>
          </View>

          {/* Reste à droite */}
          <View style={[styles.weightSideMetric, { alignItems: 'flex-end' }]}>
            <Text style={[styles.metricTopLabel, { color: Math.abs(weightDiff) <= 0.1 ? '#10B981' : '#F59E0B' }]}>{t('home.remaining')}</Text>
            {Math.abs(weightDiff) <= 0.1 ? (
              // Objectif atteint - Célébration!
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Sparkles size={14} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.metricTopValue, { color: '#10B981' }]}>0 kg</Text>
                <Sparkles size={14} color="#F59E0B" strokeWidth={2.5} />
              </View>
            ) : (
              <Text style={[styles.metricTopValue, { color: '#F59E0B' }]}>
                {Math.abs(weightDiff).toFixed(1)} kg
              </Text>
            )}
          </View>
        </View>

        {/* Barre de progression du poids avec personnage animé */}
        {currentWeight > 0 && (
          <WeightProgressWithCharacter
            currentWeight={currentWeight}
            targetWeight={targetWeight}
            startWeight={weightHistory.length > 0 ? weightHistory[0] : currentWeight}
            userGoal={userGoal}
            isDark={isDark}
            colors={colors}
          />
        )}

        {/* Composition corporelle - Chaque élément cliquable */}
        <View style={[styles.bodyComposition, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          {/* Muscle - navigation vers composition */}
          <TouchableOpacity
            style={styles.compositionItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/stats?tab=composition');
            }}
            activeOpacity={0.7}
          >
            <Dumbbell size={14} color="#EF4444" strokeWidth={2.5} />
            <View style={styles.compositionInfo}>
              <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>{t('home.muscle')}</Text>
              <Text style={[styles.compositionValue, { color: colors.textPrimary }]}>
                {bodyComposition?.muscleMass ? `${bodyComposition.muscleMass.toFixed(1)} kg` : '--'}
              </Text>
              <Text style={[styles.compositionPercent, { color: '#EF4444' }]}>
                {bodyComposition?.muscleMass && currentWeight > 0
                  ? `${((bodyComposition.muscleMass / currentWeight) * 100).toFixed(0)}%`
                  : '--%'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.compositionDivider} />

          {/* Graisse - navigation vers composition */}
          <TouchableOpacity
            style={styles.compositionItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/stats?tab=composition');
            }}
            activeOpacity={0.7}
          >
            <Apple size={14} color="#F59E0B" strokeWidth={2.5} />
            <View style={styles.compositionInfo}>
              <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>{t('home.fat')}</Text>
              <Text style={[styles.compositionValue, { color: colors.textPrimary }]}>
                {bodyComposition?.bodyFatPercent != null && currentWeight > 0
                  ? `${((bodyComposition.bodyFatPercent / 100) * currentWeight).toFixed(1)} kg`
                  : '--'}
              </Text>
              <Text style={[styles.compositionPercent, { color: '#F59E0B' }]}>
                {bodyComposition?.bodyFatPercent != null ? `${bodyComposition.bodyFatPercent.toFixed(0)}%` : '--%'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.compositionDivider} />

          {/* Eau - navigation vers composition */}
          <TouchableOpacity
            style={styles.compositionItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/stats?tab=composition');
            }}
            activeOpacity={0.7}
          >
            <Droplet size={14} color="#3B82F6" strokeWidth={2.5} />
            <View style={styles.compositionInfo}>
              <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>{t('home.water')}</Text>
              <Text style={[styles.compositionValue, { color: colors.textPrimary }]}>
                {bodyComposition?.waterPercent != null && currentWeight > 0
                  ? `${((bodyComposition.waterPercent / 100) * currentWeight).toFixed(1)} kg`
                  : '--'}
              </Text>
              <Text style={[styles.compositionPercent, { color: '#3B82F6' }]}>
                {bodyComposition?.waterPercent != null ? `${bodyComposition.waterPercent.toFixed(0)}%` : '--%'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        </TouchableOpacity>

        {/* GRAPHIQUE SIMPLE SCROLLABLE AVEC FLATLIST - Cliquable vers stats poids */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/stats?tab=poids');
          }}
          activeOpacity={0.9}
        >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.simpleChart}
          contentContainerStyle={styles.simpleChartContent}
          data={weightHistory.slice(-30)}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          keyExtractor={(item, index) => `weight-${index}`}
          renderItem={({ item: weight, index }) => {
            const array = weightHistory.slice(-30);
            const maxWeight = Math.max(...array);
            const minWeight = Math.min(...array);
            const range = maxWeight - minWeight || 1;
            const heightPercent = ((weight - minWeight) / range) * 100;

            // Calculer la date réelle
            const today = new Date();
            const daysAgo = array.length - 1 - index;
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);
            const dayOfMonth = date.getDate();
            const monthLabel = monthNames[date.getMonth()];

            // Calculer la variation
            const previousWeight = index > 0 ? array[index - 1] : null;
            const diff = previousWeight ? weight - previousWeight : 0;
            const isGain = diff > 0.05;
            const isLoss = diff < -0.05;
            const isStable = !isGain && !isLoss;

            // LOGIQUE COULEUR INTELLIGENTE
            let arrowColor = colors.textMuted;
            let arrowIcon = '→';

            if (userGoal === 'lose') {
              if (isLoss) {
                arrowColor = '#10B981';
                arrowIcon = '↘';
              } else if (isGain) {
                arrowColor = '#EF4444';
                arrowIcon = '↗';
              } else {
                arrowColor = '#F59E0B';
                arrowIcon = '→';
              }
            } else if (userGoal === 'gain') {
              if (isGain) {
                arrowColor = '#10B981';
                arrowIcon = '↗';
              } else if (isLoss) {
                arrowColor = '#EF4444';
                arrowIcon = '↘';
              } else {
                arrowColor = '#F59E0B';
                arrowIcon = '→';
              }
            } else {
              if (isStable) {
                arrowColor = '#10B981';
                arrowIcon = '→';
              } else {
                arrowColor = '#F59E0B';
                arrowIcon = isGain ? '↗' : '↘';
              }
            }

            return (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <View style={styles.simpleChartBar}>
                  <Text style={[styles.simpleChartWeight, { color: colors.textPrimary }]}>
                    {weight.toFixed(1)}
                  </Text>
                  <View style={styles.simpleChartBarBg}>
                    <LinearGradient
                      colors={[colors.accent, colors.accent + 'DD', colors.accent + 'BB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[
                        styles.simpleChartBarFill,
                        { height: `${Math.max(heightPercent, 10)}%` }
                      ]}
                    />
                  </View>
                  <Text style={[styles.simpleChartDate, { color: colors.textPrimary }]}>
                    {dayOfMonth}
                  </Text>
                  <Text style={[styles.simpleChartMonth, { color: colors.textMuted }]}>
                    {monthLabel}
                  </Text>
                </View>

                {/* Indicateur de variation */}
                {index < array.length - 1 && (
                  <View style={styles.simpleChartConnector}>
                    <View style={[styles.simpleChartArrow, { backgroundColor: arrowColor }]}>
                      <Text style={styles.simpleChartArrowIcon}>{arrowIcon}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          }}
        />
        </TouchableOpacity>

        {/* Prédictions */}
        <TouchableOpacity
          style={[styles.predictionsContainer, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }]}
          onPress={() => router.push('/weight-predictions')}
          activeOpacity={0.7}
        >
          <View style={styles.predictionsHeader}>
            <TrendingUp size={14} color="#8B5CF6" strokeWidth={2.5} />
            <Text style={[styles.predictionsTitle, { color: '#8B5CF6' }]}>
              {t('home.predictions.title')}
            </Text>
          </View>

          <View style={styles.predictionsRow}>
            <View style={styles.predictionItem}>
              <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>{t('home.predictions.30days')}</Text>
              <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                {(currentWeight - totalLoss).toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.predictionDivider} />

            <View style={styles.predictionItem}>
              <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>{t('home.predictions.90days')}</Text>
              <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                {(currentWeight - totalLoss * 3).toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.predictionDivider} />

            <View style={styles.predictionItem}>
              <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>{t('home.predictions.6months')}</Text>
              <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                {(currentWeight - totalLoss * 6).toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.predictionDivider} />

            <View style={styles.predictionItem}>
              <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>{t('home.predictions.1year')}</Text>
              <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                {(currentWeight - totalLoss * 12).toFixed(1)} kg
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* FLOATING SHARE BUTTON WITH MENU - Animated */}
        {showShareButton && (
          <View style={styles.shareButtonContainer}>
            {/* Menu des cartes - apparaît au-dessus du bouton */}
            {showShareMenu && (
              <Animated.View
                style={[
                  styles.shareMenuContainer,
                  {
                    opacity: shareMenuAnim,
                    transform: [{
                      translateY: shareMenuAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  },
                ]}
              >
                {/* Carte Hebdo */}
                <Animated.View
                  style={{
                    opacity: menuItem1Anim,
                    transform: [{
                      scale: menuItem1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    }, {
                      translateX: menuItem1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  }}
                >
                  <TouchableOpacity
                    style={[styles.shareMenuItem, { backgroundColor: colors.backgroundCard }]}
                    onPress={() => handleShareCard('weekly')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#3B82F6', '#2563EB']}
                      style={styles.shareMenuIcon}
                    >
                      <CalendarDays size={16} color="#FFF" strokeWidth={2.5} />
                    </LinearGradient>
                    <Text style={[styles.shareMenuText, { color: colors.textPrimary }]}>
                      {t('share.weeklyCard') || 'Hebdo'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                {/* Carte Mensuelle */}
                <Animated.View
                  style={{
                    opacity: menuItem2Anim,
                    transform: [{
                      scale: menuItem2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    }, {
                      translateX: menuItem2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  }}
                >
                  <TouchableOpacity
                    style={[styles.shareMenuItem, { backgroundColor: colors.backgroundCard }]}
                    onPress={() => handleShareCard('monthly')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#8B5CF6', '#7C3AED']}
                      style={styles.shareMenuIcon}
                    >
                      <Calendar size={16} color="#FFF" strokeWidth={2.5} />
                    </LinearGradient>
                    <Text style={[styles.shareMenuText, { color: colors.textPrimary }]}>
                      {t('share.monthlyCard') || 'Mensuel'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                {/* Carte Annuelle */}
                <Animated.View
                  style={{
                    opacity: menuItem3Anim,
                    transform: [{
                      scale: menuItem3Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    }, {
                      translateX: menuItem3Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  }}
                >
                  <TouchableOpacity
                    style={[styles.shareMenuItem, { backgroundColor: colors.backgroundCard }]}
                    onPress={() => handleShareCard('yearly')}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      style={styles.shareMenuIcon}
                    >
                      <CalendarRange size={16} color="#FFF" strokeWidth={2.5} />
                    </LinearGradient>
                    <Text style={[styles.shareMenuText, { color: colors.textPrimary }]}>
                      {t('share.yearlyCard') || 'Annuel'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            )}

            {/* Glow effect */}
            <Animated.View
              style={[
                styles.shareButtonGlow,
                {
                  opacity: showShareMenu ? 0 : shareButtonGlow,
                  backgroundColor: colors.accent,
                }
              ]}
            />

            {/* Main button with rotation */}
            <Animated.View
              style={[
                {
                  transform: [
                    { scale: showShareMenu ? 1 : shareButtonScale },
                    {
                      rotate: shareButtonRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '45deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  { backgroundColor: showShareMenu ? colors.textMuted : colors.accent },
                ]}
                onPress={handleSharePress}
                activeOpacity={0.8}
              >
                {showShareMenu ? (
                  <X size={18} color="#FFF" strokeWidth={2.5} />
                ) : (
                  <Share2 size={18} color={colors.textOnAccent} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Dismiss X button - only when menu is closed */}
            {!showShareMenu && (
              <TouchableOpacity
                style={[styles.shareButtonDismiss, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
                onPress={handleDismissShareButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={10} color={colors.textMuted} strokeWidth={3} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* VITALS - Pleine largeur verticalement */}
      <View style={styles.vitalsSection}>
        <HydrationCardFullWidth
          currentMl={hydration}
          goalMl={hydrationGoal}
          onAddMl={onAddWater}
        />

        <SleepCardFullWidth
          hours={sleepHours}
          debt={sleepDebt}
          goal={sleepGoal}
          onPress={() => router.push('/sleep')}
        />

      <ChargeCardFullWidth
        level={workloadStatus}
        onPress={() => router.push('/charge')}
      />
      </View>
        </View>
    </ScrollView>
  );
};

// Export avec memo pour optimiser les re-renders
export const Page1Monitoring = memo(Page1MonitoringComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: IS_SMALL_SCREEN ? 230 : 250, // Plus d'espace pour scroller complètement
  },
  // Fond qui couvre les onglets
  contentBackground: {
    marginTop: -120,
    paddingTop: 120,
    marginHorizontal: -CARD_PADDING,
    paddingHorizontal: CARD_PADDING,
  },
  // Hero Header - Agrandi
  heroHeader: {
    marginTop: -25,
    marginBottom: 10,
    marginHorizontal: -CARD_PADDING,
    paddingHorizontal: 0,
    zIndex: 100,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  avatarLarge: {
    width: IS_SMALL_SCREEN ? 100 : 120, // Plus petit sur petits écrans
    height: IS_SMALL_SCREEN ? 100 : 120,
    marginTop: -45,
    marginRight: 10, // Augmenté pour respirer du bord
  },
  profilePhotoLarge: {
    width: IS_SMALL_SCREEN ? 75 : 85, // Agrandi
    height: IS_SMALL_SCREEN ? 75 : 85,
    borderRadius: IS_SMALL_SCREEN ? 37.5 : 42.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginTop: -35,
    marginLeft: 10, // Augmenté pour respirer du bord
  },
  profilePhotoImage: {
    width: '100%',
    height: '100%',
  },
  greetingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 35,
  },
  greetingLarge: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  userNameLarge: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1,
  },

  // Stats Row - Gradient Cards (compact moderne)
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    zIndex: 200,
    paddingHorizontal: 2,
  },
  statCardTouchable: {
    flex: 1,
  },
  statCardGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 1,
    minHeight: 38,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValueWhite: {
    fontSize: IS_SMALL_SCREEN ? 12 : 14,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  statLabelWhite: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: 0,
  },

  // Weight Card Premium
  weightCardPremium: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weightIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  weightSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '800',
  },
  // Ligne optimisée poids
  weightOptimizedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  weightSideMetric: {
    flex: 1,
    alignItems: 'flex-start',
  },
  weightCenterMetric: {
    flex: 1.5,
    alignItems: 'center',
  },
  weightValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  weightValueLarge: {
    fontSize: IS_VERY_SMALL_SCREEN ? 38 : (IS_SMALL_SCREEN ? 42 : 48), // Responsive selon taille écran
    fontWeight: '900',
    letterSpacing: IS_SMALL_SCREEN ? -2 : -3,
  },
  weightUnit: {
    fontSize: IS_SMALL_SCREEN ? 18 : 20,
    fontWeight: '700',
  },
  metricTopLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricTopValue: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 3,
  },
  // GRAPHIQUE SIMPLE SCROLLABLE
  simpleChart: {
    marginTop: 12,
    marginBottom: 12,
  },
  simpleChartContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  simpleChartBar: {
    alignItems: 'center',
    gap: 4,
  },
  simpleChartWeight: {
    fontSize: 9,
    fontWeight: '700',
  },
  simpleChartBarBg: {
    width: 24,
    height: 60,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  simpleChartBarFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 6,
  },
  simpleChartDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  simpleChartMonth: {
    fontSize: 8,
    fontWeight: '600',
  },
  simpleChartConnector: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    marginHorizontal: 4,
  },
  simpleChartArrow: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleChartArrowIcon: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  predictionsContainer: {
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  predictionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  predictionsTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  predictionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  predictionItem: {
    flex: 1,
    alignItems: 'center',
  },
  predictionLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  predictionValue: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  predictionDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },

  // Composition corporelle - COMPACT
  bodyComposition: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: IS_SMALL_SCREEN ? 10 : 12,
    paddingHorizontal: IS_SMALL_SCREEN ? 6 : 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  compositionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  compositionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 2,
  },
  compositionInfo: {
    alignItems: 'center',
    gap: 2,
  },
  compositionLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  compositionValue: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  compositionPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  compositionDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  // Barre de progression poids
  weightProgressBar: {
    marginTop: 12,
    marginBottom: 8,
  },
  weightProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  weightProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  weightProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  weightProgressLabel: {
    fontSize: 9,
    fontWeight: '600',
  },

  // Vitals - Pleine largeur
  vitalsSection: {
    gap: 16,
  },

  // ═══════════════════════════════════════════════
  // CITATION - NUAGE SIMPLE ☁️
  // ═══════════════════════════════════════════════

  // Badge "Citation du jour" au-dessus
  quoteBadgeTop: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    marginLeft: 10, // Respire du bord gauche
  },
  quoteBadgeTextTop: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Nuage blanc simple et compact
  cloudBubble: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Texte de la citation
  quoteTextCloud: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },

  // ═══════════════════════════════════════════════
  // FLOATING SHARE BUTTON
  // ═══════════════════════════════════════════════
  shareButtonContainer: {
    position: 'absolute',
    bottom: 60,
    right: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  shareButtonGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    transform: [{ scale: 1.4 }],
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  shareButtonDismiss: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══════════════════════════════════════════════
  // SHARE MENU
  // ═══════════════════════════════════════════════
  shareMenuContainer: {
    position: 'absolute',
    bottom: 60,
    right: 0,
    alignItems: 'flex-end',
    gap: 10,
  },
  shareMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 120,
  },
  shareMenuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareMenuText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
