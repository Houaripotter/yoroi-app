import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Droplet,
  Scale,
  Dumbbell,
  Flame,
  Target,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  FitnessScoreData,
  ScoreHistoryEntry,
  SCORE_LEVELS,
} from '@/lib/fitnessScore';

// ============================================
// COMPOSANT SCORE DE FORME
// ============================================

interface FitnessScoreCardProps {
  data: FitnessScoreData | null;
  history?: ScoreHistoryEntry[];
  onPress?: () => void;
  compact?: boolean;
}

export const FitnessScoreCard: React.FC<FitnessScoreCardProps> = ({
  data,
  history = [],
  onPress,
  compact = false,
}) => {
  const { colors, gradients } = useTheme();

  // Animations
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (data) {
      // Animation du score
      Animated.timing(scoreAnim, {
        toValue: data.score,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // REQUIS: utilisé pour interpoler le nombre affiché (text content)
      }).start();

      // Animation de la barre de progression
      Animated.timing(progressAnim, {
        toValue: data.score / 100,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // REQUIS: utilisé pour interpoler width de barre (layout property)
      }).start();

      // Pulse si excellent
      let pulseAnimation: Animated.CompositeAnimation | null = null;
      if (data.level === 'excellent') {
        pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        pulseAnimation.start();
      }

      return () => {
        if (pulseAnimation) {
          pulseAnimation.stop();
        }
      };
    }
  }, [data]);

  if (!data) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Calcul du score...
        </Text>
      </View>
    );
  }

  const animatedScore = scoreAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0', '100'],
  });

  const animatedProgress = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const scoreColor = data.color;

  // Rendu compact
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.compactScoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.compactIcon]}>{data.icon}</Text>
          <Text style={[styles.compactScore, { color: scoreColor }]}>{data.score}</Text>
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactLabel, { color: colors.textSecondary }]}>Score Forme</Text>
          <Text style={[styles.compactLevel, { color: scoreColor }]}>{data.label}</Text>
        </View>
        {data.scoreDiff !== undefined && data.scoreDiff !== 0 && (
          <View style={[styles.compactDiff, { backgroundColor: data.scoreDiff > 0 ? colors.successMuted : colors.dangerMuted }]}>
            {data.scoreDiff > 0 ? (
              <TrendingUp size={12} color={colors.success} />
            ) : (
              <TrendingDown size={12} color={colors.danger} />
            )}
            <Text style={[styles.compactDiffText, { color: data.scoreDiff > 0 ? colors.success : colors.danger }]}>
              {data.scoreDiff > 0 ? '+' : ''}{data.scoreDiff}
            </Text>
          </View>
        )}
        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Ton Score Forme</Text>
        {data.scoreDiff !== undefined && data.scoreDiff !== 0 && (
          <View style={[styles.diffBadge, { backgroundColor: data.scoreDiff > 0 ? colors.successMuted : colors.dangerMuted }]}>
            {data.scoreDiff > 0 ? (
              <TrendingUp size={14} color={colors.success} />
            ) : (
              <TrendingDown size={14} color={colors.danger} />
            )}
            <Text style={[styles.diffText, { color: data.scoreDiff > 0 ? colors.success : colors.danger }]}>
              {data.scoreDiff > 0 ? '+' : ''}{data.scoreDiff} pts vs hier
            </Text>
          </View>
        )}
      </View>

      {/* Score central */}
      <Animated.View style={[styles.scoreContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.scoreIcon}>{data.icon}</Text>
        <Animated.Text style={[styles.scoreValue, { color: scoreColor }]}>
          {Math.round(data.score)}
        </Animated.Text>
        <Text style={[styles.scoreLabel, { color: scoreColor }]}>{data.label.toUpperCase()}</Text>
      </Animated.View>

      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBg, { backgroundColor: colors.cardHover }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: scoreColor,
                width: animatedProgress,
              },
            ]}
          />
          {/* Marqueurs de niveau */}
          <View style={[styles.levelMarker, { left: '30%', backgroundColor: colors.border }]} />
          <View style={[styles.levelMarker, { left: '50%', backgroundColor: colors.border }]} />
          <View style={[styles.levelMarker, { left: '70%', backgroundColor: colors.border }]} />
          <View style={[styles.levelMarker, { left: '85%', backgroundColor: colors.border }]} />
        </View>
      </View>

      {/* Breakdown mini */}
      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownItem}>
          <Scale size={14} color={data.breakdown.weighedToday > 0 ? colors.success : colors.textMuted} />
          <Text style={[styles.breakdownText, { color: data.breakdown.weighedToday > 0 ? colors.success : colors.textMuted }]}>
            {data.breakdown.weighedToday > 0 ? '+10' : '0'}
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Dumbbell size={14} color={data.breakdown.trainedToday > 0 ? colors.success : colors.textMuted} />
          <Text style={[styles.breakdownText, { color: data.breakdown.trainedToday > 0 ? colors.success : colors.textMuted }]}>
            {data.breakdown.trainedToday > 0 ? '+15' : '0'}
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Droplet size={14} color={data.breakdown.hydration > 0 ? colors.info : colors.textMuted} />
          <Text style={[styles.breakdownText, { color: data.breakdown.hydration > 0 ? colors.info : colors.textMuted }]}>
            +{data.breakdown.hydration}
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Flame size={14} color={data.breakdown.streak > 0 ? colors.gold : colors.textMuted} />
          <Text style={[styles.breakdownText, { color: data.breakdown.streak > 0 ? colors.gold : colors.textMuted }]}>
            +{data.breakdown.streak}
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Target size={14} color={data.breakdown.weightTrend > 0 ? colors.success : data.breakdown.weightTrend < 0 ? colors.danger : colors.textMuted} />
          <Text style={[styles.breakdownText, { color: data.breakdown.weightTrend > 0 ? colors.success : data.breakdown.weightTrend < 0 ? colors.danger : colors.textMuted }]}>
            {data.breakdown.weightTrend > 0 ? '+' : ''}{data.breakdown.weightTrend}
          </Text>
        </View>
      </View>

      {/* Conseil */}
      <View style={[styles.adviceContainer, { backgroundColor: colors.cardHover }]}>
        <Text style={[styles.adviceText, { color: colors.textSecondary }]}>
          {data.advice}
        </Text>
      </View>

      {/* Mini graphique historique */}
      {history.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={[styles.historyTitle, { color: colors.textMuted }]}>7 derniers jours</Text>
          <View style={styles.historyBars}>
            {history.map((entry, index) => {
              const barHeight = entry.score > 0 ? Math.max(4, (entry.score / 100) * 40) : 4;
              const barColor = entry.score > 0
                ? SCORE_LEVELS[entry.level].color
                : colors.border;
              const isToday = index === history.length - 1;

              return (
                <View key={entry.date} style={styles.historyBarContainer}>
                  <View
                    style={[
                      styles.historyBar,
                      {
                        height: barHeight,
                        backgroundColor: barColor,
                        opacity: isToday ? 1 : 0.6,
                      },
                    ]}
                  />
                  <Text style={[styles.historyDay, { color: colors.textMuted }]}>
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'][new Date(entry.date).getDay()]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Score central
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // Barre de progression
  progressContainer: {
    marginBottom: 16,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 4,
  },
  levelMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
  },

  // Breakdown
  breakdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breakdownText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Conseil
  adviceContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  adviceText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Historique
  historyContainer: {
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 50,
  },
  historyBarContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 50,
  },
  historyBar: {
    width: 24,
    borderRadius: 4,
    minHeight: 4,
  },
  historyDay: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  // Compact
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  compactScoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactIcon: {
    fontSize: 16,
    position: 'absolute',
    top: 4,
  },
  compactScore: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
  },
  compactContent: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactLevel: {
    fontSize: 16,
    fontWeight: '700',
  },
  compactDiff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactDiffText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default FitnessScoreCard;
