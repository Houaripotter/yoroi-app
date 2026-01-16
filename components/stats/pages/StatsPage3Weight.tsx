// ============================================
// STATS PAGE 3 - POIDS & CORPS
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { WeightLottieCard } from '@/components/cards/WeightLottieCard';
import { AnimatedCompositionCircle } from '@/components/AnimatedCompositionCircle';
import { SparklineChart } from '@/components/charts/SparklineChart';
import { getMeasurements, getWeights } from '@/lib/database';
import { Ruler, TrendingUp, TrendingDown } from 'lucide-react-native';
import logger from '@/lib/security/logger';

const CARD_PADDING = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StatsPage3WeightProps {
  currentWeight?: number;
  targetWeight?: number;
  startWeight?: number;
  weightHistory?: number[];
  bodyFat?: number;
  muscleMass?: number;
  waterPercentage?: number;
}

export const StatsPage3Weight: React.FC<StatsPage3WeightProps> = ({
  currentWeight = 0,
  targetWeight = 0,
  startWeight = 0,
  weightHistory = [],
  bodyFat,
  muscleMass,
  waterPercentage,
}) => {
  const { colors } = useTheme();
  const [measurementsData, setMeasurementsData] = useState<any[]>([]);
  const [weightsData, setWeightsData] = useState<any[]>([]);

  const hasBodyComp = bodyFat || muscleMass || waterPercentage;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [measurements, weights] = await Promise.all([
        getMeasurements(),
        getWeights()
      ]);

      const sortedMeasurements = [...measurements].sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setMeasurementsData(sortedMeasurements);

      const sortedWeights = [...weights].sort((a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setWeightsData(sortedWeights);
    } catch (error) {
      logger.error('Erreur chargement données:', error);
    }
  };

  // Définir les principales mensurations à afficher
  const measurements = [
    { id: 'waist', label: 'Tour de taille', color: '#EF4444', icon: Ruler },
    { id: 'hips', label: 'Hanches', color: '#F97316', icon: Ruler },
    { id: 'chest', label: 'Poitrine', color: '#22C55E', icon: Ruler },
    { id: 'left_arm', label: 'Bras G.', color: '#8B5CF6', icon: Ruler },
    { id: 'right_arm', label: 'Bras D.', color: '#A855F7', icon: Ruler },
    { id: 'left_thigh', label: 'Cuisse G.', color: '#EC4899', icon: Ruler },
  ];

  const getCurrentValue = (key: string): number | null => {
    if (!measurementsData || measurementsData.length === 0) return null;
    const latest = measurementsData[measurementsData.length - 1];
    return (latest as any)[key] || null;
  };

  const getSparklineData = (measurementKey: string) => {
    if (!measurementsData || measurementsData.length === 0) return [];
    return measurementsData.slice(-7).map(entry => ({
      value: (entry as any)[measurementKey] || 0,
    })).filter(d => d.value > 0);
  };

  const getTrend = (key: string): 'up' | 'down' | 'stable' => {
    const data = getSparklineData(key);
    if (data.length < 2) return 'stable';
    const current = data[data.length - 1].value;
    const prev = data[data.length - 2].value;
    const diff = current - prev;
    const percentChange = Math.abs(diff / prev) * 100;
    if (percentChange < 2) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getChange = (key: string): string => {
    const data = getSparklineData(key);
    if (data.length < 2) return '';
    const current = data[data.length - 1].value;
    const prev = data[data.length - 2].value;
    const diff = current - prev;
    return diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
  };

  // Fonctions pour composition corporelle
  const getCompositionSparklineData = (field: 'bodyFat' | 'muscleMass' | 'waterPercentage') => {
    if (!weightsData || weightsData.length === 0) return [];
    const fieldMap = {
      bodyFat: 'fat_percent',
      muscleMass: 'muscle_percent',
      waterPercentage: 'water_percent'
    };
    const dbField = fieldMap[field];
    return weightsData.slice(-7).map(entry => ({
      value: (entry as any)[dbField] || 0,
    })).filter(d => d.value > 0);
  };

  const getCompositionTrend = (field: 'bodyFat' | 'muscleMass' | 'waterPercentage'): 'up' | 'down' | 'stable' => {
    const data = getCompositionSparklineData(field);
    if (data.length < 2) return 'stable';
    const current = data[data.length - 1].value;
    const prev = data[data.length - 2].value;
    const diff = current - prev;
    const percentChange = Math.abs(diff / prev) * 100;
    if (percentChange < 2) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getCompositionChange = (field: 'bodyFat' | 'muscleMass' | 'waterPercentage'): string => {
    const data = getCompositionSparklineData(field);
    if (data.length < 2) return '';
    const current = data[data.length - 1].value;
    const prev = data[data.length - 2].value;
    const diff = current - prev;
    return diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
        Poids & Corps
      </Text>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Suivi de ton composition corporelle
      </Text>

      {/* Graphique poids */}
      <WeightLottieCard
        weight={currentWeight}
        target={targetWeight}
        history={weightHistory}
        fatPercent={bodyFat}
        musclePercent={muscleMass}
        waterPercent={waterPercentage}
        onPress={() => {}}
      />

      {/* Composition corporelle */}
      {hasBodyComp && (
        <View style={styles.compositionSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Composition Détaillée
          </Text>

          {/* Grille de composition - même style que mensurations */}
          <View style={styles.measurementsGrid}>
            {bodyFat !== undefined && (
              <View style={[styles.measurementCard, { backgroundColor: colors.backgroundCard }]}>
                <View style={styles.measurementHeader}>
                  <View style={[styles.compositionCircleContainer]}>
                    <AnimatedCompositionCircle
                      value={bodyFat}
                      max={100}
                      label=""
                      unit="%"
                      color="#EF4444"
                      size={60}
                    />
                  </View>
                  {(() => {
                    const trend = getCompositionTrend('bodyFat');
                    const change = getCompositionChange('bodyFat');
                    return trend !== 'stable' && change ? (
                      <View style={styles.trendBadge}>
                        {trend === 'up' ? (
                          <TrendingUp size={12} color="#EF4444" />
                        ) : (
                          <TrendingDown size={12} color="#10B981" />
                        )}
                        <Text
                          style={[
                            styles.changeText,
                            { color: trend === 'up' ? '#EF4444' : '#10B981' },
                          ]}
                        >
                          {change}%
                        </Text>
                      </View>
                    ) : null;
                  })()}
                </View>
                <Text style={[styles.compositionLabel2, { color: colors.textMuted }]}>
                  Masse Grasse
                </Text>
                {(() => {
                  const sparklineData = getCompositionSparklineData('bodyFat');
                  const cardWidth = (SCREEN_WIDTH - CARD_PADDING * 2 - 12) / 2;
                  const sparklineWidth = cardWidth - 32 + 12;
                  return sparklineData.length > 1 ? (
                    <View style={styles.sparklineContainer}>
                      <SparklineChart
                        data={sparklineData}
                        width={sparklineWidth}
                        height={40}
                        color="#EF4444"
                        showGradient={true}
                        thickness={2.5}
                        showLastValues={sparklineData.length}
                        valueUnit="%"
                      />
                    </View>
                  ) : null;
                })()}
              </View>
            )}

            {muscleMass !== undefined && (
              <View style={[styles.measurementCard, { backgroundColor: colors.backgroundCard }]}>
                <View style={styles.measurementHeader}>
                  <View style={[styles.compositionCircleContainer]}>
                    <AnimatedCompositionCircle
                      value={muscleMass}
                      max={100}
                      label=""
                      unit="%"
                      color="#10B981"
                      size={60}
                    />
                  </View>
                  {(() => {
                    const trend = getCompositionTrend('muscleMass');
                    const change = getCompositionChange('muscleMass');
                    return trend !== 'stable' && change ? (
                      <View style={styles.trendBadge}>
                        {trend === 'up' ? (
                          <TrendingUp size={12} color="#10B981" />
                        ) : (
                          <TrendingDown size={12} color="#EF4444" />
                        )}
                        <Text
                          style={[
                            styles.changeText,
                            { color: trend === 'up' ? '#10B981' : '#EF4444' },
                          ]}
                        >
                          {change}%
                        </Text>
                      </View>
                    ) : null;
                  })()}
                </View>
                <Text style={[styles.compositionLabel2, { color: colors.textMuted }]}>
                  Muscle
                </Text>
                {(() => {
                  const sparklineData = getCompositionSparklineData('muscleMass');
                  const cardWidth = (SCREEN_WIDTH - CARD_PADDING * 2 - 12) / 2;
                  const sparklineWidth = cardWidth - 32 + 12;
                  return sparklineData.length > 1 ? (
                    <View style={styles.sparklineContainer}>
                      <SparklineChart
                        data={sparklineData}
                        width={sparklineWidth}
                        height={40}
                        color="#10B981"
                        showGradient={true}
                        thickness={2.5}
                        showLastValues={sparklineData.length}
                        valueUnit="%"
                      />
                    </View>
                  ) : null;
                })()}
              </View>
            )}

            {waterPercentage !== undefined && (
              <View style={[styles.measurementCard, { backgroundColor: colors.backgroundCard }]}>
                <View style={styles.measurementHeader}>
                  <View style={[styles.compositionCircleContainer]}>
                    <AnimatedCompositionCircle
                      value={waterPercentage}
                      max={100}
                      label=""
                      unit="%"
                      color="#3B82F6"
                      size={60}
                    />
                  </View>
                  {(() => {
                    const trend = getCompositionTrend('waterPercentage');
                    const change = getCompositionChange('waterPercentage');
                    return trend !== 'stable' && change ? (
                      <View style={styles.trendBadge}>
                        {trend === 'up' ? (
                          <TrendingUp size={12} color="#10B981" />
                        ) : (
                          <TrendingDown size={12} color="#EF4444" />
                        )}
                        <Text
                          style={[
                            styles.changeText,
                            { color: trend === 'up' ? '#10B981' : '#EF4444' },
                          ]}
                        >
                          {change}%
                        </Text>
                      </View>
                    ) : null;
                  })()}
                </View>
                <Text style={[styles.compositionLabel2, { color: colors.textMuted }]}>
                  Eau
                </Text>
                {(() => {
                  const sparklineData = getCompositionSparklineData('waterPercentage');
                  const cardWidth = (SCREEN_WIDTH - CARD_PADDING * 2 - 12) / 2;
                  const sparklineWidth = cardWidth - 32 + 12;
                  return sparklineData.length > 1 ? (
                    <View style={styles.sparklineContainer}>
                      <SparklineChart
                        data={sparklineData}
                        width={sparklineWidth}
                        height={40}
                        color="#3B82F6"
                        showGradient={true}
                        thickness={2.5}
                        showLastValues={sparklineData.length}
                        valueUnit="%"
                      />
                    </View>
                  ) : null;
                })()}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Mensurations */}
      {measurementsData.length > 0 && (
        <View style={styles.compositionSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Mensurations
          </Text>
          <View style={styles.measurementsGrid}>
            {measurements.map((measurement) => {
              const value = getCurrentValue(measurement.id);
              if (!value) return null;

              const Icon = measurement.icon;
              const sparklineData = getSparklineData(measurement.id);
              const trend = getTrend(measurement.id);
              const change = getChange(measurement.id);
              const hasData = sparklineData.length > 0;
              const cardWidth = (SCREEN_WIDTH - CARD_PADDING * 2 - 12) / 2;
              const sparklineWidth = cardWidth - 32 + 12;

              return (
                <View
                  key={measurement.id}
                  style={[styles.measurementCard, { backgroundColor: colors.backgroundCard }]}
                >
                  {/* Header avec icône et tendance */}
                  <View style={styles.measurementHeader}>
                    <View style={[styles.measurementIconContainer, { backgroundColor: `${measurement.color}20` }]}>
                      <Icon size={20} color={measurement.color} strokeWidth={2.5} />
                    </View>
                    {trend !== 'stable' && change && (
                      <View style={styles.trendBadge}>
                        {trend === 'up' ? (
                          <TrendingUp size={12} color="#EF4444" />
                        ) : (
                          <TrendingDown size={12} color="#10B981" />
                        )}
                        <Text
                          style={[
                            styles.changeText,
                            { color: trend === 'up' ? '#EF4444' : '#10B981' },
                          ]}
                        >
                          {change}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.measurementLabel, { color: colors.textMuted }]} numberOfLines={1}>
                    {measurement.label}
                  </Text>
                  <View style={styles.measurementValueRow}>
                    <Text style={[styles.measurementValue, { color: colors.textPrimary }]}>
                      {value.toFixed(1)}
                    </Text>
                    <Text style={[styles.measurementUnit, { color: colors.textMuted }]}>
                      cm
                    </Text>
                  </View>

                  {/* Sparkline */}
                  {hasData && sparklineData.length > 1 && (
                    <View style={styles.sparklineContainer}>
                      <SparklineChart
                        data={sparklineData}
                        width={sparklineWidth}
                        height={40}
                        color={measurement.color}
                        showGradient={true}
                        thickness={2.5}
                        showLastValues={sparklineData.length}
                        valueUnit="cm"
                      />
                    </View>
                  )}
                </View>
              );
            })}
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
  compositionSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  compositionCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  compositionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  compositionItem: {
    alignItems: 'center',
    gap: 12,
  },
  compositionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compositionLabel2: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  compositionCircleContainer: {
    alignItems: 'center',
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  measurementCard: {
    width: (SCREEN_WIDTH - CARD_PADDING * 2 - 12) / 2,
    borderRadius: 16,
    padding: 16,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  measurementIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
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
  measurementLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  measurementValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  measurementValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  measurementUnit: {
    fontSize: 14,
    fontWeight: '700',
  },
  sparklineContainer: {
    marginTop: 'auto',
    marginHorizontal: -6,
  },
});
