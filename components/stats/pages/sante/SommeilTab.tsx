import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScrollableLineChart } from '../../charts/ScrollableLineChart';
import { Moon, Plus, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SommeilTabProps {
  sleep: any;
  sleepPhasesData: {
    avgAwake: number;
    avgRem: number;
    avgCore: number;
    avgDeep: number;
    totalSleepMin: number;
    nightsCount: number;
  };
  sleepComparisonData: {
    heartRate?: { min: number; max: number; avg: number };
    respiratoryRate?: { min: number; max: number; avg: number };
    wristTemperature?: { value: number };
  };
  sleepHistory: { date: string; value: number }[];
  rawSleepHistory?: any[];
  onMetricPress?: (metric: { key: string; label: string; color: string; unit: string; icon: React.ReactNode }) => void;
}

const formatSleepDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const min = Math.round((hours - h) * 60);
  return `${h}h ${min.toString().padStart(2, '0')}min`;
};

const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h ${m.toString().padStart(2, '0')}`;
};

export const SommeilTab: React.FC<SommeilTabProps> = React.memo(({
  sleep,
  sleepPhasesData,
  sleepComparisonData,
  sleepHistory,
  rawSleepHistory = [],
  onMetricPress,
}) => {
  const { colors, isDark } = useTheme();

  const avgHours = sleepPhasesData.totalSleepMin > 0 ? sleepPhasesData.totalSleepMin / 60 : 0;

  // Defensive + Memoize sorted nights (max 50 for display)
  const safeSleepHistory = Array.isArray(rawSleepHistory) ? rawSleepHistory : [];
  const safeSleepChartHistory = Array.isArray(sleepHistory) ? sleepHistory : [];
  const sortedNights = useMemo(
    () => [...safeSleepHistory]
      .filter(item => item?.date)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 50),
    [safeSleepHistory]
  );

  const renderNightRow = useCallback(({ item: night, index }: { item: any; index: number }) => {
    const total = night.total || night.duration || 0;
    const hours = total / 60;
    const dateStr = night.date || '';

    let formattedDate = dateStr;
    try {
      const d = parseISO(dateStr);
      formattedDate = format(d, 'EEE d MMM', { locale: fr });
    } catch {}

    let timeRange = '';
    if (night.startTime && night.endTime) {
      try {
        const bedDate = new Date(night.startTime);
        const wakeDate = new Date(night.endTime);
        const bedStr = `${bedDate.getHours().toString().padStart(2, '0')}:${bedDate.getMinutes().toString().padStart(2, '0')}`;
        const wakeStr = `${wakeDate.getHours().toString().padStart(2, '0')}:${wakeDate.getMinutes().toString().padStart(2, '0')}`;
        timeRange = `${bedStr} - ${wakeStr}`;
      } catch {}
    }

    const phaseParts: string[] = [];
    if (night.deep > 0) phaseParts.push(`Prof. ${formatMinutes(night.deep)}`);
    if (night.rem > 0) phaseParts.push(`REM ${formatMinutes(night.rem)}`);
    if (night.core > 0) phaseParts.push(`Leg. ${formatMinutes(night.core)}`);
    const phaseSummary = phaseParts.join(' / ');

    const isLast = index === sortedNights.length - 1;

    return (
      <TouchableOpacity
        style={[
          styles.nightRow,
          {
            backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
            borderBottomColor: isLast ? 'transparent' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
          },
          index === 0 && styles.nightRowFirst,
          isLast && styles.nightRowLast,
        ]}
        activeOpacity={0.7}
        onPress={() => {
          if (dateStr) {
            router.push(`/sleep-detail?date=${dateStr.split('T')[0]}` as any);
          }
        }}
      >
        <View style={styles.nightInfo}>
          <Text style={[styles.nightDate, { color: colors.textPrimary }]}>
            {formattedDate}
          </Text>
          {timeRange ? (
            <Text style={[styles.nightPhases, { color: colors.textMuted }]}>
              {timeRange}
            </Text>
          ) : null}
          {phaseSummary ? (
            <Text style={[styles.nightPhases, { color: colors.textMuted }]} numberOfLines={1}>
              {phaseSummary}
            </Text>
          ) : null}
        </View>
        <View style={styles.nightRight}>
          <Text style={[styles.nightDuration, { color: '#6366F1' }]}>
            {hours > 0 ? formatSleepDuration(hours) : '--'}
          </Text>
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
        </View>
      </TouchableOpacity>
    );
  }, [sortedNights.length, isDark, colors]);

  const nightKeyExtractor = useCallback((item: any, index: number) => (item.date || '') + index, []);

  return (
    <View>
      {/* Hero - Grande durée */}
      <TouchableOpacity
        style={[styles.heroCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}
        activeOpacity={0.75}
        onPress={() => router.push('/sleep' as any)}
      >
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroValue, { color: colors.textPrimary }]}>
              {avgHours > 0 ? formatSleepDuration(avgHours) : '--'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
              Durée de sommeil effectif moy.
            </Text>
            <Text style={[styles.heroSubLabel, { color: colors.textMuted }]}>
              Hors éveils · peut différer d'Apple Santé
            </Text>
            <View style={[styles.seeDetailRow]}>
              <Moon size={13} color={'#6366F1'} strokeWidth={2} />
              <Text style={[styles.seeDetailText, { color: '#6366F1' }]}>
                Voir le journal sommeil
              </Text>
              <ChevronRight size={13} color={'#6366F1'} strokeWidth={2.5} />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={(e) => { e.stopPropagation?.(); router.push('/sleep-input' as any); }}
            activeOpacity={0.7}
          >
            <Plus size={18} color={colors.textOnAccent} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Decomposition des phases de sommeil */}
      {(sleepPhasesData.avgDeep > 0 || sleepPhasesData.avgRem > 0 || sleepPhasesData.avgCore > 0) && (() => {
        const { avgDeep, avgRem, avgCore, avgAwake } = sleepPhasesData;
        const totalPhases = avgDeep + avgRem + avgCore + avgAwake;
        if (totalPhases === 0) return null;
        const phases = [
          { label: 'Profond', value: avgDeep, color: '#312E81', pct: (avgDeep / totalPhases * 100) },
          { label: 'REM', value: avgRem, color: '#6366F1', pct: (avgRem / totalPhases * 100) },
          { label: 'Leger', value: avgCore, color: '#818CF8', pct: (avgCore / totalPhases * 100) },
          { label: 'Eveille', value: avgAwake, color: '#C7D2FE', pct: (avgAwake / totalPhases * 100) },
        ].filter(p => p.value > 0);

        return (
          <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Phases moyennes</Text>
            {/* Barre empilee */}
            <View style={styles.phasesBarContainer}>
              {phases.map((phase, i) => (
                <View
                  key={i}
                  style={[
                    styles.phasesBarSegment,
                    {
                      backgroundColor: phase.color,
                      width: `${phase.pct}%` as any,
                      borderTopLeftRadius: i === 0 ? 6 : 0,
                      borderBottomLeftRadius: i === 0 ? 6 : 0,
                      borderTopRightRadius: i === phases.length - 1 ? 6 : 0,
                      borderBottomRightRadius: i === phases.length - 1 ? 6 : 0,
                    },
                  ]}
                />
              ))}
            </View>
            {/* Legende */}
            <View style={styles.phasesLegend}>
              {phases.map((phase, i) => (
                <View key={i} style={styles.phasesLegendItem}>
                  <View style={[styles.phasesLegendDot, { backgroundColor: phase.color }]} />
                  <View>
                    <Text style={[styles.phasesLegendLabel, { color: colors.textSecondary }]}>{phase.label}</Text>
                    <Text style={[styles.phasesLegendValue, { color: colors.textPrimary }]}>
                      {formatMinutes(phase.value)} ({Math.round(phase.pct)}%)
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      })()}

      {/* Données pendant le sommeil */}
      {(sleepComparisonData.heartRate || sleepComparisonData.respiratoryRate || sleepComparisonData.wristTemperature) && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Pendant le sommeil</Text>
          <View style={styles.sleepMetricsRow}>
            {sleepComparisonData.heartRate && (
              <View style={styles.sleepMetricItem}>
                <Text style={[styles.sleepMetricValue, { color: '#EF4444' }]}>{Math.round(sleepComparisonData.heartRate.avg)}</Text>
                <Text style={[styles.sleepMetricUnit, { color: colors.textMuted }]}>bpm moy</Text>
                <Text style={[styles.sleepMetricRange, { color: colors.textMuted }]}>
                  {Math.round(sleepComparisonData.heartRate.min)}-{Math.round(sleepComparisonData.heartRate.max)}
                </Text>
              </View>
            )}
            {sleepComparisonData.respiratoryRate && (
              <View style={styles.sleepMetricItem}>
                <Text style={[styles.sleepMetricValue, { color: '#06B6D4' }]}>{Math.round(sleepComparisonData.respiratoryRate.avg)}</Text>
                <Text style={[styles.sleepMetricUnit, { color: colors.textMuted }]}>resp/min</Text>
                <Text style={[styles.sleepMetricRange, { color: colors.textMuted }]}>
                  {Math.round(sleepComparisonData.respiratoryRate.min)}-{Math.round(sleepComparisonData.respiratoryRate.max)}
                </Text>
              </View>
            )}
            {sleepComparisonData.wristTemperature && (
              <View style={styles.sleepMetricItem}>
                <Text style={[styles.sleepMetricValue, { color: '#F97316' }]}>{sleepComparisonData.wristTemperature.value.toFixed(1)}</Text>
                <Text style={[styles.sleepMetricUnit, { color: colors.textMuted }]}>temp. poignet</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Graphique historique */}
      {safeSleepChartHistory.length > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Historique</Text>
          <ScrollableLineChart
            data={safeSleepChartHistory}
            color="#6366F1"
            unit="h"
            height={160}
            onPress={() => onMetricPress?.({
              key: 'sleep',
              label: 'Sommeil',
              color: '#6366F1',
              unit: 'h',
              icon: <Moon size={18} color="#6366F1" strokeWidth={2.5} />,
            })}
          />
        </View>
      )}

      {/* Liste des nuits - virtualized */}
      {sortedNights.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Nuits ({sortedNights.length})
          </Text>
          <FlatList
            data={sortedNights}
            renderItem={renderNightRow}
            keyExtractor={nightKeyExtractor}
            scrollEnabled={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroValue: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  heroSubLabel: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 3,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
    marginTop: 4,
  },
  nightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nightRowFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  nightRowLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 12,
  },
  nightInfo: {
    flex: 1,
    marginRight: 12,
  },
  nightDate: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    textTransform: 'capitalize',
  },
  nightPhases: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 3,
  },
  nightRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nightDuration: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  phasesBarContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 14,
  },
  phasesBarSegment: {
    height: '100%',
  },
  phasesLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  phasesLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phasesLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  phasesLegendLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  phasesLegendValue: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sleepMetricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sleepMetricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  sleepMetricValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sleepMetricUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  sleepMetricRange: {
    fontSize: 10,
    fontWeight: '500',
  },
  seeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  seeDetailText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
