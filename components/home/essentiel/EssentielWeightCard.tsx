import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Scale, TrendingUp, TrendingDown, Minus, BarChart3, Target } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface EssentielWeightCardProps {
  currentWeight?: number;
  objective?: number;
  weekData?: number[];
  weekLabels?: string[];
  trend?: 'up' | 'down' | 'stable';
  onAddWeight?: () => void;
  onViewStats?: () => void;
}

export const EssentielWeightCard: React.FC<EssentielWeightCardProps> = ({
  currentWeight,
  objective,
  weekData = [],
  weekLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  trend = 'stable',
  onAddWeight,
  onViewStats,
}) => {
  const { colors } = useTheme();

  const minWeight = weekData.length > 0 ? Math.min(...weekData) : 0;
  const maxWeight = weekData.length > 0 ? Math.max(...weekData) : 0;

  const getTrendInfo = () => {
    switch(trend) {
      case 'up': return { label: 'EN HAUSSE', color: '#F59E0B', Icon: TrendingUp };
      case 'down': return { label: 'EN BAISSE', color: '#10B981', Icon: TrendingDown };
      default: return { label: 'STABLE', color: '#3B82F6', Icon: Minus };
    }
  };

  const trendInfo = getTrendInfo();
  const TrendIcon = trendInfo.Icon;

  // Calculer la hauteur des barres
  const getBarHeight = (weight: number) => {
    if (weekData.length === 0) return 0;
    const range = maxWeight - minWeight || 1;
    return ((weight - minWeight) / range) * 50 + 12;
  };

  // Calcul des prédictions à 7, 30 et 90 jours
  const calculatePredictions = () => {
    // Il faut au moins 2 pesées pour faire une prédiction
    if (!weekData || weekData.length < 2) return null;

    // Prendre les données récentes (max 7 jours)
    const recent = weekData.slice(0, Math.min(7, weekData.length));

    // Le poids le plus ancien et le plus récent
    const oldestWeight = recent[recent.length - 1];
    const newestWeight = recent[0];

    // Nombre de jours écoulés (si on a 7 mesures = 6 jours d'écart)
    const daysDiff = recent.length - 1;

    // Éviter division par zéro
    if (daysDiff === 0 || oldestWeight === newestWeight) return null;

    // Variation moyenne par jour
    const dailyChange = (newestWeight - oldestWeight) / daysDiff;

    // Si variation très faible, considérer comme stable
    if (Math.abs(dailyChange) < 0.01) return null;

    // Calculer les prédictions pour 7, 30 et 90 jours
    const predictions = [
      { days: 7, label: '7j' },
      { days: 30, label: '30j' },
      { days: 90, label: '90j' },
    ].map(({ days, label }) => {
      const prediction = dailyChange * days;
      const predictedWeight = (currentWeight ?? 0) + prediction;
      const sign = prediction > 0 ? '+' : '';
      const color = prediction > 0 ? '#F59E0B' : '#10B981';

      return {
        label,
        change: `${sign}${prediction.toFixed(1)}`,
        predictedWeight: predictedWeight.toFixed(1),
        color,
      };
    });

    return predictions;
  };

  const predictions = calculatePredictions();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Scale size={20} color="#EF4444" />
          <Text style={styles.title}>POIDS ACTUEL</Text>
        </View>
        <TouchableOpacity style={styles.chartButton} onPress={onViewStats}>
          <BarChart3 size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Poids principal - GRAND */}
      <View style={styles.weightContainer}>
        <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
          {currentWeight != null && currentWeight > 0 ? currentWeight.toFixed(1) : '--.-'}
        </Text>
        <Text style={[styles.weightUnit, { color: colors.textMuted }]}>kg</Text>
      </View>

      {/* Badge tendance */}
      <View style={[styles.trendBadge, { backgroundColor: `${trendInfo.color}15` }]}>
        <TrendIcon size={16} color={trendInfo.color} />
        <Text style={[styles.trendText, { color: trendInfo.color }]}>
          {trendInfo.label}
        </Text>
      </View>

      {/* Graphique 7 jours - Barres simples */}
      {weekData.length > 0 && (
        <View style={styles.chartContainer}>
          <View style={styles.barsContainer}>
            {weekData.slice(0, 7).map((weight, index) => (
              <View key={index} style={styles.barColumn}>
                <Text style={[styles.barValue, { color: colors.textMuted }]}>
                  {weight.toFixed(1)}
                </Text>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: getBarHeight(weight),
                        backgroundColor: index === weekData.length - 1 ? '#EF4444' : `${colors.accent}50`,
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: index === weekData.length - 1 ? '#EF4444' : colors.textMuted }]}>
                  {weekLabels[index]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Stats Min/Objectif/Max */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Min</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {minWeight > 0 ? minWeight.toFixed(1) : '--.-'} kg
          </Text>
        </View>

        {objective && (
          <View style={styles.statItem}>
            <Target size={14} color="#EF4444" />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Objectif</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{objective} kg</Text>
          </View>
        )}

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Max</Text>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            {maxWeight > 0 ? maxWeight.toFixed(1) : '--.-'} kg
          </Text>
        </View>
      </View>

      {/* Prédictions 7j / 30j / 90j */}
      {predictions && (
        <View style={styles.predictionsSection}>
          <View style={styles.predictionsTitleRow}>
            <TrendingUp size={12} color={colors.textMuted} strokeWidth={2.5} />
            <Text style={[styles.predictionsTitle, { color: colors.textMuted }]}>
              PRÉDICTIONS
            </Text>
          </View>
          <View style={styles.predictionsRow}>
            {predictions.map((pred, index) => (
              <View key={index} style={[styles.predictionCard, { backgroundColor: `${pred.color}15` }]}>
                <Text style={[styles.predictionLabel, { color: colors.textMuted }]}>
                  {pred.label}
                </Text>
                <Text style={[styles.predictionChange, { color: pred.color }]}>
                  {pred.change} kg
                </Text>
                <Text style={[styles.predictionWeight, { color: colors.textPrimary }]}>
                  {pred.predictedWeight} kg
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bouton Ajouter */}
      <TouchableOpacity style={styles.addButton} onPress={onAddWeight}>
        <Text style={styles.addButtonText}>+ Nouvelle pesée</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    letterSpacing: 1,
  },
  chartButton: {
    padding: 4,
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: 2,
  },
  weightValue: {
    fontSize: 44,
    fontWeight: '700',
  },
  weightUnit: {
    fontSize: 20,
    fontWeight: '500',
    marginLeft: 8,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
    marginBottom: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  chartContainer: {
    marginVertical: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 75,
    paddingHorizontal: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    width: '70%',
    maxWidth: 24,
    borderRadius: 4,
    minHeight: 20,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  predictionsSection: {
    marginTop: 12,
    paddingTop: 8,
  },
  predictionsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  predictionsTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  predictionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  predictionCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  predictionLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  predictionChange: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  predictionWeight: {
    fontSize: 11,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
