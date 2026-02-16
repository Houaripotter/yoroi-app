// ============================================
// PAGE 1 - MONITORING (Redesign Premium)
// ============================================

import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Animated, FlatList, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { router } from 'expo-router';
import { Sparkles, TrendingUp, TrendingDown, Minus, Target, Home, Grid, LineChart, Dumbbell, Apple, Droplet, Share2, X, Calendar, CalendarDays, CalendarRange, FileText, BookOpen, Timer, Calculator, Clock, Camera, User, Trophy, Utensils, Bell, Heart, Users, BookMarked, Plus, Medal, ListChecks, Moon, Crown, Palette, Shield, Swords, ChevronRight } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AnimatedCounter from '@/components/AnimatedCounter';
import AvatarDisplay from '@/components/AvatarDisplay';
import { getAvatarConfig, getAvatarImage } from '@/lib/avatarSystem';
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
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Polygon, ClipPath, G, Image as SvgImage } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { RankCitationCard } from '@/components/home/RankCitationCard';
import { logger } from '@/lib/security/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375; // iPhone SE, petits téléphones
const IS_VERY_SMALL_SCREEN = SCREEN_WIDTH < 350; // Très petits téléphones
const CARD_PADDING = 12; // Padding horizontal pour réduire la largeur des cartes

// Composant VRAI Octogone (8 côtés) avec angles super arrondis
interface RoundedOctagonImageProps {
  size: number;
  borderColor: string;
  borderWidth?: number;
  backgroundColor?: string;
  imageUri?: string | null;
  onPress?: () => void;
  placeholder?: React.ReactNode;
  zoomOut?: boolean; // Pour dézoomer l'image (avatar)
}

const RoundedOctagonImage: React.FC<RoundedOctagonImageProps> = memo(({
  size,
  borderColor,
  borderWidth = 3,
  backgroundColor = '#FFFFFF',
  imageUri,
  onPress,
  placeholder,
  zoomOut = false, // false = image pleine, true = dézoomée (avatar)
}) => {
  const s = size;
  const cut = s * 0.28; // Taille des coins coupés (côtés diagonaux)
  const r = 0;   // Octogone simple sans arrondi

  // Vrai octogone : 8 côtés avec 8 angles arrondis
  // Points: haut-gauche-diag, haut-droite-diag, droite-haut-diag, droite-bas-diag, etc.
  const createRoundedOctagon = (sz: number, corner: number, radius: number) => {
    const c = corner;
    const rd = radius;
    return `
      M ${c + rd},${rd}
      Q ${c},0 ${c + rd},0
      L ${sz - c - rd},0
      Q ${sz - c},0 ${sz - c - rd},${rd}
      L ${sz - rd},${c + rd}
      Q ${sz},${c} ${sz},${c + rd}
      L ${sz},${sz - c - rd}
      Q ${sz},${sz - c} ${sz - rd},${sz - c - rd}
      L ${sz - c - rd},${sz - rd}
      Q ${sz - c},${sz} ${sz - c - rd},${sz}
      L ${c + rd},${sz}
      Q ${c},${sz} ${c + rd},${sz - rd}
      L ${rd},${sz - c - rd}
      Q 0,${sz - c} 0,${sz - c - rd}
      L 0,${c + rd}
      Q 0,${c} ${rd},${c + rd}
      Z
    `;
  };

  const outerPath = createRoundedOctagon(s, cut, r);
  const innerS = s - borderWidth * 2;
  const innerCut = innerS * 0.28;
  const innerR = 0;
  const innerPath = createRoundedOctagon(innerS, innerCut, innerR);

  const content = (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s}>
        <Defs>
          <ClipPath id={`octClip-${size}`}>
            <Path d={innerPath} />
          </ClipPath>
        </Defs>

        {/* Bordure octogone */}
        <Path d={outerPath} fill={borderColor} />

        {/* Fond intérieur */}
        <Path
          d={innerPath}
          fill={backgroundColor}
          transform={`translate(${borderWidth}, ${borderWidth})`}
        />

        {/* Image clippée en octogone */}
        {imageUri && (
          <G clipPath={`url(#octClip-${size})`} transform={`translate(${borderWidth}, ${borderWidth})`}>
            <SvgImage
              href={imageUri}
              x={zoomOut ? innerS * 0.15 : 0}
              y={zoomOut ? innerS * 0.05 : 0}
              width={zoomOut ? innerS * 0.7 : innerS}
              height={zoomOut ? innerS * 0.9 : innerS}
              preserveAspectRatio={zoomOut ? "xMidYMid meet" : "xMidYMid slice"}
            />
          </G>
        )}
      </Svg>

      {/* Placeholder si pas d'image */}
      {!imageUri && placeholder && (
        <View style={{
          position: 'absolute',
          top: borderWidth,
          left: borderWidth,
          width: innerS,
          height: innerS,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {placeholder}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
});

// Composant VRAI Octogone pour avatar (avec children React)
interface RoundedOctagonFrameProps {
  size: number;
  borderColor: string;
  borderWidth?: number;
  backgroundColor?: string;
  children: React.ReactNode;
  onPress?: () => void;
}

const RoundedOctagonFrame: React.FC<RoundedOctagonFrameProps> = memo(({
  size,
  borderColor,
  borderWidth = 3,
  backgroundColor = '#FFFFFF',
  children,
  onPress
}) => {
  const s = size;
  const cut = s * 0.28;
  const r = 0;

  const createRoundedOctagon = (sz: number, corner: number, radius: number) => {
    const c = corner;
    const rd = radius;
    return `
      M ${c + rd},${rd} Q ${c},0 ${c + rd},0 L ${sz - c - rd},0 Q ${sz - c},0 ${sz - c - rd},${rd} L ${sz - rd},${c + rd} Q ${sz},${c} ${sz},${c + rd} L ${sz},${sz - c - rd} Q ${sz},${sz - c} ${sz - rd},${sz - c - rd} L ${sz - c - rd},${sz - rd} Q ${sz - c},${sz} ${sz - c - rd},${sz} L ${c + rd},${sz} Q ${c},${sz} ${c + rd},${sz - rd} L ${rd},${sz - c - rd} Q 0,${sz - c} 0,${sz - c - rd} L 0,${c + rd} Q 0,${c} ${rd},${c + rd} Z
    `;
  };

  const outerPath = createRoundedOctagon(s, cut, r);
  const innerS = s - borderWidth * 2;
  const innerCut = innerS * 0.28;
  const innerR = 0;
  const innerPath = createRoundedOctagon(innerS, innerCut, innerR);

  const content = (
    <View style={{ width: s, height: s }}>
      <Svg width={s} height={s}>
        <Defs>
          <ClipPath id={`octFrameClip-${size}`}>
            <Path d={innerPath} />
          </ClipPath>
        </Defs>
        <Path d={outerPath} fill={borderColor} />
        <Path
          d={innerPath}
          fill={backgroundColor}
          transform={`translate(${borderWidth}, ${borderWidth})`}
        />
      </Svg>

      {/* Contenu clippé dans l'octogone via une View masquée */}
      <View style={{
        position: 'absolute',
        top: borderWidth,
        left: borderWidth,
        width: innerS,
        height: innerS,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
});

// Alias pour compatibilité
const HexagonImage = RoundedOctagonImage;
const HexagonFrame = RoundedOctagonFrame;

// ============================================
// COMPOSANT RANG + NIVEAU SIMPLE ET PROPRE
// ============================================
interface AnimatedRankBadgeProps {
  rankName: string;
  level: number;
  maxLevel?: number;
  isDark: boolean;
  themeColor: string;
  accentColor: string;
  onPress?: () => void;
}

const AnimatedRankBadge: React.FC<AnimatedRankBadgeProps> = memo(({
  rankName,
  level,
  maxLevel = 5,
  isDark,
  themeColor,
  accentColor,
  onPress,
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  const progress = (level / maxLevel) * 100;

  // Animation au montage
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [level]);

  // Couleurs selon le thème classic
  const isClassic = themeColor === 'classic';
  const barColor = isClassic
    ? (isDark ? '#FFFFFF' : '#000000')
    : accentColor;
  const trackColor = isClassic
    ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')
    : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)');
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const content = (
    <View style={rankBadgeStyles.container}>
      {/* Rang */}
      <Text style={[rankBadgeStyles.rankText, { color: textColor }]}>
        {rankName}
      </Text>

      {/* Niveau */}
      <Text style={[rankBadgeStyles.levelText, { color: mutedColor }]}>
        Niveau {level}
      </Text>

      {/* Barre de progression avec animation */}
      <View style={[rankBadgeStyles.progressTrack, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            rankBadgeStyles.progressBar,
            {
              width: progressWidth,
              backgroundColor: barColor,
            }
          ]}
        />
      </View>

      {/* Points indicateurs - Couleur dorée pour les points non atteints */}
      <View style={rankBadgeStyles.dotsContainer}>
        {Array.from({ length: maxLevel }).map((_, i) => (
          <View
            key={i}
            style={[
              rankBadgeStyles.dot,
              {
                backgroundColor: i < level ? barColor : 'rgba(255, 215, 0, 0.4)',
              }
            ]}
          />
        ))}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

const rankBadgeStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 8,
    width: 110,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

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
// COMPOSANT BARRE DE PROGRESSION POIDS (Simple avec couleurs du thème)
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

  // Déterminer si le thème est "classic" (noir/blanc)
  const isClassicTheme = colors.accent === '#000000' || colors.accent === '#FFFFFF' ||
                         colors.accent === '#1a1a1a' || colors.accent === '#f5f5f5';

  // Couleur de la barre de progression = couleur du thème
  // Pour classic: blanc en dark mode, noir en light mode
  const barColor = isClassicTheme
    ? (isDark ? '#FFFFFF' : '#000000')
    : colors.accent;

  // Couleur du contour/track
  // Dark mode: blanc, Light mode: noir
  const trackBorderColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <View style={progressStyles.container}>
      {/* Barre de progression avec contour */}
      <View style={[
        progressStyles.track,
        {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
        }
      ]}>
        {/* Barre de progression remplie */}
        <View
          style={[
            progressStyles.fill,
            {
              width: `${Math.min(100, Math.max(2, progress))}%`,
              backgroundColor: barColor,
            }
          ]}
        />
      </View>

      {/* Labels - poids de départ et objectif en couleur du thème */}
      <View style={progressStyles.labels}>
        <Text style={[progressStyles.label, { color: colors.accent }]}>
          {startWeight.toFixed(1)} kg
        </Text>
        <Text style={[progressStyles.progressText, { color: colors.accent }]}>
          {progress.toFixed(0)}%
        </Text>
        <Text style={[progressStyles.label, { color: colors.accent }]}>
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
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressText: {
    fontSize: 11,
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
  const { colors, isDark, themeColor } = useTheme();
  const { t, locale } = useI18n();
  const [userGoal, setUserGoal] = useState<'lose' | 'maintain' | 'gain'>(propUserGoal || 'lose');
  const [bodyComposition, setBodyComposition] = useState<BodyComposition | null>(null);
  const [trainingCalories, setTrainingCalories] = useState(0);
  const [avatarImageUri, setAvatarImageUri] = useState<string | null>(null);
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
        logger.error('Erreur chargement calories:', error);
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
        logger.error('Error loading goal:', error);
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
        logger.error('Error loading body composition:', error);
      }
    };
    loadBodyComposition();
  }, [refreshTrigger]);

  // Load avatar image for octagon display
  useEffect(() => {
    const loadAvatarImage = async () => {
      try {
        const config = await getAvatarConfig();
        const image = getAvatarImage(
          config.pack,
          config.packType === 'character' ? config.state : undefined,
          config.collectionCharacter,
          config.gender
        );
        // Resolve the require() to get the actual URI
        const resolved = Image.resolveAssetSource(image);
        setAvatarImageUri(resolved?.uri || null);
      } catch (error) {
        logger.error('Error loading avatar image:', error);
        // Fallback to default
        const defaultImage = require('@/assets/avatars/samurai/samurai_neutral.png');
        const resolved = Image.resolveAssetSource(defaultImage);
        setAvatarImageUri(resolved?.uri || null);
      }
    };
    loadAvatarImage();
  }, [refreshTrigger]);

  // Check if share button was dismissed
  useEffect(() => {
  }, []);



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
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER PROPRE - Cercles identiques bien alignés */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <View style={styles.headerClean}>
        {/* Row principale - Bien alignée aux bords */}
        <View style={styles.headerRowClean}>

          {/* GAUCHE - Photo de profil (rond) */}
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
            style={styles.leftSection}
          >
            <View style={[styles.profileFrame, {
              borderColor: isDark ? '#FFFFFF' : '#000000',
              backgroundColor: '#FFFFFF',
            }]}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImg} />
              ) : (
                <View style={[styles.profilePlaceholder, { backgroundColor: '#FFFFFF' }]}>
                  <Ionicons name="person" size={44} color={isDark ? '#666' : '#999'} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* CENTRE - Texte */}
          <View style={styles.centerSection}>
            <Text style={[styles.greetingClean, { color: colors.textMuted }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.nameClean, { color: colors.textPrimary }]}>
              {userName}
            </Text>
          </View>

        </View>

        {/* CARTE RANG & CITATION - Premium Design */}
        <RankCitationCard streak={streak} dailyQuote={dailyQuote} avatarUri={avatarImageUri} />
      </View>

      {/* GRAPHIQUE POIDS - Redesign Complet Premium */}
      <View style={[styles.weightCardPremium, { backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity
          onPress={() => router.push('/stats?tab=poids')}
          activeOpacity={0.9}
        >
        {/* Header - Réorganisé */}
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
                Poids actuel
              </Text>
              <Text style={[styles.weightSubtitle, { color: colors.textMuted, marginTop: 2 }]}>
                Objectif {targetWeight} kg
              </Text>
            </View>
          </View>

          {/* Badge Mode à droite - Simplifié */}
          <View style={[styles.goalModeBadge, {
            backgroundColor: `${colors.accent}15`,
            borderWidth: 1.5,
            borderColor: `${colors.accent}50`
          }]}>
            <Text style={[styles.goalModeText, { color: colors.accent }]}>
              {userGoal === 'lose' ? 'Perte de poids' : userGoal === 'gain' ? 'Prise de masse' : 'Maintien'}
            </Text>
          </View>
        </View>

        {/* Ligne optimisée: Perdu - Poids - Restant (2 couleurs max: accent + textPrimary) */}
        <View style={styles.weightOptimizedRow}>
          {/* Perdu à gauche */}
          <View style={styles.weightSideMetric}>
            <Text style={[styles.metricTopLabel, { color: colors.textMuted }]}>
              {userGoal === 'lose' ? 'PERDU' : userGoal === 'gain' ? 'PRIS' : 'ÉVOLUTION'}
            </Text>
            <Text style={[styles.metricTopValue, { color: colors.accent }]}>
              {userGoal === 'lose' ? '-' : '+'}{Math.abs(totalLoss).toFixed(1)} kg
            </Text>
          </View>

          {/* Poids au centre */}
          <View style={styles.weightCenterMetric}>
            <View style={styles.weightValueRow}>
              <Text style={[styles.weightValueLarge, { color: colors.textPrimary }]}>
                {currentWeight.toFixed(1)}
              </Text>
              <Text style={[styles.weightUnit, { color: colors.textMuted }]}>kg</Text>
            </View>
          </View>

          {/* Restant à droite */}
          <View style={[styles.weightSideMetric, { alignItems: 'flex-end' }]}>
            <Text style={[styles.metricTopLabel, { color: colors.textMuted }]}>
              {Math.abs(weightDiff) <= 0.1 ? 'ATTEINT' : 'RESTE'}
            </Text>
            <Text style={[styles.metricTopValue, { color: colors.accent }]}>
              {Math.abs(weightDiff).toFixed(1)} kg
            </Text>
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
                    length: 42,
                    offset: 42 * index,
                    index,
                  })}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={15}
                  windowSize={5}
                  renderItem={({ item: weight, index }) => {
                    // Hauteur proportionnelle avec base minimum de 30%
                    // Cela évite les "chutes" visuelles dramatiques
                    const rawPercent = ((weight - minWeightValue) / weightRange) * 70; // Max 70% de variation
                    const heightPercent = 30 + rawPercent; // Base de 30% + variation

                    // Calculer la date réelle (inversé: récent à gauche, ancien à droite)
                    const today = new Date();
                    const daysAgo = index;
                    const date = new Date(today);
                    date.setDate(date.getDate() - daysAgo);
                    const dayOfMonth = date.getDate();
                    const monthLabel = monthNames[date.getMonth()];

                    return (
                      <View style={styles.simpleChartBar}>
                        <Text style={[styles.simpleChartWeight, { color: colors.textPrimary }]}>
                          {weight.toFixed(1)}
                        </Text>
                        <View style={styles.simpleChartBarBg}>
                          <LinearGradient
                            colors={[colors.accent, colors.accent + 'CC', colors.accent + '99']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={[
                              styles.simpleChartBarFill,
                              { height: `${heightPercent}%` }
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
    paddingHorizontal: 0,
    zIndex: 10,
  },

  // ═══════════════════════════════════════════════════════════════
  // HEADER PROPRE - Cercles identiques bien alignés
  // ═══════════════════════════════════════════════════════════════
  headerClean: {
    paddingTop: 55,
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  headerRowClean: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },

  // GAUCHE - Photo de profil (rond)
  leftSection: {
    position: 'relative',
    alignItems: 'center',
  },
  profileFrame: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  profileImg: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // CENTRE - Texte
  centerSection: {
    flex: 1,
    marginHorizontal: 8,
    paddingTop: 20,
    alignItems: 'center',
  },
  greetingClean: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameClean: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },

  avatarWithProgressGlow: {
    width: 120,
    height: 120,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSvgGlow: {
    position: 'absolute',
  },
  // Forme #3 - Cercle avec glow pour avatar (même taille que photo profil)
  glowCircleFrameAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 15,
  },
  glowCircleImgAvatar: {
    width: 76,
    height: 90,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginTop: 2,
  },
  levelBadgeGlow: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    minWidth: 32,
    height: 28,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  levelPrefixGlow: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    marginRight: 1,
    opacity: 0.9,
  },
  levelTextGlow: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  progressPercentBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 36,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  progressPercentTextWhite: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  // Legacy styles
  progressPercentCircle: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentText: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '800',
  },
  // Legacy avatar styles (gardé pour compatibilité)
  avatarWithProgress: {
    width: 100,
    height: 100,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSvg: {
    position: 'absolute',
  },
  avatarCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 62,
    height: 74,
    resizeMode: 'contain',
  },
  levelBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
    gap: 4,
  },
  rankLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Badge combiné: Niveau + Rang + % - COLLE sous l'avatar
  combinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 6,
    gap: 6,
  },
  combinedBadgeAttached: {
    position: 'absolute',
    bottom: -8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  combinedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Citation - Style Nuage
  quoteCloud: {
    marginTop: 16,
    marginHorizontal: CARD_PADDING,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  quoteCloudText: {
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
  },
  quoteCloudLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // RANK CARD - Design Premium Samouraï
  rankCard: {
    marginTop: 16,
    marginHorizontal: CARD_PADDING,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 12,
  },
  rankCardInner: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    position: 'relative' as const,
  },
  rankGoldLine: {
    height: 1.5,
    width: '100%',
  },
  rankGoldLineBottom: {
    height: 1.5,
    width: '100%',
  },
  rankMainContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  rankBadgeColumn: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  },
  rankHexContainer: {
    width: 72,
    height: 80,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  rankLevelOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  rankLevelNumber: {
    fontSize: 30,
    fontWeight: '900' as const,
    color: '#FFD700',
    textShadowColor: 'rgba(255,215,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  rankInfoColumn: {
    flex: 1,
  },
  rankNameText: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: '#FFD700',
    textTransform: 'uppercase' as const,
    letterSpacing: 3,
    textShadowColor: 'rgba(255,215,0,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  rankLevelInfoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 5,
    gap: 8,
  },
  rankLevelLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  rankXpPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  rankXpPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#F0C040',
  },
  rankProgressContainer: {
    marginTop: 10,
  },
  rankProgressBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden' as const,
  },
  rankProgressFill: {
    height: '100%' as const,
    borderRadius: 3,
  },
  rankNavigateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: 8,
    gap: 5,
  },
  rankNavigateText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,215,0,0.4)',
    flex: 1,
  },
  rankSeparator: {
    height: 1,
    marginHorizontal: 20,
  },
  rankQuoteSection: {
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  rankQuoteAccent: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#C9A84C',
    opacity: 0.6,
  },
  rankQuoteContent: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  rankQuoteText: {
    fontSize: 13.5,
    fontWeight: '500' as const,
    fontStyle: 'italic' as const,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  // Legacy GAMIFICATION CARD - Premium Design V2
  gamificationCardPremium: {
    marginTop: 16,
    marginHorizontal: CARD_PADDING,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gamificationGradient: {
    padding: 18,
  },
  gamificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankBadgePremium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankIconGold: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  rankLabelSmall: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rankNamePremium: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  levelCircleContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelTextCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  levelLabelTiny: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: -2,
  },
  xpSectionPremium: {
    marginBottom: 14,
  },
  xpLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  xpLabelText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  xpPercentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  xpBarPremium: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFillPremium: {
    height: '100%',
    borderRadius: 3,
  },
  quoteSectionPremium: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  quoteMarkLeft: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 28,
    marginRight: 4,
    marginTop: -4,
  },
  quoteMarkRight: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 28,
    marginLeft: 4,
    marginTop: -4,
    alignSelf: 'flex-end',
  },
  quotePremiumText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
  },
  // Legacy gamification styles
  gamificationCard: {
    marginTop: 16,
    marginHorizontal: CARD_PADDING,
    borderRadius: 20,
    padding: 16,
  },
  gamificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rankIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gamificationInfo: {
    flex: 1,
  },
  gamificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  gamificationRank: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  levelPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  xpBarContainer: {
    gap: 4,
  },
  xpBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 11,
    fontWeight: '500',
  },
  quoteSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  quoteIcon: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 24,
    marginTop: -4,
  },
  gamificationQuote: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // Bouton temporaire pour voir les formes
  shapesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginHorizontal: CARD_PADDING,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shapesBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Legacy styles (gardés pour compatibilité)
  heroHeaderGaming: {
    marginTop: 0,
    marginBottom: 10,
    marginHorizontal: -CARD_PADDING,
    paddingTop: 55,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    zIndex: 10,
  },
  // Stats Bar Gaming
  statsBarGaming: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statItemGaming: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValueGaming: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statLabelGaming: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },
  statSeparator: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 12,
  },
  // Citation Gaming
  quoteBadgeGaming: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 8,
  },
  quoteBadgeTextGaming: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteCardGaming: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  quoteTextGaming: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'center',
  },
  // Photo de profil Gaming
  profilePhotoContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  profilePhotoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
  },
  // Avatar avec progression circulaire
  avatarProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    width: 100,
    height: 100,
  },
  progressRingSvg: {
    position: 'absolute',
  },
  avatarInnerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInnerImage: {
    width: 60,
    height: 70,
    resizeMode: 'contain',
  },
  levelBadgeGaming: {
    position: 'absolute',
    bottom: 0,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCD34D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  levelBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1F2937',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  // Container pour hexagone photo de profil
  hexagonContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginLeft: 12,
  },
  hexagonImage: {
    width: 120,
    height: 140,
    resizeMode: 'cover',
  },
  hexagonPlaceholder: {
    width: 100,
    height: 115,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  // Container pour avatar + texte rang/niveau
  avatarContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginRight: 12,
  },
  // Cercle avatar - AGRANDI
  avatarCircle: {
    width: 105,
    height: 105,
    borderRadius: 35, // Effet Squircle magnifique
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  rankLevelContainer: {
    alignItems: 'center',
    marginTop: 8,
    width: 105,
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
    width: 105,
    height: 105,
    borderRadius: 35, // Effet Squircle magnifique
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginLeft: 8,
    marginTop: 50,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  goalModeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
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
    width: 42, // Largeur fixe pour chaque barre - SCROLLABLE
    alignItems: 'center',
    gap: 4,
  },
  simpleChartWeight: {
    fontSize: 9,
    fontWeight: '700',
  },
  simpleChartBarBg: {
    width: 26,
    height: 75,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 6,
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

  // ═══════════════════════════════════════════════
  // RAPPORT HEBDOMADAIRE
  // ═══════════════════════════════════════════════
  reportCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  reportStats: {
    gap: 12,
  },
  reportStat: {
    gap: 4,
  },
  reportStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportStatLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  reportStatValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
