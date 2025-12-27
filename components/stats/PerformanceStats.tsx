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
import { Activity, Zap, Moon, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Flame, Sun, Dumbbell, Target, Clock, Maximize2 } from 'lucide-react-native';
import { getTrainings, Training } from '@/lib/database';
import { getSleepStats } from '@/lib/sleepService';
import { SparklineChart } from '../charts/SparklineChart';
import { StatsDetailModal } from '../StatsDetailModal';

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
  const [selectedStat, setSelectedStat] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
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
      lightCount: light,
      moderateCount: moderate,
      intenseCount: intense,
      totalSessions: total,
    };
  }, [trainings]);

  // Calcul du ratio Work/Rest
  const workRestRatio = useMemo(() => {
    const totalTrainingLoad = weeklyTrainingData.reduce((sum, val) => sum + val, 0);
    const totalSleep = sleepHours.reduce((sum, val) => sum + val, 0);
    const avgSleep = totalSleep / 7;

    // Ratio = Charge totale / Sommeil moyen
    // Si sommeil > 0, sinon retourner 0
    if (avgSleep > 0) {
      return (totalTrainingLoad / avgSleep).toFixed(1);
    }
    return '0.0';
  }, [weeklyTrainingData, sleepHours]);

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

  const performanceCards = [
    {
      key: 'charge',
      label: 'Charge Totale',
      icon: <Flame size={18} color="#F59E0B" />,
      color: '#F59E0B',
      value: totalCharge,
      unit: 'pts',
    },
    {
      key: 'ratio',
      label: 'Équilibre Effort/Repos',
      icon: <Activity size={18} color="#8B5CF6" />,
      color: '#8B5CF6',
      value: parseFloat(workRestRatio),
      unit: ':1',
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Cards cliquables */}
      <View style={styles.performanceCardsGrid}>
        {performanceCards.map((card) => {
          const hasData = card.value > 0;

          return (
            <TouchableOpacity
              key={card.key}
              style={[styles.performanceCard, { backgroundColor: colors.backgroundCard }]}
              activeOpacity={0.7}
              onPress={() => hasData && setSelectedStat({
                key: card.key,
                label: card.label,
                color: card.color,
                unit: card.unit,
                icon: card.icon,
              })}
            >
              {/* Expand icon */}
              {hasData && (
                <View style={styles.expandIcon}>
                  <Maximize2 size={16} color="#1F2937" opacity={0.9} />
                </View>
              )}

              {/* Icon */}
              <View style={[styles.cardIconContainer, { backgroundColor: card.color + '20' }]}>
                {card.icon}
              </View>

              {/* Label */}
              <Text style={[styles.cardLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {card.label}
              </Text>

              {/* Value */}
              <Text style={[styles.cardValue, { color: colors.textPrimary }]}>
                {card.value > 0 ? card.value.toFixed(card.key === 'ratio' ? 1 : 0) : '--'}
                <Text style={[styles.cardUnit, { color: colors.textMuted }]}>
                  {' '}{card.unit}
                </Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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

      {/* Résumé de la semaine */}
      <View style={[styles.summaryCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.summaryHeader}>
          <Target size={18} color="#3B82F6" />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Résumé de la semaine</Text>
        </View>

        <View style={styles.summaryGrid}>
          {/* Total séances */}
          <View style={[styles.summaryItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total séances</Text>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
              {intensityDistribution.totalSessions}
            </Text>
          </View>

          {/* Work/Rest Ratio */}
          <View style={[styles.summaryItem, { backgroundColor: colors.background }]}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Équilibre Effort/Repos</Text>
            <Text style={[styles.summaryValue, { color: '#8B5CF6' }]}>
              {workRestRatio}:1
            </Text>
          </View>
        </View>

        {/* Détail par intensité */}
        <View style={styles.intensityDetails}>
          <View style={styles.intensityDetailItem}>
            <Sun size={14} color="#10B981" />
            <Text style={[styles.intensityDetailText, { color: colors.textSecondary }]}>
              Légère : {intensityDistribution.lightCount} séance{intensityDistribution.lightCount > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.intensityDetailItem}>
            <Dumbbell size={14} color="#F59E0B" />
            <Text style={[styles.intensityDetailText, { color: colors.textSecondary }]}>
              Modérée : {intensityDistribution.moderateCount} séance{intensityDistribution.moderateCount > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.intensityDetailItem}>
            <Flame size={14} color="#EF4444" />
            <Text style={[styles.intensityDetailText, { color: colors.textSecondary }]}>
              Intense : {intensityDistribution.intenseCount} séance{intensityDistribution.intenseCount > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Charge vs Récupération - Version professionnelle */}
      <TouchableOpacity
        style={[styles.workRestCard, { backgroundColor: colors.backgroundCard }]}
        activeOpacity={0.7}
        onPress={() => setSelectedStat({
          key: 'workrest',
          label: 'Charge vs Récupération',
          color: '#8B5CF6',
          unit: '',
          icon: <Activity size={24} color="#8B5CF6" />,
        })}
      >
        {/* Expand icon */}
        <View style={styles.expandIcon}>
          <Maximize2 size={16} color="#1F2937" opacity={0.9} />
        </View>

        <View style={styles.sectionHeader}>
          <Activity size={18} color="#8B5CF6" />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Charge vs Récupération</Text>
          {hasAlert && <AlertTriangle size={16} color="#EF4444" />}
        </View>

        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Équilibre entre tes efforts (barres violettes) et ton repos (ligne verte)
        </Text>

        {/* Graphique moderne simplifié */}
        <View style={styles.modernWorkRestChart}>
          {days.map((day, index) => {
            const chargeHeight = Math.min((weeklyTrainingData[index] / Math.max(...weeklyTrainingData, 1)) * 100, 100);
            const sleepHeight = Math.min((sleepHours[index] / 12) * 100, 100);

            return (
              <View key={day} style={styles.modernChartDay}>
                {/* Valeur de charge au-dessus */}
                {weeklyTrainingData[index] > 0 && (
                  <Text style={[styles.chargeValueText, { color: '#8B5CF6' }]}>
                    {weeklyTrainingData[index].toFixed(1)}
                  </Text>
                )}

                {/* Barre de charge (fond clair + rempli) */}
                <View style={styles.modernBarContainer}>
                  <View style={[styles.modernBarBg, { backgroundColor: '#8B5CF620' }]}>
                    <View
                      style={[
                        styles.modernBarFill,
                        {
                          height: `${chargeHeight}%`,
                          backgroundColor: '#8B5CF6',
                        }
                      ]}
                    />
                  </View>

                  {/* Point de sommeil sur la barre + valeur */}
                  {sleepHours[index] > 0 && (
                    <View
                      style={[
                        styles.sleepPointContainer,
                        { bottom: `${sleepHeight}%` }
                      ]}
                    >
                      <View style={styles.sleepPointOuter}>
                        <View style={styles.sleepPointInner} />
                      </View>
                      {/* Valeur de sommeil à droite du point */}
                      <Text style={[styles.sleepValueText, { color: '#10B981' }]}>
                        {sleepHours[index].toFixed(1)}h
                      </Text>
                    </View>
                  )}
                </View>

                {/* Label jour */}
                <Text style={[styles.modernDayLabel, { color: colors.textMuted }]}>{day}</Text>
              </View>
            );
          })}
        </View>

        {/* Légende moderne */}
        <View style={styles.modernLegend}>
          <View style={styles.modernLegendItem}>
            <View style={[styles.modernLegendBar, { backgroundColor: '#8B5CF6' }]} />
            <Text style={[styles.modernLegendText, { color: colors.textMuted }]}>Charge d'effort</Text>
          </View>
          <View style={styles.modernLegendItem}>
            <View style={styles.modernLegendPoint}>
              <View style={styles.modernLegendPointOuter}>
                <View style={styles.modernLegendPointInner} />
              </View>
            </View>
            <Text style={[styles.modernLegendText, { color: colors.textMuted }]}>Heures de repos</Text>
          </View>
        </View>

        {hasAlert && (
          <View style={[styles.alertCard, { backgroundColor: '#EF444415' }]}>
            <AlertTriangle size={14} color="#EF4444" />
            <Text style={styles.alertText}>
              ⚠️ Attention : Tu t'entraînes plus mais tu dors moins. Risque de surmenage !
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Répartition par intensité */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.sectionHeader}>
          <Zap size={18} color="#F59E0B" />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Répartition par intensité</Text>
        </View>

        <View style={styles.intensityBars}>
          <View style={styles.intensityRow}>
            <View style={styles.intensityLabel}>
              <View style={styles.intensityIcon}>
                <Sun size={16} color="#10B981" />
              </View>
              <Text style={[styles.intensityText, { color: colors.textSecondary }]}>Légère (RPE 1-4)</Text>
            </View>
            <View style={styles.intensityBarContainer}>
              <View style={[styles.intensityBar, { width: `${intensityDistribution.light}%`, backgroundColor: '#10B981' }]} />
            </View>
            <Text style={[styles.intensityPercent, { color: colors.textPrimary }]}>{intensityDistribution.light}%</Text>
          </View>

          <View style={styles.intensityRow}>
            <View style={styles.intensityLabel}>
              <View style={styles.intensityIcon}>
                <Dumbbell size={16} color="#F59E0B" />
              </View>
              <Text style={[styles.intensityText, { color: colors.textSecondary }]}>Modérée (RPE 5-7)</Text>
            </View>
            <View style={styles.intensityBarContainer}>
              <View style={[styles.intensityBar, { width: `${intensityDistribution.moderate}%`, backgroundColor: '#F59E0B' }]} />
            </View>
            <Text style={[styles.intensityPercent, { color: colors.textPrimary }]}>{intensityDistribution.moderate}%</Text>
          </View>

          <View style={styles.intensityRow}>
            <View style={styles.intensityLabel}>
              <View style={styles.intensityIcon}>
                <Flame size={16} color="#EF4444" />
              </View>
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

      {/* Modal de détail */}
      {selectedStat && selectedStat.key !== 'workrest' && (
        <StatsDetailModal
          visible={selectedStat !== null}
          onClose={() => setSelectedStat(null)}
          title={selectedStat.label}
          subtitle="7 derniers jours"
          data={
            selectedStat.key === 'charge'
              ? weeklyTrainingData.map((value, index) => ({
                  value,
                  label: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'][index],
                }))
              : weeklyTrainingData.map((value, index) => ({
                  value: sleepHours[index] > 0 ? value / sleepHours[index] : 0,
                  label: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'][index],
                }))
          }
          color={selectedStat.color}
          unit={selectedStat.unit}
          icon={selectedStat.icon}
        />
      )}

      {/* Modal pour Work/Rest avec graphique double */}
      {selectedStat && selectedStat.key === 'workrest' && (
        <StatsDetailModal
          visible={selectedStat !== null}
          onClose={() => setSelectedStat(null)}
          title={selectedStat.label}
          subtitle="7 derniers jours - Charge (barres) vs Sommeil (points)"
          data={weeklyTrainingData.map((value, index) => ({
            value,
            label: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'][index],
          }))}
          color={selectedStat.color}
          unit="pts"
          icon={selectedStat.icon}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  performanceCardsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  performanceCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 120,
    position: 'relative',
  },
  expandIcon: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardUnit: {
    fontSize: 14,
    fontWeight: '600',
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
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  intensityDetails: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  intensityDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intensityDetailText: {
    fontSize: 13,
    fontWeight: '600',
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
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },

  // Nouveau graphique moderne Work/Rest
  workRestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  modernWorkRestChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    marginBottom: 16,
    paddingHorizontal: 4,
    gap: 8,
  },
  modernChartDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  modernBarContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  modernBarBg: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  modernBarFill: {
    width: '100%',
    borderRadius: 8,
    minHeight: 4,
  },
  chargeValueText: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  sleepPointContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -10,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sleepValueText: {
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sleepPointOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sleepPointInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  modernDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },

  // Nouvelle légende moderne
  modernLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    marginTop: 8,
  },
  modernLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernLegendBar: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  modernLegendPoint: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernLegendPointOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernLegendPointInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  modernLegendText: {
    fontSize: 12,
    fontWeight: '600',
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
  intensityIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
});

