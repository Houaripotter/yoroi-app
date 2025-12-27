import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
// import Animated, { FadeIn } from 'react-native-reanimated';

interface DataPoint {
  value: number;
}

type TrendType = 'up' | 'down' | 'stable';

interface SparklineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
  trend?: TrendType;
  thickness?: number;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 100,
  height = 40,
  color,
  showGradient = true,
  trend,
  thickness = 2,
}) => {
  if (data.length < 2) return null;

  // Auto-detect trend
  const detectedTrend: TrendType = trend || (() => {
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const diff = lastValue - firstValue;
    const percentChange = Math.abs(diff / firstValue) * 100;

    if (percentChange < 5) return 'stable';
    return diff > 0 ? 'up' : 'down';
  })();

  const trendColors = {
    up: '#10b981',
    down: '#ef4444',
    stable: '#f59e0b',
  };

  const chartColor = color || trendColors[detectedTrend];

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  // Créer le path
  const createPath = (): string => {
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.value - minValue) / range) * height;
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX = (current.x + next.x) / 2;
      path += ` Q ${controlX} ${current.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const linePath = createPath();
  const gradientPath = linePath + ` L ${width} ${height} L 0 ${height} Z`;

  return (
    <View  style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`sparkline-gradient-${Math.random()}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={chartColor} stopOpacity="0.25" />
            <Stop offset="1" stopColor={chartColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {showGradient && (
          <Path d={gradientPath} fill={`url(#sparkline-gradient-${Math.random()})`} />
        )}

        <Path
          d={linePath}
          fill="none"
          stroke={chartColor}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
