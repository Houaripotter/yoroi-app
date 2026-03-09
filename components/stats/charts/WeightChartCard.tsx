// ============================================
// WEIGHT CHART CARD - Évolution du poids
// Style identique à DualComparisonCard
// Mini rectangles cliquables → scroll vers le point
// Récent = DROITE (auto-scroll)
// ============================================

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  LayoutChangeEvent, ScrollView,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import Svg, {
  Path, Circle as SvgCircle, Line, Text as SvgText,
  Defs, LinearGradient, Stop, G, Rect,
} from 'react-native-svg';
import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useI18n } from '@/lib/I18nContext';

interface WeightChartCardProps {
  data: { date?: string; value: number }[];
  color?: string;
  unit?: string;
  title?: string;
  targetWeight?: number;
  newestFirst?: boolean;
  onPressWeight?: () => void;
  onPressTarget?: () => void;
}

const CHART_HEIGHT = 220;
const PAD_TOP = 30;
const PAD_BOTTOM = 35;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const POINT_WIDTH = 70;

type MetricKey = 'current' | 'min' | 'max' | 'avg';

const smartFmt = (v: number): string =>
  Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '');

const buildSmooth = (pts: { x: number; y: number }[]): string => {
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

export const WeightChartCard: React.FC<WeightChartCardProps> = ({
  data,
  color = '#3B82F6',
  unit = ' kg',
  title = 'Évolution du poids',
  targetWeight,
  newestFirst = false,
  onPressWeight,
  onPressTarget,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useI18n();
  const dateLocale = language === 'fr' ? fr : enUS;
  const [cardWidth, setCardWidth] = useState(0);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('current');
  const scrollRef = useRef<ScrollView>(null);

  const handleLayout = (e: LayoutChangeEvent) =>
    setCardWidth(e.nativeEvent.layout.width);

  const hasData = data.length >= 1;
  const isScrollable = data.length > 5;

  // ─── Métriques calculées ───────────────────
  const metrics = useMemo(() => {
    if (!hasData) return null;
    const vals = data.map(d => d.value);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    // Si newestFirst, le plus récent est à l'index 0, sinon à la fin
    const currentIdx = newestFirst ? 0 : vals.length - 1;
    const current = vals[currentIdx];
    const minIdx = vals.indexOf(minVal);
    const maxIdx = vals.indexOf(maxVal);
    const avgIdx = vals.reduce(
      (best, v, i) => Math.abs(v - avg) < Math.abs(vals[best] - avg) ? i : best, 0,
    );
    const trend = vals.length >= 2
      ? newestFirst
        ? vals[0] > vals[1] ? 'up' : vals[0] < vals[1] ? 'down' : 'stable'
        : vals[currentIdx] > vals[currentIdx - 1] ? 'up'
        : vals[currentIdx] < vals[currentIdx - 1] ? 'down' : 'stable'
      : 'stable';
    return { minVal, maxVal, avg, current, minIdx, maxIdx, currentIdx, avgIdx, trend };
  }, [data, hasData, newestFirst]);

  // ─── Données SVG ──────────────────────────
  const chartData = useMemo(() => {
    if (!hasData || cardWidth === 0) return null;
    const minW = cardWidth - 32;
    const svgWidth = isScrollable ? Math.max(minW, data.length * POINT_WIDTH) : minW;
    const plotW = svgWidth - PAD_LEFT - PAD_RIGHT;
    const plotH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const plotBottom = PAD_TOP + plotH;

    const vals = data.map(d => d.value);
    const dataMin = Math.min(...vals);
    const dataMax = Math.max(...vals);
    const range = dataMax - dataMin || 1;
    const yMin = dataMin - range * 0.15;
    const yMax = dataMax + range * 0.15;
    const yRange = yMax - yMin;

    const pts = data.map((d, i) => ({
      x: PAD_LEFT + (i / Math.max(data.length - 1, 1)) * plotW,
      y: PAD_TOP + plotH - ((d.value - yMin) / yRange) * plotH,
      value: d.value,
      date: d.date,
    }));

    const line = buildSmooth(pts);
    const area = pts.length > 0
      ? line
        + ` L ${pts[pts.length - 1].x.toFixed(1)} ${plotBottom}`
        + ` L ${pts[0].x.toFixed(1)} ${plotBottom} Z`
      : '';

    const ySteps = 4;
    const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => ({
      val: yMin + (yRange / ySteps) * i,
      y: PAD_TOP + plotH - (plotH / ySteps) * i,
    }));

    const maxXLabels = Math.floor(svgWidth / 60);
    const xLabels = data.map((d, i) => {
      const x = PAD_LEFT + (i / Math.max(data.length - 1, 1)) * plotW;
      let label = '';
      try { if (d.date) label = format(new Date(d.date), 'd/MM', { locale: dateLocale }); } catch {}
      return { x, label };
    });

    return { svgWidth, pts, line, area, yLabels, xLabels, maxXLabels, plotBottom };
  }, [hasData, cardWidth, data, dateLocale, isScrollable]);

  // ─── Auto-scroll : droite (récent à droite) ou gauche (récent à gauche) ──
  const handleContentSizeChange = useCallback((contentWidth: number) => {
    if (isScrollable && scrollRef.current && contentWidth > cardWidth - 32) {
      if (newestFirst) {
        scrollRef.current.scrollTo({ x: 0, animated: false });
      } else {
        scrollRef.current.scrollToEnd({ animated: false });
      }
    }
  }, [isScrollable, cardWidth, newestFirst]);

  // ─── Scroll vers un point précis ──────────
  const scrollToIndex = useCallback((idx: number) => {
    if (!chartData || !scrollRef.current) return;
    const pt = chartData.pts[idx];
    if (!pt) return;
    const viewW = cardWidth - 32;
    const scrollX = Math.max(0, pt.x - viewW / 2);
    scrollRef.current.scrollTo({ x: scrollX, animated: true });
  }, [chartData, cardWidth]);

  const handleMetricPress = (key: MetricKey) => {
    setActiveMetric(key);
    if (!metrics) return;
    const idxMap: Record<MetricKey, number> = {
      current: metrics.currentIdx,
      min: metrics.minIdx,
      max: metrics.maxIdx,
      avg: metrics.avgIdx,
    };
    scrollToIndex(idxMap[key]);
  };

  // ─── Définition des mini rectangles ───────
  const METRIC_COLORS: Record<MetricKey, string> = {
    current: color,
    min: '#10B981',
    max: '#EF4444',
    avg: '#8B5CF6',
  };
  const METRIC_LABELS: Record<MetricKey, string> = {
    current: 'Actuel',
    min: 'Mini',
    max: 'Maxi',
    avg: 'Moy',
  };
  const metricDefs = (metrics ? (['current', 'min', 'max', 'avg'] as MetricKey[]).map(k => ({
    key: k,
    label: METRIC_LABELS[k],
    value: k === 'avg' ? metrics.avg : k === 'min' ? metrics.minVal : k === 'max' ? metrics.maxVal : metrics.current,
    color: METRIC_COLORS[k],
  })) : []);

  const highlightIdx = metrics
    ? ({ current: metrics.currentIdx, min: metrics.minIdx, max: metrics.maxIdx, avg: metrics.avgIdx })[activeMetric]
    : -1;
  const hlColor = METRIC_COLORS[activeMetric];

  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const textMuted = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.35)';

  return (
    <View
      style={[styles.container, {
        backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }]}
      onLayout={handleLayout}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: `${color}18` }]}>
            <Scale size={16} color={color} strokeWidth={2.5} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        {metrics && (
          <View style={[styles.trendBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            {metrics.trend === 'up'
              ? <TrendingUp size={12} color="#EF4444" strokeWidth={2.5} />
              : metrics.trend === 'down'
              ? <TrendingDown size={12} color="#10B981" strokeWidth={2.5} />
              : <Minus size={12} color={colors.textMuted} strokeWidth={2.5} />}
            <Text style={[styles.trendText, {
              color: metrics.trend === 'up' ? '#EF4444' : metrics.trend === 'down' ? '#10B981' : colors.textMuted,
            }]}>
              {metrics.trend === 'up' ? 'Hausse' : metrics.trend === 'down' ? 'Baisse' : 'Stable'}
            </Text>
          </View>
        )}
      </View>

      {/* ── Mini rectangles cliquables ── */}
      {metricDefs.length > 0 && (
        <View style={styles.metricRow}>
          {metricDefs.map(m => {
            const isActive = activeMetric === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => handleMetricPress(m.key)}
                activeOpacity={0.7}
                style={[
                  styles.metricRect,
                  {
                    backgroundColor: isActive
                      ? isDark ? `${m.color}28` : `${m.color}14`
                      : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: isActive ? `${m.color}55` : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
                    borderWidth: isActive ? 1.5 : 1,
                  },
                ]}
              >
                <View style={[styles.metricDot, { backgroundColor: m.color }]} />
                <Text style={[styles.metricLabel, { color: isActive ? m.color : colors.textSecondary }]} numberOfLines={1}>
                  {m.label}
                </Text>
                <Text style={[styles.metricValue, { color: isActive ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1}>
                  {smartFmt(m.value)}
                  <Text style={styles.metricUnit}>{unit}</Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Graphique SVG ── */}
      {hasData && cardWidth > 0 && chartData && (
        <View style={styles.chartContainer}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={handleContentSizeChange}
            scrollEnabled={isScrollable}
            nestedScrollEnabled
          >
            <Svg width={chartData.svgWidth} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="wgGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={isDark ? '0.40' : '0.30'} />
                  <Stop offset="0.5" stopColor={color} stopOpacity={isDark ? '0.15' : '0.10'} />
                  <Stop offset="1" stopColor={color} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* Grille horizontale */}
              {chartData.yLabels.map((yl, i) => (
                <Line key={`hg-${i}`} x1={PAD_LEFT} y1={yl.y} x2={chartData.svgWidth - PAD_RIGHT} y2={yl.y}
                  stroke={gridColor} strokeWidth={1} strokeDasharray="4,6" />
              ))}
              {chartData.yLabels.map((yl, i) => (
                <SvgText key={`yl-${i}`} x={PAD_LEFT - 6} y={yl.y + 4}
                  fontSize={9} fontWeight="700" fill={textMuted} textAnchor="end">
                  {smartFmt(yl.val)}
                </SvgText>
              ))}

              {/* Labels X */}
              {chartData.xLabels.map((xl, i) => {
                if (chartData.xLabels.length > chartData.maxXLabels) {
                  const step = Math.ceil(chartData.xLabels.length / chartData.maxXLabels);
                  if (i % step !== 0 && i !== chartData.xLabels.length - 1) return null;
                }
                return (
                  <SvgText key={`xl-${i}`} x={xl.x} y={CHART_HEIGHT - 6}
                    textAnchor="middle" fontSize={9} fontWeight="600" fill={textMuted}>
                    {xl.label}
                  </SvgText>
                );
              })}

              {/* Aire + courbe */}
              {chartData.area && <Path d={chartData.area} fill="url(#wgGrad)" />}
              {chartData.line && (
                <Path d={chartData.line} fill="none" stroke={color}
                  strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Ligne verticale sur le point sélectionné */}
              {highlightIdx >= 0 && chartData.pts[highlightIdx] && (
                <Line
                  x1={chartData.pts[highlightIdx].x} y1={PAD_TOP}
                  x2={chartData.pts[highlightIdx].x} y2={chartData.plotBottom}
                  stroke={hlColor} strokeWidth={1.5} strokeDasharray="4,4" opacity={0.55}
                />
              )}

              {/* Points */}
              {chartData.pts.map((pt, idx) => {
                const isHL = idx === highlightIdx;
                const ptColor = isHL ? hlColor : color;
                return (
                  <G key={`p-${idx}`}>
                    <SvgCircle cx={pt.x} cy={pt.y} r={isHL ? 8 : 4} fill={ptColor} opacity={isHL ? 0.18 : 0.09} />
                    <SvgCircle cx={pt.x} cy={pt.y} r={isHL ? 4.5 : 3}
                      fill={isDark ? colors.backgroundCard : '#FFFFFF'}
                      stroke={ptColor} strokeWidth={isHL ? 2.5 : 1.8} />
                  </G>
                );
              })}

              {/* Étiquette valeur sur le point sélectionné */}
              {highlightIdx >= 0 && chartData.pts[highlightIdx] && (() => {
                const pt = chartData.pts[highlightIdx];
                const label = `${smartFmt(pt.value)}${unit}`;
                const w = label.length * 6.5 + 12;
                return (
                  <G>
                    <Rect x={pt.x - w / 2} y={pt.y - 27} width={w} height={17} rx={6} ry={6} fill={hlColor} opacity={0.93} />
                    <SvgText x={pt.x} y={pt.y - 15} textAnchor="middle" fontSize={9} fontWeight="800" fill="#FFFFFF">
                      {label}
                    </SvgText>
                  </G>
                );
              })()}

              {/* Étiquette du point le plus récent si pas déjà sélectionné */}
              {(() => {
                const recentIdx = newestFirst ? 0 : chartData.pts.length - 1;
                if (highlightIdx === recentIdx || chartData.pts.length === 0) return null;
                const lp = chartData.pts[recentIdx];
                return (
                  <G>
                    <Rect x={lp.x - 20} y={lp.y - 24} width={40} height={16} rx={6} ry={6} fill={color} opacity={0.9} />
                    <SvgText x={lp.x} y={lp.y - 13} textAnchor="middle" fontSize={9} fontWeight="800" fill="#FFFFFF">
                      {smartFmt(lp.value)}
                    </SvgText>
                  </G>
                );
              })()}
            </Svg>
          </ScrollView>

          {isScrollable && (
            <View style={styles.hintBar}>
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                {newestFirst ? 'Defiler pour voir plus · Recent a gauche' : 'Defiler pour voir plus · Recent a droite'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Poids actuel + Objectif ── */}
      {metrics && (targetWeight ?? 0) > 0 && (
        <>
          <View style={[styles.bottomSeparator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
          <View style={styles.bottomMetricsRow}>
            <TouchableOpacity
              style={[styles.bottomMetricCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : `${color}08`, borderColor: `${color}20` }]}
              activeOpacity={onPressWeight ? 0.7 : 1}
              onPress={onPressWeight}
              disabled={!onPressWeight}
            >
              <View style={styles.bottomMetricHeader}>
                <View style={[styles.bottomMetricDot, { backgroundColor: color }]} />
                <Text style={[styles.bottomMetricLabel, { color: colors.textSecondary }]}>Actuel</Text>
                {metrics.trend === 'up' && <TrendingUp size={12} color="#EF4444" strokeWidth={2.5} />}
                {metrics.trend === 'down' && <TrendingDown size={12} color="#10B981" strokeWidth={2.5} />}
                {metrics.trend === 'stable' && <Minus size={12} color={colors.textMuted} strokeWidth={2.5} />}
              </View>
              <Text style={[styles.bottomMetricValue, { color: colors.textPrimary }]}>
                {smartFmt(metrics.current)}
                <Text style={[styles.bottomMetricUnit, { color: colors.textSecondary }]}>{unit}</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomMetricCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#10B98108', borderColor: '#10B98120' }]}
              activeOpacity={onPressTarget ? 0.7 : 1}
              onPress={onPressTarget}
              disabled={!onPressTarget}
            >
              <View style={styles.bottomMetricHeader}>
                <View style={[styles.bottomMetricDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.bottomMetricLabel, { color: colors.textSecondary }]}>Objectif</Text>
              </View>
              <Text style={[styles.bottomMetricValue, { color: colors.textPrimary }]}>
                {smartFmt(targetWeight!)}
                <Text style={[styles.bottomMetricUnit, { color: colors.textSecondary }]}>{unit}</Text>
              </Text>
              <View style={[styles.bottomProgressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.bottomProgressFill, {
                  width: `${Math.min(100, (targetWeight! / Math.max(metrics.current, targetWeight!)) * 100)}%`,
                  backgroundColor: '#10B981',
                }]} />
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {!hasData && (
        <View style={styles.empty}>
          <Scale size={28} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Ajoute au moins une pesee pour voir l'evolution
          </Text>
        </View>
      )}
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
    marginBottom: 14,
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
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Mini rectangles
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricRect: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  metricUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Chart
  chartContainer: {
    marginBottom: 4,
  },
  hintBar: {
    marginTop: 8,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Empty
  empty: {
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Bottom metric cards (Actuel + Objectif)
  bottomSeparator: {
    height: 1,
    marginVertical: 14,
    borderRadius: 0.5,
  },
  bottomMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bottomMetricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  bottomMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomMetricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bottomMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  bottomMetricValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  bottomMetricUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  bottomProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
