import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { X } from 'lucide-react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375 || SCREEN_HEIGHT < 700;
const CHART_HEIGHT = IS_SMALL_SCREEN ? 250 : 300; // Plus petit sur petits écrans
const PADDING_LEFT = IS_SMALL_SCREEN ? 50 : 60;
const PADDING_RIGHT = IS_SMALL_SCREEN ? 20 : 30;
const PADDING_TOP = IS_SMALL_SCREEN ? 40 : 50;
const PADDING_BOTTOM = IS_SMALL_SCREEN ? 50 : 60;
const MIN_POINT_SPACING = IS_SMALL_SCREEN ? 60 : 80; // Espace minimum entre chaque point

interface DataPoint {
  value: number;
  label?: string;
  date?: string;
}

interface StatsDetailModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  data: DataPoint[];
  color: string;
  unit: string;
  icon?: React.ReactNode;
}

type Period = '30j' | '90j' | '6m' | '1a';

export const StatsDetailModal: React.FC<StatsDetailModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  data,
  color,
  unit,
  icon,
}) => {
  const { colors, isDark } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');

  if (data.length === 0) {
    return null;
  }

  // Filtrer les données selon la période
  const getFilteredData = () => {
    switch (selectedPeriod) {
      case '30j':
        return data.slice(-30);
      case '90j':
        return data.slice(-90);
      case '6m':
        return data.slice(-180);
      case '1a':
        return data.slice(-365);
      default:
        return data.slice(-30);
    }
  };

  const filteredData = getFilteredData();

  // Calculer les stats sur les données filtrées
  const values = filteredData.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const currentValue = values[values.length - 1];
  const startValue = values[0];
  const change = currentValue - startValue;
  const changePercent = startValue > 0 ? ((change / startValue) * 100) : 0;

  // Calculer la largeur dynamique du graphique basée sur le nombre de points
  // Plus il y a de points, plus le graphique sera large (scrollable)
  const dynamicWidth = Math.max(
    SCREEN_WIDTH - 48, // Largeur minimum (écran)
    filteredData.length * MIN_POINT_SPACING + PADDING_LEFT + PADDING_RIGHT // Largeur dynamique
  );
  const CHART_WIDTH = dynamicWidth;

  // Préparer les données du graphique
  const range = maxValue - minValue;
  const paddedMin = minValue - range * 0.1;
  const paddedMax = maxValue + range * 0.1;
  const paddedRange = paddedMax - paddedMin || 1;

  const chartData = filteredData.map((entry, index) => {
    const x = PADDING_LEFT + ((CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT) * index) / Math.max(filteredData.length - 1, 1);
    const y = CHART_HEIGHT - PADDING_BOTTOM - ((entry.value - paddedMin) / paddedRange) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
    return { ...entry, x, y };
  });

  // Créer le path de la ligne
  const createPath = () => {
    if (chartData.length === 0) return '';
    let path = `M ${chartData[0].x} ${chartData[0].y}`;
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    return path;
  };

  // Créer le path du gradient area
  const createAreaPath = () => {
    if (chartData.length === 0) return '';
    const linePath = createPath();
    const lastPoint = chartData[chartData.length - 1];
    const firstPoint = chartData[0];
    return `${linePath} L ${lastPoint.x} ${CHART_HEIGHT - PADDING_BOTTOM} L ${firstPoint.x} ${CHART_HEIGHT - PADDING_BOTTOM} Z`;
  };

  // Générer les labels Y
  const yLabels = [];
  for (let i = 0; i < 5; i++) {
    const value = paddedMin + ((paddedMax - paddedMin) * (4 - i)) / 4;
    yLabels.push(value.toFixed(1));
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              {icon && <View style={styles.modalIcon}>{icon}</View>}
              <View style={styles.modalTitleContainer}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {title}
                </Text>
                {subtitle && (
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Sélecteur de période */}
            <View style={styles.periodSelector}>
              {(['7j', '30j', '90j', 'all'] as Period[]).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonActive,
                    { borderColor: color },
                    selectedPeriod === period && { backgroundColor: color },
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      { color: selectedPeriod === period ? colors.textOnAccent : colors.textPrimary },
                    ]}
                  >
                    {period === 'all' ? 'Tout' : period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stats Cards */}
            <View style={styles.statsCards}>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>Actuel</Text>
                <Text style={[styles.statCardValue, { color }]}>
                  {currentValue.toFixed(1)} {unit}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>Minimum</Text>
                <Text style={[styles.statCardValue, { color: '#22C55E' }]}>
                  {minValue.toFixed(1)} {unit}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>Maximum</Text>
                <Text style={[styles.statCardValue, { color: '#EF4444' }]}>
                  {maxValue.toFixed(1)} {unit}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>Moyenne</Text>
                <Text style={[styles.statCardValue, { color: colors.textPrimary }]}>
                  {avgValue.toFixed(1)} {unit}
                </Text>
              </View>
            </View>

            {/* Evolution Badge */}
            <View style={[styles.evolutionBadge, {
              backgroundColor: change >= 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            }]}>
              <Text style={[styles.evolutionText, {
                color: change >= 0 ? '#EF4444' : '#22C55E',
              }]}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)} {unit} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
              </Text>
            </View>

            {/* Graphique détaillé */}
            <View style={[styles.chartContainer, { backgroundColor: colors.backgroundCard }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={{ paddingRight: 20 }}
              >
                <View style={[styles.chart, { width: CHART_WIDTH }]}>
                  <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                  <Defs>
                    <LinearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={color} stopOpacity="0.3" />
                      <Stop offset="1" stopColor={color} stopOpacity="0.05" />
                    </LinearGradient>
                  </Defs>

                  {/* Fond du graphique - plus clair en dark mode */}
                  <Rect
                    x={PADDING_LEFT}
                    y={PADDING_TOP - 10}
                    width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                    height={CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM + 20}
                    rx={12}
                    ry={12}
                    fill={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.03)"}
                  />

                  {/* Lignes de grille horizontales */}
                  {[0, 1, 2, 3, 4].map((i) => {
                    const y = PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * i) / 4;
                    return (
                      <Rect
                        key={i}
                        x={PADDING_LEFT}
                        y={y}
                        width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                        height={1}
                        fill={colors.border}
                        opacity={0.3}
                      />
                    );
                  })}

                  {/* Zone sous la courbe */}
                  <Path d={createAreaPath()} fill="url(#detailGradient)" />

                  {/* Ligne de tendance */}
                  <Path
                    d={createPath()}
                    stroke={color}
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points */}
                  {chartData.map((point, index) => (
                    <React.Fragment key={index}>
                      <Circle cx={point.x} cy={point.y} r={6} fill="#FFFFFF" />
                      <Circle cx={point.x} cy={point.y} r={4} fill={color} />
                    </React.Fragment>
                  ))}
                </Svg>

                {/* Labels Y */}
                <View style={styles.yLabelsContainer}>
                  {yLabels.map((label, index) => (
                    <Text key={index} style={[styles.yLabel, { color: isDark ? '#FFFFFF' : colors.textMuted }]}>
                      {label}
                    </Text>
                  ))}
                </View>

                  {/* Valeurs au-dessus de TOUS les points */}
                  {chartData.map((point, index) => (
                    <View key={index} style={[styles.valueLabel, { left: point.x - 25, top: point.y - 32 }]}>
                      <Text style={[styles.valueLabelText, { color, backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                        {point.value.toFixed(1)}
                      </Text>
                    </View>
                  ))}

                  {/* Labels X (dates ou labels) - Affichés pour tous les points maintenant */}
                  <View style={styles.xLabelsContainer}>
                    {chartData.map((point, index) => (
                      <View key={index} style={[styles.xLabelWrapper, { left: point.x - 30 }]}>
                        <Text style={[styles.xLabel, { color: isDark ? '#FFFFFF' : colors.textMuted }]} numberOfLines={1}>
                          {point.label || point.date || index + 1}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Liste des valeurs */}
            <View style={[styles.valuesListCard, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[styles.valuesListTitle, { color: colors.textPrimary }]}>
                Toutes les valeurs ({filteredData.length})
              </Text>
              {filteredData.slice().reverse().map((entry, index) => (
                <View
                  key={index}
                  style={[
                    styles.valueListItem,
                    index < filteredData.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.valueListLabel, { color: colors.textSecondary }]}>
                    {entry.label || entry.date || `Point ${filteredData.length - index}`}
                  </Text>
                  <Text style={[styles.valueListValue, { color: colors.textPrimary }]}>
                    {entry.value.toFixed(1)} {unit}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: IS_SMALL_SCREEN ? SCREEN_HEIGHT * 0.92 : SCREEN_HEIGHT * 0.9, // Plus grande sur petits écrans
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: IS_SMALL_SCREEN ? 16 : 20, // Moins de padding en haut
    paddingBottom: IS_SMALL_SCREEN ? 30 : 40, // Moins en bas aussi
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    borderWidth: 1.5,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    width: IS_SMALL_SCREEN
      ? Math.max((SCREEN_WIDTH - 44) / 2, 140) // Min 140px sur petits écrans
      : (SCREEN_WIDTH - 52) / 2,
    borderRadius: 12,
    padding: IS_SMALL_SCREEN ? 12 : 14, // Moins de padding sur petits écrans
    alignItems: 'center',
  },
  statCardLabel: {
    fontSize: IS_SMALL_SCREEN ? 11 : 12, // Plus petit sur petits écrans
    fontWeight: '600',
    marginBottom: 6,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  evolutionBadge: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  evolutionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    paddingVertical: 16,
    paddingLeft: 16,
  },
  chart: {
    height: CHART_HEIGHT,
    position: 'relative',
  },
  yLabelsContainer: {
    position: 'absolute',
    left: 0,
    top: PADDING_TOP,
    height: CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM,
    justifyContent: 'space-between',
  },
  yLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  xLabelsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PADDING_BOTTOM,
  },
  xLabelWrapper: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
    top: 8,
  },
  xLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  valueLabel: {
    position: 'absolute',
    width: 50,
    alignItems: 'center',
  },
  valueLabelText: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  valuesListCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  valuesListTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  valueListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  valueListLabel: {
    fontSize: 14,
  },
  valueListValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
