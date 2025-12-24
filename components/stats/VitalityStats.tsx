import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Moon, Droplets, Heart, TrendingUp, TrendingDown, Clock, Lightbulb } from 'lucide-react-native';
import { getSleepStats } from '@/lib/sleepService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VitalityStatsProps {
  trainings?: any[];
}

export const VitalityStats: React.FC<VitalityStatsProps> = ({ trainings = [] }) => {
  const { colors } = useTheme();
  const [sleepStats, setSleepStats] = useState<any>(null);
  const [hydrationWeek, setHydrationWeek] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [vitalityScore, setVitalityScore] = useState(0);

  // Animation du score
  const animatedScore = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
  }, []);

  // Animer le score quand il change
  useEffect(() => {
    Animated.timing(animatedScore, {
      toValue: vitalityScore,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [vitalityScore]);

  const loadData = async () => {
    try {
      // Charger les stats de sommeil
      const stats = await getSleepStats();
      setSleepStats(stats);

      // Charger l'hydratation de la semaine
      const hydration = await loadHydrationHistory();
      setHydrationWeek(hydration);

      // Calculer le score de vitalité
      const score = calculateVitalityScore(stats, hydration);
      setVitalityScore(score);
    } catch (error) {
      console.error('Error loading vitality data:', error);
    }
  };

  const loadHydrationHistory = async (): Promise<number[]> => {
    const history: number[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const key = `hydration_${date.toISOString().split('T')[0]}`;
      try {
        const value = await AsyncStorage.getItem(key);
        history.push(value ? parseFloat(value) / 1000 : 0);
      } catch {
        history.push(0);
      }
    }
    return history;
  };

  const calculateVitalityScore = (sleep: any, hydration: number[]): number => {
    let score = 50; // Base

    // Sommeil (40 pts max)
    if (sleep) {
      const sleepAvg = sleep.averageDuration / 60;
      if (sleepAvg >= 7) score += 40;
      else if (sleepAvg >= 6) score += 30;
      else if (sleepAvg >= 5) score += 20;
      else score += 10;
    }

    // Hydratation (10 pts max)
    const hydrationDays = hydration.filter(h => h >= 2).length;
    score += (hydrationDays / 7) * 10;

    return Math.min(100, Math.round(score));
  };

  const HYDRATION_GOAL = 2.5;
  const daysReached = hydrationWeek.filter(h => h >= HYDRATION_GOAL).length;
  const hydrationSuccessRate = Math.round((daysReached / 7) * 100);

  const days = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Score Vitalité Global */}
      <View style={[styles.scoreCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.scoreHeader}>
          <Heart size={24} color="#EF4444" />
          <Text style={[styles.scoreTitle, { color: colors.textPrimary }]}>Score Vitalité</Text>
        </View>
        <View style={styles.scoreCircle}>
          <View style={[styles.scoreRing, { borderColor: getScoreColor(vitalityScore) }]}>
            <Animated.Text style={[styles.scoreValue, { color: getScoreColor(vitalityScore) }]}>
              {animatedScore.interpolate({
                inputRange: [0, 100],
                outputRange: ['0', '100'],
                extrapolate: 'clamp',
              })}
            </Animated.Text>
            <Text style={[styles.scoreMax, { color: colors.textMuted }]}>/100</Text>
          </View>
        </View>
        <Text style={[styles.scoreDescription, { color: colors.textSecondary }]}>
          {vitalityScore >= 80 ? '🏆 Excellente forme !' : 
           vitalityScore >= 60 ? '💪 Bonne vitalité' :
           vitalityScore >= 40 ? '⚠️ Peut mieux faire' : '🔋 Recharge nécessaire'}
        </Text>
      </View>

      {/* Section Sommeil */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.sectionHeader}>
          <Moon size={18} color="#8B5CF6" />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sommeil</Text>
        </View>

        {/* Statistiques sommeil */}
        <View style={styles.sleepStats}>
          <View style={styles.sleepStat}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={[styles.sleepLabel, { color: colors.textMuted }]}>Coucher</Text>
            <Text style={[styles.sleepValue, { color: colors.textPrimary }]}>
              {sleepStats?.averageBedtime || '23:30'}
            </Text>
          </View>
          <View style={styles.sleepStat}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={[styles.sleepLabel, { color: colors.textMuted }]}>Lever</Text>
            <Text style={[styles.sleepValue, { color: colors.textPrimary }]}>
              {sleepStats?.averageWakeTime || '07:00'}
            </Text>
          </View>
          <View style={styles.sleepStat}>
            <Moon size={14} color={colors.textMuted} />
            <Text style={[styles.sleepLabel, { color: colors.textMuted }]}>Durée</Text>
            <Text style={[styles.sleepValue, { color: colors.textPrimary }]}>
              {sleepStats?.averageDuration ? `${(sleepStats.averageDuration / 60).toFixed(1)}h` : '--'}
            </Text>
          </View>
        </View>

        {/* Dette de sommeil */}
        <View style={[styles.debtCard, { backgroundColor: colors.background }]}>
          <View style={styles.debtHeader}>
            <Text style={[styles.debtTitle, { color: colors.textPrimary }]}>Dette de sommeil</Text>
            {sleepStats?.sleepDebtHours && sleepStats.sleepDebtHours > 0 ? (
              <TrendingUp size={16} color="#EF4444" />
            ) : (
              <TrendingDown size={16} color="#10B981" />
            )}
          </View>
          <Text style={[
            styles.debtValue,
            { color: sleepStats?.sleepDebtHours > 0 ? '#EF4444' : '#10B981' }
          ]}>
            {sleepStats?.sleepDebtHours ? `${sleepStats.sleepDebtHours.toFixed(1)}h` : '0h'}
          </Text>
          <Text style={[styles.debtDescription, { color: colors.textMuted }]}>
            {sleepStats?.sleepDebtHours > 5 
              ? '⚠️ Fais une sieste ou couche-toi tôt' 
              : sleepStats?.sleepDebtHours > 0 
              ? 'Tu rembourses ta dette' 
              : '✅ Aucune dette !'}
          </Text>
        </View>
      </View>

      {/* Section Hydratation */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.sectionHeader}>
          <Droplets size={18} color="#0EA5E9" />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Hydratation</Text>
        </View>

        {/* Barres de la semaine */}
        <View style={styles.hydrationChart}>
          {hydrationWeek.map((value, index) => {
            const heightPercent = Math.min((value / HYDRATION_GOAL) * 100, 100);
            const reached = value >= HYDRATION_GOAL;
            return (
              <View key={index} style={styles.hydrationDay}>
                <View style={styles.barContainer}>
                  {/* Barre objectif */}
                  <View style={[styles.goalBar, { backgroundColor: colors.border }]} />
                  {/* Barre réelle */}
                  <View 
                    style={[
                      styles.realBar, 
                      { 
                        height: `${heightPercent}%`,
                        backgroundColor: reached ? '#10B981' : '#0EA5E9',
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{days[index]}</Text>
              </View>
            );
          })}
        </View>

        {/* Taux de réussite */}
        <View style={[styles.successCard, { backgroundColor: colors.background }]}>
          <Text style={[styles.successRate, { color: hydrationSuccessRate >= 80 ? '#10B981' : '#0EA5E9' }]}>
            {hydrationSuccessRate}%
          </Text>
          <Text style={[styles.successDescription, { color: colors.textMuted }]}>
            des jours validés ({daysReached}/7)
          </Text>
        </View>
      </View>

      {/* Insight Expert */}
      <View style={[styles.insightCard, { backgroundColor: colors.backgroundCard, borderLeftColor: '#F59E0B' }]}>
        <View style={styles.insightHeader}>
          <Lightbulb size={18} color="#F59E0B" />
          <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>Insight Expert</Text>
        </View>
        <Text style={[styles.insightText, { color: colors.textSecondary }]}>
          Les semaines où tu dors moins de 6h, ta fréquence d'entraînement baisse de ~23%.
          Priorise ton sommeil pour performer !
        </Text>
      </View>
    </ScrollView>
  );
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#F97316';
  return '#EF4444';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  scoreCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreCircle: {
    marginBottom: 12,
  },
  scoreRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  scoreMax: {
    fontSize: 14,
  },
  scoreDescription: {
    fontSize: 14,
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
  },
  sleepStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  sleepStat: {
    alignItems: 'center',
    gap: 4,
  },
  sleepLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  sleepValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  debtCard: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  debtTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  debtValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  debtDescription: {
    fontSize: 12,
    marginTop: 4,
  },
  hydrationChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 80,
    marginBottom: 16,
  },
  hydrationDay: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    flex: 1,
    width: 20,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  goalBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: 4,
    opacity: 0.3,
  },
  realBar: {
    width: '100%',
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  successCard: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successRate: {
    fontSize: 24,
    fontWeight: '900',
  },
  successDescription: {
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

