// ============================================
// MULTI-LINE COMPARISON CARD - Graphique multi-courbes scrollable
// 2 ou 3 courbes colorees + gradient fills + chips de filtre
// Style identique a DualComparisonCard (Torse)
// ============================================

import React, { useState, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent, ScrollView, useWindowDimensions, Modal, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import Svg, { Path, Circle as SvgCircle, Line, Text as SvgText, Defs, LinearGradient, Stop, G, Rect } from 'react-native-svg';
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus, Maximize2, X } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import { useI18n } from '@/lib/I18nContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

interface LineSeries {
  label: string;
  color: string;
  history: { date: string; value: number }[];
  currentValue: number;
  onPress?: () => void;
  unit?: string; // unité spécifique à cette ligne (override le unit global)
  lowerIsBetter?: boolean; // baisse = positif (vert)
}

interface MultiLineComparisonCardProps {
  title: string;
  lines: LineSeries[];
  unit: string;
  formatValue?: (v: number) => string; // formateur personnalisé pour les labels (ex: minutes → "7h10")
}

const CHART_HEIGHT = 220;
const PAD_TOP = 46;
const PAD_BOTTOM = 45;
const PAD_LEFT = 50;
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

// Cap des points par série pour garder le chart fluide.
// Au-delà, on échantillonne uniformément (1er + dernier + équi-répartis).
const MAX_POINTS_PER_LINE = 40;
const sampleLine = (history: { date: string; value: number }[]) => {
  if (history.length <= MAX_POINTS_PER_LINE) return history;
  const sampled: typeof history = [];
  const step = (history.length - 1) / (MAX_POINTS_PER_LINE - 1);
  for (let i = 0; i < MAX_POINTS_PER_LINE; i++) sampled.push(history[Math.round(i * step)]);
  return sampled;
};

// Parse date sûr : 'yyyy-MM-dd' en local (évite le décalage UTC)
const toLocalDate = (v: any): Date =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseISO(v) : new Date(v);

// Tri récent → ancien (récent à gauche), ordre d'entrée conservé si date invalide
const sortNewestFirst = (history: { date: string; value: number }[]) =>
  history
    .map((h, i) => ({ h, i, t: toLocalDate(h.date).getTime() }))
    .sort((a, b) => (isNaN(a.t) || isNaN(b.t) ? a.i - b.i : b.t - a.t))
    .map(x => x.h);

const MultiLineComparisonCardInner: React.FC<MultiLineComparisonCardProps> = ({
  title,
  lines,
  unit,
  formatValue,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useI18n();
  const { width: SCREEN_WIDTH, height: screenHeight } = useWindowDimensions();
  const FULLSCREEN_HEIGHT = screenHeight * 0.55;
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

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setCardWidth(e.nativeEvent.layout.width);
  }, []);

  const toggleLine = useCallback((idx: number) => {
    // Haptic IMMÉDIAT pour un feedback tactile instantané
    if (Platform.OS !== 'web') {
      impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    }
    setActiveLines(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        if (next.size > 1) next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  // MEMOÏSATION CRITIQUE : `lines.filter(...)` créait une nouvelle ref à chaque render
  // → le useMemo de `chartData` perdait sa mémoïsation → tout le SVG (1500 éléments)
  // se recalculait à chaque tap sur une pill.
  const sampledLines = useMemo(
    () => lines.map(l => ({ ...l, history: sampleLine(sortNewestFirst(l.history)) })),
    [lines],
  );

  // useDeferredValue : la pill highlight utilise `activeLines` (réactif),
  // le chart utilise `deferredActiveLines` qui se met à jour quand React a du temps.
  // Résultat : la pill s'allume INSTANTANÉMENT, le chart suit ~100ms après.
  const deferredActiveLines = useDeferredValue(activeLines);

  const visibleLines = useMemo(
    () => sampledLines.filter((_, i) => deferredActiveLines.has(i)),
    [sampledLines, deferredActiveLines],
  );
  const hasData = useMemo(
    () => visibleLines.some(l => l.history.length >= 1),
    [visibleLines],
  );
  const maxValue = useMemo(
    () => Math.max(...lines.map(l => l.currentValue), 1),
    [lines],
  );

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
    // Si toutes les valeurs sont >= 0, jamais descendre sous 0 sur l'axe Y
    const rawYMin = dataMin - range * 0.15;
    const yMin = dataMin >= 0 ? Math.max(0, rawYMin) : rawYMin;
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
      // 1 décimale si petite plage (évite les labels répétés)
      return { val: yRange < 5 ? Math.round(val * 10) / 10 : Math.round(val), y: PAD_TOP + plotH - (plotH / ySteps) * i };
    });

    const longestHistory = visibleLines.reduce((a, b) => a.history.length >= b.history.length ? a : b).history;
    const maxXLabels = Math.floor(svgWidth / 60);
    const xLabels = longestHistory.map((h, i) => {
      const x = PAD_LEFT + (i / Math.max(longestHistory.length - 1, 1)) * plotW;
      let line1 = '';
      let line2 = '';
      try {
        const d = toLocalDate(h.date);
        line1 = format(d, 'd MMM', { locale: dateLocale });
        line2 = format(d, 'yyyy');
      } catch { line1 = ''; line2 = ''; }
      return { x, line1, line2 };
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
          <SvgText key={`yl-${i}`} x={PAD_LEFT - 8} y={yl.y + 4} fontSize={9} fontWeight="700" fill={textMuted} textAnchor="end">{formatValue ? formatValue(yl.val) : smartFormat(yl.val)}</SvgText>
        ))}
        {/* Label unité axe Y en haut à gauche */}
        {unit ? <SvgText x={PAD_LEFT - 8} y={PAD_TOP - 6} fontSize={8} fontWeight="600" fill={textMuted} textAnchor="end">{unit}</SvgText> : null}
        {/* Label axe X : décalé à gauche sous le label min Y pour éviter le chevauchement avec les années */}
        <SvgText x={PAD_LEFT - 8} y={data.chartHeight - PAD_BOTTOM + 14} fontSize={8} fontWeight="600" fill={textMuted} textAnchor="end">Date</SvgText>
        {data.xLabels.map((xl, i) => {
          if (data.xLabels.length > data.maxXLabels) {
            const step = Math.ceil(data.xLabels.length / data.maxXLabels);
            if (i % step !== 0 && i !== data.xLabels.length - 1) return null;
          }
          const isFirst = i === 0; const isLast = i === data.xLabels.length - 1;
          const xPos = isFirst ? xl.x + 2 : isLast ? xl.x - 2 : xl.x;
          const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
          return (
            <G key={`xl-${i}`}>
              <SvgText x={xPos} y={height - 14} textAnchor={anchor} fontSize={9} fontWeight="600" fill={textMuted}>{xl.line1}</SvgText>
              {xl.line2 ? <SvgText x={xPos} y={height - 3} textAnchor={anchor} fontSize={8} fontWeight="500" fill={textMuted} opacity={0.6}>{xl.line2}</SvgText> : null}
            </G>
          );
        })}

        {/* Aires + courbes en premier (sous les labels) */}
        {data.lineData.map((ld, lineIdx) => (
          <G key={`curves-${lineIdx}`}>
            {ld.area && <Path d={ld.area} fill={`url(#multiGrad-${lineIdx}${isFullscreen ? '-fs' : ''})`} />}
            {ld.line && <Path d={ld.line} fill="none" stroke={ld.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
          </G>
        ))}

        {/* Valeurs : seulement sur premier + dernier + min + max de chaque ligne pour
            éviter les chevauchements quand plusieurs lignes ont des valeurs proches.
            En mode plein écran, on les affiche toutes (espace dispo). */}
        {data.lineData.map((ld, lineIdx) => {
          // Calculer les indices à afficher
          const total = ld.pts.length;
          const indicesToShow = new Set<number>();
          if (total === 0) return null;
          indicesToShow.add(0);                    // premier
          indicesToShow.add(total - 1);            // dernier
          if (total > 2) {
            // min et max
            let minIdx = 0, maxIdx = 0;
            ld.pts.forEach((p, i) => {
              if (p.value < ld.pts[minIdx].value) minIdx = i;
              if (p.value > ld.pts[maxIdx].value) maxIdx = i;
            });
            indicesToShow.add(minIdx);
            indicesToShow.add(maxIdx);
          }
          // En plein écran, on montre tout
          const showAll = isFullscreen;

          return ld.pts.map((pt, idx) => {
            if (!showAll && !indicesToShow.has(idx)) return null;
            const isFirst = idx === 0; const isLast = idx === total - 1;
            const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
            const lx = isFirst ? pt.x + 2 : isLast ? pt.x - 2 : pt.x;
            const label = formatValue ? formatValue(pt.value) : smartFormat(pt.value);
            const w = label.length * 6 + 10;
            // Décalage vertical selon l'index de ligne pour limiter chevauchement
            // ligne 0 = au-dessus du point, ligne 1 = en-dessous, ligne 2 = au-dessus +éloigné
            const yOffset = lineIdx === 1 ? 18 : (lineIdx === 2 ? -28 : -20);
            const labelY = lineIdx === 1
              ? Math.min(pt.y + 18, data.chartHeight - 18)
              : Math.max(pt.y + yOffset, 4);
            const rx = anchor === 'start' ? lx : anchor === 'end' ? lx - w : lx - w / 2;
            return (
              <G key={`vl-${lineIdx}-${idx}`}>
                <Rect x={rx} y={labelY - 11} width={w} height={14} rx={4} ry={4}
                  fill={isDark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)'} stroke={ld.color} strokeWidth={0.7} />
                <SvgText x={lx} y={labelY} textAnchor={anchor} fontSize={8.5} fontWeight="800" fill={isDark ? '#FFFFFF' : '#1a1a1a'}>{label}</SvgText>
              </G>
            );
          });
        })}

        {/* Points par-dessus les labels */}
        {data.lineData.map((ld, lineIdx) =>
          ld.pts.map((pt, idx) => (
            <G key={`p-${lineIdx}-${idx}`}>
              <SvgCircle cx={pt.x} cy={pt.y} r={5} fill={ld.color} opacity={0.12} />
              <SvgCircle cx={pt.x} cy={pt.y} r={3.5} fill={isDark ? colors.backgroundCard : '#FFFFFF'} stroke={ld.color} strokeWidth={2} />
            </G>
          ))
        )}
      </Svg>
    );
  };

  const firstColor = lines[0]?.color || '#6366F1';
  const lastColor = lines[lines.length - 1]?.color || firstColor;

  return (
    <TouchableOpacity
      activeOpacity={0.97}
      onPress={() => hasData && setFullscreen(true)}
      disabled={!hasData}
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
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${line.label} ${isActive ? 'visible' : 'masquée'}`}
              accessibilityHint="Toucher pour afficher ou masquer cette courbe"
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
            <Text style={[styles.hintText, { color: colors.textMuted }]}>Fais défiler pour voir plus, le plus récent à gauche</Text>
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
          // Historique trié récent en premier : [0] = dernier, [1] = précédent
          const h = sortNewestFirst(line.history ?? []); // historique complet (pas l'échantillon du graphique)
          const trend = h.length >= 2
            ? (h[0].value > h[1].value ? 'up' : h[0].value < h[1].value ? 'down' : 'stable')
            : 'stable';
          const upColor = line.lowerIsBetter ? '#EF4444' : '#10B981';
          const downColor = line.lowerIsBetter ? '#10B981' : '#EF4444';
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
                {trend === 'up' && <TrendingUp size={12} color={upColor} strokeWidth={2.5} />}
                {trend === 'down' && <TrendingDown size={12} color={downColor} strokeWidth={2.5} />}
                {trend === 'stable' && <Minus size={12} color={colors.textMuted} strokeWidth={2.5} />}
              </View>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {line.currentValue > 0 ? (formatValue ? formatValue(line.currentValue) : smartFormat(line.currentValue)) : '\u2014'}
                {!formatValue && <Text style={[styles.metricUnit, { color: colors.textSecondary }]}> {line.unit !== undefined ? line.unit : unit}</Text>}
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
    </TouchableOpacity>
  );
};

// React.memo avec comparaison DEEP personnalisée : le parent (CorpsTabPage) recrée
// l'array `lines` inline à chaque render, donc shallow compare est inefficace.
// On compare par contenu (titre, unit, couleurs, historiques par length + date du
// dernier point) pour ne re-render que quand les DATA changent réellement.
const areLinesEqual = (prev: MultiLineComparisonCardProps, next: MultiLineComparisonCardProps) => {
  if (prev.title !== next.title) return false;
  if (prev.unit !== next.unit) return false;
  if (prev.formatValue !== next.formatValue) return false;
  if (prev.lines.length !== next.lines.length) return false;
  for (let i = 0; i < prev.lines.length; i++) {
    const a = prev.lines[i], b = next.lines[i];
    if (a.label !== b.label) return false;
    if (a.color !== b.color) return false;
    if (a.currentValue !== b.currentValue) return false;
    if (a.lowerIsBetter !== b.lowerIsBetter) return false;
    if (a.history.length !== b.history.length) return false;
    // Heuristique rapide : si len identique + dernière entrée identique, on considère égal
    const la = a.history[a.history.length - 1];
    const lb = b.history[b.history.length - 1];
    if (la?.date !== lb?.date || la?.value !== lb?.value) return false;
  }
  return true;
};
export const MultiLineComparisonCard = React.memo(MultiLineComparisonCardInner, areLinesEqual);

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
