import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInRight,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/ThemeContext';
import { SmoothLineChart } from '@/components/charts/SmoothLineChart';
import {
  ChevronLeft,
  Scale,
  Flame,
  Dumbbell,
  Droplets,
  Zap,
  Activity,
  Bone,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react-native';
import { getAllBodyCompositions, BodyComposition } from '@/lib/bodyComposition';
import { useFocusEffect } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 250;

// Périodes disponibles
const PERIODS = [
  { id: '7d', label: '7j', days: 7 },
  { id: '30d', label: '30j', days: 30 },
  { id: '90d', label: '90j', days: 90 },
  { id: 'all', label: 'Tout', days: null },
] as const;

// Métriques disponibles
const METRICS = [
  {
    id: 'weight',
    label: 'Poids',
    unit: 'kg',
    icon: Scale,
    color: '#22C55E',
    dataKey: 'weight' as const,
    goodDirection: 'down' as const,
  },
  {
    id: 'fatPercentage',
    label: 'Graisse',
    unit: '%',
    icon: Flame,
    color: '#EF4444',
    dataKey: 'bodyFatPercent' as const,
    goodDirection: 'down' as const,
  },
  {
    id: 'muscleMass',
    label: 'Muscle',
    unit: 'kg',
    icon: Dumbbell,
    color: '#3B82F6',
    dataKey: 'muscleMass' as const,
    goodDirection: 'up' as const,
  },
  {
    id: 'waterPercentage',
    label: 'Eau',
    unit: '%',
    icon: Droplets,
    color: '#06B6D4',
    dataKey: 'waterPercent' as const,
    goodDirection: 'up' as const,
  },
  {
    id: 'bmr',
    label: 'BMR',
    unit: 'kcal',
    icon: Zap,
    color: '#F97316',
    dataKey: 'bmr' as const,
    goodDirection: 'up' as const,
  },
  {
    id: 'metabolicAge',
    label: 'Âge méta.',
    unit: 'ans',
    icon: Activity,
    color: '#EC4899',
    dataKey: 'metabolicAge' as const,
    goodDirection: 'down' as const,
  },
  {
    id: 'boneMass',
    label: 'Masse osseuse',
    unit: 'kg',
    icon: Bone,
    color: '#8B5CF6',
    dataKey: 'boneMass' as const,
    goodDirection: 'up' as const,
  },
  {
    id: 'visceralFat',
    label: 'Graisse viscérale',
    unit: '',
    icon: Heart,
    color: '#F59E0B',
    dataKey: 'visceralFat' as const,
    goodDirection: 'down' as const,
  },
];

export default function CompositionDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  // État
  const [selectedMetric, setSelectedMetric] = useState(
    (params.metric as string) || 'weight'
  );
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [compositionData, setCompositionData] = useState<BodyComposition[]>([]);

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      const data = await getAllBodyCompositions();
      setCompositionData(data);
    } catch (error) {
      logger.error('Erreur chargement composition:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Récupérer la métrique active
  const activeMetric = useMemo(
    () => METRICS.find((m) => m.id === selectedMetric) || METRICS[0],
    [selectedMetric]
  );

  // Filtrer les données selon la période
  const filteredData = useMemo(() => {
    const period = PERIODS.find((p) => p.id === selectedPeriod);
    if (!period || !period.days) return compositionData;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period.days);

    return compositionData.filter(
      (item) => new Date(item.date) >= cutoffDate
    );
  }, [compositionData, selectedPeriod]);

  // Préparer les données pour le graphique
  const chartData = useMemo(() => {
    return filteredData
      .map((item) => {
        const value = item[activeMetric.dataKey];
        return {
          value: typeof value === 'number' ? value : 0,
          label: format(parseISO(item.date), 'd MMM', { locale: fr }),
        };
      })
      .filter((item) => item.value > 0);
  }, [filteredData, activeMetric]);

  // Calculer les stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const values = chartData.map((d) => d.value);
    const current = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : current;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variation = current - values[0];

    return {
      current,
      previous,
      change: current - previous,
      min,
      max,
      avg,
      variation,
    };
  }, [chartData]);

  const styles = createStyles(colors, activeMetric.color);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View  style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Composition corporelle</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Tabs Métriques */}
        <View >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
            contentContainerStyle={styles.tabsContent}
          >
            {METRICS.map((metric) => {
              const IconComponent = metric.icon;
              const isActive = metric.id === selectedMetric;

              return (
                <TouchableOpacity
                  key={metric.id}
                  onPress={() => setSelectedMetric(metric.id)}
                  style={[
                    styles.tab,
                    isActive && { backgroundColor: metric.color + '20' },
                  ]}
                  activeOpacity={0.7}
                >
                  <IconComponent
                    size={18}
                    color={isActive ? metric.color : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      isActive && { color: metric.color, fontWeight: '600' },
                    ]}
                  >
                    {metric.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Filtres Période */}
        <View
          
          style={styles.periodContainer}
        >
          {PERIODS.map((period) => {
            const isActive = period.id === selectedPeriod;
            return (
              <TouchableOpacity
                key={period.id}
                onPress={() => setSelectedPeriod(period.id)}
                style={[
                  styles.periodButton,
                  isActive && {
                    backgroundColor: activeMetric.color,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodLabel,
                    isActive && styles.periodLabelActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Graphique Principal */}
        <View
          
          style={styles.chartContainer}
        >
          {chartData.length > 0 ? (
            <SmoothLineChart
              data={chartData}
              height={CHART_HEIGHT}
              color={activeMetric.color}
              showGradient={true}
              showDots={true}
              curved={true}
              thickness={2.5}
              rulesColor={colors.border}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>

        {/* Card Résumé */}
        {stats && (
          <View
            
            style={styles.summaryCard}
          >
            <Text style={styles.summaryTitle}>Résumé</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Actuel</Text>
              <View style={styles.summaryValueContainer}>
                <Text style={styles.summaryValue}>
                  {stats.current.toFixed(1)} {activeMetric.unit}
                </Text>
                {renderChangeIndicator(stats.change, activeMetric, colors)}
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Moyenne</Text>
              <Text style={styles.summaryValue}>
                {stats.avg.toFixed(1)} {activeMetric.unit}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Minimum</Text>
              <Text style={styles.summaryValue}>
                {stats.min.toFixed(1)} {activeMetric.unit}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Maximum</Text>
              <Text style={styles.summaryValue}>
                {stats.max.toFixed(1)} {activeMetric.unit}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Variation (période)</Text>
              <View style={styles.summaryValueContainer}>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color: getVariationColor(
                        stats.variation,
                        activeMetric.goodDirection,
                        colors
                      ),
                    },
                  ]}
                >
                  {stats.variation > 0 ? '+' : ''}
                  {stats.variation.toFixed(1)} {activeMetric.unit}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Historique */}
        <View
          
          style={styles.historyContainer}
        >
          <Text style={styles.historyTitle}>Historique</Text>

          {filteredData
            .slice()
            .reverse()
            .slice(0, 20)
            .map((item, index) => {
              const value = item[activeMetric.dataKey];
              const prevValue = index < filteredData.length - 1
                ? filteredData[filteredData.length - 2 - index]?.[activeMetric.dataKey]
                : value;
              const change = typeof value === 'number' && typeof prevValue === 'number'
                ? value - prevValue
                : 0;

              return (
                <View
                  key={item.id}
                  
                  style={styles.historyItem}
                >
                  <Text style={styles.historyDate}>
                    {format(parseISO(item.date), 'd MMMM yyyy', { locale: fr })}
                  </Text>
                  <View style={styles.historyValueContainer}>
                    <Text style={styles.historyValue}>
                      {typeof value === 'number' ? value.toFixed(1) : '--'} {activeMetric.unit}
                    </Text>
                    {renderChangeIndicator(change, activeMetric, colors, true)}
                  </View>
                </View>
              );
            })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Helper: Indicateur de variation (flèche + valeur)
const renderChangeIndicator = (
  change: number,
  metric: typeof METRICS[0],
  colors: any,
  compact: boolean = false
) => {
  if (Math.abs(change) < 0.05) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
        <Minus size={compact ? 14 : 16} color={colors.textMuted} />
        {!compact && (
          <Text style={{ color: colors.textMuted, fontSize: 13, marginLeft: 4 }}>
            0.0
          </Text>
        )}
      </View>
    );
  }

  const isPositive = change > 0;
  const isGood =
    (metric.goodDirection === 'up' && isPositive) ||
    (metric.goodDirection === 'down' && !isPositive);
  const color = isGood ? '#22C55E' : '#EF4444';
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
      <Icon size={compact ? 14 : 16} color={color} />
      <Text style={{ color, fontSize: compact ? 12 : 13, marginLeft: 4, fontWeight: '500' }}>
        {isPositive ? '+' : ''}
        {change.toFixed(1)}
      </Text>
    </View>
  );
};

// Helper: Couleur de variation
const getVariationColor = (
  variation: number,
  goodDirection: 'up' | 'down',
  colors: any
) => {
  if (Math.abs(variation) < 0.1) return colors.textMuted;
  const isPositive = variation > 0;
  const isGood =
    (goodDirection === 'up' && isPositive) ||
    (goodDirection === 'down' && !isPositive);
  return isGood ? '#22C55E' : '#EF4444';
};

// Styles
const createStyles = (colors: any, accentColor: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 60 : 16,
      paddingBottom: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.backgroundCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    headerSpacer: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },

    // Tabs
    tabsContainer: {
      marginTop: 8,
    },
    tabsContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.backgroundCard,
      marginRight: 8,
      gap: 6,
    },
    tabLabel: {
      fontSize: 14,
      color: colors.textMuted,
    },

    // Période
    periodContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
      gap: 8,
    },
    periodButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: colors.backgroundCard,
    },
    periodLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textMuted,
    },
    periodLabelActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },

    // Graphique
    chartContainer: {
      marginTop: 24,
      paddingHorizontal: 16,
      alignItems: 'center',
    },
    noDataContainer: {
      height: CHART_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noDataText: {
      color: colors.textMuted,
      fontSize: 16,
    },

    // Résumé
    summaryCard: {
      marginTop: 24,
      marginHorizontal: 16,
      padding: 20,
      backgroundColor: colors.backgroundCard,
      borderRadius: 20,
    },
    summaryTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    summaryLabel: {
      fontSize: 15,
      color: colors.textMuted,
    },
    summaryValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    summaryDivider: {
      height: 1,
      backgroundColor: colors.border,
    },

    // Historique
    historyContainer: {
      marginTop: 24,
      marginHorizontal: 16,
    },
    historyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.backgroundCard,
      borderRadius: 12,
      marginBottom: 8,
    },
    historyDate: {
      fontSize: 14,
      color: colors.textMuted,
    },
    historyValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    historyValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
  });
