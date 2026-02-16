import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

interface TacticalWeightRulerProps {
  currentWeight: number;
  targetWeight?: number;
  trendData?: { date: string; weight: number }[];
  width?: number;
  height?: number;
}

export const TacticalWeightRuler: React.FC<TacticalWeightRulerProps> = ({
  currentWeight,
  targetWeight,
  trendData = [],
  width = Dimensions.get('window').width - 40,
  height = 60,
}) => {
  const { colors } = useTheme();
  const [displayWeight, setDisplayWeight] = useState(currentWeight);

  useEffect(() => {
    // Rolling number effect
    let start = displayWeight;
    const end = currentWeight;
    const duration = 800;
    const steps = 30;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const newValue = start + (end - start) * progress;
      setDisplayWeight(newValue);

      if (currentStep >= steps) {
        setDisplayWeight(end);
        clearInterval(interval);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [currentWeight]);

  // Générer les graduations HORIZONTALES en bas
  const rulerMarks = [];
  const rulerY = height - 15; // Position en bas
  const minWeight = Math.floor(currentWeight - 5);
  const maxWeight = Math.ceil(currentWeight + 5);
  const range = maxWeight - minWeight;

  for (let i = 0; i <= 20; i++) {
    const weight = minWeight + (i / 20) * range;
    const xPos = (i / 20) * (width - 40) + 20;
    const isInteger = Math.abs(weight - Math.round(weight)) < 0.1;
    const markHeight = isInteger ? 8 : 4;

    rulerMarks.push(
      <Line
        key={`mark-${i}`}
        x1={xPos}
        y1={rulerY}
        x2={xPos}
        y2={rulerY - markHeight}
        stroke={colors.border}
        strokeWidth={isInteger ? 1.5 : 1}
        opacity={isInteger ? 0.7 : 0.4}
      />
    );
  }

  // Courbe de tendance subtile
  const trendPath = () => {
    if (trendData.length < 2) return '';

    const chartWidth = width - 40;
    const chartHeight = height - 30;

    const weights = trendData.map(d => d.weight);
    const maxW = Math.max(...weights);
    const minW = Math.min(...weights);
    const range = maxW - minW || 1;

    const points = weights.map((w, i) => {
      const x = 20 + (i / (weights.length - 1 || 1)) * chartWidth;
      const y = 10 + ((maxW - w) / range) * chartHeight;
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = prev.x + (curr.x - prev.x) / 2;
      path += ` Q ${cpx} ${prev.y}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Courbe de tendance en arrière-plan */}
      {trendData.length >= 2 && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.1" />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity="0.2" />
            </LinearGradient>
          </Defs>
          <Path d={trendPath()} stroke="url(#trendGradient)" strokeWidth="2" fill="none" opacity={0.3} />
        </Svg>
      )}

      {/* Règle graduée horizontale */}
      <Svg width={width} height={height} style={styles.rulerSvg}>
        {rulerMarks}
      </Svg>

      {/* Affichage du poids (zIndex haut, SANS fond) */}
      <View style={styles.weightDisplay}>
        <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
          {displayWeight.toFixed(1)}
        </Text>
        <Text style={[styles.weightUnit, { color: colors.textMuted }]}>kg</Text>
      </View>

      {/* Indicateur objectif */}
      {targetWeight && (
        <View style={styles.targetBadge}>
          <View style={[styles.targetDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.targetLabel, { color: colors.success }]}>
            Obj: {targetWeight}kg
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  rulerSvg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  weightDisplay: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -20 }],
    flexDirection: 'row',
    alignItems: 'baseline',
    zIndex: 10,
  },
  weightValue: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
    fontFamily: 'monospace',
  },
  targetBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    zIndex: 10,
  },
  targetDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  targetLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
});
