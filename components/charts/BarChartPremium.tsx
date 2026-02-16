import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, G, Text as SvgText } from 'react-native-svg';

interface BarDataPoint {
  value: number;
  label?: string;
  frontColor?: string;
}

interface LegendItem {
  label: string;
  color: string;
}

interface BarChartPremiumProps {
  data: BarDataPoint[];
  height?: number;
  primaryColor?: string;
  barWidth?: number;
  spacing?: number;
  roundedTop?: boolean;
  rulesColor?: string;
  legend?: LegendItem[];
  maxValue?: number;
}

export const BarChartPremium: React.FC<BarChartPremiumProps> = ({
  data,
  height = 200,
  primaryColor = '#6366f1',
  barWidth = 40,
  spacing = 20,
  roundedTop = true,
  rulesColor = 'rgba(100,100,100,0.15)',
  legend,
  maxValue,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 60;
  const padding = { top: 20, right: 10, bottom: 40, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  if (data.length === 0) return null;

  const max = maxValue || Math.max(...data.map(d => d.value));

  return (
    <View  style={styles.container}>
      {/* Legend */}
      {legend && legend.length > 0 && (
        <View style={styles.legendContainer}>
          {legend.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: item.color },
                ]}
              />
              <Text style={styles.legendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      <Svg width={chartWidth} height={height}>
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
            const value = max - (max * i) / 4;
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

          {/* Bars */}
          {data.map((d, i) => {
            const barHeight = (d.value / max) * innerHeight;
            const x = i * (barWidth + spacing) + spacing;
            const y = innerHeight - barHeight;
            const color = d.frontColor || primaryColor;

            return (
              <G key={i}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx={roundedTop ? 6 : 0}
                  ry={roundedTop ? 6 : 0}
                />
                {d.label && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={innerHeight + 20}
                    fontSize={10}
                    fill="#666"
                    textAnchor="middle"
                  >
                    {d.label}
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
