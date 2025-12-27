import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Moon, Droplets, Heart, TrendingUp, TrendingDown, Clock, Lightbulb, Maximize2 } from 'lucide-react-native';
import { getSleepStats } from '@/lib/sleepService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { StatsDetailModal } from '../StatsDetailModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 180;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 30;

interface VitalityStatsProps {
  trainings?: any[];
}

export const VitalityStats: React.FC<VitalityStatsProps> = ({ trainings = [] }) => {
  const { colors } = useTheme();
  const [sleepStats, setSleepStats] = useState<any>(null);
  const [hydrationWeek, setHydrationWeek] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [vitalityScore, setVitalityScore] = useState(0);
  const [sleepHistory, setSleepHistory] = useState<{ date: string; duration: number }[]>([]);
  const [selectedStat, setSelectedStat] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
  } | null>(null);

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

      // Charger l'historique de sommeil (7 derniers jours)
      const sleepHist = await loadSleepHistory();
      setSleepHistory(sleepHist);

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

  const loadSleepHistory = async (): Promise<{ date: string; duration: number }[]> => {
    const history: { date: string; duration: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `sleep_${dateStr}`;

      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const sleepData = JSON.parse(value);
          // Duration is in minutes, convert to hours
          const duration = sleepData.duration ? sleepData.duration / 60 : 0;
          history.push({ date: dateStr, duration });
        } else {
          history.push({ date: dateStr, duration: 0 });
        }
      } catch {
        history.push({ date: dateStr, duration: 0 });
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

  const vitalityCards = [
    {
      key: 'sleep',
      label: 'Sommeil Moyen',
      icon: <Moon size={18} color="#8B5CF6" />,
      color: '#8B5CF6',
      value: sleepStats?.averageDuration ? sleepStats.averageDuration / 60 : 0,
      unit: 'h',
    },
    {
      key: 'hydration',
      label: 'Hydratation',
      icon: <Droplets size={18} color="#0EA5E9" />,
      color: '#0EA5E9',
      value: hydrationWeek.reduce((a, b) => a + b, 0) / hydrationWeek.length,
      unit: 'L',
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Cards cliquables */}
      <View style={styles.vitalityCardsGrid}>
        {vitalityCards.map((card) => {
          const hasData = card.value > 0;

          return (
            <TouchableOpacity
              key={card.key}
              style={[styles.vitalityCard, { backgroundColor: colors.backgroundCard }]}
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
                {card.value > 0 ? card.value.toFixed(1) : '--'}
                <Text style={[styles.cardUnit, { color: colors.textMuted }]}>
                  {' '}{card.unit}
                </Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
          {vitalityScore >= 80 ? 'Excellente forme !' :
           vitalityScore >= 60 ? 'Bonne vitalité' :
           vitalityScore >= 40 ? 'Peut mieux faire' : 'Recharge nécessaire'}
        </Text>
      </View>

      {/* Section Sommeil */}
      <TouchableOpacity
        style={[styles.section, { backgroundColor: colors.backgroundCard }]}
        activeOpacity={0.9}
        onPress={() => sleepHistory.length > 0 && setSelectedStat({
          key: 'sleep_detail',
          label: 'Sommeil Détaillé',
          color: '#8B5CF6',
          unit: 'h',
          icon: <Moon size={24} color="#8B5CF6" />,
        })}
      >
        {/* Expand icon */}
        {sleepHistory.length > 0 && (
          <View style={styles.expandIconSection}>
            <Maximize2 size={16} color="#1F2937" opacity={0.9} />
          </View>
        )}

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

        {/* Graphique sommeil avec zones colorées */}
        {sleepHistory.length > 0 && (
          <View style={styles.sleepChart}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.4" />
                  <Stop offset="0.5" stopColor="#8B5CF6" stopOpacity="0.2" />
                  <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* Zones colorées (en fond) */}
              {/* Zone Rouge (<5h) */}
              <Rect
                x={PADDING_LEFT}
                y={PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * 0)}
                width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                height={(CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * 0.5}
                fill="#EF4444"
                opacity={0.1}
              />
              {/* Zone Orange (5-7h) */}
              <Rect
                x={PADDING_LEFT}
                y={PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * 0.5)}
                width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                height={(CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * 0.2}
                fill="#F59E0B"
                opacity={0.1}
              />
              {/* Zone Verte (7-9h) - optimal */}
              <Rect
                x={PADDING_LEFT}
                y={PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * 0.7)}
                width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                height={(CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * 0.2}
                fill="#10B981"
                opacity={0.15}
              />
              {/* Zone Orange (9-10h) */}
              <Rect
                x={PADDING_LEFT}
                y={PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * 0.9)}
                width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                height={(CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * 0.05}
                fill="#F59E0B"
                opacity={0.1}
              />
              {/* Zone Rouge (>10h) */}
              <Rect
                x={PADDING_LEFT}
                y={PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * 0.95)}
                width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                height={(CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * 0.05}
                fill="#EF4444"
                opacity={0.1}
              />

              {/* Lignes de repère */}
              {[0, 5, 7, 9, 10].map((hours) => {
                const y = PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * (1 - hours / 10));
                return (
                  <Rect
                    key={hours}
                    x={PADDING_LEFT}
                    y={y}
                    width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                    height={1}
                    fill={colors.border}
                    opacity={0.3}
                  />
                );
              })}

              {/* Ligne de sommeil avec courbe de Bézier */}
              {(() => {
                const chartData = sleepHistory.map((entry, index) => {
                  const x = PADDING_LEFT + ((CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT) * index) / Math.max(sleepHistory.length - 1, 1);
                  const y = PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * (1 - Math.min(entry.duration, 10) / 10));
                  return { x, y, duration: entry.duration };
                });

                let path = `M ${chartData[0].x} ${chartData[0].y}`;
                for (let i = 1; i < chartData.length; i++) {
                  const prev = chartData[i - 1];
                  const curr = chartData[i];
                  const cp1x = prev.x + (curr.x - prev.x) / 3;
                  const cp1y = prev.y;
                  const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
                  const cp2y = curr.y;
                  path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                }

                const areaPath = path + ` L ${chartData[chartData.length - 1].x} ${CHART_HEIGHT - PADDING_BOTTOM} L ${chartData[0].x} ${CHART_HEIGHT - PADDING_BOTTOM} Z`;

                return (
                  <>
                    <Path d={areaPath} fill="url(#sleepGradient)" />
                    <Path d={path} stroke="#8B5CF6" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    {chartData.map((point, index) => (
                      <React.Fragment key={index}>
                        <Circle cx={point.x} cy={point.y} r={6} fill="#FFFFFF" opacity={0.95} />
                        <Circle cx={point.x} cy={point.y} r={4} fill="#8B5CF6" />
                      </React.Fragment>
                    ))}
                  </>
                );
              })()}
            </Svg>

            {/* Labels Y (heures) */}
            <View style={styles.yLabels}>
              {[10, 9, 7, 5, 0].map((hours) => (
                <Text key={hours} style={[styles.yLabel, { color: colors.textMuted }]}>
                  {hours}h
                </Text>
              ))}
            </View>

            {/* Labels X (jours) */}
            <View style={styles.xLabels}>
              {sleepHistory.map((entry, index) => {
                const x = PADDING_LEFT + ((CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT) * index) / Math.max(sleepHistory.length - 1, 1);
                return (
                  <View key={index} style={[styles.xLabel, { left: x - 15 }]}>
                    <Text style={[styles.xLabelText, { color: colors.textMuted }]}>
                      {new Date(entry.date).toLocaleDateString('fr-FR', { weekday: 'short' }).substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Valeurs de sommeil au-dessus des points */}
            {sleepHistory.map((entry, index) => {
              const x = PADDING_LEFT + ((CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT) * index) / Math.max(sleepHistory.length - 1, 1);
              const y = PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * (1 - Math.min(entry.duration, 10) / 10));
              return entry.duration > 0 ? (
                <View key={index} style={[styles.sleepValueLabel, { left: x - 18, top: y - 24 }]}>
                  <Text style={[styles.sleepValueText, {
                    color: '#8B5CF6',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }]}>
                    {entry.duration.toFixed(1)}h
                  </Text>
                </View>
              ) : null;
            })}
          </View>
        )}

        {/* Légende des zones de sommeil */}
        {sleepHistory.length > 0 && (
          <View style={styles.sleepLegend}>
            <Text style={[styles.legendTitle, { color: colors.textMuted }]}>Zones de sommeil</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendZone, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.legendZoneText, { color: colors.textMuted }]}>{'< 5h ou > 10h'}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendZone, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.legendZoneText, { color: colors.textMuted }]}>5-7h ou 9-10h</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendZone, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.legendZoneText, { color: colors.textMuted }]}>7-9h (optimal)</Text>
              </View>
            </View>
          </View>
        )}

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
      </TouchableOpacity>

      {/* Section Hydratation */}
      <TouchableOpacity
        style={[styles.section, { backgroundColor: colors.backgroundCard }]}
        activeOpacity={0.9}
        onPress={() => setSelectedStat({
          key: 'hydration_detail',
          label: 'Hydratation Détaillée',
          color: '#0EA5E9',
          unit: 'L',
          icon: <Droplets size={24} color="#0EA5E9" />,
        })}
      >
        {/* Expand icon */}
        <View style={styles.expandIconSection}>
          <Maximize2 size={16} color="#1F2937" opacity={0.9} />
        </View>

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
                {/* Valeur au-dessus de la barre */}
                {value > 0 && (
                  <Text style={[styles.hydrationValue, {
                    color: reached ? '#10B981' : '#0EA5E9',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }]}>
                    {value.toFixed(1)}L
                  </Text>
                )}
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
      </TouchableOpacity>

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

      {/* Modal de détail */}
      {selectedStat && (selectedStat.key === 'sleep' || selectedStat.key === 'hydration') && (
        <StatsDetailModal
          visible={selectedStat !== null}
          onClose={() => setSelectedStat(null)}
          title={selectedStat.label}
          subtitle="7 derniers jours"
          data={
            selectedStat.key === 'sleep'
              ? sleepHistory.map((entry, index) => ({
                  value: entry.duration,
                  label: format(new Date(entry.date), 'd MMM', { locale: fr }),
                  date: entry.date,
                }))
              : hydrationWeek.map((value, index) => ({
                  value,
                  label: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'][index],
                }))
          }
          color={selectedStat.color}
          unit={selectedStat.unit}
          icon={selectedStat.icon}
        />
      )}

      {/* Modal détaillé pour sommeil */}
      {selectedStat && selectedStat.key === 'sleep_detail' && (
        <StatsDetailModal
          visible={selectedStat !== null}
          onClose={() => setSelectedStat(null)}
          title={selectedStat.label}
          subtitle="7 derniers jours - Zones optimales"
          data={sleepHistory.map((entry, index) => ({
            value: entry.duration,
            label: format(new Date(entry.date), 'd MMM', { locale: fr }),
            date: entry.date,
          }))}
          color={selectedStat.color}
          unit={selectedStat.unit}
          icon={selectedStat.icon}
        />
      )}

      {/* Modal détaillé pour hydratation */}
      {selectedStat && selectedStat.key === 'hydration_detail' && (
        <StatsDetailModal
          visible={selectedStat !== null}
          onClose={() => setSelectedStat(null)}
          title={selectedStat.label}
          subtitle={`Objectif: 2.5L/jour - ${Math.round((hydrationWeek.filter(h => h >= 2.5).length / 7) * 100)}% de réussite`}
          data={hydrationWeek.map((value, index) => ({
            value,
            label: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][index],
          }))}
          color={selectedStat.color}
          unit={selectedStat.unit}
          icon={selectedStat.icon}
        />
      )}
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
  vitalityCardsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  vitalityCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 120,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  expandIcon: {
    position: 'absolute',
    top: 14,
    left: 48,
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
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  cardUnit: {
    fontSize: 15,
    fontWeight: '700',
  },
  scoreCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  expandIconSection: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 4,
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
  sleepChart: {
    height: CHART_HEIGHT,
    position: 'relative',
    marginBottom: 16,
  },
  yLabels: {
    position: 'absolute',
    left: 0,
    top: PADDING_TOP,
    height: CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM,
    justifyContent: 'space-between',
  },
  yLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  xLabels: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PADDING_BOTTOM,
  },
  xLabel: {
    position: 'absolute',
    width: 30,
    alignItems: 'center',
    top: 8,
  },
  xLabelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sleepValueLabel: {
    position: 'absolute',
    width: 36,
    alignItems: 'center',
  },
  sleepValueText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sleepLegend: {
    marginTop: 12,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendZone: {
    width: 16,
    height: 16,
    borderRadius: 4,
    opacity: 0.6,
  },
  legendZoneText: {
    fontSize: 11,
    fontWeight: '500',
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
    height: 100,
    marginBottom: 16,
  },
  hydrationDay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  hydrationValue: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
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

