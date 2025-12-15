import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Calendar, TrendingDown, Scale, Activity, Ruler } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { WeightChart } from '@/components/WeightChart';
import { BodyCompositionChart } from '@/components/BodyCompositionChart';
import { MeasurementsChart } from '@/components/MeasurementsChart';
import { useTheme } from '@/lib/ThemeContext';
import { getAllMeasurements } from '@/lib/storage';
import { getMeasurements, Measurement } from '@/lib/database';
import { format, subDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================
// STATISTIQUES GUERRIER - V3
// ============================================
// 4 modes: Poids, Composition, Mensurations, Discipline

const { width: screenWidth } = Dimensions.get('window');

type ViewMode = 'poids' | 'composition' | 'mensurations' | 'discipline';

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('poids');

  // Donnees poids/composition (AsyncStorage)
  const [weightData, setWeightData] = useState<any[]>([]);

  // Donnees mensurations (SQLite)
  const [measurementsData, setMeasurementsData] = useState<Measurement[]>([]);

  const loadData = useCallback(async () => {
    try {
      // Charger poids/composition depuis AsyncStorage
      const weights = await getAllMeasurements();
      const sortedWeights = [...weights].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setWeightData(sortedWeights);

      // Charger mensurations depuis SQLite
      const measurements = await getMeasurements();
      const sortedMeasurements = [...measurements].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setMeasurementsData(sortedMeasurements);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Stats poids
  const getWeightStats = () => {
    if (weightData.length === 0) return null;

    const latest = weightData[weightData.length - 1];
    const first = weightData[0];
    const weightChange = latest.weight - first.weight;

    const monthAgo = subDays(new Date(), 30);
    const lastMonth = weightData.filter(m => new Date(m.date) >= monthAgo);
    const avgWeight = lastMonth.length > 0
      ? lastMonth.reduce((sum, m) => sum + m.weight, 0) / lastMonth.length
      : latest.weight;

    return {
      current: latest.weight,
      change: weightChange,
      average: avgWeight,
      count: weightData.length,
    };
  };

  const stats = getWeightStats();

  // Generer les jours du calendrier pour le mode discipline
  const generateCalendarDays = () => {
    const today = new Date();
    const start = startOfWeek(subDays(today, 27), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end: today });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const measurement = weightData.find(m => m.date === dateStr);
      return {
        date: day,
        hasMeasurement: !!measurement,
        weight: measurement?.weight,
      };
    });
  };

  // Donnees pour les graphiques
  const chartData = weightData.map(m => ({ date: m.date, weight: m.weight }));

  const compositionData = weightData.map(m => ({
    date: m.date,
    weight: m.weight,
    bodyFat: m.bodyFat,
    muscle: m.muscle,
    water: m.water,
  }));

  return (
    <ScreenWrapper noPadding>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Statistiques</Text>
        </View>

        {/* MODE TOGGLE - 4 options */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'poids' && { backgroundColor: colors.gold }]}
            onPress={() => setViewMode('poids')}
          >
            <Scale size={16} color={viewMode === 'poids' ? colors.background : colors.textSecondary} />
            <Text style={[styles.toggleText, { color: viewMode === 'poids' ? colors.background : colors.textSecondary }]}>
              Poids
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'composition' && { backgroundColor: colors.gold }]}
            onPress={() => setViewMode('composition')}
          >
            <Activity size={16} color={viewMode === 'composition' ? colors.background : colors.textSecondary} />
            <Text style={[styles.toggleText, { color: viewMode === 'composition' ? colors.background : colors.textSecondary }]}>
              Compo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'mensurations' && { backgroundColor: colors.gold }]}
            onPress={() => setViewMode('mensurations')}
          >
            <Ruler size={16} color={viewMode === 'mensurations' ? colors.background : colors.textSecondary} />
            <Text style={[styles.toggleText, { color: viewMode === 'mensurations' ? colors.background : colors.textSecondary }]}>
              Mesures
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'discipline' && { backgroundColor: colors.gold }]}
            onPress={() => setViewMode('discipline')}
          >
            <Calendar size={16} color={viewMode === 'discipline' ? colors.background : colors.textSecondary} />
            <Text style={[styles.toggleText, { color: viewMode === 'discipline' ? colors.background : colors.textSecondary }]}>
              Discipline
            </Text>
          </TouchableOpacity>
        </View>

        {/* MODE POIDS */}
        {viewMode === 'poids' && (
          <>
            {/* STATS CARDS */}
            {stats && (
              <View style={styles.statsGrid}>
                <View style={styles.statCardWrapper}>
                  <Card style={styles.statCard}>
                    <Scale size={20} color={colors.gold} />
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.current.toFixed(1)} kg</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids actuel</Text>
                  </Card>
                </View>
                <View style={styles.statCardWrapper}>
                  <Card style={styles.statCard}>
                    <TrendingDown size={20} color={stats.change < 0 ? colors.success : colors.danger} />
                    <Text style={[styles.statValue, { color: stats.change < 0 ? colors.success : colors.danger }]}>
                      {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)} kg
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Depuis le debut</Text>
                  </Card>
                </View>
                <View style={styles.statCardWrapper}>
                  <Card style={styles.statCard}>
                    <Activity size={20} color={colors.info} />
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.average.toFixed(1)} kg</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Moyenne 30j</Text>
                  </Card>
                </View>
                <View style={styles.statCardWrapper}>
                  <Card style={styles.statCard}>
                    <Calendar size={20} color={colors.purple} />
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.count}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pesees</Text>
                  </Card>
                </View>
              </View>
            )}

            {/* GRAPHIQUE POIDS */}
            {chartData.length > 0 && (
              <View style={styles.chartCard}>
                <WeightChart
                  data={chartData}
                  onPointPress={(point) => {
                    console.log('Point selectionne:', point);
                  }}
                />
              </View>
            )}
          </>
        )}

        {/* MODE COMPOSITION CORPORELLE */}
        {viewMode === 'composition' && (
          <>
            <View style={styles.chartCard}>
              <BodyCompositionChart
                data={compositionData}
                onPointPress={(point) => {
                  console.log('Point composition:', point);
                }}
              />
            </View>

            {/* Carte resume si donnees recentes */}
            {weightData.length > 0 && weightData[weightData.length - 1].bodyFat && (
              <Card style={styles.summaryCard}>
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Derniere mesure</Text>
                <View style={styles.compositionGrid}>
                  <View style={styles.compositionItem}>
                    <View style={[styles.compositionBar, { backgroundColor: colors.warning }]}>
                      <Text style={[styles.compositionValue, { color: colors.background }]}>
                        {weightData[weightData.length - 1].bodyFat?.toFixed(1)}%
                      </Text>
                    </View>
                    <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>Graisse</Text>
                  </View>
                  {weightData[weightData.length - 1].muscle && (
                    <View style={styles.compositionItem}>
                      <View style={[styles.compositionBar, { backgroundColor: colors.success }]}>
                        <Text style={[styles.compositionValue, { color: colors.background }]}>
                          {weightData[weightData.length - 1].muscle?.toFixed(1)}%
                        </Text>
                      </View>
                      <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>Muscle</Text>
                    </View>
                  )}
                  {weightData[weightData.length - 1].water && (
                    <View style={styles.compositionItem}>
                      <View style={[styles.compositionBar, { backgroundColor: colors.info }]}>
                        <Text style={[styles.compositionValue, { color: colors.background }]}>
                          {weightData[weightData.length - 1].water?.toFixed(1)}%
                        </Text>
                      </View>
                      <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>Eau</Text>
                    </View>
                  )}
                </View>
              </Card>
            )}
          </>
        )}

        {/* MODE MENSURATIONS */}
        {viewMode === 'mensurations' && (
          <>
            <View style={styles.chartCard}>
              <MeasurementsChart
                data={measurementsData}
                onPointPress={(point) => {
                  console.log('Point mensuration:', point);
                }}
              />
            </View>

            {/* Stats mensurations si disponibles */}
            {measurementsData.length > 0 && (
              <Card style={styles.summaryCard}>
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Resume</Text>
                <View style={styles.measurementsSummary}>
                  <View style={styles.measurementStat}>
                    <Text style={[styles.measurementStatValue, { color: colors.gold }]}>
                      {measurementsData.length}
                    </Text>
                    <Text style={[styles.measurementStatLabel, { color: colors.textSecondary }]}>
                      enregistrements
                    </Text>
                  </View>
                  {measurementsData[0].waist && measurementsData[measurementsData.length - 1].waist && (
                    <View style={styles.measurementStat}>
                      <Text style={[
                        styles.measurementStatValue,
                        {
                          color: measurementsData[measurementsData.length - 1].waist! < measurementsData[0].waist!
                            ? colors.success
                            : colors.danger
                        }
                      ]}>
                        {measurementsData[measurementsData.length - 1].waist! - measurementsData[0].waist! > 0 ? '+' : ''}
                        {(measurementsData[measurementsData.length - 1].waist! - measurementsData[0].waist!).toFixed(0)} cm
                      </Text>
                      <Text style={[styles.measurementStatLabel, { color: colors.textSecondary }]}>
                        taille
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            )}
          </>
        )}

        {/* MODE DISCIPLINE */}
        {viewMode === 'discipline' && (
          <>
            <Card style={styles.calendarCard}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Calendrier des pesees</Text>
              <View style={styles.calendarGrid}>
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                  <Text key={i} style={[styles.calendarDayLabel, { color: colors.textSecondary }]}>{day}</Text>
                ))}
                {generateCalendarDays().map((day, i) => (
                  <View
                    key={i}
                    style={[
                      styles.calendarDay,
                      day.hasMeasurement && { backgroundColor: colors.goldMuted },
                    ]}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      { color: colors.textMuted },
                      day.hasMeasurement && { color: colors.gold, fontWeight: '600' },
                    ]}>
                      {format(day.date, 'd')}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card style={styles.summaryCard}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Resume du mois</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.gold }]}>{stats?.count || 0}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>pesees</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.gold }]}>
                    {Math.min(100, Math.round((stats?.count || 0) / 30 * 100))}%
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>regularite</Text>
                </View>
              </View>
            </Card>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const RADIUS = { sm: 8, md: 12 };

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },

  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700' },

  toggleContainer: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  toggleText: { fontSize: 11, fontWeight: '600' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCardWrapper: { width: (screenWidth - 52) / 2 },
  statCard: { alignItems: 'center', gap: 8 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12 },

  chartCard: { marginBottom: 20 },
  chartTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },

  compositionGrid: { flexDirection: 'row', gap: 12 },
  compositionItem: { flex: 1, alignItems: 'center' },
  compositionBar: {
    width: '100%',
    height: 80,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compositionValue: { fontSize: 20, fontWeight: '700' },
  compositionLabel: { fontSize: 12, marginTop: 8 },

  calendarCard: { marginBottom: 20 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  calendarDayText: { fontSize: 14 },

  summaryCard: { marginBottom: 20 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, height: 40 },
  summaryValue: { fontSize: 32, fontWeight: '700' },
  summaryLabel: { fontSize: 14, marginTop: 4 },

  measurementsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  measurementStat: { alignItems: 'center' },
  measurementStatValue: { fontSize: 24, fontWeight: '700' },
  measurementStatLabel: { fontSize: 12, marginTop: 4 },
});
