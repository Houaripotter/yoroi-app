// ============================================
// MULTI-LINE COMPARISON CARD - Graphique multi-courbes scrollable
// 2 ou 3 courbes colorees + gradient fills + chips de filtre
// Style identique a DualComparisonCard (Torse)
// ============================================

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent, ScrollView, Dimensions, Modal } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import Svg, { Path, Circle as SvgCircle, Line, Text as SvgText, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus, Maximize2, X } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useI18n } from '@/lib/I18nContext';

interface LineSeries {
  label: string;
  color: string;
  history: { date: string; value: number }[];
  currentValue: number;
  onPress?: () => void;
  unit?: string; // unité spécifique à cette ligne (override le unit global)
}

interface MultiLineComparisonCardProps {
  title: string;
  lines: LineSeries[];
  unit: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHART_HEIGHT = 220;
const FULLSCREEN_HEIGHT = SCREEN_HEIGHT * 0.55;
const PAD_TOP = 30;
const PAD_BOTTOM = 35;
const PAD_LEFT = 45;
const PAD_RIGHT = 16;
const POINT_WIDTH = 70;

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

export const MultiLineComparisonCard: React.FC<MultiLineComparisonCardProps> = ({
  title,
  lines,
  unit,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useI18n();
  const dateLocale = fr;
  const [cardWidth, setCardWidth] = useState(0);
  const [activeLines, setActiveLines] = useState<Set<number>>(() => new Set(lines.map((_, i) => i)));
  const [fullscreen, setFullscreen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fsScrollRef = useRef<ScrollView>(null);

  const handleScrollContentSize = useCallback((contentWidth: number) => {
    if (scrollRef.current && contentWidth > cardWidth - 32) {
      scrollRef.current.scrollTo({ x: 0, animated: false });
    }
  }, [cardWidth]);

  const handleFsScrollContentSize = useCallback((contentWidth: number) => {
    if (fsScrollRef.current && contentWidth > SCREEN_WIDTH) {
      fsScrollRef.current.scrollTo({ x: 0, animated: false });
    }
  }, []);

  const handleLayout = (e: LayoutChangeEvent) => {
    setCardWidth(e.nativeEvent.layout.width);
  };

  const toggleLine = (idx: number) => {
    setActiveLines(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        if (next.size > 1) next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const visibleLines = lines.filter((_, i) => activeLines.has(i));
  const hasData = visibleLines.some(l => l.history.length >= 1);
  const maxValue = Math.max(...lines.map(l => l.currentValue), 1);

  const computeChart = (containerWidth: number, chartHeight: number) => {
    if (!hasData || containerWidth === 0) return null;

    const maxLen = Math.max(...visibleLines.map(l => l.history.length));
    const scrollableWidth = Math.max(containerWidth - 32, maxLen * POINT_WIDTH);
    const svgWidth = scrollableWidth;
    const plotW = svgWidth - PAD_LEFT - PAD_RIGHT;
    const plotH = chartHeight - PAD_TOP - PAD_BOTTOM;

    const allValues = visibleLines.flatMap(l => l.history.map(h => h.value));
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

    const lineData = visibleLines.map(l => {
      const pts = toPoints(l.history);
      const line = buildSmooth(pts);
      const area = pts.length > 0
        ? line + ` L ${pts[pts.length - 1].x.toFixed(1)} ${plotBottom} L ${pts[0].x.toFixed(1)} ${plotBottom} Z`
        : '';
      return { pts, line, area, color: l.color, label: l.label };
    });

    const ySteps = 4;
    const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
      const val = yMin + (yRange / ySteps) * i;
      return { val: Math.round(val * 10) / 10, y: PAD_TOP + plotH - (plotH / ySteps) * i };
    });

    const longestHistory = visibleLines.reduce((a, b) => a.history.length >= b.history.length ? a : b).history;
    const maxXLabels = Math.floor(svgWidth / 60);
    const xLabels = longestHistory.map((h, i) => {
      const x = PAD_LEFT + (i / Math.max(longestHistory.length - 1, 1)) * plotW;
      let label = '';
      try { label = format(new Date(h.date), 'd/MM', { locale: dateLocale }); } catch { label = ''; }
      return { x, label };
    });

    return { svgWidth, lineData, yLabels, xLabels, maxXLabels, plotBottom, chartHeight };
  };

  const chartData = useMemo(() => computeChart(cardWidth, CHART_HEIGHT), [hasData, cardWidth, visibleLines, dateLocale]);

  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const textMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';

  const renderChart = (data: NonNullable<ReturnType<typeof computeChart>>, isFullscreen: boolean) => {
    const height = isFullscreen ? FULLSCREEN_HEIGHT : CHART_HEIGHT;
    return (
      <Svg width={data.svgWidth} height={height}>
        <Defs>
          {data.lineData.map((ld, i) => (
            <LinearGradient key={`grad-${i}`} id={`multiGrad-${i}${isFullscreen ? '-fs' : ''}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={ld.color} stopOpacity={isDark ? '0.35' : '0.25'} />
              <Stop offset="0.5" stopColor={ld.color} stopOpacity={isDark ? '0.12' : '0.08'} />
              <Stop offset="1" stopColor={ld.color} stopOpacity="0.02" />
            </LinearGradient>
          ))}
        </Defs>

        {data.yLabels.map((yl, i) => (
          <Line key={`hg-${i}`} x1={PAD_LEFT} y1={yl.y} x2={data.svgWidth - PAD_RIGHT} y2={yl.y} stroke={gridColor} strokeWidth={1} strokeDasharray="4,6" />
        ))}
        {data.yLabels.map((yl, i) => (
          <SvgText key={`yl-${i}`} x={PAD_LEFT - 8} y={yl.y + 4} fontSize={9} fontWeight="700" fill={textMuted} textAnchor="end">{yl.val.toFixed(1)}</SvgText>
        ))}
        {data.xLabels.map((xl, i) => {
          if (data.xLabels.length > data.maxXLabels) {
            const step = Math.ceil(data.xLabels.length / data.maxXLabels);
            if (i % step !== 0 && i !== data.xLabels.length - 1) return null;
          }
          return <SvgText key={`xl-${i}`} x={xl.x} y={height - 6} textAnchor="middle" fontSize={9} fontWeight="600" fill={textMuted}>{xl.label}</SvgText>;
        })}

        {data.lineData.map((ld, lineIdx) => (
          <G key={`line-${lineIdx}`}>
            {ld.area && <Path d={ld.area} fill={`url(#multiGrad-${lineIdx}${isFullscreen ? '-fs' : ''})`} />}
            {ld.line && <Path d={ld.line} fill="none" stroke={ld.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
            {ld.pts.map((pt, idx) => (
              <G key={`p-${lineIdx}-${idx}`}>
                <SvgCircle cx={pt.x} cy={pt.y} r={5} fill={ld.color} opacity={0.12} />
                <SvgCircle cx={pt.x} cy={pt.y} r={3.5} fill={isDark ? colors.backgroundCard : '#FFFFFF'} stroke={ld.color} strokeWidth={2} />
              </G>
            ))}
            {ld.pts.length > 0 && (() => {
              const lp = ld.pts[0];
              return (
                <G>
                  <Rect x={lp.x - 20} y={lp.y - 24} width={40} height={16} rx={6} ry={6} fill={ld.color} opacity={0.9} />
                  <SvgText x={lp.x} y={lp.y - 13} textAnchor="middle" fontSize={9} fontWeight="800" fill="#FFFFFF">{smartFormat(lp.value)}</SvgText>
                </G>
              );
            })()}
          </G>
        ))}
      </Svg>
    );
  };

  const firstColor = lines[0]?.color || '#6366F1';
  const lastColor = lines[lines.length - 1]?.color || firstColor;

  return (
    <View
      style={[styles.container, {
        backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }]}
      onLayout={handleLayout}
    >
      {/* Titre centré avec accent couleur */}
      <View style={styles.titleRow}>
        <View style={[styles.titleDash, { backgroundColor: firstColor }]} />
        <Text style={[styles.titleText, { color: colors.textPrimary }]}>{title.toUpperCase()}</Text>
        <View style={[styles.titleDash, { backgroundColor: lastColor }]} />
        {hasData && (
          <TouchableOpacity onPress={() => setFullscreen(true)} activeOpacity={0.7}
            style={[styles.expandBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Maximize2 size={14} color={colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.chipRow}>
        {lines.map((line, i) => {
          const isActive = activeLines.has(i);
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? line.color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  borderColor: isActive ? line.color : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                },
              ]}
              onPress={() => toggleLine(i)}
              activeOpacity={0.7}
            >
              <View style={[styles.chipDot, { backgroundColor: isActive ? '#FFFFFF' : line.color }]} />
              <Text style={[styles.chipText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}>
                {line.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chart scrollable */}
      {hasData && cardWidth > 0 && chartData && (
        <View style={styles.chartContainer}>
          <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: chartData.svgWidth }} onContentSizeChange={handleScrollContentSize}>
            {renderChart(chartData, false)}
          </ScrollView>
          {/* Legende */}
          <View style={styles.legendRow}>
            {visibleLines.map((line, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: line.color }]} />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{line.label}</Text>
              </View>
            ))}
          </View>
          {/* Hint scroll */}
          <View style={styles.hintBar}>
            <Text style={[styles.hintText, { color: colors.textMuted }]}>Defiler pour voir plus · Recent a gauche</Text>
          </View>
        </View>
      )}

      {!hasData && (
        <View style={styles.emptyChart}>
          <ArrowLeftRight size={28} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Min. 1 mesure pour voir le graphique</Text>
        </View>
      )}

      {/* Separator */}
      <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

      {/* Metric Cards */}
      <View style={styles.metricsGrid}>
        {lines.map((line, i) => {
          const trend = line.history.length >= 2
            ? (line.history[line.history.length - 1].value > line.history[line.history.length - 2].value ? 'up' : line.history[line.history.length - 1].value < line.history[line.history.length - 2].value ? 'down' : 'stable')
            : 'stable';
          const barWidth = maxValue > 0 ? (line.currentValue / maxValue) * 100 : 0;

          return (
            <TouchableOpacity
              key={i}
              style={[styles.metricCard, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : `${line.color}08`,
                borderColor: `${line.color}20`,
              }]}
              activeOpacity={line.onPress ? 0.7 : 1}
              onPress={line.onPress}
              disabled={!line.onPress}
            >
              <View style={styles.metricHeader}>
                <View style={[styles.metricDot, { backgroundColor: line.color }]} />
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>{line.label}</Text>
                {trend === 'up' && <TrendingUp size={12} color="#10B981" strokeWidth={2.5} />}
                {trend === 'down' && <TrendingDown size={12} color="#EF4444" strokeWidth={2.5} />}
                {trend === 'stable' && <Minus size={12} color={colors.textMuted} strokeWidth={2.5} />}
              </View>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {line.currentValue > 0 ? smartFormat(line.currentValue) : '\u2014'}
                <Text style={[styles.metricUnit, { color: colors.textSecondary }]}> {line.unit !== undefined ? line.unit : unit}</Text>
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.progressFill, { width: `${barWidth}%`, backgroundColor: line.color }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fullscreen Modal */}
      <Modal visible={fullscreen} animationType="slide" transparent statusBarTranslucent>
        <View style={[styles.fullscreenOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.98)' }]}>
          <View style={styles.fullscreenHeader}>
            <Text style={[styles.fullscreenTitle, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={() => setFullscreen(false)} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
              <X size={20} color={colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          {/* Chips in fullscreen */}
          <View style={[styles.chipRow, { paddingHorizontal: 20 }]}>
            {lines.map((line, i) => {
              const isActive = activeLines.has(i);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, {
                    backgroundColor: isActive ? line.color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                    borderColor: isActive ? line.color : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'),
                  }]}
                  onPress={() => toggleLine(i)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.chipDot, { backgroundColor: isActive ? '#FFFFFF' : line.color }]} />
                  <Text style={[styles.chipText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}>{line.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <ScrollView ref={fsScrollRef} horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 20 }} onContentSizeChange={handleFsScrollContentSize}>
            {(() => {
              const fsData = computeChart(Math.max(SCREEN_WIDTH, (Math.max(...visibleLines.map(l => l.history.length))) * 100), FULLSCREEN_HEIGHT);
              if (!fsData) return null;
              return renderChart(fsData, true);
            })()}
          </ScrollView>
        </View>
      </Modal>
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
  // Titre centré avec tirets colorés
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  titleDash: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  expandBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    flexWrap: 'wrap',
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
    marginTop: 8,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
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
  fullscreenOverlay: {
    flex: 1,
    paddingTop: 60,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  fullscreenTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
