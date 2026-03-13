import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SamuraiCircleLoader } from '@/components/SamuraiLoader';
import { StatsSection } from '../../StatsSection';
import { StatsDetailModal } from '../../StatsDetailModal';
import { MultiLineComparisonCard } from '../../charts/MultiLineComparisonCard';
import { DualComparisonCard } from '../../charts/DualComparisonCard';
import { Footprints, Route, Timer, PersonStanding, Flame, Building2, Target, Droplets } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';

interface PasTabProps {
  steps: number;
  calories: number;
  distance: number;
  exerciseMinutes: number;
  standHours: number;
  floors?: number;
  weeklyExerciseMinutes?: number;
  todayHydration?: number;
  stepsHistory: { date: string; value: number }[];
  caloriesHistory: { date: string; value: number }[];
  distanceHistory: { date: string; value: number }[];
  exerciseMinutesHistory: { date: string; value: number }[];
  standHoursHistory: { date: string; value: number }[];
}

const STEPS_GOAL = 10000;
const WEEKLY_GOAL = 150;

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
  floors = 0,
  weeklyExerciseMinutes = 0,
  todayHydration = 0,
  stepsHistory,
  caloriesHistory,
  distanceHistory,
  exerciseMinutesHistory,
  standHoursHistory,
}) => {
  const { colors, isDark, screenBackground } = useTheme();

  const [showLoader, setShowLoader] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowLoader(false), 7000);
    return () => clearTimeout(t);
  }, []);

  const sectionBg = isDark ? colors.accent + '10' : colors.accent + '08';
  const cardBg = isDark ? '#242430' : '#FFFFFF';
  const cardBorder = isDark ? colors.accent + '30' : colors.border;

  const [selectedMetric, setSelectedMetric] = useState<{
    key: string; label: string; color: string; unit: string; icon: React.ReactNode;
  } | null>(null);

  const safeStepsHistory = useMemo(() => Array.isArray(stepsHistory) ? [...stepsHistory].sort((a, b) => a.date.localeCompare(b.date)) : [], [stepsHistory]);
  const safeCaloriesHistory = useMemo(() => Array.isArray(caloriesHistory) ? [...caloriesHistory].sort((a, b) => a.date.localeCompare(b.date)) : [], [caloriesHistory]);
  const safeDistanceHistory = useMemo(() => Array.isArray(distanceHistory) ? [...distanceHistory].sort((a, b) => a.date.localeCompare(b.date)) : [], [distanceHistory]);
  const safeExerciseHistory = useMemo(() => Array.isArray(exerciseMinutesHistory) ? [...exerciseMinutesHistory].sort((a, b) => a.date.localeCompare(b.date)) : [], [exerciseMinutesHistory]);
  const safeStandHistory = useMemo(() => Array.isArray(standHoursHistory) ? [...standHoursHistory].sort((a, b) => a.date.localeCompare(b.date)) : [], [standHoursHistory]);

  const hasData = steps > 0 || calories > 0 || distance > 0 || exerciseMinutes > 0 || standHours > 0 || floors > 0 || safeStepsHistory.length > 0;

  // Historique horizontal — pas (30 derniers jours, plus récent à gauche)
  const sortedHistory = useMemo(() =>
    [...safeStepsHistory]
      .filter(item => item?.date)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [safeStepsHistory]
  );

  const getModalData = useCallback(() => {
    if (!selectedMetric) return [];
    const formatDate = (d: string) => { try { return format(parseISO(d), 'd MMM', { locale: fr }); } catch { return d; } };
    switch (selectedMetric.key) {
      case 'steps': return safeStepsHistory.map(h => ({ value: h.value, label: formatDate(h.date), date: h.date }));
      case 'calories': return safeCaloriesHistory.map(h => ({ value: h.value, label: formatDate(h.date), date: h.date }));
      case 'distance': return safeDistanceHistory.map(h => ({ value: h.value, label: formatDate(h.date), date: h.date }));
      case 'exercise': return safeExerciseHistory.map(h => ({ value: h.value, label: formatDate(h.date), date: h.date }));
      case 'stand': return safeStandHistory.map(h => ({ value: h.value, label: formatDate(h.date), date: h.date }));
      default: return [];
    }
  }, [selectedMetric, safeStepsHistory, safeCaloriesHistory, safeDistanceHistory, safeExerciseHistory, safeStandHistory]);

  const stepsColor = getStepsColor(steps > 0 ? steps : 0);
  const stepsProgress = steps > 0 ? Math.min(1, steps / STEPS_GOAL) : 0;

  // Calculs SVG ring (inlinés, pas de composant interne)
  const ringR = 58, ringCx = 80, ringCy = 80, ringStroke = 14;
  const ringCircumference = 2 * Math.PI * ringR;
  const ringDashOffset = ringCircumference * (1 - stepsProgress);

  if (showLoader) return <SamuraiCircleLoader duration={7000} bgColor={screenBackground} />;

  if (!hasData) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
        <Footprints size={40} color={colors.textMuted} strokeWidth={1.5} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune donnée de pas disponible</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: sectionBg, borderRadius: 16, paddingTop: 8, paddingBottom: 8 }}>
      {/* ── Ring des pas (JSX inliné — pas de composant interne) */}
      <StatsSection>
        <TouchableOpacity
          style={[styles.ringCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
          activeOpacity={0.8}
          onPress={() => setSelectedMetric({ key: 'steps', label: 'Pas quotidiens', color: stepsColor, unit: 'pas', icon: <Footprints size={18} color={stepsColor} strokeWidth={2.5} /> })}
        >
          <View style={styles.ringRow}>
            {/* Ring SVG */}
            <View style={styles.ringContainer}>
              <Svg width={160} height={160} viewBox="0 0 160 160">
                {/* Track */}
                <SvgCircle
                  cx={ringCx} cy={ringCy} r={ringR}
                  stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}
                  strokeWidth={ringStroke}
                  fill="none"
                />
                {/* Progress — rotation via origin SVG transform */}
                <SvgCircle
                  cx={ringCx} cy={ringCy} r={ringR}
                  stroke={stepsColor}
                  strokeWidth={ringStroke}
                  fill="none"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringDashOffset}
                  strokeLinecap="round"
                  rotation={-90}
                  origin={`${ringCx},${ringCy}`}
                />
              </Svg>
              {/* Texte centré */}
              <View style={styles.ringCenter} pointerEvents="none">
                <Text style={[styles.ringValue, { color: stepsColor }]}>
                  {steps > 0 ? (steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : `${steps}`) : '--'}
                </Text>
                <Text style={[styles.ringUnit, { color: colors.textMuted }]}>pas</Text>
                <Text style={[styles.ringPct, { color: colors.textMuted }]}>
                  {Math.round(stepsProgress * 100)}%
                </Text>
              </View>
            </View>

            {/* Métriques à droite */}
            <View style={styles.ringMetrics}>
              <Text style={[styles.ringTitle, { color: colors.textPrimary }]}>Aujourd'hui</Text>
              {calories > 0 && (
                <View style={styles.ringMetricItem}>
                  <Flame size={15} color="#F97316" strokeWidth={2} />
                  <Text style={[styles.ringMetricValue, { color: '#F97316' }]}>{Math.round(calories).toLocaleString('fr-FR')}</Text>
                  <Text style={[styles.ringMetricUnit, { color: colors.textMuted }]}>kcal</Text>
                </View>
              )}
              {distance > 0 && (
                <View style={styles.ringMetricItem}>
                  <Route size={15} color="#3B82F6" strokeWidth={2} />
                  <Text style={[styles.ringMetricValue, { color: '#3B82F6' }]}>{distance.toFixed(2)}</Text>
                  <Text style={[styles.ringMetricUnit, { color: colors.textMuted }]}>km</Text>
                </View>
              )}
              {exerciseMinutes > 0 && (
                <View style={styles.ringMetricItem}>
                  <Timer size={15} color="#22C55E" strokeWidth={2} />
                  <Text style={[styles.ringMetricValue, { color: '#22C55E' }]}>{Math.round(exerciseMinutes)}</Text>
                  <Text style={[styles.ringMetricUnit, { color: colors.textMuted }]}>min</Text>
                </View>
              )}
              {standHours > 0 && (
                <View style={styles.ringMetricItem}>
                  <PersonStanding size={15} color="#06B6D4" strokeWidth={2} />
                  <Text style={[styles.ringMetricValue, { color: '#06B6D4' }]}>{Math.round(standHours)}</Text>
                  <Text style={[styles.ringMetricUnit, { color: colors.textMuted }]}>h debout</Text>
                </View>
              )}
              {floors > 0 && (
                <View style={styles.ringMetricItem}>
                  <Building2 size={15} color="#A78BFA" strokeWidth={2} />
                  <Text style={[styles.ringMetricValue, { color: '#A78BFA' }]}>{Math.round(floors)}</Text>
                  <Text style={[styles.ringMetricUnit, { color: colors.textMuted }]}>étages</Text>
                </View>
              )}
              {/* Objectif 10k */}
              <View style={[styles.goalChip, { backgroundColor: stepsColor + '18', borderColor: stepsColor + '40' }]}>
                <Target size={11} color={stepsColor} strokeWidth={2.5} />
                <Text style={[styles.goalChipText, { color: stepsColor }]}>
                  {steps >= STEPS_GOAL
                    ? `+${(steps - STEPS_GOAL).toLocaleString('fr-FR')} bonus`
                    : `${(STEPS_GOAL - steps).toLocaleString('fr-FR')} restants`}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </StatsSection>

      {/* ── Pas / Distance / Calories — MultiLine */}
      {(safeStepsHistory.length > 0 || safeCaloriesHistory.length > 0 || safeDistanceHistory.length > 0) && (
        <StatsSection>
          <MultiLineComparisonCard
            title="Activité quotidienne"
            unit=""
            lines={[
              ...(safeStepsHistory.length > 0 ? [{
                label: 'Pas',
                color: '#6366F1',
                history: safeStepsHistory,
                currentValue: steps,
                unit: 'pas',
                onPress: () => setSelectedMetric({ key: 'steps', label: 'Pas quotidiens', color: '#6366F1', unit: 'pas', icon: <Footprints size={18} color="#6366F1" strokeWidth={2.5} /> }),
              }] : []),
              ...(safeCaloriesHistory.length > 0 ? [{
                label: 'Calories',
                color: '#F97316',
                history: safeCaloriesHistory,
                currentValue: calories,
                unit: 'kcal',
                onPress: () => setSelectedMetric({ key: 'calories', label: 'Calories brûlées', color: '#F97316', unit: 'kcal', icon: <Flame size={18} color="#F97316" strokeWidth={2.5} /> }),
              }] : []),
              ...(safeDistanceHistory.length > 0 ? [{
                label: 'Distance',
                color: '#3B82F6',
                history: safeDistanceHistory,
                currentValue: distance,
                unit: 'km',
                onPress: () => setSelectedMetric({ key: 'distance', label: 'Distance parcourue', color: '#3B82F6', unit: 'km', icon: <Route size={18} color="#3B82F6" strokeWidth={2.5} /> }),
              }] : []),
            ]}
          />
        </StatsSection>
      )}

      {/* ── Exercise + Debout — DualComparison */}
      {(safeExerciseHistory.length > 0 || safeStandHistory.length > 0) && (
        <StatsSection>
          <DualComparisonCard
            title="Mouvement"
            leftLabel="Minutes exercice"
            rightLabel="Heures debout"
            leftColor="#22C55E"
            rightColor="#06B6D4"
            leftHistory={safeExerciseHistory}
            rightHistory={safeStandHistory}
            leftValue={exerciseMinutes}
            rightValue={standHours}
            unit=""
            leftUnit="min"
            rightUnit="h"
            onPressLeft={() => setSelectedMetric({ key: 'exercise', label: 'Minutes d\'exercice', color: '#22C55E', unit: 'min', icon: <Timer size={18} color="#22C55E" strokeWidth={2.5} /> })}
            onPressRight={() => setSelectedMetric({ key: 'stand', label: 'Heures debout', color: '#06B6D4', unit: 'h', icon: <PersonStanding size={18} color="#06B6D4" strokeWidth={2.5} /> })}
          />
        </StatsSection>
      )}

      {/* ── Objectif OMS */}
      {weeklyExerciseMinutes > 0 && (
        <StatsSection>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.cardHeader}>
              <Target size={18} color="#22C55E" strokeWidth={2} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Minutes intensives / semaine</Text>
            </View>
            <View style={styles.valueRow}>
              <Text style={[styles.bigValue, { color: weeklyExerciseMinutes >= WEEKLY_GOAL ? '#22C55E' : '#F97316' }]}>
                {Math.round(weeklyExerciseMinutes)}
              </Text>
              <Text style={[styles.bigUnit, { color: colors.textMuted }]}>/ {WEEKLY_GOAL} min</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (weeklyExerciseMinutes / WEEKLY_GOAL) * 100)}%`, backgroundColor: weeklyExerciseMinutes >= WEEKLY_GOAL ? '#22C55E' : '#F97316' }]} />
            </View>
            <Text style={[styles.progressNote, { color: colors.textMuted }]}>
              {weeklyExerciseMinutes >= WEEKLY_GOAL
                ? `Objectif OMS atteint (+${Math.round(weeklyExerciseMinutes - WEEKLY_GOAL)} min de bonus)`
                : `${Math.round(WEEKLY_GOAL - weeklyExerciseMinutes)} min pour atteindre l'objectif OMS`}
            </Text>
          </View>
        </StatsSection>
      )}

      {/* ── Hydratation */}
      {todayHydration > 0 && (
        <StatsSection>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.cardHeader}>
              <Droplets size={18} color="#3B82F6" strokeWidth={2} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Hydratation du jour</Text>
            </View>
            <View style={styles.valueRow}>
              <Text style={[styles.bigValue, { color: todayHydration >= 2000 ? '#22C55E' : '#3B82F6' }]}>
                {todayHydration >= 1000 ? `${(todayHydration / 1000).toFixed(1)}` : `${todayHydration}`}
              </Text>
              <Text style={[styles.bigUnit, { color: colors.textMuted }]}>{todayHydration >= 1000 ? '/ 2 L' : '/ 2000 ml'}</Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (todayHydration / 2000) * 100)}%`, backgroundColor: todayHydration >= 2000 ? '#22C55E' : '#3B82F6' }]} />
            </View>
            <Text style={[styles.progressNote, { color: colors.textMuted }]}>
              {todayHydration >= 2000
                ? `Objectif atteint (+${Math.round(todayHydration - 2000)} ml de bonus)`
                : `${Math.round(2000 - todayHydration)} ml pour atteindre l'objectif`}
            </Text>
          </View>
        </StatsSection>
      )}

      {/* ── Historique horizontal des jours (plus récent à gauche) */}
      {sortedHistory.length > 0 && (
        <StatsSection>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedMetric({ key: 'steps', label: 'Pas quotidiens', color: '#6366F1', unit: 'pas', icon: <Footprints size={18} color="#6366F1" strokeWidth={2.5} /> })}
            >
              <View style={styles.historyTitleRow}>
                <View style={[styles.historyTitleDash, { backgroundColor: '#6366F1' }]} />
                <Text style={[styles.historyTitleText, { color: colors.textMuted }]}>
                  HISTORIQUE ({sortedHistory.length} jours)
                </Text>
                <View style={[styles.historyTitleDash, { backgroundColor: '#6366F1' }]} />
              </View>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
              {sortedHistory.map((day, index) => {
                let formattedDate = day.date;
                try { formattedDate = format(parseISO(day.date), 'd MMM', { locale: fr }); } catch {}
                const isFirst = index === 0;
                const dayColor = getStepsColor(day.value);
                const barWidth = Math.min(100, Math.max(5, (day.value / 12000) * 100));
                return (
                  <View
                    key={day.date + index}
                    style={[styles.dayCard, { backgroundColor: cardBg, borderColor: isFirst ? '#6366F1' : cardBorder }, isFirst && styles.dayCardRecent]}
                  >
                    {isFirst && (
                      <View style={styles.dayCardBadge}>
                        <Text style={styles.dayCardBadgeText}>AUJ.</Text>
                      </View>
                    )}
                    <Text style={[styles.dayCardDate, { color: colors.textMuted }]}>{formattedDate}</Text>
                    <Text style={[styles.dayCardValue, { color: isFirst ? '#6366F1' : dayColor }]}>
                      {day.value >= 1000 ? `${(day.value / 1000).toFixed(1)}k` : `${day.value}`}
                    </Text>
                    <Text style={[styles.dayCardUnit, { color: colors.textMuted }]}>pas</Text>
                    <View style={[styles.miniBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                      <View style={[styles.miniBarFill, { width: `${barWidth}%`, backgroundColor: dayColor }]} />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </StatsSection>
      )}

      <View style={{ height: 40 }} />

      {selectedMetric && (
        <StatsDetailModal
          visible={selectedMetric !== null}
          onClose={() => setSelectedMetric(null)}
          title={selectedMetric.label}
          subtitle="Évolution complète"
          data={getModalData()}
          color={selectedMetric.color}
          unit={selectedMetric.unit}
          icon={selectedMetric.icon}
          metricKey={selectedMetric.key}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  ringCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenter: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringValue: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  ringUnit: { fontSize: 11, fontWeight: '600' },
  ringPct: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  ringTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3, marginBottom: 10 },
  ringMetrics: { flex: 1, gap: 8 },
  ringMetricItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ringMetricValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  ringMetricUnit: { fontSize: 12, fontWeight: '500' },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  goalChipText: { fontSize: 10, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  bigValue: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  bigUnit: { fontSize: 16, fontWeight: '500' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressNote: { fontSize: 13, fontWeight: '500' },
  historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  historyTitleDash: { flex: 1, height: 1.5, borderRadius: 1, opacity: 0.4 },
  historyTitleText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  historyScroll: { paddingHorizontal: 2, gap: 10 },
  dayCard: {
    width: 90,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    gap: 3,
  },
  dayCardRecent: { borderWidth: 2 },
  dayCardBadge: { backgroundColor: '#6366F120', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, marginBottom: 2 },
  dayCardBadgeText: { fontSize: 8, fontWeight: '700', color: '#6366F1', letterSpacing: 0.5 },
  dayCardDate: { fontSize: 10, fontWeight: '500' },
  dayCardValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  dayCardUnit: { fontSize: 10, fontWeight: '500' },
  miniBar: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  miniBarFill: { height: '100%', borderRadius: 2 },
  emptyCard: {
    borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  emptyText: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
});
