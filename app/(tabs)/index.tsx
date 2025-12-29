import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Polygon, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  Scale,
  Droplets,
  Camera,
  Sparkles,
  Flame,
  Zap,
  Dumbbell,
  Trophy,
  ChevronRight,
  Timer,
  Ruler,
  Heart,
  HeartPulse,
  TrendingDown,
  TrendingUp,
  Minus,
  BarChart3,
  Medal,
  Palette,
  Battery,
  Moon,
  Activity,
  FileText,
  Target,
  Gift,
  AlertTriangle,
  Crown,
  Waves,
  Bed,
  Bell,
  Stethoscope,
  Scissors,
  Settings,
  FlaskConical,
  Calculator,
  Apple,
  Clock,
  BookOpen,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useTheme } from '@/lib/ThemeContext';
import { getProfile, getLatestWeight, getWeights, calculateStreak, getTrainings, Profile, Weight, Training } from '@/lib/database';
import { getLatestBodyComposition } from '@/lib/bodyComposition';
import { getDailyQuote, Citation } from '@/lib/citations';
import { getCurrentRank } from '@/lib/ranks';
import { getLevel } from '@/lib/gamification';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { RanksModal } from '@/components/RanksModal';
import { LogoViewer } from '@/components/LogoViewer';
import { MotivationPopup } from '@/components/MotivationPopup';
import { getUserMode, getNextEvent } from '@/lib/fighterModeService';
import { UserMode } from '@/lib/fighterMode';
import { getJournalStats } from '@/lib/trainingJournalService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BatteryReadyPopup } from '@/components/BatteryReadyPopup';
import { PerformanceRadar } from '@/components/PerformanceRadar';
import { HealthspanChart } from '@/components/HealthspanChart';
import { HydrationLottieCard } from '@/components/cards/HydrationLottieCard';
import { WeightLottieCard } from '@/components/cards/WeightLottieCard';
import { SleepLottieCard } from '@/components/cards/SleepLottieCard';
import { ChargeLottieCard } from '@/components/cards/ChargeLottieCard';
import { AnimatedCompositionCircle } from '@/components/AnimatedCompositionCircle';
import { StreakCalendar } from '@/components/StreakCalendar';
import { AvatarViewerModal } from '@/components/AvatarViewerModal';
import HealthConnect from '@/lib/healthConnect.ios';

// Mode Essentiel
import { useViewMode } from '@/hooks/useViewMode';
import { ViewModeSwitch } from '@/components/home/ViewModeSwitch';
import { HomeEssentielContent } from '@/components/home/HomeEssentielContent';
import ObjectiveSwitch from '@/components/home/ObjectiveSwitch';

// Composants animés premium
import AnimatedAvatar from '@/components/AnimatedAvatar';
import AnimatedCounter from '@/components/AnimatedCounter';
import AnimatedProgressBar from '@/components/AnimatedProgressBar';
import { AnimatedCard } from '@/components/AnimatedCard';
import AnimatedRing from '@/components/AnimatedRing';
import { AnimatedBattery } from '@/components/AnimatedBattery';
import PulsingBadge from '@/components/PulsingBadge';
import AnimatedWaterBottle from '@/components/AnimatedWaterBottle';
import AnimatedSleepWave from '@/components/AnimatedSleepWave';
import AnimatedRank from '@/components/AnimatedRank';

// Services
import { getSleepStats, getSleepAdvice, formatSleepDuration, SleepStats, getSleepGoal } from '@/lib/sleepService';
import { getWeeklyLoadStats, formatLoad, getRiskColor, WeeklyLoadStats } from '@/lib/trainingLoadService';
import { getDailyChallenges, ActiveChallenge } from '@/lib/challengesService';
import { generateWeeklyReport, formatReportForSharing, WeeklyReport } from '@/lib/weeklyReportService';
import { getHomeCustomization, isSectionVisible as checkSectionVisible, HomeSection } from '@/lib/homeCustomizationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HYDRATION_KEY = '@yoroi_hydration_today';
const HYDRATION_GOAL_KEY = '@yoroi_hydration_goal';
const DEFAULT_HYDRATION_GOAL = 2500;

// ============================================
// ÉCRAN ACCUEIL - VERSION COMPLÈTE YOROI
// ============================================

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Mode d'affichage (Guerrier / Essentiel)
  const { mode, toggleMode, isLoading: isLoadingMode } = useViewMode();

  // États de base
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestWeight, setLatestWeight] = useState<Weight | null>(null);
  const [weightHistory, setWeightHistory] = useState<Weight[]>([]);
  const [streak, setStreak] = useState(0);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [dailyQuote, setDailyQuote] = useState<Citation | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [ranksModalVisible, setRanksModalVisible] = useState(false);
  const [logoViewerVisible, setLogoViewerVisible] = useState(false);
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);

  // Mode Compétiteur - Toggle ON/OFF
  const [isCompetitorMode, setIsCompetitorMode] = useState(false);


  // État nextEvent pour afficher les compétitions
  const [nextEvent, setNextEvent] = useState<{
    type: 'competition' | 'combat' | null;
    name: string;
    daysLeft: number;
    date: string;
    sport?: string;
  } | null>(null);

  // Animation toggle compétiteur
  const toggleAnim = useRef(new Animated.Value(isCompetitorMode ? 1 : 0)).current;
  const toggleScaleAnim = useRef(new Animated.Value(1)).current;
  const toggleGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation du slide avec bounce
    Animated.spring(toggleAnim, {
      toValue: isCompetitorMode ? 1 : 0,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();

    // Animation glow pulsant quand activé
    if (isCompetitorMode) {
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(toggleGlowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(toggleGlowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      glowLoop.start();
      return () => glowLoop.stop();
    } else {
      toggleGlowAnim.setValue(0);
    }
  }, [isCompetitorMode]);

  const [userMode, setUserMode] = useState<UserMode>('loisir');

  // Hydratation
  const [hydration, setHydration] = useState(0);
  const [hydrationGoal, setHydrationGoal] = useState(DEFAULT_HYDRATION_GOAL);
  const waterAnim = useRef(new Animated.Value(0)).current;

  // Nouveaux états
  const [sleepStats, setSleepStats] = useState<SleepStats | null>(null);
  const [loadStats, setLoadStats] = useState<WeeklyLoadStats | null>(null);
  const [dailyChallenges, setDailyChallenges] = useState<ActiveChallenge[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [bodyComposition, setBodyComposition] = useState<any>(null);
  const [sleepGoal, setSleepGoal] = useState(480); // 8h par défaut

  // Personnalisation de l'accueil
  const [homeSections, setHomeSections] = useState<HomeSection[]>([]);

  // Activité (pas)
  const [steps, setSteps] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(10000);

  // Hydratation functions
  const loadHydration = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const [stored, goalStored] = await Promise.all([
        AsyncStorage.getItem(`${HYDRATION_KEY}_${today}`),
        AsyncStorage.getItem(HYDRATION_GOAL_KEY),
      ]);

      // Charger l'objectif (ou utiliser la valeur par défaut)
      if (goalStored) {
        const goal = parseFloat(goalStored) * 1000; // Convertir L en ml
        setHydrationGoal(goal);
      }

      // Charger la valeur actuelle
      if (stored) {
        const value = parseInt(stored, 10);
        setHydration(value);
        animateWater(value, goalStored ? parseFloat(goalStored) * 1000 : DEFAULT_HYDRATION_GOAL);
      }
    } catch (error) {
      console.error('Erreur hydratation:', error);
    }
  }, []);

  const saveHydration = async (value: number) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    await AsyncStorage.setItem(`${HYDRATION_KEY}_${today}`, value.toString());
  };

  const animateWater = (value: number, goal: number = DEFAULT_HYDRATION_GOAL) => {
    Animated.spring(waterAnim, {
      toValue: Math.min(value / goal, 1),
      tension: 30,
      friction: 8,
      useNativeDriver: false,
    }).start();
  };

  const addWater = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = Math.max(0, hydration + amount);
    setHydration(newValue);
    saveHydration(newValue);
    animateWater(newValue, hydrationGoal);
  };

  // Chargement des données
  const loadData = useCallback(async () => {
    try {
      const [profileData, weight, history, streakDays, quote, allTrainings, mode, sleep, load, challenges, report, event, sections] = await Promise.all([
        getProfile(),
        getLatestWeight(),
        getWeights(30),
        calculateStreak(),
        getDailyQuote(),
        getTrainings(),
        getUserMode(),
        getSleepStats(),
        getWeeklyLoadStats(),
        getDailyChallenges(),
        generateWeeklyReport(),
        getNextEvent(),
        getHomeCustomization(),
      ]);

      setProfile(profileData);
      setLatestWeight(weight);
      setWeightHistory(history);
      setStreak(streakDays);
      setDailyQuote(quote);
      setTrainings(allTrainings);
      setUserMode(mode);
      setSleepStats(sleep);
      setLoadStats(load);
      setDailyChallenges(challenges);
      setWeeklyReport(report);
      setNextEvent(event);
      setHomeSections(sections);

      const bodyComp = await getLatestBodyComposition();
      setBodyComposition(bodyComp);

      const goal = await getSleepGoal();
      setSleepGoal(goal);

      // Charger les pas depuis Apple Health
      try {
        const stepsData = await HealthConnect.getTodaySteps();
        if (stepsData?.count) {
          setSteps(stepsData.count);
        }
      } catch (error) {
        console.log('Pas disponibles depuis Apple Health');
      }

      setTotalPoints(history.length * 10 + allTrainings.length * 25 + (streakDays >= 7 ? 50 : 0));
      loadHydration();
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, [loadHydration]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Helper pour vérifier la visibilité d'une section
  const isSectionVisible = (sectionId: string): boolean => {
    return checkSectionVisible(homeSections, sectionId);
  };

  // Rotation automatique des citations toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      const newQuote = await getDailyQuote();
      setDailyQuote(newQuote);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Calculs
  const rank = getCurrentRank(streak);
  const level = getLevel(totalPoints);
  const currentWeight = latestWeight?.weight || null;
  const startWeight = profile?.start_weight || (weightHistory.length > 0 ? weightHistory[weightHistory.length - 1]?.weight : null);
  const targetWeight = profile?.target_weight || null;
  const weightLost = currentWeight && startWeight ? startWeight - currentWeight : 0;
  const totalToLose = startWeight && targetWeight ? Math.max(0, startWeight - targetWeight) : null;
  const remainingToLose = currentWeight && targetWeight ? Math.max(0, currentWeight - targetWeight) : null;
  const weightProgress = useMemo(() =>
    totalToLose && currentWeight ? Math.min(1, Math.max(0, (startWeight! - currentWeight) / totalToLose)) : 0,
    [totalToLose, currentWeight, startWeight]
  );

  // Tendance
  const avgWeeklyLoss = weightHistory.length >= 7
    ? (weightHistory[weightHistory.length - 1]?.weight - weightHistory[0]?.weight) / (weightHistory.length / 7)
    : 0;
  const trend = avgWeeklyLoss < -0.1 ? 'down' : avgWeeklyLoss > 0.1 ? 'up' : 'stable';

  // Salutation
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bonjour';
    if (hour >= 12 && hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  // Calcul Batterie du Guerrier
  const calculateBatteryPercent = () => {
    let score = 50;
    score += Math.min(streak * 2, 20);
    score += (hydration / hydrationGoal) * 15;
    if (sleepStats && sleepStats.averageDuration >= 420) score += 15;
    else if (sleepStats && sleepStats.averageDuration >= 360) score += 5;
    if (trainings.length > 0) {
      const lastTraining = new Date(trainings[0].date);
      const daysSince = differenceInDays(new Date(), lastTraining);
      if (daysSince <= 1) score += 10;
      else if (daysSince > 3) score -= 10;
    }
    return Math.max(0, Math.min(100, score));
  };

  const batteryPercent = useMemo(() => calculateBatteryPercent(), [streak, hydration, hydrationGoal, sleepStats, trainings]);
  const last7Weights = useMemo(() => weightHistory.slice(0, 7).reverse(), [weightHistory]);

  // Partager le rapport
  const shareReport = async () => {
    if (!weeklyReport) return;
    try {
      const text = formatReportForSharing(weeklyReport);
      await Share.share({ message: text });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  // Batterie status - avec icônes au lieu d'emojis
  const getBatteryStatus = () => {
    if (batteryPercent >= 80) return { color: '#10B981', label: 'Prêt à tout donner', iconType: 'flame' as const };
    if (batteryPercent >= 60) return { color: '#F59E0B', label: 'Bonne forme', iconType: 'zap' as const };
    if (batteryPercent >= 40) return { color: '#F97316', label: 'Fatigue modérée', iconType: 'activity' as const };
    return { color: '#EF4444', label: 'Repos nécessaire', iconType: 'moon' as const };
  };

  // Animation batterie
  const batteryAnim = useRef(new Animated.Value(0)).current;
  const weightPulseAnim = useRef(new Animated.Value(1)).current;
  const streakFlameAnim = useRef(new Animated.Value(1)).current;
  const weightProgressAnim = useRef(new Animated.Value(0)).current;
  const sleepDebtAnim = useRef(new Animated.Value(0)).current;
  const sleepZzzAnim1 = useRef(new Animated.Value(0)).current;
  const sleepZzzAnim2 = useRef(new Animated.Value(0)).current;
  const sleepZzzAnim3 = useRef(new Animated.Value(0)).current;
  const chargePulseAnim = useRef(new Animated.Value(1)).current;
  const chargeWaveAnim = useRef(new Animated.Value(0)).current;
  
  // Animer la batterie quand le pourcentage change
  React.useEffect(() => {
    Animated.timing(batteryAnim, {
      toValue: batteryPercent / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [batteryPercent]);

  // Animation progress poids
  React.useEffect(() => {
    Animated.timing(weightProgressAnim, {
      toValue: weightProgress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [weightProgress]);

  // Animation pulse poids
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(weightPulseAnim, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        Animated.timing(weightPulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Animation flamme streak
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(streakFlameAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(streakFlameAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Animation dette sommeil
  React.useEffect(() => {
    if (sleepStats) {
      const debtPercent = Math.min(100, (sleepStats.sleepDebtHours / 10) * 100);
      Animated.timing(sleepDebtAnim, {
        toValue: debtPercent / 100,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [sleepStats]);

  // Animation Zzz sommeil (apparition/disparition)
  React.useEffect(() => {
    const createZzzAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
    };
    
    createZzzAnimation(sleepZzzAnim1, 0).start();
    createZzzAnimation(sleepZzzAnim2, 300).start();
    createZzzAnimation(sleepZzzAnim3, 600).start();
  }, []);

  // Animation charge (pulsation + vague)
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(chargePulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(chargePulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    
    Animated.loop(
      Animated.timing(chargeWaveAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  // Rendu icône batterie status
  const renderBatteryIcon = () => {
    const iconSize = 12;
    switch (batteryStatus.iconType) {
      case 'flame': return <Flame size={iconSize} color={batteryStatus.color} />;
      case 'zap': return <Zap size={iconSize} color={batteryStatus.color} />;
      case 'activity': return <Activity size={iconSize} color={batteryStatus.color} />;
      case 'moon': return <Moon size={iconSize} color={batteryStatus.color} />;
    }
  };

  // Rendu icône défi
  const renderChallengeIcon = (iconName: string, color: string = colors.accent) => {
    const iconSize = 20;
    switch (iconName) {
      case 'dumbbell': return <Dumbbell size={iconSize} color={color} />;
      case 'droplets': return <Droplets size={iconSize} color="#06B6D4" />;
      case 'moon': return <Moon size={iconSize} color="#8B5CF6" />;
      case 'scale': return <Scale size={iconSize} color={color} />;
      case 'flame': return <Flame size={iconSize} color="#F97316" />;
      case 'zap': return <Zap size={iconSize} color="#F59E0B" />;
      case 'waves': return <Waves size={iconSize} color="#06B6D4" />;
      case 'bed': return <Bed size={iconSize} color="#8B5CF6" />;
      case 'trophy': return <Trophy size={iconSize} color="#F59E0B" />;
      case 'trending-down': return <TrendingDown size={iconSize} color={colors.success} />;
      case 'crown': return <Crown size={iconSize} color="#F59E0B" />;
      default: return <Target size={iconSize} color={color} />;
    }
  };

  const batteryStatus = useMemo(() => getBatteryStatus(), [batteryPercent]);

  // === SYSTÈME DE PERSONNALISATION DE L'ORDRE - RENDU DYNAMIQUE ===
  const sortedSections = useMemo(() => {
    return [...homeSections].sort((a, b) => a.order - b.order);
  }, [homeSections]);

  // Fonction pour rendre chaque section dans l'ordre personnalisé
  const renderDynamicSection = (sectionId: string) => {
    if (!isSectionVisible(sectionId)) return null;

    switch (sectionId) {
      case 'header':
        return (
          <View style={styles.header} key={sectionId}>
            <TouchableOpacity onPress={() => setLogoViewerVisible(true)}>
              <Image source={require('@/assets/logo d\'app/logo1.png')} style={styles.logo} resizeMode="contain" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()}</Text>
              <View style={styles.userNameRow}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>{profile?.name || 'Champion'}</Text>
                <ViewModeSwitch mode={mode} onToggle={toggleMode} />
              </View>
              {dailyQuote && mode === 'guerrier' && (
                <View style={[styles.quoteCardInline, { backgroundColor: colors.backgroundCard }]}>
                  <Sparkles size={12} color={colors.accent} />
                  <Text style={[styles.quoteTextInline, { color: colors.textSecondary }]} numberOfLines={2}>"{dailyQuote.text}"</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setAvatarViewerVisible(true)} activeOpacity={0.8}>
              <AvatarDisplay size="medium" refreshTrigger={Date.now()} showBorder={false} />
            </TouchableOpacity>
          </View>
        );

      case 'stats_compact':
        return (
          <View style={styles.statsRowCompact} key={sectionId}>
            <TouchableOpacity style={[styles.statCardCompactVertical, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/activity-detail')}>
              <MaterialCommunityIcons name="walk" size={16} color="#3B82F6" />
              <AnimatedCounter value={steps} style={[styles.statValueCompactVertical, { color: '#3B82F6' }]} duration={800} />
              <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>pas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCardCompactVertical, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/gamification')}>
              <Animated.View style={{ transform: [{ scale: streakFlameAnim }] }}>
                <Flame size={16} color="#F97316" />
              </Animated.View>
              <AnimatedCounter value={streak} style={[styles.statValueCompactVertical, { color: '#F97316' }]} duration={800} />
              <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>jours</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCardCompactVertical, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/gamification')}>
              <Zap size={16} color={colors.accent} />
              <AnimatedCounter value={level.level} style={[styles.statValueCompactVertical, { color: colors.accent }]} duration={800} />
              <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>niveau</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCardCompactVertical, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/gamification')}>
              <Trophy size={16} color={rank.color} />
              <AnimatedRank rank={rank.name.split(' ')[0]} color={rank.color} style={styles.statValueCompactVertical} delay={300} />
              <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>rang</Text>
            </TouchableOpacity>
          </View>
        );

      case 'weight_hydration':
        return (
          <View style={styles.gridLottieContainer} key={sectionId}>
            <View style={styles.gridLottieRow}>
              <TouchableOpacity onPress={() => router.push('/stats?tab=poids')} activeOpacity={0.9}>
                <WeightLottieCard
                  weight={currentWeight || 0}
                  target={targetWeight || undefined}
                  trend={trend}
                  history={last7Weights.map(w => w.weight)}
                />
              </TouchableOpacity>
              <HydrationLottieCard
                currentMl={hydration}
                goalMl={hydrationGoal}
                onAddMl={(amountMl) => addWater(amountMl)}
              />
            </View>
          </View>
        );

      case 'battery_tools':
        return (
          <AnimatedCard index={0} key={sectionId}>
            <View style={styles.batteryToolsRowSingle}>
              <TouchableOpacity
                style={[styles.batteryCardSmall, { backgroundColor: colors.backgroundCard }]}
                onPress={() => router.push('/energy')}
                activeOpacity={0.8}
              >
                <Battery size={24} color={batteryStatus.color} />
                <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Énergie</Text>
                <View style={styles.batteryHorizontalSmall}>
                  <View style={[styles.batteryHBodySmall, { borderColor: batteryStatus.color, backgroundColor: `${batteryStatus.color}10` }]}>
                    <Animated.View
                      style={[
                        styles.batteryHLevelSmall,
                        {
                          width: batteryAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                          backgroundColor: batteryStatus.color,
                        }
                      ]}
                    >
                      <View style={styles.batteryShineSmall} />
                    </Animated.View>
                  </View>
                  <View style={[styles.batteryHHeadSmall, { backgroundColor: batteryStatus.color }]} />
                </View>
                <Text style={[styles.batteryPercentSmall, { color: batteryStatus.color }]}>{Math.round(batteryPercent)}%</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/lab')} activeOpacity={0.85}>
                <FlaskConical size={28} color="#3B82F6" />
                <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Savoir</Text>
                <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]} numberOfLines={1}>Dormir moins bête</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/calculators')} activeOpacity={0.85}>
                <Calculator size={28} color="#10B981" />
                <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Outils</Text>
                <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]} numberOfLines={1}>Calculatrice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/fasting')} activeOpacity={0.85}>
                <Clock size={28} color="#F59E0B" />
                <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Jeûne</Text>
                <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]} numberOfLines={1}>Intermittent</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        );

      case 'actions_row':
        return (
          <View style={styles.actionsRow4} key={sectionId}>
            <TouchableOpacity style={[styles.actionBtn4, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/infirmary')} activeOpacity={0.85}>
              <MaterialCommunityIcons name="hospital-box" size={28} color="#EF4444" />
              <Text style={[styles.actionLabel4, { color: colors.textPrimary }]}>Infirmerie</Text>
              <Text style={[styles.actionSubLabel4, { color: colors.textMuted }]}>Suis tes blessures</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn4, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/timer')} activeOpacity={0.85}>
              <Timer size={28} color={colors.accent} />
              <Text style={[styles.actionLabel4, { color: colors.textPrimary }]}>Timer</Text>
              <Text style={[styles.actionSubLabel4, { color: colors.textMuted }]}>Round / Repos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn4, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/photos')} activeOpacity={0.85}>
              <Camera size={28} color="#10B981" />
              <Text style={[styles.actionLabel4, { color: colors.textPrimary }]}>Photo</Text>
              <Text style={[styles.actionSubLabel4, { color: colors.textMuted }]}>Avant / Après</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn4, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/lab')} activeOpacity={0.85}>
              <FlaskConical size={28} color="#3B82F6" />
              <Text style={[styles.actionLabel4, { color: colors.textPrimary }]}>Savoir</Text>
              <Text style={[styles.actionSubLabel4, { color: colors.textMuted }]}>Études & Conseils</Text>
            </TouchableOpacity>
          </View>
        );

      case 'sleep_charge':
        return (
          <View style={styles.gridLottieRow} key={sectionId}>
            <TouchableOpacity onPress={() => router.push('/sleep')} activeOpacity={0.9}>
              <SleepLottieCard
                hours={sleepStats?.lastNightDuration ? sleepStats.lastNightDuration / 60 : 0}
                quality={sleepStats?.lastNightQuality ? (sleepStats.lastNightQuality / 5) * 100 : 0}
                debt={sleepStats?.sleepDebtHours || 0}
                goal={sleepGoal / 60}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/charge')} activeOpacity={0.9}>
              <ChargeLottieCard
                level={loadStats?.riskLevel || 'optimal'}
                totalLoad={loadStats?.totalLoad || 0}
                maxLoad={2000}
                sessions={trainings.filter(t => {
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return new Date(t.date) >= weekAgo;
                }).length}
              />
            </TouchableOpacity>
          </View>
        );

      case 'challenges':
        return (
          <AnimatedCard index={1} key={sectionId}>
            <TouchableOpacity style={[styles.challengesCard, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/challenges')} activeOpacity={0.8}>
              <View style={styles.challengesHeader}>
                <Target size={16} color={colors.accent} />
                <Text style={styles.sectionTitle}>DÉFIS DU JOUR</Text>
                <ChevronRight size={14} color={colors.textMuted} />
              </View>
              <View style={styles.challengesList}>
                {dailyChallenges.slice(0, 3).map((challenge) => (
                  <View key={challenge.id} style={styles.challengeItem}>
                    <View style={styles.challengeIconWrap}>
                      {renderChallengeIcon(challenge.icon)}
                    </View>
                    <View style={styles.challengeInfo}>
                      <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>{challenge.title}</Text>
                      <View style={[styles.challengeProgress, { backgroundColor: colors.border }]}>
                        <View style={[styles.challengeFill, {
                          width: `${Math.min(100, (challenge.progress.current / challenge.progress.target) * 100)}%`,
                          backgroundColor: challenge.progress.completed ? colors.success : colors.accent
                        }]} />
                      </View>
                    </View>
                    <PulsingBadge
                      color={challenge.progress.completed ? colors.success : colors.accent}
                      enabled={challenge.progress.completed}
                      style={[styles.rewardBadge, { backgroundColor: challenge.progress.completed ? colors.successLight : colors.accentMuted }]}
                    >
                      <Gift size={10} color={challenge.progress.completed ? colors.success : colors.accent} />
                      <Text style={[styles.rewardText, { color: challenge.progress.completed ? colors.success : colors.accent }]}>
                        +{challenge.reward.xp}
                      </Text>
                    </PulsingBadge>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          </AnimatedCard>
        );

      case 'performance_radar':
        return (
          <AnimatedCard index={2} key={sectionId}>
            <TouchableOpacity onPress={() => router.push('/radar-performance')} activeOpacity={0.8}>
              <PerformanceRadar />
            </TouchableOpacity>
          </AnimatedCard>
        );

      case 'healthspan':
        return (
          <AnimatedCard index={3} key={sectionId}>
            <TouchableOpacity onPress={() => router.push('/stats?tab=sante')} activeOpacity={0.8}>
              <HealthspanChart />
            </TouchableOpacity>
          </AnimatedCard>
        );

      case 'weekly_report':
        if (!weeklyReport) return null;
        return (
          <AnimatedCard index={4} key={sectionId}>
            <TouchableOpacity style={[styles.reportCard, { backgroundColor: colors.backgroundCard }]} onPress={shareReport}>
              <View style={styles.reportHeader}>
                <FileText size={16} color={colors.accent} />
                <Text style={styles.sectionTitle}>RAPPORT DE MISSION</Text>
              </View>
              <View style={styles.reportContent}>
                <View style={[styles.gradeBadge, {
                  backgroundColor: colors.accent,
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }]}>
                  <Text style={styles.gradeText}>{weeklyReport.verdict.grade}</Text>
                </View>
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportTitle, { color: colors.textPrimary }]}>{weeklyReport.verdict.title}</Text>
                  <View style={styles.scoreContainer}>
                    <Text style={[styles.reportScore, { color: colors.textPrimary }]}>
                      Score: <Text style={{ fontWeight: '900', fontSize: 16 }}>{weeklyReport.overallScore}</Text>/100
                    </Text>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${weeklyReport.overallScore}%`,
                            backgroundColor: weeklyReport.overallScore > 70 ? '#10B981' : weeklyReport.overallScore > 50 ? '#F59E0B' : '#EF4444'
                          }
                        ]}
                      />
                    </View>
                  </View>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </AnimatedCard>
        );

      case 'streak_calendar':
        return <StreakCalendar weeks={12} key={sectionId} />;

      case 'fighter_mode':
        if (userMode === 'competiteur') {
          return (
            <View style={[styles.actionsRow3, { marginTop: 12 }]} key={sectionId}>
              <TouchableOpacity style={[styles.actionBtn3, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/cut-mode')} activeOpacity={0.85}>
                <Scale size={24} color="#EF4444" />
                <Text style={[styles.actionLabel3, { color: colors.textPrimary }]}>Mode Cut</Text>
                <Text style={[styles.actionSubLabel3, { color: colors.textMuted }]}>Poids</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn3, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/competitions')} activeOpacity={0.85}>
                <Trophy size={24} color={colors.accent} />
                <Text style={[styles.actionLabel3, { color: colors.textPrimary }]}>Compétitions</Text>
                <Text style={[styles.actionSubLabel3, { color: colors.textMuted }]}>À venir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn3, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/palmares')} activeOpacity={0.85}>
                <Medal size={24} color={colors.gold} />
                <Text style={[styles.actionLabel3, { color: colors.textPrimary }]}>Palmarès</Text>
                <Text style={[styles.actionSubLabel3, { color: colors.textMuted }]}>Victoires</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return null;

      case 'training_journal':
        const journalStats = getJournalStats();
        return (
          <TouchableOpacity
            key={sectionId}
            style={[styles.trainingJournalCard, { backgroundColor: colors.backgroundCard }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/training-journal');
            }}
            activeOpacity={0.85}
          >
            <View style={styles.trainingJournalHeader}>
              <View style={[styles.trainingJournalIconContainer, { backgroundColor: '#F9731620' }]}>
                <BookOpen size={24} color="#F97316" />
              </View>
              <View style={styles.trainingJournalTitleContainer}>
                <Text style={[styles.trainingJournalTitle, { color: colors.textPrimary }]}>
                  📖 Carnet d'Entraînement
                </Text>
                <Text style={[styles.trainingJournalSubtitle, { color: colors.textMuted }]}>
                  Ta progression personnelle
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </View>

            <View style={styles.trainingJournalStats}>
              <View style={styles.trainingJournalStat}>
                <View style={[styles.trainingJournalStatIcon, { backgroundColor: '#F9731615' }]}>
                  <Target size={18} color="#F97316" />
                </View>
                <View style={styles.trainingJournalStatInfo}>
                  <Text style={[styles.trainingJournalStatValue, { color: colors.textPrimary }]}>
                    {journalStats.in_progress}
                  </Text>
                  <Text style={[styles.trainingJournalStatLabel, { color: colors.textMuted }]}>
                    En cours
                  </Text>
                </View>
              </View>

              <View style={[styles.trainingJournalDivider, { backgroundColor: colors.border }]} />

              <View style={styles.trainingJournalStat}>
                <View style={[styles.trainingJournalStatIcon, { backgroundColor: `${colors.success}15` }]}>
                  <Trophy size={18} color={colors.success} />
                </View>
                <View style={styles.trainingJournalStatInfo}>
                  <Text style={[styles.trainingJournalStatValue, { color: colors.textPrimary }]}>
                    {journalStats.mastered}
                  </Text>
                  <Text style={[styles.trainingJournalStatLabel, { color: colors.textMuted }]}>
                    Maîtrisés
                  </Text>
                </View>
              </View>

              <View style={[styles.trainingJournalDivider, { backgroundColor: colors.border }]} />

              <View style={styles.trainingJournalStat}>
                <View style={[styles.trainingJournalStatIcon, { backgroundColor: `${colors.accent}15` }]}>
                  <Flame size={18} color={colors.accent} />
                </View>
                <View style={styles.trainingJournalStatInfo}>
                  <Text style={[styles.trainingJournalStatValue, { color: colors.textPrimary }]}>
                    {journalStats.mastered_this_week}
                  </Text>
                  <Text style={[styles.trainingJournalStatLabel, { color: colors.textMuted }]}>
                    Cette semaine
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <MotivationPopup />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* MODE GUERRIER - Contenu complet actuel */}
        {mode === 'guerrier' && (
          <>
            {/* === RENDU DYNAMIQUE DES SECTIONS SELON L'ORDRE PERSONNALISÉ === */}
            {sortedSections.map(section => renderDynamicSection(section.id))}

            {/* Bouton personnaliser l'accueil */}
            <TouchableOpacity
              style={[styles.customizeButton, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/customize-home');
              }}
              activeOpacity={0.7}
            >
              <Palette size={20} color={colors.accent} strokeWidth={2} />
              <Text style={[styles.customizeButtonText, { color: colors.textPrimary }]}>
                Personnaliser l'Accueil
              </Text>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </>
        )}

        {/* MODE ESSENTIEL - Vue simplifiée */}
        {mode === 'essentiel' && (
          <>
            <HomeEssentielContent
              currentWeight={currentWeight ?? undefined}
              targetWeight={targetWeight ?? undefined}
              weightHistory={weightHistory.map(w => w.weight)}
              weightTrend={trend}
              hydration={hydration}
              hydrationGoal={hydrationGoal}
              onAddWater={(ml) => addWater(ml)}
              sleepHours={sleepStats?.lastNightDuration ? sleepStats.lastNightDuration / 60 : 0}
              sleepDebt={sleepStats?.sleepDebtHours || 0}
              sleepGoal={sleepGoal / 60}
              steps={steps}
              stepsGoal={stepsGoal}
              calories={0}
              caloriesGoal={0}
              weekWeightChange={
                weightHistory.length >= 7
                  ? (weightHistory[0]?.weight || 0) - (weightHistory[6]?.weight || 0)
                  : 0
              }
              weekHydrationRate={0}
              weekAvgSleep={sleepStats?.averageDuration ? sleepStats.averageDuration / 60 : 0}
            />

            {/* Bouton personnaliser l'accueil */}
            <TouchableOpacity
              style={[styles.customizeButton, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/customize-home');
              }}
              activeOpacity={0.7}
            >
              <Palette size={20} color={colors.accent} strokeWidth={2} />
              <Text style={[styles.customizeButtonText, { color: colors.textPrimary }]}>
                Personnaliser l'Accueil
              </Text>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </>
        )}

            </ScrollView>

      <RanksModal visible={ranksModalVisible} onClose={() => setRanksModalVisible(false)} currentStreak={streak} />
      <LogoViewer visible={logoViewerVisible} onClose={() => setLogoViewerVisible(false)} />
      <BatteryReadyPopup batteryPercent={batteryPercent} />
      <AvatarViewerModal visible={avatarViewerVisible} onClose={() => setAvatarViewerVisible(false)} />
    </View>
  );
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  logo: { width: 70, height: 70, borderRadius: 14 },
  headerText: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 14, fontWeight: '600' },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userName: { fontSize: 22, fontWeight: '900' },
  avatarBtn: {
    width: 70,
    height: 70,
  },
  avatarContainer: {
    height: 70,
    width: 70,
    overflow: 'visible',
  },

  // Décoration japonaise inline (dans le header)
  japaneseDecorInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 2,
  },
  decorEmoji: { fontSize: 12 },
  decorTorii: { fontSize: 14 },

  // Ligne de 5 actions : Infirmerie, Timer, Compétiteur?, Photo, Savoir
  actionsRow5: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  actionBtn5: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    gap: 5,
    minHeight: 105,
  },
  actionLabel5: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionSubLabel5: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -1,
  },
  actionBtn5Toggle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    gap: 5,
    minHeight: 105,
  },
  toggleLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  toggleTrack: {
    width: 42,
    height: 22,
    borderRadius: 11,
    padding: 2,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 1,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  toggleDays: {
    fontSize: 11,
    fontWeight: '900',
  },

  // Actions rapides en haut (carrés) - RÉDUITES
  actionsRowTop: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtnSquare: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, gap: 4, minHeight: 78 },
  actionLabelSquare: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  timerFractionMini: {
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  timerFractionTop: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  timerFractionLine: {
    width: 40,
    height: 1,
    marginVertical: 1,
  },
  timerFractionBottom: {
    fontSize: 8,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Quote
  quoteCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: 10, marginBottom: 12, gap: 6 },
  quoteText: { flex: 1, fontSize: 11, fontStyle: 'italic', lineHeight: 16 },
  quoteCardInline: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginTop: 4, gap: 6 },
  quoteTextInline: { fontSize: 11, fontStyle: 'italic', lineHeight: 16, flex: 1 },

  // Stats
  // Carte poids principale
  weightCard: { padding: 16, borderRadius: 14, marginBottom: 12 },
  weightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  weightTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, flex: 1 },
  weightMain: { marginBottom: 12 },
  weightValue: { fontSize: 36, fontWeight: '900' },
  weightUnit: { fontSize: 20, fontWeight: '600' },
  weightInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  weightChange: { fontSize: 13, fontWeight: '700' },
  weightDate: { fontSize: 11 },
  weightCompactValue: { fontSize: 28, fontWeight: '900' },
  weightUnitSmall: { fontSize: 14, fontWeight: '700' },
  weightSub: { fontSize: 11, marginTop: 2 },
  progressBar: { height: 8, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 6 },
  remainingText: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  compRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  compItem: { alignItems: 'center', gap: 2 },
  compLabel: { fontSize: 9, fontWeight: '600' },
  compValue: { fontSize: 14, fontWeight: '800' },
  compPlaceholder: { alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingVertical: 12, gap: 4 },
  compPlaceholderText: { fontSize: 10, fontWeight: '600' },
  debtProgressWrapper: { marginTop: 6, position: 'relative' },
  debtProgressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden' },
  debtProgressFill: { height: '100%', borderRadius: 3 },
  sleepZzzContainer: { flexDirection: 'row', alignItems: 'center', gap: 1, position: 'absolute', right: 4, top: -12 },
  sleepZzz: { fontSize: 14, fontWeight: '900', color: '#8B5CF6', textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 3 },
  sleepQualityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sleepDot: { width: 6, height: 6, borderRadius: 3 },
  sleepQualityText: { fontSize: 9, fontWeight: '600' },
  sleepDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sleepDetailItem: { alignItems: 'center', gap: 2 },
  sleepDetailLabel: { fontSize: 8, fontWeight: '600' },
  sleepDetailValue: { fontSize: 11, fontWeight: '700' },
  sleepQualityStars: { flexDirection: 'row', gap: 2 },
  sleepInfoRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  sleepInfoBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  sleepInfoText: { fontSize: 9, fontWeight: '700' },
  sleepTrendBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  sleepTrendText: { fontSize: 9, fontWeight: '700' },
  sleepWeekChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 6, height: 24, width: '100%', overflow: 'hidden' },
  sleepWeekBar: { flex: 1, justifyContent: 'flex-end', height: '100%', maxWidth: '14%' },
  sleepWeekBarFill: { borderRadius: 2, minHeight: 3, width: '100%' },
  sleepCircleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8, gap: 12 },
  sleepCircleInfo: { alignItems: 'center', gap: 2 },
  sleepCircleValue: { fontSize: 18, fontWeight: '900' },
  sleepCircleLabel: { fontSize: 9, fontWeight: '600' },
  sleepWaveContainer: { alignItems: 'center', marginVertical: 4 },
  sleepWaveInfo: { alignItems: 'center', gap: 2, marginTop: -15 },
  sleepOverlayInfo: { position: 'absolute', top: 10, left: 10, zIndex: 10 },
  sleepValue: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  sleepLabel: { fontSize: 11, fontWeight: '600' },
  chargeGaugeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 8, gap: 12 },
  chargeGaugeInfo: { alignItems: 'center', gap: 2 },
  chargeGaugeValue: { fontSize: 18, fontWeight: '900' },
  chargeGaugeLabel: { fontSize: 9, fontWeight: '600' },
  loadProgressBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.06)', overflow: 'hidden', marginTop: 6, position: 'relative' },
  loadProgressFill: { height: '100%', borderRadius: 4, position: 'relative', overflow: 'hidden' },
  loadWave: { position: 'absolute', top: 0, bottom: 0, width: '50%', backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ skewX: '-20deg' }] },
  loadIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  loadDot: { width: 6, height: 6, borderRadius: 3 },
  loadIndicatorText: { fontSize: 9, fontWeight: '600' },
  loadDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  loadDetailItem: { alignItems: 'center', gap: 2 },
  loadDetailLabel: { fontSize: 8, fontWeight: '600' },
  loadDetailValue: { fontSize: 11, fontWeight: '700' },
  loadInfoRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  loadInfoBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  loadInfoText: { fontSize: 9, fontWeight: '700' },
  loadTrendBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  loadTrendText: { fontSize: 9, fontWeight: '700' },
  loadWeekChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 6, height: 24, width: '100%', overflow: 'hidden' },
  loadWeekBar: { flex: 1, justifyContent: 'flex-end', height: '100%', maxWidth: '14%' },
  loadWeekBarFill: { borderRadius: 2, minHeight: 3, width: '100%' },
  loadAdvice: { fontSize: 8, fontWeight: '500', marginTop: 4, fontStyle: 'italic' },

  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 6, borderRadius: 10 },
  statValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  statLabel: { fontSize: 7, fontWeight: '600' },
  statsRowCompact: { flexDirection: 'row', gap: 5, marginBottom: 8, marginTop: 4 },
  statCardCompact: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 8, gap: 3 },
  statCardCompactVertical: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 8, gap: 2, minHeight: 60 },
  statTextContainer: { flexDirection: 'column', alignItems: 'flex-start' },
  statValueCompact: { fontSize: 18, fontWeight: '900', marginTop: 0 },
  statValueCompactVertical: { fontSize: 16, fontWeight: '800', marginTop: 0 },
  statLabelCompact: { fontSize: 8, fontWeight: '600' },

  // Battery + Tools - UNE SEULE LIGNE DE 4 CARTES
  batteryToolsRowSingle: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },

  // Batterie compacte (quart de largeur)
  batteryCardSmall: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    minHeight: 105,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batteryHorizontalSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    width: '100%',
  },
  batteryHBodySmall: {
    flex: 1,
    height: 18,
    borderWidth: 2,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  batteryHLevelSmall: {
    height: '100%',
    borderRadius: 2,
    position: 'relative',
  },
  batteryShineSmall: {
    position: 'absolute',
    top: 1,
    left: 2,
    right: 2,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  batteryHHeadSmall: {
    width: 6,
    height: 12,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  batteryPercentSmall: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },

  // Tool cards small (quart de largeur)
  toolCardSmall: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 105,
  },
  toolCardTitleSmall: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  toolCardSubtitleSmall: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },

  // Grid 2x2
  gridContainer: { gap: 12, marginBottom: 10, width: '100%' },
  gridRow: { flexDirection: 'row', gap: 12 },
  squareCard: { flex: 1, aspectRatio: 1, borderRadius: 14, overflow: 'hidden' },

  // Grid Lottie - Layout simplifié pour cartes uniformes
  gridLottieContainer: { marginBottom: 8, paddingHorizontal: 8 },
  gridLottieRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  gridCard: { flex: 1, padding: 16, borderRadius: 14, minHeight: 180, overflow: 'hidden' },
  gridCardLarge: { flex: 1, padding: 16, borderRadius: 14, minHeight: 160 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  cardTitle: { fontSize: 8, fontWeight: '700', letterSpacing: 1, flex: 1, textAlign: 'center', width: '100%' },
  cardTitleLarge: { fontSize: 10, fontWeight: '700', letterSpacing: 1, flex: 1, textAlign: 'center', width: '100%' },
  bigValue: { fontSize: 26, fontWeight: '900', textAlign: 'center', width: '100%' },
  bigValueLarge: { fontSize: 32, fontWeight: '900', marginTop: 4, textAlign: 'center', width: '100%' },
  unit: { fontSize: 12, fontWeight: '600', textAlign: 'center', width: '100%' },
  subValue: { fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center', width: '100%' },
  subValueLarge: { fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center', width: '100%' },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 8, height: 24 },
  miniBar: { flex: 1, borderRadius: 2, minHeight: 3 },
  weightTrendContainer: { marginTop: 6, width: '100%', overflow: 'hidden' },
  weightTrendChart: { height: 35, width: '100%', overflow: 'hidden' },
  weightTrendInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  weightTrendLabel: { fontSize: 8, fontWeight: '600', textAlign: 'center' },

  // Hydration - Bidon de sport
  bidonWrap: { alignItems: 'center', justifyContent: 'center', flex: 1, marginVertical: 8 },
  bidonContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  bidon: { alignItems: 'center' },
  bidonCap: { width: 18, height: 8, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  bidonCapTop: { width: 10, height: 3, borderRadius: 2, alignSelf: 'center', marginTop: 2 },
  bidonBody: { width: 40, height: 55, borderWidth: 2, borderRadius: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: 'rgba(6,182,212,0.08)', position: 'relative' },
  bidonWater: { width: '100%', backgroundColor: '#06B6D4', borderBottomLeftRadius: 6, borderBottomRightRadius: 6, opacity: 0.85 },
  bidonShine: { position: 'absolute', top: 4, left: 3, width: 5, height: 30, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  bidonGrads: { position: 'absolute', right: 3, top: 6, bottom: 6, justifyContent: 'space-between' },
  bidonGrad: { width: 6, height: 1 },
  hydroValueContainer: { alignItems: 'center', marginTop: 4 },
  hydroValue: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  hydroGoal: { fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  hydroBtns: { flexDirection: 'row', gap: 4, marginTop: 4 },
  hydroBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, minWidth: 50 },
  hydroBtnTxt: { fontSize: 14, fontWeight: '700', color: '#06B6D4' },

  // Alert
  alertBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 3, marginTop: 4 },
  alertText: { fontSize: 9, fontWeight: '600', color: '#EF4444' },

  // Challenges
  challengesCard: { padding: 14, borderRadius: 14, marginBottom: 12 },
  challengesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  challengesList: { gap: 10 },
  challengeItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  challengeIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center' },
  challengeInfo: { flex: 1 },
  challengeTitle: { fontSize: 12, fontWeight: '600', marginBottom: 3 },
  challengeProgress: { height: 4, borderRadius: 2, overflow: 'hidden' },
  challengeFill: { height: '100%', borderRadius: 2 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, gap: 3 },
  rewardText: { fontSize: 10, fontWeight: '700' },

  // Report
  reportCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  reportContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gradeBadge: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  reportInfo: { flex: 1 },
  reportTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  scoreContainer: { gap: 6 },
  reportScore: { fontSize: 12, fontWeight: '600' },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  shareBtn: { fontSize: 20 },

  // Section
  sectionTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#6B7280' },
  sectionHeader: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#6B7280', marginBottom: 8, marginTop: 4 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, gap: 3 },
  actionLabel: { fontSize: 10, fontWeight: '700' },
  actionSubLabel: { fontSize: 8, fontWeight: '500', textAlign: 'center', marginTop: -1 },

  // Actions Row 4 cartes - MÊME DIMENSION QUE LIGNE ÉNERGIE
  actionsRow4: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  actionBtn4: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 5,
    minHeight: 105,
  },
  actionBtn4Toggle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 5,
    minHeight: 105,
  },
  actionLabel4: { fontSize: 11, fontWeight: '700', textAlign: 'center', width: '100%' },
  actionSubLabel4: { fontSize: 9, fontWeight: '500', textAlign: 'center', marginTop: -1, width: '100%' },

  // Tools
  toolsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toolBtn: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, gap: 4 },
  toolLabel: { fontSize: 8, fontWeight: '600' },

  // Fighter
  fighterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  fighterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, gap: 6 },
  fighterBtnText: { fontSize: 11, fontWeight: '600' },

  // Mode Compétiteur
  modeCompetContainer: {
    padding: 16,
    borderRadius: 16,
  },
  modeCompetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modeCompetIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCompetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Toggle switch mode compétition
  competToggleSwitch: {
    width: 52,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    position: 'relative',
  },
  competToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },

  // Mode compétition désactivé
  competModeOffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  competModeOffText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  // Compte à rebours compétition
  competCountdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 16,
  },
  competCountdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  competCountdownIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  competCountdownInfo: {
    flex: 1,
    gap: 3,
  },
  competCountdownName: {
    fontSize: 15,
    fontWeight: '700',
  },
  competCountdownDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  competCountdownBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  competCountdownDays: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Pas de compétition
  competNoEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 12,
    marginBottom: 16,
  },
  competNoEventIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  competNoEventContent: {
    flex: 1,
    gap: 3,
  },
  competNoEventTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  competNoEventDesc: {
    fontSize: 12,
    fontWeight: '500',
  },

  modeCompetActions: {
    gap: 10,
  },
  modeCompetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
  },
  modeCompetBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCompetBtnContent: {
    flex: 1,
    gap: 2,
  },
  modeCompetBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  modeCompetBtnDesc: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Bouton personnaliser
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 24,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  customizeButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },

  // Competition Toggle - État actif (avec compétition)
  competToggleActive: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  competIconGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  competCountdown: {
    alignItems: 'center',
    gap: 1,
    marginTop: 2,
  },
  competDaysLabel: {
    fontSize: 8,
    fontWeight: '600',
  },
  competDaysNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  competDaysUnit: {
    fontSize: 9,
    fontWeight: '600',
  },
  // Competition Toggle - État inactif (pas de compétition)
  competToggleInactive: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  competInactiveText: {
    fontSize: 10,
    fontWeight: '700',
  },
  competInactiveSubtext: {
    fontSize: 8,
    fontWeight: '500',
  },

  // Section Compétiteur - Apparaît quand le toggle est ON
  competitorSection: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  competitorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  competitorTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  competEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
  },
  competEventInfo: {
    flex: 1,
    gap: 4,
  },
  competEventName: {
    fontSize: 13,
    fontWeight: '700',
  },
  competEventDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  competEventCountdown: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  competEventDays: {
    fontSize: 16,
    fontWeight: '900',
  },
  competAddBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
  },
  competAddText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // 3 petits carrés pour Mode Cut/Palmarès/Compétitions
  actionsRow3: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  actionBtn3: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 5,
    minHeight: 105,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel3: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  actionSubLabel3: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -1,
    width: '100%',
  },

  // Mini Switch pour le toggle Mode Compét
  miniSwitch: {
    width: 28,
    height: 16,
    borderRadius: 8,
    padding: 2,
    justifyContent: 'center',
    marginTop: 2,
  },
  miniSwitchThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },

  // Carnet d'Entraînement
  trainingJournalCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  trainingJournalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainingJournalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingJournalTitleContainer: {
    flex: 1,
    gap: 2,
  },
  trainingJournalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  trainingJournalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  trainingJournalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trainingJournalStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainingJournalStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingJournalStatInfo: {
    gap: 2,
  },
  trainingJournalStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  trainingJournalStatLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  trainingJournalDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 8,
  },
});
