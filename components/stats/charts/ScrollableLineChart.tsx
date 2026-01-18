// ============================================
// SCROLLABLE LINE CHART - Graphique scrollable coloré
// Toutes les dates et valeurs affichées, grille colorée
// Tap pour agrandir en plein écran
// ============================================

import React, { useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Modal, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { format, parseISO, Locale } from 'date-fns';
import { fr, enUS, es, de, it, pt, ru, ar, zhCN } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ScrollableLineChartProps {
  data: { date?: string; value: number }[];
  color?: string;
  height?: number;
  compact?: boolean;
  unit?: string;
}

// Map language codes to date-fns locales
const DATE_LOCALES: Record<string, Locale> = {
  fr: fr,
  en: enUS,
  es: es,
  de: de,
  it: it,
  pt: pt,
  ru: ru,
  ar: ar,
  zh: zhCN,
};

// Couleurs complémentaires pour les différents éléments
const getComplementaryColors = (accentColor: string, isDark: boolean) => {
  return {
    dateColor: isDark ? '#FF9F43' : '#E67E22', // Orange pour les dates
    yAxisColor: isDark ? '#26DE81' : '#00B894', // Vert pour l'axe Y
    gridColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)', // Grille subtile
    gridAccent: accentColor, // Couleur du thème pour grille accent
  };
};

export const ScrollableLineChart: React.FC<ScrollableLineChartProps> = ({
  data,
  color,
  height = 220,
  compact = false,
  unit = '',
}) => {
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Utiliser la couleur accent du thème si pas de couleur spécifiée
  const lineColor = color || colors.accent;
  const complementaryColors = getComplementaryColors(lineColor, isDark);

  // Get the correct date-fns locale
  const dateLocale = DATE_LOCALES[language] || fr;

  // Calculer les données du graphique
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const padding = range * 0.2; // 20% padding pour plus d'espace

    const yMin = minValue - padding;
    const yMax = maxValue + padding;
    const yRange = yMax - yMin;

    // Dimensions - plus d'espace entre les points
    const POINT_WIDTH = compact ? 60 : 85;
    const chartWidth = Math.max(SCREEN_WIDTH - 40, data.length * POINT_WIDTH);
    const chartHeight = compact ? 140 : height;
    const paddingTop = compact ? 40 : 55; // Plus d'espace pour les valeurs au-dessus des points
    const paddingBottom = 45; // Plus d'espace pour les dates
    const paddingLeft = 55; // Augmenté pour éviter le chevauchement avec les valeurs Y
    const paddingRight = 30; // Augmenté pour les dernières valeurs
    const graphHeight = chartHeight - paddingTop - paddingBottom;
    const graphWidth = chartWidth - paddingLeft - paddingRight;

    // Calculer les points
    const points = data.map((d, i) => {
      const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * graphWidth;
      const y = paddingTop + graphHeight - ((d.value - yMin) / yRange) * graphHeight;
      return { x, y, value: d.value, date: d.date };
    });

    // Créer le path de la ligne (courbe bezier)
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
      linePath += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`;
    }

    // Créer le path du gradient (area sous la ligne)
    const areaPath = linePath +
      ` L ${points[points.length - 1].x} ${paddingTop + graphHeight}` +
      ` L ${points[0].x} ${paddingTop + graphHeight} Z`;

    // Labels Y (valeurs sur l'axe)
    const yLabels = [];
    const numYLabels = compact ? 3 : 5;
    for (let i = 0; i < numYLabels; i++) {
      const value = yMin + (yRange * i) / (numYLabels - 1);
      const y = paddingTop + graphHeight - (i / (numYLabels - 1)) * graphHeight;
      yLabels.push({ value: value.toFixed(1), y });
    }

    // Labels de dates - TOUTES les dates
    const labels = data.map((d, index) => {
      if (!d.date) return `J${index + 1}`;
      try {
        const date = typeof d.date === 'string' ? parseISO(d.date) : d.date;
        return format(date, 'd/MM', { locale: dateLocale });
      } catch (e) {
        return `J${index + 1}`;
      }
    });

    return {
      points,
      linePath,
      areaPath,
      yLabels,
      labels,
      chartWidth,
      chartHeight,
      paddingTop,
      paddingBottom,
      paddingLeft,
      graphHeight,
      yMin,
      yMax,
    };
  }, [data, compact, height, dateLocale]);

  // Version plein écran du graphique
  const fullscreenChartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const padding = range * 0.2;

    const yMin = minValue - padding;
    const yMax = maxValue + padding;
    const yRange = yMax - yMin;

    // Dimensions plein écran (paysage simulé)
    const POINT_WIDTH = 100;
    const chartWidth = Math.max(SCREEN_WIDTH - 60, data.length * POINT_WIDTH);
    const chartHeight = SCREEN_HEIGHT * 0.6;
    const paddingTop = 60;
    const paddingBottom = 60;
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
    const numYLabels = 6;
    for (let i = 0; i < numYLabels; i++) {
      const value = yMin + (yRange * i) / (numYLabels - 1);
      const y = paddingTop + graphHeight - (i / (numYLabels - 1)) * graphHeight;
      yLabels.push({ value: value.toFixed(1), y });
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

    return {
      points,
      linePath,
      areaPath,
      yLabels,
      labels,
      chartWidth,
      chartHeight,
      paddingTop,
      paddingBottom,
      paddingLeft,
      graphHeight,
    };
  }, [data, dateLocale]);

  if (!chartData) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t('stats.noData')}
        </Text>
      </View>
    );
  }

  // Rendu du graphique (réutilisable pour normal et fullscreen)
  const renderChart = (chartInfo: typeof chartData, isFullscreenMode: boolean = false) => {
    if (!chartInfo) return null;

    const fontSize = isFullscreenMode ? { value: 12, date: 11, yAxis: 11 } : { value: compact ? 9 : 10, date: compact ? 8 : 9, yAxis: 10 };

    return (
      <Svg width={chartInfo.chartWidth} height={chartInfo.chartHeight}>
        <Defs>
          {/* Gradient pour l'area sous la ligne */}
          <LinearGradient id={`areaGradient-${isFullscreenMode ? 'fs' : 'normal'}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={lineColor} stopOpacity={isDark ? 0.5 : 0.4} />
            <Stop offset="40%" stopColor={lineColor} stopOpacity={isDark ? 0.25 : 0.2} />
            <Stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Lignes horizontales de grille avec couleur du thème */}
        {chartInfo.yLabels.map((label, i) => (
          <Line
            key={`grid-${i}`}
            x1={chartInfo.paddingLeft}
            y1={label.y}
            x2={chartInfo.chartWidth - 15}
            y2={label.y}
            stroke={i === 0 ? `${lineColor}40` : complementaryColors.gridColor}
            strokeWidth={i === 0 ? 1.5 : 1}
            strokeDasharray={i === 0 ? "0" : "5,5"}
          />
        ))}

        {/* Labels Y (axe gauche) - couleur verte */}
        {chartInfo.yLabels.map((label, i) => (
          <SvgText
            key={`ylabel-${i}`}
            x={chartInfo.paddingLeft - 10}
            y={label.y + 4}
            fill={complementaryColors.yAxisColor}
            fontSize={fontSize.yAxis}
            fontWeight="700"
            textAnchor="end"
          >
            {label.value}
          </SvgText>
        ))}

        {/* Area sous la courbe avec gradient */}
        <Path
          d={chartInfo.areaPath}
          fill={`url(#areaGradient-${isFullscreenMode ? 'fs' : 'normal'})`}
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

        {/* Points et valeurs - TOUS affichés */}
        {chartInfo.points.map((point, index) => (
          <G key={`point-${index}`}>
            {/* Glow du point */}
            <Circle
              cx={point.x}
              cy={point.y}
              r={isFullscreenMode ? 12 : (compact ? 7 : 9)}
              fill={lineColor}
              opacity={0.15}
            />
            {/* Point externe (bordure) */}
            <Circle
              cx={point.x}
              cy={point.y}
              r={isFullscreenMode ? 7 : (compact ? 4 : 5)}
              fill={isDark ? colors.backgroundCard : '#FFFFFF'}
              stroke={lineColor}
              strokeWidth={isFullscreenMode ? 3 : (compact ? 2 : 2.5)}
            />
            {/* Point interne coloré */}
            <Circle
              cx={point.x}
              cy={point.y}
              r={isFullscreenMode ? 3 : (compact ? 2 : 2.5)}
              fill={lineColor}
            />

            {/* Valeur au-dessus du point - TOUTES affichées */}
            <SvgText
              x={point.x}
              y={Math.max(point.y - (isFullscreenMode ? 18 : (compact ? 12 : 14)), 18)}
              fill={lineColor}
              fontSize={fontSize.value}
              fontWeight="800"
              textAnchor="middle"
            >
              {point.value.toFixed(1)}{unit}
            </SvgText>

            {/* Label de date - TOUTES affichées en orange */}
            <SvgText
              x={point.x}
              y={chartInfo.chartHeight - (isFullscreenMode ? 15 : 10)}
              fill={complementaryColors.dateColor}
              fontSize={fontSize.date}
              fontWeight="700"
              textAnchor="middle"
            >
              {chartInfo.labels[index]}
            </SvgText>
          </G>
        ))}
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      {/* Graphique principal - cliquable pour agrandir */}
      <Pressable onPress={() => setIsFullscreen(true)}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          decelerationRate="fast"
          style={styles.scrollView}
        >
          {renderChart(chartData, false)}
        </ScrollView>
      </Pressable>

      {/* Indicateur de scroll + tap pour agrandir */}
      {!compact && (
        <View style={[styles.hintContainer, { backgroundColor: `${lineColor}12` }]}>
          <Ionicons name="expand-outline" size={14} color={lineColor} />
          <Text style={[styles.hintText, { color: lineColor }]}>
            {t('stats.tapToEnlarge') || 'Appuyez pour agrandir'}
          </Text>
        </View>
      )}

      {/* Modal plein écran */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.98)' }]}>
          {/* Bouton fermer */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.error }]}
            onPress={() => setIsFullscreen(false)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Titre */}
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {t('stats.weight') || 'Poids'} {unit}
          </Text>

          {/* Graphique plein écran scrollable */}
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

          {/* Légende */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: complementaryColors.dateColor }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>
                {t('stats.dates') || 'Dates'}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: complementaryColors.yAxisColor }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>
                {t('stats.values') || 'Valeurs'}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: lineColor }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>
                {t('stats.evolution') || 'Évolution'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    paddingRight: 15,
  },
  emptyContainer: {
    borderRadius: 16,
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
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal styles
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
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 20,
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
    fontWeight: '600',
  },
});
