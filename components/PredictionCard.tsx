import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import {
  TrendingDown,
  TrendingUp,
  Target,
  Calendar,
  ChevronRight,
  X,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Clock,
  Minus,
} from 'lucide-react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { Card } from '@/components/ui/Card';
import { calculatePrediction, PredictionResult, PredictionPoint } from '@/lib/prediction';

// ============================================
// COMPOSANT PREDICTION DE POIDS
// ============================================

const { width: screenWidth } = Dimensions.get('window');
const CHART_WIDTH = screenWidth - 80;
const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 20, right: 20, bottom: 30, left: 50 };

interface PredictionCardProps {
  onRefresh?: () => void;
  compact?: boolean;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  onRefresh,
  compact = false,
}) => {
  const { colors } = useTheme();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPrediction();
  }, []);

  const loadPrediction = async () => {
    setLoading(true);
    try {
      const result = await calculatePrediction();
      setPrediction(result);
    } catch (error) {
      console.error('Erreur chargement prediction:', error);
    }
    setLoading(false);
  };

  // Ne pas afficher si pas assez de donnees
  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Calcul des predictions...
          </Text>
        </View>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card style={styles.card}>
        <View style={styles.emptyContainer}>
          <Target size={32} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            Predictions indisponibles
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Ajoute plus de pesees et definis un objectif pour voir tes predictions.
          </Text>
        </View>
      </Card>
    );
  }

  // Determiner l'icone de tendance
  const getTrendIcon = () => {
    if (prediction.isLosingWeight) {
      return <TrendingDown size={20} color={colors.success} />;
    }
    if (prediction.isGainingWeight) {
      return <TrendingUp size={20} color={colors.danger} />;
    }
    return <Minus size={20} color={colors.warning} />;
  };

  const getTrendColor = () => {
    if (prediction.isLosingWeight) return colors.success;
    if (prediction.isGainingWeight) return colors.danger;
    return colors.warning;
  };

  // Version compacte
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.compactIcon, { backgroundColor: colors.goldMuted }]}>
          <Target size={22} color={colors.gold} />
        </View>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: colors.textPrimary }]}>
            Prediction
          </Text>
          <Text style={[styles.compactSubtitle, { color: colors.textSecondary }]}>
            {prediction.remaining > 0
              ? `Objectif dans ${prediction.dateLabel}`
              : 'Objectif atteint !'}
          </Text>
        </View>
        <View style={styles.compactStats}>
          {getTrendIcon()}
          <Text style={[styles.compactLoss, { color: getTrendColor() }]}>
            {prediction.weeklyLoss > 0 ? '-' : '+'}{Math.abs(prediction.weeklyLoss).toFixed(1)}/sem
          </Text>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <>
      <Card style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.goldMuted }]}>
            <Target size={24} color={colors.gold} />
          </View>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Prediction
            </Text>
            <View style={styles.confidenceBadge}>
              <Text style={[styles.confidenceText, { color: colors.textMuted }]}>
                Confiance : {prediction.confidence === 'high' ? 'Haute' : prediction.confidence === 'medium' ? 'Moyenne' : 'Faible'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.detailButton, { backgroundColor: colors.goldMuted }]}
            onPress={() => setShowModal(true)}
          >
            <BarChart3 size={18} color={colors.gold} />
          </TouchableOpacity>
        </View>

        {/* Stats principales */}
        <View style={styles.mainStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Actuel</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {prediction.currentWeight} kg
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Objectif</Text>
            <Text style={[styles.statValue, { color: colors.gold }]}>
              {prediction.targetWeight} kg
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Reste</Text>
            <Text style={[styles.statValue, { color: prediction.remaining > 0 ? colors.textPrimary : colors.success }]}>
              {prediction.remaining > 0 ? `${prediction.remaining.toFixed(1)} kg` : 'Atteint !'}
            </Text>
          </View>
        </View>

        {/* Tendance */}
        <View style={[styles.trendCard, { backgroundColor: getTrendColor() + '15' }]}>
          {getTrendIcon()}
          <Text style={[styles.trendText, { color: getTrendColor() }]}>
            {prediction.isLosingWeight
              ? `Perte moyenne : ${prediction.weeklyLoss.toFixed(2)} kg/semaine`
              : prediction.isGainingWeight
              ? `Prise moyenne : ${Math.abs(prediction.weeklyLoss).toFixed(2)} kg/semaine`
              : 'Poids stable'}
          </Text>
        </View>

        {/* Predictions */}
        {prediction.remaining > 0 && prediction.isLosingWeight && (
          <View style={styles.predictions}>
            <Text style={[styles.predictionsTitle, { color: colors.textSecondary }]}>
              Si tu continues comme ca :
            </Text>
            <View style={styles.predictionsList}>
              <View style={styles.predictionItem}>
                <Clock size={14} color={colors.textMuted} />
                <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>
                  Dans 1 mois
                </Text>
                <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                  ~{Math.max(prediction.in1Month, prediction.targetWeight).toFixed(1)} kg
                </Text>
              </View>
              <View style={styles.predictionItem}>
                <Clock size={14} color={colors.textMuted} />
                <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>
                  Dans 3 mois
                </Text>
                <Text style={[styles.predictionValue, { color: colors.textPrimary }]}>
                  ~{Math.max(prediction.in3Months, prediction.targetWeight).toFixed(1)} kg
                </Text>
              </View>
              <View style={styles.predictionItem}>
                <Calendar size={14} color={colors.gold} />
                <Text style={[styles.predictionLabel, { color: colors.gold }]}>
                  Objectif {prediction.targetWeight} kg
                </Text>
                <Text style={[styles.predictionValue, { color: colors.gold }]}>
                  {prediction.dateLabel}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Avertissements */}
        {prediction.warnings.length > 0 && (
          <View style={[styles.warningCard, { backgroundColor: colors.warningMuted }]}>
            <AlertTriangle size={18} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              {prediction.warnings[0]}
            </Text>
          </View>
        )}

        {/* Voir la courbe */}
        <TouchableOpacity
          style={[styles.chartButton, { borderColor: colors.border }]}
          onPress={() => setShowModal(true)}
        >
          <BarChart3 size={18} color={colors.gold} />
          <Text style={[styles.chartButtonText, { color: colors.gold }]}>
            Voir la courbe predite
          </Text>
          <ChevronRight size={18} color={colors.gold} />
        </TouchableOpacity>
      </Card>

      {/* Modal Detaille */}
      <PredictionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        prediction={prediction}
      />
    </>
  );
};

// ============================================
// MODAL AVEC GRAPHIQUE
// ============================================

interface PredictionModalProps {
  visible: boolean;
  onClose: () => void;
  prediction: PredictionResult;
}

const PredictionModal: React.FC<PredictionModalProps> = ({
  visible,
  onClose,
  prediction,
}) => {
  const { colors } = useTheme();

  // Combiner donnees historiques et predictions pour le graphique
  const chartData = useMemo(() => {
    const historical = prediction.historicalData.slice(-30); // 30 derniers jours
    const predictions = prediction.predictionCurve.slice(0, 12); // 12 prochaines semaines

    return { historical, predictions };
  }, [prediction]);

  // Calculer les dimensions du graphique
  const allWeights = [
    ...chartData.historical.map(d => d.weight),
    ...chartData.predictions.map(d => d.weight),
    prediction.targetWeight,
  ];

  const minWeight = Math.min(...allWeights) - 2;
  const maxWeight = Math.max(...allWeights) + 2;

  const getX = (index: number, total: number) => {
    return CHART_PADDING.left + (index / Math.max(1, total - 1)) * (CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right);
  };

  const getY = (weight: number) => {
    const range = maxWeight - minWeight;
    return CHART_PADDING.top + ((maxWeight - weight) / range) * (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom);
  };

  // Generer le path pour les donnees historiques
  const historicalPath = useMemo(() => {
    if (chartData.historical.length < 2) return '';

    return chartData.historical.map((point, i) => {
      const x = getX(i, chartData.historical.length);
      const y = getY(point.weight);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  }, [chartData.historical, minWeight, maxWeight]);

  // Generer le path pour les predictions (pointilles)
  const predictionPath = useMemo(() => {
    if (chartData.predictions.length < 2) return '';

    const startX = getX(chartData.historical.length - 1, chartData.historical.length);
    const startY = getY(prediction.currentWeight);

    const points = chartData.predictions.map((point, i) => {
      const x = getX(chartData.historical.length + i, chartData.historical.length + chartData.predictions.length);
      const y = getY(point.weight);
      return `L ${x} ${y}`;
    }).join(' ');

    return `M ${startX} ${startY} ${points}`;
  }, [chartData, minWeight, maxWeight, prediction.currentWeight]);

  // Ligne objectif
  const targetY = getY(prediction.targetWeight);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            Courbe de Prediction
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Graphique */}
          <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
              Evolution et Projection
            </Text>

            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="gradientHistorical" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={colors.gold} stopOpacity="0.3" />
                  <Stop offset="100%" stopColor={colors.gold} stopOpacity="0" />
                </LinearGradient>
              </Defs>

              {/* Grille horizontale */}
              {[0, 1, 2, 3, 4].map((i) => {
                const y = CHART_PADDING.top + (i / 4) * (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom);
                const weight = maxWeight - (i / 4) * (maxWeight - minWeight);
                return (
                  <React.Fragment key={i}>
                    <Line
                      x1={CHART_PADDING.left}
                      y1={y}
                      x2={CHART_WIDTH - CHART_PADDING.right}
                      y2={y}
                      stroke={colors.border}
                      strokeWidth={1}
                      strokeDasharray="4,4"
                    />
                    <SvgText
                      x={CHART_PADDING.left - 8}
                      y={y + 4}
                      fill={colors.textMuted}
                      fontSize={10}
                      textAnchor="end"
                    >
                      {weight.toFixed(0)}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* Ligne objectif */}
              <Line
                x1={CHART_PADDING.left}
                y1={targetY}
                x2={CHART_WIDTH - CHART_PADDING.right}
                y2={targetY}
                stroke={colors.success}
                strokeWidth={2}
                strokeDasharray="8,4"
              />
              <SvgText
                x={CHART_WIDTH - CHART_PADDING.right + 5}
                y={targetY + 4}
                fill={colors.success}
                fontSize={10}
              >
                {prediction.targetWeight}
              </SvgText>

              {/* Courbe historique */}
              {historicalPath && (
                <Path
                  d={historicalPath}
                  stroke={colors.gold}
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Courbe prediction (pointilles) */}
              {predictionPath && (
                <Path
                  d={predictionPath}
                  stroke={colors.info}
                  strokeWidth={2}
                  fill="none"
                  strokeDasharray="6,4"
                  strokeLinecap="round"
                />
              )}

              {/* Point actuel */}
              <Circle
                cx={getX(chartData.historical.length - 1, chartData.historical.length)}
                cy={getY(prediction.currentWeight)}
                r={6}
                fill={colors.gold}
              />
            </Svg>

            {/* Legende */}
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.gold }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>
                  Historique
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLineDashed, { borderColor: colors.info }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>
                  Prediction
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLineDashed, { borderColor: colors.success }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>
                  Objectif
                </Text>
              </View>
            </View>
          </View>

          {/* Scenarios */}
          {prediction.scenarios.length > 0 && (
            <View style={[styles.scenariosCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.scenariosTitle, { color: colors.textPrimary }]}>
                Scenarios
              </Text>

              {prediction.scenarios.map((scenario, index) => (
                <View
                  key={index}
                  style={[
                    styles.scenarioItem,
                    index < prediction.scenarios.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }
                  ]}
                >
                  <View style={styles.scenarioHeader}>
                    <Text style={[
                      styles.scenarioLabel,
                      { color: scenario.label === 'Actuel' ? colors.gold : colors.textSecondary }
                    ]}>
                      {scenario.label}
                    </Text>
                    <Text style={[styles.scenarioLoss, { color: colors.textMuted }]}>
                      -{scenario.weeklyLoss.toFixed(2)} kg/sem
                    </Text>
                  </View>
                  <Text style={[styles.scenarioDate, { color: colors.textPrimary }]}>
                    Objectif atteint en {scenario.dateLabel}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Tips */}
          {prediction.tips.length > 0 && (
            <View style={[styles.tipsCard, { backgroundColor: colors.infoMuted }]}>
              <Lightbulb size={20} color={colors.info} />
              <View style={styles.tipsContent}>
                {prediction.tips.map((tip, index) => (
                  <Text key={index} style={[styles.tipText, { color: colors.info }]}>
                    {tip}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Avertissements */}
          {prediction.warnings.length > 0 && (
            <View style={[styles.warningsCard, { backgroundColor: colors.warningMuted }]}>
              <AlertTriangle size={20} color={colors.warning} />
              <View style={styles.warningsContent}>
                {prediction.warnings.map((warning, index) => (
                  <Text key={index} style={[styles.warningText, { color: colors.warning }]}>
                    {warning}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardHover }]}>
            <Text style={[styles.infoTitle, { color: colors.textSecondary }]}>
              Comment ca marche ?
            </Text>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              La prediction est basee sur une regression lineaire de tes {prediction.dataPoints} dernieres pesees.
              Plus tu as de donnees, plus la prediction est fiable.
            </Text>
            <Text style={[styles.infoNote, { color: colors.textMuted }]}>
              100% calcul local - aucune IA externe
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const RADIUS = { sm: 8, md: 12, lg: 16 };

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  confidenceBadge: {
    marginTop: 2,
  },
  confidenceText: {
    fontSize: 12,
  },
  detailButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main Stats
  mainStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 30,
  },

  // Trend Card
  trendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Predictions
  predictions: {
    marginBottom: 16,
  },
  predictionsTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  predictionsList: {
    gap: 8,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  predictionLabel: {
    flex: 1,
    fontSize: 13,
  },
  predictionValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Warning Card
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Chart Button
  chartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  chartButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Compact
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  compactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  compactSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  compactStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactLoss: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
  },

  // Chart Container
  chartContainer: {
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  legendLineDashed: {
    width: 20,
    height: 0,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 12,
  },

  // Scenarios
  scenariosCard: {
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 20,
  },
  scenariosTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  scenarioItem: {
    paddingVertical: 12,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scenarioLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  scenarioLoss: {
    fontSize: 13,
  },
  scenarioDate: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Tips
  tipsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 16,
  },
  tipsContent: {
    flex: 1,
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Warnings
  warningsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 16,
  },
  warningsContent: {
    flex: 1,
    gap: 8,
  },

  // Info
  infoCard: {
    padding: 16,
    borderRadius: RADIUS.lg,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  infoNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default PredictionCard;
