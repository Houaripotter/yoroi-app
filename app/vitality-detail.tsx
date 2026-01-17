// ============================================
// YOROI - VITALITÉ DÉTAILLÉE
// ============================================
// Graphiques de sommeil, hydratation, récupération

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Moon, Droplets, Heart, Battery } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { SmoothLineChart } from '@/components/charts/SmoothLineChart';
import { getSleepStats } from '@/lib/sleepService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Period = '7d' | '30d' | '90d';

export default function VitalityDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { locale } = useI18n();
  const [period, setPeriod] = useState<Period>('30d');
  const [sleepData, setSleepData] = useState<{ date: string; value: number }[]>([]);
  const [hydrationData, setHydrationData] = useState<{ date: string; value: number }[]>([]);
  const [vitalityScoreData, setVitalityScoreData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [avgSleep, setAvgSleep] = useState(0);
  const [avgHydration, setAvgHydration] = useState(0);
  const [vitalityScore, setVitalityScore] = useState(0);
  const [sleepQuality, setSleepQuality] = useState(0);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[period];

      // Charger les données de sommeil
      const sleepStats = await getSleepStats();
      const sleepHistory = await loadSleepHistory(days);
      setSleepData(sleepHistory);

      // Charger les données d'hydratation
      const hydrationHistory = await loadHydrationHistory(days);
      setHydrationData(hydrationHistory);

      // Calculer le score de vitalité combiné
      const vitalityHistory = calculateVitalityScore(sleepHistory, hydrationHistory);
      setVitalityScoreData(vitalityHistory);

      // Calculer les stats
      const avgSleepValue = sleepHistory.reduce((sum, d) => sum + d.value, 0) / sleepHistory.length || 0;
      const avgHydrationValue = hydrationHistory.reduce((sum, d) => sum + d.value, 0) / hydrationHistory.length || 0;
      const avgVitalityValue = vitalityHistory.reduce((sum, d) => sum + d.value, 0) / vitalityHistory.length || 0;

      setAvgSleep(avgSleepValue);
      setAvgHydration(avgHydrationValue);
      setVitalityScore(Math.round(avgVitalityValue));
      setSleepQuality(avgSleepValue >= 7 ? 85 : avgSleepValue >= 6 ? 70 : avgSleepValue >= 5 ? 55 : 40);

    } catch (error) {
      logger.error('Erreur chargement vitalité:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSleepHistory = async (days: number): Promise<{ date: string; value: number }[]> => {
    const history: { date: string; value: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = `sleep_${date.toISOString().split('T')[0]}`;

      try {
        const value = await AsyncStorage.getItem(key);
        const hours = value ? parseFloat(value) : 0;
        history.push({
          date: date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
          value: hours,
        });
      } catch {
        history.push({
          date: date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
          value: 0,
        });
      }
    }

    return history;
  };

  const loadHydrationHistory = async (days: number): Promise<{ date: string; value: number }[]> => {
    const history: { date: string; value: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = `hydration_${date.toISOString().split('T')[0]}`;

      try {
        const value = await AsyncStorage.getItem(key);
        const liters = value ? parseFloat(value) / 1000 : 0;
        history.push({
          date: date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
          value: liters,
        });
      } catch {
        history.push({
          date: date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
          value: 0,
        });
      }
    }

    return history;
  };

  const calculateVitalityScore = (
    sleep: { date: string; value: number }[],
    hydration: { date: string; value: number }[]
  ): { date: string; value: number }[] => {
    return sleep.map((s, i) => {
      const h = hydration[i];
      const sleepScore = (s.value / 8) * 60; // 60 points max pour le sommeil
      const hydrationScore = (h.value / 2.5) * 40; // 40 points max pour l'hydratation
      return {
        date: s.date,
        value: Math.min(100, sleepScore + hydrationScore),
      };
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Vitalité</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filtres de période */}
      <View style={styles.periodFilters}>
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
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
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats résumées */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Battery size={20} color="#10B981" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{vitalityScore}%</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Score vitalité</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Moon size={20} color="#8B5CF6" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{avgSleep.toFixed(1)}h</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sommeil moy.</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Droplets size={20} color="#3B82F6" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{avgHydration.toFixed(1)}L</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Hydratation moy.</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Heart size={20} color="#EF4444" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{sleepQuality}%</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Qualité sommeil</Text>
          </View>
        </View>

        {/* Graphique score vitalité */}
        <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <Battery size={20} color="#10B981" />
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                Score de vitalité
              </Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
              Score combiné sommeil + hydratation
            </Text>
          </View>
          {vitalityScoreData.length > 0 ? (
            <SmoothLineChart
              data={vitalityScoreData}
              width={SCREEN_WIDTH - 72}
              height={200}
              color="#10B981"
              showGrid
              showDots
              animated
              maxValue={100}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucune donnée pour cette période
              </Text>
            </View>
          )}
        </View>

        {/* Graphique sommeil */}
        <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <Moon size={20} color="#8B5CF6" />
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                Sommeil
              </Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
              Heures de sommeil par nuit
            </Text>
          </View>
          {sleepData.length > 0 ? (
            <SmoothLineChart
              data={sleepData}
              width={SCREEN_WIDTH - 72}
              height={200}
              color="#8B5CF6"
              showGrid
              showDots
              animated
              maxValue={12}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucune donnée pour cette période
              </Text>
            </View>
          )}
        </View>

        {/* Graphique hydratation */}
        <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <Droplets size={20} color="#3B82F6" />
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                Hydratation
              </Text>
            </View>
            <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
              Litres d'eau par jour
            </Text>
          </View>
          {hydrationData.length > 0 ? (
            <SmoothLineChart
              data={hydrationData}
              width={SCREEN_WIDTH - 72}
              height={200}
              color="#3B82F6"
              showGrid
              showDots
              animated
              maxValue={4}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Aucune donnée pour cette période
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
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
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
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
