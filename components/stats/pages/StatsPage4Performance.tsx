// ============================================
// STATS PAGE 4 - PERFORMANCE
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { PerformanceRadar } from '@/components/PerformanceRadar';
import { Trophy, TrendingUp, Target, TrendingDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SparklineChart } from '@/components/charts/SparklineChart';
import { getTrainings, getWeights } from '@/lib/database';

const CARD_PADDING = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StatsPage4PerformanceProps {
  personalRecords?: any;
  progressData?: any;
}

export const StatsPage4Performance: React.FC<StatsPage4PerformanceProps> = ({
  personalRecords,
  progressData,
}) => {
  const { colors, isDark } = useTheme();
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);

  useEffect(() => {
    const loadPerformanceData = async () => {
      try {
        const [trainings, weights] = await Promise.all([
          getTrainings(),
          getWeights(30),
        ]);

        // Grouper par jour les 7 derniers jours
        const history = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const dayTrainings = trainings.filter(t => t.date === dateStr);
          const dayWeight = weights.find(w => w.date === dateStr);

          history.push({
            trainings: dayTrainings.length,
            weight: dayWeight?.weight || (weights[weights.length - 1]?.weight || 0),
            steps: 0, // Les pas viennent de HealthKit, pas de la DB
          });
        }
        setPerformanceHistory(history);
      } catch (error) {
        console.error('Erreur chargement performance:', error);
      }
    };
    loadPerformanceData();
  }, []);

  const getSparklineData = (field: 'trainings' | 'weight' | 'steps') => {
    return performanceHistory.map(entry => ({ value: entry[field] }));
  };

  const getTrend = (field: 'trainings' | 'weight' | 'steps'): 'up' | 'down' | 'stable' => {
    if (performanceHistory.length < 2) return 'stable';
    const current = performanceHistory[performanceHistory.length - 1][field];
    const prev = performanceHistory[performanceHistory.length - 2][field];
    const diff = current - prev;
    const percentChange = Math.abs(diff / prev) * 100;
    if (percentChange < 2) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getChange = (field: 'trainings' | 'weight' | 'steps'): string => {
    if (performanceHistory.length < 2) return '';
    const current = performanceHistory[performanceHistory.length - 1][field];
    const prev = performanceHistory[performanceHistory.length - 2][field];
    const diff = current - prev;
    if (field === 'weight') {
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
        Performance
      </Text>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Votre progression et tes records
      </Text>

      {/* Radar de performance */}
      <View style={[styles.radarCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <Target size={20} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Profil Athlétique
          </Text>
        </View>
        <View style={styles.radarContainer}>
          <PerformanceRadar size={240} />
        </View>
      </View>

      {/* Records personnels */}
      <View style={[styles.recordsCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <Trophy size={20} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Records Personnels
          </Text>
        </View>

        <View style={styles.recordsList}>
          <View style={styles.recordItem}>
            <Text style={[styles.recordLabel, { color: colors.textSecondary }]}>
              Plus longue série
            </Text>
            <Text style={[styles.recordValue, { color: isDark ? colors.accent : colors.textPrimary }]}>
              12 jours
            </Text>
          </View>

          <View style={styles.recordItem}>
            <Text style={[styles.recordLabel, { color: colors.textSecondary }]}>
              Meilleur poids
            </Text>
            <Text style={[styles.recordValue, { color: isDark ? colors.accent : colors.textPrimary }]}>
              75.2 kg
            </Text>
          </View>

          <View style={styles.recordItem}>
            <Text style={[styles.recordLabel, { color: colors.textSecondary }]}>
              Record de pas
            </Text>
            <Text style={[styles.recordValue, { color: isDark ? colors.accent : colors.textPrimary }]}>
              18,542
            </Text>
          </View>
        </View>
      </View>

      {/* Progression mensuelle */}
      <View style={[styles.progressCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <TrendingUp size={20} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Progression ce mois-ci
          </Text>
        </View>

        <View style={styles.progressList}>
          {/* Entraînements */}
          <View style={styles.progressItemCard}>
            <View style={styles.progressItemHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Entraînements complétés
              </Text>
              {(() => {
                const trend = getTrend('trainings');
                const change = getChange('trainings');
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
            <Text style={[styles.progressValue, { color: '#10B981' }]}>
              +15
            </Text>
            {performanceHistory.length > 1 && (
              <View style={styles.progressSparkline}>
                <SparklineChart
                  data={getSparklineData('trainings')}
                  width={SCREEN_WIDTH - CARD_PADDING * 2 - 40 + 12}
                  height={40}
                  color="#10B981"
                  showGradient={true}
                  thickness={2.5}
                  showLastValues={performanceHistory.length}
                  valueUnit=""
                />
              </View>
            )}
          </View>

          {/* Poids */}
          <View style={styles.progressItemCard}>
            <View style={styles.progressItemHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Poids perdu
              </Text>
              {(() => {
                const trend = getTrend('weight');
                const change = getChange('weight');
                return trend !== 'stable' && change ? (
                  <View style={styles.trendBadge}>
                    {trend === 'down' ? (
                      <TrendingDown size={12} color="#10B981" />
                    ) : (
                      <TrendingUp size={12} color="#EF4444" />
                    )}
                    <Text style={[styles.changeText, { color: trend === 'down' ? '#10B981' : '#EF4444' }]}>
                      {change}kg
                    </Text>
                  </View>
                ) : null;
              })()}
            </View>
            <Text style={[styles.progressValue, { color: '#10B981' }]}>
              -2.3 kg
            </Text>
            {performanceHistory.length > 1 && (
              <View style={styles.progressSparkline}>
                <SparklineChart
                  data={getSparklineData('weight')}
                  width={SCREEN_WIDTH - CARD_PADDING * 2 - 40 + 12}
                  height={40}
                  color="#3B82F6"
                  showGradient={true}
                  thickness={2.5}
                  showLastValues={performanceHistory.length}
                  valueUnit="kg"
                />
              </View>
            )}
          </View>

          {/* Pas */}
          <View style={styles.progressItemCard}>
            <View style={styles.progressItemHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Moyenne pas/jour
              </Text>
              {(() => {
                const trend = getTrend('steps');
                const change = getChange('steps');
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
            <Text style={[styles.progressValue, { color: '#10B981' }]}>
              +2,341
            </Text>
            {performanceHistory.length > 1 && (
              <View style={styles.progressSparkline}>
                <SparklineChart
                  data={getSparklineData('steps')}
                  width={SCREEN_WIDTH - CARD_PADDING * 2 - 40 + 12}
                  height={40}
                  color="#F59E0B"
                  showGradient={true}
                  thickness={2.5}
                  showLastValues={performanceHistory.length}
                  valueUnit=""
                />
              </View>
            )}
          </View>
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
  radarCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  radarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  recordsList: {
    gap: 16,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  progressCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  progressList: {
    gap: 16,
  },
  progressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressItemCard: {
    gap: 8,
  },
  progressItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  progressSparkline: {
    marginHorizontal: -6,
  },
});
