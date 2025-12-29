import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingUp, AlertTriangle, Activity } from 'lucide-react-native';
import { getTrainings } from '@/lib/database';
import { getSleepStats } from '@/lib/sleepService';
import { getTrainingLoads, getWeeklyLoadStats } from '@/lib/trainingLoadService';
import Svg, { Rect, Line, G, Text as SvgText, Path } from 'react-native-svg';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { scale, isIPad } from '@/constants/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_PADDING = isIPad() ? scale(8) : 16; // iPhone garde 16, iPad s'adapte

interface WeekData {
  week: string;
  trainingHours: number;
  sleepHours: number;
  load: number;
}

export default function PerformanceTab() {
  const { colors } = useTheme();
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [currentLoad, setCurrentLoad] = useState(0);
  const [averageLoad, setAverageLoad] = useState(0);
  const [riskLevel, setRiskLevel] = useState<'safe' | 'moderate' | 'high' | 'danger'>('safe');
  const [rpeBreakdown, setRpeBreakdown] = useState({ light: 0, moderate: 0, intense: 0 });
  const [alert, setAlert] = useState<string | null>(null);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      // Get last 8 weeks of data
      const weeks: WeekData[] = [];
      const today = new Date();

      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });

        // Get trainings for this week
        const allTrainings = await getTrainings();
        const weekTrainings = allTrainings.filter(t => {
          const trainingDate = new Date(t.date);
          return trainingDate >= weekStart && trainingDate <= weekEnd;
        });

        // Calculate training hours
        const trainingMinutes = weekTrainings.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
        const trainingHours = trainingMinutes / 60;

        // Get sleep data (estimate based on goal - in real app would get actual sleep data)
        // For now, use 7 * 7.5 hours = 52.5 hours per week as baseline
        const sleepHours = 52.5; // TODO: Get actual sleep data per week

        // Get load for this week
        const loads = await getTrainingLoads();
        const weekLoads = loads.filter(l => {
          const loadDate = new Date(l.date);
          return loadDate >= weekStart && loadDate <= weekEnd;
        });
        const weekLoad = weekLoads.reduce((sum, l) => sum + l.load, 0);

        weeks.push({
          week: format(weekStart, 'dd MMM', { locale: fr }),
          trainingHours,
          sleepHours,
          load: weekLoad,
        });
      }

      setWeeklyData(weeks);

      // Current week stats
      const stats = await getWeeklyLoadStats();
      const currentWeekLoad = stats.totalLoad;
      setCurrentLoad(currentWeekLoad);
      setRiskLevel(stats.riskLevel);

      // Calculate 4-week average load
      const last4Weeks = weeks.slice(-5, -1); // Get weeks 2-5 from the end (excluding current week)
      const avg4Weeks = last4Weeks.length > 0
        ? last4Weeks.reduce((sum, w) => sum + w.load, 0) / last4Weeks.length
        : currentWeekLoad;
      setAverageLoad(avg4Weeks);

      // Check for alerts
      if (currentWeekLoad > avg4Weeks * 1.5) {
        setAlert('⚠️ Charge élevée : +50% vs moyenne 4 semaines. Risque de blessure.');
      } else if (weeks[weeks.length - 1].trainingHours > 12 && weeks[weeks.length - 1].sleepHours < 50) {
        setAlert('⚠️ Volume élevé avec sommeil insuffisant. Priorise la récupération.');
      }

      // RPE Breakdown
      const allLoads = await getTrainingLoads();
      const last30Days = allLoads.filter(l => {
        const daysDiff = (today.getTime() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30;
      });

      const light = last30Days.filter(l => l.rpe >= 1 && l.rpe <= 4).length;
      const moderate = last30Days.filter(l => l.rpe >= 5 && l.rpe <= 7).length;
      const intense = last30Days.filter(l => l.rpe >= 8 && l.rpe <= 10).length;
      const total = light + moderate + intense || 1;

      setRpeBreakdown({
        light: Math.round((light / total) * 100),
        moderate: Math.round((moderate / total) * 100),
        intense: Math.round((intense / total) * 100),
      });
    } catch (error) {
      console.error('Erreur chargement performance:', error);
    }
  };

  const chartWidth = SCREEN_WIDTH - CONTAINER_PADDING * 2; // Utilise toute la largeur disponible
  const chartHeight = 180;
  const padding = { left: 40, right: 15, top: 20, bottom: 35 };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'safe': return '#10B981';
      case 'moderate': return '#F59E0B';
      case 'high': return '#F97316';
      case 'danger': return '#EF4444';
      default: return colors.textMuted;
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'safe': return 'Zone sûre';
      case 'moderate': return 'Modéré';
      case 'high': return 'Élevé';
      case 'danger': return 'Critique';
      default: return '';
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* WORK/REST RATIO */}
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <Activity size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Work/Rest Ratio</Text>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Entraînement vs Sommeil (8 semaines)
        </Text>

        {weeklyData.length > 0 && (
          <View style={styles.chartContainer}>
            <Svg width={chartWidth} height={chartHeight}>
              {/* Grid lines */}
              {[0, 25, 50, 75].map((value, idx) => (
                <G key={idx}>
                  <Line
                    x1={padding.left}
                    y1={padding.top + ((75 - value) / 75) * (chartHeight - padding.top - padding.bottom)}
                    x2={chartWidth - padding.right}
                    y2={padding.top + ((75 - value) / 75) * (chartHeight - padding.top - padding.bottom)}
                    stroke={colors.border}
                    strokeDasharray="4,4"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={padding.left - 5}
                    y={padding.top + ((75 - value) / 75) * (chartHeight - padding.top - padding.bottom) + 4}
                    fontSize={10}
                    fill={colors.textMuted}
                    textAnchor="end"
                  >
                    {value}h
                  </SvgText>
                </G>
              ))}

              {/* Training bars */}
              {weeklyData.map((week, i) => {
                const barWidth = (chartWidth - padding.left - padding.right) / (weeklyData.length * 2) - 4;
                const x = padding.left + i * ((chartWidth - padding.left - padding.right) / weeklyData.length);
                const trainingHeight = (week.trainingHours / 75) * (chartHeight - padding.top - padding.bottom);
                const sleepHeight = (week.sleepHours / 75) * (chartHeight - padding.top - padding.bottom);

                return (
                  <G key={i}>
                    {/* Training bar */}
                    <Rect
                      x={x}
                      y={chartHeight - padding.bottom - trainingHeight}
                      width={barWidth}
                      height={trainingHeight}
                      fill={colors.accent}
                      rx={2}
                    />

                    {/* Sleep bar */}
                    <Rect
                      x={x + barWidth + 4}
                      y={chartHeight - padding.bottom - sleepHeight}
                      width={barWidth}
                      height={sleepHeight}
                      fill="#8B5CF6"
                      rx={2}
                    />

                    {/* Week label */}
                    <SvgText
                      x={x + barWidth + 2}
                      y={chartHeight - 8}
                      fontSize={9}
                      fill={colors.textMuted}
                      textAnchor="middle"
                    >
                      {week.week.split(' ')[0]}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Entraînement (h)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Sommeil (h)</Text>
          </View>
        </View>

        {/* Alert */}
        {alert && (
          <View style={[styles.alert, { backgroundColor: '#FEF3C7' }]}>
            <AlertTriangle size={16} color="#F59E0B" />
            <Text style={styles.alertText}>{alert}</Text>
          </View>
        )}
      </View>

      {/* CUMULATIVE LOAD */}
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <TrendingUp size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Charge Cumulative</Text>
        </View>

        <View style={styles.loadSummary}>
          <View style={styles.loadItem}>
            <Text style={[styles.loadLabel, { color: colors.textSecondary }]}>Cette semaine</Text>
            <Text style={[styles.loadValue, { color: getRiskColor(riskLevel) }]}>
              {currentLoad} pts
            </Text>
          </View>
          <View style={styles.loadItem}>
            <Text style={[styles.loadLabel, { color: colors.textSecondary }]}>Moyenne 4 sem</Text>
            <Text style={[styles.loadValue, { color: colors.textPrimary }]}>
              {Math.round(averageLoad)} pts
            </Text>
          </View>
          <View style={styles.loadItem}>
            <Text style={[styles.loadLabel, { color: colors.textSecondary }]}>Variation</Text>
            <Text style={[styles.loadValue, { color: currentLoad > averageLoad ? '#F97316' : '#10B981' }]}>
              {currentLoad > averageLoad ? '+' : ''}
              {Math.round(((currentLoad - averageLoad) / (averageLoad || 1)) * 100)}%
            </Text>
          </View>
        </View>

        {/* Risk indicator */}
        <View style={[styles.riskBadge, { backgroundColor: `${getRiskColor(riskLevel)}20` }]}>
          <Text style={[styles.riskText, { color: getRiskColor(riskLevel) }]}>
            {getRiskLabel(riskLevel)}
          </Text>
        </View>

        {/* Thresholds */}
        <View style={styles.thresholds}>
          <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>Seuils recommandés :</Text>
          <View style={styles.thresholdList}>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.thresholdText, { color: colors.textSecondary }]}>{'< 1500 pts : Optimal'}</Text>
            </View>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.thresholdText, { color: colors.textSecondary }]}>{'1500-2000 : Modéré'}</Text>
            </View>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: '#F97316' }]} />
              <Text style={[styles.thresholdText, { color: colors.textSecondary }]}>{'2000-2500 : Élevé'}</Text>
            </View>
            <View style={styles.thresholdItem}>
              <View style={[styles.thresholdDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.thresholdText, { color: colors.textSecondary }]}>{'> 2500 : Critique'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* RPE BREAKDOWN */}
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <Activity size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Répartition par Intensité</Text>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          30 derniers jours
        </Text>

        {/* RPE bars */}
        <View style={styles.rpeContainer}>
          <View style={styles.rpeRow}>
            <Text style={[styles.rpeLabel, { color: colors.textSecondary }]}>Légère (RPE 1-4)</Text>
            <View style={[styles.rpeBar, { backgroundColor: colors.background }]}>
              <View
                style={[
                  styles.rpeBarFill,
                  { backgroundColor: '#10B981', width: `${rpeBreakdown.light}%` },
                ]}
              />
            </View>
            <Text style={[styles.rpePercent, { color: colors.textPrimary }]}>{rpeBreakdown.light}%</Text>
          </View>

          <View style={styles.rpeRow}>
            <Text style={[styles.rpeLabel, { color: colors.textSecondary }]}>Modérée (RPE 5-7)</Text>
            <View style={[styles.rpeBar, { backgroundColor: colors.background }]}>
              <View
                style={[
                  styles.rpeBarFill,
                  { backgroundColor: '#F59E0B', width: `${rpeBreakdown.moderate}%` },
                ]}
              />
            </View>
            <Text style={[styles.rpePercent, { color: colors.textPrimary }]}>{rpeBreakdown.moderate}%</Text>
          </View>

          <View style={styles.rpeRow}>
            <Text style={[styles.rpeLabel, { color: colors.textSecondary }]}>Intense (RPE 8-10)</Text>
            <View style={[styles.rpeBar, { backgroundColor: colors.background }]}>
              <View
                style={[
                  styles.rpeBarFill,
                  { backgroundColor: '#EF4444', width: `${rpeBreakdown.intense}%` },
                ]}
              />
            </View>
            <Text style={[styles.rpePercent, { color: colors.textPrimary }]}>{rpeBreakdown.intense}%</Text>
          </View>
        </View>

        {/* Recommendation */}
        <View style={[styles.recommendation, { backgroundColor: colors.background }]}>
          <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
            💡 Optimal : 70-80% modéré, 10-20% intense, 10% léger
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  loadSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  loadItem: {
    alignItems: 'center',
  },
  loadLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  loadValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  riskBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 16,
  },
  riskText: {
    fontSize: 14,
    fontWeight: '700',
  },
  thresholds: {
    marginTop: 8,
  },
  thresholdLabel: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  thresholdList: {
    gap: 6,
  },
  thresholdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thresholdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thresholdText: {
    fontSize: 12,
  },
  rpeContainer: {
    gap: 16,
    marginBottom: 16,
  },
  rpeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rpeLabel: {
    fontSize: 13,
    width: 120,
  },
  rpeBar: {
    flex: 1,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rpeBarFill: {
    height: '100%',
    borderRadius: 12,
  },
  rpePercent: {
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  recommendation: {
    padding: 12,
    borderRadius: 12,
  },
  recommendationText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
