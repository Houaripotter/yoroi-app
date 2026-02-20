import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Target, ArrowRight, Activity } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

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
  const { colors, isDark } = useTheme();

  // Animations SPECTACULAIRES
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const barAnimations = useRef(weekData.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Animation d'entrée explosive
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 120,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 18,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation glow continue (opacity supporté par useNativeDriver)
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glow.start();

    // Animations des barres en cascade
    const animations = barAnimations.map((anim, i) =>
      Animated.spring(anim, {
        toValue: 1,
        delay: i * 100,
        damping: 12,
        stiffness: 100,
        useNativeDriver: true,
      })
    );
    Animated.stagger(80, animations).start();

    return () => {
      glow.stop();
    };
  }, [weekData, currentWeight]);

  const minWeight = weekData.length > 0 ? Math.min(...weekData) : 0;
  const maxWeight = weekData.length > 0 ? Math.max(...weekData) : 0;

  const getTrendInfo = () => {
    switch(trend) {
      case 'up': return { label: 'EN HAUSSE', color: '#EF4444', Icon: TrendingUp };
      case 'down': return { label: 'EN BAISSE', color: '#10B981', Icon: TrendingDown };
      default: return { label: 'STABLE', color: '#F59E0B', Icon: Minus };
    }
  };

  const trendInfo = getTrendInfo();
  const TrendIcon = trendInfo.Icon;

  // Couleurs spectaculaires
  const primaryColor = isDark ? '#818CF8' : '#6366F1';
  const secondaryColor = isDark ? '#A78BFA' : '#8B5CF6';
  const accentColor = isDark ? '#EC4899' : '#F97316';
  const mutedColor = isDark ? '#64748B' : '#94A3B8';

  // Données pour le graphique - toujours afficher quelque chose !
  const chartData = weekData.length > 0 ? weekData.slice(0, 7) : [70, 72, 71, 73, 75, 74, 76];
  const labels = weekLabels.slice(0, chartData.length);

  // Animation opacity glow
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

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

  // Calcul des points pour le graphique ligne
  const linePoints = chartData.length > 1 && maxWeight > minWeight
    ? chartData.map((weight, i) => {
        const x = chartData.length > 1 ? (i / (chartData.length - 1)) * 100 : 50;
        const y = 100 - ((weight - minWeight) / (maxWeight - minWeight || 1)) * 80;
        return { x, y };
      })
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Dégradé subtil de fond */}
      <View style={styles.gradientOverlay}>
        <LinearGradient
          colors={isDark
            ? ['rgba(129, 140, 248, 0.08)', 'rgba(129, 140, 248, 0)']
            : ['rgba(99, 102, 241, 0.05)', 'rgba(99, 102, 241, 0)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Header minimaliste */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Activity size={20} color={mutedColor} strokeWidth={2.5} />
          <Text style={[styles.title, { color: mutedColor }]}>POIDS</Text>
        </View>
        <TouchableOpacity style={styles.statsButton} onPress={onViewStats}>
          <Text style={[styles.statsButtonText, { color: accentColor }]}>Statistiques</Text>
          <ArrowRight size={16} color={accentColor} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Section principale - Poids et tendance */}
      <View style={styles.mainSection}>
        <View style={styles.weightRow}>
          <View style={styles.weightContainer}>
            <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
              {currentWeight != null && currentWeight > 0 ? currentWeight.toFixed(1) : '--.-'}
            </Text>
            <Text style={[styles.weightUnit, { color: mutedColor }]}>kg</Text>
          </View>

          {/* Badge tendance */}
          {trend !== 'stable' && (
            <View style={[styles.trendBadge, { backgroundColor: `${trendInfo.color}15` }]}>
              <TrendIcon size={18} color={trendInfo.color} strokeWidth={2.5} />
              <Text style={[styles.trendText, { color: trendInfo.color }]}>
                {trendInfo.label}
              </Text>
            </View>
          )}
        </View>

        {/* Objectif */}
        {objective && (
          <View style={styles.objectiveRow}>
            <Target size={16} color={mutedColor} strokeWidth={2.5} />
            <Text style={[styles.objectiveLabel, { color: mutedColor }]}>
              Objectif
            </Text>
            <Text style={[styles.objectiveValue, { color: colors.textPrimary }]}>
              {objective} kg
            </Text>
            {currentWeight != null && currentWeight > 0 && (
              <View style={[styles.diffBadge, { backgroundColor: `${trendInfo.color}15` }]}>
                <Text style={[styles.diffText, { color: trendInfo.color }]}>
                  {currentWeight - objective > 0 ? '+' : ''}{(currentWeight - objective).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Graphique ligne moderne */}
      {linePoints.length > 1 && (
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: mutedColor }]}>Évolution 7 jours</Text>
            <View style={styles.minMaxLabels}>
              <Text style={[styles.minMaxText, { color: mutedColor }]}>
                {minWeight.toFixed(1)} kg
              </Text>
              <Text style={[styles.minMaxText, { color: mutedColor }]}>
                {maxWeight.toFixed(1)} kg
              </Text>
            </View>
          </View>

          <View style={styles.chartArea}>
            {/* Ligne de base */}
            <View style={[styles.baseLine, { backgroundColor: `${accentColor}10` }]} />

            {/* Courbe */}
            <View style={styles.lineChart}>
              {linePoints.map((point, i) => {
                if (i === 0) return null;
                const prevPoint = linePoints[i - 1];
                const width = Math.sqrt(
                  Math.pow((point.x - prevPoint.x), 2) +
                  Math.pow((point.y - prevPoint.y), 2)
                );
                const angle = Math.atan2(
                  point.y - prevPoint.y,
                  point.x - prevPoint.x
                ) * (180 / Math.PI);

                return (
                  <View
                    key={i}
                    style={[
                      styles.lineSegment,
                      {
                        width: `${width}%`,
                        left: `${prevPoint.x}%`,
                        top: `${prevPoint.y}%`,
                        transform: [{ rotate: `${angle}deg` }],
                        backgroundColor: accentColor,
                      }
                    ]}
                  />
                );
              })}

              {/* Points sur la ligne */}
              {linePoints.map((point, i) => (
                <View
                  key={`point-${i}`}
                  style={[
                    styles.linePoint,
                    {
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      backgroundColor: i === linePoints.length - 1 ? accentColor : colors.backgroundCard,
                      borderColor: accentColor,
                      borderWidth: i === linePoints.length - 1 ? 0 : 2,
                      transform: [{ scale: i === linePoints.length - 1 ? 1.2 : 0.8 }],
                    }
                  ]}
                />
              ))}
            </View>

            {/* Labels des jours */}
            <View style={styles.daysLabels}>
              {weekLabels.slice(0, Math.min(7, weekData.length)).map((day, i) => (
                <Text
                  key={i}
                  style={[
                    styles.dayLabel,
                    {
                      color: i === weekData.length - 1 ? accentColor : mutedColor,
                      fontWeight: i === weekData.length - 1 ? '700' : '600',
                    }
                  ]}
                >
                  {day}
                </Text>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Prédictions simplifiées */}
      {predictions && (
        <View style={styles.predictionsContainer}>
          <Text style={[styles.predictionsTitle, { color: mutedColor }]}>
            PRÉDICTIONS
          </Text>
          <View style={styles.predictionsGrid}>
            {predictions.map((pred, index) => (
              <View key={index} style={[styles.predictionCard, { backgroundColor: `${pred.color}08` }]}>
                <Text style={[styles.predictionLabel, { color: mutedColor }]}>
                  {pred.label}
                </Text>
                <Text style={[styles.predictionChange, { color: pred.color }]}>
                  {pred.change}
                </Text>
                <Text style={[styles.predictionWeight, { color: colors.textPrimary }]}>
                  {pred.predictedWeight} kg
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bouton CTA moderne */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: accentColor }]}
        onPress={onAddWeight}
      >
        <Text style={styles.addButtonText}>Nouvelle pesée</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statsButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mainSection: {
    gap: 12,
    zIndex: 1,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  weightValue: {
    fontSize: 52,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  weightUnit: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  objectiveLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  objectiveValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  diffBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  diffText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  chartContainer: {
    marginTop: 20,
    gap: 12,
    zIndex: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  minMaxLabels: {
    flexDirection: 'row',
    gap: 12,
  },
  minMaxText: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  chartArea: {
    height: 80,
    position: 'relative',
  },
  baseLine: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    height: 1,
  },
  lineChart: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
  },
  linePoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    marginTop: -4,
  },
  daysLabels: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  predictionsContainer: {
    marginTop: 20,
    gap: 12,
    zIndex: 1,
  },
  predictionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  predictionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  predictionCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    gap: 4,
  },
  predictionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  predictionChange: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  predictionWeight: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  addButton: {
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
    alignItems: 'center',
    zIndex: 1,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
