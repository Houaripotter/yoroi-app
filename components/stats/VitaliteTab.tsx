import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getSleepStats } from '@/lib/sleepService';
import { getHydrationHistory, getAverageHydration } from '@/lib/storage';
import { calculateReadinessScore } from '@/lib/readinessService';
import { generateInsights, type Insight } from '@/lib/correlationService';
import { Heart, Moon, Droplet, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react-native';

interface HydrationDayData {
  date: string;
  totalAmount: number;
  goal: number;
  entries: any[];
  isTrainingDay: boolean;
}

export default function VitaliteTab() {
  const { colors } = useTheme();
  const [vitalityScore, setVitalityScore] = useState(0);
  const [sleepStats, setSleepStats] = useState<any>(null);
  const [hydrationData, setHydrationData] = useState<HydrationDayData[]>([]);
  const [avgHydration, setAvgHydration] = useState(0);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Score Vitalité (readiness)
      const streakDays = 7; // À récupérer du service de streaks plus tard
      const readiness = await calculateReadinessScore(streakDays);
      setVitalityScore(readiness.score);

      // Stats sommeil
      const sleep = await getSleepStats();
      setSleepStats(sleep);

      // Hydratation
      const hydro = await getHydrationHistory(7);
      setHydrationData(hydro);
      const avg = await getAverageHydration(7);
      setAvgHydration(avg);

      // Insights experts (corrélation analysis)
      const expertInsights = await generateInsights();
      setInsights(expertInsights);
    } catch (error) {
      console.error('Erreur chargement Vitalité:', error);
    }
  };

  // Couleur du score
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Excellent
    if (score >= 60) return '#F59E0B'; // Bon
    if (score >= 40) return '#FF9800'; // Moyen
    return '#EF4444'; // Faible
  };

  // Niveau du score
  const getScoreLevel = (score: number) => {
    if (score >= 80) return 'Excellente forme';
    if (score >= 60) return 'Bonne forme';
    if (score >= 40) return 'Forme modérée';
    return 'Récupération nécessaire';
  };

  // Couleur et style des insights
  const getInsightStyle = (type: 'positive' | 'warning' | 'tip') => {
    switch (type) {
      case 'positive':
        return { bg: '#DCFCE7', text: '#166534', icon: '✅' };
      case 'warning':
        return { bg: '#FEF3C7', text: '#92400E', icon: '⚠️' };
      case 'tip':
        return { bg: '#DBEAFE', text: '#1E40AF', icon: '💡' };
    }
  };

  const sleepPercentage = sleepStats ? Math.round((sleepStats.averageDuration / sleepStats.goal) * 100) : 0;
  const hydrationPercentage = Math.round((avgHydration / 2.5) * 100);
  const successfulDays = hydrationData.filter(d => d.totalAmount >= d.goal).length;
  const successRate = hydrationData.length > 0 ? Math.round((successfulDays / hydrationData.length) * 100) : 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* SCORE VITALITÉ */}
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <Heart size={18} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Score Vitalité</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: getScoreColor(vitalityScore) }]}>
            {vitalityScore}/100
          </Text>
          <Text style={[styles.scoreLevel, { color: colors.textSecondary }]}>
            {getScoreLevel(vitalityScore)}
          </Text>
        </View>

        {/* Breakdown */}
        <View style={styles.breakdown}>
          <View style={styles.breakdownItem}>
            <Moon size={16} color="#8B5CF6" />
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              Sommeil (35%)
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
              {sleepPercentage}%
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <Droplet size={16} color="#3B82F6" />
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              Hydratation (20%)
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
              {hydrationPercentage}%
            </Text>
          </View>
        </View>
      </View>

      {/* INSIGHTS EXPERTS */}
      {insights.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.cardHeader}>
            <TrendingUp size={18} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Insights Experts</Text>
          </View>

          <Text style={[styles.insightsSubtitle, { color: colors.textSecondary }]}>
            Analyse basée sur {Math.max(...insights.map(i => i.dataPoints))} jours de données
          </Text>

          <View style={styles.insightsList}>
            {insights.map((insight) => {
              const style = getInsightStyle(insight.type);
              return (
                <View
                  key={insight.id}
                  style={[styles.insightCard, { backgroundColor: style.bg }]}
                >
                  <View style={styles.insightHeader}>
                    <Text style={styles.insightIcon}>{style.icon}</Text>
                    <Text style={[styles.insightTitle, { color: style.text }]}>
                      {insight.title}
                    </Text>
                  </View>
                  <Text style={[styles.insightMessage, { color: style.text }]}>
                    {insight.message}
                  </Text>
                  <View style={styles.insightFooter}>
                    <Text style={[styles.insightConfidence, { color: style.text }]}>
                      Confiance: {insight.confidence}% • {insight.dataPoints} données
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* SOMMEIL - Détails */}
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <Moon size={18} color="#8B5CF6" />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Sommeil</Text>
        </View>

        {sleepStats ? (
          <>
            {/* Stats détaillées */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Moyenne
                </Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {Math.floor(sleepStats.averageDuration / 60)}h
                  {String(sleepStats.averageDuration % 60).padStart(2, '0')}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Dette
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        sleepStats.debtHours < -5
                          ? '#EF4444'
                          : sleepStats.debtHours < -2
                            ? '#F59E0B'
                            : '#10B981',
                    },
                  ]}
                >
                  {sleepStats.debtHours > 0 ? '+' : ''}
                  {sleepStats.debtHours.toFixed(1)}h
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Tendance
                </Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {sleepStats.trend === 'improving'
                    ? '📈'
                    : sleepStats.trend === 'declining'
                      ? '📉'
                      : '➡️'}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.noData, { color: colors.textMuted }]}>
            Aucune donnée de sommeil disponible
          </Text>
        )}
      </View>

      {/* HYDRATATION - Détails */}
      <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <Droplet size={18} color="#3B82F6" />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Hydratation</Text>
        </View>

        {hydrationData.length > 0 ? (
          <>
            {/* Stats 7 derniers jours */}
            <View style={styles.hydrationWeek}>
              <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>
                7 derniers jours
              </Text>
              <View style={styles.weekDays}>
                {hydrationData.map((day, index) => {
                  const goalMet = day.totalAmount >= day.goal;
                  const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
                  const dayIndex = new Date(day.date).getDay();

                  return (
                    <View key={index} style={styles.dayItem}>
                      <View
                        style={[
                          styles.dayDot,
                          { backgroundColor: goalMet ? '#10B981' : '#E5E7EB' },
                        ]}
                      />
                      <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
                        {dayNames[dayIndex]}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.weekStats}>
                <Text style={[styles.weekStat, { color: colors.textPrimary }]}>
                  Taux de réussite : {successRate}%
                </Text>
                <Text style={[styles.weekStat, { color: colors.textSecondary }]}>
                  Moyenne : {avgHydration.toFixed(1)}L / jour
                </Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={[styles.noData, { color: colors.textMuted }]}>
            Aucune donnée d'hydratation disponible
          </Text>
        )}
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
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLevel: {
    fontSize: 16,
    marginTop: 8,
  },
  breakdown: {
    marginTop: 16,
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  insightsSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    borderRadius: 12,
    padding: 14,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 18,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  insightMessage: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  insightFooter: {
    marginTop: 4,
  },
  insightConfidence: {
    fontSize: 11,
    opacity: 0.7,
  },
  hydrationWeek: {
    marginTop: 0,
  },
  weekLabel: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayItem: {
    alignItems: 'center',
    gap: 4,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 11,
  },
  weekStats: {
    gap: 4,
  },
  weekStat: {
    fontSize: 13,
  },
  noData: {
    textAlign: 'center',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
});
