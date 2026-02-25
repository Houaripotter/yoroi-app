// ============================================
// SPARKLINE CHART - Mini graphique elegant
// Mode compact: gradient fill vibrant + glow
// Mode normal: labels + points interactifs
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import Svg, { Path, Circle, Line as SvgLine, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

interface SparklineChartProps {
  data: { value: number }[];
  width: number;
  height: number;
  color: string;
  showGradient?: boolean;
  thickness?: number;
  showLastValues?: number;
  valueUnit?: string;
  compact?: boolean;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width,
  height,
  color,
  showGradient = false,
  thickness = 2,
  showLastValues = 0,
  valueUnit = '',
  compact = false,
}) => {
  const { colors, isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Pas de donn{'\u00E9'}es
        </Text>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const paddingTop = compact ? 8 : 20;
  const paddingBottom = compact ? 4 : 5;
  const paddingHorizontal = compact ? 4 : 5;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingHorizontal * 2;

  const points = data.map((d, i) => {
    const x = paddingHorizontal + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const normalizedValue = (d.value - minValue) / range;
    const y = paddingTop + chartHeight - normalizedValue * chartHeight;
    return { x, y, value: d.value };
  });

  // Smooth bezier path
  const createPath = () => {
    if (points.length === 0) return '';
    let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.35;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.65;
      path += ` C ${cpx1.toFixed(1)} ${prev.y.toFixed(1)}, ${cpx2.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }
    return path;
  };

  // Area path for gradient fill
  const createAreaPath = () => {
    const linePath = createPath();
    if (!linePath || points.length === 0) return '';
    const bottomY = paddingTop + chartHeight;
    return linePath +
      ` L ${points[points.length - 1].x.toFixed(1)} ${bottomY}` +
      ` L ${points[0].x.toFixed(1)} ${bottomY} Z`;
  };

  // Trend detection
  const lastPoint = points[points.length - 1];
  const prevPoint = points.length >= 2 ? points[points.length - 2] : null;
  const isUp = prevPoint ? lastPoint.y < prevPoint.y : true;

  // Unique gradient ID to avoid SVG conflicts
  const gradId = `spark-${color.replace('#', '')}-${width}-${height}`;

  if (compact) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`${gradId}-area`} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} stopOpacity={isDark ? 0.50 : 0.40} />
              <Stop offset="40%" stopColor={color} stopOpacity={isDark ? 0.25 : 0.18} />
              <Stop offset="80%" stopColor={color} stopOpacity={isDark ? 0.08 : 0.05} />
              <Stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </LinearGradient>
            <LinearGradient id={`${gradId}-line`} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <Stop offset="50%" stopColor={color} stopOpacity={0.85} />
              <Stop offset="100%" stopColor={color} stopOpacity={1} />
            </LinearGradient>
          </Defs>

          {/* Area gradient fill - vibrant */}
          <Path
            d={createAreaPath()}
            fill={`url(#${gradId}-area)`}
          />

          {/* Ligne principale - gradient horizontal */}
          <Path
            d={createPath()}
            stroke={`url(#${gradId}-line)`}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Outer glow on last point */}
          <Circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={7}
            fill={color}
            opacity={0.15}
          />
          {/* Mid ring */}
          <Circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={4.5}
            fill={isDark ? colors.backgroundCard : '#FFFFFF'}
            stroke={color}
            strokeWidth={1.5}
          />
          {/* Inner dot */}
          <Circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={2}
            fill={color}
          />
        </Svg>
      </View>
    );
  }

  // Mode normal (non compact)
  const valuesToShow = points.slice(-Math.min(3, points.length));

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`${gradId}-area`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity={isDark ? 0.30 : 0.20} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </LinearGradient>
        </Defs>

        {/* Grille subtile */}
        {!showGradient && (
          <SvgLine
            x1={paddingHorizontal}
            y1={paddingTop + chartHeight / 2}
            x2={width - paddingHorizontal}
            y2={paddingTop + chartHeight / 2}
            stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
            strokeWidth="1"
          />
        )}

        {/* Area fill */}
        <Path
          d={createAreaPath()}
          fill={`url(#${gradId}-area)`}
        />

        {/* Ligne du graphique */}
        <Path
          d={createPath()}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={thickness + 1.5}
            fill={colors.backgroundCard}
            stroke={color}
            strokeWidth={thickness}
          />
        ))}
      </Svg>

      {/* Valeurs au-dessus des derniers points */}
      {valuesToShow.map((point, index) => (
        <View
          key={`value-${index}`}
          style={{
            position: 'absolute',
            top: Math.max(point.y - 16, 2),
            left: Math.max(Math.min(point.x - 15, width - 32), 2),
            width: 30,
            alignItems: 'center',
            backgroundColor: colors.backgroundCard,
            borderRadius: 6,
            paddingHorizontal: 4,
            paddingVertical: 2,
          }}
        >
          <Text
            style={[
              styles.valueText,
              {
                color: color,
                fontSize: 10,
                fontWeight: '900',
              },
            ]}
          >
            {point.value.toFixed(1)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  valueText: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
