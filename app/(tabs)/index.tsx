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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
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
  Brain,
  Stethoscope,
  Scissors,
  Settings,
  FlaskConical,
  Calculator,
  Apple,
  Clock,
  BookOpen,
  Plus,
  Award,
  Calendar,
  Share2,
  List,
  Building2,
  Cloud,
  Watch,
  Shield,
} from 'lucide-react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getProfile, getLatestWeight, getWeights, calculateStreak, getTrainings, Profile, Weight, Training } from '@/lib/database';
import { getLatestBodyComposition } from '@/lib/bodyComposition';
import { getSessionQuote, Citation } from '@/lib/citations';
import { getCurrentRank } from '@/lib/ranks';
import { getLevel } from '@/lib/gamification';
import AvatarDisplay from '@/components/AvatarDisplay';
import { RanksModal } from '@/components/RanksModal';
import { LogoViewer } from '@/components/LogoViewer';
import { MotivationPopup } from '@/components/MotivationPopup';
import { getUserMode, getNextEvent } from '@/lib/fighterModeService';
import { UserMode } from '@/lib/fighterMode';
import { calculateReadinessScore, ReadinessScore } from '@/lib/readinessService';
import { getJournalStats } from '@/lib/trainingJournalService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BatteryReadyPopup } from '@/components/BatteryReadyPopup';
import { PerformanceRadar } from '@/components/PerformanceRadar';
import { HealthspanChart } from '@/components/HealthspanChart';
import { HydrationCard2 } from '@/components/cards/HydrationCard2';
import { WeightLottieCard } from '@/components/cards/WeightLottieCard';
import { WeightFullCard } from '@/components/cards/WeightFullCard';
import { SleepLottieCard } from '@/components/cards/SleepLottieCard';
import { ChargeLottieCard } from '@/components/cards/ChargeLottieCard';
import { AnimatedCompositionCircle } from '@/components/AnimatedCompositionCircle';
import { StreakCalendar } from '@/components/StreakCalendar';
import { AvatarViewerModal } from '@/components/AvatarViewerModal';
import HealthConnect from '@/lib/healthConnect.ios';
import { FeatureDiscoveryModal } from '@/components/FeatureDiscoveryModal';
import { UpdateChangelogModal } from '@/components/UpdateChangelogModal';
import { PAGE_TUTORIALS, hasVisitedPage, markPageAsVisited } from '@/lib/featureDiscoveryService';
import { RatingPopup } from '@/components/RatingPopup';
import ratingService from '@/lib/ratingService';
import { ShareFloatingButton } from '@/components/stats/ShareFloatingButton';

// Mode Essentiel
import { useViewMode } from '@/hooks/useViewMode';
import { ViewModeSwitch } from '@/components/home/ViewModeSwitch';
import { ViewModeHint } from '@/components/home/ViewModeHint';
import { HomeEssentielContent } from '@/components/home/HomeEssentielContent';
import CompactObjectiveSwitch from '@/components/home/CompactObjectiveSwitch';
import { EssentielWeightCard } from '@/components/home/essentiel/EssentielWeightCard';
import { EssentielActivityCard } from '@/components/home/essentiel/EssentielActivityCard';
import { EssentielWeekSummary } from '@/components/home/essentiel/EssentielWeekSummary';
import { HomeTabView } from '@/components/home/HomeTabView';

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
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HYDRATION_KEY = '@yoroi_hydration_today';
const HYDRATION_GOAL_KEY = '@yoroi_hydration_goal';
const DEFAULT_HYDRATION_GOAL = 2500;

// ============================================
// ÉCRAN ACCUEIL - VERSION COMPLÈTE YOROI
// ============================================

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const params = useLocalSearchParams();

  // Mode d'affichage (Complet / Essentiel)
  const { mode, toggleMode, isLoading: isLoadingMode } = useViewMode();

  // État "Voir plus" pour mode Complet
  const [showMoreSections, setShowMoreSections] = useState(false);

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

  // État readiness pour l'énergie (calculé depuis sommeil, hydratation, charge, streak)
  const [readinessScore, setReadinessScore] = useState<number>(0);
  const [batteryFillPercent, setBatteryFillPercent] = useState<number>(0);

  // Mode Screenshot pour les données de démo
  const [isScreenshotMode, setIsScreenshotMode] = useState<boolean>(false);
  const batteryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Trigger pour rafraîchir l'avatar après changement
  const [avatarRefreshTrigger, setAvatarRefreshTrigger] = useState(0);

  // Tutoriel de découverte
  const [showTutorial, setShowTutorial] = useState(false);
  const [showWhatIsNew, setShowWhatIsNew] = useState(false);

  // Protection anti-spam navigation
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Pop-up de notation
  const [showRatingPopup, setShowRatingPopup] = useState(false);

  // Vérifier si c'est la première visite ou une mise à jour
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const checkFirstVisit = async () => {
      try {
        // 1. Gérer le message de mise à jour (What's New)
        const lastVersionSeen = await AsyncStorage.getItem('@yoroi_last_version_seen');
        const currentVersion = '2.0.0'; // À mettre à jour à chaque build Store

        if (lastVersionSeen !== currentVersion) {
          setShowWhatIsNew(true);
          await AsyncStorage.setItem('@yoroi_last_version_seen', currentVersion);
        }

        // 2. Gérer le tutoriel home
        const visited = await hasVisitedPage('home');
        if (!visited && !showWhatIsNew) {
          timer = setTimeout(() => setShowTutorial(true), 1000);
        }
      } catch (error) {
        logger.error('Erreur vérification première visite:', error);
        // Ne pas bloquer l'app si le storage échoue
      }
    };
    checkFirstVisit();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Afficher la popup de notation après navigation depuis l'étape 4
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (params.showRating === 'true') {
      timer = setTimeout(() => {
        setShowRatingPopup(true);
      }, 500);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [params.showRating]);

  const handleCloseTutorial = useCallback(async () => {
    await markPageAsVisited('home');
    setShowTutorial(false);
  }, []);

  // Fermer sans marquer comme vu (bouton "Plus tard")
  const handleLaterTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  // Rafraîchir l'avatar quand la page devient active
  useFocusEffect(
    useCallback(() => {
      setAvatarRefreshTrigger((prev) => prev + 1);
    }, [])
  );

  // Animation de remplissage de la batterie au focus
  useFocusEffect(
    useCallback(() => {
      // Clear any existing interval
      if (batteryIntervalRef.current) {
        clearInterval(batteryIntervalRef.current);
      }

      // Reset à 0
      setBatteryFillPercent(0);

      // Variable locale pour suivre la progression
      let currentValue = 0;
      const targetValue = readinessScore;

      // Démarrer l'animation après un délai
      const startTimeout = setTimeout(() => {
        batteryIntervalRef.current = setInterval(() => {
          currentValue += 3;
          if (currentValue >= targetValue) {
            currentValue = targetValue;
            setBatteryFillPercent(targetValue);
            if (batteryIntervalRef.current) {
              clearInterval(batteryIntervalRef.current);
              batteryIntervalRef.current = null;
            }
          } else {
            setBatteryFillPercent(currentValue);
          }
        }, 40);
      }, 500);

      return () => {
        clearTimeout(startTimeout);
        if (batteryIntervalRef.current) {
          clearInterval(batteryIntervalRef.current);
          batteryIntervalRef.current = null;
        }
      };
    }, [readinessScore])
  );

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

  // Animations citation cerveau + bulle
  const quoteFadeAnim = useRef(new Animated.Value(0)).current;
  const quoteScaleAnim = useRef(new Animated.Value(0.95)).current;
  const quotePulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animation apparition de la citation
    if (dailyQuote) {
      Animated.parallel([
        Animated.timing(quoteFadeAnim, {
          toValue: 1,
          duration: 600,
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

  useEffect(() => {
    // Animation pulse cerveau (infinie)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(quotePulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(quotePulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

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

  // Activité (pas et calories)
  const [steps, setSteps] = useState(0);
  const [stepsGoal, setStepsGoal] = useState(10000);
  const [calories, setCalories] = useState(0);

  // Hydratation functions
  // ✅ FIX: Charger depuis Apple Health EN PRIORITÉ, puis AsyncStorage en fallback
  const loadHydration = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // 1. Charger l'objectif depuis AsyncStorage
      const goalStored = await AsyncStorage.getItem(HYDRATION_GOAL_KEY);
      const goal = goalStored ? parseFloat(goalStored) : DEFAULT_HYDRATION_GOAL;
      setHydrationGoal(goal);

      // 2. ✅ PRIORITÉ: Essayer Apple Health d'abord
      let hydrationValue = 0;
      let sourceUsed = 'none';

      try {
        const healthKitData = await HealthConnect.getTodayHydration();
        if (healthKitData && healthKitData.amount > 0) {
          hydrationValue = healthKitData.amount; // Déjà en ml
          sourceUsed = 'HealthKit';
          logger.info(`[Hydratation] Apple Health: ${hydrationValue}ml`);
        }
      } catch (healthKitError) {
        logger.info('[Hydratation] Apple Health non disponible, fallback AsyncStorage');
      }

      // 3. Fallback: AsyncStorage si HealthKit n'a pas de données
      if (hydrationValue === 0) {
        const stored = await AsyncStorage.getItem(`${HYDRATION_KEY}_${today}`);
        if (stored) {
          hydrationValue = parseInt(stored, 10);
          sourceUsed = 'AsyncStorage';
          logger.info(`[Hydratation] AsyncStorage: ${hydrationValue}ml`);
        }
      }

      // 4. Mettre à jour l'UI
      if (hydrationValue > 0) {
        setHydration(hydrationValue);
        animateWater(hydrationValue, goal);
      }

      logger.info(`[Hydratation] Source utilisée: ${sourceUsed}, Valeur: ${hydrationValue}ml`);
    } catch (error) {
      logger.error('Erreur hydratation:', error);
    }
  }, []);

  // ✅ FIX: Sauvegarder dans AsyncStorage ET Apple Health
  const saveHydration = useCallback(async (value: number, amountAdded?: number) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // 1. Toujours sauvegarder dans AsyncStorage (backup local)
      await AsyncStorage.setItem(`${HYDRATION_KEY}_${today}`, value.toString());

      // 2. ✅ NOUVEAU: Écrire dans Apple Health si on ajoute de l'eau
      if (amountAdded && amountAdded > 0) {
        try {
          await HealthConnect.writeHydration(amountAdded);
          logger.info(`[Hydratation] +${amountAdded}ml écrit dans Apple Health`);
        } catch (healthKitError) {
          logger.info('[Hydratation] Écriture Apple Health échouée (permissions?)');
        }
      }
    } catch (error) {
      logger.error('Erreur sauvegarde hydratation:', error);
    }
  }, []);

  const animateWater = useCallback((value: number, goal: number = DEFAULT_HYDRATION_GOAL) => {
    Animated.spring(waterAnim, {
      toValue: Math.min(value / goal, 1),
      tension: 30,
      friction: 8,
      useNativeDriver: false, // REQUIS: utilisé pour interpoler height/width d'eau (layout properties)
    }).start();
  }, [waterAnim]);

  // ✅ FIX: Écrire aussi dans Apple Health
  const addWater = useCallback((amount: number) => {
    impactAsync(ImpactFeedbackStyle.Light);
    const newValue = Math.max(0, hydration + amount);
    setHydration(newValue);
    // Passer le montant ajouté pour l'écrire dans Apple Health
    saveHydration(newValue, amount > 0 ? amount : undefined);
    animateWater(newValue, hydrationGoal);
  }, [hydration, hydrationGoal, saveHydration, animateWater]);

  // Protection navigation anti-spam
  const handleNavigate = useCallback((route: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push(route as any);
    setTimeout(() => setIsNavigating(false), 1000);
  }, [isNavigating]);

  // Handlers de navigation mémorisés pour éviter les callbacks inline
  const handleNavigateProfile = useCallback(() => {
    handleNavigate('/profile');
  }, [handleNavigate]);

  const handleNavigateAvatarSelection = useCallback(() => {
    handleNavigate('/avatar-selection');
  }, [handleNavigate]);

  const handleNavigateActivityDetail = useCallback(() => {
    handleNavigate('/activity-detail');
  }, [handleNavigate]);

  const handleNavigateGamification = useCallback(() => {
    handleNavigate('/gamification');
  }, [handleNavigate]);

  const handleNavigateWeightStats = useCallback(() => {
    handleNavigate('/(tabs)/stats?tab=poids');
  }, [handleNavigate]);

  const handleNavigateSleep = useCallback(() => {
    handleNavigate('/sleep');
  }, [handleNavigate]);

  const handleNavigateCharge = useCallback(() => {
    handleNavigate('/charge');
  }, [handleNavigate]);

  const handleNavigateTrainingJournal = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/training-journal');
  }, [handleNavigate]);

  const handleNavigateInfirmary = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/infirmary');
  }, [handleNavigate]);

  const handleNavigateChallenges = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/challenges');
  }, [handleNavigate]);

  const handleNavigateRadarPerformance = useCallback(() => {
    handleNavigate('/radar-performance');
  }, [handleNavigate]);

  const handleNavigateHealthStats = useCallback(() => {
    // CORRECTION: L'onglet s'appelle 'sante' dans StatsTabViewNew, pas 'vitalite'
    handleNavigate('/stats?tab=sante');
  }, [handleNavigate]);

  const handleNavigateAddWeight = useCallback(() => {
    handleNavigate('/(tabs)/add');
  }, [handleNavigate]);

  const handleNavigateTimer = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/timer');
  }, [handleNavigate]);

  const handleNavigatePlanning = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/(tabs)/planning');
  }, [handleNavigate]);

  const handleNavigateProgramme = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/(tabs)/planning?tab=programme');
  }, [handleNavigate]);

  const handleNavigateEnergy = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/energy');
  }, [handleNavigate]);

  const handleNavigateSavoir = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/savoir');
  }, [handleNavigate]);

  const handleNavigateCalculators = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/calculators');
  }, [handleNavigate]);

  const handleToggleCompetitorMode = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setIsCompetitorMode(!isCompetitorMode);
  }, [isCompetitorMode]);

  const handleNavigateFasting = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/fasting');
  }, [handleNavigate]);

  const handleNavigatePhotos = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/photos');
  }, [handleNavigate]);

  const handleNavigateCutMode = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/cut-mode');
  }, [handleNavigate]);

  const handleNavigatePalmares = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/palmares');
  }, [handleNavigate]);

  const handleNavigateHydration = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/hydration');
  }, [handleNavigate]);

  const handleNavigateBodyComposition = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    handleNavigate('/body-composition');
  }, [handleNavigate]);

  // Handlers pour les modaux
  const handleCloseRanksModal = useCallback(() => {
    setRanksModalVisible(false);
  }, []);

  const handleCloseLogoViewer = useCallback(() => {
    setLogoViewerVisible(false);
  }, []);

  const handleCloseAvatarViewer = useCallback(() => {
    setAvatarViewerVisible(false);
  }, []);

  const handleCloseWhatIsNew = useCallback(() => {
    setShowWhatIsNew(false);
  }, []);

  const handleCloseRatingPopup = useCallback(async () => {
    setShowRatingPopup(false);
    await ratingService.onPopupDismissed();
  }, []);

  const handleRated = useCallback(async () => {
    setShowRatingPopup(false);
    await ratingService.onRated();
  }, []);

  // Chargement des données
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileData, weight, history, streakDays, quote, allTrainings, mode, sleep, load, challenges, report, event, sections] = await Promise.all([
        getProfile(),
        getLatestWeight(),
        getWeights(30),
        calculateStreak(),
        getSessionQuote(language as any),
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

      // Vérifier le mode screenshot
      const screenshotMode = await AsyncStorage.getItem('@yoroi_screenshot_mode');
      setIsScreenshotMode(screenshotMode === 'true');

      const goal = await getSleepGoal();
      setSleepGoal(goal);

      // Charger les pas et calories depuis Apple Health
      try {
        const stepsData = await HealthConnect.getTodaySteps();
        if (stepsData?.count) {
          setSteps(stepsData.count);
        }
        const caloriesData = await HealthConnect.getTodayCalories();
        if (caloriesData?.active) {
          setCalories(Math.round(caloriesData.active));
        }
      } catch (error) {
        logger.info('Données activité non disponibles depuis Apple Health');
      }

      setTotalPoints(history.length * 10 + allTrainings.length * 25 + (streakDays >= 7 ? 50 : 0));
      loadHydration();

      // Calculer le score de readiness basé sur : sommeil, charge, hydratation, streak
      try {
        const readiness = await calculateReadinessScore(streakDays);
        setReadinessScore(Math.round(readiness.score));
      } catch {
        setReadinessScore(0);
      }
    } catch (error) {
      logger.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadHydration]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Helper pour vérifier la visibilité d'une section
  const isSectionVisible = useCallback((sectionId: string): boolean => {
    return checkSectionVisible(homeSections, sectionId);
  }, [homeSections]);

  // Rotation automatique des citations toutes les 5 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      const newQuote = await getSessionQuote(language as any);
      setDailyQuote(newQuote);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [language]);

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
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bonjour';
    if (hour >= 12 && hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }, []);

  // Calcul Batterie Athlète
  const calculateBatteryPercent = useCallback(() => {
    let score = 15; // Base minimum pour un nouvel utilisateur
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
  }, [streak, hydration, hydrationGoal, sleepStats, trainings]);

  const batteryPercent = useMemo(() => calculateBatteryPercent(), [streak, hydration, hydrationGoal, sleepStats, trainings]);
  const last7Weights = useMemo(() => weightHistory.slice(0, 7).reverse(), [weightHistory]);

  // Partager le rapport
  const shareReport = useCallback(async () => {
    if (!weeklyReport) return;
    try {
      const text = formatReportForSharing(weeklyReport);
      await Share.share({ message: text });
    } catch (error) {
      logger.error('Erreur partage:', error);
    }
  }, [weeklyReport]);

  // Batterie status - avec icônes au lieu d'emojis
  const getBatteryStatus = useCallback(() => {
    if (batteryPercent >= 80) return { color: '#10B981', label: 'Prêt à tout donner', iconType: 'flame' as const };
    if (batteryPercent >= 60) return { color: '#F59E0B', label: 'Bonne forme', iconType: 'zap' as const };
    if (batteryPercent >= 40) return { color: '#F97316', label: 'Fatigue modérée', iconType: 'activity' as const };
    return { color: '#EF4444', label: 'Repos nécessaire', iconType: 'moon' as const };
  }, [batteryPercent]);

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
      useNativeDriver: false, // REQUIS: utilisé pour interpoler height de batterie (layout property)
    }).start();
  }, [batteryPercent]);

  // Animation progress poids
  React.useEffect(() => {
    Animated.timing(weightProgressAnim, {
      toValue: weightProgress,
      duration: 600,
      useNativeDriver: false, // REQUIS: utilisé pour interpoler width de barre (layout property)
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
        useNativeDriver: false, // REQUIS: utilisé pour interpoler height/width (layout property)
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
        useNativeDriver: false, // REQUIS: utilisé pour animer vague (translateX/Y via interpolation)
      })
    ).start();
  }, []);

  // Rendu icône batterie status
  const renderBatteryIcon = useCallback(() => {
    const iconSize = 12;
    switch (batteryStatus.iconType) {
      case 'flame': return <Flame size={iconSize} color={batteryStatus.color} />;
      case 'zap': return <Zap size={iconSize} color={batteryStatus.color} />;
      case 'activity': return <Activity size={iconSize} color={batteryStatus.color} />;
      case 'moon': return <Moon size={iconSize} color={batteryStatus.color} />;
    }
  }, [batteryStatus]);

  // Rendu icône défi
  const renderChallengeIcon = useCallback((iconName: string, color: string = colors.accent) => {
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
  }, [colors.accent, colors.success]);

  const batteryStatus = useMemo(() => getBatteryStatus(), [batteryPercent]);

  // === SYSTÈME DE PERSONNALISATION DE L'ORDRE - RENDU DYNAMIQUE ===
  const sortedSections = useMemo(() => {
    return [...homeSections].sort((a, b) => a.order - b.order);
  }, [homeSections]);

  // Fonction pour rendre chaque section dans l'ordre personnalisé
  // PERF: useCallback pour éviter les re-créations à chaque render
  const renderDynamicSection = useCallback((sectionId: string) => {
    if (!isSectionVisible(sectionId)) return null;

    switch (sectionId) {
      case 'header':
        return (
          <View key={sectionId}>
            <View style={styles.header}>
              {/* Photo de profil (Gauche) */}
              <TouchableOpacity
                style={[styles.profilePhotoContainer, { borderColor: colors.border }]}
                onPress={handleNavigateProfile}
                activeOpacity={0.8}
              >
                {profile?.profile_photo ? (
                  <Image
                    source={{ uri: profile.profile_photo }}
                    style={styles.profilePhotoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={24} color={colors.textSecondary} />
                )}
              </TouchableOpacity>

              {/* Texte (Centre) */}
              <View style={styles.headerText}>
                <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()}</Text>
                <View style={styles.userNameRow}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]}>{profile?.name || 'Champion'}</Text>
                  <ViewModeSwitch mode={mode} onToggle={toggleMode} />
                </View>
              </View>

              {/* Avatar (Droite) - Clique pour aller au Dojo */}
              <TouchableOpacity
                style={styles.avatarContainerRight}
                onPress={handleNavigateGamification}
                activeOpacity={0.8}
              >
                <AvatarDisplay size="small" refreshTrigger={avatarRefreshTrigger} />
              </TouchableOpacity>
            </View>

            {/* Citation motivante - BULLE DE PENSÉE ANIMÉE */}
            {dailyQuote && (
              <Animated.View
                style={[
                  { paddingHorizontal: 16, marginTop: 20 },
                  { opacity: quoteFadeAnim, transform: [{ scale: quoteScaleAnim }] }
                ]}
              >
                <View style={styles.speechBubbleContainer}>
                  {/* Cerveau animé */}
                  <Animated.View style={[styles.brainContainer, { transform: [{ scale: quotePulseAnim }] }]}>
                    <View style={[styles.brainCircle, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}40` }]}>
                      <Brain size={28} color={colors.accentText} strokeWidth={2.5} />
                    </View>
                    {/* Mini éclairs d'idée */}
                    <View style={styles.ideaSparks}>
                      <Zap size={12} color="#FFD700" fill="#FFD700" style={{ position: 'absolute', top: -8, right: -4 }} />
                      <Zap size={10} color="#FFD700" fill="#FFD700" style={{ position: 'absolute', top: -4, right: 8 }} />
                    </View>
                  </Animated.View>

                  {/* Bulle de pensée (fond caméléon) */}
                  <View style={[styles.speechBubble, {
                    backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
                    shadowColor: isDark ? colors.accent : '#000',
                    borderColor: isDark ? colors.border : `${colors.accent}30`,
                  }]}>
                    {/* Petite queue de bulle */}
                    <View style={[styles.bubbleTail, {
                      backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
                      borderColor: isDark ? colors.border : `${colors.accent}30`,
                    }]} />

                    <Text style={[styles.quoteTextBubble, { color: isDark ? colors.textPrimary : '#1A1A1A' }]}>
                      "{dailyQuote.text}"
                    </Text>

                    {/* Badge "Citation du jour" */}
                    <View style={[styles.quoteBadge, {
                      backgroundColor: `${colors.accent}15`,
                      borderColor: `${colors.accent}40`,
                    }]}>
                      <Text style={[styles.quoteBadgeText, { color: isDark ? colors.accent : colors.textPrimary }]}>{t('home.quoteOfTheDay')}</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Hint pour informer du switch de mode */}
            <ViewModeHint />
          </View>
        );

      case 'stats_compact':
        return (
          <View style={styles.statsRowCompact} key={sectionId}>
            <TouchableOpacity style={[styles.statCardCompactHorizontal, { backgroundColor: colors.backgroundCard }]} onPress={handleNavigateActivityDetail}>
              <MaterialCommunityIcons name="walk" size={14} color="#3B82F6" />
              <View style={styles.statTextColumn}>
                <AnimatedCounter value={steps} style={[styles.statValueCompactHorizontal, { color: '#3B82F6' }]} duration={800} />
                <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>pas</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCardCompactHorizontal, { backgroundColor: colors.backgroundCard }]} onPress={handleNavigateGamification}>
              <Animated.View style={{ transform: [{ scale: streakFlameAnim }] }}>
                <Flame size={14} color="#F97316" />
              </Animated.View>
              <View style={styles.statTextColumn}>
                <AnimatedCounter value={streak} style={[styles.statValueCompactHorizontal, { color: '#F97316' }]} duration={800} />
                <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>jours</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCardCompactHorizontal, { backgroundColor: colors.backgroundCard }]} onPress={handleNavigateGamification}>
              <Zap size={14} color={isDark ? colors.accent : '#000000'} />
              <View style={styles.statTextColumn}>
                <AnimatedCounter value={level.level} style={[styles.statValueCompactHorizontal, { color: isDark ? colors.accent : '#000000' }]} duration={800} />
                <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>niveau</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statCardCompactHorizontal, { backgroundColor: colors.backgroundCard }]} onPress={handleNavigateGamification}>
              <Trophy size={14} color={rank?.color} />
              <View style={styles.statTextColumn}>
                <AnimatedRank rank={rank?.name?.split(' ')[0] ?? ''} color={rank?.color} style={styles.statValueCompactHorizontal} delay={300} />
                <Text style={[styles.statLabelCompact, { color: colors.textMuted }]}>rang</Text>
              </View>
            </TouchableOpacity>
          </View>
        );

      case 'weight_hydration':
        return (
          <View key={sectionId} style={{ marginBottom: 20 }}>
            {/* Poids - Full Width Premium */}
            <WeightFullCard
              currentWeight={currentWeight || 0}
              targetWeight={targetWeight ?? undefined}
              startWeight={weightHistory[0]?.weight ?? undefined}
              history={last7Weights.map(w => w.weight)}
              onPress={handleNavigateWeightStats}
            />
          </View>
        );

      // Anciennes sections remplacees par les nouvelles lignes tools_row_*
      // Ces cases sont gardes pour la compatibilite avec les anciennes configurations

      case 'sleep_charge':
        return (
          <View style={styles.gridLottieContainer} key={sectionId}>
            {/* 3 cartes compactes : Hydratation | Sommeil | Charge */}
            <View style={styles.threeCardsRow}>
              <View style={styles.compactCard}>
                <HydrationCard2
                  currentMl={hydration}
                  goalMl={hydrationGoal}
                  onAddMl={(amountMl) => addWater(amountMl)}
                />
              </View>
              <TouchableOpacity onPress={handleNavigateSleep} activeOpacity={0.9} style={styles.compactCard}>
                <SleepLottieCard
                  hours={sleepStats?.lastNightDuration ? sleepStats.lastNightDuration / 60 : 0}
                  quality={sleepStats?.lastNightQuality ? (sleepStats.lastNightQuality / 5) * 100 : 0}
                  debt={sleepStats?.sleepDebtHours || 0}
                  goal={sleepGoal / 60}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNavigateCharge} activeOpacity={0.9} style={styles.compactCard}>
                <ChargeLottieCard
                  level={loadStats?.riskLevel || 'optimal'}
                  totalLoad={loadStats?.totalLoad || 0}
                  maxLoad={2000}
                  sessions={(() => {
                    // Compter les jours uniques avec au moins une séance (pas le total de séances)
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    const uniqueDays = new Set(
                      trainings
                        .filter(t => new Date(t.date) >= weekAgo)
                        .map(t => t.date.split('T')[0]) // Extraire juste la date (YYYY-MM-DD)
                    );
                    return uniqueDays.size;
                  })()}
                />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'quick_tools':
        return (
          <View style={styles.quickToolsContainer} key={sectionId}>
            <TouchableOpacity
              style={[styles.quickToolButton, { backgroundColor: colors.backgroundCard }]}
              onPress={handleNavigateTrainingJournal}
              activeOpacity={0.8}
            >
              <BookOpen size={20} color="#F97316" strokeWidth={2} />
              <Text style={[styles.quickToolText, { color: colors.textPrimary }]}>Carnet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickToolButton, { backgroundColor: colors.backgroundCard }]}
              onPress={handleNavigateInfirmary}
              activeOpacity={0.8}
            >
              <View style={styles.redCrossIconSmall}>
                <View style={[styles.crossVerticalIconSmall, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.crossHorizontalIconSmall, { backgroundColor: '#EF4444' }]} />
              </View>
              <Text style={[styles.quickToolText, { color: colors.textPrimary }]}>Blessures</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickToolButton, { backgroundColor: colors.backgroundCard }]}
              onPress={handleNavigateChallenges}
              activeOpacity={0.8}
            >
              <Award size={20} color="#8B5CF6" strokeWidth={2} />
              <Text style={[styles.quickToolText, { color: colors.textPrimary }]}>Objectifs</Text>
            </TouchableOpacity>
          </View>
        );

      case 'challenges':
        return (
          <AnimatedCard index={1} key={sectionId}>
            <TouchableOpacity style={[styles.challengesCard, { backgroundColor: colors.backgroundCard }]} onPress={handleNavigateChallenges} activeOpacity={0.8}>
              <View style={styles.challengesHeader}>
                <Target size={16} color={colors.accentText} />
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
                      <Text style={[styles.rewardText, { color: challenge.progress.completed ? colors.success : (isDark ? colors.accent : colors.textPrimary) }]}>
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
            <TouchableOpacity onPress={handleNavigateRadarPerformance} activeOpacity={0.8}>
              <PerformanceRadar />
            </TouchableOpacity>
          </AnimatedCard>
        );

      case 'healthspan':
        return (
          <AnimatedCard index={3} key={sectionId}>
            <TouchableOpacity onPress={handleNavigateHealthStats} activeOpacity={0.8}>
              <HealthspanChart screenshotMode={isScreenshotMode} />
            </TouchableOpacity>
          </AnimatedCard>
        );

      case 'weekly_report':
        if (!weeklyReport) return null;
        return (
          <AnimatedCard index={4} key={sectionId}>
            <TouchableOpacity style={[styles.reportCard, { backgroundColor: colors.backgroundCard }]} onPress={shareReport}>
              <View style={styles.reportHeader}>
                <FileText size={16} color={colors.accentText} />
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
                  <Text style={[styles.gradeText, { color: colors.textOnAccent }]}>{weeklyReport?.verdict?.grade ?? '-'}</Text>
                </View>
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportTitle, { color: colors.textPrimary }]}>{weeklyReport?.verdict?.title ?? 'Rapport'}</Text>
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

      // Grand graphique de poids (style Light)
      case 'weight_graph_large':
        return (
          <View key={sectionId} style={{ marginTop: 16 }}>
            <EssentielWeightCard
              currentWeight={currentWeight || undefined}
              objective={targetWeight || undefined}
              weekData={weightHistory.slice(0, 30).reverse().map(w => w.weight)} // 30 derniers jours au lieu de 7
              weekLabels={['L', 'M', 'M', 'J', 'V', 'S', 'D']} // Les labels seront dupliqués
              trend={trend}
              onAddWeight={handleNavigateAddWeight}
              onViewStats={handleNavigateWeightStats}
            />
          </View>
        );

      // Résumé activité (pas)
      case 'activity_summary':
        return (
          <View key={sectionId} style={{ marginTop: 16 }}>
            <EssentielActivityCard
              steps={steps}
              stepsGoal={stepsGoal}
            />
          </View>
        );

      // Anciennes sections supprimees - retournent null pour compatibilite
      case 'streak_calendar':
      case 'fighter_mode':
      case 'planning_row':
        return null;

      case 'training_journal':
      case 'actions_row':
      case 'battery_tools':
        return null;

      // Ligne 1: Carnet, Timer, Calendrier, Emploi du temps
      case 'tools_row_1':
        return (
          <View style={styles.batteryToolsRowSingle} key={sectionId}>
            <TouchableOpacity
              style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
              onPress={handleNavigateTrainingJournal}
              activeOpacity={0.85}
            >
              <BookOpen size={24} color="#F97316" />
              <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Carnet</Text>
              <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Entrainement</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
              onPress={handleNavigateTimer}
              activeOpacity={0.85}
            >
              <Timer size={24} color={colors.accentText} />
              <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Timer</Text>
              <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Round/Repos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
              onPress={handleNavigatePlanning}
              activeOpacity={0.85}
            >
              <Calendar size={24} color="#3B82F6" />
              <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Calendrier</Text>
              <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Planning</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
              onPress={handleNavigateProgramme}
              activeOpacity={0.85}
            >
              <List size={24} color="#8B5CF6" />
              <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Planning</Text>
              <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Sportif</Text>
            </TouchableOpacity>
          </View>
        );

      // Carte Blessures (full width avec croix rouge)
      case 'blessures_banner':
        return (
          <TouchableOpacity
            key={sectionId}
            style={[styles.blessuresBanner, { backgroundColor: colors.backgroundCard }]}
            onPress={handleNavigateInfirmary}
            activeOpacity={0.85}
          >
            <View style={styles.blessuresCrossContainer}>
              <View style={styles.redCrossIconLarge}>
                <View style={[styles.crossVerticalIconLarge, { backgroundColor: '#EF4444' }]} />
                <View style={[styles.crossHorizontalIconLarge, { backgroundColor: '#EF4444' }]} />
              </View>
            </View>
            <View style={styles.blessuresTextContainer}>
              <Text style={[styles.blessuresTitle, { color: colors.textPrimary }]}>Blessures</Text>
              <Text style={[styles.blessuresSubtitle, { color: colors.textMuted }]}>Suivez vos blessures</Text>
            </View>
            <ChevronRight size={24} color={colors.textMuted} />
          </TouchableOpacity>
        );

      // Ligne 2: Energie, Savoir, Calculateurs
      case 'tools_row_2':
        return (
          <View style={styles.batteryToolsRowSingle} key={sectionId}>
            <TouchableOpacity
              style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
              onPress={handleNavigateEnergy}
              activeOpacity={0.85}
            >
              {/* Pile/Batterie horizontale allongée */}
              <View style={styles.batteryHorizontal}>
                {/* Corps de la pile */}
                <View style={[styles.batteryBodyH, { borderColor: colors.border }]}>
                  {/* Remplissage */}
                  <View style={[
                    styles.batteryFillH,
                    {
                      width: `${batteryPercent}%`,
                      backgroundColor: batteryPercent >= 60 ? '#10B981' : batteryPercent >= 30 ? '#F59E0B' : '#EF4444',
                    }
                  ]} />
                  {/* Pourcentage au centre */}
                  <Text style={[styles.batteryTextH, { color: batteryPercent >= 50 ? '#FFF' : colors.textPrimary }]}>
                    {Math.round(batteryPercent)}%
                  </Text>
                </View>
                {/* Tête de la pile (à droite) */}
                <View style={[styles.batteryHeadH, {
                  backgroundColor: batteryPercent >= 60 ? '#10B981' : batteryPercent >= 30 ? '#F59E0B' : '#EF4444'
                }]} />
              </View>
              <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Energie</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
              onPress={handleNavigateSavoir}
              activeOpacity={0.85}
            >
              <FlaskConical size={24} color="#8B5CF6" />
              <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Savoir</Text>
              <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Culture G</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
              onPress={handleNavigateCalculators}
              activeOpacity={0.85}
            >
              <Calculator size={24} color="#F59E0B" />
              <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Calculs</Text>
              <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>IMC, BMR...</Text>
            </TouchableOpacity>
          </View>
        );

      // Ligne 3: Mode Compet (toggle avec J-XX), Jeune, Photo, Partager
      case 'tools_row_3':
        return (
          <View key={sectionId}>
            <View style={styles.batteryToolsRowSingle}>
              {/* Toggle Mode Compétiteur - Affiche J-XX si activé */}
              <TouchableOpacity
                style={[
                  styles.toolCardSmall,
                  {
                    backgroundColor: isCompetitorMode ? colors.accent + '20' : colors.backgroundCard,
                    borderWidth: isCompetitorMode ? 2 : 0,
                    borderColor: colors.accent,
                  }
                ]}
                onPress={handleToggleCompetitorMode}
                activeOpacity={0.85}
              >
                {isCompetitorMode && nextEvent ? (
                  // Afficher J-XX quand activé et qu'il y a un événement
                  <View style={[styles.countdownBadge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.countdownText, { color: colors.textOnAccent }]}>J-{nextEvent.daysLeft}</Text>
                  </View>
                ) : (
                  // Afficher l'icône Trophy quand désactivé
                  <Trophy size={24} color={isCompetitorMode ? colors.accent : colors.textMuted} />
                )}
                <Text style={[styles.toolCardTitleSmall, { color: isCompetitorMode ? (isDark ? colors.accent : colors.textPrimary) : colors.textPrimary }]}>
                  Objectif
                </Text>
                {/* Mini Switch */}
                <View style={[styles.miniSwitch, { backgroundColor: isCompetitorMode ? colors.accent : colors.border }]}>
                  <Animated.View
                    style={[
                      styles.miniSwitchThumb,
                      {
                        transform: [{
                          translateX: toggleAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 12],
                          })
                        }]
                      }
                    ]}
                  />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
                onPress={handleNavigateFasting}
                activeOpacity={0.85}
              >
                <Clock size={24} color="#F97316" />
                <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Jeûne</Text>
                <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Intermittent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
                onPress={handleNavigatePhotos}
                activeOpacity={0.85}
              >
                <Camera size={24} color="#10B981" />
                <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Photo</Text>
                <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Avant/Apres</Text>
              </TouchableOpacity>
            </View>

            {/* Section Compétiteur - 4 petits carrés quand toggle ON */}
            {isCompetitorMode && (
              <View style={[styles.batteryToolsRowSingle, { marginTop: 8 }]}>
                <TouchableOpacity
                  style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
                  onPress={handleNavigateCutMode}
                  activeOpacity={0.85}
                >
                  <TrendingDown size={24} color="#EF4444" />
                  <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Mode Cut</Text>
                  <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Perte poids</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
                  onPress={handleNavigatePalmares}
                  activeOpacity={0.85}
                >
                  <Medal size={24} color="#F59E0B" />
                  <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Palmares</Text>
                  <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Resultats</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
                  onPress={handleNavigateHydration}
                  activeOpacity={0.85}
                >
                  <Droplets size={24} color="#06B6D4" />
                  <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Hydratation</Text>
                  <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Suivi eau</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolCardSmall, { backgroundColor: colors.backgroundCard }]}
                  onPress={handleNavigateBodyComposition}
                  activeOpacity={0.85}
                >
                  <Scale size={24} color="#8B5CF6" />
                  <Text style={[styles.toolCardTitleSmall, { color: colors.textPrimary }]}>Pesee</Text>
                  <Text style={[styles.toolCardSubtitleSmall, { color: colors.textMuted }]}>Composition</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  }, [
    colors,
    profile,
    dailyQuote,
    mode,
    hydration,
    hydrationGoal,
    sleepStats,
    bodyComposition,
    batteryFillPercent,
    isSectionVisible,
    handleNavigateProfile,
    handleNavigateAvatarSelection,
    handleNavigateActivityDetail,
    handleNavigateGamification,
    handleNavigateWeightStats,
    handleNavigateSleep,
    handleNavigateCharge,
    handleNavigateTrainingJournal,
    handleNavigateInfirmary,
    handleNavigateChallenges,
    handleNavigateRadarPerformance,
    handleNavigateHealthStats,
    handleNavigateAddWeight,
    handleNavigateTimer,
    handleNavigatePlanning,
    handleNavigateProgramme,
    handleNavigateEnergy,
    handleNavigateSavoir,
    handleNavigateCalculators,
    handleToggleCompetitorMode,
    handleNavigateFasting,
    handleNavigatePhotos,
    handleNavigateCutMode,
    handleNavigatePalmares,
    handleNavigateHydration,
    handleNavigateBodyComposition,
    addWater,
    shareReport,
    avatarRefreshTrigger,
    getGreeting,
    toggleMode,
    isDark,
    t,
    quoteFadeAnim,
    quoteScaleAnim,
    quotePulseAnim,
    streakFlameAnim,
    steps,
    streak,
    level,
    rank,
    currentWeight,
    targetWeight,
    startWeight,
    last7Weights,
    trend,
    sleepGoal,
    loadStats,
    trainings,
    dailyChallenges,
    renderChallengeIcon,
    weeklyReport,
    isScreenshotMode,
    isCompetitorMode,
    nextEvent,
    toggleAnim,
    batteryPercent,
  ]);

  // Défis du jour formatés
  const formattedChallenges = useMemo(() => {
    return dailyChallenges.map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      completed: challenge.progress.completed,
    }));
  }, [dailyChallenges]);

  // Workload status
  const workloadStatus = useMemo<'none' | 'light' | 'moderate' | 'intense'>(() => {
    if (!loadStats || loadStats.sessionsCount === 0) return 'none';
    const totalLoad = loadStats.totalLoad;
    if (totalLoad < 1500) return 'light';
    if (totalLoad > 2500) return 'intense';
    return 'moderate';
  }, [loadStats]);

  // Afficher loading pendant le chargement initial
  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <MotivationPopup />

      <HomeTabView
        userName={profile?.name}
        profilePhoto={profile?.profile_photo}
        dailyQuote={dailyQuote?.text}
        steps={steps}
        streak={streak}
        level={level.level}
        rankName={rank?.name}
        rankColor={rank?.color}
        currentWeight={currentWeight ?? undefined}
        targetWeight={targetWeight ?? undefined}
        startWeight={startWeight ?? undefined}
        weightHistory={weightHistory.map(w => w.weight)}
        weightTrend={trend as 'up' | 'down' | 'stable'}
        hydration={hydration}
        hydrationGoal={hydrationGoal}
        sleepHours={sleepStats?.lastNightDuration ? sleepStats.lastNightDuration / 60 : 0}
        sleepDebt={sleepStats?.sleepDebtHours || 0}
        sleepGoal={sleepGoal / 60}
        workloadStatus={workloadStatus === 'none' ? undefined : workloadStatus}
        dailyChallenges={formattedChallenges}
        stepsGoal={stepsGoal}
        calories={calories}
        bodyFat={isScreenshotMode ? 16.2 : bodyComposition?.bodyFat}
        muscleMass={isScreenshotMode ? 43.5 : bodyComposition?.muscleMass}
        waterPercentage={isScreenshotMode ? 58.4 : bodyComposition?.waterPercentage}
        weeklyReport={weeklyReport ? {
          weightChange: weeklyReport.weightChange,
          trainingsCount: weeklyReport.totalTrainings,
          avgSleepHours: weeklyReport.avgSleepHours,
          hydrationRate: 0, // Not available in WeeklyReport
          totalSteps: 0, // Not available in WeeklyReport
        } : undefined}
        onAddWeight={() => handleNavigate('/(tabs)/add')}
        onAddWater={addWater}
        onShareReport={shareReport}
        refreshTrigger={avatarRefreshTrigger}
      />

      <RanksModal visible={ranksModalVisible} onClose={handleCloseRanksModal} currentStreak={streak} />
      <LogoViewer visible={logoViewerVisible} onClose={handleCloseLogoViewer} />
      <BatteryReadyPopup batteryPercent={batteryPercent} />
      <AvatarViewerModal visible={avatarViewerVisible} onClose={handleCloseAvatarViewer} />

      {/* MESSAGE DE MISE À JOUR ET DISCLAIMER PROFESSIONNEL (TON COMPOSANT) */}
      <UpdateChangelogModal
        visible={showWhatIsNew}
        onClose={handleCloseWhatIsNew}
      />

      {/* Tutoriel de découverte */}
      {showTutorial && (
        <FeatureDiscoveryModal
          visible={true}
          tutorial={PAGE_TUTORIALS.home}
          onClose={handleCloseTutorial}
          onSkip={handleLaterTutorial}
        />
      )}

      {/* Pop-up de notation */}
      <RatingPopup
        visible={showRatingPopup}
        onClose={handleCloseRatingPopup}
        onRated={handleRated}
      />

      {/* Bouton flottant de sauvegarde */}
      {/* <TouchableOpacity
        style={[styles.backupFab, { backgroundColor: colors.accent }]}
        onPress={() => handleNavigate('/backup')}
        activeOpacity={0.85}
      >
        <Cloud size={20} color="#FFFFFF" />
      </TouchableOpacity> */}

      {/* Bouton partage flottant */}
      <ShareFloatingButton />
      </View>
    </ErrorBoundary>
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
  profilePhotoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhotoImage: {
    width: 80,
    height: 80,
  },
  avatarContainerRight: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1, marginHorizontal: 12 },
  greeting: { fontSize: 14, fontWeight: '600' },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userName: { fontSize: 22, fontWeight: '900' },
  avatarBtn: {
    width: 75,
    height: 95,
  },
  avatarContainer: {
    height: 95,
    width: 75,
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

  // Ligne de 5 actions : Blessures, Timer, Compétiteur?, Photo, Savoir
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
  statsRowCompact: { flexDirection: 'row', gap: 3, marginBottom: 6, marginTop: 2 },
  statCardCompact: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 8, gap: 3 },
  statCardCompactVertical: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 8, gap: 2, minHeight: 60 },
  statCardCompactHorizontal: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4, paddingHorizontal: 5, borderRadius: 6, gap: 4, minHeight: 38 },
  statTextColumn: { flexDirection: 'column', alignItems: 'flex-start', gap: 0 },
  statTextContainer: { flexDirection: 'column', alignItems: 'flex-start' },
  statValueCompact: { fontSize: 18, fontWeight: '900', marginTop: 0 },
  statValueCompactVertical: { fontSize: 16, fontWeight: '800', marginTop: 0 },
  statValueCompactHorizontal: { fontSize: 13, fontWeight: '800', lineHeight: 14 },
  statLabelCompact: { fontSize: 7, fontWeight: '600', lineHeight: 8, marginTop: -1 },

  // Battery + Tools - UNE SEULE LIGNE DE 4 CARTES
  batteryToolsRowSingle: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },

  // Batterie compacte (quart de largeur)
  batteryCardSmall: {
    flex: 1,
    padding: 8,
    borderRadius: 14,
    minHeight: 95,
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

  // Pile/Batterie horizontale allongée pour carte Energie
  batteryHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  batteryBodyH: {
    width: 50,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  batteryFillH: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 2,
  },
  batteryTextH: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    zIndex: 1,
  },
  batteryHeadH: {
    width: 4,
    height: 10,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    marginLeft: -1,
  },

  // Tool cards small (quart de largeur)
  toolCardSmall: {
    flex: 1,
    padding: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 95,
  },
  toolCardTitleSmall: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  toolCardSubtitleSmall: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },

  // Tools Scroll - Ligne horizontale scrollable
  toolsScrollContainer: {
    marginBottom: 8,
  },
  toolsScrollContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  toolCardScroll: {
    width: 80,
    padding: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 95,
  },

  // Grid 2x2
  gridContainer: { gap: 12, marginBottom: 10, width: '100%' },
  gridRow: { flexDirection: 'row', gap: 12 },
  squareCard: { flex: 1, aspectRatio: 1, borderRadius: 14, overflow: 'hidden' },

  // Grid Lottie - Layout simplifié pour cartes uniformes avec PLUS D'AIR
  gridLottieContainer: { marginBottom: 20, paddingHorizontal: 8 },
  gridLottieRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },

  // Layout 3 cartes compactes
  threeCardsRow: { flexDirection: 'row', gap: 6, marginBottom: 8, paddingHorizontal: 16 },
  compactCard: {
    flex: 1,
    height: 120, // HAUTEUR FIXE
    overflow: 'hidden',
  },

  // Quick Tools (3 boutons) - ULTRA COMPACTS
  quickToolsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  quickToolButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickToolText: {
    fontSize: 11,
    fontWeight: '700',
  },
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

  // Bouton Voir plus
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    gap: 8,
  },
  showMoreButtonText: {
    fontSize: 15,
    fontWeight: '700',
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

  // Jauge d'énergie moderne
  energyGaugeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 6,
    paddingHorizontal: 4,
  },
  energyBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  energyBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Badge J-XX pour le compte à rebours
  countdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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

  // Croix rouge pour Journal des Blessures
  redCrossIcon: {
    width: 28,
    height: 28,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossVerticalIcon: {
    position: 'absolute',
    width: 10,
    height: 28,
    borderRadius: 2,
  },
  crossHorizontalIcon: {
    position: 'absolute',
    width: 28,
    height: 10,
    borderRadius: 2,
  },

  // Croix rouge SMALL pour boutons circulaires
  redCrossIconSmall: {
    width: 22,
    height: 22,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossVerticalIconSmall: {
    position: 'absolute',
    width: 8,
    height: 22,
    borderRadius: 2,
  },
  crossHorizontalIconSmall: {
    position: 'absolute',
    width: 22,
    height: 8,
    borderRadius: 2,
  },

  // Bannière Blessures (full width)
  blessuresBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  blessuresCrossContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#EF444420',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  redCrossIconLarge: {
    width: 30,
    height: 30,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossVerticalIconLarge: {
    position: 'absolute',
    width: 10,
    height: 30,
    borderRadius: 3,
  },
  crossHorizontalIconLarge: {
    position: 'absolute',
    width: 30,
    height: 10,
    borderRadius: 3,
  },
  blessuresTextContainer: {
    flex: 1,
  },
  blessuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  blessuresSubtitle: {
    fontSize: 13,
  },

  // Actions Row 4 - CIRCULAR BUTTONS
  actionBtnCircle: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999, // Perfect circle
    gap: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabelCircle: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionSubLabelCircle: {
    fontSize: 7,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -2,
  },

  // ═══════════════════════════════════════════════
  // CITATION - BULLE DE PENSÉE ANIMÉE
  // ═══════════════════════════════════════════════

  speechBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  // Cerveau animé
  brainContainer: {
    position: 'relative',
  },
  brainCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  ideaSparks: {
    position: 'relative',
    width: 60,
    height: 20,
  },

  // Bulle de pensée (FOND BLANC)
  speechBubble: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },

  // Queue de la bulle
  bubbleTail: {
    position: 'absolute',
    left: -10,
    top: 24,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    transform: [{ rotate: '-45deg' }],
  },

  // Texte de la citation
  quoteTextBubble: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    color: '#1A1A1A',
    fontStyle: 'italic',
    letterSpacing: 0.2,
    marginBottom: 12,
  },

  // Badge "Citation du jour"
  quoteBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  quoteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Bouton flottant de sauvegarde
  backupFab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
