import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getMeasurements } from '@/lib/database';
import { Ruler, TrendingDown, TrendingUp, Maximize2 } from 'lucide-react-native';
import { SparklineChart } from '../charts/SparklineChart';
import { StatsDetailModal } from '../StatsDetailModal';
import { scale, isIPad, getHistoryDays } from '@/constants/responsive';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATS_COLUMNS = isIPad() ? 4 : 2;
const STATS_GAP = 12;
const CONTAINER_PADDING = isIPad() ? scale(8) : 16;
const STATS_CARD_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - STATS_GAP * (STATS_COLUMNS - 1)) / STATS_COLUMNS;
// Largeur du sparkline = largeur carte - padding (14*2) + margin négatif (6*2)
const SPARKLINE_WIDTH = STATS_CARD_WIDTH - 28 + 12;

export default function MesuresTab() {
  const { colors } = useTheme();
  const [measurementsData, setMeasurementsData] = useState<any[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<{
    id: string;
    label: string;
    color: string;
  } | null>(null);

  useEffect(() => {
    loadMeasurements();
  }, []);

  const loadMeasurements = async () => {
    try {
      const data = await getMeasurements();
      const sorted = [...data].sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setMeasurementsData(sorted);
    } catch (error) {
      logger.error('Erreur chargement mesures:', error);
    }
  };

  // Définir toutes les mensurations avec leurs couleurs
  const measurements = [
    { id: 'waist', label: 'Tour de taille', color: '#EF4444' },
    { id: 'hips', label: 'Hanches', color: '#F97316' },
    { id: 'chest', label: 'Poitrine', color: '#22C55E' },
    { id: 'shoulders', label: 'Épaules', color: '#14B8A6' },
    { id: 'neck', label: 'Cou', color: '#3B82F6' },
    { id: 'left_arm', label: 'Bras G.', color: '#8B5CF6' },
    { id: 'right_arm', label: 'Bras D.', color: '#A855F7' },
    { id: 'left_thigh', label: 'Cuisse G.', color: '#EC4899' },
    { id: 'right_thigh', label: 'Cuisse D.', color: '#F472B6' },
    { id: 'left_calf', label: 'Mollet G.', color: '#06B6D4' },
    { id: 'right_calf', label: 'Mollet D.', color: '#22D3EE' },
  ];

  // Obtenir les dernières mesures pour le sparkline (3 sur iPhone, 7 sur iPad)
  const getSparklineData = (measurementKey: string) => {
    const historyDays = getHistoryDays();
    if (!measurementsData || measurementsData.length === 0) return [];
    return measurementsData.slice(-historyDays).map(entry => ({
      value: (entry as any)[measurementKey] || 0,
    })).filter(d => d.value > 0);
  };

  // Obtenir l'historique complet pour le modal
  const getFullHistory = (measurementKey: string) => {
    if (!measurementsData || measurementsData.length === 0) return [];
    return measurementsData.map(entry => ({
      value: (entry as any)[measurementKey] || 0,
      date: entry.date,
    })).filter(d => d.value > 0);
  };

  // Calculer la tendance
  const getTrend = (key: string): 'up' | 'down' | 'stable' => {
    const data = getSparklineData(key);
    if (data.length < 2) return 'stable';
    const current = data[data.length - 1].value;
    const prev = data[data.length - 2].value;
    const diff = current - prev;
    const percentChange = Math.abs(diff / prev) * 100;
    if (percentChange < 2) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getChange = (key: string): string => {
    const data = getSparklineData(key);
    if (data.length < 2) return '';
    const current = data[data.length - 1].value;
    const prev = data[data.length - 2].value;
    const diff = current - prev;
    return diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
  };

  const getCurrentValue = (key: string): number | null => {
    const data = getSparklineData(key);
    if (data.length === 0) return null;
    return data[data.length - 1].value;
  };

  // Filtrer les mesures qui ont des données et grouper en rangées
  const measurementsWithData = measurements.filter(measurement => {
    const sparklineData = getSparklineData(measurement.id);
    return sparklineData.length > 0 && sparklineData.some(d => d.value > 0);
  });

  // Grouper les mesures en rangées de 2 (ou 4 sur iPad)
  const rows: typeof measurements[] = [];
  for (let i = 0; i < measurementsWithData.length; i += STATS_COLUMNS) {
    rows.push(measurementsWithData.slice(i, i + STATS_COLUMNS));
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Grille des mensurations */}
      <View style={styles.metricsGrid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((measurement) => {
              const sparklineData = getSparklineData(measurement.id);
              const hasData = sparklineData.length > 0 && sparklineData.some(d => d.value > 0);
              const currentValue = getCurrentValue(measurement.id);
              const trend = getTrend(measurement.id);
              const change = getChange(measurement.id);

              return (
                <TouchableOpacity
                  key={measurement.id}
                  style={[styles.metricCard, { backgroundColor: colors.backgroundCard }]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedMeasurement({
                    id: measurement.id,
                    label: measurement.label,
                    color: measurement.color,
                  })}
                >
                  {/* Expand icon */}
                  <View style={styles.expandIcon}>
                    <Maximize2 size={16} color="#1F2937" opacity={0.9} />
                  </View>

                  {/* Header avec icône */}
                  <View style={styles.metricHeader}>
                    <View style={[styles.metricIconContainer, { backgroundColor: measurement.color + '20' }]}>
                      <Ruler size={16} color={measurement.color} />
                    </View>
                    {trend !== 'stable' && change && (
                      <View style={styles.trendBadge}>
                        {trend === 'up' ? (
                          <TrendingUp size={12} color="#EF4444" />
                        ) : (
                          <TrendingDown size={12} color="#10B981" />
                        )}
                        <Text
                          style={[
                            styles.changeText,
                            { color: trend === 'up' ? '#EF4444' : '#10B981' },
                          ]}
                        >
                          {change}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Label */}
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={1}>
                    {measurement.label}
                  </Text>

                  {/* Value */}
                  <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                    {currentValue ? currentValue.toFixed(1) : '--'}
                    <Text style={[styles.metricUnit, { color: colors.textMuted }]}> cm</Text>
                  </Text>

                  {/* Sparkline */}
                  {hasData && (
                    <View style={styles.sparklineContainer}>
                      <SparklineChart
                        data={sparklineData}
                        width={SPARKLINE_WIDTH}
                        height={40}
                        color={measurement.color}
                        showGradient={true}
                        thickness={2.5}
                        showLastValues={sparklineData.length}
                        valueUnit="cm"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* État vide */}
      {measurementsData.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: colors.backgroundCard }]}>
          <Text style={styles.emptyIcon}>📏</Text>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Aucune mesure enregistrée
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Ajoute tes premières mesures corporelles pour suivre ton évolution
          </Text>
        </View>
      )}

      {/* Modal de détail */}
      {selectedMeasurement && (
        <StatsDetailModal
          visible={selectedMeasurement !== null}
          onClose={() => setSelectedMeasurement(null)}
          title={selectedMeasurement.label}
          subtitle="Évolution complète"
          data={getFullHistory(selectedMeasurement.id).map((entry) => ({
            value: entry.value,
            label: new Date(entry.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          }))}
          color={selectedMeasurement.color}
          unit="cm"
          icon={<Ruler size={24} color={selectedMeasurement.color} />}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: isIPad() ? 0 : 16,
    paddingBottom: 150,
  },

  // Grille des métriques
  metricsGrid: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: STATS_GAP,
  },
  metricCard: {
    width: STATS_CARD_WIDTH,
    borderRadius: 16,
    padding: 14,
    minHeight: 140,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  expandIcon: {
    position: 'absolute',
    top: 14,
    left: 48,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 15,
    fontWeight: '700',
  },
  sparklineContainer: {
    marginTop: 'auto',
    marginHorizontal: -6,
  },

  // État vide
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
