import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

// ===================================================
// TYPES
// ===================================================

export interface BarData {
  value: number;      // Pourcentage 0-100
  label?: string;     // Label optionnel (ex: "L", "M", "M"...)
  accent?: boolean;   // true = couleur accent, false = noir/blanc
}

interface BarChartProps {
  data: BarData[];
  height?: number;
  showLabels?: boolean;
  style?: ViewStyle;
  barRadius?: number;
  gap?: number;
}

// ===================================================
// COMPOSANT - Converti en courbes SVG
// ===================================================

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 120,
  showLabels = false,
  style,
}) => {
  const { colors } = useTheme();

  const chartWidth = 300;
  const chartHeight = height;
  const padding = 20;

  // Calculer les positions
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const maxValue = 100;
    const xStep = (chartWidth - padding * 2) / (data.length - 1);

    return data.map((item, index) => ({
      x: padding + index * xStep,
      y: chartHeight - padding - (item.value / maxValue) * (chartHeight - padding * 2),
      value: item.value,
      label: item.label,
      accent: item.accent,
    }));
  }, [data, chartWidth, chartHeight, padding]);

  // Créer le path avec courbes de Bézier
  const createPath = () => {
    if (chartData.length === 0) return '';

    let path = `M ${chartData[0].x} ${chartData[0].y}`;

    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  // Path pour le gradient
  const createAreaPath = () => {
    if (chartData.length === 0) return '';

    const linePath = createPath();
    const lastPoint = chartData[chartData.length - 1];
    const firstPoint = chartData[0];

    return `${linePath} L ${lastPoint.x} ${chartHeight - padding} L ${firstPoint.x} ${chartHeight - padding} Z`;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.accent} stopOpacity="0.3" />
              <Stop offset="1" stopColor={colors.accent} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>

          {/* Gradient area */}
          <Path d={createAreaPath()} fill="url(#barGradient)" />

          {/* Line */}
          <Path
            d={createPath()}
            stroke={colors.accent}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Points */}
          {chartData.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#FFFFFF"
              stroke={colors.accent}
              strokeWidth="3"
            />
          ))}
        </Svg>

        {/* Labels des jours */}
        {showLabels && (
          <View style={styles.labelsContainer}>
            {chartData.map((point, index) => (
              <Text
                key={index}
                style={[styles.label, { color: colors.textMuted, left: point.x - 10 }]}
              >
                {point.label}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chartContainer: {
    alignItems: 'center',
  },
  labelsContainer: {
    width: 300,
    height: 20,
    position: 'relative',
    marginTop: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    position: 'absolute',
    width: 20,
    textAlign: 'center',
  },
});

export default BarChart;
