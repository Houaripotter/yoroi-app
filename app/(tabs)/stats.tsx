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
import { Calendar, TrendingDown, Scale, Droplet, Activity } from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { WeightChart } from '@/components/WeightChart';
import { useTheme } from '@/lib/ThemeContext';
import { getAllMeasurements } from '@/lib/storage';
import { format, subDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================
// ⚔️ STATISTIQUES GUERRIER
// ============================================

const { width: screenWidth } = Dimensions.get('window');

type ViewMode = 'discipline' | 'evolution';
type Period = '7j' | '30j' | '90j' | 'tout';

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('evolution');
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ date: string; weight: number }[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await getAllMeasurements();
      const sorted = [...data].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setMeasurements(sorted);

      // Préparer les données pour WeightChart
      setChartData(sorted.map(m => ({ date: m.date, weight: m.weight })));
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Stats calculées
  const getStats = () => {
    if (measurements.length === 0) return null;

    const latest = measurements[measurements.length - 1];
    const first = measurements[0];
    const weightChange = latest.weight - first.weight;

    // Moyenne du mois
    const monthAgo = subDays(new Date(), 30);
    const lastMonth = measurements.filter(m => new Date(m.date) >= monthAgo);
    const avgWeight = lastMonth.reduce((sum, m) => sum + m.weight, 0) / lastMonth.length;

    return {
      current: latest.weight,
      change: weightChange,
      average: avgWeight,
      count: measurements.length,
    };
  };

  const stats = getStats();

  // Générer les jours du calendrier pour le mode discipline
  const generateCalendarDays = () => {
    const today = new Date();
    const start = startOfWeek(subDays(today, 27), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end: today });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const measurement = measurements.find(m => m.date === dateStr);
      return {
        date: day,
        hasMeasurement: !!measurement,
        weight: measurement?.weight,
      };
    });
  };

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

        {/* VIEW MODE TOGGLE */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'discipline' && { backgroundColor: colors.gold }]}
            onPress={() => setViewMode('discipline')}
          >
            <Calendar size={18} color={viewMode === 'discipline' ? colors.background : colors.textSecondary} />
            <Text style={[styles.toggleText, { color: colors.textSecondary }, viewMode === 'discipline' && { color: colors.background }]}>
              Discipline
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'evolution' && { backgroundColor: colors.gold }]}
            onPress={() => setViewMode('evolution')}
          >
            <TrendingDown size={18} color={viewMode === 'evolution' ? colors.background : colors.textSecondary} />
            <Text style={[styles.toggleText, { color: colors.textSecondary }, viewMode === 'evolution' && { color: colors.background }]}>
              Évolution
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'evolution' ? (
          <>
            {/* STATS CARDS */}
            {stats && (
              <View style={styles.statsGrid}>
                <TouchableOpacity activeOpacity={0.8} style={styles.statCardWrapper}>
                  <Card style={styles.statCard}>
                    <Scale size={20} color={colors.gold} />
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.current.toFixed(1)} kg</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids actuel</Text>
                  </Card>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={styles.statCardWrapper}>
                  <Card style={styles.statCard}>
                    <TrendingDown size={20} color={stats.change < 0 ? colors.success : colors.danger} />
                    <Text style={[styles.statValue, { color: stats.change < 0 ? colors.success : colors.danger }]}>
                      {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)} kg
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Depuis le début</Text>
                  </Card>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={styles.statCardWrapper}>
                  <Card style={styles.statCard}>
                    <Activity size={20} color={colors.info} />
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.average.toFixed(1)} kg</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Moyenne 30j</Text>
                  </Card>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} style={styles.statCardWrapper}>
                  <Card style={styles.statCard}>
                    <Calendar size={20} color={colors.purple} />
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.count}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mesures</Text>
                  </Card>
                </TouchableOpacity>
              </View>
            )}

            {/* GRAPHIQUE ÉVOLUTION - NOUVEAU */}
            {chartData.length > 0 && (
              <View style={styles.chartCard}>
                <WeightChart
                  data={chartData}
                  onPointPress={(point) => {
                    console.log('Point sélectionné:', point);
                  }}
                />
              </View>
            )}

            {/* COMPOSITION */}
            {measurements.length > 0 && measurements[measurements.length - 1].bodyFat && (
              <Card style={styles.compositionCard}>
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Composition corporelle</Text>
                <View style={styles.compositionGrid}>
                  <View style={styles.compositionItem}>
                    <View style={[styles.compositionBar, { backgroundColor: colors.warning }]}>
                      <Text style={[styles.compositionValue, { color: colors.background }]}>
                        {measurements[measurements.length - 1].bodyFat?.toFixed(1)}%
                      </Text>
                    </View>
                    <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>Graisse</Text>
                  </View>
                  {measurements[measurements.length - 1].muscle && (
                    <View style={styles.compositionItem}>
                      <View style={[styles.compositionBar, { backgroundColor: colors.success }]}>
                        <Text style={[styles.compositionValue, { color: colors.background }]}>
                          {measurements[measurements.length - 1].muscle?.toFixed(1)}%
                        </Text>
                      </View>
                      <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>Muscle</Text>
                    </View>
                  )}
                  {measurements[measurements.length - 1].water && (
                    <View style={styles.compositionItem}>
                      <View style={[styles.compositionBar, { backgroundColor: colors.info }]}>
                        <Text style={[styles.compositionValue, { color: colors.background }]}>
                          {measurements[measurements.length - 1].water?.toFixed(1)}%
                        </Text>
                      </View>
                      <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>Eau</Text>
                    </View>
                  )}
                </View>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* CALENDRIER DISCIPLINE */}
            <Card style={styles.calendarCard}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Calendrier des pesées</Text>
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

            {/* RÉSUMÉ */}
            <Card style={styles.summaryCard}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Résumé du mois</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.gold }]}>{stats?.count || 0}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>pesées</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.gold }]}>
                    {Math.min(100, Math.round((stats?.count || 0) / 30 * 100))}%
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>régularité</Text>
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

// Constantes non-thématiques
const RADIUS = { sm: 8, md: 12 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // HEADER
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },

  // TOGGLE
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
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // PERIOD
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // STATS GRID
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCardWrapper: {
    width: (screenWidth - 52) / 2,
  },
  statCard: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },

  // CHART
  chartCard: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },

  // COMPOSITION
  compositionCard: {
    marginBottom: 20,
  },
  compositionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  compositionItem: {
    flex: 1,
    alignItems: 'center',
  },
  compositionBar: {
    width: '100%',
    height: 80,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compositionValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  compositionLabel: {
    fontSize: 12,
    marginTop: 8,
  },

  // CALENDAR
  calendarCard: {
    marginBottom: 20,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
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
  calendarDayText: {
    fontSize: 14,
  },

  // SUMMARY
  summaryCard: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 14,
    marginTop: 4,
  },
});
