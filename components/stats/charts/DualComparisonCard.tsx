// ============================================
// DUAL COMPARISON CARD - Grand graphique dual-line scrollable
// 2 courbes colorees + gradient fills + legende
// + barres de progression modernes en dessous
// Scroll horizontal + auto-scroll vers les donnees recentes
// ============================================

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import Svg, { Path, Circle as SvgCircle, Line, Text as SvgText, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useI18n } from '@/lib/I18nContext';

interface DualComparisonCardProps {
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
  leftHistory: { date: string; value: number }[];
  rightHistory: { date: string; value: number }[];
  leftValue: number;
  rightValue: number;
  unit: string;
  onPressLeft?: () => void;
  onPressRight?: () => void;
}

const CHART_HEIGHT = 220;
const PAD_TOP = 30;
const PAD_BOTTOM = 35;
const PAD_LEFT = 45;
const PAD_RIGHT = 16;
const POINT_WIDTH = 70;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const smartFormat = (v: number): string => {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1).replace(/\.0$/, '');
};

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

export const DualComparisonCard: React.FC<DualComparisonCardProps> = ({
  title,
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
  leftHistory,
  rightHistory,
  leftValue,
  rightValue,
  unit,
  onPressLeft,
  onPressRight,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useI18n();
  const dateLocale = fr;
  const [cardWidth, setCardWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    setCardWidth(e.nativeEvent.layout.width);
  };

  const hasLeftData = leftHistory.length >= 1;
  const hasRightData = rightHistory.length >= 1;
  const hasData = hasLeftData || hasRightData;
  const maxValue = Math.max(leftValue, rightValue, 1);
  const delta = Math.abs(leftValue - rightValue);
  const maxLen = Math.max(leftHistory.length, rightHistory.length);
  const isScrollable = maxLen > 5;

  const chartData = useMemo(() => {
    if (!hasData || cardWidth === 0) return null;

    const minWidth = cardWidth - 32;
    const scrollableWidth = isScrollable ? Math.max(minWidth, maxLen * POINT_WIDTH) : minWidth;
    const svgWidth = scrollableWidth;
    const plotW = svgWidth - PAD_LEFT - PAD_RIGHT;
    const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const allValues = [
      ...(hasLeftData ? leftHistory.map(h => h.value) : []),
      ...(hasRightData ? rightHistory.map(h => h.value) : []),
    ];
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const range = dataMax - dataMin || 1;
    const yMin = dataMin - range * 0.15;
    const yMax = dataMax + range * 0.15;
    const yRange = yMax - yMin;
    const plotBottom = PAD_TOP + plotH;

    const toPoints = (data: { date: string; value: number }[]) =>
      data.map((d, i) => ({
        x: PAD_LEFT + (i / Math.max(data.length - 1, 1)) * plotW,
        y: PAD_TOP + plotH - ((d.value - yMin) / yRange) * plotH,
        value: d.value,
      }));

    const leftPts = hasLeftData ? toPoints(leftHistory) : [];
    const rightPts = hasRightData ? toPoints(rightHistory) : [];
    const leftLine = buildSmooth(leftPts);
    const rightLine = buildSmooth(rightPts);
    const leftArea = leftPts.length > 0
      ? leftLine + ` L ${leftPts[leftPts.length - 1].x.toFixed(1)} ${plotBottom} L ${leftPts[0].x.toFixed(1)} ${plotBottom} Z`
      : '';
    const rightArea = rightPts.length > 0
      ? rightLine + ` L ${rightPts[rightPts.length - 1].x.toFixed(1)} ${plotBottom} L ${rightPts[0].x.toFixed(1)} ${plotBottom} Z`
      : '';

    const ySteps = 4;
    const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
      const val = yMin + (yRange / ySteps) * i;
      return { val: Math.round(val * 10) / 10, y: PAD_TOP + plotH - (plotH / ySteps) * i };
    });

    const longestHistory = leftHistory.length >= rightHistory.length ? leftHistory : rightHistory;
    const maxXLabels = Math.floor(svgWidth / 60);
    const xLabels = longestHistory.map((h, i) => {
      const x = PAD_LEFT + (i / Math.max(longestHistory.length - 1, 1)) * plotW;
      let label = '';
      try { label = format(new Date(h.date), 'd/MM', { locale: dateLocale }); } catch { label = ''; }
      return { x, label };
    });

    return { svgWidth, leftPts, rightPts, leftLine, rightLine, leftArea, rightArea, yLabels, xLabels, maxXLabels, plotBottom };
  }, [hasData, cardWidth, leftHistory, rightHistory, dateLocale, isScrollable, maxLen]);

  // Auto-scroll to latest data (right end)
  const handleContentSizeChange = useCallback((contentWidth: number) => {
    if (isScrollable && scrollRef.current && contentWidth > cardWidth - 32) {
      scrollRef.current.scrollToEnd({ animated: false });
    }
  }, [isScrollable, cardWidth]);

  const leftTrend = leftHistory.length >= 2
    ? (leftHistory[leftHistory.length - 1].value > leftHistory[leftHistory.length - 2].value ? 'up' : leftHistory[leftHistory.length - 1].value < leftHistory[leftHistory.length - 2].value ? 'down' : 'stable')
    : 'stable';
  const rightTrend = rightHistory.length >= 2
    ? (rightHistory[rightHistory.length - 1].value > rightHistory[rightHistory.length - 2].value ? 'up' : rightHistory[rightHistory.length - 1].value < rightHistory[rightHistory.length - 2].value ? 'down' : 'stable')
    : 'stable';

  const leftBarWidth = maxValue > 0 ? (leftValue / maxValue) * 100 : 0;
  const rightBarWidth = maxValue > 0 ? (rightValue / maxValue) * 100 : 0;
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  return (
    <View
      style={[styles.container, {
        backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }]}
      onLayout={handleLayout}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <ArrowLeftRight size={16} color={colors.textSecondary} strokeWidth={2.5} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        {(leftValue > 0 && rightValue > 0) && (
          <View style={[styles.deltaBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Text style={[styles.deltaText, { color: colors.textSecondary }]}>
              {`\u0394 ${smartFormat(delta)} ${unit}`}
            </Text>
          </View>
        )}
      </View>

      {/* Graphique SVG scrollable */}
      {hasData && cardWidth > 0 && chartData && (
        <View style={styles.chartContainer}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={handleContentSizeChange}
            scrollEnabled={isScrollable}
          >
            <Svg width={chartData.svgWidth} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="dualGrad-left" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={leftColor} stopOpacity={isDark ? '0.40' : '0.30'} />
                  <Stop offset="0.5" stopColor={leftColor} stopOpacity={isDark ? '0.15' : '0.10'} />
                  <Stop offset="1" stopColor={leftColor} stopOpacity="0.02" />
                </LinearGradient>
                <LinearGradient id="dualGrad-right" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={rightColor} stopOpacity={isDark ? '0.40' : '0.30'} />
                  <Stop offset="0.5" stopColor={rightColor} stopOpacity={isDark ? '0.15' : '0.10'} />
                  <Stop offset="1" stopColor={rightColor} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {chartData.yLabels.map((yl, i) => (
                <Line key={`hg-${i}`} x1={PAD_LEFT} y1={yl.y} x2={chartData.svgWidth - PAD_RIGHT} y2={yl.y} stroke={gridColor} strokeWidth={1} strokeDasharray="4,6" />
              ))}
              {chartData.yLabels.map((yl, i) => (
                <SvgText key={`yl-${i}`} x={PAD_LEFT - 8} y={yl.y + 4} fontSize={9} fontWeight="700" fill={textMuted} textAnchor="end">{yl.val.toFixed(1)}</SvgText>
              ))}
              {chartData.xLabels.map((xl, i) => {
                if (chartData.xLabels.length > chartData.maxXLabels) {
                  const step = Math.ceil(chartData.xLabels.length / chartData.maxXLabels);
                  if (i % step !== 0 && i !== chartData.xLabels.length - 1) return null;
                }
                return <SvgText key={`xl-${i}`} x={xl.x} y={CHART_HEIGHT - 6} textAnchor="middle" fontSize={9} fontWeight="600" fill={textMuted}>{xl.label}</SvgText>;
              })}

              {/* LEFT */}
              {chartData.leftArea && <Path d={chartData.leftArea} fill="url(#dualGrad-left)" />}
              {chartData.leftLine && <Path d={chartData.leftLine} fill="none" stroke={leftColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
              {chartData.leftPts.map((pt, idx) => (
                <G key={`lp-${idx}`}>
                  <SvgCircle cx={pt.x} cy={pt.y} r={5} fill={leftColor} opacity={0.12} />
                  <SvgCircle cx={pt.x} cy={pt.y} r={3.5} fill={isDark ? colors.backgroundCard : '#FFFFFF'} stroke={leftColor} strokeWidth={2} />
                </G>
              ))}

              {/* RIGHT */}
              {chartData.rightArea && <Path d={chartData.rightArea} fill="url(#dualGrad-right)" />}
              {chartData.rightLine && <Path d={chartData.rightLine} fill="none" stroke={rightColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
              {chartData.rightPts.map((pt, idx) => (
                <G key={`rp-${idx}`}>
                  <SvgCircle cx={pt.x} cy={pt.y} r={5} fill={rightColor} opacity={0.12} />
                  <SvgCircle cx={pt.x} cy={pt.y} r={3.5} fill={isDark ? colors.backgroundCard : '#FFFFFF'} stroke={rightColor} strokeWidth={2} />
                </G>
              ))}

              {/* Value labels */}
              {chartData.leftPts.length > 0 && (() => {
                const lp = chartData.leftPts[chartData.leftPts.length - 1];
                return (
                  <G>
                    <Rect x={lp.x - 20} y={lp.y - 24} width={40} height={16} rx={6} ry={6} fill={leftColor} opacity={0.9} />
                    <SvgText x={lp.x} y={lp.y - 13} textAnchor="middle" fontSize={9} fontWeight="800" fill="#FFFFFF">{smartFormat(lp.value)}</SvgText>
                  </G>
                );
              })()}
              {chartData.rightPts.length > 0 && (() => {
                const rp = chartData.rightPts[chartData.rightPts.length - 1];
                return (
                  <G>
                    <Rect x={rp.x - 20} y={rp.y - 24} width={40} height={16} rx={6} ry={6} fill={rightColor} opacity={0.9} />
                    <SvgText x={rp.x} y={rp.y - 13} textAnchor="middle" fontSize={9} fontWeight="800" fill="#FFFFFF">{smartFormat(rp.value)}</SvgText>
                  </G>
                );
              })()}
            </Svg>
          </ScrollView>

          {/* Legende */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: leftColor }]} />
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{leftLabel}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: rightColor }]} />
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{rightLabel}</Text>
            </View>
          </View>
          {isScrollable && (
            <View style={styles.hintBar}>
              <Text style={[styles.hintText, { color: colors.textMuted }]}>Defiler pour voir plus</Text>
            </View>
          )}
        </View>
      )}

      {!hasData && (
        <View style={styles.emptyChart}>
          <ArrowLeftRight size={28} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Min. 2 mesures pour voir le graphique</Text>
        </View>
      )}

      <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

      {/* Metric cards */}
      <View style={styles.metricsRow}>
        <TouchableOpacity
          style={[styles.metricCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : `${leftColor}08`, borderColor: `${leftColor}20` }]}
          activeOpacity={onPressLeft ? 0.7 : 1} onPress={onPressLeft} disabled={!onPressLeft}
        >
          <View style={styles.metricHeader}>
            <View style={[styles.metricDot, { backgroundColor: leftColor }]} />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>{leftLabel}</Text>
            {leftTrend === 'up' && <TrendingUp size={12} color="#10B981" strokeWidth={2.5} />}
            {leftTrend === 'down' && <TrendingDown size={12} color="#EF4444" strokeWidth={2.5} />}
            {leftTrend === 'stable' && <Minus size={12} color={colors.textMuted} strokeWidth={2.5} />}
          </View>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {leftValue > 0 ? smartFormat(leftValue) : '\u2014'}
            <Text style={[styles.metricUnit, { color: colors.textSecondary }]}> {unit}</Text>
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={[styles.progressFill, { width: `${leftBarWidth}%`, backgroundColor: leftColor }]} />
          </View>
          <Text style={[styles.progressPercent, { color: leftColor }]}>{leftBarWidth.toFixed(0)}%</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.metricCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : `${rightColor}08`, borderColor: `${rightColor}20` }]}
          activeOpacity={onPressRight ? 0.7 : 1} onPress={onPressRight} disabled={!onPressRight}
        >
          <View style={styles.metricHeader}>
            <View style={[styles.metricDot, { backgroundColor: rightColor }]} />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>{rightLabel}</Text>
            {rightTrend === 'up' && <TrendingUp size={12} color="#10B981" strokeWidth={2.5} />}
            {rightTrend === 'down' && <TrendingDown size={12} color="#EF4444" strokeWidth={2.5} />}
            {rightTrend === 'stable' && <Minus size={12} color={colors.textMuted} strokeWidth={2.5} />}
          </View>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {rightValue > 0 ? smartFormat(rightValue) : '\u2014'}
            <Text style={[styles.metricUnit, { color: colors.textSecondary }]}> {unit}</Text>
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={[styles.progressFill, { width: `${rightBarWidth}%`, backgroundColor: rightColor }]} />
          </View>
          <Text style={[styles.progressPercent, { color: rightColor }]}>{rightBarWidth.toFixed(0)}%</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  deltaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chartContainer: {
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
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
  legendLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  hintBar: {
    marginTop: 6,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyChart: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginVertical: 14,
    borderRadius: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
});
