import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Rect } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

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
  showLastValues?: number;
  valueUnit?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width = 100,
  height = 40,
  color,
  showGradient = true,
  trend,
  thickness = 2.5,
  showLastValues = 0,
  valueUnit = '',
}) => {
  const { isDark, colors } = useTheme();
  const gradientId = React.useMemo(() => `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`, []);

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

  // Créer les points pour le graphique
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - minValue) / range) * height;
    return { x, y, value: d.value };
  });

  // Créer le path
  const createPath = (): string => {
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

  // Obtenir les derniers points à afficher
  const lastPoints = showLastValues > 0
    ? points.slice(-showLastValues).map((point, index) => ({
        ...point,
        dataIndex: data.length - showLastValues + index
      }))
    : [];

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={chartColor} stopOpacity="0.4" />
            <Stop offset="0.5" stopColor={chartColor} stopOpacity="0.2" />
            <Stop offset="1" stopColor={chartColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Fond avec couleur du thème - plus clair en dark mode */}
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={6}
          ry={6}
          fill={isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.05)"}
        />

        {showGradient && (
          <Path d={gradientPath} fill={`url(#${gradientId})`} />
        )}

        <Path
          d={linePath}
          fill="none"
          stroke={chartColor}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points sur les dernières valeurs */}
        {lastPoints.map((point, index) => (
          <React.Fragment key={index}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={5}
              fill="#FFFFFF"
              opacity={0.95}
            />
            <Circle
              cx={point.x}
              cy={point.y}
              r={3}
              fill={chartColor}
            />
          </React.Fragment>
        ))}
      </Svg>

      {/* Valeurs au-dessus des points */}
      {lastPoints.map((point, index) => {
        const displayValue = valueUnit === 'kg' || valueUnit === 'L' || valueUnit === 'cm'
          ? point.value.toFixed(1)
          : Math.round(point.value);

        return (
          <View
            key={index}
            style={[
              styles.valueLabel,
              {
                left: point.x - 12,
                top: Math.max(point.y - 18, 0),
              }
            ]}
          >
            <Text style={[styles.valueLabelText, { color: chartColor }]}>
              {displayValue}{valueUnit}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
    position: 'relative',
  },
  valueLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  valueLabelText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
