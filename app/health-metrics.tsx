import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Heart,
  Activity,
  Droplet,
  Wind,
  Thermometer,
  Zap,
  Moon,
  TrendingUp,
  Dumbbell,
  Watch,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { SPACING, RADIUS } from '@/constants/design';
import { healthConnect, type HealthData } from '@/lib/healthConnect';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendLineChart,
  SleepHistoryChart,
  CaloriesHistoryChart,
  WeightTrendChart,
  InsightCard,
  type Insight,
} from '@/components/health-charts';
import { StatsDetailModal } from '@/components/StatsDetailModal';
import { HealthInsightsGenerator } from '@/lib/healthInsights';
import { getProfile } from '@/lib/database';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// HEALTH METRICS DASHBOARD
// ============================================

type Period = 7 | 30 | 90;

// ============================================
// DEFINITIONS DES TERMES MEDICAUX
// ============================================
const TERM_DEFINITIONS: Record<string, { short: string; full: string }> = {
  HRV: {
    short: 'Variabilite Cardiaque',
    full: 'Variabilite de la frequence cardiaque - Mesure l\'intervalle entre les battements. Plus elle est elevee, meilleure est ta recuperation.',
  },
  SDNN: {
    short: 'Ecart-type intervalle NN',
    full: 'Mesure standard de la variabilite cardiaque en millisecondes.',
  },
  REM: {
    short: 'Sommeil Paradoxal',
    full: 'Phase de sommeil avec mouvements oculaires rapides. Essentielle pour la memoire et l\'apprentissage. Ideal: 20-25% du sommeil.',
  },
  SpO2: {
    short: 'Saturation Oxygene',
    full: 'Pourcentage d\'oxygene dans le sang. Normal: 95-100%. En dessous de 90%, consulte un medecin.',
  },
  VO2Max: {
    short: 'Capacite Aerobie Max',
    full: 'Volume maximal d\'oxygene que ton corps peut utiliser. Plus il est eleve, meilleure est ton endurance.',
  },
  BPM: {
    short: 'Battements/min',
    full: 'Battements par minute - Mesure de la frequence cardiaque.',
  },
  FC: {
    short: 'Frequence Cardiaque',
    full: 'Nombre de battements du coeur par minute.',
  },
};

export default function HealthMetricsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { locale } = useI18n();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [period, setPeriod] = useState<Period>(7); // 7 jours par defaut pour meilleure lisibilite
  const [weightGoal, setWeightGoal] = useState<number | undefined>();

  // Historical data states
  const [hrvHistory, setHrvHistory] = useState<Array<{ date: string; value: number }>>([]);
  const [restingHRHistory, setRestingHRHistory] = useState<Array<{ date: string; value: number }>>([]);
  const [heartRateHistory, setHeartRateHistory] = useState<Array<{ date: string; value: number }>>([]);
  const [oxygenSaturationHistory, setOxygenSaturationHistory] = useState<Array<{ date: string; value: number }>>([]);
  const [bodyTemperatureHistory, setBodyTemperatureHistory] = useState<Array<{ date: string; value: number }>>([]);
  const [weightHistory, setWeightHistory] = useState<Array<{ date: string; value: number }>>([]);
  const [vo2MaxHistory, setVO2MaxHistory] = useState<Array<{ date: string; value: number }>>([]);
  const [stepsHistory, setStepsHistory] = useState<Array<{ date: string; value: number }>>([]);
  const [sleepHistory, setSleepHistory] = useState<Array<{
    date: string;
    deep: number;
    rem: number;
    core: number;
    awake: number;
    total: number;
  }>>([]);
  const [caloriesHistory, setCaloriesHistory] = useState<Array<{
    date: string;
    active: number;
    basal: number;
    total: number;
  }>>([]);

  // Insights
  const [insights, setInsights] = useState<Insight[]>([]);

  // Modal states
  const [selectedModal, setSelectedModal] = useState<{
    type: 'hrv' | 'restingHR' | 'heartRate' | 'spo2' | 'temperature' | 'weight' | 'vo2max' | 'sleep' | 'calories' | null;
    title: string;
    data: Array<{ date: string; value: number }>;
    color: string;
    unit: string;
    icon?: React.ReactNode;
  } | null>(null);

  const loadHealthData = useCallback(async () => {
    try {
      setIsLoading(true);
      const status = healthConnect.getSyncStatus();
      setIsConnected(status.isConnected);

      if (status.isConnected) {
        const [
          data,
          hrvHist,
          restingHRHist,
          heartRateHist,
          oxygenSatHist,
          bodyTempHist,
          weightHist,
          vo2MaxHist,
          stepsHist,
          sleepHist,
          caloriesHist,
          profile,
        ] = await Promise.all([
          healthConnect.getAllHealthData(),
          healthConnect.getHRVHistory(period),
          healthConnect.getRestingHRHistory(period),
          healthConnect.getHeartRateHistory(period),
          healthConnect.getOxygenSaturationHistory(period),
          healthConnect.getBodyTemperatureHistory(period),
          healthConnect.getWeightHistory(period),
          healthConnect.getVO2MaxHistory(period),
          healthConnect.getStepsHistory(period),
          healthConnect.getSleepHistory(period),
          healthConnect.getCaloriesHistory(period),
          getProfile().catch(() => null),
        ]);

        setHealthData(data);
        setHrvHistory(hrvHist);
        setRestingHRHistory(restingHRHist);
        setHeartRateHistory(heartRateHist);
        setOxygenSaturationHistory(oxygenSatHist);
        setBodyTemperatureHistory(bodyTempHist);
        setWeightHistory(weightHist);
        setVO2MaxHistory(vo2MaxHist);
        setStepsHistory(stepsHist);
        setSleepHistory(sleepHist);
        setCaloriesHistory(caloriesHist);

        // Charger objectif poids
        if (profile?.target_weight) {
          setWeightGoal(profile.target_weight);
        }

        // Générer insights automatiques
        const generatedInsights = HealthInsightsGenerator.generateCombinedInsights({
          hrvHistory: hrvHist,
          restingHRHistory: restingHRHist,
          sleepHistory: sleepHist,
          caloriesHistory: caloriesHist,
          weightHistory: weightHist,
          goal: profile?.target_weight,
        });

        setInsights(generatedInsights);
      }
    } catch (error) {
      logger.error('Erreur chargement métriques santé:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadHealthData(); }, []);

  const handleConnect = async () => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);
      const success = await healthConnect.connect();
      if (success) {
        setIsConnected(true);
        await loadHealthData();
      }
    } catch (error) {
      logger.error('Erreur connexion Apple Health:', error);
    }
  };

  // ============================================
  // RENDER NOT CONNECTED
  // ============================================

  if (!isConnected) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + SPACING.md, borderBottomColor: colors.glassBorder },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Métriques Santé
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Not Connected State */}
        <View style={styles.centerContainer}>
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.glass,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.goldMuted }]}>
              <Heart size={48} color={colors.gold} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Apple Santé Non Connecté
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              Connecte YOROI à Apple Santé pour accéder à tes métriques avancées : HRV, VO2 Max,
              SpO2, sommeil détaillé et plus encore.
            </Text>
            <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
              <LinearGradient
                colors={[colors.gold, colors.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.connectButtonGradient}
              >
                <Text style={styles.connectButtonText}>Se Connecter</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ============================================
  // RENDER METRICS
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + SPACING.md, borderBottomColor: colors.glassBorder },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Métriques Santé</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadHealthData}
            tintColor={colors.gold}
          />
        }
      >
        <View style={styles.content}>
          {/* Period Selector */}
          <View style={styles.periodSelector}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                {
                  backgroundColor: period === 7 ? colors.gold : colors.glass,
                  borderColor: period === 7 ? colors.gold : colors.glassBorder,
                },
              ]}
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setPeriod(7);
              }}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  { color: period === 7 ? colors.textOnAccent : colors.textSecondary },
                ]}
              >
                7 jours
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                {
                  backgroundColor: period === 30 ? colors.gold : colors.glass,
                  borderColor: period === 30 ? colors.gold : colors.glassBorder,
                },
              ]}
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setPeriod(30);
              }}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  { color: period === 30 ? colors.textOnAccent : colors.textSecondary },
                ]}
              >
                30 jours
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                {
                  backgroundColor: period === 90 ? colors.gold : colors.glass,
                  borderColor: period === 90 ? colors.gold : colors.glassBorder,
                },
              ]}
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Light);
                setPeriod(90);
              }}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  { color: period === 90 ? colors.textOnAccent : colors.textSecondary },
                ]}
              >
                3 mois
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section: Insights */}
          {insights.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Insights & Recommandations
              </Text>
              {insights.slice(0, 5).map((insight, index) => (
                <InsightCard key={index} insight={insight} colors={colors} />
              ))}
            </View>
          )}

          {/* Section: Poids */}
          {weightHistory.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Poids</Text>
              <WeightTrendChart
                data={weightHistory}
                goal={weightGoal}
                colors={colors}
                period={period}
                onPress={() => setSelectedModal({
                  type: 'weight',
                  title: 'Évolution Poids',
                  data: weightHistory.map(w => ({ value: w.value, date: w.date })),
                  color: colors.success,
                  unit: 'kg',
                  icon: <Activity size={20} color={colors.success} />,
                })}
              />
            </View>
          )}

          {/* Section: Cardiovasculaire */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Cardiovasculaire
            </Text>

            {/* VO2 Max History Chart */}
            {vo2MaxHistory.length > 0 && (
              <View>
                <TrendLineChart
                  title={`VO₂ Max (Capacite Aerobie) - ${period} jours`}
                  data={vo2MaxHistory}
                  color={colors.warning}
                  unit="ml/kg/min"
                  colors={colors}
                  onPress={() => setSelectedModal({
                    type: 'vo2max',
                    title: 'VO₂ Max (Capacite Aerobie Maximale)',
                    data: vo2MaxHistory,
                    color: colors.warning,
                    unit: 'ml/kg/min',
                    icon: <Wind size={20} color={colors.warning} />,
                  })}
                />
                <Text style={[styles.definitionText, { color: colors.textMuted }]}>
                  {TERM_DEFINITIONS.VO2Max.full}
                </Text>
              </View>
            )}

            {/* HRV History Chart */}
            {hrvHistory.length > 0 && (
              <View>
                <TrendLineChart
                  title={`HRV (Variabilite Cardiaque) - ${period} jours`}
                  data={hrvHistory}
                  color={colors.purple}
                  unit="ms"
                  colors={colors}
                  onPress={() => setSelectedModal({
                    type: 'hrv',
                    title: 'HRV (Variabilite de la Frequence Cardiaque)',
                    data: hrvHistory,
                    color: colors.purple,
                    unit: 'ms',
                    icon: <Heart size={20} color={colors.purple} />,
                  })}
                />
                <Text style={[styles.definitionText, { color: colors.textMuted }]}>
                  {TERM_DEFINITIONS.HRV.full}
                </Text>
              </View>
            )}

            {/* Resting HR History Chart */}
            {restingHRHistory.length > 0 && (
              <TrendLineChart
                title={`FC au Repos - ${period} jours`}
                data={restingHRHistory}
                color={colors.danger}
                unit="BPM"
                colors={colors}
                onPress={() => setSelectedModal({
                  type: 'restingHR',
                  title: 'Fréquence Cardiaque au Repos',
                  data: restingHRHistory,
                  color: colors.danger,
                  unit: 'BPM',
                  icon: <Heart size={20} color={colors.danger} />,
                })}
              />
            )}

            {/* Heart Rate History Chart */}
            {heartRateHistory.length > 0 && (
              <TrendLineChart
                title={`Fréquence Cardiaque - ${period} jours`}
                data={heartRateHistory}
                color={colors.danger}
                unit="BPM"
                colors={colors}
                onPress={() => setSelectedModal({
                  type: 'heartRate',
                  title: 'Fréquence Cardiaque Moyenne',
                  data: heartRateHistory,
                  color: colors.danger,
                  unit: 'BPM',
                  icon: <Heart size={20} color={colors.danger} />,
                })}
              />
            )}

            <View style={styles.row}>
              {/* Heart Rate */}
              {healthData?.heartRate && (
                <MetricCard
                  title="Fréquence Cardiaque"
                  icon={Heart}
                  iconColor={colors.danger}
                  value={`${healthData.heartRate.current || healthData.heartRate.average}`}
                  unit="BPM"
                  subtitle={`Repos: ${healthData.heartRate.resting} BPM`}
                  details={`Min: ${healthData.heartRate.min} | Max: ${healthData.heartRate.max}`}
                  colors={colors}
                  size="large"
                />
              )}

              {/* HRV */}
              {healthData?.heartRateVariability && (
                <MetricCard
                  title="HRV"
                  icon={Activity}
                  iconColor={colors.purple}
                  value={`${healthData.heartRateVariability.value}`}
                  unit="ms"
                  subtitle="Variabilite Cardiaque"
                  details="Plus eleve = meilleure recuperation"
                  badge={getHRVBadge(healthData.heartRateVariability.value)}
                  colors={colors}
                  size="large"
                />
              )}
            </View>

            {/* SpO2 History Chart */}
            {oxygenSaturationHistory.length > 0 && (
              <View>
                <TrendLineChart
                  title={`Saturation O₂ (SpO2) - ${period} jours`}
                  data={oxygenSaturationHistory}
                  color={colors.info}
                  unit="%"
                  colors={colors}
                  onPress={() => setSelectedModal({
                    type: 'spo2',
                    title: 'Saturation en Oxygene (SpO2)',
                    data: oxygenSaturationHistory,
                    color: colors.info,
                    unit: '%',
                    icon: <Droplet size={20} color={colors.info} />,
                  })}
                />
                <Text style={[styles.definitionText, { color: colors.textMuted }]}>
                  {TERM_DEFINITIONS.SpO2.full}
                </Text>
              </View>
            )}

            <View style={styles.row}>
              {/* SpO2 */}
              {healthData?.oxygenSaturation && (
                <MetricCard
                  title="Saturation O₂"
                  icon={Droplet}
                  iconColor={colors.info}
                  value={`${healthData.oxygenSaturation.value}`}
                  unit="%"
                  subtitle="SpO2"
                  badge={getSpO2Badge(healthData.oxygenSaturation.value)}
                  colors={colors}
                />
              )}

              {/* Respiratory Rate */}
              {healthData?.respiratoryRate && (
                <MetricCard
                  title="Fréq. Respiratoire"
                  icon={Wind}
                  iconColor={colors.info}
                  value={`${healthData.respiratoryRate.value}`}
                  unit="rpm"
                  subtitle="Respirations/min"
                  colors={colors}
                />
              )}
            </View>

            {/* VO2 Max */}
            {healthData?.vo2Max && (
              <View style={styles.row}>
                <MetricCard
                  title="VO₂ Max"
                  icon={Zap}
                  iconColor={colors.warning}
                  value={`${healthData.vo2Max.value}`}
                  unit="ml/kg/min"
                  subtitle="Capacité aérobie"
                  badge={getVO2MaxBadge(healthData.vo2Max.value)}
                  colors={colors}
                  size="full"
                />
              </View>
            )}
          </View>

          {/* Section: Sommeil */}
          {healthData?.sleep && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Sommeil
              </Text>

              {/* Sleep History Chart */}
              {sleepHistory.length > 0 && (
                <SleepHistoryChart
                  data={sleepHistory}
                  colors={colors}
                  onPress={() => setSelectedModal({
                    type: 'sleep',
                    title: 'Historique Sommeil',
                    data: sleepHistory.map(s => ({
                      value: s.total / 60, // Convertir en heures
                      date: s.date,
                      label: new Date(s.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                    })),
                    color: colors.purple,
                    unit: 'h',
                    icon: <Moon size={20} color={colors.purple} />,
                  })}
                />
              )}

              <SleepCard sleep={healthData.sleep} colors={colors} />
            </View>
          )}

          {/* Section: Composition Corporelle */}
          {(healthData?.bodyComposition?.bodyFatPercentage ||
            healthData?.bodyComposition?.leanBodyMass) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Composition Corporelle
              </Text>

              <View style={styles.row}>
                {healthData.bodyComposition.bodyFatPercentage && (
                  <MetricCard
                    title="Graisse Corporelle"
                    icon={TrendingUp}
                    iconColor={colors.warning}
                    value={`${healthData.bodyComposition.bodyFatPercentage}`}
                    unit="%"
                    subtitle="Body Fat"
                    colors={colors}
                  />
                )}

                {healthData.bodyComposition.leanBodyMass && (
                  <MetricCard
                    title="Masse Maigre"
                    icon={Dumbbell}
                    iconColor={colors.success}
                    value={`${healthData.bodyComposition.leanBodyMass}`}
                    unit="kg"
                    subtitle="Lean Mass"
                    colors={colors}
                  />
                )}
              </View>
            </View>
          )}

          {/* Section: Activité & Énergie */}
          {(healthData?.calories || healthData?.distance || healthData?.steps) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Activité & Énergie
              </Text>

              {/* Calories History Chart */}
              {caloriesHistory.length > 0 && (
                <CaloriesHistoryChart
                  data={caloriesHistory}
                  colors={colors}
                  onPress={() => setSelectedModal({
                    type: 'calories',
                    title: 'Calories Actives',
                    data: caloriesHistory.map(c => ({
                      value: c.active,
                      date: c.date,
                      label: new Date(c.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                    })),
                    color: colors.danger,
                    unit: 'kcal',
                    icon: <Zap size={20} color={colors.danger} />,
                  })}
                />
              )}

              {healthData.calories && (
                <View style={styles.row}>
                  <MetricCard
                    title="Calories Actives"
                    icon={Zap}
                    iconColor={colors.danger}
                    value={`${healthData.calories.active}`}
                    unit="kcal"
                    subtitle={`Totales: ${healthData.calories.total} kcal`}
                    colors={colors}
                  />

                  <MetricCard
                    title="Calories Repos"
                    icon={Moon}
                    iconColor={colors.purple}
                    value={`${healthData.calories.basal}`}
                    unit="kcal"
                    subtitle="Métabolisme basal"
                    colors={colors}
                  />
                </View>
              )}

              <View style={styles.row}>
                {healthData.distance && (
                  <MetricCard
                    title="Distance"
                    icon={Activity}
                    iconColor={colors.info}
                    value={`${healthData.distance.total}`}
                    unit="km"
                    subtitle={`Marche: ${healthData.distance.walking} | Course: ${healthData.distance.running}`}
                    colors={colors}
                  />
                )}

                {healthData.steps && (
                  <MetricCard
                    title="Pas"
                    icon={Activity}
                    iconColor={colors.success}
                    value={`${healthData.steps.count.toLocaleString()}`}
                    unit=""
                    subtitle="Aujourd'hui"
                    colors={colors}
                  />
                )}
              </View>
            </View>
          )}

          {/* Section: Autres */}
          {(healthData?.bodyTemperature || bodyTemperatureHistory.length > 0) && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Autres Métriques
              </Text>

              {/* Temperature History Chart */}
              {bodyTemperatureHistory.length > 0 && (
                <TrendLineChart
                  title={`Température Corporelle (°C) - ${period} jours`}
                  data={bodyTemperatureHistory}
                  color={colors.warning}
                  unit="°C"
                  colors={colors}
                  onPress={() => setSelectedModal({
                    type: 'temperature',
                    title: 'Température Corporelle',
                    data: bodyTemperatureHistory,
                    color: colors.warning,
                    unit: '°C',
                    icon: <Thermometer size={20} color={colors.warning} />,
                  })}
                />
              )}

              {healthData?.bodyTemperature && (
                <View style={styles.row}>
                  <MetricCard
                    title="Température"
                    icon={Thermometer}
                    iconColor={colors.warning}
                    value={`${healthData.bodyTemperature.value}`}
                    unit="°C"
                    subtitle="Corporelle"
                    colors={colors}
                  />
                </View>
              )}
            </View>
          )}

          {/* Section: Entraînements récents */}
          {healthData?.workouts && healthData.workouts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Entraînements Récents
              </Text>

              {healthData.workouts.slice(0, 5).map((workout, index) => (
                <WorkoutCard key={index} workout={workout} colors={colors} locale={locale} />
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Modal d'agrandissement */}
      {selectedModal && (
        <StatsDetailModal
          visible={selectedModal !== null}
          onClose={() => setSelectedModal(null)}
          title={selectedModal.title}
          data={selectedModal.data}
          color={selectedModal.color}
          unit={selectedModal.unit}
          icon={selectedModal.icon}
        />
      )}
    </View>
  );
}

// ============================================
// METRIC CARD COMPONENT
// ============================================

interface MetricCardProps {
  title: string;
  icon: any;
  iconColor: string;
  value: string;
  unit: string;
  subtitle?: string;
  details?: string;
  badge?: { text: string; color: string };
  colors: any;
  size?: 'small' | 'large' | 'full';
}

function MetricCard({
  title,
  icon: Icon,
  iconColor,
  value,
  unit,
  subtitle,
  details,
  badge,
  colors,
  size = 'small',
}: MetricCardProps) {
  const cardWidth =
    size === 'full' ? '100%' : size === 'large' ? '48%' : '48%';

  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
          width: cardWidth,
        },
      ]}
    >
      <View style={styles.metricCardHeader}>
        <View style={[styles.metricIconCircle, { backgroundColor: iconColor + '20' }]}>
          <Icon size={20} color={iconColor} />
        </View>
        <Text style={[styles.metricCardTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>

      <View style={styles.metricCardBody}>
        <View style={styles.metricValueRow}>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{value}</Text>
          <Text style={[styles.metricUnit, { color: colors.textSecondary }]}>{unit}</Text>
        </View>

        {subtitle && (
          <Text style={[styles.metricSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        )}

        {details && (
          <Text style={[styles.metricDetails, { color: colors.textMuted }]}>{details}</Text>
        )}

        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================
// SLEEP CARD COMPONENT
// ============================================

function SleepCard({ sleep, colors }: { sleep: HealthData['sleep']; colors: any }) {
  if (!sleep) return null;

  const totalMinutes = sleep.duration;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <View
      style={[
        styles.sleepCard,
        { backgroundColor: colors.glass, borderColor: colors.glassBorder },
      ]}
    >
      <View style={styles.sleepCardHeader}>
        <View style={[styles.metricIconCircle, { backgroundColor: colors.purple + '20' }]}>
          <Moon size={24} color={colors.purple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sleepDuration, { color: colors.textPrimary }]}>
            {hours}h {minutes > 0 ? `${minutes}m` : ''}
          </Text>
          <Text style={[styles.sleepSubtitle, { color: colors.textSecondary }]}>
            Sommeil total
          </Text>
        </View>
      </View>

      {/* Sleep Phases */}
      {sleep.phases && (
        <View style={styles.sleepPhasesContainer}>
          <Text style={[styles.sleepPhasesTitle, { color: colors.textSecondary }]}>
            Phases de sommeil
          </Text>

          <View style={styles.sleepPhasesBar}>
            <SleepPhaseSegment
              label="Profond"
              minutes={sleep.phases.deep}
              color="#8B5CF6"
              total={totalMinutes}
            />
            <SleepPhaseSegment
              label="REM"
              minutes={sleep.phases.rem}
              color="#EC4899"
              total={totalMinutes}
            />
            <SleepPhaseSegment
              label="Léger"
              minutes={sleep.phases.core}
              color="#06B6D4"
              total={totalMinutes}
            />
            <SleepPhaseSegment
              label="Éveil"
              minutes={sleep.phases.awake}
              color="#EF4444"
              total={totalMinutes}
            />
          </View>

          <View style={styles.sleepPhasesLegend}>
            <SleepPhaseLegendItem
              label="Profond"
              minutes={sleep.phases.deep}
              color="#8B5CF6"
              colors={colors}
              definition="Recuperation physique et musculaire"
            />
            <SleepPhaseLegendItem
              label="REM (Sommeil Paradoxal)"
              minutes={sleep.phases.rem}
              color="#EC4899"
              colors={colors}
              definition="Memoire et apprentissage - Ideal: 20-25%"
            />
            <SleepPhaseLegendItem
              label="Leger"
              minutes={sleep.phases.core}
              color="#06B6D4"
              colors={colors}
              definition="Transition entre les phases"
            />
            <SleepPhaseLegendItem
              label="Eveil"
              minutes={sleep.phases.awake}
              color="#EF4444"
              colors={colors}
              definition="Reveils pendant la nuit"
            />
          </View>
        </View>
      )}
    </View>
  );
}

function SleepPhaseSegment({
  label,
  minutes,
  color,
  total,
}: {
  label: string;
  minutes: number;
  color: string;
  total: number;
}) {
  const percentage = (minutes / total) * 100;

  if (percentage === 0) return null;

  return (
    <View
      style={[
        styles.sleepPhaseSegment,
        { width: `${percentage}%`, backgroundColor: color },
      ]}
    />
  );
}

function SleepPhaseLegendItem({
  label,
  minutes,
  color,
  colors,
  definition,
}: {
  label: string;
  minutes: number;
  color: string;
  colors: any;
  definition?: string;
}) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <View style={styles.sleepPhaseLegendItem}>
      <View style={[styles.sleepPhaseDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.sleepPhaseLegendLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        {definition && (
          <Text style={[styles.sleepPhaseDefinition, { color: colors.textMuted }]}>
            {definition}
          </Text>
        )}
      </View>
      <Text style={[styles.sleepPhaseLegendValue, { color: colors.textPrimary }]}>
        {hours > 0 ? `${hours}h` : ''}{mins > 0 ? ` ${mins}m` : ''}
      </Text>
    </View>
  );
}

// ============================================
// WORKOUT CARD COMPONENT
// ============================================

function WorkoutCard({ workout, colors, locale }: { workout: any; colors: any; locale: string }) {
  const startDate = new Date(workout.startDate);
  const formattedDate = startDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      style={[
        styles.workoutCard,
        { backgroundColor: colors.glass, borderColor: colors.glassBorder },
      ]}
    >
      <View style={styles.workoutCardHeader}>
        <View style={[styles.metricIconCircle, { backgroundColor: colors.warning + '20' }]}>
          <Dumbbell size={20} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.workoutTitle, { color: colors.textPrimary }]}>
            {workout.activityType}
          </Text>
          <Text style={[styles.workoutDate, { color: colors.textMuted }]}>{formattedDate}</Text>
        </View>
      </View>

      <View style={styles.workoutStats}>
        <WorkoutStat label="Durée" value={`${workout.duration}min`} colors={colors} />
        {workout.distance && (
          <WorkoutStat label="Distance" value={`${workout.distance}km`} colors={colors} />
        )}
        {workout.calories && (
          <WorkoutStat label="Calories" value={`${workout.calories}kcal`} colors={colors} />
        )}
        {workout.averageHeartRate && (
          <WorkoutStat label="FC Moy" value={`${workout.averageHeartRate}bpm`} colors={colors} />
        )}
      </View>
    </View>
  );
}

function WorkoutStat({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.workoutStat}>
      <Text style={[styles.workoutStatLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.workoutStatValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

// ============================================
// HELPER FUNCTIONS - BADGES
// ============================================

function getHRVBadge(hrv: number): { text: string; color: string } {
  if (hrv >= 60) return { text: 'Excellent', color: '#22C55E' };
  if (hrv >= 40) return { text: 'Bon', color: '#3B82F6' };
  if (hrv >= 20) return { text: 'Moyen', color: '#F59E0B' };
  return { text: 'Faible', color: '#EF4444' };
}

function getSpO2Badge(spo2: number): { text: string; color: string } {
  if (spo2 >= 95) return { text: 'Normal', color: '#22C55E' };
  if (spo2 >= 90) return { text: 'Attention', color: '#F59E0B' };
  return { text: 'Bas', color: '#EF4444' };
}

function getVO2MaxBadge(vo2: number): { text: string; color: string } {
  if (vo2 >= 50) return { text: 'Excellent', color: '#22C55E' };
  if (vo2 >= 40) return { text: 'Bon', color: '#3B82F6' };
  if (vo2 >= 30) return { text: 'Moyen', color: '#F59E0B' };
  return { text: 'Faible', color: '#EF4444' };
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.md,
  },
  content: {
    padding: SPACING.lg,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyCard: {
    width: '100%',
    maxWidth: 400,
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  connectButton: {
    width: '100%',
    marginTop: SPACING.md,
  },
  connectButtonGradient: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  metricCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  metricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  metricCardBody: {
    gap: SPACING.xs,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  metricUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  metricSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  metricDetails: {
    fontSize: 11,
    fontWeight: '500',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sleepCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.lg,
  },
  sleepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sleepDuration: {
    fontSize: 32,
    fontWeight: '700',
  },
  sleepSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  sleepPhasesContainer: {
    gap: SPACING.md,
  },
  sleepPhasesTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  sleepPhasesBar: {
    height: 32,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  sleepPhaseSegment: {
    height: '100%',
  },
  sleepPhasesLegend: {
    gap: SPACING.sm,
  },
  sleepPhaseLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sleepPhaseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sleepPhaseLegendLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sleepPhaseDefinition: {
    fontSize: 10,
    fontWeight: '400',
    fontStyle: 'italic',
    marginTop: 2,
  },
  sleepPhaseLegendValue: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
  workoutCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  workoutDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  workoutStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  workoutStat: {
    minWidth: '22%',
  },
  workoutStatLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  workoutStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  definitionText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 18,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    marginTop: -SPACING.sm,
  },
});
