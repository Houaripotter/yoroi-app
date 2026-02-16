import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import AnimatedSparkline from './AnimatedSparkline';

interface WeightCardProps {
  currentWeight: number;
  targetWeight?: number;
  date?: string;
  onPress?: () => void;
  history?: number[]; // Array of weight values for sparkline
}

export const WeightCard: React.FC<WeightCardProps> = ({
  currentWeight,
  targetWeight,
  date,
  onPress,
  history,
}) => {
  const { colors } = useTheme();
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const weightScaleAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée du poids (scale + fade)
    Animated.parallel([
      Animated.spring(weightScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de remplissage au démarrage avec easing smooth
    if (targetWeight && currentWeight) {
      const progress = Math.min(100, Math.abs((targetWeight - currentWeight) / targetWeight) * 100);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // REQUIS: utilisé pour interpoler width de barre (layout property)
      }).start();
    }
  }, [currentWeight, targetWeight]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const remaining = targetWeight && currentWeight ? Math.abs(targetWeight - currentWeight) : null;

  // Calculer la tendance
  const getTrend = () => {
    if (!history || history.length < 2) return null;
    const recent = history[0];
    const older = history[history.length - 1];
    const diff = recent - older;
    if (diff > 0.1) return 'up';
    if (diff < -0.1) return 'down';
    return 'stable';
  };

  const trend = getTrend();

  // Rendu de l'icône de tendance
  const renderTrendIcon = () => {
    if (!trend) return null;
    const iconSize = 12;
    if (trend === 'up') return <TrendingUp size={iconSize} color={colors.warning} />;
    if (trend === 'down') return <TrendingDown size={iconSize} color={colors.success} />;
    return <Minus size={iconSize} color={colors.textMuted} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <Scale size={14} color={colors.accentText} />
        <Text style={[styles.title, { color: colors.textMuted }]}>POIDS</Text>
        {renderTrendIcon()}
      </View>

      {/* Poids principal - gros, centré, en gras avec animation */}
      <Animated.View style={[styles.mainContent, {
        opacity: fadeInAnim,
        transform: [{ scale: weightScaleAnim }],
      }]}>
        <Text style={[styles.weight, { color: colors.textPrimary }]}>
          {currentWeight.toFixed(1)}
        </Text>
        <Text style={[styles.unit, { color: colors.textMuted }]}>kg</Text>
      </Animated.View>

      {/* Sparkline - Mini graphique d'évolution */}
      {history && history.length > 1 && (
        <View style={styles.sparklineContainer}>
          <AnimatedSparkline
            data={history}
            width={130}
            height={40}
            color={currentWeight > (targetWeight || currentWeight) ? colors.warning : colors.success}
          />
        </View>
      )}

      {/* Objectif et progression */}
      {targetWeight && remaining !== null ? (
        <View style={styles.progressSection}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: currentWeight > targetWeight ? colors.warning : colors.success,
                  width: progressWidth,
                },
              ]}
            />
          </View>
          <Text style={[styles.remaining, { color: colors.textMuted }]}>
            Objectif: {targetWeight} kg ({currentWeight > targetWeight ? '+' : ''}{remaining.toFixed(1)})
          </Text>
        </View>
      ) : (
        date && (
          <Text style={[styles.date, { color: colors.textMuted }]}>
            {date}
          </Text>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    height: '100%',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  weight: {
    fontSize: 42,
    fontWeight: '900',
  },
  unit: {
    fontSize: 24,
    fontWeight: '700',
  },
  date: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  sparklineContainer: {
    alignItems: 'center',
    marginBottom: 8,
    height: 40,
  },
  progressSection: {
    gap: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  remaining: {
    fontSize: 9,
    fontWeight: '600',
  },
});
