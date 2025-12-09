import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { SoftCard } from '@/components/SoftCard';
import { ProgressRing } from '@/components/ProgressRing';
import { ProgressSteps } from '@/components/ProgressSteps';
import { WeightTrendCard } from '@/components/WeightTrendCard';
import { PredictionsList } from '@/components/PredictionsList';
import { UserAvatar } from '@/components/UserAvatar';
import { AnimatedCard } from '@/components/AnimatedCard';
import { InteractiveLineChart } from '@/components/InteractiveLineChart';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { MetricSelector } from '@/components/MetricSelector';
import { BMICard } from '@/components/BMICard';
import { MetricType, METRIC_CONFIGS, WeightEntry } from '@/types/health';
import { useMemo, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useCallback } from 'react';
import { theme } from '@/lib/theme';
import { getAllMeasurements, getUserSettings } from '@/lib/storage';

const motivationalQuotes = [
  "⛩️ Être et durer ⛩️",
  "⛩️ Ce qui ne te tue pas te rend plus fort ⛩️",
  "⛩️ La discipline est mère du succès ⛩️",
  "⛩️ Tomber sept fois, se relever huit ⛩️",
  "⛩️ Dieu n'impose à aucune âme une charge supérieure à sa capacité ⛩️",
  "⛩️ Le seul combat perdu d'avance est celui auquel on renonce ⛩️",
];

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('weight');
  const [weightEntries, setWeightEntries] = useState<WeightEntry>([]);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [weightHistoryData, setWeightHistoryData] = useState<any[]>([]); // Nouvel état pour les données du graphique
  const [goalWeight, setGoalWeight] = useState(75.0);
  const [startWeight] = useState(95.0);
  const [height] = useState(175);
  const [currentQuote, setCurrentQuote] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '30' | '90' | 'all'>('30');

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setCurrentQuote(motivationalQuotes[randomIndex]);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      // Récupération de toutes les mesures localement
      const measurements = await getAllMeasurements();

      // Récupération du poids le plus récent
      if (measurements.length > 0) {
        setCurrentWeight(measurements[0].weight);
      } else {
        setCurrentWeight(null);
      }

      // Récupération de l'objectif de poids depuis les paramètres
      const settings = await getUserSettings();
      setGoalWeight(settings.weight_goal || 75.0);

      // Limiter aux 90 dernières mesures pour le calcul des tendances
      const historyData = measurements.slice(0, 90);

      if (historyData.length > 0) {
        // Transformer les données pour weightEntries (ordre descendant pour calcul de tendance)
        const entriesData = historyData.map((item) => ({
          date: item.date,
          weight: item.weight,
          bodyFat: item.body_fat,
          muscleMass: item.muscle_mass,
          water: item.water,
        }));
        setWeightEntries(entriesData);

        // Transformer les données pour LineChart (ordre ascendant pour affichage)
        const formattedData = [...historyData].reverse().map((item) => ({
          value: item.weight,
          label: new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        }));
        setWeightHistoryData(formattedData);
      } else {
        setWeightHistoryData([]);
        setWeightEntries([]);
      }

      console.log('✅ Données chargées depuis le stockage local');
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      setCurrentWeight(null);
      setWeightHistoryData([]);
      setWeightEntries([]);
    }

    setLoading(false);
  }, []);

  // Supprimer loadData car les données sont maintenant gérées par fetchDashboardData
  // const loadData = () => {
  //   setWeightEntries([
  //     { date: '2024-11-27', weight: 89.5, bodyFat: 22.3, muscleMass: 68.5, water: 55.2 },
  //     { date: '2024-11-26', weight: 89.7, bodyFat: 22.5, muscleMass: 68.3, water: 55.0 },
  //     { date: '2024-11-25', weight: 89.8, bodyFat: 22.6, muscleMass: 68.2, water: 54.9 },
  //     { date: '2024-11-24', weight: 90.0, bodyFat: 22.8, muscleMass: 68.0, water: 54.8 },
  //     { date: '2024-11-23', weight: 90.3, bodyFat: 23.0, muscleMass: 67.8, water: 54.6 },
  //     { date: '2024-11-22', weight: 90.2, bodyFat: 22.9, muscleMass: 67.9, water: 54.7 },
  //     { date: '2024-11-21', weight: 90.5, bodyFat: 23.2, muscleMass: 67.6, water: 54.5 },
  //     { date: '2024-11-20', weight: 90.8, bodyFat: 23.4, muscleMass: 67.4, water: 54.3 },
  //     { date: '2024-11-19', weight: 91.0, bodyFat: 23.6, muscleMass: 67.2, water: 54.2 },
  //     { date: '2024-11-18', weight: 91.2, bodyFat: 23.8, muscleMass: 67.0, water: 54.0 },
  //     { date: '2024-11-17', weight: 91.5, bodyFat: 24.0, muscleMass: 66.8, water: 53.8 },
  //     { date: '2024-11-16', weight: 91.8, bodyFat: 24.2, muscleMass: 66.6, water: 53.6 },
  //     { date: '2024-11-15', weight: 92.0, bodyFat: 24.4, muscleMass: 66.4, water: 53.5 },
  //     { date: '2024-11-14', weight: 92.3, bodyFat: 24.6, muscleMass: 66.2, water: 53.3 },
  //   ]);
  // };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  const chartData = useMemo(() => {
    const recentEntries = weightEntries.slice(0, 14).reverse();
    return recentEntries.map((entry) => ({
      value: entry[selectedMetric] || entry.weight,
      date: entry.date,
    }));
  }, [weightEntries, selectedMetric]);

  const currentMetricConfig = METRIC_CONFIGS[selectedMetric];

  const progressSteps = useMemo(() => {
    const totalSteps = 8;
    const stepSize = (startWeight - goalWeight) / (totalSteps - 1);
    return Array.from({ length: totalSteps }, (_, i) => ({
      weight: startWeight - stepSize * i,
      completed: currentWeight <= startWeight - stepSize * i,
    }));
  }, [currentWeight, startWeight, goalWeight]);

  const weightTrends = useMemo(() => {
    const calculateMovingAverage = (entries: WeightEntry[], start: number, end: number) => {
      if (entries.length === 0) return 0;
      const relevantEntries = entries.slice(start, end);
      const sum = relevantEntries.reduce((acc, entry) => acc + entry.weight, 0);
      return sum / relevantEntries.length;
    };

    // Tendance 7 jours (moyenne mobile)
    let sevenDayChange = 0;
    if (weightEntries.length >= 14) {
      const last7DaysAvg = calculateMovingAverage(weightEntries, 0, 7); // Jours 1-7
      const prev7DaysAvg = calculateMovingAverage(weightEntries, 7, 14); // Jours 8-14
      sevenDayChange = last7DaysAvg - prev7DaysAvg;
    }

    // Tendance 30 jours (moyenne mobile)
    let thirtyDayChange = 0;
    if (weightEntries.length >= 60) {
      const last30DaysAvg = calculateMovingAverage(weightEntries, 0, 30);
      const prev30DaysAvg = calculateMovingAverage(weightEntries, 30, 60);
      thirtyDayChange = last30DaysAvg - prev30DaysAvg;
    }

    // Tendance 90 jours (moyenne mobile)
    let ninetyDayChange = 0;
    if (weightEntries.length >= 90) {
      const last45DaysAvg = calculateMovingAverage(weightEntries, 0, 45);
      const prev45DaysAvg = calculateMovingAverage(weightEntries, 45, 90);
      ninetyDayChange = last45DaysAvg - prev45DaysAvg;
    }

    const totalChange = currentWeight !== null ? currentWeight - startWeight : 0;

    return [
      { period: '7j', change: sevenDayChange, isPositive: sevenDayChange < 0 },
      { period: '30j', change: thirtyDayChange, isPositive: thirtyDayChange < 0 },
      { period: '90j', change: ninetyDayChange, isPositive: ninetyDayChange < 0 },
      { period: 'Total', change: totalChange, isPositive: totalChange < 0 },
    ];
  }, [weightEntries, currentWeight, startWeight]);

  const predictions = useMemo(() => [
    { label: 'Dans 7 jours', weight: 88.8, date: '8 Déc 2024' },
    { label: 'Dans 1 mois', weight: 86.5, date: '1 Jan 2025' },
    { label: 'Dans 3 mois', weight: 82.0, date: '1 Mars 2025' },
    { label: `Objectif (${goalWeight}kg)`, weight: goalWeight, date: '15 Juin 2025', isGoal: true },
  ], []);

  const filteredWeightData = useMemo(() => {
    if (weightHistoryData.length === 0) return [];

    const daysMap = {
      '7': 7,
      '30': 30,
      '90': 90,
      'all': weightHistoryData.length
    };

    const daysToShow = daysMap[selectedPeriod];
    return weightHistoryData.slice(-daysToShow);
  }, [weightHistoryData, selectedPeriod]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (loading) {
    return <SkeletonLoader />;
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00C4B4"
            colors={['#00C4B4']}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        {/* Citation motivante en haut du ScrollView */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>{currentQuote}</Text>
        </View>
        {/* Header existant */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()} Houari,</Text>
              <Text style={styles.title}>Votre Progression</Text>
            </View>
            <UserAvatar size={48} />
          </View>
        </View>

        <AnimatedCard delay={100}>
          <SoftCard style={styles.progressCard}>
            <Text style={styles.sectionTitle}>PROGRESSION</Text>
            <ProgressRing current={currentWeight ?? 0} goal={goalWeight} size={240} />
            <ProgressSteps steps={progressSteps} current={currentWeight ?? 0} />
          </SoftCard>
        </AnimatedCard>

        <AnimatedCard delay={200}>
          <SoftCard style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>ÉVOLUTION PONDÉRALE</Text>

              {/* Boutons de sélection de période */}
              <View style={styles.periodButtons}>
                {[
                  { key: '7', label: '7J' },
                  { key: '30', label: '30J' },
                  { key: '90', label: '90J' },
                  { key: 'all', label: 'Tout' }
                ].map((period) => (
                  <TouchableOpacity
                    key={period.key}
                    style={[
                      styles.periodButton,
                      selectedPeriod === period.key && styles.periodButtonActive
                    ]}
                    onPress={() => setSelectedPeriod(period.key as '7' | '30' | '90' | 'all')}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.periodButtonText,
                        selectedPeriod === period.key && styles.periodButtonTextActive
                      ]}
                    >
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {filteredWeightData.length >= 2 ? (
              <LineChart
                data={filteredWeightData}
                width={screenWidth - 80}
                height={220}
                color="#34D399"
                hideDataPoints={false}
                dataPointsColor="#34D399"
                dataPointsRadius={6}
                showVerticalLines
                spacing={Math.max(30, (screenWidth - 120) / (filteredWeightData.length))}
                initialSpacing={20}
                isAnimated
                animationDuration={800}
                onDataPointClick={(dataPoint) => {
                  alert(`📊 ${dataPoint.label}\nPoids: ${dataPoint.value} kg`);
                }}
                rulesColor={theme.colors.borderLight}
                rulesType="solid"
                xAxisColor={theme.colors.border}
                yAxisColor={theme.colors.border}
                yAxisLabelSuffix=" kg"
                verticalLinesColor={theme.colors.borderLight}
                thickness={3}
                hideRules={false}
                hideYAxisText={false}
                showFractionalValues
                backgroundColor={theme.colors.surface}
                textShiftY={-8}
                textShiftX={-5}
                textColor={theme.colors.textPrimary}
                areaChart
                startFillColor="rgba(52, 211, 153, 0.3)"
                endFillColor="rgba(52, 211, 153, 0.05)"
                startOpacity={0.9}
                endOpacity={0.2}
                curved
              />
            ) : (
              <View style={styles.chartEmptyState}>
                <Text style={styles.chartEmptyStateIcon}>📈</Text>
                <Text style={styles.chartEmptyStateTitle}>
                  Pas encore de courbe
                </Text>
                <Text style={styles.chartEmptyStateText}>
                  Ajoutez au moins 2 mesures pour voir votre évolution
                </Text>
              </View>
            )}
          </SoftCard>
        </AnimatedCard>

        {weightEntries.length >= 14 && (
          <AnimatedCard delay={300}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TENDANCES PONDÉRALES</Text>
              <View style={styles.trendsGrid}>
                {weightTrends.map((trend, index) => (
                  <WeightTrendCard
                    key={index}
                    period={trend.period}
                    change={trend.change}
                    isPositive={trend.isPositive}
                  />
                ))}
              </View>
            </View>
          </AnimatedCard>
        )}

        {weightEntries.length >= 7 && (
          <AnimatedCard delay={400}>
            <SoftCard>
              <PredictionsList predictions={predictions} />
            </SoftCard>
          </AnimatedCard>
        )}

        {chartData.length > 0 && (
          <AnimatedCard delay={550}>
            <SoftCard>
              <Text style={styles.sectionTitle}>ÉVOLUTION (14 JOURS)</Text>
              <MetricSelector selected={selectedMetric} onSelect={setSelectedMetric} />
              <InteractiveLineChart
                data={chartData}
                width={screenWidth - 80}
                color={currentMetricConfig.color}
                unit={currentMetricConfig.unit}
              />
            </SoftCard>
          </AnimatedCard>
        )}

        <AnimatedCard delay={625}>
          <SoftCard>
            {currentWeight && currentWeight > 0 ? (
              <BMICard weight={currentWeight} height={height} />
            ) : (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateEmoji}>📊</Text>
                <Text style={styles.emptyStateTitle}>Ajoutez votre première mesure</Text>
                <Text style={styles.emptyStateSubtext}>
                  Commencez votre suivi pour voir votre IMC et vos statistiques
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => router.push('/(tabs)/entry')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyStateButtonText}>Ajouter une mesure</Text>
                </TouchableOpacity>
              </View>
            )}
          </SoftCard>
        </AnimatedCard>

        <AnimatedCard delay={700}>
          <View style={styles.motivationCard}>
          <Text style={styles.motivationEmoji}>🎯</Text>
          {currentWeight && currentWeight > 0 && currentWeight < startWeight ? (
            <>
              <Text style={styles.motivationText}>
                Excellent progrès ! Vous avez perdu {(startWeight - currentWeight).toFixed(1)} kg.
              </Text>
              <Text style={styles.motivationSubtext}>
                Plus que {(currentWeight - goalWeight).toFixed(1)} kg pour atteindre votre objectif !
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.motivationText}>
                Commencez votre suivi aujourd'hui !
              </Text>
              <Text style={styles.motivationSubtext}>
                Chaque grand voyage commence par un premier pas
              </Text>
            </>
          )}
          </View>
        </AnimatedCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: 60,
    gap: theme.spacing.xxl,
    paddingBottom: 40,
  },
  header: {
    marginBottom: theme.spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  title: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  progressCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxxl,
    borderRadius: theme.radius.xxl,
  },
  section: {
    gap: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.md,
  },
  trendsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  chartCard: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
    borderRadius: theme.radius.xxl,
  },
  chartHeader: {
    width: '100%',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  periodButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.borderLight,
    minWidth: 50,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#34D399',
  },
  periodButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  chartEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  chartEmptyStateIcon: {
    fontSize: 48,
    opacity: 0.3,
    marginBottom: theme.spacing.sm,
  },
  chartEmptyStateTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  chartEmptyStateText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.fontSize.md * 1.5,
  },
  chart: {
    marginVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  motivationCard: {
    backgroundColor: theme.colors.mintPastel,
    padding: theme.spacing.xxl,
    borderRadius: theme.radius.xxl,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadow.sm,
  },
  motivationEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  motivationText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  motivationSubtext: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  quoteContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
    paddingVertical: theme.spacing.xl,
  },
  quoteText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    fontStyle: 'italic',
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: theme.fontSize.xl * 1.4,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  emptyStateEmoji: {
    fontSize: 56,
    marginBottom: theme.spacing.sm,
  },
  emptyStateTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyStateSubtext: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.fontSize.md * 1.5,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.radius.xl,
    marginTop: theme.spacing.md,
    ...theme.shadow.sm,
  },
  emptyStateButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.surface,
    letterSpacing: 0.3,
  },
});
