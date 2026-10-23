import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, G, Text as SvgText } from 'react-native-svg';

interface DataPoint {
  value: number;
  label?: string;
}

interface SmoothLineChartProps {
  data: DataPoint[];
  width?: number; // Optional - uses screen width if not provided
  height?: number;
  showGradient?: boolean;
  showDots?: boolean;
  showGrid?: boolean; // Alias for visual grid
  animated?: boolean; // Animation enabled
  goalValue?: number;
  maxValue?: number; // Optional max Y axis value
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
  width: propWidth,
  height = 220,
  showGradient = true,
  showDots = true,
  showGrid: _showGrid,
  animated: _animated,
  goalValue,
  maxValue: propMaxValue,
  color = '#6366f1',
  curved = true,
  thickness = 3,
  spacing = 50,
  rulesColor = 'rgba(100,100,100,0.15)',
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = propWidth ?? (screenWidth - 60);
  const padding = { top: 20, right: 10, bottom: 40, left: 40 }; // bottom 40 pour 2 lignes de label X
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  if (data.length === 0) return null;

  const dataMaxValue = Math.max(...data.map(d => d.value));
  const maxValue = propMaxValue ?? dataMaxValue;
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  // X d'un point : centré si un seul point (évite NaN)
  const xAt = (i: number) => data.length > 1 ? (i / (data.length - 1)) * innerWidth : innerWidth / 2;

  // Créer le path pour la ligne
  const createSmoothPath = (): string => {
    if (data.length < 2) return '';

    const points = data.map((d, i) => {
      const x = xAt(i);
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
  // Pas de ligne → pas de gradient (un path sans M est invalide)
  const gradientPath = linePath ? linePath + ` L ${innerWidth} ${innerHeight} L 0 ${innerHeight} Z` : '';

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
            // Cohérent avec le placement des points (min en bas)
            const value = minValue + (range * (4 - i)) / 4;
            return (
              <SvgText
                key={i}
                x={-10}
                y={(innerHeight / 4) * i + 5}
                fontSize={10}
                fill="#666"
                textAnchor="end"
              >
                {value.toFixed(0)}
              </SvgText>
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
          {showGradient && !!gradientPath && (
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

          {/* Dots and Values */}
          {showDots && data.map((d, i) => {
            const x = xAt(i);
            const y = innerHeight - ((d.value - minValue) / range) * innerHeight;
            return (
              <G key={i}>
                <Circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={2}
                />
                <SvgText
                  x={x}
                  y={y - 10}
                  fontSize={10}
                  fontWeight="bold"
                  fill={color}
                  textAnchor="middle"
                >
                  {d.value.toFixed(1)}
                </SvgText>
              </G>
            );
          })}

          {/* X-axis labels, Règle 4 : deux lignes si label contient \n */}
          {data.length > 1 && (
            <>
              {(data[0].label || '').split('\n').map((part, idx) => (
                <SvgText
                  key={`xl0-${idx}`}
                  x={0}
                  y={innerHeight + 14 + idx * 12}
                  fontSize={10}
                  fill="#666"
                  textAnchor="start"
                >
                  {part}
                </SvgText>
              ))}
              {(data[data.length - 1].label || '').split('\n').map((part, idx) => (
                <SvgText
                  key={`xln-${idx}`}
                  x={innerWidth}
                  y={innerHeight + 14 + idx * 12}
                  fontSize={10}
                  fill="#666"
                  textAnchor="end"
                >
                  {part}
                </SvgText>
              ))}
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
