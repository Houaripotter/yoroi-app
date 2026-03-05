// ============================================
// SCROLLABLE LINE CHART - Graphique scrollable
// Fond card arrondi, gradient elegant, design pro
// ============================================

import React, { useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Modal, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { format, parseISO, Locale } from 'date-fns';
import { fr, es, de, it, pt, ru, ar, zhCN } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ScrollableLineChartProps {
  data: { date?: string; value: number }[];
  color?: string;
  height?: number;
  compact?: boolean;
  unit?: string;
  title?: string;
  onPress?: () => void;
}



export const ScrollableLineChart: React.FC<ScrollableLineChartProps> = React.memo(({
  data,
  color,
  height = 220,
  compact = false,
  unit = '',
  title,
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lineColor = color || colors.accent;
  const dateLocale = fr;

  // Calculer les donnees du graphique
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const padding = range * 0.2;

    const yMin = minValue - padding;
    const yMax = maxValue + padding;
    const yRange = yMax - yMin;

    const POINT_WIDTH = compact ? 60 : 85;
    const chartWidth = Math.max(SCREEN_WIDTH - 40, data.length * POINT_WIDTH);
    const chartHeight = compact ? 140 : height;
    const paddingTop = compact ? 40 : 55;
    const paddingBottom = 45;
    const paddingLeft = 60;
    const paddingRight = 30;
    const graphHeight = chartHeight - paddingTop - paddingBottom;
    const graphWidth = chartWidth - paddingLeft - paddingRight;

    const points = data.map((d, i) => {
      const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * graphWidth;
      const y = paddingTop + graphHeight - ((d.value - yMin) / yRange) * graphHeight;
      return { x, y, value: d.value, date: d.date };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
      linePath += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`;
    }

    const areaPath = linePath +
      ` L ${points[points.length - 1].x} ${paddingTop + graphHeight}` +
      ` L ${points[0].x} ${paddingTop + graphHeight} Z`;

    const yLabels = [];
    const numYLabels = compact ? 3 : 5;
    for (let i = 0; i < numYLabels; i++) {
      const value = yMin + (yRange * i) / (numYLabels - 1);
      const y = paddingTop + graphHeight - (i / (numYLabels - 1)) * graphHeight;
      yLabels.push({ value: Number.isInteger(value) ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, ''), y });
    }

    const labels = data.map((d, index) => {
      if (!d.date) return `J${index + 1}`;
      try {
        const date = typeof d.date === 'string' ? parseISO(d.date) : d.date;
        return format(date, 'd/MM', { locale: dateLocale });
      } catch (e) {
        return `J${index + 1}`;
      }
    });

    return { points, linePath, areaPath, yLabels, labels, chartWidth, chartHeight, paddingTop, paddingBottom, paddingLeft, graphHeight, yMin, yMax };
  }, [data, compact, height, dateLocale]);

  // Version plein ecran - only computed when fullscreen is open
  const fullscreenChartData = useMemo(() => {
    if (!isFullscreen || !data || data.length === 0) return null;

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const padding = range * 0.2;
    const yMin = minValue - padding;
    const yMax = maxValue + padding;
    const yRange = yMax - yMin;

    const POINT_WIDTH = 100;
    const chartWidth = Math.max(SCREEN_WIDTH - 60, data.length * POINT_WIDTH);
    const chartHeight = SCREEN_HEIGHT * 0.6;
    const paddingTop = 60;
    const paddingBottom = 60;
    const paddingLeft = 65;
    const paddingRight = 30;
    const graphHeight = chartHeight - paddingTop - paddingBottom;
    const graphWidth = chartWidth - paddingLeft - paddingRight;

    const points = data.map((d, i) => {
      const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * graphWidth;
      const y = paddingTop + graphHeight - ((d.value - yMin) / yRange) * graphHeight;
      return { x, y, value: d.value, date: d.date };
    });

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
      linePath += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`;
    }

    const areaPath = linePath +
      ` L ${points[points.length - 1].x} ${paddingTop + graphHeight}` +
      ` L ${points[0].x} ${paddingTop + graphHeight} Z`;

    const yLabels = [];
    for (let i = 0; i < 6; i++) {
      const value = yMin + (yRange * i) / 5;
      const y = paddingTop + graphHeight - (i / 5) * graphHeight;
      yLabels.push({ value: Number.isInteger(value) ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/, ''), y });
    }

    const labels = data.map((d, index) => {
      if (!d.date) return `J${index + 1}`;
      try {
        const date = typeof d.date === 'string' ? parseISO(d.date) : d.date;
        return format(date, 'd MMM', { locale: dateLocale });
      } catch (e) {
        return `J${index + 1}`;
      }
    });

    return { points, linePath, areaPath, yLabels, labels, chartWidth, chartHeight, paddingTop, paddingBottom, paddingLeft, graphHeight, yMin, yMax };
  }, [data, dateLocale, isFullscreen]);

  if (!chartData) {
    return (
      <View style={[styles.emptyContainer, {
        backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t('stats.noData')}
        </Text>
      </View>
    );
  }

  const renderChart = (chartInfo: typeof chartData, isFullscreenMode: boolean = false) => {
    if (!chartInfo) return null;

    const fontSize = isFullscreenMode
      ? { value: 13, date: 12, yAxis: 12 }
      : { value: compact ? 10 : 12, date: compact ? 9 : 11, yAxis: 11 };

    return (
      <Svg width={chartInfo.chartWidth} height={chartInfo.chartHeight}>
        <Defs>
          <LinearGradient id={`areaGrad-${isFullscreenMode ? 'fs' : 'n'}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={lineColor} stopOpacity={isDark ? 0.45 : 0.35} />
            <Stop offset="50%" stopColor={lineColor} stopOpacity={isDark ? 0.15 : 0.12} />
            <Stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Lignes horizontales de grille */}
        {chartInfo.yLabels.map((label, i) => (
          <Line
            key={`grid-${i}`}
            x1={chartInfo.paddingLeft}
            y1={label.y}
            x2={chartInfo.chartWidth - 15}
            y2={label.y}
            stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
            strokeWidth={1}
            strokeDasharray="4,6"
          />
        ))}

        {/* Labels Y */}
        {chartInfo.yLabels.map((label, i) => (
          <SvgText
            key={`ylabel-${i}`}
            x={chartInfo.paddingLeft - 10}
            y={label.y + 4}
            fill={colors.textMuted}
            fontSize={fontSize.yAxis}
            fontWeight="700"
            textAnchor="end"
            opacity={0.7}
          >
            {label.value}
          </SvgText>
        ))}

        {/* Area gradient */}
        <Path
          d={chartInfo.areaPath}
          fill={`url(#areaGrad-${isFullscreenMode ? 'fs' : 'n'})`}
        />

        {/* Ligne principale */}
        <Path
          d={chartInfo.linePath}
          stroke={lineColor}
          strokeWidth={isFullscreenMode ? 3.5 : (compact ? 2.5 : 3)}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Points et valeurs */}
        {chartInfo.points.map((point, index) => {
          // Décaler les labels proches de l'axe Y vers la droite
          const nearLeftEdge = point.x < chartInfo.paddingLeft + 30;
          const valueAnchor = nearLeftEdge ? 'start' : 'middle';
          const valueX = nearLeftEdge ? point.x + 8 : point.x;

          // Anti-chevauchement vertical: décaler si le point précédent est trop proche
          let valueY = Math.max(point.y - (isFullscreenMode ? 16 : (compact ? 10 : 13)), 16);
          if (index > 0) {
            const prevPoint = chartInfo.points[index - 1];
            const prevValueY = Math.max(prevPoint.y - (isFullscreenMode ? 16 : (compact ? 10 : 13)), 16);
            if (Math.abs(valueY - prevValueY) < 14 && Math.abs(point.x - prevPoint.x) < 60) {
              valueY = valueY - 20;
            }
          }

          return (
          <G key={`point-${index}`}>
            {/* Glow */}
            <Circle
              cx={point.x}
              cy={point.y}
              r={isFullscreenMode ? 10 : (compact ? 6 : 8)}
              fill={lineColor}
              opacity={0.12}
            />
            {/* Point externe */}
            <Circle
              cx={point.x}
              cy={point.y}
              r={isFullscreenMode ? 5.5 : (compact ? 3.5 : 4.5)}
              fill={isDark ? colors.backgroundCard : '#FFFFFF'}
              stroke={lineColor}
              strokeWidth={isFullscreenMode ? 2.5 : 2}
            />
            {/* Point interne */}
            <Circle
              cx={point.x}
              cy={point.y}
              r={isFullscreenMode ? 2.5 : (compact ? 1.5 : 2)}
              fill={lineColor}
            />

            {/* Valeur au-dessus */}
            <SvgText
              x={valueX}
              y={valueY}
              fill={isDark ? '#FFFFFF' : '#1a1a1a'}
              fontSize={fontSize.value}
              fontWeight="800"
              textAnchor={valueAnchor}
              opacity={0.9}
            >
              {Number.isInteger(point.value) ? Math.round(point.value) : point.value.toFixed(1).replace(/\.0$/, '')}{unit ? ` ${unit}` : ''}
            </SvgText>

            {/* Date */}
            <SvgText
              x={point.x}
              y={chartInfo.chartHeight - (isFullscreenMode ? 15 : 10)}
              fill={lineColor}
              fontSize={fontSize.date}
              fontWeight="700"
              textAnchor="middle"
              opacity={0.8}
            >
              {chartInfo.labels[index]}
            </SvgText>
          </G>
          );
        })}
      </Svg>
    );
  };

  return (
    <View style={[styles.container, {
      backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    }]}>
      {/* Graphique principal scrollable */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        decelerationRate="fast"
        style={styles.scrollView}
        onContentSizeChange={(contentWidth) => {
          if (scrollViewRef.current && contentWidth > SCREEN_WIDTH - 40) {
            scrollViewRef.current.scrollToEnd({ animated: false });
          }
        }}
      >
        <Pressable onPress={() => { onPress ? onPress() : setIsFullscreen(true); }}>
          {renderChart(chartData, false)}
        </Pressable>
      </ScrollView>

      {/* Hint */}
      {!compact && (
        <View style={[styles.hintContainer, { backgroundColor: `${lineColor}10` }]}>
          <Ionicons name="swap-horizontal-outline" size={13} color={lineColor} />
          <Text style={[styles.hintText, { color: lineColor }]}>
            D{'\u00E9'}filer {'\u2022'} Appuyer pour agrandir
          </Text>
        </View>
      )}

      {/* Modal plein ecran */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.98)' }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.error }]}
            onPress={() => setIsFullscreen(false)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {title || t('stats.weight') || 'Poids'} {unit}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            contentContainerStyle={styles.modalScrollContent}
            bounces={false}
            decelerationRate="fast"
            style={styles.modalScrollView}
          >
            {fullscreenChartData && renderChart(fullscreenChartData, true)}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hintContainer: {
    marginBottom: 12,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hintText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
