import React, { useState, useCallback, useRef } from 'react';
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

// Composants animés premium
import AnimatedAvatar from '@/components/AnimatedAvatar';
import AnimatedCounter from '@/components/AnimatedCounter';
import AnimatedProgressBar from '@/components/AnimatedProgressBar';
import { AnimatedCard } from '@/components/AnimatedCard';
import AnimatedRing from '@/components/AnimatedRing';
import PulsingBadge from '@/components/PulsingBadge';
import AnimatedWaterBottle from '@/components/AnimatedWaterBottle';
import AnimatedSleepWave from '@/components/AnimatedSleepWave';
import AnimatedRank from '@/components/AnimatedRank';

// Services
import { getSleepStats, getSleepAdvice, formatSleepDuration, SleepStats, getSleepGoal } from '@/lib/sleepService';
import { getWeeklyLoadStats, formatLoad, getRiskColor, WeeklyLoadStats } from '@/lib/trainingLoadService';
import { getDailyChallenges, ActiveChallenge } from '@/lib/challengesService';
import { generateWeeklyReport, formatReportForSharing, WeeklyReport } from '@/lib/weeklyReportService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HYDRATION_KEY = '@yoroi_hydration_today';
const HYDRATION_GOAL = 2500;

// ============================================
// ÉCRAN ACCUEIL - VERSION COMPLÈTE YOROI
// ============================================

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

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
  const [userMode, setUserMode] = useState<UserMode>('loisir');

  // Hydratation
  const [hydration, setHydration] = useState(0);
  const waterAnim = useRef(new Animated.Value(0)).current;

  // Nouveaux états
  const [sleepStats, setSleepStats] = useState<SleepStats | null>(null);
  const [loadStats, setLoadStats] = useState<WeeklyLoadStats | null>(null);
  const [dailyChallenges, setDailyChallenges] = useState<ActiveChallenge[]>([]);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [bodyComposition, setBodyComposition] = useState<any>(null);
  const [sleepGoal, setSleepGoal] = useState(480); // 8h par défaut
  const [nextEvent, setNextEvent] = useState<{
    type: 'competition' | 'combat' | null;
    name: string;
    daysLeft: number;
    date: string;
    sport?: string;
  } | null>(null);

  // Hydratation functions
  const loadHydration = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const stored = await AsyncStorage.getItem(`${HYDRATION_KEY}_${today}`);
      if (stored) {
        const value = parseInt(stored, 10);
        setHydration(value);
        animateWater(value);
      }
    } catch (error) {
      console.error('Erreur hydratation:', error);
    }
  }, []);

  const saveHydration = async (value: number) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    await AsyncStorage.setItem(`${HYDRATION_KEY}_${today}`, value.toString());
  };

  const animateWater = (value: number) => {
    Animated.spring(waterAnim, {
      toValue: Math.min(value / HYDRATION_GOAL, 1),
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
    animateWater(newValue);
  };

  // Chargement des données
  const loadData = useCallback(async () => {
    try {
      const [profileData, weight, history, streakDays, quote, allTrainings, mode, sleep, load, challenges, report, event] = await Promise.all([
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

      const bodyComp = await getLatestBodyComposition();
      setBodyComposition(bodyComp);

      const goal = await getSleepGoal();
      setSleepGoal(goal);

      setTotalPoints(history.length * 10 + allTrainings.length * 25 + (streakDays >= 7 ? 50 : 0));
      loadHydration();
    } catch (error) {
      console.error('Erreur:', error);
    }
  }, [loadHydration]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Calculs
  const rank = getCurrentRank(streak);
  const level = getLevel(totalPoints);
  const currentWeight = latestWeight?.weight || null;
  const startWeight = profile?.start_weight || (weightHistory.length > 0 ? weightHistory[weightHistory.length - 1]?.weight : null);
  const targetWeight = profile?.target_weight || null;
  const weightLost = currentWeight && startWeight ? startWeight - currentWeight : 0;
  const totalToLose = startWeight && targetWeight ? Math.max(0, startWeight - targetWeight) : null;
  const remainingToLose = currentWeight && targetWeight ? Math.max(0, currentWeight - targetWeight) : null;
  const weightProgress = totalToLose && currentWeight ? Math.min(1, Math.max(0, (startWeight! - currentWeight) / totalToLose)) : 0;

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
    score += (hydration / HYDRATION_GOAL) * 15;
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

  // Radar Performance - Adapté à tous les sports
  const calculateRadarData = () => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    const recentTrainings = trainings.filter(t => new Date(t.date) >= last30Days);
    
    const counts = { force: 0, cardio: 0, technique: 0, souplesse: 0 };
    recentTrainings.forEach(t => {
      const sport = t.sport?.toLowerCase() || '';
      // Force : Musculation, CrossFit, Haltérophilie, etc.
      if (['musculation', 'crossfit', 'muscu', 'haltero', 'powerlifting', 'force'].some(s => sport.includes(s))) counts.force++;
      // Cardio : Running, Natation, Foot, Padel, Tennis, Vélo, etc.
      if (['running', 'hiit', 'cardio', 'natation', 'futsal', 'foot', 'football', 'padel', 'tennis', 'velo', 'cycling', 'basket', 'rugby', 'hand'].some(s => sport.includes(s))) counts.cardio++;
      // Technique : Arts martiaux, Sports de raquette, etc.
      if (['jjb', 'boxe', 'mma', 'judo', 'karate', 'lutte', 'grappling', 'kickboxing', 'muay', 'padel', 'tennis', 'golf', 'escalade'].some(s => sport.includes(s))) counts.technique++;
      // Souplesse : Yoga, Stretching, Mobilité, Pilates, etc.
      if (['yoga', 'stretch', 'mobilite', 'pilates', 'gym', 'danse', 'dance'].some(s => sport.includes(s))) counts.souplesse++;
    });

    const maxSessions = 12;
    return {
      force: Math.min(100, (counts.force / maxSessions) * 100),
      cardio: Math.min(100, (counts.cardio / maxSessions) * 100),
      technique: Math.min(100, (counts.technique / maxSessions) * 100),
      souplesse: Math.min(100, (counts.souplesse / maxSessions) * 100),
      mental: Math.min(100, 40 + streak * 2 + (hydration / HYDRATION_GOAL) * 30),
    };
  };

  const batteryPercent = calculateBatteryPercent();
  const radarData = calculateRadarData();
  const last7Weights = weightHistory.slice(0, 7).reverse();

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
    const iconSize = 14;
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

  const batteryStatus = getBatteryStatus();

        return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <MotivationPopup />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setLogoViewerVisible(true)}>
            <Image source={require('@/assets/logo d\'app/logo1.png')} style={styles.logo} resizeMode="contain" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()}</Text>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{profile?.name || 'Champion'}</Text>
            {/* Citation juste en dessous */}
            {dailyQuote && (
              <View style={[styles.quoteCardInline, { backgroundColor: colors.backgroundCard }]}>
                <Sparkles size={12} color={colors.accent} />
                <Text style={[styles.quoteTextInline, { color: colors.textSecondary }]} numberOfLines={1}>"{dailyQuote.text}"</Text>
                </View>
                  )}
                </View>
          <TouchableOpacity onPress={() => setAvatarViewerVisible(true)} style={[styles.avatarBtn, { borderColor: rank.color }]}>
            <AnimatedAvatar size={70}>
              <AvatarDisplay size="medium" refreshTrigger={Date.now()} showBorder={false} />
            </AnimatedAvatar>
          </TouchableOpacity>
                </View>

        {/* Stats rapides (réduites) - Juste sous la citation */}
        <View style={styles.statsRowCompact}>
          <TouchableOpacity style={[styles.statCardCompact, { backgroundColor: colors.backgroundCard }]} onPress={() => setRanksModalVisible(true)}>
            <Animated.View style={{ transform: [{ scale: streakFlameAnim }] }}>
              <Flame size={10} color="#F97316" />
            </Animated.View>
            <AnimatedCounter value={streak} style={[styles.statValueCompact, { color: '#F97316' }]} duration={800} />
            <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>jours</Text>
              </TouchableOpacity>
          <View style={[styles.statCardCompact, { backgroundColor: colors.backgroundCard }]}>
            <Zap size={10} color={colors.accent} />
            <AnimatedCounter value={level.level} style={[styles.statValueCompact, { color: colors.accent }]} duration={800} />
            <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>niveau</Text>
                </View>
          <TouchableOpacity style={[styles.statCardCompact, { backgroundColor: colors.backgroundCard }]} onPress={() => setRanksModalVisible(true)}>
            <Trophy size={10} color={rank.color} />
            <AnimatedRank rank={rank.name.split(' ')[0]} color={rank.color} style={styles.statValueCompact} delay={300} />
            <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>rang</Text>
              </TouchableOpacity>
                </View>

        {/* ACTIONS RAPIDES : Timer, Compétition, Infirmerie, Photo */}
        <View style={styles.actionsRowTop}>
          <TouchableOpacity style={[styles.actionBtnSquare, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/timer')} activeOpacity={0.85}>
            <Timer size={22} color={colors.accent} />
            <Text style={[styles.actionLabelSquare, { color: colors.textPrimary, fontSize: 13, fontWeight: '700' }]}>Timer</Text>
            <View style={styles.timerFractionMini}>
              <Text style={[styles.timerFractionTop, { color: colors.textSecondary }]}>Round</Text>
              <View style={[styles.timerFractionLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.timerFractionBottom, { color: colors.textMuted }]}>Temps de repos</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtnSquare, { backgroundColor: colors.backgroundCard }]}
            onPress={() => router.push(nextEvent ? '/competitions' : '/add-competition')}
            activeOpacity={0.85}
          >
            {nextEvent ? (
              <>
                {/* Icône selon le sport avec cibles */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons
                    name="target"
                    size={16}
                    color="#EF4444"
                  />
                  {nextEvent.sport === 'jjb' || nextEvent.sport === 'judo' || nextEvent.sport === 'karate' ? (
                    <MaterialCommunityIcons
                      name="karate"
                      size={26}
                      color={nextEvent.daysLeft < 7 ? '#EF4444' : nextEvent.daysLeft < 30 ? '#F97316' : '#10B981'}
                    />
                  ) : nextEvent.sport === 'mma' || nextEvent.sport === 'boxe' || nextEvent.sport === 'muay_thai' ? (
                    <MaterialCommunityIcons
                      name="boxing-glove"
                      size={26}
                      color={nextEvent.daysLeft < 7 ? '#EF4444' : nextEvent.daysLeft < 30 ? '#F97316' : '#10B981'}
                    />
                  ) : (
                    <Trophy
                      size={26}
                      color={nextEvent.daysLeft < 7 ? '#EF4444' : nextEvent.daysLeft < 30 ? '#F97316' : '#10B981'}
                    />
                  )}
                  <MaterialCommunityIcons
                    name="target"
                    size={16}
                    color="#EF4444"
                  />
                </View>
                {/* J-XX avec couleur selon échéance */}
                <Text style={[
                  styles.actionLabelSquare,
                  {
                    color: nextEvent.daysLeft < 7 ? '#EF4444' : nextEvent.daysLeft < 30 ? '#F97316' : '#10B981',
                    fontSize: 13,
                    fontWeight: '900'
                  }
                ]}>
                  J-{nextEvent.daysLeft}
                </Text>
                {/* Nom abrégé */}
                <Text
                  style={[
                    styles.actionLabelSquare,
                    {
                      color: colors.textPrimary,
                      fontSize: nextEvent.name.length > 12 ? 9 : 11,
                      fontWeight: '600',
                      marginTop: -2,
                    }
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {nextEvent.name}
                </Text>
              </>
            ) : (
              <>
                <Trophy size={22} color={colors.accent} />
                <Text style={[styles.actionLabelSquare, { color: colors.textPrimary, fontSize: 13, fontWeight: '700' }]}>Compét</Text>
                <Text style={[styles.actionLabelSquare, { color: colors.textMuted, fontSize: 9, marginTop: -2 }]}>Ajouter</Text>
              </>
            )}
              </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnSquare, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/infirmary')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="hospital-box" size={26} color="#EF4444" />
            <Text style={[styles.actionLabelSquare, { color: colors.textPrimary, fontSize: 13, fontWeight: '700' }]}>Infirmerie</Text>
              </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnSquare, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/profile')} activeOpacity={0.85}>
            <Camera size={22} color="#10B981" />
            <Text style={[styles.actionLabelSquare, { color: colors.textPrimary, fontSize: 13, fontWeight: '700' }]}>Photo</Text>
            <Text style={[styles.actionLabelSquare, { color: colors.textMuted, fontSize: 9, marginTop: -2 }]}>Avant/Après</Text>
              </TouchableOpacity>
                </View>

        {/* BATTERIE ÉNERGIE - Horizontale (Sous les actions, au-dessus de poids/hydratation) */}
        <AnimatedCard index={0}>
        <TouchableOpacity style={[styles.batteryCard, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/energy')} activeOpacity={0.8}>
          <View style={styles.batteryHeader}>
            <AnimatedRing progress={batteryPercent / 100} size={32} strokeWidth={3} color={batteryStatus.color} backgroundColor={`${batteryStatus.color}20`} />
            <Battery size={16} color={batteryStatus.color} />
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ÉNERGIE DU JOUR</Text>
            <AnimatedCounter value={Math.round(batteryPercent)} suffix="%" style={[styles.batteryPercentSmall, { color: batteryStatus.color }]} duration={1000} />
            </View>
          
          {/* Batterie horizontale large */}
          <View style={styles.batteryHorizontal}>
            <View style={[styles.batteryHBody, { borderColor: colors.border, backgroundColor: `${colors.border}30` }]}>
              <Animated.View 
                            style={[
                  styles.batteryHLevel, 
                              {
                    width: batteryAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    backgroundColor: batteryStatus.color,
                              }
                            ]}
                          />
              {/* Effet brillance */}
              <View style={styles.batteryShine} />
                  </View>
            {/* Tête de la batterie (à droite) */}
            <View style={[styles.batteryHHead, { backgroundColor: colors.border }]} />
                </View>
          
          {/* Status en dessous */}
          <View style={styles.batteryFooterRow}>
            <View style={[styles.batteryStatusBadge, { backgroundColor: `${batteryStatus.color}15` }]}>
              {renderBatteryIcon()}
              <Text style={[styles.batteryLabel, { color: batteryStatus.color }]}>{batteryStatus.label}</Text>
              </View>
            <ChevronRight size={14} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
        </AnimatedCard>

        {/* GRID 2x2 LOTTIE : Poids + Hydratation (haut), Sommeil + Charge (bas) */}
        <View style={styles.gridLottieContainer}>
          {/* Ligne 1 : Poids + Hydratation */}
          <View style={styles.gridLottieRow}>
            {/* Carte Poids - Vers les stats poids */}
            <TouchableOpacity onPress={() => router.push('/stats?tab=poids')} activeOpacity={0.9}>
              <WeightLottieCard
                weight={currentWeight || 0}
                target={targetWeight || undefined}
                trend={trend}
                history={last7Weights.map(w => w.weight)}
              />
            </TouchableOpacity>

            {/* Carte Hydratation */}
            <HydrationLottieCard
              currentMl={hydration}
              goalMl={HYDRATION_GOAL}
              onAddMl={(amountMl) => addWater(amountMl)}
            />
          </View>

          {/* Ligne 2 : Sommeil + Charge */}
          <View style={styles.gridLottieRow}>
            {/* Carte Sommeil */}
            <TouchableOpacity onPress={() => router.push('/sleep')} activeOpacity={0.9}>
              <SleepLottieCard
                hours={sleepStats?.lastNightDuration ? sleepStats.lastNightDuration / 60 : 0}
                quality={sleepStats?.lastNightQuality ? (sleepStats.lastNightQuality / 5) * 100 : 0}
                debt={sleepStats?.sleepDebtHours || 0}
                goal={sleepGoal / 60}
              />
            </TouchableOpacity>

            {/* Carte Charge */}
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
        </View>

        {/* DÉFIS DU JOUR */}
        <AnimatedCard index={1}>
        <TouchableOpacity style={[styles.challengesCard, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/challenges')} activeOpacity={0.8}>
          <View style={styles.challengesHeader}>
            <Target size={16} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DÉFIS DU JOUR</Text>
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

        {/* RADAR DE PERFORMANCE */}
        <AnimatedCard index={2}>
        <TouchableOpacity onPress={() => router.push('/stats?tab=radar')} activeOpacity={0.8}>
          <PerformanceRadar data={radarData} />
        </TouchableOpacity>
        </AnimatedCard>

        {/* COURBE HEALTHSPAN */}
        <AnimatedCard index={3}>
        <TouchableOpacity onPress={() => router.push('/stats?tab=sante')} activeOpacity={0.8}>
          <HealthspanChart />
        </TouchableOpacity>
        </AnimatedCard>

        {/* RAPPORT DE MISSION */}
        {weeklyReport && (
          <AnimatedCard index={4}>
          <TouchableOpacity style={[styles.reportCard, { backgroundColor: colors.backgroundCard }]} onPress={shareReport}>
            <View style={styles.reportHeader}>
              <FileText size={16} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>RAPPORT DE MISSION</Text>
              </View>
            <View style={styles.reportContent}>
              <View style={[styles.gradeBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.gradeText}>{weeklyReport.verdict.grade}</Text>
            </View>
              <View style={styles.reportInfo}>
                <Text style={[styles.reportTitle, { color: colors.textPrimary }]}>{weeklyReport.verdict.title}</Text>
                <Text style={[styles.reportScore, { color: colors.textMuted }]}>Score: {weeklyReport.overallScore}/100</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
                    </TouchableOpacity>
          </AnimatedCard>
        )}

        {/* ACTIONS RAPIDES */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>ACTIONS</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/entry')}>
            <Scale size={20} color={colors.accent} />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Pesée</Text>
              </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/add-training')}>
            <Dumbbell size={20} color="#8B5CF6" />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Training</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/transformation')}>
            <Camera size={20} color="#EC4899" />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/timer')}>
            <Timer size={20} color="#F59E0B" />
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Timer</Text>
                    </TouchableOpacity>
                  </View>

        {/* OUTILS */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>OUTILS</Text>
        <View style={styles.toolsRow}>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/measurements')}>
            <Ruler size={16} color={colors.accent} />
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Mesures</Text>
                  </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/infirmary')}>
            <Heart size={16} color="#EF4444" />
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Infirmerie</Text>
                </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/health-connect')}>
            <Activity size={16} color="#10B981" />
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Santé</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/notifications')}>
            <Bell size={16} color="#F59E0B" />
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Notifs</Text>
            </TouchableOpacity>
          </View>
        <View style={styles.toolsRow}>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/appearance')}>
            <Palette size={16} color={colors.accent} />
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Thèmes</Text>
              </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/cut-mode')}>
            <Target size={16} color="#EF4444" />
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Cut</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/settings')}>
            <Settings size={16} color={colors.textMuted} />
            <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Réglages</Text>
              </TouchableOpacity>
        </View>

        {/* CALENDRIER STREAK */}
        <StreakCalendar weeks={12} />

        {/* Mode Compétiteur */}
        {userMode === 'competiteur' && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>COMPÉTITEUR</Text>
            <View style={styles.fighterRow}>
              <TouchableOpacity style={[styles.fighterBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/cut-mode')}>
                <Scale size={16} color="#EF4444" />
                <Text style={[styles.fighterBtnText, { color: colors.textPrimary }]}>Mode Cut</Text>
                    </TouchableOpacity>
              <TouchableOpacity style={[styles.fighterBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/competitions')}>
                <Trophy size={16} color={colors.accent} />
                <Text style={[styles.fighterBtnText, { color: colors.textPrimary }]}>Compétitions</Text>
                    </TouchableOpacity>
              <TouchableOpacity style={[styles.fighterBtn, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/palmares')}>
                <Medal size={16} color={colors.accent} />
                <Text style={[styles.fighterBtnText, { color: colors.textPrimary }]}>Palmarès</Text>
                    </TouchableOpacity>
                  </View>
          </>
        )}

        <View style={{ height: 120 }} />
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  logo: { width: 56, height: 56, borderRadius: 14 },
  headerText: { flex: 1, marginLeft: 12 },
  greeting: { fontSize: 14, fontWeight: '600' },
  userName: { fontSize: 22, fontWeight: '900' },
  avatarBtn: { borderWidth: 3, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },

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

  // Actions rapides en haut (carrés)
  actionsRowTop: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtnSquare: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 15, borderRadius: 12, gap: 6, minHeight: 88 },
  actionLabelSquare: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
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
  quoteCardInline: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4, gap: 4 },
  quoteTextInline: { flex: 1, fontSize: 10, fontStyle: 'italic', lineHeight: 14 },

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
  statsRowCompact: { flexDirection: 'row', gap: 4, marginBottom: 10, marginTop: 4 },
  statCardCompact: { flex: 1, alignItems: 'center', padding: 4, borderRadius: 8 },
  statValueCompact: { fontSize: 12, fontWeight: '800', marginTop: 1 },
  statLabelCompact: { fontSize: 6, fontWeight: '600' },

  // Battery horizontale
  batteryCard: { padding: 6, borderRadius: 12, marginBottom: 8 },
  batteryHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  batteryPercentSmall: { fontSize: 13, fontWeight: '900', marginLeft: 'auto' },
  batteryHorizontal: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  batteryHBody: { flex: 1, height: 16, borderWidth: 1.5, borderRadius: 5, overflow: 'hidden', position: 'relative' },
  batteryHLevel: { height: '100%', borderRadius: 3 },
  batteryShine: { position: 'absolute', top: 1, left: 3, right: 3, height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 1.5 },
  batteryHHead: { width: 5, height: 10, borderTopRightRadius: 2, borderBottomRightRadius: 2, marginLeft: -1.5 },
  batteryFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  batteryStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  batteryLabel: { fontSize: 10, fontWeight: '600' },

  // Grid 2x2
  gridContainer: { gap: 12, marginBottom: 10, width: '100%' },
  gridRow: { flexDirection: 'row', gap: 12 },
  squareCard: { flex: 1, aspectRatio: 1, borderRadius: 14, overflow: 'hidden' },

  // Grid Lottie - Layout simplifié pour cartes uniformes
  gridLottieContainer: { marginBottom: 12, paddingHorizontal: 8 },
  gridLottieRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridCard: { flex: 1, padding: 16, borderRadius: 14, minHeight: 180, overflow: 'hidden' },
  gridCardLarge: { flex: 1, padding: 16, borderRadius: 14, minHeight: 160 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  cardTitle: { fontSize: 8, fontWeight: '700', letterSpacing: 1, flex: 1 },
  cardTitleLarge: { fontSize: 10, fontWeight: '700', letterSpacing: 1, flex: 1 },
  bigValue: { fontSize: 26, fontWeight: '900' },
  bigValueLarge: { fontSize: 32, fontWeight: '900', marginTop: 4 },
  unit: { fontSize: 12, fontWeight: '600' },
  subValue: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  subValueLarge: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 8, height: 24 },
  miniBar: { flex: 1, borderRadius: 2, minHeight: 3 },
  weightTrendContainer: { marginTop: 6, width: '100%', overflow: 'hidden' },
  weightTrendChart: { height: 35, width: '100%', overflow: 'hidden' },
  weightTrendInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  weightTrendLabel: { fontSize: 8, fontWeight: '600' },

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
  hydroValue: { fontSize: 18, fontWeight: '900' },
  hydroGoal: { fontSize: 11, fontWeight: '600', marginTop: 2 },
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
  reportCard: { padding: 14, borderRadius: 14, marginBottom: 12 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  reportContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gradeBadge: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  reportInfo: { flex: 1 },
  reportTitle: { fontSize: 13, fontWeight: '700' },
  reportScore: { fontSize: 11, marginTop: 2 },
  shareBtn: { fontSize: 20 },

  // Section
  sectionTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  sectionHeader: { fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 8, marginTop: 4 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, gap: 3 },
  actionLabel: { fontSize: 9, fontWeight: '600' },

  // Tools
  toolsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toolBtn: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10, gap: 4 },
  toolLabel: { fontSize: 8, fontWeight: '600' },

  // Fighter
  fighterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  fighterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, gap: 6 },
  fighterBtnText: { fontSize: 11, fontWeight: '600' },
});
