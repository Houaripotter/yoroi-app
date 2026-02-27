// ============================================
// SVG LINE CHART - Dribbble style
// Smooth bezier curves + area fills + legend
// Supports individual metric card mode
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle as SvgCircle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  data: number[];
  areaOpacity?: number;
}

interface SvgLineChartProps {
  /** One or more data series */
  series: ChartSeries[];
  /** X-axis labels (e.g. day names, dates) */
  xLabels?: string[];
  /** Chart width in pixels */
  width: number;
  /** Chart height in pixels */
  height?: number;
  /** Show colored legend below chart */
  showLegend?: boolean;
  /** Show Y-axis labels and horizontal grid */
  showYAxis?: boolean;
  /** Show X-axis labels */
  showXAxis?: boolean;
  /** Show open circle at last data point */
  highlightLast?: boolean;
  /** Show vertical grid lines */
  verticalGridLines?: boolean;
  /** Optional title above chart */
  title?: string;
  /** Show circles at ALL data points */
  showAllPoints?: boolean;
  /** Show value labels above each data point */
  showValueLabels?: boolean;
  /** Format function for value labels */
  valueFormatter?: (v: number) => string;
}

const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;

// Compact paddings for metric card mode (no Y axis)
const PAD_LEFT_COMPACT = 12;
const PAD_TOP_LABELS = 32; // extra room for value labels above points

// Smooth bezier curve through points
const buildSmooth = (pts: { x: number; y: number }[]) => {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1], c = pts[i];
    const cx1 = p.x + (c.x - p.x) * 0.4;
    const cx2 = c.x - (c.x - p.x) * 0.4;
    d += ` C ${cx1.toFixed(1)} ${p.y.toFixed(1)}, ${cx2.toFixed(1)} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  return d;
};

export const SvgLineChart: React.FC<SvgLineChartProps> = ({
  series,
  xLabels,
  width,
  height = 220,
  showLegend = true,
  showYAxis = true,
  showXAxis = true,
  highlightLast = true,
  verticalGridLines = true,
  title,
  showAllPoints = false,
  showValueLabels = false,
  valueFormatter,
}) => {
  const { colors, isDark } = useTheme();

  const validSeries = series.filter(s => s.data.length > 0);
  if (validSeries.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Pas de donn{'\u00E9'}es</Text>
      </View>
    );
  }

  const padLeft = showYAxis ? PAD_LEFT : PAD_LEFT_COMPACT;
  const padRight = PAD_RIGHT;
  const padTop = showValueLabels ? PAD_TOP_LABELS : PAD_TOP;
  const padBottom = PAD_BOTTOM;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Global min/max
  const allValues = validSeries.flatMap(s => s.data);
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const range = dataMax - dataMin || 1;
  const yMin = dataMin - range * 0.1;
  const yMax = dataMax + range * 0.1;
  const yRange = yMax - yMin;

  const maxLen = Math.max(...validSeries.map(s => s.data.length));

  const toPoints = (data: number[]) =>
    data.map((v, i) => ({
      x: padLeft + (i / Math.max(data.length - 1, 1)) * plotW,
      y: padTop + plotH - ((v - yMin) / yRange) * plotH,
      value: v,
    }));

  // Y-axis labels
  const ySteps = 5;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const val = yMin + (yRange / ySteps) * i;
    return Math.round(val * 10) / 10;
  });

  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(228,186,170,0.35)';
  const textColor = isDark ? colors.textMuted : '#9BB0BF';
  const plotBottom = padTop + plotH;

  const formatValue = (v: number) => {
    if (valueFormatter) return valueFormatter(v);
    return v % 1 === 0 ? String(v) : v.toFixed(1);
  };

  // Decide how many X labels to show to avoid crowding
  const maxXLabels = Math.floor(width / 52);

  return (
    <View>
      {title && (
        <Text style={[styles.chartTitle, { color: isDark ? colors.textPrimary : '#1A2E3B' }]}>
          {title}
        </Text>
      )}

      <Svg width={width} height={height}>
        <Defs>
          {validSeries.map(s => (
            <LinearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.color} stopOpacity={String(s.areaOpacity ?? 0.25)} />
              <Stop offset="1" stopColor={s.color} stopOpacity="0.02" />
            </LinearGradient>
          ))}
        </Defs>

        {/* Vertical grid lines */}
        {verticalGridLines && maxLen > 1 &&
          Array.from({ length: maxLen }, (_, i) => {
            const x = padLeft + (i / (maxLen - 1)) * plotW;
            return (
              <Line
                key={`vg${i}`}
                x1={x} y1={padTop} x2={x} y2={plotBottom}
                stroke={gridColor} strokeWidth={0.8}
              />
            );
          })}

        {/* Horizontal grid + Y labels */}
        {showYAxis &&
          yLabels.map((val, i) => {
            const y = padTop + plotH - (plotH / ySteps) * i;
            return (
              <React.Fragment key={`h${i}`}>
                <Line
                  x1={padLeft} y1={y} x2={width - padRight} y2={y}
                  stroke={gridColor} strokeWidth={0.6}
                />
                <SvgText x={4} y={y + 4} fontSize={9} fontWeight="600" fill={textColor}>
                  {Number.isInteger(val) ? val : val.toFixed(1)}
                </SvgText>
              </React.Fragment>
            );
          })}

        {/* X-axis labels */}
        {showXAxis && xLabels &&
          xLabels.map((label, i) => {
            // Skip some labels if too crowded
            if (xLabels.length > maxXLabels) {
              const step = Math.ceil(xLabels.length / maxXLabels);
              if (i % step !== 0 && i !== xLabels.length - 1) return null;
            }
            const x = padLeft + (i / Math.max(xLabels.length - 1, 1)) * plotW;
            return (
              <SvgText
                key={`x${i}`}
                x={x} y={height - 4}
                textAnchor="middle" fontSize={9} fontWeight="600" fill={textColor}
              >
                {label}
              </SvgText>
            );
          })}

        {/* Series: area + line + points */}
        {validSeries.map(s => {
          const pts = toPoints(s.data);
          const line = buildSmooth(pts);
          const area =
            line +
            ` L ${pts[pts.length - 1].x.toFixed(1)} ${plotBottom} L ${pts[0].x.toFixed(1)} ${plotBottom} Z`;

          return (
            <React.Fragment key={s.key}>
              <Path d={area} fill={`url(#area-${s.key})`} />
              <Path
                d={line}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* All data points */}
              {showAllPoints && pts.map((pt, idx) => (
                <SvgCircle
                  key={`pt-${s.key}-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={4}
                  fill={isDark ? '#1A1A2E' : '#FFFFFF'}
                  stroke={s.color}
                  strokeWidth={2}
                />
              ))}

              {/* Value labels above points */}
              {showValueLabels && pts.map((pt, idx) => {
                // Skip some labels if too crowded
                if (pts.length > maxXLabels) {
                  const step = Math.ceil(pts.length / maxXLabels);
                  if (idx % step !== 0 && idx !== pts.length - 1) return null;
                }
                return (
                  <SvgText
                    key={`vl-${s.key}-${idx}`}
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight="700"
                    fill={s.color}
                  >
                    {formatValue(pt.value)}
                  </SvgText>
                );
              })}

              {/* Highlight last point (when not showing all) */}
              {highlightLast && !showAllPoints && pts.length > 0 && (
                <SvgCircle
                  cx={pts[pts.length - 1].x}
                  cy={pts[pts.length - 1].y}
                  r={6}
                  fill={isDark ? '#1A1A2E' : '#FFFFFF'}
                  stroke={s.color}
                  strokeWidth={2.5}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Legend */}
      {showLegend && validSeries.length > 1 && (
        <View style={styles.legendRow}>
          {validSeries.map(s => (
            <View key={s.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={[styles.legendLabel, { color: isDark ? colors.textSecondary : '#5A7D8F' }]}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chartTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, paddingHorizontal: 16 },
  emptyContainer: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, fontWeight: '600' },
  legendRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 10, flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontWeight: '600' },
});

export default SvgLineChart;
