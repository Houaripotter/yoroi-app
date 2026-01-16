// ============================================
// YOROI - MESURES DÉTAILLÉES
// ============================================
// Graphiques de mensurations corporelles (tour de taille, bras, etc.)

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
import { ArrowLeft, Ruler, TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SmoothLineChart } from '@/components/charts/SmoothLineChart';
import { getMeasurements, Measurement } from '@/lib/database';
// 🔒 SÉCURITÉ: Protection contre les screenshots
import { useSensitiveScreen } from '@/lib/security/screenshotProtection';
import { BlurView } from 'expo-blur';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Period = '30d' | '90d' | '6m' | 'all';
type MeasurementType = 'waist' | 'chest' | 'arms' | 'thighs' | 'hips';

const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  waist: 'Tour de taille',
  chest: 'Tour de poitrine',
  arms: 'Tour de bras',
  thighs: 'Tour de cuisses',
  hips: 'Tour de hanches',
};

const MEASUREMENT_COLORS: Record<MeasurementType, string> = {
  waist: '#EF4444',
  chest: '#3B82F6',
  arms: '#F59E0B',
  thighs: '#10B981',
  hips: '#8B5CF6',
};

export default function MeasurementsDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // 🔒 SÉCURITÉ: Protection contre les screenshots
  const { isProtected, isBlurred, screenshotDetected } = useSensitiveScreen();

  const [period, setPeriod] = useState<Period>('90d');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getMeasurements();
      setMeasurements(data);
    } catch (error) {
      logger.error('Erreur chargement mesures:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer par période
  const getFilteredData = () => {
    const now = new Date();
    const daysMap = { '30d': 30, '90d': 90, '6m': 180, 'all': 365 * 10 };
    const days = daysMap[period];
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return measurements
      .filter(m => new Date(m.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const filteredMeasurements = getFilteredData();

  // Préparer les données pour chaque type de mesure
  const getMeasurementData = (type: MeasurementType) => {
    return filteredMeasurements
      .filter(m => m[type] != null)
      .map(m => ({
        date: new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        value: m[type] as number,
      }));
  };

  // Calculer les stats
  const getStats = (type: MeasurementType) => {
    const data = getMeasurementData(type);
    if (data.length === 0) return { current: 0, min: 0, max: 0, trend: 0 };

    const values = data.map(d => d.value);
    const current = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const first = values[0];
    const trend = current - first;

    return { current, min, max, trend };
  };

  const waistStats = getStats('waist');
  const chestStats = getStats('chest');
  const armsStats = getStats('arms');
  const thighsStats = getStats('thighs');
  const hipsStats = getStats('hips');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mensurations</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 🔒 SÉCURITÉ: Avertissement screenshot détecté */}
      {screenshotDetected && (
        <View style={styles.screenshotWarning}>
          <Text style={styles.screenshotWarningText}>
            Screenshot détecté - Tes données sont sensibles
          </Text>
        </View>
      )}

      {/* Filtres de période */}
      <View style={styles.periodFilters}>
        {(['30d', '90d', '6m', 'all'] as Period[]).map((p) => (
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
              {p === 'all' ? 'Tout' : p === '6m' ? '6 mois' : p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats résumées */}
        <View style={styles.statsGrid}>
          {(Object.keys(MEASUREMENT_LABELS) as MeasurementType[]).map((type) => {
            const stats = getStats(type);
            const TrendIcon = stats.trend < -0.5 ? TrendingDown : stats.trend > 0.5 ? TrendingUp : Minus;
            const trendColor = stats.trend < -0.5 ? '#10B981' : stats.trend > 0.5 ? '#EF4444' : colors.textMuted;

            return (
              <View key={type} style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Ruler size={16} color={MEASUREMENT_COLORS[type]} />
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {MEASUREMENT_LABELS[type]}
                </Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {stats.current > 0 ? `${stats.current.toFixed(1)} cm` : '-'}
                </Text>
                {stats.current > 0 && (
                  <View style={styles.trendRow}>
                    <TrendIcon size={12} color={trendColor} />
                    <Text style={[styles.trendText, { color: trendColor }]}>
                      {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)} cm
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Graphique tour de taille */}
        {getMeasurementData('waist').length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleRow}>
                <Ruler size={20} color={MEASUREMENT_COLORS.waist} />
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                  {MEASUREMENT_LABELS.waist}
                </Text>
              </View>
              <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
                Évolution en centimètres
              </Text>
            </View>
            <SmoothLineChart
              data={getMeasurementData('waist')}
              width={SCREEN_WIDTH - 72}
              height={200}
              color={MEASUREMENT_COLORS.waist}
              showGrid
              showDots
              animated
            />
          </View>
        )}

        {/* Graphique tour de poitrine */}
        {getMeasurementData('chest').length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleRow}>
                <Ruler size={20} color={MEASUREMENT_COLORS.chest} />
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                  {MEASUREMENT_LABELS.chest}
                </Text>
              </View>
              <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
                Évolution en centimètres
              </Text>
            </View>
            <SmoothLineChart
              data={getMeasurementData('chest')}
              width={SCREEN_WIDTH - 72}
              height={200}
              color={MEASUREMENT_COLORS.chest}
              showGrid
              showDots
              animated
            />
          </View>
        )}

        {/* Graphique tour de bras */}
        {getMeasurementData('arms').length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleRow}>
                <Ruler size={20} color={MEASUREMENT_COLORS.arms} />
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                  {MEASUREMENT_LABELS.arms}
                </Text>
              </View>
              <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
                Évolution en centimètres
              </Text>
            </View>
            <SmoothLineChart
              data={getMeasurementData('arms')}
              width={SCREEN_WIDTH - 72}
              height={200}
              color={MEASUREMENT_COLORS.arms}
              showGrid
              showDots
              animated
            />
          </View>
        )}

        {/* Graphique tour de cuisses */}
        {getMeasurementData('thighs').length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleRow}>
                <Ruler size={20} color={MEASUREMENT_COLORS.thighs} />
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                  {MEASUREMENT_LABELS.thighs}
                </Text>
              </View>
              <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
                Évolution en centimètres
              </Text>
            </View>
            <SmoothLineChart
              data={getMeasurementData('thighs')}
              width={SCREEN_WIDTH - 72}
              height={200}
              color={MEASUREMENT_COLORS.thighs}
              showGrid
              showDots
              animated
            />
          </View>
        )}

        {/* Graphique tour de hanches */}
        {getMeasurementData('hips').length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleRow}>
                <Ruler size={20} color={MEASUREMENT_COLORS.hips} />
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                  {MEASUREMENT_LABELS.hips}
                </Text>
              </View>
              <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
                Évolution en centimètres
              </Text>
            </View>
            <SmoothLineChart
              data={getMeasurementData('hips')}
              width={SCREEN_WIDTH - 72}
              height={200}
              color={MEASUREMENT_COLORS.hips}
              showGrid
              showDots
              animated
            />
          </View>
        )}

        {filteredMeasurements.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aucune mesure enregistrée pour cette période
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 🔒 SÉCURITÉ: Flou quand l'app est en background */}
      {isBlurred && (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={100}
          tint={isDark ? 'dark' : 'light'}
        />
      )}
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
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
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
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // 🔒 SÉCURITÉ: Styles pour l'avertissement screenshot
  screenshotWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  screenshotWarningText: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
