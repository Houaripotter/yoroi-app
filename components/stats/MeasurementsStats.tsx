import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Ruler, TrendingDown, TrendingUp, Minus, Maximize2 } from 'lucide-react-native';
import { SparklineChart } from '../charts/SparklineChart';
import { StatsDetailModal } from '../StatsDetailModal';
import { scale, isIPad } from '@/constants/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Largeur des cartes statistiques - 2 colonnes sur iPhone, 4 colonnes sur iPad
const STATS_COLUMNS = isIPad() ? 4 : 2;
const STATS_GAP = 12; // Gap fixe pour tous les appareils
const CONTAINER_PADDING = isIPad() ? scale(8) : 16; // iPhone garde 16
const STATS_CARD_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - STATS_GAP * (STATS_COLUMNS - 1)) / STATS_COLUMNS;

interface MeasurementsStatsProps {
  data: any[];
}

export const MeasurementsStats: React.FC<MeasurementsStatsProps> = ({ data }) => {
  const { colors } = useTheme();
  const [selectedMeasurement, setSelectedMeasurement] = useState<{
    id: string;
    label: string;
    color: string;
  } | null>(null);

  // Get latest measurements from data
  const latestMeasurement = data && data.length > 0 ? data[data.length - 1] : null;
  const firstMeasurement = data && data.length > 0 ? data[0] : null;

  // Définir TOUTES les mensurations
  const measurements = [
    { id: 'waist', label: 'Tour de taille', color: '#EF4444' },
    { id: 'hips', label: 'Hanches', color: '#F97316' },
    { id: 'chest', label: 'Poitrine', color: '#22C55E' },
    { id: 'neck', label: 'Cou', color: '#3B82F6' },
    { id: 'left_arm', label: 'Bras (biceps)', color: '#8B5CF6' },
    { id: 'left_thigh', label: 'Cuisse', color: '#EC4899' },
    { id: 'left_calf', label: 'Mollet', color: '#06B6D4' },
  ];

  // Fonction pour obtenir l'historique d'une mensuration
  const getMeasurementHistory = (measurementKey: string) => {
    if (!data || data.length === 0) return [];
    return data.slice(-30).map(entry => ({
      value: (entry as any)[measurementKey] || 0,
    })).filter(d => d.value > 0);
  };

  // Fonction pour obtenir les stats d'une mensuration
  const getMeasurementStats = (measurementKey: string) => {
    const history = getMeasurementHistory(measurementKey);
    if (history.length === 0) return { current: 0, change: 0, min: 0, max: 0, hasData: false };

    const values = history.map(h => h.value);
    const current = (latestMeasurement as any)?.[measurementKey] || 0;
    const start = (firstMeasurement as any)?.[measurementKey] || 0;
    const change = current - start;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { current, change, min, max, hasData: true };
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Titre de section */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Évolution par zone
      </Text>

      {/* Grille des mensurations */}
      <View style={styles.measurementsGrid}>
        {measurements.map((measurement) => {
          const stats = getMeasurementStats(measurement.id);
          const history = getMeasurementHistory(measurement.id);

          return (
            <TouchableOpacity
              key={measurement.id}
              style={[
                styles.measurementCard,
                { backgroundColor: colors.backgroundCard },
                !stats.hasData && styles.measurementCardEmpty,
              ]}
              activeOpacity={0.7}
              onPress={() => stats.hasData && setSelectedMeasurement({
                id: measurement.id,
                label: measurement.label,
                color: measurement.color,
              })}
            >
              {/* Barre de couleur à gauche */}
              <View style={[styles.colorBar, { backgroundColor: measurement.color }]} />

              {/* Expand icon */}
              {stats.hasData && (
                <View style={styles.expandIcon}>
                  <Maximize2 size={16} color="#1F2937" opacity={0.9} />
                </View>
              )}

              {/* Label */}
              <Text style={[styles.measurementCardLabel, { color: colors.textMuted }]}>
                {measurement.label}
              </Text>

              {stats.hasData ? (
                <>
                  {/* Valeur actuelle */}
                  <Text style={[styles.measurementCardValue, { color: colors.textPrimary }]}>
                    {stats.current.toFixed(1)}{' '}
                    <Text style={[styles.measurementUnit, { color: colors.textMuted }]}>cm</Text>
                  </Text>

                  {/* Évolution */}
                  <View style={styles.evolutionRow}>
                    {stats.change < 0 ? (
                      <TrendingDown size={14} color="#22C55E" />
                    ) : stats.change > 0 ? (
                      <TrendingUp size={14} color="#EF4444" />
                    ) : (
                      <Minus size={14} color={colors.textMuted} />
                    )}
                    <Text
                      style={[
                        styles.evolutionText,
                        {
                          color:
                            stats.change < 0
                              ? '#22C55E'
                              : stats.change > 0
                              ? '#EF4444'
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {stats.change > 0 ? '+' : ''}
                      {stats.change.toFixed(1)} cm
                    </Text>
                  </View>

                  {/* Sparkline */}
                  <View style={styles.sparklineContainer}>
                    <SparklineChart
                      data={history}
                      width={130}
                      height={35}
                      color={measurement.color}
                      showGradient={true}
                      thickness={2.5}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.noDataContainer}>
                  <Text style={[styles.noDataText, { color: colors.textMuted }]}>
                    Aucune donnée
                  </Text>
                  <Text style={[styles.noDataHint, { color: colors.textMuted }]}>
                    Ajoute ta première mesure
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Modal de détail */}
      {selectedMeasurement && (
        <StatsDetailModal
          visible={selectedMeasurement !== null}
          onClose={() => setSelectedMeasurement(null)}
          title={selectedMeasurement.label}
          subtitle="Derniers 30 jours"
          data={getMeasurementHistory(selectedMeasurement.id).map((entry, index) => ({
            value: entry.value,
            label: `Point ${getMeasurementHistory(selectedMeasurement.id).length - index}`,
          }))}
          color={selectedMeasurement.color}
          unit="cm"
          icon={<Ruler size={24} color={selectedMeasurement.color} />}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: isIPad() ? 0 : 16, // Pas de padding sur iPad, déjà géré par le parent
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 8,
  },

  // Grille des mensurations
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  measurementCard: {
    width: STATS_CARD_WIDTH,
    borderRadius: 16,
    padding: 14,
    paddingLeft: 18,
    minHeight: 160,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: STATS_GAP,
  },
  measurementCardEmpty: {
    opacity: 0.6,
  },
  colorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  expandIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  measurementCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  measurementCardValue: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  measurementUnit: {
    fontSize: 14,
    fontWeight: '700',
  },
  evolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  evolutionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sparklineContainer: {
    marginTop: 'auto',
    marginHorizontal: -6,
    marginBottom: 6,
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  noDataHint: {
    fontSize: 11,
    textAlign: 'center',
  },
});
