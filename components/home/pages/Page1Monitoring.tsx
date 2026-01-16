// ============================================
// PAGE 1 - MONITORING (Redesign Premium)
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Animated, FlatList } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { Sparkles, TrendingUp, TrendingDown, Minus, Target, Home, Grid, LineChart, Dumbbell, Apple, Droplet } from 'lucide-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AnimatedCounter from '@/components/AnimatedCounter';
import AvatarDisplay from '@/components/AvatarDisplay';
import { HydrationCardFullWidth } from '@/components/cards/HydrationCardFullWidth';
import { SleepCardFullWidth } from '@/components/cards/SleepCardFullWidth';
import { ChargeCardFullWidth } from '@/components/cards/ChargeCardFullWidth';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserSettings } from '@/lib/storage';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

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

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

export const Page1Monitoring: React.FC<Page1MonitoringProps> = ({
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
  const [userGoal, setUserGoal] = useState<'lose' | 'maintain' | 'gain'>('lose');
  const scrollViewRef = useRef<ScrollView>(null);

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
    if (userGoal === 'lose') return 'Perdu';
    if (userGoal === 'gain') return 'Pris';
    return 'Stable';
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
              <Text style={[styles.quoteBadgeTextTop, { color: isDark ? colors.accent : colors.textPrimary }]}>Citation du jour</Text>
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

        {/* STATS COMPACT ROW - Gradient Cards */}
        <View style={styles.statsRow}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <MaterialCommunityIcons name="walk" size={12} color="#FFFFFF" />
          <AnimatedCounter
            value={steps}
            style={styles.statValueWhite}
            duration={800}
          />
          <Text style={styles.statLabelWhite}>PAS</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#F97316', '#EA580C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <Ionicons name="flame" size={12} color="#FFFFFF" />
          <AnimatedCounter
            value={streak}
            style={styles.statValueWhite}
            duration={800}
          />
          <Text style={styles.statLabelWhite}>SÉRIE</Text>
        </LinearGradient>

        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <MaterialCommunityIcons name="lightning-bolt" size={12} color="#FFFFFF" />
          <AnimatedCounter
            value={level}
            style={styles.statValueWhite}
            duration={800}
          />
          <Text style={styles.statLabelWhite}>NIV</Text>
        </LinearGradient>

        <LinearGradient
          colors={[colors.accent, `${colors.accent}DD`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statCardGradient}
        >
          <MaterialCommunityIcons name="trophy" size={12} color={colors.textOnAccent} />
          <Text style={[styles.statValueWhite, { fontSize: 11, color: colors.textOnAccent }]} numberOfLines={1}>
            {rankName}
          </Text>
          <Text style={[styles.statLabelWhite, { color: colors.textOnAccent }]}>RANG</Text>
        </LinearGradient>
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
                Poids Actuel
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Target size={12} color="#EF4444" strokeWidth={2.5} />
                <Text style={[styles.weightSubtitle, { color: colors.textMuted }]}>
                  Objectif: {targetWeight} kg
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
            <Text style={[styles.metricTopLabel, { color: '#F59E0B' }]}>Reste</Text>
            <Text style={[styles.metricTopValue, { color: '#F59E0B' }]}>
              {Math.abs(weightDiff).toFixed(1)} kg
            </Text>
          </View>
        </View>

        {/* Composition corporelle */}
        <View style={[styles.bodyComposition, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <View style={styles.compositionItem}>
            <Dumbbell size={16} color="#EF4444" strokeWidth={2.5} />
            <View style={styles.compositionInfo}>
              <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>Muscle</Text>
              <Text style={[styles.compositionValue, { color: colors.textPrimary }]}>
                {currentWeight > 0 ? `${(currentWeight * 0.40).toFixed(1)} kg` : '--'}
              </Text>
              <Text style={[styles.compositionPercent, { color: '#EF4444' }]}>{currentWeight > 0 ? '40%' : '--%'}</Text>
            </View>
          </View>

          <View style={styles.compositionDivider} />

          <View style={styles.compositionItem}>
            <Apple size={16} color="#F59E0B" strokeWidth={2.5} />
            <View style={styles.compositionInfo}>
              <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>Graisse</Text>
              <Text style={[styles.compositionValue, { color: colors.textPrimary }]}>
                {currentWeight > 0 ? `${(currentWeight * 0.20).toFixed(1)} kg` : '--'}
              </Text>
              <Text style={[styles.compositionPercent, { color: '#F59E0B' }]}>{currentWeight > 0 ? '20%' : '--%'}</Text>
            </View>
          </View>

          <View style={styles.compositionDivider} />

          <View style={styles.compositionItem}>
            <Droplet size={16} color="#3B82F6" strokeWidth={2.5} />
            <View style={styles.compositionInfo}>
              <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>Eau</Text>
              <Text style={[styles.compositionValue, { color: colors.textPrimary }]}>
                {currentWeight > 0 ? `${(currentWeight * 0.40).toFixed(1)} kg` : '--'}
              </Text>
              <Text style={[styles.compositionPercent, { color: '#3B82F6' }]}>{currentWeight > 0 ? '40%' : '--%'}</Text>
            </View>
          </View>
        </View>
        </TouchableOpacity>

        {/* GRAPHIQUE SIMPLE SCROLLABLE AVEC FLATLIST */}
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
            const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
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

        {/* Prédictions */}
        <TouchableOpacity
          style={[styles.predictionsContainer, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)' }]}
          onPress={() => router.push('/weight-predictions')}
          activeOpacity={0.7}
        >
          <View style={styles.predictionsHeader}>
            <TrendingUp size={14} color="#8B5CF6" strokeWidth={2.5} />
            <Text style={[styles.predictionsTitle, { color: '#8B5CF6' }]}>
              Prédictions basées sur tes données
            </Text>
          </View>

          <View style={styles.predictionsRow}>
            <View style={styles.predictionItem}>
              <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>7 jours</Text>
              <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                {(currentWeight - (totalLoss / 30) * 7).toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.predictionDivider} />

            <View style={styles.predictionItem}>
              <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>30 jours</Text>
              <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                {(currentWeight - totalLoss).toFixed(1)} kg
              </Text>
            </View>

            <View style={styles.predictionDivider} />

            <View style={styles.predictionItem}>
              <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>90 jours</Text>
              <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                {(currentWeight - totalLoss * 3).toFixed(1)} kg
              </Text>
            </View>
          </View>
        </TouchableOpacity>
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
    gap: 4,
    marginBottom: 12,
    zIndex: 200,
  },
  statCardGradient: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: IS_VERY_SMALL_SCREEN ? 2 : 3,
    borderRadius: 12,
    gap: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValueWhite: {
    fontSize: IS_SMALL_SCREEN ? 14 : 16,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  statLabelWhite: {
    fontSize: IS_SMALL_SCREEN ? 8 : 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: 'rgba(255, 255, 255, 0.95)',
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

  // Composition corporelle
  bodyComposition: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: IS_SMALL_SCREEN ? 16 : 20, // Plus compact sur petits écrans
    paddingHorizontal: IS_SMALL_SCREEN ? 8 : 16,
    borderRadius: 18,
    marginBottom: 16,
  },
  compositionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  compositionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 4,
  },
  compositionInfo: {
    alignItems: 'center',
    gap: 4,
  },
  compositionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compositionValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  compositionPercent: {
    fontSize: 15,
    fontWeight: '800',
  },
  compositionDivider: {
    width: 1,
    height: 52,
    backgroundColor: 'rgba(0,0,0,0.1)',
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
});
