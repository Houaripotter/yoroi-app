import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScrollableLineChart } from '../../charts/ScrollableLineChart';
import { Footprints, Route, Timer, PersonStanding, Flame } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PasTabProps {
  steps: number;
  calories: number;
  distance: number;
  exerciseMinutes: number;
  standHours: number;
  stepsHistory: { date: string; value: number }[];
  caloriesHistory: { date: string; value: number }[];
  distanceHistory: { date: string; value: number }[];
  exerciseMinutesHistory: { date: string; value: number }[];
  standHoursHistory: { date: string; value: number }[];
}

const getStepsColor = (value: number): string => {
  if (value >= 10000) return '#22C55E';
  if (value >= 7000) return '#06B6D4';
  if (value >= 4000) return '#F59E0B';
  return '#EF4444';
};

export const PasTab: React.FC<PasTabProps> = React.memo(({
  steps,
  calories,
  distance,
  exerciseMinutes,
  standHours,
  stepsHistory,
  caloriesHistory,
  distanceHistory,
  exerciseMinutesHistory,
  standHoursHistory,
}) => {
  const { colors, isDark } = useTheme();

  // Defensive: garantir que les historiques sont des arrays
  const safeStepsHistory = Array.isArray(stepsHistory) ? stepsHistory : [];
  const safeCaloriesHistory = Array.isArray(caloriesHistory) ? caloriesHistory : [];
  const safeDistanceHistory = Array.isArray(distanceHistory) ? distanceHistory : [];
  const safeExerciseHistory = Array.isArray(exerciseMinutesHistory) ? exerciseMinutesHistory : [];
  const safeStandHistory = Array.isArray(standHoursHistory) ? standHoursHistory : [];

  const hasData = steps > 0 || calories > 0 || distance > 0 || exerciseMinutes > 0 || standHours > 0 || safeStepsHistory.length > 0;

  // Memoize sorted + limited history (max 50 entries for display)
  const sortedHistory = useMemo(
    () => [...safeStepsHistory]
      .filter(item => item?.date)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 50),
    [safeStepsHistory]
  );

  const renderDayRow = useCallback(({ item: day, index }: { item: { date: string; value: number }; index: number }) => {
    let formattedDate = day.date;
    try {
      const d = parseISO(day.date);
      formattedDate = format(d, 'EEE d MMM', { locale: fr });
    } catch {}

    const stepsColor = getStepsColor(day.value);
    const isLast = index === sortedHistory.length - 1;
    const barWidth = Math.min(100, Math.max(5, (day.value / 12000) * 100));

    return (
      <View
        style={[
          styles.dayRow,
          {
            backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
            borderBottomColor: isLast ? 'transparent' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
          },
          index === 0 && styles.dayRowFirst,
          isLast && styles.dayRowLast,
        ]}
      >
        <View style={styles.dayInfo}>
          <Text style={[styles.dayDate, { color: colors.textPrimary }]}>
            {formattedDate}
          </Text>
          <View style={[styles.miniBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <View style={[styles.miniBarFill, { width: `${barWidth}%`, backgroundColor: stepsColor }]} />
          </View>
        </View>
        <Text style={[styles.daySteps, { color: stepsColor }]}>
          {day.value.toLocaleString('fr-FR')} pas
        </Text>
      </View>
    );
  }, [sortedHistory.length, isDark, colors]);

  const keyExtractor = useCallback((item: { date: string }, index: number) => item.date + index, []);

  if (!hasData) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
        <Footprints size={40} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Aucune donnee de pas disponible
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Hero - Grand compteur */}
      <View style={[styles.heroCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
        <Text style={[styles.heroValue, { color: '#6366F1' }]}>
          {steps > 0 ? steps.toLocaleString('fr-FR') : '--'}
        </Text>
        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
          pas aujourd'hui
        </Text>

        {/* Metriques du jour */}
        <View style={[styles.metricsGrid, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          {calories > 0 && (
            <View style={styles.metricItem}>
              <Flame size={18} color="#F97316" strokeWidth={2} />
              <Text style={[styles.metricValue, { color: '#F97316' }]}>
                {Math.round(calories).toLocaleString('fr-FR')}
              </Text>
              <Text style={[styles.metricUnit, { color: colors.textMuted }]}>kcal</Text>
            </View>
          )}
          {distance > 0 && (
            <View style={styles.metricItem}>
              <Route size={18} color="#3B82F6" strokeWidth={2} />
              <Text style={[styles.metricValue, { color: '#3B82F6' }]}>
                {distance.toFixed(2)}
              </Text>
              <Text style={[styles.metricUnit, { color: colors.textMuted }]}>km</Text>
            </View>
          )}
          {exerciseMinutes > 0 && (
            <View style={styles.metricItem}>
              <Timer size={18} color="#22C55E" strokeWidth={2} />
              <Text style={[styles.metricValue, { color: '#22C55E' }]}>
                {Math.round(exerciseMinutes)}
              </Text>
              <Text style={[styles.metricUnit, { color: colors.textMuted }]}>min</Text>
            </View>
          )}
          {standHours > 0 && (
            <View style={styles.metricItem}>
              <PersonStanding size={18} color="#06B6D4" strokeWidth={2} />
              <Text style={[styles.metricValue, { color: '#06B6D4' }]}>
                {Math.round(standHours)}
              </Text>
              <Text style={[styles.metricUnit, { color: colors.textMuted }]}>h debout</Text>
            </View>
          )}
        </View>
      </View>

      {/* Graphique pas */}
      {safeStepsHistory.length > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Historique des pas</Text>
          <ScrollableLineChart
            data={safeStepsHistory}
            color="#6366F1"
            unit="pas"
            height={160}
          />
        </View>
      )}

      {/* Graphique calories */}
      {safeCaloriesHistory.length > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Historique des calories</Text>
          <ScrollableLineChart
            data={safeCaloriesHistory}
            color="#F97316"
            unit="kcal"
            height={160}
          />
        </View>
      )}

      {/* Graphique distance */}
      {safeDistanceHistory.length > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Historique de la distance</Text>
          <ScrollableLineChart
            data={safeDistanceHistory}
            color="#3B82F6"
            unit="km"
            height={160}
          />
        </View>
      )}

      {/* Graphique minutes d'exercice */}
      {safeExerciseHistory.length > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Historique des minutes d'exercice</Text>
          <ScrollableLineChart
            data={safeExerciseHistory}
            color="#22C55E"
            unit="min"
            height={160}
          />
        </View>
      )}

      {/* Graphique heures debout */}
      {safeStandHistory.length > 0 && (
        <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Historique des heures debout</Text>
          <ScrollableLineChart
            data={safeStandHistory}
            color="#06B6D4"
            unit="h"
            height={160}
          />
        </View>
      )}

      {/* Liste des jours de pas - virtualized */}
      {sortedHistory.length > 0 && (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Historique ({sortedHistory.length} jours)
          </Text>
          <FlatList
            data={sortedHistory}
            renderItem={renderDayRow}
            keyExtractor={keyExtractor}
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  metricItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayRowFirst: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  dayRowLast: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomWidth: 0,
  },
  dayInfo: {
    flex: 1,
    marginRight: 12,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  miniBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  daySteps: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});
