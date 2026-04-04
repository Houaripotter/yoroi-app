// ============================================
// STATS PAGE 5 - SANTÉ
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SleepLottieCard } from '@/components/cards/SleepLottieCard';
import { HydrationCard2 } from '@/components/cards/HydrationCard2';
import { ChargeLottieCard } from '@/components/cards/ChargeLottieCard';
import { SparklineChart } from '@/components/charts/SparklineChart';
import { Moon, Droplets, Activity, TrendingUp, TrendingDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { healthConnect } from '@/lib/healthConnect';
import { logger } from '@/lib/security/logger';

const CARD_PADDING = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StatsPage5HealthProps {
  sleepHours?: number;
  sleepGoal?: number;
  hydration?: number;
  hydrationGoal?: number;
  workloadStatus?: 'none' | 'light' | 'moderate' | 'intense';
}

export const StatsPage5Health: React.FC<StatsPage5HealthProps> = ({
  sleepHours = 0,
  sleepGoal = 8,
  hydration = 0,
  hydrationGoal = 2500,
  workloadStatus = 'moderate',
}) => {
  const { colors, isDark } = useTheme();
  const [healthHistory, setHealthHistory] = useState<any[]>([]);

  const sleepDebt = Math.max(sleepGoal - sleepHours, 0);

  useEffect(() => {
    const loadHealthHistory = async () => {
      try {
        // Charger l'historique de sommeil RÉEL depuis HealthKit uniquement
        const sleepHistory = await healthConnect.getSleepHistory(7);

        if (sleepHistory && sleepHistory.length > 0) {
          // Utiliser les vraies données uniquement
          const history = sleepHistory.map(entry => ({
            sleep: entry.total || 0,
            hydration: hydration, // Utiliser la valeur réelle passée en props
            charge: 0, // La charge doit venir des vrais entraînements, pas de données fictives
          }));
          setHealthHistory(history);
        } else {
          // Pas de données réelles → pas de graphique historique
          setHealthHistory([]);
        }
      } catch (error) {
        // En cas d'erreur → pas de données fictives
        logger.error('Error loading health history:', error);
        setHealthHistory([]);
      }
    };
    loadHealthHistory();
  }, [hydration]);

  const getSparklineData = (field: 'sleep' | 'hydration' | 'charge') => {
    return healthHistory.map(entry => ({ value: entry[field] }));
  };

  const getTrend = (field: 'sleep' | 'hydration' | 'charge'): 'up' | 'down' | 'stable' => {
    if (healthHistory.length < 2) return 'stable';
    const current = healthHistory[healthHistory.length - 1][field];
    const prev = healthHistory[healthHistory.length - 2][field];
    const diff = current - prev;
    const percentChange = Math.abs(diff / prev) * 100;
    if (percentChange < 5) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getChange = (field: 'sleep' | 'hydration' | 'charge'): string => {
    if (healthHistory.length < 2) return '';
    const current = healthHistory[healthHistory.length - 1][field];
    const prev = healthHistory[healthHistory.length - 2][field];
    const diff = current - prev;
    if (field === 'sleep') {
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
        Santé
      </Text>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Sommeil, hydratation et récupération
      </Text>

      {/* Sommeil */}
      <SleepLottieCard
        hours={sleepHours}
        debt={sleepDebt}
        goal={sleepGoal}
      />

      {/* Évolution Sommeil */}
      {healthHistory.length > 1 && (
        <View style={[styles.evolutionCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.evolutionHeader}>
            <View style={styles.evolutionTitleRow}>
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.evolutionIcon}
              >
                <Moon size={20} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
              <Text style={[styles.evolutionTitle, { color: colors.textPrimary }]}>
                Évolution Sommeil (7j)
              </Text>
            </View>
            {(() => {
              const trend = getTrend('sleep');
              const change = getChange('sleep');
              return trend !== 'stable' && change ? (
                <View style={styles.trendBadge}>
                  {trend === 'up' ? (
                    <TrendingUp size={12} color="#10B981" />
                  ) : (
                    <TrendingDown size={12} color="#EF4444" />
                  )}
                  <Text style={[styles.changeText, { color: trend === 'up' ? '#10B981' : '#EF4444' }]}>
                    {change}h
                  </Text>
                </View>
              ) : null;
            })()}
          </View>
          <View style={styles.sparklineContainer}>
            <SparklineChart
              data={getSparklineData('sleep')}
              width={SCREEN_WIDTH - CARD_PADDING * 2 - 40 + 12}
              height={60}
              color="#6366F1"
              showGradient={true}
              thickness={3}
              showLastValues={healthHistory.length}
              valueUnit="h"
            />
          </View>
        </View>
      )}

      {/* Hydratation */}
      <HydrationCard2
        currentMl={hydration}
        goalMl={hydrationGoal}
        onAddMl={(ml) => {}}
      />

      {/* Évolution Hydratation */}
      {healthHistory.length > 1 && (
        <View style={[styles.evolutionCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.evolutionHeader}>
            <View style={styles.evolutionTitleRow}>
              <LinearGradient
                colors={['#06B6D4', '#0891B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.evolutionIcon}
              >
                <Droplets size={20} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
              <Text style={[styles.evolutionTitle, { color: colors.textPrimary }]}>
                Évolution Hydratation (7j)
              </Text>
            </View>
            {(() => {
              const trend = getTrend('hydration');
              const change = getChange('hydration');
              return trend !== 'stable' && change ? (
                <View style={styles.trendBadge}>
                  {trend === 'up' ? (
                    <TrendingUp size={12} color="#10B981" />
                  ) : (
                    <TrendingDown size={12} color="#EF4444" />
                  )}
                  <Text style={[styles.changeText, { color: trend === 'up' ? '#10B981' : '#EF4444' }]}>
                    {change}ml
                  </Text>
                </View>
              ) : null;
            })()}
          </View>
          <View style={styles.sparklineContainer}>
            <SparklineChart
              data={getSparklineData('hydration')}
              width={SCREEN_WIDTH - CARD_PADDING * 2 - 40 + 12}
              height={60}
              color="#06B6D4"
              showGradient={true}
              thickness={3}
              showLastValues={healthHistory.length}
              valueUnit="ml"
            />
          </View>
        </View>
      )}

      {/* Charge / Récupération */}
      <ChargeLottieCard
        level={workloadStatus === 'light' ? 'leger' : workloadStatus === 'moderate' ? 'modere' : workloadStatus === 'intense' ? 'eleve' : 'optimal'}
      />

      {/* Évolution Charge */}
      {healthHistory.length > 1 && (
        <View style={[styles.evolutionCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.evolutionHeader}>
            <View style={styles.evolutionTitleRow}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.evolutionIcon}
              >
                <Activity size={20} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
              <Text style={[styles.evolutionTitle, { color: colors.textPrimary }]}>
                Évolution Charge (7j)
              </Text>
            </View>
            {(() => {
              const trend = getTrend('charge');
              const change = getChange('charge');
              return trend !== 'stable' && change ? (
                <View style={styles.trendBadge}>
                  {trend === 'up' ? (
                    <TrendingUp size={12} color="#EF4444" />
                  ) : (
                    <TrendingDown size={12} color="#10B981" />
                  )}
                  <Text style={[styles.changeText, { color: trend === 'up' ? '#EF4444' : '#10B981' }]}>
                    {change} pts
                  </Text>
                </View>
              ) : null;
            })()}
          </View>
          <View style={styles.sparklineContainer}>
            <SparklineChart
              data={getSparklineData('charge')}
              width={SCREEN_WIDTH - CARD_PADDING * 2 - 40 + 12}
              height={60}
              color="#F59E0B"
              showGradient={true}
              thickness={3}
              showLastValues={healthHistory.length}
              valueUnit=" pts"
            />
          </View>
        </View>
      )}
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
  evolutionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  evolutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  evolutionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  evolutionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  evolutionTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sparklineContainer: {
    marginHorizontal: -6,
  },
});
