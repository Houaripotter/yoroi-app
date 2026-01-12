// ============================================
// PAGE 1 - MONITORING (Dashboard)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, Animated } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Droplet, Moon, Zap, Sparkles, Flame, Trophy } from 'lucide-react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { HydrationCard2 } from '@/components/cards/HydrationCard2';
import { SleepLottieCard } from '@/components/cards/SleepLottieCard';
import { ChargeLottieCard } from '@/components/cards/ChargeLottieCard';
import AvatarDisplay from '@/components/AvatarDisplay';
import AnimatedCounter from '@/components/AnimatedCounter';
import AnimatedRank from '@/components/AnimatedRank';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;
const CHART_WIDTH = SCREEN_WIDTH - (CARD_PADDING * 4);
const CHART_HEIGHT = 100;

interface Page1MonitoringProps {
  userName?: string;
  profilePhoto?: string | null;
  dailyQuote?: string | null;

  // Stats compactes
  steps?: number;
  streak?: number;
  level?: number;
  rankName?: string;
  rankColor?: string;

  // Poids
  currentWeight?: number;
  targetWeight?: number;
  weightHistory?: number[];
  weightTrend?: 'up' | 'down' | 'stable';

  // Vitales
  hydration?: number;
  hydrationGoal?: number;
  sleepHours?: number;
  sleepDebt?: number;
  sleepGoal?: number;
  workloadStatus?: 'light' | 'moderate' | 'intense';

  // Callbacks
  onAddWeight?: () => void;
  onAddWater?: (ml: number) => void;
}

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
  workloadStatus = 'moderate',
  onAddWeight,
  onAddWater,
}) => {
  const { colors, isDark } = useTheme();

  // Salutation
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bonjour';
    if (hour >= 12 && hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  // Calculs poids
  const remaining = targetWeight - currentWeight;
  const chartData = weightHistory.length > 0 ? weightHistory.slice(-7) : [currentWeight];

  // Prédictions IA (basées sur la tendance)
  const getPredictions = () => {
    if (chartData.length < 3) return null;

    const firstWeight = chartData[0];
    const lastWeight = chartData[chartData.length - 1];
    const days = chartData.length;
    const dailyChange = (lastWeight - firstWeight) / days;

    return {
      day7: currentWeight + (dailyChange * 7),
      day30: currentWeight + (dailyChange * 30),
      day90: currentWeight + (dailyChange * 90),
    };
  };
  const predictions = getPredictions();

  // Génération courbe lissée
  const generateCurvePath = () => {
    if (chartData.length === 0) return { path: '', points: [] };

    const maxVal = Math.max(...chartData);
    const minVal = Math.min(...chartData);
    const range = maxVal - minVal || 1;

    const points = chartData.map((val, i) => ({
      x: (i / (chartData.length - 1 || 1)) * CHART_WIDTH,
      y: CHART_HEIGHT - ((val - minVal) / range) * (CHART_HEIGHT - 20),
      value: val,
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${curr.x} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return { path, points };
  };

  const { path: curvePath, points: curvePoints } = generateCurvePath();

  // Statuts
  const getWorkloadColor = () => {
    switch (workloadStatus) {
      case 'light': return '#10B981';
      case 'intense': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getWorkloadLabel = () => {
    switch (workloadStatus) {
      case 'light': return 'Léger';
      case 'intense': return 'Intense';
      default: return 'Modéré';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER - Avatar + Salutation + Photo de profil */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/avatar-selection')} activeOpacity={0.8}>
          <AvatarDisplay size="small" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {userName}
          </Text>
          {dailyQuote && (
            <View style={[styles.quoteCard, { backgroundColor: colors.backgroundCard }]}>
              <Sparkles size={10} color={colors.accent} />
              <Text style={[styles.quoteText, { color: colors.textSecondary }]} numberOfLines={1}>
                "{dailyQuote}"
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.profilePhoto, { borderColor: colors.border }]}
          onPress={() => router.push('/profile')}
          activeOpacity={0.8}
        >
          {profilePhoto ? (
            <Image
              source={{ uri: profilePhoto }}
              style={styles.profilePhotoImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={24} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* STATS COMPACTES - 4 cartes horizontales */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}
          onPress={() => router.push('/activity-detail')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="walk" size={14} color="#3B82F6" />
          <View style={styles.statTextColumn}>
            <AnimatedCounter value={steps} style={[styles.statValue, { color: '#3B82F6' }]} duration={800} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>pas</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}
          onPress={() => router.push('/gamification')}
          activeOpacity={0.8}
        >
          <Flame size={14} color="#F97316" />
          <View style={styles.statTextColumn}>
            <AnimatedCounter value={streak} style={[styles.statValue, { color: '#F97316' }]} duration={800} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>jours</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}
          onPress={() => router.push('/gamification')}
          activeOpacity={0.8}
        >
          <Zap size={14} color={colors.accent} />
          <View style={styles.statTextColumn}>
            <AnimatedCounter value={level} style={[styles.statValue, { color: colors.accent }]} duration={800} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>niveau</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}
          onPress={() => router.push('/gamification')}
          activeOpacity={0.8}
        >
          <Trophy size={14} color={rankColor} />
          <View style={styles.statTextColumn}>
            <AnimatedRank rank={rankName.split(' ')[0]} color={rankColor} style={styles.statValue} delay={300} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>rang</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* CARD POIDS EXPERT */}
      <View style={[styles.weightCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.weightHeader}>
          <View style={styles.weightMainSection}>
            <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
              {currentWeight > 0 ? currentWeight.toFixed(1) : '--.-'}
            </Text>
            <Text style={[styles.weightUnit, { color: colors.accent }]}>kg</Text>
          </View>

          <View style={styles.weightMetaSection}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Objectif</Text>
              <Text style={[styles.metaValue, { color: colors.accent }]}>
                {targetWeight > 0 ? targetWeight.toFixed(1) : '--.-'} kg
              </Text>
            </View>
            {Math.abs(remaining) > 0.1 && (
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Reste</Text>
                <Text style={[styles.metaValue, { color: remaining > 0 ? '#EF4444' : '#10B981' }]}>
                  {remaining > 0 ? '+' : ''}{remaining.toFixed(1)} kg
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Graphique courbe */}
        {chartData.length > 0 && (
          <View style={styles.chartContainer}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Defs>
                <SvgLinearGradient id="weightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#6366F1" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>

              <Path
                d={curvePath}
                stroke="url(#weightGradient)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {curvePoints.map((point, i) => (
                <Circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r={i === curvePoints.length - 1 ? 6 : 3}
                  fill={i === curvePoints.length - 1 ? '#8B5CF6' : colors.backgroundCard}
                  stroke="#6366F1"
                  strokeWidth={2}
                />
              ))}
            </Svg>
          </View>
        )}

        {/* Prédictions IA - PLUS VISIBLES */}
        {predictions && (
          <View style={[styles.predictionsFooter, {
            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'
          }]}>
            <Sparkles size={14} color="#8B5CF6" strokeWidth={2} />
            <Text style={[styles.predictionText, { color: colors.textPrimary }]}>
              <Text style={{ fontWeight: '700' }}>7j:</Text> {predictions.day7.toFixed(1)}kg •
              <Text style={{ fontWeight: '700' }}> 30j:</Text> {predictions.day30.toFixed(1)}kg •
              <Text style={{ fontWeight: '700' }}> 90j:</Text> {predictions.day90.toFixed(1)}kg
            </Text>
          </View>
        )}
      </View>

      {/* 3 CARTES AVEC ANIMATIONS */}
      <View style={styles.vitalsRow}>
        {/* Hydratation avec bouteille animée */}
        <View style={styles.vitalCardWrapper}>
          <HydrationCard2
            currentMl={hydration}
            goalMl={hydrationGoal}
            onAddMl={onAddWater}
          />
        </View>

        {/* Sommeil avec animation Lottie */}
        <View style={styles.vitalCardWrapper}>
          <SleepLottieCard
            hours={sleepHours}
            quality={0}
            debt={sleepDebt}
            goal={sleepGoal}
          />
        </View>

        {/* Charge avec animation Lottie */}
        <View style={styles.vitalCardWrapper}>
          <ChargeLottieCard
            level={workloadStatus === 'light' ? 'leger' : workloadStatus === 'intense' ? 'eleve' : 'modere'}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  quoteText: {
    fontSize: 10,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  profilePhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profilePhotoImage: {
    width: '100%',
    height: '100%',
  },

  // Stats Row Compact
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statTextColumn: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Carte Poids
  weightCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  weightMainSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weightValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
  },
  weightUnit: {
    fontSize: 18,
    fontWeight: '700',
  },
  weightMetaSection: {
    gap: 6,
    alignItems: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  chartContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  predictionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  predictionText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Métriques Vitales avec animations
  vitalsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  vitalCardWrapper: {
    flex: 1,
  },
});
