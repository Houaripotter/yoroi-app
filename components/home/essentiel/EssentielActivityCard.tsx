import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

// ============================================
// TYPES
// ============================================

interface WeekDay {
  date: string;       // 'YYYY-MM-DD'
  calories: number;
  exerciseMin: number;
  standH: number;
}

interface EssentielActivityCardProps {
  steps?: number;
  stepsGoal?: number;
  calories?: number;
  distance?: number;
  heartRate?: { resting: number; average: number; min: number; max: number } | null;
  spo2?: number;
  respiratoryRate?: number;
  vo2Max?: number;
  exerciseMinutes?: number | null;
  standHours?: number | null;
  moveGoal?: number;
  exerciseGoal?: number;
  standGoal?: number;
  weeklyData?: WeekDay[];
}

// ============================================
// BARRE DE PROGRESSION (simple, fiable)
// ============================================

const ProgressRing: React.FC<{
  value: number;    // 0-100
  color: string;
  bgColor: string;
  size: number;
}> = ({ value, color, bgColor, size }) => {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={{ width: '100%', height: size, backgroundColor: bgColor, borderRadius: size / 2, overflow: 'hidden' }}>
      <View style={{
        height: size,
        width: `${pct}%`,
        backgroundColor: color,
        borderRadius: size / 2,
      }} />
    </View>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const EssentielActivityCard: React.FC<EssentielActivityCardProps> = ({
  steps,
  stepsGoal,
  calories,
  distance,
  heartRate,
  spo2,
  respiratoryRate,
  vo2Max,
  exerciseMinutes,
  standHours,
  moveGoal = 500,
  exerciseGoal = 30,
  standGoal = 12,
  weeklyData = [],
}) => {
  const { colors, isDark } = useTheme();

  // Valeurs anneaux
  const moveVal = Math.round(calories ?? 0);
  const exerciseVal = Math.round(exerciseMinutes ?? 0);
  const standVal = Math.round(standHours ?? 0);

  const movePct = moveGoal > 0 ? Math.min(100, (moveVal / moveGoal) * 100) : 0;
  const exercisePct = exerciseGoal > 0 ? Math.min(100, (exerciseVal / exerciseGoal) * 100) : 0;
  const standPct = standGoal > 0 ? Math.min(100, (standVal / standGoal) * 100) : 0;

  // Max hebdo pour normaliser les barres
  const maxCalWeek = Math.max(...weeklyData.map(d => d.calories), moveGoal, 1);
  const maxExWeek = Math.max(...weeklyData.map(d => d.exerciseMin), exerciseGoal, 1);
  const maxStWeek = Math.max(...weeklyData.map(d => d.standH), standGoal, 1);

  // Métriques secondaires
  const hasSteps = steps != null && steps > 0;
  const hasDistance = distance != null && distance > 0;
  const hasHR = heartRate?.resting != null && heartRate.resting > 0;
  const hasSpo2 = spo2 != null && spo2 > 0;
  const hasVo2 = vo2Max != null && vo2Max > 0;
  const hasResp = respiratoryRate != null && respiratoryRate > 0;
  const hasSecondaryMetrics = hasSteps || hasDistance || hasHR || hasSpo2 || hasVo2 || hasResp;

  const hasWeekly = weeklyData.length === 7;
  const stepsPercentage = stepsGoal && steps != null ? Math.min((steps / stepsGoal) * 100, 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="heart-pulse" size={16} color="#F97316" />
        <Text style={styles.title}>SANTÉ & ACTIVITÉ</Text>
      </View>

      {/* ========== 3 ANNEAUX APPLE ========== */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/activity-detail' as any); }}
      >
        {/* Bouger */}
        <View style={styles.ringRow}>
          <View style={[styles.ringIconBg, { backgroundColor: '#FF375F20' }]}>
            <MaterialCommunityIcons name="fire" size={16} color="#FF375F" />
          </View>
          <View style={styles.ringLabelCol}>
            <Text style={[styles.ringLabel, { color: colors.textPrimary }]}>Bouger</Text>
            <Text style={[styles.ringSubLabel, { color: colors.textMuted }]}>
              {moveVal > 0 ? `${moveVal} / ${moveGoal} kcal` : `Objectif : ${moveGoal} kcal`}
            </Text>
          </View>
          <View style={styles.ringBarCol}>
            <ProgressRing value={movePct} color="#FF375F" bgColor={isDark ? '#FF375F25' : '#FF375F15'} size={10} />
            <Text style={[styles.ringPct, { color: '#FF375F' }]}>{Math.round(movePct)}%</Text>
          </View>
        </View>

        {/* M'entraîner */}
        <View style={[styles.ringRow, styles.ringRowMid]}>
          <View style={[styles.ringIconBg, { backgroundColor: '#34C75920' }]}>
            <MaterialCommunityIcons name="run" size={16} color="#34C759" />
          </View>
          <View style={styles.ringLabelCol}>
            <Text style={[styles.ringLabel, { color: colors.textPrimary }]}>M'entrainer</Text>
            <Text style={[styles.ringSubLabel, { color: colors.textMuted }]}>
              {exerciseVal > 0 ? `${exerciseVal} / ${exerciseGoal} min` : `Objectif : ${exerciseGoal} min`}
            </Text>
          </View>
          <View style={styles.ringBarCol}>
            <ProgressRing value={exercisePct} color="#34C759" bgColor={isDark ? '#34C75925' : '#34C75915'} size={10} />
            <Text style={[styles.ringPct, { color: '#34C759' }]}>{Math.round(exercisePct)}%</Text>
          </View>
        </View>

        {/* Se lever */}
        <View style={styles.ringRow}>
          <View style={[styles.ringIconBg, { backgroundColor: '#30D5C820' }]}>
            <MaterialCommunityIcons name="human" size={16} color="#30D5C8" />
          </View>
          <View style={styles.ringLabelCol}>
            <Text style={[styles.ringLabel, { color: colors.textPrimary }]}>Se lever</Text>
            <Text style={[styles.ringSubLabel, { color: colors.textMuted }]}>
              {standVal > 0 ? `${standVal} / ${standGoal} h` : `Objectif : ${standGoal} h`}
            </Text>
          </View>
          <View style={styles.ringBarCol}>
            <ProgressRing value={standPct} color="#30D5C8" bgColor={isDark ? '#30D5C825' : '#30D5C815'} size={10} />
            <Text style={[styles.ringPct, { color: '#30D5C8' }]}>{Math.round(standPct)}%</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ========== TABLEAU 7 JOURS ========== */}
      {hasWeekly && (
        <View style={[styles.weekSection, { borderTopColor: colors.border }]}>
          <Text style={[styles.weekTitle, { color: colors.textMuted }]}>7 DERNIERS JOURS</Text>
          <View style={styles.weekGrid}>
            {weeklyData.map((day, i) => {
              const calH = maxCalWeek > 0 ? (day.calories / maxCalWeek) * 52 : 0;
              const exH = maxExWeek > 0 ? (day.exerciseMin / maxExWeek) * 52 : 0;
              const stH = maxStWeek > 0 ? (day.standH / maxStWeek) * 52 : 0;
              const isToday = i === 6;
              const dow = new Date(day.date).getDay(); // 0=dim, 1=lun...
              const label = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][dow] || '?';
              return (
                <View key={day.date} style={styles.weekCol}>
                  {/* Barres empilées */}
                  <View style={styles.weekBars}>
                    {calH > 0 && (
                      <View style={[styles.weekBar, { height: Math.max(calH, 3), backgroundColor: '#FF375F', opacity: isToday ? 1 : 0.5 }]} />
                    )}
                    {exH > 0 && (
                      <View style={[styles.weekBar, { height: Math.max(exH, 3), backgroundColor: '#34C759', opacity: isToday ? 1 : 0.5 }]} />
                    )}
                    {stH > 0 && (
                      <View style={[styles.weekBar, { height: Math.max(stH, 3), backgroundColor: '#30D5C8', opacity: isToday ? 1 : 0.5 }]} />
                    )}
                    {calH === 0 && exH === 0 && stH === 0 && (
                      <View style={[styles.weekBar, { height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />
                    )}
                  </View>
                  <Text style={[styles.weekDay, { color: isToday ? colors.accent : colors.textMuted, fontWeight: isToday ? '800' : '500' }]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Légende */}
          <View style={styles.weekLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF375F' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Bouger</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Entrainer</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#30D5C8' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Se lever</Text>
            </View>
          </View>
        </View>
      )}

      {/* ========== MÉTRIQUES SECONDAIRES ========== */}
      {hasSecondaryMetrics && (
        <View style={[styles.secondarySection, { borderTopColor: colors.border }]}>
          <View style={styles.metricsGrid}>
            {hasSteps && (
              <TouchableOpacity
                style={styles.metricItem}
                onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/activity-history?tab=steps' as any); }}
              >
                <View style={[styles.metricIcon, { backgroundColor: '#DBEAFE' }]}>
                  <MaterialCommunityIcons name="walk" size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{(steps ?? 0).toLocaleString()}</Text>
                <Text style={[styles.metricUnit, { color: colors.textMuted }]}>pas</Text>
              </TouchableOpacity>
            )}
            {hasDistance && (
              <View style={styles.metricItem}>
                <View style={[styles.metricIcon, { backgroundColor: '#D1FAE5' }]}>
                  <MaterialCommunityIcons name="map-marker-distance" size={18} color="#10B981" />
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{(distance ?? 0).toFixed(2)}</Text>
                <Text style={[styles.metricUnit, { color: colors.textMuted }]}>km</Text>
              </View>
            )}
            {hasHR && (
              <View style={styles.metricItem}>
                <View style={[styles.metricIcon, { backgroundColor: '#FEE2E2' }]}>
                  <MaterialCommunityIcons name="heart-pulse" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{Math.round(heartRate!.resting)}</Text>
                <Text style={[styles.metricUnit, { color: colors.textMuted }]}>bpm repos</Text>
              </View>
            )}
            {hasSpo2 && (
              <View style={styles.metricItem}>
                <View style={[styles.metricIcon, { backgroundColor: '#E0F2FE' }]}>
                  <MaterialCommunityIcons name="water" size={18} color="#0EA5E9" />
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{Math.round(spo2!)}</Text>
                <Text style={[styles.metricUnit, { color: colors.textMuted }]}>% SpO2</Text>
              </View>
            )}
            {hasVo2 && (
              <View style={styles.metricItem}>
                <View style={[styles.metricIcon, { backgroundColor: '#EDE9FE' }]}>
                  <MaterialCommunityIcons name="lightning-bolt" size={18} color="#8B5CF6" />
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{(vo2Max ?? 0).toFixed(1)}</Text>
                <Text style={[styles.metricUnit, { color: colors.textMuted }]}>VO2max</Text>
              </View>
            )}
            {hasResp && (
              <View style={styles.metricItem}>
                <View style={[styles.metricIcon, { backgroundColor: '#CCFBF1' }]}>
                  <MaterialCommunityIcons name="lungs" size={18} color="#14B8A6" />
                </View>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{Math.round(respiratoryRate!)}</Text>
                <Text style={[styles.metricUnit, { color: colors.textMuted }]}>resp/min</Text>
              </View>
            )}
          </View>

          {/* Barre de progression des pas */}
          {stepsPercentage > 0 && (
            <View style={[styles.stepsProgress, { borderTopColor: colors.border }]}>
              <View style={[styles.stepsBar, { backgroundColor: colors.border }]}>
                <View style={[styles.stepsFill, { width: `${stepsPercentage}%` }]} />
              </View>
              <Text style={[styles.stepsText, { color: colors.textMuted }]}>
                {Math.round(stepsPercentage)}% objectif pas
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
    letterSpacing: 1,
  },

  // Lignes anneaux Apple
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  ringRowMid: {
    marginBottom: 14,
  },
  ringIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabelCol: {
    flex: 1,
    gap: 1,
  },
  ringLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  ringSubLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  ringBarCol: {
    width: 80,
    gap: 4,
    alignItems: 'flex-end',
  },
  ringPct: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Tableau 7 jours
  weekSection: {
    paddingTop: 14,
    marginTop: 2,
    borderTopWidth: 1,
  },
  weekTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  weekGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 64,
  },
  weekCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    justifyContent: 'center',
  },
  weekBar: {
    width: 5,
    borderRadius: 3,
    minHeight: 4,
  },
  weekDay: {
    fontSize: 10,
  },
  weekLegend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Métriques secondaires
  secondarySection: {
    paddingTop: 14,
    marginTop: 2,
    borderTopWidth: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  metricItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Barre pas
  stepsProgress: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  stepsBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stepsFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  stepsText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
});
