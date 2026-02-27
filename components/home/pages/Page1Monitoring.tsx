// ============================================
// PAGE 1 - MONITORING (Redesign Premium)
// ============================================

import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Animated, FlatList, Easing, Switch, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { router } from 'expo-router';
import { TrendingUp, TrendingDown, Minus, Plus, Dumbbell, Droplet, Share2, FileText, Moon, Zap, Bell, BellOff, Check, Target, Calendar, Activity, AlertTriangle, CheckCircle, Clock, Settings, Footprints, Flame } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAvatar } from '@/lib/AvatarContext';
// HydrationCardFullWidth removed - integrated into Report grid card
// QuestsCard déplacé dans HomeTabView page 2
import { LinearGradient } from 'expo-linear-gradient';
// actionGridCustomizationService removed - tools moved to Menu tab
import { getUserSettings } from '@/lib/storage';
import { getLatestBodyComposition, BodyComposition } from '@/lib/bodyComposition';
import { getTrainings } from '@/lib/database';
import Svg, { Path, Circle as SvgCircle, Rect as SvgRect, Defs, ClipPath, G, Image as SvgImage, LinearGradient as SvgLinearGradient, Stop, Ellipse, Line, Text as SvgText } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { RankCitationCard } from '@/components/home/RankCitationCard';
import { FramedProfilePhoto } from '@/components/FramedProfilePhoto';
import { logger } from '@/lib/security/logger';
import HomeChallengesSection from '@/components/home/HomeChallengesSection';

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
  heightCm?: number;
  userGoal?: 'lose' | 'maintain' | 'gain';
  weeklyReport?: WeeklyReport;
  onAddWeight?: () => void;
  onAddWater?: (ml: number) => void;
  onShareReport?: () => void;
  refreshTrigger?: number;
}

// ToolsGrid supprimé - déplacé dans onglet Menu

// ToolsGrid component and styles removed

// WeightProgressWithCharacter removed - weight info integrated into Report grid card

// ═══════════════════════════════════════════════
// HYDRATION GRID CARD - 3 Pages Swipeables
// ═══════════════════════════════════════════════
const H_CARD_W = (SCREEN_WIDTH - CARD_PADDING * 2 - 12) / 2;
const CARD_BORDER_W = 1.5; // borderWidth en mode clair
const H_CARD_PAGE_W = H_CARD_W - CARD_BORDER_W * 2; // largeur intérieure pour pages ScrollView
const H_CARD_INNER = H_CARD_W - 28; // contenu intérieur (padding 14*2)
const H_BOTTLE_W = 55;
const H_BOTTLE_H = 82;
const HYDRATION_HISTORY_KEY = '@yoroi_hydration_history';
const HYDRATION_GOAL_KEY = '@yoroi_hydration_goal';

interface HydrationGridCardProps {
  hydration: number;
  hydrationGoal: number;
  onAddWater?: (ml: number) => void;
  colors: any;
  isDark: boolean;
}

const HydrationGridCard = memo(({ hydration, hydrationGoal, onAddWater, colors, isDark }: HydrationGridCardProps) => {
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
  const TOTAL_PAGES = 3;

  // Goal local : se met à jour instantanément à la sauvegarde + sync depuis la prop parent
  const [localGoalMl, setLocalGoalMl] = useState(hydrationGoal >= 500 ? hydrationGoal : 2500);
  useEffect(() => {
    const fromProp = hydrationGoal >= 500 ? hydrationGoal : 2500;
    setLocalGoalMl(fromProp);
  }, [hydrationGoal]);

  const safeGoal = localGoalMl;
  const pct = Math.min(100, Math.round((hydration / safeGoal) * 100));
  const goalReached = pct >= 100;
  const accentColor = goalReached ? '#10B981' : '#06B6D4';

  // Page state
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Scroll natif pour détecter la page courante
  const handlePageScroll = useCallback((e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / H_CARD_PAGE_W);
    if (page !== currentPage && page >= 0 && page < TOTAL_PAGES) {
      setCurrentPage(page);
    }
  }, [currentPage]);

  // Wave animation (toujours active, pas de restart)
  const waveAnim = useRef(new Animated.Value(0)).current;
  const [waveOffset, setWaveOffset] = useState(0);
  const [showBubbles, setShowBubbles] = useState(false);
  const [bubblePositions, setBubblePositions] = useState<Array<{id: number, x: number, y: number, size: number}>>([]);

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [lastAmount, setLastAmount] = useState(0);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Page 2: History
  const [history, setHistory] = useState<Array<{date: string, amount: number, goal: number}>>([]);

  // Page 3: Goal editing + notifications
  const [editGoal, setEditGoal] = useState(safeGoal / 1000);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const histStr = await AsyncStorage.getItem(HYDRATION_HISTORY_KEY);
        if (histStr) setHistory(JSON.parse(histStr));
        const notifStr = await AsyncStorage.getItem('@yoroi_notification_settings');
        if (notifStr) {
          const s = JSON.parse(notifStr);
          setNotifEnabled(s?.hydration?.enabled === true);
        }
      } catch {}
    };
    load();
  }, []);

  useEffect(() => { setEditGoal(safeGoal / 1000); }, [safeGoal]);

  // Wave animation (tourne en continu, pas de dépendance à currentPage)
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(waveAnim, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: false })
    );
    animation.start();
    const listener = waveAnim.addListener(({ value }) => setWaveOffset(value * Math.PI * 2));
    return () => { animation.stop(); waveAnim.removeListener(listener); };
  }, []);

  // Bubbles
  useEffect(() => {
    if (showBubbles && pct > 5) {
      const newB = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i, x: H_BOTTLE_W * 0.2 + Math.random() * H_BOTTLE_W * 0.6,
        y: H_BOTTLE_H * 0.5 + Math.random() * H_BOTTLE_H * 0.3, size: 2 + Math.random() * 3,
      }));
      setBubblePositions(newB);
      setTimeout(() => setBubblePositions([]), 600);
    }
  }, [showBubbles]);

  // Bottle geometry (plus petite)
  const bW = H_BOTTLE_W, bH = H_BOTTLE_H;
  const neckW = bW * 0.32, neckH = bH * 0.1, neckX = (bW - neckW) / 2, cR = bW * 0.12;
  const bottlePath = `M ${neckX} ${neckH} L ${neckX} 2 Q ${neckX} 0 ${neckX+3} 0 L ${neckX+neckW-3} 0 Q ${neckX+neckW} 0 ${neckX+neckW} 2 L ${neckX+neckW} ${neckH} Q ${bW} ${neckH} ${bW-cR} ${neckH+cR} L ${bW-cR} ${bH-cR} Q ${bW-cR} ${bH} ${bW-cR*2} ${bH} L ${cR*2} ${bH} Q ${cR} ${bH} ${cR} ${bH-cR} L ${cR} ${neckH+cR} Q 0 ${neckH} ${neckX} ${neckH} Z`;
  const clampedFill = Math.min(Math.max(pct / 100, 0), 1);
  const bodyH = bH - neckH;
  const waterTopY = bH - (bodyH * clampedFill);
  const generateWaterPath = () => {
    if (clampedFill <= 0) return '';
    let path = `M 0 ${bH} L 0 ${waterTopY}`;
    for (let x = 0; x <= bW; x += 2) { path += ` L ${x} ${waterTopY + Math.sin((x / bW) * Math.PI * 2 + waveOffset) * 2.5}`; }
    return path + ` L ${bW} ${bH} Z`;
  };
  const goalL = safeGoal / 1000;
  // Générer toutes les graduations : entiers + demi-valeurs
  const allGradSteps: number[] = [];
  for (let s = 0.5; s <= goalL + 0.01; s += 0.5) allGradSteps.push(parseFloat(s.toFixed(1)));
  const leftX = cR + 3, rightX = bW - cR - 3;

  // DROITE : entiers (1L, 2L, 3L, 4L, 5L...)
  const rightGradLabels = allGradSteps
    .filter(v => v === Math.floor(v))
    .map(v => {
      const posY = bH - ((v / goalL) * bodyH);
      if (posY < neckH - 2 || posY > bH - 3) return null;
      return { v, posY, label: `${v}L` };
    }).filter(Boolean) as Array<{v: number; posY: number; label: string}>;

  // GAUCHE : demi-valeurs (0.5L, 1.5L, 2.5L...)
  const leftGradLabels = allGradSteps
    .filter(v => v !== Math.floor(v))
    .map(v => {
      const posY = bH - ((v / goalL) * bodyH);
      if (posY < neckH - 2 || posY > bH - 3) return null;
      return { v, posY, label: `${v}L` };
    }).filter(Boolean) as Array<{v: number; posY: number; label: string}>;

  const handleAdd = (amount: number) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setLastAmount(amount);
    setShowToast(true);
    if (amount > 0) { setShowBubbles(true); setTimeout(() => setShowBubbles(false), 100); }
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1000),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowToast(false));
    onAddWater?.(amount);
  };

  const handleSaveGoal = async () => {
    try {
      // Sauvegarder en litres (format utilisé par hydration.tsx)
      await AsyncStorage.setItem(HYDRATION_GOAL_KEY, editGoal.toString());
      // Mise à jour locale INSTANTANÉE (graduations + bouteille + %)
      setLocalGoalMl(Math.round(editGoal * 1000));
      notificationAsync(NotificationFeedbackType.Success);
      setGoalSaved(true);
      setTimeout(() => setGoalSaved(false), 2000);
      // Notifier le home screen pour sync globale
      DeviceEventEmitter.emit('HYDRATION_GOAL_CHANGED', { goalLiters: editGoal });
    } catch {}
  };

  const handleToggleNotif = async (val: boolean) => {
    setNotifEnabled(val);
    impactAsync(ImpactFeedbackStyle.Light);
    try {
      const str = await AsyncStorage.getItem('@yoroi_notification_settings');
      const settings = str ? JSON.parse(str) : {};
      settings.hydration = { ...settings.hydration, enabled: val, useSlots: true };
      await AsyncStorage.setItem('@yoroi_notification_settings', JSON.stringify(settings));
    } catch {}
  };

  // Stats page 2
  const last7 = history.slice(0, 7);
  const successDays = last7.filter(d => d.amount >= d.goal).length;
  const successRate = last7.length > 0 ? Math.round((successDays / last7.length) * 100) : 0;
  const avgAmount = last7.length > 0 ? last7.reduce((a, d) => a + d.amount, 0) / last7.length : 0;
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <View style={[hStyles.card, { backgroundColor: cardBg, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
      {/* Toast */}
      {showToast && (
        <Animated.View style={[hStyles.toast, {
          backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.96)',
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }],
        }]}>
          <Text style={[hStyles.toastText, { color: lastAmount > 0 ? '#10B981' : '#EF4444' }]}>
            {lastAmount > 0 ? `+${lastAmount}ml` : `${lastAmount}ml`}
          </Text>
        </Animated.View>
      )}

      {/* FlatList-style scroll natif — ultra-fluide iOS */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePageScroll}
        scrollEventThrottle={16}
        bounces={false}
        nestedScrollEnabled
        snapToInterval={H_CARD_PAGE_W}
        snapToAlignment="start"
        decelerationRate="fast"
      >

          {/* ═══ PAGE 1: Bouteille + Boutons ═══ */}
          <View style={{ width: H_CARD_PAGE_W, paddingHorizontal: 14 }}>
            <View style={hStyles.header}>
              <View style={hStyles.titleRow}>
                <Droplet size={13} color={accentColor} fill={accentColor} />
                <Text style={[hStyles.title, { color: colors.textMuted }]}>Hydratation</Text>
              </View>
              <TouchableOpacity onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/hydration'); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="settings-outline" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Bouteille + Graduations collées (tout en SVG) */}
            <TouchableOpacity onPress={() => router.push('/hydration')} activeOpacity={0.7} style={hStyles.bottleArea}>
              {(() => {
                const PAD_L = 32; // espace pour labels gauche (0.5L, 1.5L...)
                const PAD_R = 24; // espace pour labels droite (1L, 2L...)
                const svgW = PAD_L + bW + PAD_R;
                const svgH = bH;
                const oX = PAD_L; // offset X de la bouteille
                // Recalculer le path de la bouteille décalé
                const shiftedBottlePath = `M ${oX+neckX} ${neckH} L ${oX+neckX} 2 Q ${oX+neckX} 0 ${oX+neckX+3} 0 L ${oX+neckX+neckW-3} 0 Q ${oX+neckX+neckW} 0 ${oX+neckX+neckW} 2 L ${oX+neckX+neckW} ${neckH} Q ${oX+bW} ${neckH} ${oX+bW-cR} ${neckH+cR} L ${oX+bW-cR} ${bH-cR} Q ${oX+bW-cR} ${bH} ${oX+bW-cR*2} ${bH} L ${oX+cR*2} ${bH} Q ${oX+cR} ${bH} ${oX+cR} ${bH-cR} L ${oX+cR} ${neckH+cR} Q ${oX} ${neckH} ${oX+neckX} ${neckH} Z`;
                const shiftedWaterPath = () => {
                  if (clampedFill <= 0) return '';
                  let p = `M ${oX} ${bH} L ${oX} ${waterTopY}`;
                  for (let x = 0; x <= bW; x += 2) { p += ` L ${oX+x} ${waterTopY + Math.sin((x / bW) * Math.PI * 2 + waveOffset) * 2.5}`; }
                  return p + ` L ${oX+bW} ${bH} Z`;
                };
                const bottleLeftEdge = oX + cR; // bord gauche du corps
                const bottleRightEdge = oX + bW - cR; // bord droit du corps
                return (
                  <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
                    <Defs>
                      <SvgLinearGradient id="hWG" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={accentColor} stopOpacity="1" />
                        <Stop offset="1" stopColor={accentColor} stopOpacity="0.45" />
                      </SvgLinearGradient>
                      <ClipPath id="hBC"><Path d={shiftedBottlePath} /></ClipPath>
                    </Defs>
                    <Path d={shiftedBottlePath} fill={`${accentColor}08`} />
                    {/* Lignes internes de graduation */}
                    {allGradSteps.map((v) => {
                      const posY = bH - ((v / goalL) * bodyH);
                      if (posY < neckH + 3 || posY > bH - 3) return null;
                      return <Path key={`g${v}`} d={`M ${oX+leftX} ${posY} L ${oX+rightX} ${posY}`} stroke={accentColor} strokeWidth={v === Math.floor(v) ? 1.2 : 0.6} opacity={v === Math.floor(v) ? 0.3 : 0.15} strokeDasharray={v === Math.floor(v) ? '' : '3,3'} clipPath="url(#hBC)" />;
                    })}
                    {clampedFill > 0 && <Path d={shiftedWaterPath()} fill="url(#hWG)" clipPath="url(#hBC)" />}
                    {bubblePositions.map(b => <SvgCircle key={b.id} cx={oX+b.x} cy={b.y} r={b.size} fill="white" opacity={0.6} />)}
                    <Path d={shiftedBottlePath} fill="none" stroke={accentColor} strokeWidth={2} opacity={0.5} />
                    {/* GAUCHE : demi-valeurs (0.5L, 1.5L, 2.5L...) - tirets collés */}
                    {leftGradLabels.map(({ v, posY, label }) => (
                      <G key={`left${v}`}>
                        <Line x1={bottleLeftEdge - 7} y1={posY} x2={bottleLeftEdge} y2={posY} stroke="#000000" strokeWidth={2} />
                        <SvgText x={bottleLeftEdge - 9} y={posY + 3.5} textAnchor="end" fontSize={9} fontWeight="500" fill="#000000">{label}</SvgText>
                      </G>
                    ))}
                    {/* DROITE : entiers (1L, 2L, 3L...) - tirets collés */}
                    {rightGradLabels.map(({ v, posY, label }) => (
                      <G key={`right${v}`}>
                        <Line x1={bottleRightEdge} y1={posY} x2={bottleRightEdge + 7} y2={posY} stroke="#000000" strokeWidth={2} />
                        <SvgText x={bottleRightEdge + 9} y={posY + 3.5} textAnchor="start" fontSize={10} fontWeight="500" fill="#000000">{label}</SvgText>
                      </G>
                    ))}
                  </Svg>
                );
              })()}
            </TouchableOpacity>

            {/* Valeur */}
            <View style={hStyles.valueCenter}>
              <Text style={[hStyles.bigValue, { color: goalReached ? '#10B981' : colors.textPrimary }]}>
                {hydration < 1000 ? `${Math.round(hydration)}ml` : `${parseFloat((hydration / 1000).toFixed(2))}L`}
                <Text style={[hStyles.gradInline, { color: colors.textMuted }]}> / {parseFloat((safeGoal / 1000).toFixed(2))}L</Text>
              </Text>
            </View>

            {/* Progress bar */}
            <View style={[hStyles.progressTrack, { backgroundColor: isDark ? 'rgba(6,182,212,0.1)' : 'rgba(6,182,212,0.08)' }]}>
              <View style={[hStyles.progressFill, { width: `${pct}%`, backgroundColor: accentColor }]} />
            </View>
            <Text style={[hStyles.pctText, { color: accentColor }]}>{pct}%</Text>

            {/* Boutons */}
            <View style={hStyles.buttons}>
              <TouchableOpacity style={[hStyles.btnMinus, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)' }]} onPress={() => handleAdd(-250)}>
                <Minus size={14} color="#EF4444" strokeWidth={2.5} />
              </TouchableOpacity>
              <TouchableOpacity style={[hStyles.btn, { backgroundColor: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.05)' }]} onPress={() => handleAdd(250)}>
                <Text style={{ color: '#06B6D4', fontWeight: '400', fontSize: 11 }}>+250</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[hStyles.btn, { backgroundColor: isDark ? 'rgba(6,182,212,0.12)' : 'rgba(6,182,212,0.08)' }]} onPress={() => handleAdd(500)}>
                <Text style={{ color: '#06B6D4', fontWeight: '400', fontSize: 11 }}>+500</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[hStyles.btn, { backgroundColor: isDark ? 'rgba(6,182,212,0.16)' : 'rgba(6,182,212,0.1)' }]} onPress={() => handleAdd(1000)}>
                <Text style={{ color: '#06B6D4', fontWeight: '400', fontSize: 11 }}>+1L</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ═══ PAGE 2: Cette semaine ═══ */}
          <View style={{ width: H_CARD_PAGE_W, paddingHorizontal: 14 }}>
            <View style={hStyles.header}>
              <View style={hStyles.titleRow}>
                <Calendar size={13} color="#8B5CF6" />
                <Text style={[hStyles.title, { color: colors.textMuted }]}>Cette semaine</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/hydration')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="stats-chart-outline" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 3 stats */}
            <View style={hStyles.statsRow}>
              <View style={hStyles.statItem}>
                <View style={[hStyles.statIconBg, { backgroundColor: '#10B98115' }]}>
                  <TrendingUp size={13} color="#10B981" />
                </View>
                <Text style={[hStyles.statValue, { color: colors.textPrimary }]}>{successRate}%</Text>
                <Text style={[hStyles.statLabel, { color: colors.textMuted }]}>Réussite</Text>
              </View>
              <View style={hStyles.statItem}>
                <View style={[hStyles.statIconBg, { backgroundColor: '#06B6D415' }]}>
                  <Droplet size={13} color="#06B6D4" />
                </View>
                <Text style={[hStyles.statValue, { color: colors.textPrimary }]}>{avgAmount.toFixed(1)}L</Text>
                <Text style={[hStyles.statLabel, { color: colors.textMuted }]}>Moy/jour</Text>
              </View>
              <View style={hStyles.statItem}>
                <View style={[hStyles.statIconBg, { backgroundColor: '#8B5CF615' }]}>
                  <Check size={13} color="#8B5CF6" />
                </View>
                <Text style={[hStyles.statValue, { color: colors.textPrimary }]}>{successDays}/7</Text>
                <Text style={[hStyles.statLabel, { color: colors.textMuted }]}>Réussis</Text>
              </View>
            </View>

            {/* Bar chart 7 jours */}
            <View style={hStyles.weekBars}>
              {dayLabels.map((day, i) => {
                const dayData = last7[6 - i];
                const dayPct = dayData ? Math.min((dayData.amount / dayData.goal) * 100, 100) : 0;
                const isToday = i === new Date().getDay() - 1 || (i === 6 && new Date().getDay() === 0);
                return (
                  <View key={i} style={hStyles.dayCol}>
                    <View style={[hStyles.barBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                      <View style={[hStyles.barFill, { height: `${dayPct}%`, backgroundColor: dayPct >= 100 ? '#10B981' : '#06B6D4' }]} />
                    </View>
                    <Text style={[hStyles.dayLabel, { color: isToday ? '#06B6D4' : colors.textMuted }, isToday && { fontWeight: '900' }]}>{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ═══ PAGE 3: Réglages ═══ */}
          <View style={{ width: H_CARD_PAGE_W, paddingHorizontal: 14 }}>
            <View style={hStyles.header}>
              <View style={hStyles.titleRow}>
                <Target size={13} color="#F59E0B" />
                <Text style={[hStyles.title, { color: colors.textMuted }]}>Réglages</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/hydration')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="open-outline" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[hStyles.settingLabel, { color: colors.textMuted }]}>Objectif quotidien</Text>
            <View style={hStyles.goalRow}>
              <TouchableOpacity style={[hStyles.goalBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setEditGoal(Math.max(0.5, editGoal - 0.25))}>
                <Minus size={18} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
              <View style={hStyles.goalDisplay}>
                <Text style={[hStyles.goalValue, { color: colors.textPrimary }]}>{parseFloat(editGoal.toFixed(2))}</Text>
                <Text style={[hStyles.goalUnit, { color: colors.textMuted }]}>litres</Text>
              </View>
              <TouchableOpacity style={[hStyles.goalBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setEditGoal(Math.min(5, editGoal + 0.25))}>
                <Plus size={18} color={colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[hStyles.saveBtn, { backgroundColor: goalSaved ? '#10B981' : '#06B6D4' }]} onPress={handleSaveGoal}>
              <Check size={14} color="#FFF" strokeWidth={3} />
              <Text style={hStyles.saveBtnText}>{goalSaved ? 'Enregistré !' : 'Enregistrer'}</Text>
            </TouchableOpacity>

            <View style={hStyles.notifSection}>
              <View style={hStyles.notifRow}>
                {notifEnabled ? <Bell size={14} color="#06B6D4" /> : <BellOff size={14} color={colors.textMuted} />}
                <Text style={[hStyles.notifLabel, { color: colors.textPrimary }]}>Rappels</Text>
                <Switch
                  value={notifEnabled}
                  onValueChange={handleToggleNotif}
                  trackColor={{ false: isDark ? '#333' : '#DDD', true: '#06B6D480' }}
                  thumbColor={notifEnabled ? '#06B6D4' : '#999'}
                  style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                />
              </View>
              {notifEnabled && (
                <Text style={[hStyles.notifHint, { color: colors.textMuted }]}>Matin, midi et soir</Text>
              )}
            </View>

            <TouchableOpacity style={[hStyles.moreBtn, { backgroundColor: isDark ? 'rgba(6,182,212,0.12)' : 'rgba(6,182,212,0.06)' }]} onPress={() => router.push('/hydration')}>
              <Text style={hStyles.moreBtnText}>Tous les paramètres</Text>
            </TouchableOpacity>
          </View>

      </ScrollView>

      {/* Dot indicators — ronds noirs comme la carte Poids */}
      <View style={hStyles.dots}>
        {[0, 1, 2].map(i => (
          <TouchableOpacity
            key={i}
            onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setCurrentPage(i); scrollRef.current?.scrollTo({ x: i * H_CARD_PAGE_W, animated: true }); }}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <View style={{
              width: currentPage === i ? 7 : 5,
              height: currentPage === i ? 7 : 5,
              borderRadius: 4,
              backgroundColor: currentPage === i
                ? (isDark ? '#FFFFFF' : '#1A1A2E')
                : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
            }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const hStyles = StyleSheet.create({
  card: {
    width: H_CARD_W,
    borderRadius: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  toast: {
    position: 'absolute', top: 10, left: 20, right: 20, alignSelf: 'center', zIndex: 100,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
    alignItems: 'center',
  },
  toastText: { fontSize: 14, fontWeight: '900' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { fontSize: 12, fontWeight: '700' },

  // Page 1: Bottle
  bottleArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  gradLabels: { position: 'relative', height: H_BOTTLE_H, width: 30, marginLeft: 2 },
  gradItem: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 2, left: 0 },
  gradDash: { height: 1.5, borderRadius: 1 },
  gradText: { fontWeight: '800' },
  // Nouvelles graduations gauche/droite
  gradLabelsLeft: { position: 'absolute', left: -2, top: 0, height: H_BOTTLE_H, width: 30 },
  gradLabelsRight: { position: 'absolute', right: -2, top: 0, height: H_BOTTLE_H, width: 26 },
  gradItemLeft: { position: 'absolute', flexDirection: 'row', alignItems: 'center', right: 0 },
  gradItemRight: { position: 'absolute', flexDirection: 'row', alignItems: 'center', left: 0 },
  gradDashTouch: { width: 8, height: 2, backgroundColor: '#000000', borderRadius: 1 },
  gradTextBold: { fontSize: 10, fontWeight: '500', marginHorizontal: 2 },
  valueCenter: { alignItems: 'center', marginBottom: 4 },
  bigValue: { fontSize: 24, fontWeight: '900', letterSpacing: -1.2, textAlign: 'center' },
  gradInline: { fontSize: 11, fontWeight: '600' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 2 },
  progressFill: { height: '100%', borderRadius: 2 },
  pctText: { fontSize: 10, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  buttons: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  btnMinus: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btn: { flex: 1, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnTextCyan: { color: '#06B6D4', fontWeight: '800', fontSize: 10 },
  btnTextWhite: { color: '#FFFFFF', fontWeight: '800', fontSize: 10 },

  // Page 2: Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statItem: { alignItems: 'center', gap: 3, flex: 1 },
  statIconBg: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 15, fontWeight: '900' },
  statLabel: { fontSize: 8, fontWeight: '600' },
  weekBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flex: 1, paddingTop: 4 },
  dayCol: { flex: 1, alignItems: 'center', gap: 3 },
  barBg: { width: 14, height: 70, borderRadius: 7, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 7 },
  dayLabel: { fontSize: 9, fontWeight: '600' },

  // Page 3: Settings
  settingLabel: { fontSize: 10, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 8 },
  goalBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  goalDisplay: { alignItems: 'center' },
  goalValue: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  goalUnit: { fontSize: 10, fontWeight: '600', marginTop: -2 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 10, marginBottom: 10,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  notifSection: { marginBottom: 6 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifLabel: { fontSize: 13, fontWeight: '700', flex: 1 },
  notifHint: { fontSize: 9, fontWeight: '500', marginTop: 2, marginLeft: 20 },
  moreBtn: { paddingVertical: 9, borderRadius: 10, alignItems: 'center', marginTop: 2 },
  moreBtnText: { color: '#06B6D4', fontSize: 11, fontWeight: '700' },

  // Dots
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 4, paddingBottom: 2 },
  dot: { height: 5, borderRadius: 3 },
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
  heightCm,
  userGoal: propUserGoal,
  weeklyReport,
  onAddWeight,
  onAddWater,
  onShareReport,
  refreshTrigger = 0,
}) => {
  const { colors, isDark, themeColor } = useTheme();
  const { t, locale } = useI18n();
  const { avatarImage: contextAvatarImage } = useAvatar();
  const [userGoal, setUserGoal] = useState<'lose' | 'maintain' | 'gain'>(propUserGoal || 'lose');
  const [bodyComposition, setBodyComposition] = useState<BodyComposition | null>(null);
  const [trainingCalories, setTrainingCalories] = useState(0);
  const [avatarImageUri, setAvatarImageUri] = useState<string | null>(null);
  const [poidsPage, setPoidsPage] = useState(0);
  const [sommeilPage, setSommeilPage] = useState(0);
  const [chargePage, setChargePage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // ── Animations Sommeil ──
  const sleepMoonFloat = useRef(new Animated.Value(0)).current;
  const sleepStar1 = useRef(new Animated.Value(0.3)).current;
  const sleepStar2 = useRef(new Animated.Value(0.6)).current;
  const sleepStar3 = useRef(new Animated.Value(0.4)).current;
  const sleepZzz1Op = useRef(new Animated.Value(0)).current;
  const sleepZzz1Y = useRef(new Animated.Value(0)).current;
  const sleepZzz2Op = useRef(new Animated.Value(0)).current;
  const sleepZzz2Y = useRef(new Animated.Value(0)).current;
  const sleepZzz3Op = useRef(new Animated.Value(0)).current;
  const sleepZzz3Y = useRef(new Animated.Value(0)).current;
  const sleepBreathe = useRef(new Animated.Value(1)).current;

  // ── Animations Charge ──
  const chargePulse = useRef(new Animated.Value(1)).current;
  const chargeWave = useRef(new Animated.Value(0)).current;
  const chargeZapScale = useRef(new Animated.Value(1)).current;
  const chargeZapOpacity = useRef(new Animated.Value(1)).current;

  // Calculer les calories des entraînements du jour (uniquement calories réelles)
  useEffect(() => {
    const loadTodayTrainings = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const trainings = await getTrainings(1);
        const todayTrainings = trainings.filter(t => t.date === today);

        let totalCals = 0;
        todayTrainings.forEach(training => {
          if (training.calories && training.calories > 0) {
            totalCals += training.calories;
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



  // Utiliser le startWeight passé en prop, sinon le poids le plus ancien de l'historique (dernier élément car trié du plus récent au plus ancien)
  const startWeight = propStartWeight || (weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : currentWeight);

  // Animation aiguille jauge poids (0 → progression réelle)
  const needleAnim = useRef(new Animated.Value(0)).current;
  const needleHasAnimated = useRef(false);

  useEffect(() => {
    if (currentWeight <= 0 || targetWeight <= 0) return;
    // Calcul progression: startWeight → targetWeight, ou on est?
    // Si currentWeight == targetWeight → 100% (1.0)
    // Si loin de l'objectif → proche de 0%
    const diff = Math.abs(currentWeight - targetWeight);
    const maxRange = Math.max(Math.abs(startWeight - targetWeight), 1);
    const progress = diff < 0.5 ? 1.0 : Math.max(0.05, Math.min(1.0, 1 - diff / maxRange));

    if (!needleHasAnimated.current) {
      // Première animation: part de 0 avec easing
      needleHasAnimated.current = true;
      Animated.timing(needleAnim, {
        toValue: progress,
        duration: 1400,
        delay: 500,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: false,
      }).start();
    } else {
      // Mise à jour silencieuse si les données changent
      Animated.timing(needleAnim, {
        toValue: progress,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [currentWeight, targetWeight, startWeight]);

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

  // Avatar from context - resolve to URI for SVG rendering
  useEffect(() => {
    if (contextAvatarImage) {
      const resolved = Image.resolveAssetSource(contextAvatarImage);
      setAvatarImageUri(resolved?.uri || null);
    }
  }, [contextAvatarImage]);

  // Check if share button was dismissed
  useEffect(() => {
  }, []);

  // ── Sommeil animations ──
  useEffect(() => {
    const anims: Animated.CompositeAnimation[] = [];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const float = Animated.loop(Animated.sequence([
      Animated.timing(sleepMoonFloat, { toValue: -4, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(sleepMoonFloat, { toValue: 4, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    float.start(); anims.push(float);
    const twinkle = (anim: Animated.Value, delay: number) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
    ]));
    [{ a: sleepStar1, d: 0 }, { a: sleepStar2, d: 300 }, { a: sleepStar3, d: 600 }].forEach(({ a, d }, i) => {
      const t = setTimeout(() => { const tw = twinkle(a, d); tw.start(); anims.push(tw); }, 100 + i * 50);
      timeouts.push(t);
    });
    const animZzz = (op: Animated.Value, ty: Animated.Value, delay: number) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(ty, { toValue: -15, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.timing(op, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    [{ o: sleepZzz1Op, y: sleepZzz1Y, d: 0 }, { o: sleepZzz2Op, y: sleepZzz2Y, d: 500 }, { o: sleepZzz3Op, y: sleepZzz3Y, d: 1000 }].forEach(({ o, y, d }, i) => {
      const t = setTimeout(() => { const z = animZzz(o, y, d); z.start(); anims.push(z); }, 250 + i * 50);
      timeouts.push(t);
    });
    const t7 = setTimeout(() => {
      const breathe = Animated.loop(Animated.sequence([
        Animated.timing(sleepBreathe, { toValue: 1.02, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sleepBreathe, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
      breathe.start(); anims.push(breathe);
    }, 400);
    timeouts.push(t7);
    return () => { anims.forEach(a => a.stop()); timeouts.forEach(t => clearTimeout(t)); };
  }, []);

  // ── Charge config ──
  const getChargeConfig = useCallback(() => {
    switch (workloadStatus) {
      case 'none': return { label: 'Repos', color: '#94A3B8', pct: 0, speed: 2000, icon: 'moon', msg: 'Aucune séance récente', msgShort: 'Pas de séance', advice: 'Tu peux t\'entraîner sans risque !', adviceShort: 'Prêt à foncer', rec: 'Ton corps est reposé. C\'est le moment idéal pour une bonne séance.', rest: '' };
      case 'light': return { label: 'Légère', color: '#10B981', pct: 30, speed: 1200, icon: 'shield', msg: 'Corps bien reposé', msgShort: 'Bien reposé', advice: 'Tu peux t\'entraîner à fond !', adviceShort: 'Feu vert total', rec: 'Ta récupération est excellente. Profites-en pour une séance intense.', rest: '12h' };
      case 'moderate': return { label: 'Modérée', color: '#F59E0B', pct: 65, speed: 800, icon: 'zap', msg: 'Corps sollicité', msgShort: 'Sollicité', advice: 'Entraîne-toi mais reste à l\'écoute', adviceShort: 'Prudence', rec: 'Tu peux continuer mais évite les séances trop longues. Pense à bien t\'étirer.', rest: '24h' };
      case 'intense': return { label: 'Élevée', color: '#EF4444', pct: 90, speed: 500, icon: 'alert', msg: 'Risque de blessure', msgShort: 'Attention', advice: 'Repose-toi, ton corps en a besoin', adviceShort: 'Repos conseillé', rec: 'Tu as beaucoup sollicité ton corps. Un jour de repos évitera une blessure.', rest: '48h' };
      default: return { label: 'Modérée', color: '#F59E0B', pct: 65, speed: 800, icon: 'zap', msg: 'Corps sollicité', msgShort: 'Sollicité', advice: 'Entraîne-toi mais reste à l\'écoute', adviceShort: 'Prudence', rec: 'Continue ta routine en restant attentif à ton corps.', rest: '24h' };
    }
  }, [workloadStatus]);
  const chargeConfig = getChargeConfig();

  // ── Charge animations ──
  useEffect(() => {
    const speed = chargeConfig.speed;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(chargePulse, { toValue: 1.1, duration: speed / 2, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(chargePulse, { toValue: 1, duration: speed / 2, easing: Easing.in(Easing.ease), useNativeDriver: true }),
    ]));
    pulse.start();
    const wave = Animated.loop(Animated.sequence([
      Animated.timing(chargeWave, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(chargeWave, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    wave.start();
    const zapSc = Animated.loop(Animated.sequence([
      Animated.timing(chargeZapScale, { toValue: 1.2, duration: speed / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(chargeZapScale, { toValue: 1, duration: speed / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    zapSc.start();
    const zapOp = Animated.loop(Animated.sequence([
      Animated.timing(chargeZapOpacity, { toValue: 0.6, duration: speed / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(chargeZapOpacity, { toValue: 1, duration: speed / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    zapOp.start();
    return () => { pulse.stop(); wave.stop(); zapSc.stop(); zapOp.stop(); };
  }, [chargeConfig.speed]);

  const chargeWaveOpacity = chargeWave.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] });

  const weightDiff = currentWeight - targetWeight;
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

  const cardBg = isDark
    ? 'rgba(255,255,255,0.06)'
    : '#FFFFFF';

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: isDark ? '#1A1A1E' : colors.accent, overflow: 'visible' }]}
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

          {/* GAUCHE - Photo de profil (forme selectionnee) */}
          <TouchableOpacity
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
            style={styles.leftSection}
          >
            <FramedProfilePhoto
              uri={profilePhoto}
              size={70}
              borderColor="#FFFFFF"
              borderWidth={2.5}
              placeholderIconSize={34}
            />
          </TouchableOpacity>

          {/* CENTRE - Texte */}
          <View style={styles.centerSection}>
            <Text style={[styles.greetingClean, { color: isDark ? 'rgba(255,255,255,0.6)' : '#FFFFFF' }]}>
              {getGreeting()}
            </Text>
            <Text style={[styles.nameClean, { color: '#FFFFFF' }]}>
              {userName}
            </Text>
          </View>

          {/* DROITE - Bouton Reglages */}
          <TouchableOpacity
            style={[styles.settingsBtn, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)',
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)',
            }]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              router.push('/(tabs)/settings');
            }}
            activeOpacity={0.7}
          >
            <Settings size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>

        </View>

        {/* CARTE RANG & CITATION - Premium Design */}
        <RankCitationCard streak={streak} dailyQuote={dailyQuote} avatarUri={avatarImageUri} />
      </View>

      {/* REPORT 2x2 - Poids, Hydratation, Sommeil, Charge */}
      <View style={styles.reportGrid}>
        {/* Rangée 1: Poids + Hydratation (même hauteur) */}
        <View style={styles.reportGridRow}>
        {/* Poids - Carte multi-pages swipeable (Jauge / Compo / Prédictions) */}
        {(() => {
          const POIDS_CARD_W = H_CARD_PAGE_W - 28;
          const poidsPages = 4;

          // Composition data - UNIQUEMENT les données saisies manuellement par l'user
          // On ignore bodyComposition venant d'Apple Health pour éviter les faux positifs
          const rawMuscle = muscleMass ?? null;
          const rawFatPct = bodyFat ?? null;
          const rawWaterPct = waterPercentage ?? null;
          const hasMuscle = rawMuscle != null && rawMuscle > 0;
          const hasFat = rawFatPct != null && rawFatPct > 0;
          const hasWater = rawWaterPct != null && rawWaterPct > 0;
          const muscleKg = hasMuscle ? rawMuscle : 0;
          const fatPct = hasFat ? rawFatPct : 0;
          const waterPct = hasWater ? rawWaterPct : 0;
          const fatKg = hasFat && currentWeight > 0 ? (fatPct / 100) * currentWeight : 0;
          const waterKg = hasWater && currentWeight > 0 ? (waterPct / 100) * currentWeight : 0;
          const musclePct = hasMuscle && currentWeight > 0 ? (muscleKg / currentWeight) * 100 : 0;

          // Rounded square arc helper for Daily Intake style
          const makeRoundedSquareArc = (size: number, progress: number, color: string, bgColor: string) => {
            const s = size;
            const sw = 4;
            const r = 10; // corner radius
            const offset = sw / 2;
            const inner = s - sw;
            // Total perimeter of the rounded rect
            const straight = (inner - 2 * r) * 4;
            const curved = 2 * Math.PI * r;
            const totalPerim = straight + curved;
            const dashLen = totalPerim * Math.min(progress, 1);
            const gapLen = totalPerim - dashLen;

            return (
              <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
                {/* Background rounded rect */}
                <Path
                  d={`M ${offset + r} ${offset} L ${s - offset - r} ${offset} Q ${s - offset} ${offset} ${s - offset} ${offset + r} L ${s - offset} ${s - offset - r} Q ${s - offset} ${s - offset} ${s - offset - r} ${s - offset} L ${offset + r} ${s - offset} Q ${offset} ${s - offset} ${offset} ${s - offset - r} L ${offset} ${offset + r} Q ${offset} ${offset} ${offset + r} ${offset}`}
                  fill="none"
                  stroke={bgColor}
                  strokeWidth={sw}
                />
                {/* Progress arc */}
                <Path
                  d={`M ${offset + r} ${offset} L ${s - offset - r} ${offset} Q ${s - offset} ${offset} ${s - offset} ${offset + r} L ${s - offset} ${s - offset - r} Q ${s - offset} ${s - offset} ${s - offset - r} ${s - offset} L ${offset + r} ${s - offset} Q ${offset} ${s - offset} ${offset} ${s - offset - r} L ${offset} ${offset + r} Q ${offset} ${offset} ${offset + r} ${offset}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={sw}
                  strokeDasharray={`${dashLen} ${gapLen}`}
                  strokeLinecap="round"
                />
              </Svg>
            );
          };

          return (
          <View style={[styles.reportGridCard, { backgroundColor: cardBg, flex: 1, padding: 0, overflow: 'hidden', borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            {/* Header fixe avec icone */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="scale-outline" size={14} color="#10B981" />
                <Text style={[styles.reportGridCardTitle, { color: colors.textMuted }]}>Poids</Text>
              </View>
              <View style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
              }}>
                <Text style={{ fontSize: 7, fontWeight: '800', color: isDark ? '#FFFFFF' : '#1A1A2E', textTransform: 'uppercase', letterSpacing: 0.2 }}>
                  {userGoal === 'lose' ? 'Perte de poids' : userGoal === 'gain' ? 'Prise de poids' : 'Maintien du poids'}
                </Text>
              </View>
            </View>

            {/* ScrollView horizontal — scroll natif ultra-fluide */}
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const pageW = e.nativeEvent.layoutMeasurement.width;
                const page = Math.round(x / pageW);
                if (page !== poidsPage) setPoidsPage(page);
              }}
              scrollEventThrottle={16}
              bounces={false}
              decelerationRate="fast"
              nestedScrollEnabled
            >
              {/* ═══ PAGE 1: Arc progression perte de poids ═══ */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/(tabs)/stats?tab=poids'); }}
                style={{ width: H_CARD_PAGE_W, paddingHorizontal: 14, paddingVertical: 6, justifyContent: 'center' }}
              >
                {(() => {
                  // Calcul progression - seulement si objectif defini
                  const hasGoal = targetWeight > 0 && targetWeight !== currentWeight;
                  const totalToLose = hasGoal ? Math.abs(startWeight - targetWeight) : 0;
                  const lost = hasGoal
                    ? (userGoal === 'gain'
                      ? Math.max(0, currentWeight - startWeight)
                      : Math.max(0, startWeight - currentWeight))
                    : 0;
                  const remaining = hasGoal
                    ? (userGoal === 'gain'
                      ? Math.max(0, targetWeight - currentWeight)
                      : Math.max(0, currentWeight - targetWeight))
                    : 0;
                  const progress = totalToLose > 0 ? Math.min(1, lost / totalToLose) : 0;

                  // Arc semi-circulaire avec 10 segments pilules epais
                  const AW = 180;
                  const AH = 100;
                  const acx = AW / 2;
                  const acy = AH;
                  const arcRadius = 70;
                  const totalSegments = 10;
                  const filledSegments = Math.round(progress * totalSegments);
                  const pillW = 11;
                  const pillH = 26;
                  const pillR = 5.5;
                  const emptyColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';

                  return (
                    <View style={{ alignItems: 'center' }}>
                      {/* Arc + poids centre dedans */}
                      <View style={{ width: AW, height: AH + 14, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Svg width={AW} height={AH + 14} viewBox={`0 0 ${AW} ${AH + 14}`} style={{ position: 'absolute', top: 0, left: 0 }}>
                          {Array.from({ length: totalSegments }, (_, i) => {
                            const angle = Math.PI - (i / (totalSegments - 1)) * Math.PI;
                            const px = acx + arcRadius * Math.cos(angle);
                            const py = acy - arcRadius * Math.sin(angle);
                            const rotDeg = 90 - (angle * 180 / Math.PI);
                            const isFilled = i < filledSegments;
                            return (
                              <G key={i} transform={`translate(${px}, ${py}) rotate(${rotDeg})`}>
                                <SvgRect
                                  x={-pillW / 2}
                                  y={-pillH / 2}
                                  width={pillW}
                                  height={pillH}
                                  rx={pillR}
                                  ry={pillR}
                                  fill={isFilled ? colors.accent : emptyColor}
                                />
                              </G>
                            );
                          })}
                        </Svg>
                        {/* Poids centre dans l'arc */}
                        <View style={{ marginBottom: 2, alignItems: 'center' }}>
                          <Text style={{ fontSize: 28, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', letterSpacing: -0.5 }}>
                            {currentWeight > 0 ? currentWeight.toFixed(1) : '--'}
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textMuted }}> kg</Text>
                          </Text>
                          <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted, textAlign: 'center', marginTop: -1 }}>
                            {!hasGoal ? 'Definis ton objectif' : progress > 0 ? `${(progress * 100).toFixed(0)}% atteint` : 'Debut du parcours'}
                          </Text>
                        </View>
                      </View>

                      {/* 3 stats en bas : Perdu | Objectif | Reste - espacement egal */}
                      <View style={{ flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', width: '100%' }}>
                        {/* Perdu */}
                        <View style={{ alignItems: 'center', flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                            <TrendingDown size={9} color="#10B981" strokeWidth={2.5} />
                            <Text style={{ fontSize: 9, fontWeight: '700', color: '#10B981', textTransform: 'uppercase', letterSpacing: 0.5 }}>Perdu</Text>
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#10B981' }}>
                            {hasGoal ? lost.toFixed(1) : '0.0'}<Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted }}> kg</Text>
                          </Text>
                        </View>
                        {/* Objectif - cliquable pour definir */}
                        <TouchableOpacity
                          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/goals'); }}
                          activeOpacity={0.6}
                          style={{ alignItems: 'center', flex: 1 }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                            <Target size={9} color={colors.accent} strokeWidth={2.5} />
                            <Text style={{ fontSize: 9, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>Objectif</Text>
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                            {hasGoal ? targetWeight.toFixed(1) : '--'}<Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted }}> kg</Text>
                          </Text>
                        </TouchableOpacity>
                        {/* Reste */}
                        <View style={{ alignItems: 'center', flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                            <TrendingUp size={9} color="#EF4444" strokeWidth={2.5} />
                            <Text style={{ fontSize: 9, fontWeight: '700', color: '#EF4444', textTransform: 'uppercase', letterSpacing: 0.5 }}>Reste</Text>
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#EF4444' }}>
                            {hasGoal ? remaining.toFixed(1) : '--'}<Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted }}> kg</Text>
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </TouchableOpacity>

              {/* ═══ PAGE 3: Composition + Mini graphique scrollable ═══ */}
              <View style={{ width: H_CARD_PAGE_W, paddingHorizontal: 8, paddingBottom: 4 }}>
                {/* Composition compacte */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/(tabs)/stats?tab=corps'); }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, textAlign: 'center', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>Composition</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                    {/* Muscle */}
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        {makeRoundedSquareArc(44, hasMuscle ? musclePct / 100 : 0, '#EF4444', isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)')}
                        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                          <Dumbbell size={16} color="#EF4444" strokeWidth={2.2} />
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginTop: 3 }}>
                        {hasMuscle ? muscleKg.toFixed(1) : '--'}
                        <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted }}>{hasMuscle ? ' kg' : ''}</Text>
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444' }}>{hasMuscle ? `${musclePct.toFixed(0)}%` : '--%'}</Text>
                    </View>
                    {/* Graisse */}
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        {makeRoundedSquareArc(44, hasFat ? fatPct / 100 : 0, '#F59E0B', isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)')}
                        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                          {/* Icone personne ronde style silhouette */}
                          <Svg width={18} height={18} viewBox="0 0 32 32">
                            <SvgCircle cx={16} cy={7} r={4.5} fill="#F59E0B" />
                            <Path d="M8 28 C8 18, 8 14, 16 14 C24 14, 24 18, 24 28 Z" fill="#F59E0B" />
                            <SvgCircle cx={7} cy={20} r={3} fill="#F59E0B" />
                            <SvgCircle cx={25} cy={20} r={3} fill="#F59E0B" />
                          </Svg>
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginTop: 3 }}>
                        {hasFat ? fatKg.toFixed(1) : '--'}
                        <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted }}>{hasFat ? ' kg' : ''}</Text>
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#F59E0B' }}>{hasFat ? `${fatPct.toFixed(0)}%` : '--%'}</Text>
                    </View>
                    {/* Eau */}
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        {makeRoundedSquareArc(44, hasWater ? waterPct / 100 : 0, '#3B82F6', isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)')}
                        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                          <Droplet size={16} color="#3B82F6" strokeWidth={2.2} />
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginTop: 3 }}>
                        {hasWater ? waterKg.toFixed(1) : '--'}
                        <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted }}>{hasWater ? ' kg' : ''}</Text>
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6' }}>{hasWater ? `${waterPct.toFixed(0)}%` : '--%'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Mini graphique scrollable */}
                {weightHistory.length > 0 && (() => {
                  const last15 = weightHistory.slice(0, 15);
                  const maxW = Math.max(...last15);
                  const minW = Math.min(...last15);
                  const range = (maxW - minW) || 1;
                  return (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled={true}
                      style={{ marginTop: 6 }}
                      contentContainerStyle={{ alignItems: 'flex-end', paddingHorizontal: 2 }}
                    >
                      {last15.map((w, index) => {
                        const pct = 30 + ((w - minW) / range) * 60;
                        const today = new Date();
                        const d = new Date(today);
                        d.setDate(d.getDate() - index);
                        return (
                          <View key={`mc-${index}`} style={{ width: 30, alignItems: 'center', gap: 2 }}>
                            <Text style={{ fontSize: 7, fontWeight: '700', color: colors.textPrimary }}>{w.toFixed(1)}</Text>
                            <View style={{ width: 16, height: 50, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' }}>
                              <LinearGradient
                                colors={[colors.accent, colors.accent + '99']}
                                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                                style={{ width: '100%', height: `${pct}%`, borderRadius: 3, minHeight: 4 }}
                              />
                            </View>
                            <Text style={{ fontSize: 7, fontWeight: '600', color: colors.textMuted }}>{d.getDate()}</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  );
                })()}
              </View>

              {/* ═══ PAGE 4: Prédictions ═══ */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/weight-predictions'); }}
                style={{ width: H_CARD_PAGE_W, paddingHorizontal: 14, paddingBottom: 8, justifyContent: 'center' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 10 }}>
                  <TrendingUp size={12} color="#8B5CF6" strokeWidth={2.5} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B5CF6', letterSpacing: 0.5, textTransform: 'uppercase' }}>Prédictions</Text>
                </View>
                <View style={{ gap: 8 }}>
                  {[
                    { label: '30 jours', months: 1 },
                    { label: '90 jours', months: 3 },
                    { label: '6 mois', months: 6 },
                    { label: '1 an', months: 12 },
                  ].map((p) => (
                    <View key={p.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>{p.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>
                        {weightHistory.length >= 2 && currentWeight > 0 ? `${calculatePrediction(p.months).toFixed(1)} kg` : '-- kg'}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>

              {/* ═══ PAGE 5: IMC (BMI) - Compteur balance ═══ */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/body-composition'); }}
                style={{ width: H_CARD_PAGE_W, paddingHorizontal: 6, paddingBottom: 4, justifyContent: 'center' }}
              >
                {(() => {
                  const bmi = heightCm && heightCm > 0 && currentWeight > 0 ? currentWeight / ((heightCm / 100) ** 2) : 0;

                  if (bmi === 0) {
                    return (
                      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
                        <Ionicons name="body-outline" size={24} color={colors.textMuted} />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 16 }}>
                          Renseigne ta taille{'\n'}dans ton profil
                        </Text>
                        <TouchableOpacity
                          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/profile'); }}
                          style={{ marginTop: 6, backgroundColor: colors.accent + '20', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.accent }}>Mon profil</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  // Category
                  let bmiLabel = '';
                  let bmiColor = '#22C55E';
                  if (bmi < 16) { bmiLabel = 'Dénutrition'; bmiColor = '#DC2626'; }
                  else if (bmi < 18.5) { bmiLabel = 'Maigreur'; bmiColor = '#F97316'; }
                  else if (bmi < 25) { bmiLabel = 'Normal'; bmiColor = '#22C55E'; }
                  else if (bmi < 30) { bmiLabel = 'Surpoids'; bmiColor = '#F97316'; }
                  else if (bmi < 35) { bmiLabel = 'Obésité I'; bmiColor = '#EF4444'; }
                  else if (bmi < 40) { bmiLabel = 'Obésité II'; bmiColor = '#DC2626'; }
                  else { bmiLabel = 'Obésité III'; bmiColor = '#991B1B'; }

                  // Gauge constants - BIGGER
                  const GW = 160;
                  const GH = 100;
                  const gcx = GW / 2;
                  const gcy = GH - 2;
                  const gr = 50;
                  const gsw = 14;
                  const BMI_MIN = 15;
                  const BMI_MAX = 40;
                  const clampedBmi = Math.max(BMI_MIN, Math.min(BMI_MAX, bmi));
                  const bmiProgress = (clampedBmi - BMI_MIN) / (BMI_MAX - BMI_MIN);

                  // Colored segments
                  const toArc = (v: number) => Math.max(0, Math.min(1, (v - BMI_MIN) / (BMI_MAX - BMI_MIN)));
                  const bmiSegs = [
                    { from: toArc(BMI_MIN), to: toArc(18.5), color: '#F97316' },
                    { from: toArc(18.5), to: toArc(25), color: '#22C55E' },
                    { from: toArc(25), to: toArc(30), color: '#F97316' },
                    { from: toArc(30), to: toArc(BMI_MAX), color: '#EF4444' },
                  ];
                  const makeBmiArc = (p1: number, p2: number) => {
                    const a1 = Math.PI * (1 - p1), a2 = Math.PI * (1 - p2);
                    return `M ${gcx + gr * Math.cos(a1)} ${gcy - gr * Math.sin(a1)} A ${gr} ${gr} 0 0 1 ${gcx + gr * Math.cos(a2)} ${gcy - gr * Math.sin(a2)}`;
                  };

                  // Label positions around the arc
                  const labelR = gr + gsw / 2 + 14;
                  const bmiLabelsArr = [15, 18, 25, 30, 35, 40];
                  const labelPositions = bmiLabelsArr.map(v => {
                    const p = (v - BMI_MIN) / (BMI_MAX - BMI_MIN);
                    const a = Math.PI * (1 - p);
                    return { v, x: gcx + labelR * Math.cos(a), y: gcy - labelR * Math.sin(a) };
                  });

                  // Needle
                  const needleAngle = Math.PI * (1 - bmiProgress);
                  const nLen = gr + gsw / 2;
                  const nx = gcx + nLen * Math.cos(needleAngle);
                  const ny = gcy - nLen * Math.sin(needleAngle);

                  // Legend categories
                  const cats = [
                    { label: 'Maigreur', color: '#F97316' },
                    { label: 'Normal', color: '#22C55E' },
                    { label: 'Surpoids', color: '#F97316' },
                    { label: 'Obésité', color: '#EF4444' },
                  ];

                  return (
                    <View style={{ alignItems: 'center' }}>
                      {/* Gauge SVG */}
                      <View style={{ width: GW, height: GH, overflow: 'visible', marginTop: 2 }}>
                        <Svg width={GW} height={GH} viewBox={`0 0 ${GW} ${GH}`} style={{ overflow: 'visible' }}>
                          {/* Background */}
                          <Path d={makeBmiArc(0, 1)} stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} strokeWidth={gsw + 4} fill="none" strokeLinecap="butt" />
                          {/* Colored segments */}
                          {bmiSegs.map((s, i) => (
                            <Path key={i} d={makeBmiArc(s.from, s.to)} stroke={s.color} strokeWidth={gsw} fill="none" strokeLinecap="butt" />
                          ))}
                          {/* Numbers around arc */}
                          {labelPositions.map((lp) => (
                            <SvgText key={lp.v} x={lp.x} y={lp.y + 3} fontSize={9} fontWeight="800" fill={isDark ? '#FFFFFF' : '#6B7280'} textAnchor="middle">{lp.v}</SvgText>
                          ))}
                          {/* Needle */}
                          <Line x1={gcx} y1={gcy} x2={nx} y2={ny} stroke={isDark ? '#FFFFFF' : '#1A1A2E'} strokeWidth={3} strokeLinecap="round" />
                          {/* Center pivot */}
                          <SvgCircle cx={gcx} cy={gcy} r={5} fill={isDark ? '#1A1A2E' : '#FFFFFF'} stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'} strokeWidth={2} />
                        </Svg>
                      </View>

                      {/* Value + label */}
                      <Text style={{ fontSize: 26, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', letterSpacing: -0.5, marginTop: 2 }}>
                        {bmi.toFixed(1)}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: bmiColor, textAlign: 'center', marginTop: 0 }}>{bmiLabel}</Text>

                      {/* Legend: thick bars + labels */}
                      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        {cats.map((c) => (
                          <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{ width: 16, height: 5, borderRadius: 2.5, backgroundColor: c.color }} />
                            <Text style={{ fontSize: 8, fontWeight: '700', color: colors.textMuted }}>{c.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })()}
              </TouchableOpacity>
            </ScrollView>

            {/* Dots indicator */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, paddingBottom: 6, paddingTop: 2 }}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={{
                  width: poidsPage === i ? 7 : 5,
                  height: poidsPage === i ? 7 : 5,
                  borderRadius: poidsPage === i ? 3.5 : 2.5,
                  backgroundColor: poidsPage === i
                    ? (isDark ? '#FFFFFF' : '#1A1A2E')
                    : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                }} />
              ))}
            </View>
          </View>
          );
        })()}

        {/* Hydratation - bouteille SVG animée */}
        <HydrationGridCard
          hydration={hydration}
          hydrationGoal={hydrationGoal}
          onAddWater={onAddWater}
          colors={colors}
          isDark={isDark}
        />
        </View>

        {/* Rangée 2: Sommeil + Charge (même hauteur) */}
        <View style={styles.reportGridRow}>
        {/* ═══ SOMMEIL - 3 pages swipeable ═══ */}
        {(() => {
          const CARD_W = H_CARD_PAGE_W;
          const sleepStatus = sleepHours === 0 ? { text: 'Aucune donnée', color: '#9CA3AF' } : sleepHours >= 7 ? { text: 'Excellent', color: '#10B981' } : sleepHours >= 5 ? { text: 'Correct', color: '#F59E0B' } : { text: 'Insuffisant', color: '#EF4444' };
          const sleepQuality = sleepGoal > 0 ? Math.min(Math.round((sleepHours / sleepGoal) * 100), 100) : 0;
          const sleepMinutes = Math.round((sleepHours % 1) * 60);
          const sleepH = Math.floor(sleepHours);
          // Couleurs bleu nuit
          const NIGHT = '#1E3A5F';
          const NIGHT_MID = '#2563EB';
          const NIGHT_LIGHT = '#60A5FA';
          const NIGHT_SOFT = '#93C5FD';
          const STAR_COLOR = '#FDE68A';
          const MOON_COLOR = '#FBBF24';
          return (
          <View style={[styles.reportGridCard, { backgroundColor: cardBg, flex: 1, padding: 0, overflow: 'hidden', borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            {/* Header avec bouton + */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Moon size={14} color={NIGHT_MID} />
                <Text style={[styles.reportGridCardTitle, { color: colors.textMuted }]}>Sommeil</Text>
              </View>
              <TouchableOpacity onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/sleep-input'); }} activeOpacity={0.7}
                style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: NIGHT_MID, justifyContent: 'center', alignItems: 'center' }}>
                <Plus size={14} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(e) => { setSommeilPage(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width)); }} scrollEventThrottle={16}>
              {/* ── Page 1: Ciel étoilé pleine largeur + Valeur ── */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/sleep'); }} style={{ width: CARD_W, paddingBottom: 6 }}>
                <View style={{ height: 100, justifyContent: 'center', alignItems: 'center', position: 'relative', marginTop: 2 }}>
                  {/* Fond ciel nuit - pleine largeur */}
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 10, borderRadius: 0, backgroundColor: isDark ? '#0F172A' : '#1E293B', overflow: 'hidden' }}>
                    <LinearGradient colors={isDark ? ['#0F172A', '#1E3A5F'] : ['#1E293B', '#1E3A5F']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                  </View>
                  {/* Etoiles dorees */}
                  <Animated.View style={{ position: 'absolute', top: 8, left: 14, opacity: sleepStar1 }}><Text style={{ fontSize: 6, color: STAR_COLOR }}>✦</Text></Animated.View>
                  <Animated.View style={{ position: 'absolute', top: 20, left: 32, opacity: sleepStar2 }}><Text style={{ fontSize: 4, color: STAR_COLOR }}>✦</Text></Animated.View>
                  <Animated.View style={{ position: 'absolute', top: 6, left: 55, opacity: sleepStar3 }}><Text style={{ fontSize: 5, color: STAR_COLOR }}>✦</Text></Animated.View>
                  <Animated.View style={{ position: 'absolute', top: 14, right: 18, opacity: sleepStar1 }}><Text style={{ fontSize: 6, color: STAR_COLOR }}>✦</Text></Animated.View>
                  <Animated.View style={{ position: 'absolute', top: 26, right: 34, opacity: sleepStar2 }}><Text style={{ fontSize: 4, color: '#E2E8F0' }}>✦</Text></Animated.View>
                  <Animated.View style={{ position: 'absolute', top: 8, right: 50, opacity: sleepStar3 }}><Text style={{ fontSize: 5, color: STAR_COLOR }}>✦</Text></Animated.View>
                  {/* Lune doree flottante */}
                  <Animated.View style={{ position: 'absolute', top: 6, right: 16, transform: [{ translateY: sleepMoonFloat }] }}>
                    <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill={MOON_COLOR} /></Svg>
                  </Animated.View>
                  {/* Scene lit en bleu nuit */}
                  <Animated.View style={{ marginTop: 16, transform: [{ scale: sleepBreathe }] }}>
                    <Svg width={72} height={44} viewBox="0 0 80 50">
                      <Path d="M 5 45 L 5 39" stroke={NIGHT_SOFT} strokeWidth="2.5" strokeLinecap="round" />
                      <Path d="M 75 45 L 75 39" stroke={NIGHT_SOFT} strokeWidth="2.5" strokeLinecap="round" />
                      <Path d="M 3 39 L 77 39" stroke={NIGHT_LIGHT} strokeWidth="3" strokeLinecap="round" />
                      <Ellipse cx="40" cy="34" rx="35" ry="5" fill={NIGHT_MID} opacity={0.6} />
                      <Ellipse cx="14" cy="30" rx="9" ry="4.5" fill={NIGHT_SOFT} opacity={0.7} />
                      <Ellipse cx="14" cy="29" rx="7" ry="3.5" fill="#DBEAFE" />
                      <Path d="M 8 31 Q 25 24 45 29 Q 60 33 70 31 L 70 36 Q 50 38 30 37 Q 15 35 8 36 Z" fill={NIGHT_LIGHT} opacity={0.7} />
                      <SvgCircle cx="18" cy="24" r="6.5" fill="#FDE68A" />
                      <Path d="M 13 21 Q 18 17 23 21" stroke="#92400E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      <Path d="M 15 24 Q 17 25 19 24" stroke="#78350F" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                      <Path d="M 16 27 Q 18 28 20 27" stroke="#78350F" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                      <Ellipse cx="28" cy="27" rx="3.5" ry="2" fill="#FDE68A" />
                    </Svg>
                  </Animated.View>
                  {/* ZzZ en bleu */}
                  <View style={{ position: 'absolute', top: 44, left: 55 }}>
                    <Animated.Text style={{ fontSize: 8, fontWeight: '900', fontStyle: 'italic', color: NIGHT_SOFT, position: 'absolute', left: 0, top: 0, opacity: sleepZzz1Op, transform: [{ translateY: sleepZzz1Y }] }}>z</Animated.Text>
                    <Animated.Text style={{ fontSize: 11, fontWeight: '900', fontStyle: 'italic', color: NIGHT_LIGHT, position: 'absolute', left: 6, top: -5, opacity: sleepZzz2Op, transform: [{ translateY: sleepZzz2Y }] }}>Z</Animated.Text>
                    <Animated.Text style={{ fontSize: 14, fontWeight: '900', fontStyle: 'italic', color: NIGHT_MID, position: 'absolute', left: 13, top: -12, opacity: sleepZzz3Op, transform: [{ translateY: sleepZzz3Y }] }}>Z</Animated.Text>
                  </View>
                </View>
                {/* Valeur + badge */}
                <View style={{ alignItems: 'center', marginTop: 2, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: colors.textPrimary, letterSpacing: -1 }}>{sleepHours > 0 ? `${sleepH}h${sleepMinutes.toString().padStart(2, '0')}` : '--'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <View style={{ backgroundColor: sleepStatus.color + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: sleepStatus.color }}>{sleepStatus.text}</Text>
                    </View>
                    {sleepGoal > 0 && (
                      <Text style={{ fontSize: 9, fontWeight: '500', color: colors.textMuted }}>Objectif {sleepGoal}h</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* ── Page 2: Métriques ── */}
              <View style={{ width: CARD_W, paddingHorizontal: 12, paddingBottom: 6, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {sleepDebt > 0 ? <AlertTriangle size={12} color="#EF4444" /> : <CheckCircle size={12} color="#10B981" />}
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>Dette</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: sleepDebt > 0 ? '#EF4444' : '#10B981', marginLeft: 'auto' }}>{sleepDebt > 0 ? `${sleepDebt.toFixed(1)}h` : '0h'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Moon size={12} color={NIGHT_MID} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>Qualité</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: sleepQuality >= 80 ? '#10B981' : sleepQuality >= 60 ? '#F59E0B' : '#EF4444', marginLeft: 'auto' }}>{sleepQuality}%</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Target size={12} color={NIGHT_MID} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted }}>Objectif</Text>
                  <View style={{ marginLeft: 'auto', backgroundColor: sleepHours >= sleepGoal ? '#10B98120' : '#F59E0B20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: sleepHours >= sleepGoal ? '#10B981' : '#F59E0B' }}>{sleepGoal}h</Text>
                  </View>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.1)', overflow: 'hidden' }}>
                  <LinearGradient colors={[NIGHT_MID, NIGHT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: '100%', width: `${Math.min(sleepQuality, 100)}%`, borderRadius: 3 }} />
                </View>
              </View>

              {/* ── Page 3: Tendance + Actions ── */}
              <View style={{ width: CARD_W, paddingHorizontal: 12, paddingBottom: 6, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Svg width={56} height={56} viewBox="0 0 60 60">
                    <SvgCircle cx="30" cy="30" r="25" stroke={isDark ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.1)'} strokeWidth="5" fill="none" />
                    <SvgCircle cx="30" cy="30" r="25" stroke={NIGHT_MID} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={`${(sleepQuality / 100) * 157} 157`} transform="rotate(-90 30 30)" />
                  </Svg>
                  <View style={{ position: 'absolute', alignItems: 'center' }}><Text style={{ fontSize: 13, fontWeight: '900', color: NIGHT_MID }}>{sleepQuality}%</Text></View>
                </View>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted, textAlign: 'center', marginBottom: 6 }}>{sleepHours >= sleepGoal ? 'Objectif atteint !' : `Encore ${(sleepGoal - sleepHours).toFixed(1)}h`}</Text>
                {/* Boutons */}
                <TouchableOpacity onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/sleep-input'); }} activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: NIGHT_MID + '18', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 4 }}>
                  <Plus size={12} color={NIGHT_MID} strokeWidth={2.5} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: NIGHT_MID }}>Ajouter</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/sleep'); }} activeOpacity={0.7}>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted }}>Voir détails</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            {/* Dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, paddingBottom: 6, paddingTop: 2 }}>
              {[0, 1, 2].map(i => (<View key={i} style={{ width: sommeilPage === i ? 8 : 6, height: sommeilPage === i ? 8 : 6, borderRadius: sommeilPage === i ? 4 : 3, backgroundColor: sommeilPage === i ? (isDark ? '#FFFFFF' : '#1A1A2E') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)') }} />))}
            </View>
          </View>
          );
        })()}

        {/* ═══ CHARGE - 3 pages swipeable ═══ */}
        {(() => {
          const CARD_W = H_CARD_PAGE_W;
          const cc = chargeConfig;
          return (
          <View style={[styles.reportGridCard, { backgroundColor: cardBg, flex: 1, padding: 0, overflow: 'hidden', borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Activity size={14} color={cc.color} />
                <Text style={[styles.reportGridCardTitle, { color: colors.textMuted }]}>Forme</Text>
              </View>
              <View style={{ backgroundColor: cc.color + '18', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 7, fontWeight: '800', color: cc.color, textTransform: 'uppercase', letterSpacing: 0.2 }}>{cc.adviceShort}</Text>
              </View>
            </View>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(e) => { setChargePage(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width)); }} scrollEventThrottle={16}>
              {/* ── Page 1: Message principal clair ── */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/charge'); }} style={{ width: CARD_W, paddingHorizontal: 12, paddingBottom: 4 }}>
                {/* Emoji + animation pulsante */}
                <View style={{ height: 46, justifyContent: 'center', alignItems: 'center' }}>
                  <Animated.View style={{ transform: [{ scale: chargePulse }] }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cc.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                      {cc.icon === 'moon' ? <Moon size={20} color={cc.color} /> : cc.icon === 'shield' ? <CheckCircle size={20} color={cc.color} /> : cc.icon === 'zap' ? <Zap size={20} color={cc.color} /> : <AlertTriangle size={20} color={cc.color} />}
                    </View>
                  </Animated.View>
                  {/* Onde */}
                  <Animated.View style={{ position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: cc.color, opacity: chargeWaveOpacity }} />
                </View>
                {/* Message humain principal */}
                <Text style={{ fontSize: 12, fontWeight: '800', color: cc.color, textAlign: 'center', marginTop: 2 }} numberOfLines={2}>{cc.advice}</Text>
                {/* Sous-texte */}
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted, textAlign: 'center', marginTop: 3 }}>{cc.msgShort}</Text>
              </TouchableOpacity>

              {/* ── Page 2: Jauge + explication ── */}
              <View style={{ width: CARD_W, paddingHorizontal: 12, paddingBottom: 4, justifyContent: 'center' }}>
                {/* Jauge visuelle */}
                <View style={{ alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
                    <Svg width={48} height={48} viewBox="0 0 60 60">
                      <SvgCircle cx="30" cy="30" r="25" stroke={isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.06)'} strokeWidth="5" fill="none" />
                      <SvgCircle cx="30" cy="30" r="25" stroke={cc.color} strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray={`${(cc.pct / 100) * 157} 157`} transform="rotate(-90 30 30)" />
                    </Svg>
                    <View style={{ position: 'absolute', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: cc.color }}>{cc.pct}%</Text>
                    </View>
                  </View>
                </View>
                {/* Niveau */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                  <Zap size={12} color={cc.color} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: cc.color }}>Charge {cc.label.toLowerCase()}</Text>
                </View>
                {/* Barre de charge */}
                <View style={{ height: 6, borderRadius: 3, backgroundColor: cc.color + '20', overflow: 'hidden', marginBottom: 6, marginTop: 4 }}>
                  <View style={{ height: '100%', width: `${Math.max(cc.pct, 2)}%`, borderRadius: 3, backgroundColor: cc.color }} />
                </View>
                {/* Explication courte */}
                <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted, textAlign: 'center' }} numberOfLines={2}>{cc.msg}</Text>
              </View>

              {/* ── Page 3: Conseil détaillé ── */}
              <TouchableOpacity activeOpacity={0.8} onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/charge'); }} style={{ width: CARD_W, paddingHorizontal: 10, paddingBottom: 4, justifyContent: 'center' }}>
                {/* Icône conseil */}
                <View style={{ alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: cc.color + '15', justifyContent: 'center', alignItems: 'center' }}>
                    <TrendingUp size={16} color={cc.color} strokeWidth={2.5} />
                  </View>
                </View>
                {/* Conseil complet */}
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textPrimary, textAlign: 'center', lineHeight: 14, marginBottom: 4 }} numberOfLines={4}>{cc.rec}</Text>
                {/* Temps de repos si applicable */}
                {cc.rest !== '' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: cc.color + '12', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'center', marginBottom: 4 }}>
                    <Clock size={10} color={cc.color} />
                    <Text style={{ fontSize: 9, fontWeight: '700', color: cc.color }}>Repos min: {cc.rest}</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/charge'); }} activeOpacity={0.7} style={{ alignSelf: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: colors.textMuted, textDecorationLine: 'underline' }}>En savoir plus</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </ScrollView>
            {/* Séparateur horizontal */}
            <View style={{ width: '80%', height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', alignSelf: 'center', marginTop: 4 }} />
            {/* Pas + Calories empilés (cliquable → page charge) */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/charge'); }} style={{ paddingHorizontal: 14, paddingTop: 5, paddingBottom: 2, gap: 2 }}>
              {/* Pas */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Footprints size={16} color={steps > 0 ? '#3B82F6' : colors.textMuted} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: steps > 0 ? '#3B82F6' : colors.textMuted }}>{steps > 0 ? steps.toLocaleString('fr-FR') : '--'}</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>pas</Text>
              </View>
              {/* Calories: HealthKit actives si dispo, sinon trainings DB */}
              {(() => {
                const displayCal = calories > 0 ? calories : trainingCalories;
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Flame size={16} color={displayCal > 0 ? '#F97316' : colors.textMuted} />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: displayCal > 0 ? '#F97316' : colors.textMuted }}>{displayCal > 0 ? displayCal.toLocaleString('fr-FR') : '--'}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted }}>kcal</Text>
                  </View>
                );
              })()}
            </TouchableOpacity>
            {/* Dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, paddingBottom: 6, paddingTop: 2 }}>
              {[0, 1, 2].map(i => (<View key={i} style={{ width: chargePage === i ? 8 : 6, height: chargePage === i ? 8 : 6, borderRadius: chargePage === i ? 4 : 3, backgroundColor: chargePage === i ? (isDark ? '#FFFFFF' : '#1A1A2E') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)') }} />))}
            </View>
          </View>
          );
        })()}
        </View>
      </View>

      {/* Défis déplacés en page 2 du HomeTabView */}


      {/* RAPPORT HEBDOMADAIRE (Transféré de Analyse) */}
      {weeklyReport && (
        <View style={[styles.reportCard, { backgroundColor: cardBg, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
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

      {/* PAS / KCAL / SÉRIE et OUTILS supprimés - déplacés dans onglet Menu */}

      {/* DÉFIS DU JOUR - Quêtes avec XP */}
      <View style={{ marginBottom: 16, marginTop: 8 }}>
        <HomeChallengesSection />
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
    paddingBottom: IS_SMALL_SCREEN ? 230 : 250,
  },
  // Grille 2x2
  reportGrid: {
    gap: 12,
    marginBottom: 16,
  },
  reportGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reportGridCard: {
    width: (SCREEN_WIDTH - CARD_PADDING * 2 - 12) / 2,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  reportGridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  reportGridIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportGridCardTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  reportGridCardValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  reportGridCardUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportGridCardSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  reportGridProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    marginTop: 10,
    overflow: 'hidden',
  },
  reportGridProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  reportGridChargeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
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
    width: 70,
    height: 70,
    borderRadius: 35,
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

  // DROITE - Bouton Reglages
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
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
