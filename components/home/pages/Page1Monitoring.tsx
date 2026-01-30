// ============================================
// PAGE 1 - MONITORING (Redesign Premium)
// ============================================

import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Animated, FlatList, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { router } from 'expo-router';
import { Sparkles, TrendingUp, TrendingDown, Minus, Target, Home, Grid, LineChart, Dumbbell, Apple, Droplet, Share2, X, Calendar, CalendarDays, CalendarRange, FileText, BookOpen, Timer, Calculator, Clock, Camera, User, Palette, Trophy, Utensils, Bell, Heart, Users, BookMarked, Plus, Medal, ListChecks, Moon, Crown } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AnimatedCounter from '@/components/AnimatedCounter';
import AvatarDisplay from '@/components/AvatarDisplay';
import { HydrationCardFullWidth } from '@/components/cards/HydrationCardFullWidth';
import { SleepCardFullWidth } from '@/components/cards/SleepCardFullWidth';
import { ChargeCardFullWidth } from '@/components/cards/ChargeCardFullWidth';
import { QuestsCard } from '@/components/QuestsCard';
import { LinearGradient } from 'expo-linear-gradient';
import { getActionGridOrder, ActionGridItem } from '@/lib/actionGridCustomizationService';
import { getUserSettings } from '@/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLatestBodyComposition, BodyComposition } from '@/lib/bodyComposition';
import { getTrainings, Training } from '@/lib/database';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375; // iPhone SE, petits téléphones
const IS_VERY_SMALL_SCREEN = SCREEN_WIDTH < 350; // Très petits téléphones
const CARD_PADDING = 12; // Padding horizontal pour réduire la largeur des cartes

interface WeeklyReport {
  weightChange?: number;
  trainingsCount?: number;
  avgSleepHours?: number;
  hydrationRate?: number;
  totalSteps?: number;
}

interface Page1MonitoringProps {
  userName?: string;
  profilePhoto?: string | null;
  dailyQuote?: string | null;
  steps?: number;
  calories?: number; // ✅ FIX: Calories depuis Apple Health
  streak?: number;
  level?: number;
  rankName?: string;
  rankColor?: string;
  currentWeight?: number;
  targetWeight?: number;
  startWeight?: number; // Poids de départ (premier poids enregistré ou poids de profil)
  weightHistory?: number[];
  weightTrend?: 'up' | 'down' | 'stable';
  hydration?: number;
  hydrationGoal?: number;
  sleepHours?: number;
  sleepDebt?: number;
  sleepGoal?: number;
  workloadStatus?: 'none' | 'light' | 'moderate' | 'intense';
  bodyFat?: number;
  muscleMass?: number;
  waterPercentage?: number;
  userGoal?: 'lose' | 'maintain' | 'gain';
  weeklyReport?: WeeklyReport;
  onAddWeight?: () => void;
  onAddWater?: (ml: number) => void;
  onShareReport?: () => void;
  refreshTrigger?: number;
}

// ============================================
// COMPOSANT GRILLE D'OUTILS (4 colonnes)
// ============================================
const TOOLS_GRID_PADDING = 12;
const TOOLS_GRID_GAP = 10;
const TOOLS_COLUMNS = 4;
const toolCardWidth = (SCREEN_WIDTH - TOOLS_GRID_PADDING * 2 - TOOLS_GRID_GAP * (TOOLS_COLUMNS - 1)) / TOOLS_COLUMNS;

const ICON_MAP: { [key: string]: React.ComponentType<any> } = {
  'BookOpen': BookOpen,
  'Timer': Timer,
  'BookMarked': BookMarked,
  'Calculator': Calculator,
  'Clock': Clock,
  'Camera': Camera,
  'Share2': Share2,
  'User': User,
  'Palette': Palette,
  'Sparkles': Sparkles,
  'Trophy': Trophy,
  'Utensils': Utensils,
  'Bell': Bell,
  'Heart': Heart,
  'Users': Users,
  'Plus': Plus,
  'Medal': Medal,
  'ListChecks': ListChecks,
  'Moon': Moon,
  'Crown': Crown,
  'Target': Target,
};

const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || BookOpen;
};

// Map tool IDs to translation keys
const TOOL_TRANSLATION_KEYS: { [key: string]: { label: string } } = {
  'blessures': { label: 'tools.injuries' },
  'infirmerie': { label: 'tools.injuries' },
  'timer': { label: 'tools.timer' },
  'carnet': { label: 'tools.journal' },
  'calculateurs': { label: 'tools.calculators' },
  'jeune': { label: 'tools.fasting' },
  'nutrition': { label: 'tools.nutrition' },
  'health': { label: 'tools.appleHealth' },
  'savoir': { label: 'tools.knowledge' },
  'dojo': { label: 'tools.myDojo' },
  'notifications': { label: 'tools.notifications' },
  'partager': { label: 'tools.share' },
  'clubs': { label: 'tools.clubsCoach' },
  'competiteur': { label: 'tools.compete' },
  'profil': { label: 'tools.profile' },
  'themes': { label: 'tools.themes' },
  'photos': { label: 'tools.photos' },
};

const ToolsGrid: React.FC = memo(() => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [gridItems, setGridItems] = useState<ActionGridItem[]>([]);

  useEffect(() => {
    loadGridOrder();
  }, []);

  const loadGridOrder = async () => {
    const items = await getActionGridOrder();
    setGridItems(items);
  };

  const handleItemPress = useCallback((item: ActionGridItem) => {
    impactAsync(ImpactFeedbackStyle.Light);
    router.push(item.route as any);
  }, []);

  // Organiser en rangées de 4
  const rows = useMemo(() => {
    const result: ActionGridItem[][] = [];
    for (let i = 0; i < gridItems.length; i += TOOLS_COLUMNS) {
      result.push(gridItems.slice(i, i + TOOLS_COLUMNS));
    }
    return result;
  }, [gridItems]);

  return (
    <View style={toolsGridStyles.container}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={toolsGridStyles.row}>
          {row.map((item) => {
            const Icon = getIconComponent(item.icon);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleItemPress(item)}
                style={toolsGridStyles.gridItemWrapper}
                activeOpacity={0.85}
              >
                <View style={[toolsGridStyles.gridItem, { backgroundColor: colors.backgroundCard }]}>
                  <View style={[toolsGridStyles.iconCircle, { backgroundColor: `${item.color}15` }]}>
                    {item.id === 'infirmerie' ? (
                      <View style={toolsGridStyles.redCross}>
                        <View style={[toolsGridStyles.crossVertical, { backgroundColor: item.color }]} />
                        <View style={[toolsGridStyles.crossHorizontal, { backgroundColor: item.color }]} />
                      </View>
                    ) : (
                      <Icon size={18} color={item.color} strokeWidth={2.5} />
                    )}
                  </View>
                  <Text style={[toolsGridStyles.label, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={[toolsGridStyles.description, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {row.length < TOOLS_COLUMNS &&
            Array.from({ length: TOOLS_COLUMNS - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: toolCardWidth }} />
            ))}
        </View>
      ))}
    </View>
  );
});

const toolsGridStyles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: TOOLS_GRID_GAP,
  },
  gridItemWrapper: {
    width: toolCardWidth,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  gridItem: {
    aspectRatio: 0.8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  redCross: {
    width: 20,
    height: 20,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossVertical: {
    position: 'absolute',
    width: 6,
    height: 20,
    borderRadius: 2,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 20,
    height: 6,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '800', // Plus gras
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 13,
  },
  description: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 11,
    opacity: 0.6,
  },
});

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

// Composant optimisé avec React.memo
const WeightProgressWithCharacter: React.FC<WeightProgressProps> = memo(({
  currentWeight,
  targetWeight,
  startWeight,
  userGoal,
  isDark,
  colors,
}) => {
  // Calcul du pourcentage de progression - Optimisé avec useMemo
  const progress = useMemo(() => {
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
  }, [targetWeight, startWeight, currentWeight, userGoal]);

  // Couleur selon la progression - Optimisé avec useMemo
  const progressColor = useMemo(() => {
    if (progress < 25) return '#EF4444'; // Rouge - loin
    if (progress < 50) return '#F97316'; // Orange - commence
    if (progress < 75) return '#EAB308'; // Jaune - se rapproche
    return '#10B981'; // Vert - proche/atteint
  }, [progress]);

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
});

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
  calories = 0, // ✅ FIX: Calories depuis Apple Health
  streak = 0,
  level = 1,
  rankName = 'Novice',
  rankColor = '#94A3B8',
  currentWeight = 0,
  targetWeight = 0,
  startWeight: propStartWeight,
  weightHistory = [],
  weightTrend = 'stable',
  hydration = 0,
  hydrationGoal = 2500,
  sleepHours = 0,
  sleepDebt = 0,
  sleepGoal = 8,
  workloadStatus = 'none',
  bodyFat,
  muscleMass,
  waterPercentage,
  userGoal: propUserGoal,
  weeklyReport,
  onAddWeight,
  onAddWater,
  onShareReport,
  refreshTrigger = 0,
}) => {
  const { colors, isDark } = useTheme();
  const { t, locale } = useI18n();
  const [userGoal, setUserGoal] = useState<'lose' | 'maintain' | 'gain'>(propUserGoal || 'lose');
  const [bodyComposition, setBodyComposition] = useState<BodyComposition | null>(null);
  const [trainingCalories, setTrainingCalories] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);


  // Calculer les calories des entraînements du jour
  useEffect(() => {
    const loadTodayTrainings = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const trainings = await getTrainings(1); // Derniers 24h
        const todayTrainings = trainings.filter(t => t.date === today);

        let totalCals = 0;
        todayTrainings.forEach(training => {
          if (training.calories) {
            totalCals += training.calories;
          } else if (training.duration_minutes || training.duration) {
            // Estimation: ~7 cal/min pour sport modéré, ajusté par intensité
            const duration = training.duration_minutes || training.duration || 0;
            const intensity = training.intensity || 5;
            const calPerMin = 5 + (intensity * 0.5); // 5-10 cal/min selon intensité
            totalCals += Math.round(duration * calPerMin);
          }
        });
        setTrainingCalories(totalCals);
      } catch (error) {
        console.error('Erreur chargement calories:', error);
      }
    };
    loadTodayTrainings();
  }, [refreshTrigger]);

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
    if (propUserGoal) {
      setUserGoal(propUserGoal);
      return;
    }
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
    impactAsync(ImpactFeedbackStyle.Medium);
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
    impactAsync(ImpactFeedbackStyle.Light);

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
    impactAsync(ImpactFeedbackStyle.Medium);
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
    impactAsync(ImpactFeedbackStyle.Light);
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
  // Utiliser le startWeight passé en prop, sinon le poids le plus ancien de l'historique (dernier élément car trié du plus récent au plus ancien)
  const startWeight = propStartWeight || (weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : currentWeight);
  const totalLoss = startWeight - currentWeight;
  const progressPercentage = Math.abs(((startWeight - currentWeight) / (startWeight - targetWeight)) * 100);

  // Calcul du taux de perte mensuel RÉALISTE
  // On utilise les 30 derniers jours de données si disponibles
  const calculateMonthlyLossRate = () => {
    if (weightHistory.length < 2) return 0;

    // Prendre les pesées des 30 derniers jours max
    const recentWeights = weightHistory.slice(0, Math.min(30, weightHistory.length));
    if (recentWeights.length < 2) return 0;

    // Différence entre la plus ancienne et la plus récente des 30 derniers jours
    const oldestRecent = recentWeights[recentWeights.length - 1];
    const newest = recentWeights[0];
    const monthlyLoss = oldestRecent - newest;

    // Limiter à un maximum de 4 kg/mois (perte saine max)
    return Math.min(Math.max(monthlyLoss, -2), 4);
  };

  const monthlyLossRate = calculateMonthlyLossRate();

  // Fonction pour calculer les prédictions avec limites
  const calculatePrediction = (months: number) => {
    const predicted = currentWeight - (monthlyLossRate * months);
    // Limites: minimum 40kg ET ne pas descendre sous l'objectif
    const minWeight = Math.max(40, targetWeight);
    return Math.max(predicted, minWeight);
  };

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
      ref={scrollViewRef}
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
            style={[styles.profilePhotoLarge, { backgroundColor: colors.backgroundCard, borderColor: isDark ? '#FFFFFF' : '#000000' }]}
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

          {/* Avatar - Cercle agrandi */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              onPress={() => router.push('/avatar-selection')}
              style={[styles.avatarCircle, {
                backgroundColor: '#FFFFFF', // Toujours blanc
                borderColor: isDark ? '#FFFFFF' : '#000000' // Bordure: blanc en dark, noir en light
              }]}
            >
              <AvatarDisplay size="sm" refreshTrigger={refreshTrigger} />
            </TouchableOpacity>
            {/* Rang + Niveau + Barre de progression */}
            <View style={styles.rankLevelContainer}>
              <Text style={[styles.rankText, { color: colors.textPrimary }]}>
                {rankName}
              </Text>
              <Text style={[styles.levelText, { color: colors.textMuted }]}>
                Niveau {level}
              </Text>
              {/* Barre de progression du niveau */}
              <View style={[styles.levelProgressContainer, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
              }]}>
                <View style={[styles.levelProgressBar, {
                  width: `${(level / 5) * 100}%`,
                  backgroundColor: isDark ? colors.accent : '#3B82F6'
                }]} />
              </View>
            </View>
          </View>
        </View>

        {/* CITATION MOTIVANTE */}
        {dailyQuote && (
          <Animated.View
            style={[
              { paddingHorizontal: CARD_PADDING, marginTop: -2 },
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={[styles.weightTitle, { color: colors.textPrimary }]}>
                  Poids Actuel
                </Text>
                <View style={[styles.goalModeBadge, {
                  backgroundColor: userGoal === 'lose' ? '#EF444420' : userGoal === 'gain' ? '#22C55E20' : '#F59E0B20',
                  borderWidth: 1,
                  borderColor: userGoal === 'lose' ? '#EF444440' : userGoal === 'gain' ? '#22C55E40' : '#F59E0B40'
                }]}>
                  <Text style={[styles.goalModeText, {
                    color: userGoal === 'lose' ? '#EF4444' : userGoal === 'gain' ? '#22C55E' : '#F59E0B'
                  }]}>
                    {userGoal === 'lose' ? 'Perte de poids' : userGoal === 'gain' ? 'Prise de masse' : 'Maintien'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Target size={14} color={colors.accent} strokeWidth={2.5} />
                <Text style={[styles.weightSubtitle, { color: colors.textSecondary }]}>
                  Objectif : <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{targetWeight} kg</Text>
                </Text>
              </View>
            </View>
          </View>

        </View>

        {/* Ligne optimisée: Perdu (vert) - Poids - Restant (rouge) */}
        <View style={styles.weightOptimizedRow}>
          {/* Perdu à gauche - VERT */}
          <View style={styles.weightSideMetric}>
            <Text style={[styles.metricTopLabel, { color: '#10B981' }]}>
              {userGoal === 'lose' ? 'PERDU' : userGoal === 'gain' ? 'PRIS' : 'ÉVOLUTION'}
            </Text>
            <Text style={[styles.metricTopValue, { color: '#10B981' }]}>
              {userGoal === 'lose' ? '-' : '+'}{Math.abs(totalLoss).toFixed(1)} kg
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

          {/* Restant à droite - ROUGE */}
          <View style={[styles.weightSideMetric, { alignItems: 'flex-end' }]}>
            <Text style={[styles.metricTopLabel, { color: Math.abs(weightDiff) <= 0.1 ? '#10B981' : '#EF4444' }]}>
              {Math.abs(weightDiff) <= 0.1 ? 'ATTEINT' : 'RESTE'}
            </Text>
            {Math.abs(weightDiff) <= 0.1 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Sparkles size={14} color="#10B981" strokeWidth={2.5} />
                <Text style={[styles.metricTopValue, { color: '#10B981' }]}>0 kg</Text>
                <Sparkles size={14} color="#FFD700" strokeWidth={2.5} />
              </View>
            ) : (
              <Text style={[styles.metricTopValue, { color: '#EF4444' }]}>
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
            startWeight={startWeight}
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
              impactAsync(ImpactFeedbackStyle.Light);
              router.push('/(tabs)/stats?tab=composition');
            }}
            activeOpacity={0.7}
          >
            <Dumbbell size={14} color="#EF4444" strokeWidth={2.5} />
            <View style={styles.compositionInfo}>
              <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>{t('home.muscle')}</Text>
              <Text style={[styles.compositionValue, { color: colors.textPrimary }]}>
                {(muscleMass ?? bodyComposition?.muscleMass) ? `${(muscleMass ?? bodyComposition?.muscleMass ?? 0).toFixed(1)} kg` : '--'}
              </Text>
              <Text style={[styles.compositionPercent, { color: '#EF4444' }]}>
                {(muscleMass ?? bodyComposition?.muscleMass) && currentWeight > 0
                  ? `${(((muscleMass ?? bodyComposition?.muscleMass ?? 0) / currentWeight) * 100).toFixed(0)}%`
                  : '--%'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.compositionDivider} />

          {/* Graisse - navigation vers composition */}
          <TouchableOpacity
            style={styles.compositionItem}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              router.push('/(tabs)/stats?tab=composition');
            }}
            activeOpacity={0.7}
          >
            <Apple size={14} color="#F59E0B" strokeWidth={2.5} />
            <View style={styles.compositionInfo}>
              <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>{t('home.fat')}</Text>
              <Text style={[styles.compositionValue, { color: colors.textPrimary }]}>
                {(bodyFat ?? bodyComposition?.bodyFatPercent) != null && currentWeight > 0
                  ? `${(((bodyFat ?? bodyComposition?.bodyFatPercent ?? 0) / 100) * currentWeight).toFixed(1)} kg`
                  : '--'}
              </Text>
              <Text style={[styles.compositionPercent, { color: '#F59E0B' }]}>
                {(bodyFat ?? bodyComposition?.bodyFatPercent) != null ? `${(bodyFat ?? bodyComposition?.bodyFatPercent ?? 0).toFixed(0)}%` : '--%'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.compositionDivider} />

          {/* Eau - navigation vers composition */}
          <TouchableOpacity
            style={styles.compositionItem}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              router.push('/(tabs)/stats?tab=composition');
            }}
            activeOpacity={0.7}
          >
            <Droplet size={14} color="#3B82F6" strokeWidth={2.5} />
            <View style={styles.compositionInfo}>
              <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>{t('home.water')}</Text>
              <Text style={[styles.compositionValue, { color: colors.textPrimary }]}>
                {(waterPercentage ?? bodyComposition?.waterPercent) != null && currentWeight > 0
                  ? `${(((waterPercentage ?? bodyComposition?.waterPercent ?? 0) / 100) * currentWeight).toFixed(1)} kg`
                  : '--'}
              </Text>
              <Text style={[styles.compositionPercent, { color: '#3B82F6' }]}>
                {(waterPercentage ?? bodyComposition?.waterPercent) != null ? `${(waterPercentage ?? bodyComposition?.waterPercent ?? 0).toFixed(0)}%` : '--%'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        </TouchableOpacity>

        {/* OPTIMISATION: Mémoriser les calculs de poids pour éviter recalcul à chaque render */}
        {useMemo(() => {
          // Prendre les 30 derniers poids (le plus récent est à l'index 0 car weightHistory est trié DESC)
          const last30Weights = weightHistory.slice(0, 30);
          const weights = last30Weights;
          const maxWeightValue = Math.max(...weights);
          const minWeightValue = Math.min(...weights);
          const weightRange = (maxWeightValue - minWeightValue) || 1;

          return (
            <>
              {/* GRAPHIQUE SIMPLE SCROLLABLE AVEC FLATLIST */}
              {/* TouchableOpacity supprimé pour permettre le scroll horizontal */}
              <View>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.simpleChart}
                  contentContainerStyle={styles.simpleChartContent}
                  data={last30Weights}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  keyExtractor={(item, index) => `weight-${index}`}
                  getItemLayout={(data, index) => ({
                    length: 22,
                    offset: 22 * index,
                    index,
                  })}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={15}
                  windowSize={5}
                  renderItem={({ item: weight, index }) => {
                    const heightPercent = ((weight - minWeightValue) / weightRange) * 100;

                    // Calculer la date réelle (inversé: récent à gauche, ancien à droite)
                    const today = new Date();
                    const daysAgo = index; // index 0 = aujourd'hui (le plus récent)
                    const date = new Date(today);
                    date.setDate(date.getDate() - daysAgo);
                    const dayOfMonth = date.getDate();
                    const monthLabel = monthNames[date.getMonth()];

                    // Calculer la variation (comparer avec le jour précédent = index + 1 car inversé)
                    const previousWeight = index < last30Weights.length - 1 ? last30Weights[index + 1] : null;
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
                        {index < last30Weights.length - 1 && (
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
              </View>
            </>
          );
        }, [weightHistory, colors, userGoal])}

        {/* Prédictions - Afficher seulement si on a des données de poids */}
        {weightHistory.length >= 2 && currentWeight > 0 && (
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
                  {calculatePrediction(1).toFixed(1)} kg
                </Text>
              </View>

              <View style={styles.predictionDivider} />

              <View style={styles.predictionItem}>
                <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>{t('home.predictions.90days')}</Text>
                <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                  {calculatePrediction(3).toFixed(1)} kg
                </Text>
              </View>

              <View style={styles.predictionDivider} />

              <View style={styles.predictionItem}>
                <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>{t('home.predictions.6months')}</Text>
                <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                  {calculatePrediction(6).toFixed(1)} kg
                </Text>
              </View>

              <View style={styles.predictionDivider} />

              <View style={styles.predictionItem}>
                <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>{t('home.predictions.1year')}</Text>
                <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                  {calculatePrediction(12).toFixed(1)} kg
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* BOUTON SHARE SUPPRIMÉ - utiliser celui dans QuestsCard */}
      </View>

      {/* DÉFIS DU JOUR - Quêtes avec XP */}
      <View style={{ marginBottom: 16, marginTop: 8 }}>
        <QuestsCard />
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

      {/* RAPPORT HEBDOMADAIRE (Transféré de Analyse) */}
      {weeklyReport && (
        <View style={[styles.reportCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.reportHeader}>
            <View style={styles.reportTitleRow}>
              <FileText size={24} color={colors.accentText} strokeWidth={2} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {t('analysis.weeklyReport')}
              </Text>
            </View>
            {onShareReport && (
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: `${colors.accent}15` }]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  onShareReport();
                }}
                activeOpacity={0.7}
              >
                <Share2 size={18} color={isDark ? colors.accentText : colors.textPrimary} strokeWidth={2} />
                <Text style={[styles.shareButtonText, { color: isDark ? colors.accent : colors.textPrimary, fontWeight: '700' }]}>
                  {t('analysis.share')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.reportStats}>
            {/* Poids */}
            {weeklyReport.weightChange !== undefined && (
              <View style={styles.reportStat}>
                <View style={styles.reportStatHeader}>
                  <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                    {t('analysis.weightEvolution')}
                  </Text>
                  {(() => {
                    const getTrendIconForReport = (value: number) => {
                      if (value > 0) return TrendingUp;
                      if (value < 0) return TrendingDown;
                      return Minus;
                    };
                    const getTrendColorForReport = (value: number) => {
                      if (value > 0) return '#10B981';
                      if (value < 0) return '#EF4444';
                      return '#94A3B8';
                    };
                    const TrendIcon = getTrendIconForReport(weeklyReport.weightChange);
                    const trendColor = getTrendColorForReport(weeklyReport.weightChange);
                    return (
                      <TrendIcon size={16} color={trendColor} strokeWidth={2.5} />
                    );
                  })()}
                </View>
                <Text style={[styles.reportStatValue, { color: colors.textPrimary }]}>
                  {weeklyReport.weightChange > 0 ? '+' : ''}{weeklyReport.weightChange.toFixed(1)} kg
                </Text>
              </View>
            )}

            {/* Entraînements */}
            {weeklyReport.trainingsCount !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  {t('analysis.trainings')}
                </Text>
                <Text style={[styles.reportStatValue, { color: colors.textPrimary }]}>
                  {weeklyReport.trainingsCount} {t('analysis.sessions')}
                </Text>
              </View>
            )}

            {/* Sommeil */}
            {weeklyReport.avgSleepHours !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  {t('analysis.averageSleep')}
                </Text>
                <Text style={[styles.reportStatValue, { color: colors.textPrimary }]}>
                  {weeklyReport.avgSleepHours.toFixed(1)}h {t('analysis.perNight')}
                </Text>
              </View>
            )}

            {/* Hydratation */}
            {weeklyReport.hydrationRate !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  {t('analysis.hydrationRate')}
                </Text>
                <Text style={[styles.reportStatValue, { color: colors.textPrimary }]}>
                  {Math.round(weeklyReport.hydrationRate)}%
                </Text>
              </View>
            )}

            {/* Pas Total */}
            {weeklyReport.totalSteps !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  {t('analysis.totalSteps')}
                </Text>
                <Text style={[styles.reportStatValue, { color: colors.textPrimary }]}>
                  {weeklyReport.totalSteps.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* STATS ROW - PAS / KCAL / SÉRIE - Déplacé en bas */}
      <View style={styles.activityStatsRow}>
        {/* Pas */}
        <TouchableOpacity
          style={[styles.compactCard, { backgroundColor: colors.backgroundCard }]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.push('/activity-history?tab=steps');
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.compactIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <MaterialCommunityIcons name="shoe-print" size={18} color="#3B82F6" />
          </View>
          <Text style={[styles.compactValue, { color: colors.textPrimary }]}>{steps.toLocaleString()}</Text>
          <Text style={[styles.compactLabel, { color: colors.textMuted }]}>{t('home.stepsLabel')}</Text>
        </TouchableOpacity>

        {/* Calories */}
        <TouchableOpacity
          style={[styles.compactCard, { backgroundColor: colors.backgroundCard }]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.push('/activity-history?tab=calories');
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.compactIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <MaterialCommunityIcons name="fire" size={18} color="#EF4444" />
          </View>
          <Text style={[styles.compactValue, { color: colors.textPrimary }]}>{((calories > 0 ? calories : Math.round(steps * 0.04)) + trainingCalories).toLocaleString()}</Text>
          <Text style={[styles.compactLabel, { color: colors.textMuted }]}>kcal</Text>
        </TouchableOpacity>

        {/* Série */}
        <TouchableOpacity
          style={[styles.compactCard, { backgroundColor: colors.backgroundCard }]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.push('/records');
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.compactIcon, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
            <Ionicons name="flame" size={18} color="#F97316" />
          </View>
          <Text style={[styles.compactValue, { color: colors.textPrimary }]}>{streak}</Text>
          <Text style={[styles.compactLabel, { color: colors.textMuted }]}>{t('home.streakLabel')}</Text>
        </TouchableOpacity>
      </View>

      {/* GRILLE OUTILS - 4 colonnes */}
      <View style={styles.toolsSection}>
        <Text style={[styles.toolsSectionTitle, { color: colors.textPrimary }]}>
          {t('tools.title')}
        </Text>
        <Text style={[styles.toolsSectionSubtitle, { color: colors.textMuted }]}>
          {t('tools.subtitle')}
        </Text>
        <ToolsGrid />
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
  // Hero Header - Bien positionné sous le Dynamic Island
  heroHeader: {
    marginTop: 5,
    marginBottom: 10,
    marginHorizontal: -CARD_PADDING,
    paddingHorizontal: 0, // Pas de padding, les cercles gèrent leur espacement
    zIndex: 10,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  // Container pour avatar + texte rang/niveau
  avatarContainer: {
    alignItems: 'center',
    marginTop: 35,
    marginRight: 8,
  },
  // Cercle avatar - AGRANDI
  avatarCircle: {
    width: 105, // AGRANDI
    height: 105,
    borderRadius: 52.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3, // Bordure plus épaisse
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  rankLevelContainer: {
    alignItems: 'center',
    marginTop: 8,
    width: 105, // Même largeur que le cercle
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  levelProgressContainer: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  levelProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  profilePhotoLarge: {
    width: 105, // AGRANDI - MÊME TAILLE que l'avatar
    height: 105,
    borderRadius: 52.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3, // Bordure plus épaisse
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginLeft: 8,
    marginTop: 35,
  },
  profilePhotoImage: {
    width: '100%',
    height: '100%',
  },
  greetingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60, // Descendre sous Dynamic Island
  },
  greetingLarge: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  userNameLarge: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  // Stats Row - Gradient Cards (compact moderne)
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
    zIndex: 200,
    paddingHorizontal: 2,
  },
  activityStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    zIndex: 200,
  },
  compactCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statCardTouchable: {
    flex: 1,
  },
  statCardTouchable3: {
    flex: 1,
    marginHorizontal: 3,
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
  goalModeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  goalModeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    marginBottom: 40, // Plus d'espace pour séparer les vitals du radar/rapport
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

  // ═══════════════════════════════════════════════
  // ACTIVITY CARDS
  // ═══════════════════════════════════════════════
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // ═══════════════════════════════════════════════
  // SECTION OUTILS
  // ═══════════════════════════════════════════════
  toolsSection: {
    marginTop: 24,
    marginBottom: 20,
  },
  toolsSectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  toolsSectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 16,
  },
});
