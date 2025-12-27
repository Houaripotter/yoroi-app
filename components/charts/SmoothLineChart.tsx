import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, G } from 'react-native-svg';
// import Animated, { FadeIn } from 'react-native-reanimated';

interface DataPoint {
  value: number;
  label?: string;
}

interface SmoothLineChartProps {
  data: DataPoint[];
  height?: number;
  showGradient?: boolean;
  showDots?: boolean;
  goalValue?: number;
  goodZone?: { min: number; max: number };
  warningZone?: { min: number; max: number };
  color?: string;
  curved?: boolean;
  thickness?: number;
  spacing?: number;
  rulesColor?: string;
  yAxisTextStyle?: any;
  xAxisLabelTextStyle?: any;
}

export const SmoothLineChart: React.FC<SmoothLineChartProps> = ({
  data,
  height = 220,
  showGradient = true,
  showDots = true,
  goalValue,
  color = '#6366f1',
  curved = true,
  thickness = 3,
  spacing = 50,
  rulesColor = 'rgba(100,100,100,0.15)',
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 60;
  const padding = { top: 20, right: 10, bottom: 30, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  // Créer le path pour la ligne
  const createSmoothPath = (): string => {
    if (data.length < 2) return '';

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * innerWidth;
      const y = innerHeight - ((d.value - minValue) / range) * innerHeight;
      return { x, y };
    });

    if (!curved) {
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    }

    // Cubic Bezier curve
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX = (current.x + next.x) / 2;
      path += ` Q ${controlX} ${current.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const linePath = createSmoothPath();

  // Créer le path pour le gradient
  const gradientPath = linePath + ` L ${innerWidth} ${innerHeight} L 0 ${innerHeight} Z`;

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        <G x={padding.left} y={padding.top}>
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <Line
              key={i}
              x1="0"
              y1={(innerHeight / 4) * i}
              x2={innerWidth}
              y2={(innerHeight / 4) * i}
              stroke={rulesColor}
              strokeWidth="1"
            />
          ))}

          {/* Y-axis labels */}
          {[0, 1, 2, 3, 4].map(i => {
            const value = maxValue - (range * i) / 4;
            return (
              <Text
                key={i}
                x={-10}
                y={(innerHeight / 4) * i + 5}
                fontSize={10}
                fill="#666"
                textAnchor="end"
              >
                {value.toFixed(0)}
              </Text>
            );
          })}

          {/* Goal line */}
          {goalValue && goalValue >= minValue && goalValue <= maxValue && (
            <Line
              x1="0"
              y1={innerHeight - ((goalValue - minValue) / range) * innerHeight}
              x2={innerWidth}
              y2={innerHeight - ((goalValue - minValue) / range) * innerHeight}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
          )}

          {/* Gradient fill */}
          {showGradient && (
            <Path d={gradientPath} fill="url(#gradient)" />
          )}

          {/* Line */}
          <Path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {showDots && data.map((d, i) => {
            const x = (i / (data.length - 1)) * innerWidth;
            const y = innerHeight - ((d.value - minValue) / range) * innerHeight;
            return (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r={5}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
              />
            );
          })}

          {/* X-axis labels */}
          {data.length > 1 && (
            <>
              <Text
                x={0}
                y={innerHeight + 20}
                fontSize={10}
                fill="#666"
                textAnchor="start"
              >
                {data[0].label || ''}
              </Text>
              <Text
                x={innerWidth}
                y={innerHeight + 20}
                fontSize={10}
                fill="#666"
                textAnchor="end"
              >
                {data[data.length - 1].label || ''}
              </Text>
            </>
          )}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
});
