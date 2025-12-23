// ============================================
// YOROI - WEIGHT CARD PREMIUM
// ============================================
// Card spectaculaire affichant le poids et la progression
// Design Wellness Premium avec fond blanc et ombres fortes

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Target,
  TrendingDown,
  TrendingUp,
  Calendar,
  Scale,
  CheckCircle,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  calculateWeightProgress,
  formatWeightChange,
} from '@/utils/weightEstimation';

// ============================================
// TYPES
// ============================================

interface WeightCardProps {
  currentWeight: number;
  targetWeight: number;
  startWeight: number;
  previousWeight: number | null;
  weeklyAverage: number;
  onAddWeight: () => void;
}

// ============================================
// ANIMATED PROGRESS BAR
// ============================================

interface AnimatedProgressBarProps {
  progress: number;
  colors: any;
}

const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  colors,
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarBg, { backgroundColor: `${colors.gold}20` }]}>
        <Animated.View style={{ width: widthInterpolated, height: '100%' }}>
          <LinearGradient
            colors={[colors.gold, '#B8942F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressBarFill}
          />
        </Animated.View>
      </View>
      <Text style={[styles.progressPercent, { color: colors.gold }]}>
        {Math.round(progress)}%
      </Text>
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const WeightCard: React.FC<WeightCardProps> = ({
  currentWeight,
  targetWeight,
  startWeight,
  previousWeight,
  weeklyAverage,
  onAddWeight,
}) => {
  const { colors, isDark, themeName } = useTheme();
  const isWellness = false;

  // Calculate all progress
  const progress = calculateWeightProgress(
    currentWeight,
    targetWeight,
    startWeight,
    previousWeight,
    weeklyAverage
  );

  // Daily variation
  const dailyChange = previousWeight ? currentWeight - previousWeight : 0;
  const isLoss = dailyChange < 0;
  const hasChange = dailyChange !== 0;

  // Premium card shadow
  const cardShadow = {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isWellness ? 0.15 : (isDark ? 0.4 : 0.1),
    shadowRadius: 20,
    elevation: 10,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, cardShadow]}>
      {/* Current Weight - BIG */}
      <View style={styles.mainWeightContainer}>
        <Text style={[styles.mainWeight, { color: colors.textPrimary }]}>
          {currentWeight.toFixed(1)}
        </Text>
        <Text style={[styles.weightUnit, { color: colors.textSecondary }]}>kg</Text>
      </View>

      {/* Daily Change Pill */}
      {hasChange && (
        <View style={[
          styles.dailyChange,
          { backgroundColor: isLoss ? '#DCFCE7' : '#FEE2E2' }
        ]}>
          {isLoss ? (
            <TrendingDown size={14} color="#22C55E" />
          ) : (
            <TrendingUp size={14} color="#EF4444" />
          )}
          <Text style={[
            styles.dailyChangeText,
            { color: isLoss ? '#22C55E' : '#EF4444' }
          ]}>
            {formatWeightChange(dailyChange)} aujourd'hui
          </Text>
        </View>
      )}

      {/* Goal */}
      <View style={styles.targetContainer}>
        <Target size={16} color={colors.gold} />
        <Text style={[styles.targetText, { color: colors.textSecondary }]}>
          Objectif : <Text style={{ color: colors.gold, fontWeight: '700' }}>{targetWeight} kg</Text>
        </Text>
      </View>

      {/* Progress Bar */}
      <AnimatedProgressBar progress={progress.progressPercent} colors={colors} />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <CheckCircle size={14} color="#22C55E" />
          <Text style={[styles.statValue, { color: '#22C55E' }]}>
            {progress.isGaining ? '+' : '-'}{Math.abs(progress.weightLost).toFixed(1)} kg
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            {progress.isGaining ? 'pris' : 'perdus'}
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Clock size={14} color="#F97316" />
          <Text style={[styles.statValue, { color: '#F97316' }]}>
            {progress.isGaining ? '+' : '-'}{Math.abs(progress.weightRemaining).toFixed(1)} kg
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>restants</Text>
        </View>
      </View>

      {/* Estimated Date */}
      <View style={[styles.estimationContainer, { backgroundColor: `${colors.gold}15` }]}>
        <Calendar size={14} color={colors.gold} />
        <Text style={[styles.estimationText, { color: colors.textSecondary }]}>
          Estimation :{' '}
          <Text style={{ color: colors.gold, fontWeight: '700' }}>
            {progress.estimatedDate}
          </Text>
        </Text>
      </View>

      {/* Add Weight Button */}
      <TouchableOpacity
        onPress={onAddWeight}
        activeOpacity={0.8}
        style={styles.addButtonContainer}
      >
        <LinearGradient
          colors={['#00D9FF', '#0099CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.addButton}
        >
          <Scale size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>NOUVELLE PESEE</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ============================================
// STYLES - PREMIUM WELLNESS DESIGN
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 12,
  },

  // Main Weight
  mainWeightContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mainWeight: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Daily Change
  dailyChange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
  },
  dailyChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Target
  targetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  targetText: {
    fontSize: 15,
  },

  // Progress Bar
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  progressBarBg: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 45,
    textAlign: 'right',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 24,
  },

  // Estimation
  estimationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  estimationText: {
    fontSize: 14,
  },

  // Button
  addButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default WeightCard;
