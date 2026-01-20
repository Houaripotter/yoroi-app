import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { LineChart } from 'react-native-gifted-charts';
import {
  Scale,
  Activity,
  Flame,
  Heart,
  Ruler,
  TrendingUp,
  Zap,
  Moon,
  Droplets,
  Award,
  Maximize2,
  Trophy,
  Target,
  Bone,
  Calendar,
  Waves,
  PlusCircle
} from 'lucide-react-native';
import { getWeights, getTrainings, getMeasurements } from '@/lib/database';
import { getSleepStats } from '@/lib/sleepService';
import { calculateReadinessScore } from '@/lib/readinessService';
import { getWeeklyLoadStats } from '@/lib/trainingLoadService';
import { getMockWeights, getMockMeasurements, getMockTrainings } from '@/lib/mockDataService';
import { getUserSettings } from '@/lib/storage';
import { format, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StatsDetailModal } from '../StatsDetailModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 44) / 2;

export const DashboardPage: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<any>(null);

  // Data States
  const [allMetrics, setAllMetrics] = useState<any[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const settings = await getUserSettings();
      const isScreenshotMode = settings.username === 'Germain Del Jarret';

      let weights, trainings, measurements, sleep, readiness, loadStats;

      if (isScreenshotMode) {
        weights = getMockWeights(30);
        trainings = getMockTrainings(30);
        measurements = getMockMeasurements(60);
        readiness = { score: 88 };
        loadStats = { totalLoad: 1850 };
        sleep = { 
          weeklyData: Array.from({ length: 7 }, (_, i) => ({
            date: subDays(new Date(), i).toISOString(),
            duration: 460 + (Math.sin(i) * 40)
          }))
        };
      } else {
        [weights, trainings, measurements, sleep, readiness, loadStats] = await Promise.all([
          getWeights(60),
          getTrainings(60),
          getMeasurements(90),
          getSleepStats(),
          calculateReadinessScore(7),
          getWeeklyLoadStats()
        ]);
      }

      const metricsList: any[] = [];

      // Helper pour préparer les données de graphique
      const prepareLineData = (data: any[], valueKey: string, color: string) => {
        if (!data || data.length === 0) return [];
        const filtered = data.filter(item => item[valueKey] != null);
        return filtered.slice().reverse().map(item => {
          const val = item[valueKey] || 0;
          return {
            value: val,
            dataPointText: val.toFixed(1),
            label: format(parseISO(item.date), 'd MMM', { locale: fr }).toUpperCase(),
            labelTextStyle: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
            dataPointColor: color,
          };
        });
      };

      const getLatestValue = (data: any[], key: string, fallback: string = '--') => {
        if (!data || data.length === 0) return fallback;
        const val = data[0][key];
        return val ? val.toFixed(1) : fallback;
      };

      // --- 1. CORPS (TOUJOURS AFFICHÉS) ---
      metricsList.push({ id: 'weight', metricKey: 'weight', theme: 'Corps', title: 'Poids', icon: <Scale size={16} color="#3B82F6" />, color: '#3B82F6', unit: 'kg', value: getLatestValue(weights, 'weight'), data: prepareLineData(weights, 'weight', '#3B82F6') });
      metricsList.push({ id: 'muscle_percent', metricKey: 'muscle_percent', theme: 'Corps', title: 'Muscle', icon: <TrendingUp size={16} color="#10B981" />, color: '#10B981', unit: '%', value: getLatestValue(weights, 'muscle_percent'), data: prepareLineData(weights, 'muscle_percent', '#10B981') });
      metricsList.push({ id: 'fat_percent', metricKey: 'fat_percent', theme: 'Corps', title: 'Gras', icon: <Activity size={16} color="#EF4444" />, color: '#EF4444', unit: '%', value: getLatestValue(weights, 'fat_percent'), data: prepareLineData(weights, 'fat_percent', '#EF4444') });
      metricsList.push({ id: 'water_percent', metricKey: 'water_percent', theme: 'Corps', title: 'Eau', icon: <Waves size={16} color="#06B6D4" />, color: '#06B6D4', unit: '%', value: getLatestValue(weights, 'water_percent'), data: prepareLineData(weights, 'water_percent', '#06B6D4') });

      // --- 2. COMPOSITION (TOUJOURS AFFICHÉS) ---
      metricsList.push({ id: 'visceral_fat', metricKey: 'visceral_fat', theme: 'Composition', title: 'Gras Visc.', icon: <Target size={16} color="#F97316" />, color: '#F97316', unit: '', value: weights?.[0]?.visceral_fat || '--', data: prepareLineData(weights, 'visceral_fat', '#F97316') });
      metricsList.push({ id: 'bone_mass', metricKey: 'bone_mass', theme: 'Composition', title: 'Os', icon: <Bone size={16} color="#8B5CF6" />, color: '#8B5CF6', unit: 'kg', value: getLatestValue(weights, 'bone_mass'), data: prepareLineData(weights, 'bone_mass', '#8B5CF6') });
      metricsList.push({ id: 'bmr', metricKey: 'bmr', theme: 'Composition', title: 'BMR', icon: <Flame size={16} color="#F59E0B" />, color: '#F59E0B', unit: 'kcal', value: weights?.[0]?.bmr || '--', data: prepareLineData(weights, 'bmr', '#F59E0B') });
      metricsList.push({ id: 'metabolic_age', metricKey: 'metabolic_age', theme: 'Composition', title: 'Âge Métab.', icon: <Calendar size={16} color="#EC4899" />, color: '#EC4899', unit: 'ans', value: weights?.[0]?.metabolic_age || '--', data: prepareLineData(weights, 'metabolic_age', '#EC4899') });

      // --- 3. MENSURATIONS (PRINCIPALES AFFICHÉES) ---
      const mKeys = [
        { key: 'waist', title: 'Taille', icon: <Ruler size={16} color="#F59E0B" /> },
        { key: 'chest', title: 'Pecs', icon: <Ruler size={16} color="#F59E0B" /> },
        { key: 'left_arm', title: 'Bras', icon: <Ruler size={16} color="#F59E0B" /> },
        { key: 'left_thigh', title: 'Cuisse', icon: <Ruler size={16} color="#F59E0B" /> },
      ];
      mKeys.forEach(m => {
        metricsList.push({ id: m.key, metricKey: m.key, theme: 'Mensures', title: m.title, icon: m.icon, color: '#F59E0B', unit: 'cm', value: getLatestValue(measurements, m.key), data: prepareLineData(measurements, m.key, '#F59E0B') });
      });

      // --- 4. DISCIPLINE ---
      metricsList.push({ id: 'trainings', metricKey: 'trainings', theme: 'Discipline', title: 'Entraînements', icon: <Trophy size={16} color="#8B5CF6" />, color: '#8B5CF6', unit: '/30j', value: trainings?.length || 0, data: [] });
      metricsList.push({ id: 'load', metricKey: 'load', theme: 'Discipline', title: 'Charge globale', icon: <Flame size={16} color="#F97316" />, color: '#F97316', unit: 'pts', value: loadStats?.totalLoad || 0, data: [] });

      // --- 5. SANTÉ ---
      metricsList.push({ id: 'vitality', metricKey: 'vitality', theme: 'Santé', title: 'Vitalité', icon: <Zap size={16} color="#F59E0B" />, color: '#F59E0B', unit: '/100', value: readiness?.score || '--', data: [] });
      
      const sleepDuration = sleep?.weeklyData?.[0]?.duration ? (sleep.weeklyData[0].duration / 60).toFixed(1) : '--';
      metricsList.push({ id: 'sleep', metricKey: 'sleep', theme: 'Santé', title: 'Sommeil', icon: <Moon size={16} color="#8B5CF6" />, color: '#8B5CF6', unit: 'h', value: sleepDuration, data: prepareLineData(sleep?.weeklyData || [], 'duration', '#8B5CF6').map(d => ({...d, value: d.value/60, dataPointText: (d.value/60).toFixed(1)})) });

      setAllMetrics(metricsList);
    } catch (e) {
      console.error("Error loading dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  const renderMiniCard = (metric: any) => {
    const hasData = metric.data && metric.data.length > 0;
    const values = hasData ? metric.data.map((d: any) => d.value) : [];
    const minValue = hasData ? Math.min(...values) : 0;
    const maxValue = hasData ? Math.max(...values) : 0;
    const range = maxValue - minValue;
    const yAxisOffset = hasData ? Math.floor(minValue - (range > 0 ? range * 0.5 : 1)) : 0;

    return (
      <View
        key={metric.id}
        style={[styles.miniCard, { backgroundColor: colors.backgroundCard }]}
      >
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => setSelectedMetric(metric)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: metric.color + '15' }]}>
            {metric.icon}
          </View>
          <Text style={[styles.themeLabel, { color: colors.textMuted }]}>{metric.theme}</Text>
          <View style={{ flex: 1 }} />
          <Maximize2 size={12} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSelectedMetric(metric)} activeOpacity={0.7}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{metric.title}</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.cardValue, { color: hasData ? colors.textPrimary : colors.textMuted }]}>
              {metric.value}
            </Text>
            <Text style={[styles.cardUnit, { color: colors.textMuted }]}>{metric.unit}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.miniChartWrapper}>
          {hasData ? (
            <LineChart
              data={metric.data}
              height={85}
              width={COLUMN_WIDTH} 
              initialSpacing={15}
              spacing={85} 
              hideRules
              hideAxesAndRules
              hideYAxisText
              xAxisThickness={0}
              xAxisLabelsHeight={22}
              curved
              thickness={3.5}
              color={metric.color}
              startFillColor={metric.color}
              endFillColor={metric.color}
              startOpacity={0.2}
              endOpacity={0.01}
              areaChart
              yAxisOffset={yAxisOffset > 0 ? yAxisOffset : 0}
              hideDataPoints={false}
              dataPointsHeight={8}
              dataPointsWidth={8}
              dataPointsColor={metric.color}
              showValuesAsDataPointsText
              textFontSize={10}
              textColor={isDark ? '#FFFFFF' : '#000000'}
              textShiftY={-15}
              scrollEnabled={true}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 8, fontWeight: '900' }}
              onPress={() => setSelectedMetric(metric)}
            />
          ) : (
            <TouchableOpacity 
              style={styles.noDataContainer} 
              onPress={() => setSelectedMetric(metric)}
              activeOpacity={0.6}
            >
              <PlusCircle size={24} color={metric.color + '60'} strokeWidth={1.5} />
              <Text style={[styles.noDataText, { color: colors.textMuted }]}>Saisir</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const themes = ['Corps', 'Composition', 'Mensures', 'Discipline', 'Santé'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>Résumé</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Vision globale de ton évolution physique et performance</Text>
      </View>

      {themes.map(theme => {
        const themeMetrics = allMetrics.filter(m => m.theme === theme);
        if (themeMetrics.length === 0) return null;

        return (
          <View key={theme} style={styles.themeSection}>
            <Text style={[styles.themeTitle, { color: colors.textSecondary }]}>{theme}</Text>
            <View style={styles.grid}>
              {themeMetrics.map(renderMiniCard)}
            </View>
          </View>
        );
      })}

      <View style={{ height: 120 }} />

      {selectedMetric && (
        <StatsDetailModal
          visible={!!selectedMetric}
          onClose={() => setSelectedMetric(null)}
          title={selectedMetric.title}
          subtitle={`Vision complète - ${selectedMetric.theme}`}
          data={selectedMetric.data.map((d: any) => ({
            value: d.value,
            label: d.label,
            date: d.date || undefined
          }))}
          color={selectedMetric.color}
          unit={selectedMetric.unit}
          icon={selectedMetric.icon}
          metricKey={selectedMetric.metricKey}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
    marginTop: -10,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 18,
  },
  themeSection: {
    marginBottom: 24,
  },
  themeTitle: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 4,
    opacity: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  miniCard: {
    width: COLUMN_WIDTH,
    borderRadius: 24,
    padding: 14,
    minHeight: 215,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cardUnit: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniChartWrapper: {
    height: 120,
    marginTop: 5,
    marginLeft: -25,
    marginBottom: -10,
    justifyContent: 'center',
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 10,
    marginLeft: 25, // Recentrer par rapport au décalage de la zone graphique
  },
  noDataText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});