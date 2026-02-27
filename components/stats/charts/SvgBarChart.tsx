// ============================================
// SVG BAR CHART - Dribbble style
// Rounded bars with gradient + values + labels
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

export interface BarItem {
  label: string;
  value: number;
}

interface SvgBarChartProps {
  /** Bar data (label + value) */
  data: BarItem[];
  /** Chart width in pixels */
  width: number;
  /** Chart height in pixels */
  height?: number;
  /** Bottom gradient color */
  barColor?: string;
  /** Top gradient color (lighter) */
  barColorLight?: string;
  /** Optional title above chart */
  title?: string;
  /** Show horizontal grid lines with Y labels */
  showGrid?: boolean;
  /** Show value above each bar */
  showValues?: boolean;
}

const PAD_TOP = 28;
const PAD_BOTTOM = 30;
const PAD_LEFT = 32;
const BAR_W = 28;

export const SvgBarChart: React.FC<SvgBarChartProps> = ({
  data,
  width,
  height = 180,
  barColor = '#10B981',
  barColorLight = '#34D399',
  title,
  showGrid = true,
  showValues = true,
}) => {
  const { colors, isDark } = useTheme();

  if (data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Pas de donn{'é'}es</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const spacing = (width - data.length * BAR_W) / (data.length + 1);
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : '#E3EDF3';
  const textColor = isDark ? colors.textMuted : '#9BB0BF';
  const valueColor = isDark ? colors.textPrimary : '#1A2E3B';

  return (
    <View>
      {title && (
        <Text style={[styles.chartTitle, { color: isDark ? colors.textPrimary : '#1A2E3B' }]}>
          {title}
        </Text>
      )}

      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={barColorLight} />
            <Stop offset="1" stopColor={barColor} />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid */}
        {showGrid &&
          [0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = PAD_TOP + plotH * (1 - pct);
            const label = Math.round(maxVal * pct);
            return (
              <React.Fragment key={String(pct)}>
                <Line
                  x1={PAD_LEFT} y1={y} x2={width - 8} y2={y}
                  stroke={gridColor} strokeWidth={0.8} opacity={0.5}
                />
                <SvgText x={4} y={y + 4} fontSize={9} fontWeight="600" fill={textColor}>
                  {label}
                </SvgText>
              </React.Fragment>
            );
          })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * plotH;
          const x = spacing + i * (BAR_W + spacing);
          const y = PAD_TOP + plotH - barH;
          return (
            <React.Fragment key={i}>
              <Rect
                x={x} y={y} width={BAR_W} height={barH}
                rx={6} ry={6} fill="url(#barGrad)"
              />
              {showValues && (
                <SvgText
                  x={x + BAR_W / 2} y={y - 6}
                  textAnchor="middle" fontSize={10} fontWeight="800" fill={valueColor}
                >
                  {d.value}
                </SvgText>
              )}
              <SvgText
                x={x + BAR_W / 2} y={height - 8}
                textAnchor="middle" fontSize={11} fontWeight="700" fill={textColor}
              >
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  chartTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, paddingHorizontal: 16 },
  emptyContainer: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, fontWeight: '600' },
});

export default SvgBarChart;
