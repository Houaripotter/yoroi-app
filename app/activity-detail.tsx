// ============================================
// YOROI - ACTIVITÉ DÉTAILLÉE
// ============================================
// Graphiques d'activité (volume, fréquence, types d'entraînements)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Activity, Calendar, Clock, Dumbbell, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SmoothLineChart } from '@/components/charts/SmoothLineChart';
import { getTrainings, Training } from '@/lib/database';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Period = '7d' | '30d' | '90d' | 'all';

export default function ActivityDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>('30d');
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadData = async () => {
      try {
        const data = await getTrainings();
        setTrainings(data);
      } catch (error) {
        logger.error('Erreur chargement trainings:', error);
      } finally {
        timer = setTimeout(() => setLoading(false), 400);
      }
    };

    loadData();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Filtrer par période
  const getFilteredData = () => {
    if (!trainings || !Array.isArray(trainings)) return [];
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, 'all': 365 * 10 };
    const days = daysMap[period] || 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return trainings
      .filter(t => t && t.date && new Date(t.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const filteredTrainings = getFilteredData();

  // Volume d'entraînement par semaine
  const volumeData = (() => {
    const weeks = new Map<string, number>();

    filteredTrainings.forEach(t => {
      const weekKey = getWeekKey(new Date(t.date));
      const current = weeks.get(weekKey) || 0;
      weeks.set(weekKey, current + ((t.duration || 60) / 60));
    });

    return Array.from(weeks.entries()).map(([week, hours]) => ({
      date: week,
      value: hours,
    }));
  })();

  // Fréquence (nombre de séances par semaine)
  const frequencyData = (() => {
    const weeks = new Map<string, number>();

    filteredTrainings.forEach(t => {
      const weekKey = getWeekKey(new Date(t.date));
      const current = weeks.get(weekKey) || 0;
      weeks.set(weekKey, current + 1);
    });

    return Array.from(weeks.entries()).map(([week, count]) => ({
      date: week,
      value: count,
    }));
  })();

  // Intensité moyenne par semaine
  const intensityData = (() => {
    const weeks = new Map<string, { total: number; count: number }>();

    filteredTrainings.forEach(t => {
      const weekKey = getWeekKey(new Date(t.date));
      const current = weeks.get(weekKey) || { total: 0, count: 0 };
      weeks.set(weekKey, {
        total: current.total + (t.intensity || 5),
        count: current.count + 1,
      });
    });

    return Array.from(weeks.entries()).map(([week, data]) => ({
      date: week,
      value: data.total / data.count,
    }));
  })();

  // Stats résumées
  const totalSessions = filteredTrainings.length;
  const totalHours = filteredTrainings.reduce((sum, t) => sum + ((t.duration || 60) / 60), 0);

  // Calculer sessions par semaine
  const daysInPeriod = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const weeksInPeriod = daysInPeriod / 7;
  const avgSessionsPerWeek = totalSessions / weeksInPeriod;

  // Type d'entraînement le plus fréquent
  const typeCount = new Map<string, number>();
  filteredTrainings.forEach(t => {
    const type = t.category || 'Entraînement';
    typeCount.set(type, (typeCount.get(type) || 0) + 1);
  });

  const mostFrequentType = Array.from(typeCount.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Analyse de tes performances...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Activité</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filtres de période */}
      <View style={styles.periodFilters}>
        {(['7d', '30d', '90d', 'all'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodBtn,
              { backgroundColor: period === p ? colors.accent : colors.backgroundCard },
            ]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodText,
                { color: period === p ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              {p === 'all' ? 'Tout' : p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats résumées */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Activity size={20} color="#3B82F6" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Séances</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Clock size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{(totalHours || 0).toFixed(1)}h</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Volume total</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Calendar size={20} color="#F59E0B" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{(avgSessionsPerWeek || 0).toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Séances/sem.</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Dumbbell size={20} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {mostFrequentType}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Type principal</Text>
          </View>
        </View>

        {/* Graphique volume d'entraînement */}
        <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <Clock size={20} color="#10B981" />
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                Volume d'entraînement
              </Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
              Heures par semaine
            </Text>
          </View>
          {volumeData.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <SmoothLineChart
                data={volumeData}
                width={Math.max(SCREEN_WIDTH - 72, volumeData.length * 50)}
                height={200}
                color="#10B981"
                showGrid
                showDots
                animated
              />
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucune donnée pour cette période
              </Text>
            </View>
          )}
        </View>

        {/* Graphique fréquence */}
        <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <Calendar size={20} color="#F59E0B" />
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                Fréquence d'entraînement
              </Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
              Nombre de séances par semaine
            </Text>
          </View>
          {frequencyData.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <SmoothLineChart
                data={frequencyData}
                width={Math.max(SCREEN_WIDTH - 72, frequencyData.length * 50)}
                height={200}
                color="#F59E0B"
                showGrid
                showDots
                animated
              />
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucune donnée pour cette période
              </Text>
            </View>
          )}
        </View>

        {/* Graphique intensité moyenne */}
        <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <TrendingUp size={20} color="#EF4444" />
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                Intensité moyenne
              </Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
              RPE moyen par semaine (échelle 1-10)
            </Text>
          </View>
          {intensityData.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <SmoothLineChart
                data={intensityData}
                width={Math.max(SCREEN_WIDTH - 72, intensityData.length * 50)}
                height={200}
                color="#EF4444"
                showGrid
                showDots
                animated
                maxValue={10}
              />
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucune donnée pour cette période
              </Text>
            </View>
          )}
        </View>

        {filteredTrainings.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aucun entraînement enregistré pour cette période
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Helper: obtenir la clé de semaine (format: "S01")
function getWeekKey(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `S${weekNumber.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  periodFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '800',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartSubtitle: {
    fontSize: 12,
    marginLeft: 28,
  },
  emptyState: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
