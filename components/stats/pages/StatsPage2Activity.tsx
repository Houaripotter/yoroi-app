// ============================================
// STATS PAGE 2 - ACTIVITÉ
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Footprints, Flame, Navigation, Clock, TrendingUp, TrendingDown } from 'lucide-react-native';
import AnimatedCounter from '@/components/AnimatedCounter';
import { LinearGradient } from 'expo-linear-gradient';
import { SparklineChart } from '@/components/charts/SparklineChart';
import { healthConnect } from '@/lib/healthConnect';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;

interface StatsPage2ActivityProps {
  steps?: number;
  stepsGoal?: number;
  calories?: number;
  distance?: number;
  activeMinutes?: number;
}

export const StatsPage2Activity: React.FC<StatsPage2ActivityProps> = ({
  steps = 0,
  stepsGoal = 10000,
  calories = 0,
  distance = 0,
  activeMinutes = 0,
}) => {
  const { colors, isDark } = useTheme();
  const [activityHistory, setActivityHistory] = useState<any[]>([]);

  const stepsPercentage = Math.min((steps / stepsGoal) * 100, 100);

  useEffect(() => {
    const loadActivityHistory = async () => {
      try {
        // Charger l'historique RÉEL depuis HealthKit uniquement
        const stepsHistory = await healthConnect.getStepsHistory(7);

        if (stepsHistory && stepsHistory.length > 0) {
          // Utiliser les vraies données HealthKit
          const history = stepsHistory.map(entry => ({
            steps: entry.value || 0,
            // Note: calories/distance/activeMinutes sont estimés à partir des pas réels
            // Ce ne sont pas des données fictives, mais des calculs basés sur les vrais pas
            calories: Math.round((entry.value || 0) * 0.04),
            distance: parseFloat(((entry.value || 0) * 0.0008).toFixed(1)),
            activeMinutes: Math.round((entry.value || 0) / 100),
          }));
          setActivityHistory(history);
        } else {
          // Pas de données réelles → pas de graphique historique
          setActivityHistory([]);
        }
      } catch (error) {
        // En cas d'erreur → pas de données fictives
        console.error('Error loading activity history:', error);
        setActivityHistory([]);
      }
    };
    loadActivityHistory();
  }, [steps, calories, distance, activeMinutes]);

  const getSparklineData = (field: 'steps' | 'calories' | 'distance' | 'activeMinutes') => {
    return activityHistory.map(entry => ({ value: entry[field] }));
  };

  const getTrend = (field: 'steps' | 'calories' | 'distance' | 'activeMinutes'): 'up' | 'down' | 'stable' => {
    if (activityHistory.length < 2) return 'stable';
    const current = activityHistory[activityHistory.length - 1][field];
    const prev = activityHistory[activityHistory.length - 2][field];
    const diff = current - prev;
    const percentChange = Math.abs(diff / prev) * 100;
    if (percentChange < 5) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getChange = (field: 'steps' | 'calories' | 'distance' | 'activeMinutes'): string => {
    if (activityHistory.length < 2) return '';
    const current = activityHistory[activityHistory.length - 1][field];
    const prev = activityHistory[activityHistory.length - 2][field];
    const diff = current - prev;
    if (field === 'distance') {
      return diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
    }
    return diff > 0 ? `+${Math.round(diff)}` : `${Math.round(diff)}`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
        Activité
      </Text>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Votre activité physique du jour
      </Text>

      {/* Pas - Grande carte */}
      <View style={[styles.mainCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.mainCardHeader}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainIcon}
          >
            <Footprints size={28} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
          <View style={styles.mainCardTitles}>
            <Text style={[styles.mainCardTitle, { color: colors.textPrimary }]}>
              Pas effectués
            </Text>
            <Text style={[styles.mainCardSubtitle, { color: colors.textMuted }]}>
              Objectif : {stepsGoal.toLocaleString()} pas
            </Text>
          </View>
        </View>

        <AnimatedCounter
          value={steps}
          style={[styles.mainCardValue, { color: colors.textPrimary }]}
          duration={1000}
        />

        {/* Progress bar */}
        <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${stepsPercentage}%` }]}
          />
        </View>

        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {stepsPercentage.toFixed(0)}% de l'objectif
        </Text>
      </View>

      {/* Autres métriques */}
      <View style={styles.metricsRow}>
        {/* Calories */}
        <View style={[styles.metricCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.metricHeader}>
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.metricIcon}
            >
              <Flame size={22} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
            {(() => {
              const trend = getTrend('calories');
              const change = getChange('calories');
              return trend !== 'stable' && change ? (
                <View style={styles.trendBadge}>
                  {trend === 'up' ? (
                    <TrendingUp size={10} color="#10B981" />
                  ) : (
                    <TrendingDown size={10} color="#EF4444" />
                  )}
                  <Text style={[styles.changeText, { color: trend === 'up' ? '#10B981' : '#EF4444' }]}>
                    {change}
                  </Text>
                </View>
              ) : null;
            })()}
          </View>
          <AnimatedCounter
            value={calories}
            style={[styles.metricValue, { color: colors.textPrimary }]}
            duration={800}
          />
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            CALORIES
          </Text>
          {activityHistory.length > 1 && (
            <View style={styles.metricSparkline}>
              <SparklineChart
                data={getSparklineData('calories')}
                width={(SCREEN_WIDTH - CARD_PADDING * 2 - 12) / 2 - 40 + 12}
                height={35}
                color="#F97316"
                showGradient={true}
                thickness={2}
                showLastValues={activityHistory.length}
                valueUnit=""
              />
            </View>
          )}
        </View>

        {/* Distance */}
        <View style={[styles.metricCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.metricHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.metricIcon}
            >
              <Navigation size={22} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
            {(() => {
              const trend = getTrend('distance');
              const change = getChange('distance');
              return trend !== 'stable' && change ? (
                <View style={styles.trendBadge}>
                  {trend === 'up' ? (
                    <TrendingUp size={10} color="#10B981" />
                  ) : (
                    <TrendingDown size={10} color="#EF4444" />
                  )}
                  <Text style={[styles.changeText, { color: trend === 'up' ? '#10B981' : '#EF4444' }]}>
                    {change}
                  </Text>
                </View>
              ) : null;
            })()}
          </View>
          <AnimatedCounter
            value={distance}
            style={[styles.metricValue, { color: colors.textPrimary }]}
            duration={800}
          />
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            KM
          </Text>
          {activityHistory.length > 1 && (
            <View style={styles.metricSparkline}>
              <SparklineChart
                data={getSparklineData('distance')}
                width={(SCREEN_WIDTH - CARD_PADDING * 2 - 12) / 2 - 40 + 12}
                height={35}
                color="#10B981"
                showGradient={true}
                thickness={2}
                showLastValues={activityHistory.length}
                valueUnit="km"
              />
            </View>
          )}
        </View>
      </View>

      {/* Minutes actives */}
      <View style={[styles.activeCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.activeHeader}>
          <View style={styles.activeTop}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeIcon}
            >
              <Clock size={24} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>
            <View style={styles.activeContent}>
              <Text style={[styles.activeLabel, { color: colors.textMuted }]}>
                Minutes actives
              </Text>
              <AnimatedCounter
                value={activeMinutes}
                style={[styles.activeValue, { color: colors.textPrimary }]}
                duration={800}
              />
            </View>
            {(() => {
              const trend = getTrend('activeMinutes');
              const change = getChange('activeMinutes');
              return trend !== 'stable' && change ? (
                <View style={styles.trendBadge}>
                  {trend === 'up' ? (
                    <TrendingUp size={12} color="#10B981" />
                  ) : (
                    <TrendingDown size={12} color="#EF4444" />
                  )}
                  <Text style={[styles.changeText, { color: trend === 'up' ? '#10B981' : '#EF4444' }]}>
                    {change}
                  </Text>
                </View>
              ) : null;
            })()}
          </View>
          {activityHistory.length > 1 && (
            <View style={styles.activeSparkline}>
              <SparklineChart
                data={getSparklineData('activeMinutes')}
                width={SCREEN_WIDTH - CARD_PADDING * 2 - 40 + 12}
                height={40}
                color="#8B5CF6"
                showGradient={true}
                thickness={2.5}
                showLastValues={activityHistory.length}
                valueUnit="min"
              />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 120,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
  mainCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  mainIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCardTitles: {
    flex: 1,
  },
  mainCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  mainCardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  mainCardValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
    marginBottom: 16,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  metricSparkline: {
    marginTop: 'auto',
    marginHorizontal: -6,
  },
  activeCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  activeHeader: {
    gap: 16,
  },
  activeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  activeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeContent: {
    flex: 1,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  activeValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  activeSparkline: {
    marginHorizontal: -6,
    marginTop: 8,
  },
});
