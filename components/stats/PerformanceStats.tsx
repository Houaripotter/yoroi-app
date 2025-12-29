import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Activity, Zap, Moon, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Flame, Sun, Dumbbell, Target, Clock, Maximize2, X, CheckCircle, ThumbsUp, Circle as CircleIcon } from 'lucide-react-native';
import { getTrainings, Training } from '@/lib/database';
import { getSleepStats } from '@/lib/sleepService';
import { SparklineChart } from '../charts/SparklineChart';
import { StatsDetailModal } from '../StatsDetailModal';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { getHistoryDays, scale, isIPad } from '@/constants/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_CHART_HEIGHT = scale(300);
const MODAL_PADDING_LEFT = scale(50);
const MODAL_PADDING_RIGHT = scale(20);
const MODAL_PADDING_TOP = scale(40);
const MODAL_PADDING_BOTTOM = scale(50);

// Largeur des cartes statistiques - 2 colonnes sur iPhone, 4 colonnes sur iPad
const STATS_COLUMNS = isIPad() ? 4 : 2;
const STATS_GAP = 12; // Gap fixe pour tous les appareils
const CONTAINER_PADDING = isIPad() ? scale(10) : 20; // iPhone garde 20, iPad scale(10)
const STATS_CARD_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - STATS_GAP * (STATS_COLUMNS - 1)) / STATS_COLUMNS;

interface PerformanceStatsProps {
  trainings?: Training[];
}

// ============================================
// Modal Work/Rest avec les deux courbes
// ============================================
interface WorkRestModalProps {
  visible: boolean;
  onClose: () => void;
  trainingData: number[];
  sleepData: number[];
}

const WorkRestModal: React.FC<WorkRestModalProps> = ({ visible, onClose, trainingData, sleepData }) => {
  const { colors } = useTheme();
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  // Calculer les stats
  const totalTraining = trainingData.reduce((a, b) => a + b, 0);
  const avgTraining = totalTraining / trainingData.length;
  const maxTraining = Math.max(...trainingData);
  const minTraining = Math.min(...trainingData);

  const totalSleep = sleepData.reduce((a, b) => a + b, 0);
  const avgSleep = totalSleep / sleepData.length;
  const maxSleep = Math.max(...sleepData);
  const minSleep = Math.min(...sleepData);

  // Calculer le ratio et la qualité de l'équilibre
  const workRestRatio = avgSleep > 0 ? (totalTraining / avgSleep).toFixed(1) : '0.0';

  // Analyser l'équilibre (bon si sommeil stable et charge progressive)
  const getBalanceQuality = () => {
    // Vérifier si charge augmente pendant que sommeil baisse (mauvais)
    const historyDays = getHistoryDays(); // 3 sur iPhone, 7 sur iPad
    const lastThreeTraining = trainingData.slice(-historyDays);
    const lastThreeSleep = sleepData.slice(-historyDays);

    const trainingIncreasing = lastThreeTraining[historyDays-1] > lastThreeTraining[0];
    const sleepDecreasing = lastThreeSleep[historyDays-1] < lastThreeSleep[0];

    if (trainingIncreasing && sleepDecreasing) {
      return {
        status: 'danger',
        color: '#EF4444',
        label: 'Déséquilibre Critique',
        icon: <AlertTriangle size={16} color="#EF4444" />,
        message: 'Tu t\'entraînes plus mais tu dors moins ! Risque de surmenage et blessures.',
        advice: 'Réduis la charge d\'entraînement ou augmente ton temps de repos.',
      };
    }

    // Vérifier si sommeil est bon (7-9h en moyenne)
    if (avgSleep >= 7 && avgSleep <= 9) {
      return {
        status: 'excellent',
        color: '#10B981',
        label: 'Équilibre Optimal',
        icon: <CheckCircle size={16} color="#10B981" />,
        message: 'Excellent équilibre ! Tu récupères bien.',
        advice: 'Continue comme ça, ton corps se régénère correctement.',
      };
    }

    // Sommeil insuffisant
    if (avgSleep < 6) {
      return {
        status: 'warning',
        color: '#F59E0B',
        label: 'Repos Insuffisant',
        icon: <Zap size={16} color="#F59E0B" />,
        message: 'Attention, tu manques de sommeil.',
        advice: 'Essaie de dormir au moins 7h par nuit pour une récupération optimale.',
      };
    }

    // Sommeil correct mais peut être amélioré
    return {
      status: 'good',
      color: '#3B82F6',
      label: 'Bon Équilibre',
      icon: <ThumbsUp size={16} color="#3B82F6" />,
      message: 'Tu es sur la bonne voie.',
      advice: 'Vise 7-9h de sommeil pour une récupération optimale.',
    };
  };

  const balance = getBalanceQuality();

  // Compter les jours avec bon sommeil (7-9h)
  const goodSleepDays = sleepData.filter(h => h >= 7 && h <= 9).length;
  const goodSleepPercent = Math.round((goodSleepDays / sleepData.length) * 100);

  // Préparer les données pour le graphique
  const chartWidth = SCREEN_WIDTH - (isIPad() ? CONTAINER_PADDING * 2 : 48);
  const maxValue = Math.max(maxTraining, maxSleep);

  const chartData = trainingData.map((training, index) => {
    const x = MODAL_PADDING_LEFT + ((chartWidth - MODAL_PADDING_LEFT - MODAL_PADDING_RIGHT) * index) / Math.max(trainingData.length - 1, 1);
    const trainingY = MODAL_CHART_HEIGHT - MODAL_PADDING_BOTTOM - ((training / maxValue) * (MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM));
    const sleepY = MODAL_CHART_HEIGHT - MODAL_PADDING_BOTTOM - ((sleepData[index] / maxValue) * (MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM));
    return { x, trainingY, sleepY, training, sleep: sleepData[index] };
  });

  // Créer le path pour la ligne d'entraînement
  const createTrainingPath = () => {
    if (chartData.length === 0) return '';
    let path = `M ${chartData[0].x} ${chartData[0].trainingY}`;
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.trainingY;
      const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
      const cp2y = curr.trainingY;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.trainingY}`;
    }
    return path;
  };

  // Créer le path pour la ligne de sommeil
  const createSleepPath = () => {
    if (chartData.length === 0) return '';
    let path = `M ${chartData[0].x} ${chartData[0].sleepY}`;
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.sleepY;
      const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
      const cp2y = curr.sleepY;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.sleepY}`;
    }
    return path;
  };

  // Générer les labels Y
  const yLabels = [];
  for (let i = 0; i < 5; i++) {
    const value = (maxValue * (4 - i)) / 4;
    yLabels.push(value.toFixed(1));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.titleRow}>
              <Activity size={24} color="#8B5CF6" />
              <View style={modalStyles.titleContainer}>
                <Text style={[modalStyles.title, { color: colors.textPrimary }]}>
                  Charge vs Récupération
                </Text>
                <Text style={[modalStyles.subtitle, { color: colors.textMuted }]}>
                  7 derniers jours
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Carte d'équilibre globale */}
            <View style={[modalStyles.balanceCard, { backgroundColor: balance.color + '15', borderLeftColor: balance.color }]}>
              <View style={modalStyles.balanceHeader}>
                <View style={[modalStyles.balanceStatusBadge, { backgroundColor: balance.color }]}>
                  <Text style={modalStyles.balanceStatusText}>{balance.label}</Text>
                </View>
              </View>
              <View style={modalStyles.balanceMessageRow}>
                {balance.icon}
                <Text style={[modalStyles.balanceMessage, { color: colors.textPrimary }]}>
                  {balance.message}
                </Text>
              </View>
              <View style={modalStyles.balanceAdviceRow}>
                <Lightbulb size={14} color={colors.textMuted} />
                <Text style={[modalStyles.balanceAdvice, { color: colors.textMuted }]}>
                  {balance.advice}
                </Text>
              </View>
            </View>

            {/* Stats Cards */}
            <View style={modalStyles.statsGrid}>
              <View style={[modalStyles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[modalStyles.statLabel, { color: colors.textMuted }]}>Charge Moy.</Text>
                <Text style={[modalStyles.statValue, { color: '#8B5CF6' }]}>
                  {avgTraining.toFixed(1)}
                </Text>
                <Text style={[modalStyles.statHint, { color: colors.textMuted }]}>pts/sem</Text>
              </View>
              <View style={[modalStyles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[modalStyles.statLabel, { color: colors.textMuted }]}>Sommeil Moy.</Text>
                <Text style={[modalStyles.statValue, { color: '#10B981' }]}>
                  {avgSleep.toFixed(1)}h
                </Text>
                <View style={modalStyles.zoneIndicator}>
                  <CircleIcon
                    size={10}
                    fill={avgSleep >= 7 && avgSleep <= 9 ? '#10B981' : '#F59E0B'}
                    color={avgSleep >= 7 && avgSleep <= 9 ? '#10B981' : '#F59E0B'}
                  />
                  <Text style={[modalStyles.statHint, { color: colors.textMuted }]}>
                    {avgSleep >= 7 && avgSleep <= 9 ? 'Optimale' : avgSleep < 7 ? 'Faible' : 'Élevée'}
                  </Text>
                </View>
              </View>
              <View style={[modalStyles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[modalStyles.statLabel, { color: colors.textMuted }]}>Ratio Effort/Repos</Text>
                <Text style={[modalStyles.statValue, { color: '#8B5CF6' }]}>
                  {workRestRatio}:1
                </Text>
                <Text style={[modalStyles.statHint, { color: colors.textMuted }]}>charge/sommeil</Text>
              </View>
              <View style={[modalStyles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[modalStyles.statLabel, { color: colors.textMuted }]}>Bon Sommeil</Text>
                <Text style={[modalStyles.statValue, { color: '#10B981' }]}>
                  {goodSleepPercent}%
                </Text>
                <Text style={[modalStyles.statHint, { color: colors.textMuted }]}>7-9h ({goodSleepDays}/7j)</Text>
              </View>
            </View>

            {/* Graphique combiné */}
            <View style={[modalStyles.chartCard, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[modalStyles.chartTitle, { color: colors.textPrimary }]}>
                Évolution sur 7 jours
              </Text>
              <Text style={[modalStyles.chartSubtitle, { color: colors.textMuted }]}>
                Les zones colorées indiquent la qualité du sommeil
              </Text>

              <View style={modalStyles.chart}>
                <Svg width={chartWidth} height={MODAL_CHART_HEIGHT}>
                  <Defs>
                    <LinearGradient id="trainingGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.3" />
                      <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0.05" />
                    </LinearGradient>
                    <LinearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor="#10B981" stopOpacity="0.3" />
                      <Stop offset="1" stopColor="#10B981" stopOpacity="0.05" />
                    </LinearGradient>
                  </Defs>

                  {/* Zones de sommeil colorées (en fond) */}
                  {/* Zone Rouge (<6h) - Sommeil insuffisant */}
                  <Rect
                    x={MODAL_PADDING_LEFT}
                    y={MODAL_PADDING_TOP + ((MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * 0)}
                    width={chartWidth - MODAL_PADDING_LEFT - MODAL_PADDING_RIGHT}
                    height={(MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * 0.4}
                    fill="#EF4444"
                    opacity={0.08}
                  />
                  {/* Zone Orange (6-7h) - Sommeil faible */}
                  <Rect
                    x={MODAL_PADDING_LEFT}
                    y={MODAL_PADDING_TOP + ((MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * 0.4)}
                    width={chartWidth - MODAL_PADDING_LEFT - MODAL_PADDING_RIGHT}
                    height={(MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * 0.1}
                    fill="#F59E0B"
                    opacity={0.08}
                  />
                  {/* Zone Verte (7-9h) - Sommeil optimal */}
                  <Rect
                    x={MODAL_PADDING_LEFT}
                    y={MODAL_PADDING_TOP + ((MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * 0.5)}
                    width={chartWidth - MODAL_PADDING_LEFT - MODAL_PADDING_RIGHT}
                    height={(MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * 0.2}
                    fill="#10B981"
                    opacity={0.12}
                  />
                  {/* Zone Orange (9-10h) - Sommeil élevé */}
                  <Rect
                    x={MODAL_PADDING_LEFT}
                    y={MODAL_PADDING_TOP + ((MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * 0.7)}
                    width={chartWidth - MODAL_PADDING_LEFT - MODAL_PADDING_RIGHT}
                    height={(MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * 0.1}
                    fill="#F59E0B"
                    opacity={0.08}
                  />
                  {/* Zone Rouge (>10h) - Sommeil excessif */}
                  <Rect
                    x={MODAL_PADDING_LEFT}
                    y={MODAL_PADDING_TOP + ((MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * 0.8)}
                    width={chartWidth - MODAL_PADDING_LEFT - MODAL_PADDING_RIGHT}
                    height={(MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * 0.2}
                    fill="#EF4444"
                    opacity={0.08}
                  />

                  {/* Lignes de grille */}
                  {[0, 1, 2, 3, 4].map((i) => {
                    const y = MODAL_PADDING_TOP + ((MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM) * i) / 4;
                    return (
                      <Rect
                        key={i}
                        x={MODAL_PADDING_LEFT}
                        y={y}
                        width={chartWidth - MODAL_PADDING_LEFT - MODAL_PADDING_RIGHT}
                        height={1}
                        fill={colors.border}
                        opacity={0.3}
                      />
                    );
                  })}

                  {/* Ligne d'entraînement */}
                  <Path
                    d={createTrainingPath()}
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Ligne de sommeil */}
                  <Path
                    d={createSleepPath()}
                    stroke="#10B981"
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Points d'entraînement */}
                  {chartData.map((point, index) => (
                    <React.Fragment key={`training-${index}`}>
                      <Circle cx={point.x} cy={point.trainingY} r={6} fill="#FFFFFF" />
                      <Circle cx={point.x} cy={point.trainingY} r={4} fill="#8B5CF6" />
                    </React.Fragment>
                  ))}

                  {/* Points de sommeil */}
                  {chartData.map((point, index) => (
                    <React.Fragment key={`sleep-${index}`}>
                      <Circle cx={point.x} cy={point.sleepY} r={6} fill="#FFFFFF" />
                      <Circle cx={point.x} cy={point.sleepY} r={4} fill="#10B981" />
                    </React.Fragment>
                  ))}
                </Svg>

                {/* Labels Y */}
                <View style={modalStyles.yLabels}>
                  {yLabels.map((label, index) => (
                    <Text key={index} style={[modalStyles.yLabel, { color: colors.textMuted }]}>
                      {label}
                    </Text>
                  ))}
                </View>

                {/* Labels X */}
                <View style={modalStyles.xLabels}>
                  {chartData.map((point, index) => (
                    <View key={index} style={[modalStyles.xLabel, { left: point.x - 30 }]}>
                      <Text style={[modalStyles.xLabelText, { color: colors.textMuted }]} numberOfLines={1}>
                        {days[index].substring(0, 3)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Valeurs au-dessus des points d'entraînement */}
                {chartData.map((point, index) => (
                  point.training > 0 && (
                    <View key={`training-value-${index}`} style={[modalStyles.valueLabel, { left: point.x - 20, top: point.trainingY - 28 }]}>
                      <Text style={[modalStyles.valueLabelText, { color: '#8B5CF6', backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                        {point.training.toFixed(1)}
                      </Text>
                    </View>
                  )
                ))}

                {/* Valeurs au-dessus des points de sommeil */}
                {chartData.map((point, index) => (
                  point.sleep > 0 && (
                    <View key={`sleep-value-${index}`} style={[modalStyles.valueLabel, { left: point.x - 20, top: point.sleepY + 12 }]}>
                      <Text style={[modalStyles.valueLabelText, { color: '#10B981', backgroundColor: 'rgba(255,255,255,0.95)' }]}>
                        {point.sleep.toFixed(1)}h
                      </Text>
                    </View>
                  )
                ))}
              </View>

              {/* Légende */}
              <View style={modalStyles.legend}>
                <View style={modalStyles.legendItem}>
                  <View style={[modalStyles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                  <Text style={[modalStyles.legendText, { color: colors.textMuted }]}>Charge d'effort</Text>
                </View>
                <View style={modalStyles.legendItem}>
                  <View style={[modalStyles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={[modalStyles.legendText, { color: colors.textMuted }]}>Heures de repos</Text>
                </View>
              </View>
            </View>

            {/* Liste détaillée */}
            <View style={[modalStyles.listCard, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[modalStyles.listTitle, { color: colors.textPrimary }]}>
                Détails par jour
              </Text>
              {days.map((day, index) => (
                <View
                  key={index}
                  style={[
                    modalStyles.listItem,
                    index < days.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[modalStyles.listDay, { color: colors.textSecondary }]}>{day}</Text>
                  <View style={modalStyles.listValues}>
                    <View style={modalStyles.listValueItem}>
                      <Text style={[modalStyles.listValueLabel, { color: colors.textMuted }]}>Charge:</Text>
                      <Text style={[modalStyles.listValue, { color: '#8B5CF6' }]}>
                        {trainingData[index].toFixed(1)}
                      </Text>
                    </View>
                    <View style={modalStyles.listValueItem}>
                      <Text style={[modalStyles.listValueLabel, { color: colors.textMuted }]}>Repos:</Text>
                      <Text style={[modalStyles.listValue, { color: '#10B981' }]}>
                        {sleepData[index].toFixed(1)}h
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    height: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  balanceHeader: {
    marginBottom: 12,
  },
  balanceStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  balanceStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceMessage: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  balanceAdviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  balanceAdvice: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  zoneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: CONTAINER_PADDING,
    marginBottom: 20,
  },
  statCard: {
    width: STATS_CARD_WIDTH,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: STATS_GAP,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  statHint: {
    fontSize: 10,
    textAlign: 'center',
  },
  chartCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  chart: {
    height: MODAL_CHART_HEIGHT,
    position: 'relative',
  },
  yLabels: {
    position: 'absolute',
    left: 0,
    top: MODAL_PADDING_TOP,
    height: MODAL_CHART_HEIGHT - MODAL_PADDING_TOP - MODAL_PADDING_BOTTOM,
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
    height: MODAL_PADDING_BOTTOM,
  },
  xLabel: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
    top: 8,
  },
  xLabelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  valueLabel: {
    position: 'absolute',
    width: 40,
    alignItems: 'center',
  },
  valueLabelText: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  listItem: {
    paddingVertical: 12,
  },
  listDay: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  listValues: {
    flexDirection: 'row',
    gap: 20,
  },
  listValueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listValueLabel: {
    fontSize: 12,
  },
  listValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});

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
    const historyDays = getHistoryDays(); // 3 sur iPhone, 7 sur iPad
    const lastThreeTraining = weeklyTrainingData.slice(-historyDays);
    const lastThreeSleep = sleepHours.slice(-historyDays);

    const trainingTrend = lastThreeTraining[historyDays-1] > lastThreeTraining[0];
    const sleepTrend = lastThreeSleep[historyDays-1] < lastThreeSleep[0];
    
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
      value: totalCharge || 0,
      unit: 'pts',
    },
    {
      key: 'ratio',
      label: 'Ratio Effort/Repos',
      icon: <Activity size={18} color="#8B5CF6" />,
      color: '#8B5CF6',
      value: parseFloat(workRestRatio) || 0,
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
                {card.value && card.value > 0 ? card.value.toFixed(card.key === 'ratio' ? 1 : 0) : '--'}
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
            {totalCharge || 0}
            <Text style={[styles.chargeUnit, { color: colors.textMuted }]}> pts</Text>
          </Text>
          <View style={styles.chargeComparison}>
            <Text style={[styles.chargeAverage, { color: colors.textMuted }]}>
              Moy. 4 sem : {averageCharge || 0} pts
            </Text>
            <Text style={[
              styles.chargeVariation,
              { color: Number(chargeVariation) > 20 ? '#EF4444' : Number(chargeVariation) > 0 ? '#F59E0B' : '#10B981' }
            ]}>
              {Number(chargeVariation) > 0 ? '+' : ''}{chargeVariation}%
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
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]} numberOfLines={2}>Ratio Effort/Repos</Text>
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
        {/* Expand icon - À DROITE */}
        <View style={styles.expandIconWorkRest}>
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
              Attention : Tu t'entraînes plus mais tu dors moins. Risque de surmenage !
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
        <WorkRestModal
          visible={selectedStat !== null}
          onClose={() => setSelectedStat(null)}
          trainingData={weeklyTrainingData}
          sleepData={sleepHours}
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
  chargeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  expandIconWorkRest: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 4,
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
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  intensityBar: {
    height: '100%',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
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

