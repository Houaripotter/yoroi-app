import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Activity, Zap, Moon, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Flame } from 'lucide-react-native';
import { getTrainings, Training } from '@/lib/database';
import { getSleepStats } from '@/lib/sleepService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PerformanceStatsProps {
  trainings?: Training[];
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({ trainings: propTrainings }) => {
  const { colors } = useTheme();
  const [trainings, setTrainings] = useState<Training[]>(propTrainings || []);
  const [sleepHours, setSleepHours] = useState<number[]>([7, 6.5, 8, 7, 6, 7.5, 8]);
  const [selectedDay, setSelectedDay] = useState<{
    index: number;
    day: string;
    trainingLoad: number;
    sleepHours: number;
  } | null>(null);

  useEffect(() => {
    if (!propTrainings) {
      loadData();
    }
    loadSleepData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getTrainings();
      setTrainings(data);
    } catch (error) {
      console.error('Error loading trainings:', error);
    }
  };

  const loadSleepData = async () => {
    try {
      const stats = await getSleepStats();
      // Simuler les données de sommeil sur 7 jours
      if (stats?.weeklyHours) {
        setSleepHours(stats.weeklyHours);
      }
    } catch (error) {
      console.error('Error loading sleep data:', error);
    }
  };

  // Calculer la charge d'entraînement (RPE × Durée)
  const weeklyTrainingData = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyData = Array(7).fill(0);
    
    trainings.forEach(t => {
      const date = new Date(t.date);
      if (date >= weekAgo) {
        const dayIndex = 6 - Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex >= 0 && dayIndex < 7) {
          const rpe = t.intensity || 5;
          const duration = t.duration || 60;
          weeklyData[dayIndex] += (rpe * duration) / 60; // Charge en heures pondérées
        }
      }
    });
    
    return weeklyData;
  }, [trainings]);

  // Charge totale de la semaine
  const totalCharge = useMemo(() => {
    return trainings
      .filter(t => {
        const date = new Date(t.date);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      })
      .reduce((sum, t) => sum + ((t.intensity || 5) * (t.duration || 60)), 0);
  }, [trainings]);

  // Moyenne sur 4 semaines
  const averageCharge = useMemo(() => {
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const lastFourWeeksTrainings = trainings.filter(t => new Date(t.date) >= fourWeeksAgo);
    const totalCharge4W = lastFourWeeksTrainings.reduce((sum, t) => sum + ((t.intensity || 5) * (t.duration || 60)), 0);
    return Math.round(totalCharge4W / 4);
  }, [trainings]);

  const chargeVariation = averageCharge > 0 ? ((totalCharge - averageCharge) / averageCharge * 100).toFixed(0) : '0';

  // Répartition par intensité
  const intensityDistribution = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyTrainings = trainings.filter(t => new Date(t.date) >= weekAgo);
    
    const light = weeklyTrainings.filter(t => (t.intensity || 5) <= 4).length;
    const moderate = weeklyTrainings.filter(t => (t.intensity || 5) >= 5 && (t.intensity || 5) <= 7).length;
    const intense = weeklyTrainings.filter(t => (t.intensity || 5) >= 8).length;
    
    const total = light + moderate + intense || 1;
    
    return {
      light: Math.round((light / total) * 100),
      moderate: Math.round((moderate / total) * 100),
      intense: Math.round((intense / total) * 100),
    };
  }, [trainings]);

  // Détecter les alertes Work/Rest
  const hasAlert = useMemo(() => {
    // Alert si charge monte et sommeil baisse
    const lastThreeTraining = weeklyTrainingData.slice(-3);
    const lastThreeSleep = sleepHours.slice(-3);
    
    const trainingTrend = lastThreeTraining[2] > lastThreeTraining[0];
    const sleepTrend = lastThreeSleep[2] < lastThreeSleep[0];
    
    return trainingTrend && sleepTrend;
  }, [weeklyTrainingData, sleepHours]);

  const days = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
  const maxWorkout = Math.max(...weeklyTrainingData, 1);
  const maxSleep = Math.max(...sleepHours, 8);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Charge d'entraînement */}
      <View style={[styles.chargeCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.chargeHeader}>
          <View style={styles.chargeTitle}>
            <Flame size={20} color="#F59E0B" />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Charge d'entraînement</Text>
          </View>
          <Text style={[styles.chargeSubtitle, { color: colors.textMuted }]}>RPE × Durée</Text>
        </View>

        <View style={styles.chargeMain}>
          <Text style={[styles.chargeValue, { color: colors.textPrimary }]}>
            {totalCharge}
            <Text style={[styles.chargeUnit, { color: colors.textMuted }]}> pts</Text>
          </Text>
          <View style={styles.chargeComparison}>
            <Text style={[styles.chargeAverage, { color: colors.textMuted }]}>
              Moy. 4 sem : {averageCharge} pts
            </Text>
            <Text style={[
              styles.chargeVariation,
              { color: Number(chargeVariation) > 20 ? '#EF4444' : Number(chargeVariation) > 0 ? '#F59E0B' : '#10B981' }
            ]}>
              {Number(chargeVariation) > 0 ? '+' : ''}{chargeVariation}%
              {Number(chargeVariation) > 20 && ' ⚠️'}
            </Text>
          </View>
        </View>
      </View>

      {/* Work/Rest Ratio */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.sectionHeader}>
          <Activity size={18} color="#8B5CF6" />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Work / Rest Ratio</Text>
          {hasAlert && <AlertTriangle size={16} color="#EF4444" />}
        </View>

        <View style={styles.workRestChart}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={day}
              style={styles.chartColumn}
              onPress={() => {
                setSelectedDay({
                  index,
                  day,
                  trainingLoad: weeklyTrainingData[index],
                  sleepHours: sleepHours[index],
                });

                setTimeout(() => {
                  setSelectedDay(null);
                }, 3000);
              }}
              activeOpacity={0.7}
            >
              {/* Barre entraînement */}
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.workoutBar,
                    {
                      height: `${(weeklyTrainingData[index] / maxWorkout) * 100}%`,
                      backgroundColor: '#8B5CF6',
                    }
                  ]}
                />
              </View>
              {/* Ligne sommeil */}
              <View
                style={[
                  styles.sleepDot,
                  {
                    bottom: `${(sleepHours[index] / maxSleep) * 100}%`,
                    backgroundColor: '#10B981',
                  }
                ]}
              />
              <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#8B5CF6' }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Entraînement</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#10B981', borderRadius: 10 }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Sommeil</Text>
          </View>
        </View>

        {/* Tooltip */}
        {selectedDay && (
          <View style={[styles.workRestTooltip, { backgroundColor: '#1F2937' }]}>
            <Text style={styles.tooltipDay}>{selectedDay.day}</Text>
            <View style={styles.tooltipRow}>
              <View style={styles.tooltipItem}>
                <View style={[styles.tooltipDot, { backgroundColor: '#8B5CF6' }]} />
                <Text style={styles.tooltipLabel}>Charge : </Text>
                <Text style={styles.tooltipValue}>{selectedDay.trainingLoad.toFixed(1)} pts</Text>
              </View>
              <View style={styles.tooltipItem}>
                <View style={[styles.tooltipDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.tooltipLabel}>Sommeil : </Text>
                <Text style={styles.tooltipValue}>{selectedDay.sleepHours.toFixed(1)}h</Text>
              </View>
            </View>
          </View>
        )}

        {hasAlert && (
          <View style={[styles.alertCard, { backgroundColor: '#EF444415' }]}>
            <AlertTriangle size={14} color="#EF4444" />
            <Text style={styles.alertText}>
              ⚠️ Charge en hausse + Sommeil en baisse = Risque fatigue !
            </Text>
          </View>
        )}
      </View>

      {/* Répartition par intensité */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.sectionHeader}>
          <Zap size={18} color="#F59E0B" />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Répartition par intensité</Text>
        </View>

        <View style={styles.intensityBars}>
          <View style={styles.intensityRow}>
            <View style={styles.intensityLabel}>
              <Text style={[styles.intensityEmoji]}>😌</Text>
              <Text style={[styles.intensityText, { color: colors.textSecondary }]}>Légère (RPE 1-4)</Text>
            </View>
            <View style={styles.intensityBarContainer}>
              <View style={[styles.intensityBar, { width: `${intensityDistribution.light}%`, backgroundColor: '#10B981' }]} />
            </View>
            <Text style={[styles.intensityPercent, { color: colors.textPrimary }]}>{intensityDistribution.light}%</Text>
          </View>

          <View style={styles.intensityRow}>
            <View style={styles.intensityLabel}>
              <Text style={[styles.intensityEmoji]}>💪</Text>
              <Text style={[styles.intensityText, { color: colors.textSecondary }]}>Modérée (RPE 5-7)</Text>
            </View>
            <View style={styles.intensityBarContainer}>
              <View style={[styles.intensityBar, { width: `${intensityDistribution.moderate}%`, backgroundColor: '#F59E0B' }]} />
            </View>
            <Text style={[styles.intensityPercent, { color: colors.textPrimary }]}>{intensityDistribution.moderate}%</Text>
          </View>

          <View style={styles.intensityRow}>
            <View style={styles.intensityLabel}>
              <Text style={[styles.intensityEmoji]}>🔥</Text>
              <Text style={[styles.intensityText, { color: colors.textSecondary }]}>Intense (RPE 8-10)</Text>
            </View>
            <View style={styles.intensityBarContainer}>
              <View style={[styles.intensityBar, { width: `${intensityDistribution.intense}%`, backgroundColor: '#EF4444' }]} />
            </View>
            <Text style={[styles.intensityPercent, { color: colors.textPrimary }]}>{intensityDistribution.intense}%</Text>
          </View>
        </View>
      </View>

      {/* Insight */}
      <View style={[styles.insightCard, { backgroundColor: colors.backgroundCard, borderLeftColor: '#8B5CF6' }]}>
        <View style={styles.insightHeader}>
          <Lightbulb size={18} color="#8B5CF6" />
          <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>Insight Expert</Text>
        </View>
        <Text style={[styles.insightText, { color: colors.textSecondary }]}>
          13 séances de stretching ≠ 13 séances de MMA. 
          La charge (RPE × durée) mesure ton vrai volume d'entraînement.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  chargeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  chargeHeader: {
    marginBottom: 16,
  },
  chargeTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  chargeSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 28,
  },
  chargeMain: {
    alignItems: 'center',
  },
  chargeValue: {
    fontSize: 48,
    fontWeight: '900',
  },
  chargeUnit: {
    fontSize: 18,
    fontWeight: '600',
  },
  chargeComparison: {
    alignItems: 'center',
    marginTop: 8,
  },
  chargeAverage: {
    fontSize: 13,
  },
  chargeVariation: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  workRestChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 100,
    marginBottom: 12,
    position: 'relative',
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  barWrapper: {
    flex: 1,
    width: 16,
    justifyContent: 'flex-end',
  },
  workoutBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  sleepDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    left: '50%',
    marginLeft: -4,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
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
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  alertText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  intensityBars: {
    gap: 12,
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intensityLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 130,
  },
  intensityEmoji: {
    fontSize: 16,
  },
  intensityText: {
    fontSize: 12,
  },
  intensityBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  intensityBar: {
    height: '100%',
    borderRadius: 4,
  },
  intensityPercent: {
    width: 40,
    textAlign: 'right',
    fontWeight: '700',
    fontSize: 13,
  },
  insightCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 40,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  insightText: {
    fontSize: 13,
    lineHeight: 20,
  },
  // Work/Rest Tooltip
  workRestTooltip: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  tooltipDay: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tooltipRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tooltipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tooltipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

