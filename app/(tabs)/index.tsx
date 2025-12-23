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
import Svg, { Circle, Polygon, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
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
  Settings,
} from 'lucide-react-native';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useTheme } from '@/lib/ThemeContext';
import { getProfile, getLatestWeight, getWeights, calculateStreak, getTrainings, Profile, Weight, Training } from '@/lib/database';
import { getDailyQuote, Citation } from '@/lib/citations';
import { getCurrentRank } from '@/lib/ranks';
import { getLevel } from '@/lib/gamification';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { RanksModal } from '@/components/RanksModal';
import { LogoViewer } from '@/components/LogoViewer';
import { MotivationPopup } from '@/components/MotivationPopup';
import { getUserMode } from '@/lib/fighterModeService';
import { UserMode } from '@/lib/fighterMode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BatteryReadyPopup } from '@/components/BatteryReadyPopup';
import { PerformanceRadar } from '@/components/PerformanceRadar';
import { HealthspanChart } from '@/components/HealthspanChart';
import { StreakCalendar } from '@/components/StreakCalendar';
import { AvatarViewerModal } from '@/components/AvatarViewerModal';

// Services
import { getSleepStats, getSleepAdvice, formatSleepDuration, SleepStats } from '@/lib/sleepService';
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
      const [profileData, weight, history, streakDays, quote, allTrainings, mode, sleep, load, challenges, report] = await Promise.all([
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
  const weightLost = currentWeight && startWeight ? startWeight - currentWeight : 0;

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
  
  // Animer la batterie quand le pourcentage change
  React.useEffect(() => {
    Animated.timing(batteryAnim, {
      toValue: batteryPercent / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [batteryPercent]);

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
            <Image source={require('@/assets/images/logo2010.png')} style={styles.logo} resizeMode="contain" />
              </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()}</Text>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{profile?.name || 'Champion'}</Text>
            </View>
          <TouchableOpacity onPress={() => setAvatarViewerVisible(true)} style={[styles.avatarBtn, { borderColor: rank.color }]}>
            <AvatarDisplay size="medium" refreshTrigger={Date.now()} showBorder={false} />
          </TouchableOpacity>
                </View>

        {/* DÉCORATION JAPONAISE */}
        <View style={[styles.japaneseDecor, { backgroundColor: colors.backgroundCard }]}>
          <Text style={styles.decorLeft}>🌸</Text>
          <Text style={styles.decorTorii}>⛩️</Text>
          <View style={styles.decorCenter}>
            <Text style={[styles.decorText, { color: colors.textMuted }]}>武士道</Text>
            <Text style={[styles.decorSubtext, { color: colors.textMuted }]}>La Voie du Guerrier</Text>
                </View>
          <Text style={styles.decorTorii}>⛩️</Text>
          <Text style={styles.decorRight}>🌸</Text>
              </View>

        {/* Citation */}
        {dailyQuote && (
          <View style={[styles.quoteCard, { backgroundColor: colors.backgroundCard }]}>
            <Sparkles size={14} color={colors.accent} />
            <Text style={[styles.quoteText, { color: colors.textSecondary }]} numberOfLines={2}>"{dailyQuote.text}"</Text>
                </View>
        )}

        {/* Stats rapides */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.backgroundCard }]} onPress={() => setRanksModalVisible(true)}>
            <Flame size={16} color="#F97316" />
            <Text style={[styles.statValue, { color: '#F97316' }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>jours</Text>
              </TouchableOpacity>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Zap size={16} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.accent }]}>{level.level}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>niveau</Text>
                </View>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.backgroundCard }]} onPress={() => setRanksModalVisible(true)}>
            <Trophy size={16} color={rank.color} />
            <Text style={[styles.statValue, { color: rank.color }]} numberOfLines={1}>{rank.name.split(' ')[0]}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>rang</Text>
              </TouchableOpacity>
                </View>

        {/* BATTERIE ÉNERGIE - Horizontale */}
        <TouchableOpacity style={[styles.batteryCard, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/energy')} activeOpacity={0.8}>
          <View style={styles.batteryHeader}>
            <Battery size={16} color={batteryStatus.color} />
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ÉNERGIE DU JOUR</Text>
            <Text style={[styles.batteryPercentSmall, { color: batteryStatus.color }]}>{Math.round(batteryPercent)}%</Text>
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

        {/* GRILLE : Poids + Hydratation */}
        <View style={styles.grid2}>
          {/* Poids */}
          <TouchableOpacity style={[styles.gridCard, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/body-composition')}>
            <View style={styles.cardHeader}>
              <Scale size={14} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.textMuted }]}>POIDS</Text>
              {trend === 'down' && <TrendingDown size={12} color={colors.success} />}
              {trend === 'up' && <TrendingUp size={12} color={colors.warning} />}
                </View>
            <Text style={[styles.bigValue, { color: colors.textPrimary }]}>
              {currentWeight || '--'}<Text style={[styles.unit, { color: colors.textMuted }]}> kg</Text>
                    </Text>
            {weightLost > 0 && <Text style={[styles.subValue, { color: colors.success }]}>-{weightLost.toFixed(1)} kg</Text>}
            <View style={styles.miniChart}>
              {last7Weights.map((w, i) => {
                const max = Math.max(...last7Weights.map(x => x.weight || 0));
                const min = Math.min(...last7Weights.map(x => x.weight || 0));
                const range = max - min || 1;
                const h = ((w.weight || min) - min) / range * 20 + 4;
                return <View key={i} style={[styles.miniBar, { height: h, backgroundColor: i === last7Weights.length - 1 ? colors.accent : colors.border }]} />;
              })}
                </View>
              </TouchableOpacity>

          {/* Hydratation - Bidon de sport */}
          <View style={[styles.gridCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.cardHeader}>
              <Droplets size={14} color="#06B6D4" />
              <Text style={[styles.cardTitle, { color: colors.textMuted }]}>HYDRATATION</Text>
                  </View>
            <TouchableOpacity onPress={() => router.push('/hydration')} style={styles.bidonWrap}>
              {/* Bidon de sport */}
              <View style={styles.bidon}>
                {/* Bouchon */}
                <View style={[styles.bidonCap, { backgroundColor: '#0891B2' }]}>
                  <View style={[styles.bidonCapTop, { backgroundColor: '#06B6D4' }]} />
                </View>
                {/* Corps du bidon */}
                <View style={[styles.bidonBody, { borderColor: colors.border }]}>
                  {/* Eau animée */}
                  <Animated.View 
                            style={[
                      styles.bidonWater, 
                              {
                        height: waterAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                              }
                            ]}
                          />
                  {/* Reflet */}
                  <View style={styles.bidonShine} />
                  {/* Graduations */}
                  <View style={styles.bidonGrads}>
                    <View style={[styles.bidonGrad, { backgroundColor: colors.border }]} />
                    <View style={[styles.bidonGrad, { backgroundColor: colors.border }]} />
                    <View style={[styles.bidonGrad, { backgroundColor: colors.border }]} />
                        </View>
                </View>
              </View>
              {/* Valeur */}
              <Text style={[styles.hydroValue, { color: colors.textPrimary }]}>{(hydration / 1000).toFixed(1)}L</Text>
              <Text style={[styles.hydroGoal, { color: colors.textMuted }]}>/ 2.5L</Text>
            </TouchableOpacity>
            <View style={styles.hydroBtns}>
              <TouchableOpacity style={[styles.hydroBtn, { backgroundColor: '#EF444420' }]} onPress={() => addWater(-250)}>
                <Minus size={12} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.hydroBtn, { backgroundColor: '#06B6D420' }]} onPress={() => addWater(250)}>
                <Text style={styles.hydroBtnTxt}>+250</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.hydroBtn, { backgroundColor: '#06B6D430' }]} onPress={() => addWater(500)}>
                <Text style={styles.hydroBtnTxt}>+500</Text>
              </TouchableOpacity>
                  </View>
                  </View>
                </View>

        {/* GRILLE : Sommeil + Charge */}
        <View style={styles.grid2}>
          {/* Dette de Sommeil */}
          <TouchableOpacity style={[styles.gridCard, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/sleep')}>
            <View style={styles.cardHeader}>
              <Moon size={14} color="#8B5CF6" />
              <Text style={[styles.cardTitle, { color: colors.textMuted }]}>SOMMEIL</Text>
              </View>
            <Text style={[styles.bigValue, { color: colors.textPrimary }]}>
              {sleepStats ? formatSleepDuration(sleepStats.lastNightDuration) : '--'}
            </Text>
            <Text style={[styles.subValue, { color: sleepStats && sleepStats.sleepDebtHours > 5 ? '#EF4444' : colors.textMuted }]}>
              Dette: {sleepStats?.sleepDebtHours || 0}h
            </Text>
            {sleepStats && sleepStats.sleepDebtHours > 5 && (
              <View style={[styles.alertBadge, { backgroundColor: '#EF444420' }]}>
                <AlertTriangle size={10} color="#EF4444" />
                <Text style={styles.alertText}>Fatigue</Text>
                </View>
              )}
            </TouchableOpacity>

          {/* Charge d'Entraînement */}
          <TouchableOpacity style={[styles.gridCard, { backgroundColor: colors.backgroundCard }]} onPress={() => router.push('/stats')}>
            <View style={styles.cardHeader}>
              <Activity size={14} color={loadStats ? getRiskColor(loadStats.riskLevel) : colors.textMuted} />
              <Text style={[styles.cardTitle, { color: colors.textMuted }]}>CHARGE</Text>
                </View>
            <Text style={[styles.bigValue, { color: loadStats ? getRiskColor(loadStats.riskLevel) : colors.textPrimary }]}>
              {loadStats ? formatLoad(loadStats.totalLoad) : '0'}
            </Text>
            <Text style={[styles.subValue, { color: colors.textMuted }]}>
              {loadStats?.sessionsCount || 0} séances
            </Text>
            {loadStats && loadStats.riskLevel !== 'safe' && (
              <View style={[styles.alertBadge, { backgroundColor: `${getRiskColor(loadStats.riskLevel)}20` }]}>
                <AlertTriangle size={10} color={getRiskColor(loadStats.riskLevel)} />
                <Text style={[styles.alertText, { color: getRiskColor(loadStats.riskLevel) }]}>
                  {loadStats.riskLevel === 'danger' ? 'Danger' : 'Attention'}
                </Text>
                </View>
            )}
          </TouchableOpacity>
              </View>

        {/* DÉFIS DU JOUR */}
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
                <View style={[styles.rewardBadge, { backgroundColor: challenge.progress.completed ? colors.successLight : colors.accentMuted }]}>
                  <Gift size={10} color={challenge.progress.completed ? colors.success : colors.accent} />
                  <Text style={[styles.rewardText, { color: challenge.progress.completed ? colors.success : colors.accent }]}>
                    +{challenge.reward.xp}
            </Text>
      </View>
      </View>
          ))}
      </View>
          </TouchableOpacity>

        {/* RADAR DE PERFORMANCE */}
        <PerformanceRadar data={radarData} />

        {/* COURBE HEALTHSPAN */}
        <HealthspanChart />

        {/* RAPPORT DE MISSION */}
        {weeklyReport && (
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  logo: { width: 44, height: 44, borderRadius: 12 },
  headerText: { flex: 1, marginLeft: 10 },
  greeting: { fontSize: 12, fontWeight: '500' },
  userName: { fontSize: 18, fontWeight: '800' },
  avatarBtn: { borderWidth: 3, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' },

  // Décoration japonaise
  japaneseDecor: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10, 
    paddingHorizontal: 16,
    borderRadius: 12, 
    marginBottom: 12,
    gap: 4,
  },
  decorLeft: { fontSize: 16 },
  decorRight: { fontSize: 16 },
  decorTorii: { fontSize: 18 },
  decorCenter: { alignItems: 'center', marginHorizontal: 6 },
  decorText: { fontSize: 14, fontWeight: '800' },
  decorSubtext: { fontSize: 9, fontStyle: 'italic', marginTop: 1 },

  // Quote
  quoteCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: 10, marginBottom: 12, gap: 6 },
  quoteText: { flex: 1, fontSize: 11, fontStyle: 'italic', lineHeight: 16 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  statCard: { flex: 1, alignItems: 'center', padding: 8, borderRadius: 12 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  statLabel: { fontSize: 8, fontWeight: '600' },

  // Battery horizontale
  batteryCard: { padding: 14, borderRadius: 14, marginBottom: 12 },
  batteryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  batteryPercentSmall: { fontSize: 16, fontWeight: '900', marginLeft: 'auto' },
  batteryHorizontal: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  batteryHBody: { flex: 1, height: 36, borderWidth: 3, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  batteryHLevel: { height: '100%', borderRadius: 4 },
  batteryShine: { position: 'absolute', top: 4, left: 8, right: 8, height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3 },
  batteryHHead: { width: 8, height: 18, borderTopRightRadius: 4, borderBottomRightRadius: 4, marginLeft: -2 },
  batteryFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  batteryStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5 },
  batteryLabel: { fontSize: 11, fontWeight: '600' },

  // Grid
  grid2: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  gridCard: { flex: 1, padding: 12, borderRadius: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardTitle: { fontSize: 8, fontWeight: '700', letterSpacing: 1, flex: 1 },
  bigValue: { fontSize: 26, fontWeight: '900' },
  unit: { fontSize: 12, fontWeight: '600' },
  subValue: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 8, height: 24 },
  miniBar: { flex: 1, borderRadius: 2, minHeight: 3 },

  // Hydration - Bidon de sport
  bidonWrap: { alignItems: 'center', marginVertical: 4 },
  bidon: { alignItems: 'center' },
  bidonCap: { width: 20, height: 10, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  bidonCapTop: { width: 12, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 2 },
  bidonBody: { width: 44, height: 70, borderWidth: 2, borderRadius: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: 'rgba(6,182,212,0.08)', position: 'relative' },
  bidonWater: { width: '100%', backgroundColor: '#06B6D4', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, opacity: 0.85 },
  bidonShine: { position: 'absolute', top: 6, left: 4, width: 6, height: 40, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  bidonGrads: { position: 'absolute', right: 4, top: 8, bottom: 8, justifyContent: 'space-between' },
  bidonGrad: { width: 8, height: 1 },
  hydroValue: { fontSize: 16, fontWeight: '900', marginTop: 4 },
  hydroGoal: { fontSize: 10, fontWeight: '500', marginTop: -2 },
  hydroBtns: { flexDirection: 'row', gap: 4, marginTop: 6 },
  hydroBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  hydroBtnTxt: { fontSize: 10, fontWeight: '700', color: '#06B6D4' },

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
