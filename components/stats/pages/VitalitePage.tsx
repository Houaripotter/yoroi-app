// ============================================
// VITALITÉ PAGE - Sommeil, hydratation, cœur
// Toutes les cartes sont cliquables avec modal graphique
// ============================================

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { StatsDetailModal } from '../StatsDetailModal';
import { HistoryScrollCard } from '../charts/HistoryScrollCard';
import { ScrollableLineChart } from '../charts/ScrollableLineChart';
import { SimpleMetricCard } from '../charts/SimpleMetricCard';
import { HealthKitConnectCard } from '../HealthKitConnectCard';
import { RecoveryCircle } from '../advanced/RecoveryCircle';
import { SleepPhasesBar } from '../advanced/SleepPhasesBar';
import { HRVCard } from '../advanced/HRVCard';
import { healthConnect } from '@/lib/healthConnect';
import { Moon, Droplet, Heart, Activity, Zap , Plus } from 'lucide-react-native';
import { CircularProgress } from '@/components/charts/CircularProgress';
import { SLEEP_DURATION_RANGES, HRV_RANGES, RESTING_HEART_RATE_RANGES, getMetricStatus } from '@/lib/healthRanges';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { StatsExplanation } from '../StatsExplanation';
import { AppleHealthEstimationModal } from '../AppleHealthEstimationModal';
import { EstimationBadge } from '../EstimationBadge';
import { VitalityBetaWarningModal } from '../VitalityBetaWarningModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { HealthspanChart } from '@/components/HealthspanChart';
import { logger } from '@/lib/security/logger';

/**
 * Convertit les heures décimales en format lisible "Xh YYmin"
 * Exemple: 7.5 => "7h 30min", 8 => "8h 00min", 0.75 => "0h 45min"
 */
const formatSleepDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const min = Math.round((hours - h) * 60);
  return `${h}h ${min.toString().padStart(2, '0')}min`;
};

export const VitalitePage: React.FC = () => {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = language === 'fr' ? fr : enUS;
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [isHealthKitConnected, setIsHealthKitConnected] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // État pour le modal
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
  } | null>(null);

  // État pour la modal d'explication des estimations Apple
  const [showEstimationModal, setShowEstimationModal] = useState(false);

  // État pour le modal d'avertissement bêta
  const [showBetaWarning, setShowBetaWarning] = useState(false);

  const [vitalHistory, setVitalHistory] = useState<{
    sleep: any[];
    heartRate: any[];
    hrv: any[];
  }>({ sleep: [], heartRate: [], hrv: [] });

  useEffect(() => {
    checkHealthKitConnection();
    checkBetaWarning();
  }, []);

  // Vérifier si on doit afficher l'avertissement bêta
  const checkBetaWarning = async () => {
    try {
      const hasSeenWarning = await AsyncStorage.getItem('@yoroi_vitality_beta_warning_seen');
      if (!hasSeenWarning) {
        // Attendre 2 secondes après le chargement pour afficher le warning
        setTimeout(() => {
          setShowBetaWarning(true);
        }, 2000);
      }
    } catch (error) {
      logger.error('Error checking beta warning:', error);
    }
  };

  const handleCloseBetaWarning = async () => {
    try {
      await AsyncStorage.setItem('@yoroi_vitality_beta_warning_seen', 'true');
      setShowBetaWarning(false);
    } catch (error) {
      logger.error('Error saving beta warning:', error);
    }
  };

  useEffect(() => {
    if (isHealthKitConnected) {
      loadHealthData();
    }
  }, [selectedPeriod, isHealthKitConnected]);

  const checkHealthKitConnection = async () => {
    try {
      const status = healthConnect.getSyncStatus();
      setIsHealthKitConnected(status.isConnected);

      if (status.isConnected) {
        await loadHealthData();
      }
    } catch (error) {
      logger.error('Error checking HealthKit:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthData = async () => {
    setLoading(true);
    try {
      // Charger les données actuelles avec Promise.allSettled pour éviter qu'une erreur ne bloque tout
      const results = await Promise.allSettled([
        healthConnect.getLastSleep(),
        healthConnect.getTodayHeartRate(),
        healthConnect.getTodayHRV(),
        healthConnect.getTodayHydration(),
      ]);

      const sleep = results[0].status === 'fulfilled' ? results[0].value : { duration: 0, quality: 0, phases: [] };
      const heartRate = results[1].status === 'fulfilled' ? results[1].value : { current: 0, resting: 0 };
      const hrv = results[2].status === 'fulfilled' ? results[2].value : { value: 0, baseline: 0 };
      const hydration = results[3].status === 'fulfilled' ? results[3].value : { current: 0, goal: 2.5 };

      setHealthData({ sleep, heartRate, hrv, hydration });

      // Charger l'historique selon la période
      const daysMap: { [key: string]: number } = {
        '7j': 7,
        '30j': 30,
        '90j': 90,
        'tout': 365,
      };
      const days = daysMap[selectedPeriod] || 7;

      try {
        // Essayer de charger l'historique
        const sleepHistory = await healthConnect.getSleepHistory?.(days) || [];
        const heartRateHistory = await healthConnect.getHeartRateHistory?.(days) || [];
        const hrvHistory = await healthConnect.getHRVHistory?.(days) || [];

        // Filtrer les données invalides (trop élevées ou manifestement fausses)
        // Cohérence avec healthConnect.ios.ts ligne 691: rejeter < 3h et > 16h
        const validSleepHistory = Array.isArray(sleepHistory) ? sleepHistory.filter((s: any) => {
          const hours = (s.duration || 0) / 60;
          // Rejeter les données invalides (> 16h ou < 3h)
          // Apple Santé estime parfois des micro-siestes < 3h qui ne sont pas des vraies nuits
          return hours >= 3 && hours <= 16;
        }) : [];

        setVitalHistory({
          sleep: validSleepHistory.map((s: any) => ({
            date: s.date,
            value: (s.duration || 0) / 60, // Convertir minutes en heures
          })).reverse(),
          heartRate: Array.isArray(heartRateHistory) ? heartRateHistory.map((h: any) => ({
            date: h.date,
            value: h.resting || h.value || 0,
          })).reverse() : [],
          hrv: Array.isArray(hrvHistory) ? hrvHistory.map((h: any) => ({
            date: h.date,
            value: h.value || 0,
          })).reverse() : [],
        });
      } catch (historyError) {
        logger.info('Historical data not available:', historyError);
        // Initialiser avec tableaux vides en cas d'erreur
        setVitalHistory({ sleep: [], heartRate: [], hrv: [] });
      }
    } catch (error) {
      logger.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectHealthKit = async () => {
    setConnecting(true);
    try {
      const success = await healthConnect.connect();
      if (success) {
        setIsHealthKitConnected(true);
        await loadHealthData();
      }
    } catch (error) {
      logger.error('Error connecting HealthKit:', error);
    } finally {
      setConnecting(false);
    }
  };

  // Helper pour obtenir la description de la période traduite
  const getPeriodDescription = (period: Period) => {
    const periodMap: { [key: string]: string } = {
      '7j': t('statsPages.days7'),
      '30j': t('statsPages.days30'),
      '90j': t('statsPages.days90'),
      '6m': t('statsPages.months6'),
      '1a': t('statsPages.year1'),
      'tout': t('statsPages.allPeriod'),
    };
    return periodMap[period] || t('statsPages.allPeriod');
  };

  // Préparer les données pour le modal selon la métrique sélectionnée
  const getModalData = () => {
    if (!selectedMetric) return [];

    switch (selectedMetric.key) {
      case 'sleep':
      case 'sleep_quality':
        return vitalHistory.sleep.map((s) => ({
          value: s.value,
          label: format(new Date(s.date), 'd MMM', { locale: dateLocale }),
          date: s.date,
        }));

      case 'heart_rate':
      case 'resting_hr':
        return vitalHistory.heartRate.map((h) => ({
          value: h.value,
          label: format(new Date(h.date), 'd MMM', { locale: dateLocale }),
          date: h.date,
        }));

      case 'hrv':
        return vitalHistory.hrv.map((h) => ({
          value: h.value,
          label: format(new Date(h.date), 'd MMM', { locale: dateLocale }),
          date: h.date,
        }));

      default:
        return [];
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatsHeader
          title={t('statsPages.vitality.title')}
          description={t('statsPages.vitality.description')}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  if (!isHealthKitConnected) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScrollContext}
        scrollEventThrottle={100}
      >
        <StatsHeader
          title={t('statsPages.vitality.title')}
          description={t('statsPages.vitality.description')}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          showPeriodSelector={false}
        />

        <HealthKitConnectCard
          onConnect={handleConnectHealthKit}
          isConnecting={connecting}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      onScroll={onScrollContext}
      scrollEventThrottle={100}
    >
      <StatsHeader
        title={t('statsPages.vitality.title')}
        description={t('statsPages.vitality.description')}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Bannière Beta Warning permanente */}
      <View style={[styles.betaBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}>
        <View style={styles.betaBannerHeader}>
          <Text style={[styles.betaBannerTitle, { color: colors.warning }]}>⚠️ PAGE EN BETA</Text>
        </View>
        <Text style={[styles.betaBannerText, { color: colors.textSecondary }]}>
          Les données peuvent être imprécises. L'estimation de sommeil Apple peut apparaître même sans Apple Watch.
          Cette page est en cours de développement, des bugs peuvent survenir.
        </Text>
        <TouchableOpacity
          style={[styles.betaBannerButton, { backgroundColor: colors.warning + '20' }]}
          onPress={() => router.push('/ideas' as any)}
        >
          <Text style={[styles.betaBannerButtonText, { color: colors.warning }]}>
            💡 Signaler un problème dans la Boîte à Idées
          </Text>
        </TouchableOpacity>
      </View>

      <StatsExplanation
        title="Santé & Vitalité"
        text="Cette section regroupe tes indicateurs de récupération. Le Sommeil répare les tissus, l'Hydratation maintient tes performances, et le VRC (Variabilité de Fréquence Cardiaque) indique si ton système nerveux est prêt pour une séance intense."
        color="#EC4899"
      />

      {/* TENDANCE SANTÉ */}
      <StatsSection
        title="Tendance Santé"
        description="Évolution sur les 7 derniers jours"
      >
        <View style={styles.healthspanCard}>
          <HealthspanChart />
        </View>
      </StatsSection>

      {/* Graphique de tendance principal */}
      <StatsSection
        title="Historique Sommeil"
        description="Suivi de la durée de tes nuits"
      >
        <ScrollableLineChart
          data={vitalHistory.sleep}
          color="#6366F1"
          unit="h"
          height={200}
          onPress={() => setSelectedMetric({
            key: 'sleep',
            label: t('statsPages.vitality.sleepDuration'),
            color: '#6366F1',
            unit: 'h',
            icon: <Moon size={18} color="#6366F1" strokeWidth={2.5} />,
          })}
        />
      </StatsSection>

      {healthData?.recovery?.score && (
        <StatsSection
          title={t('statsPages.vitality.recoveryScore')}
          description={t('statsPages.vitality.recoveryScoreDesc')}
        >
          <RecoveryCircle
            score={healthData.recovery.score}
            label={t('statsPages.vitality.recovery')}
          />
        </StatsSection>
      )}

      <StatsSection
        title={t('statsPages.vitality.sleep')}
        description={t('statsPages.clickToSeeChart')}
      >
        {/* Bouton saisir sommeil + Badge Estimation */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <TouchableOpacity
            style={[styles.addSleepButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/sleep-input')}
            activeOpacity={0.8}
          >
            <Plus size={16} color={colors.textOnAccent} strokeWidth={2.5} />
            <Text style={[styles.addSleepButtonText, { color: colors.textOnAccent }]}>
              Saisir mon sommeil
            </Text>
          </TouchableOpacity>

          <EstimationBadge
            onPress={() => setShowEstimationModal(true)}
            variant="default"
          />
        </View>

        {healthData?.sleep?.phases && healthData.sleep.phases.length > 0 && (
          <SleepPhasesBar
            phases={healthData.sleep.phases}
            height={60}
          />
        )}

        {/* Carte Durée de sommeil */}
        {healthData?.sleep?.duration > 0 && (
          <View style={{ marginBottom: 16 }}>
            <SimpleMetricCard
              value={healthData.sleep.duration / 60}
              min={SLEEP_DURATION_RANGES.min}
              max={SLEEP_DURATION_RANGES.max}
              zones={SLEEP_DURATION_RANGES.zones}
              unit={SLEEP_DURATION_RANGES.unit}
              title={t('statsPages.vitality.sleepDuration')}
              source={SLEEP_DURATION_RANGES.source}
              sourceUrl={SLEEP_DURATION_RANGES.sourceUrl}
              formattedValue={formatSleepDuration(healthData.sleep.duration / 60)}
              onPress={() => setSelectedMetric({
                key: 'sleep',
                label: t('statsPages.vitality.sleepDuration'),
                color: '#6366F1',
                unit: 'h',
                icon: <Moon size={18} color="#6366F1" strokeWidth={2.5} />,
              })}
            />
          </View>
        )}

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'sleep',
              label: t('statsPages.vitality.sleepDuration'),
              color: '#6366F1',
              unit: 'h',
              icon: <Moon size={18} color="#6366F1" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.vitality.totalDuration')}
              value={formatSleepDuration((healthData?.sleep?.duration || 0) / 60)}
              unit=""
              icon={<Moon size={24} color="#6366F1" strokeWidth={2.5} />}
              color="#6366F1"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'sleep_quality',
              label: t('statsPages.vitality.sleepQuality'),
              color: '#8B5CF6',
              unit: '/100',
              icon: <Activity size={18} color="#8B5CF6" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.vitality.quality')}
              value={healthData?.sleep?.quality || 0}
              unit="/100"
              icon={<Activity size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* Historique Sommeil - SCROLLABLE */}
      {vitalHistory.sleep.length > 0 && (
        <StatsSection
          title={t('statsPages.vitality.sleepHistory')}
          description={`${t('statsPages.vitality.sleepHistoryDesc')} ${getPeriodDescription(selectedPeriod)}`}
          containerStyle={{ paddingHorizontal: 0 }}
        >
          <View style={{ paddingLeft: 16, marginBottom: 12 }}>
            <EstimationBadge
              onPress={() => setShowEstimationModal(true)}
              variant="small"
            />
          </View>
          <View style={{ paddingLeft: 16 }}>
            <HistoryScrollCard
              data={vitalHistory.sleep}
              unit="h"
              healthRange={SLEEP_DURATION_RANGES}
              color="#6366F1"
              getStatus={(value) => getMetricStatus(value, SLEEP_DURATION_RANGES)}
              formatValue={formatSleepDuration}
            />
          </View>
        </StatsSection>
      )}

      <StatsSection
        title={t('statsPages.vitality.hydration')}
        description={t('statsPages.vitality.hydrationDesc')}
      >
        <View style={styles.hydrationContainer}>
          <CircularProgress
            percentage={(healthData?.hydration?.current / healthData?.hydration?.goal) * 100 || 0}
            size={180}
            strokeWidth={16}
            color="#06B6D4"
            backgroundColor="#06B6D420"
          />
        </View>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <MetricCard
              label={t('statsPages.vitality.consumed')}
              value={healthData?.hydration?.current || 0}
              unit="L"
              icon={<Droplet size={24} color="#06B6D4" strokeWidth={2.5} />}
              color="#06B6D4"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <MetricCard
              label={t('statsPages.vitality.goal')}
              value={healthData?.hydration?.goal || 2.5}
              unit="L"
              icon={<Droplet size={24} color="#0EA5E9" strokeWidth={2.5} />}
              color="#0EA5E9"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      <StatsSection
        title={t('statsPages.vitality.heartAndHRV')}
        description={t('statsPages.clickToSeeChart')}
      >
        {/* Carte HRV */}
        {healthData?.hrv?.value > 0 && (
          <View style={{ marginBottom: 16 }}>
            <SimpleMetricCard
              value={healthData.hrv.value}
              min={HRV_RANGES.min}
              max={HRV_RANGES.max}
              zones={HRV_RANGES.zones}
              unit={HRV_RANGES.unit}
              title={t('statsPages.vitality.hrv')}
              source={HRV_RANGES.source}
              sourceUrl={HRV_RANGES.sourceUrl}
              onPress={() => setSelectedMetric({
                key: 'hrv',
                label: t('statsPages.vitality.hrv'),
                color: '#10B981',
                unit: 'ms',
                icon: <Zap size={18} color="#10B981" strokeWidth={2.5} />,
              })}
            />
          </View>
        )}

        {/* Carte FC Repos */}
        {healthData?.heartRate?.resting > 0 && (
          <View style={{ marginBottom: 16 }}>
            <SimpleMetricCard
              value={healthData.heartRate.resting}
              min={RESTING_HEART_RATE_RANGES.min}
              max={RESTING_HEART_RATE_RANGES.max}
              zones={RESTING_HEART_RATE_RANGES.zones}
              unit={RESTING_HEART_RATE_RANGES.unit}
              title={t('statsPages.vitality.restingHeartRate')}
              source={RESTING_HEART_RATE_RANGES.source}
              sourceUrl={RESTING_HEART_RATE_RANGES.sourceUrl}
              onPress={() => setSelectedMetric({
                key: 'resting_hr',
                label: t('statsPages.vitality.restingHeartRate'),
                color: '#EC4899',
                unit: 'bpm',
                icon: <Heart size={18} color="#EC4899" strokeWidth={2.5} />,
              })}
            />
          </View>
        )}

        {/* Carte VRC (Analyse Système Nerveux) */}
        {healthData?.hrv?.value && healthData?.hrv?.baseline && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'hrv',
              label: t('statsPages.vitality.hrv'),
              color: '#10B981',
              unit: 'ms',
              icon: <Zap size={18} color="#10B981" strokeWidth={2.5} />,
            })}
          >
            <HRVCard
              currentHRV={healthData.hrv.value}
              baselineHRV={healthData.hrv.baseline}
            />
          </TouchableOpacity>
        )}

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'heart_rate',
              label: t('statsPages.vitality.heartRate'),
              color: '#EC4899',
              unit: 'bpm',
              icon: <Heart size={18} color="#EC4899" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.vitality.currentHR')}
              value={healthData?.heartRate?.current || 0}
              unit="bpm"
              icon={<Heart size={24} color="#EC4899" strokeWidth={2.5} />}
              color="#EC4899"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'resting_hr',
              label: t('statsPages.vitality.restingHeartRate'),
              color: '#6366F1',
              unit: 'bpm',
              icon: <Heart size={18} color="#6366F1" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.vitality.restingHR')}
              value={healthData?.heartRate?.resting || 0}
              unit="bpm"
              icon={<Heart size={24} color="#6366F1" strokeWidth={2.5} />}
              color="#6366F1"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* Historique FC Repos - CLIQUABLE */}
      {vitalHistory.heartRate.length > 0 && (
        <StatsSection
          title={t('statsPages.vitality.hrHistory')}
          description={`${t('statsPages.vitality.hrHistoryDesc')} ${getPeriodDescription(selectedPeriod)}`}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'resting_hr',
              label: t('statsPages.vitality.restingHeartRate'),
              color: '#EC4899',
              unit: 'bpm',
              icon: <Heart size={18} color="#EC4899" strokeWidth={2.5} />,
            })}
          >
            <HistoryScrollCard
              data={vitalHistory.heartRate}
              unit="bpm"
              healthRange={RESTING_HEART_RATE_RANGES}
              color="#EC4899"
              getStatus={(value) => getMetricStatus(value, RESTING_HEART_RATE_RANGES)}
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Historique HRV - CLIQUABLE */}
      {vitalHistory.hrv.length > 0 && (
        <StatsSection
          title={t('statsPages.vitality.hrvHistory')}
          description={`${t('statsPages.vitality.hrvHistoryDesc')} ${getPeriodDescription(selectedPeriod)}`}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'hrv',
              label: t('statsPages.vitality.hrv'),
              color: '#10B981',
              unit: 'ms',
              icon: <Zap size={18} color="#10B981" strokeWidth={2.5} />,
            })}
          >
            <HistoryScrollCard
              data={vitalHistory.hrv}
              unit="ms"
              healthRange={HRV_RANGES}
              color="#10B981"
              getStatus={(value) => getMetricStatus(value, HRV_RANGES)}
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      <View style={{ height: 40 }} />

      {/* Modal de détail */}
      {selectedMetric && (
        <StatsDetailModal
          visible={selectedMetric !== null}
          onClose={() => setSelectedMetric(null)}
          title={selectedMetric.label}
          subtitle={t('statsPages.fullEvolution')}
          data={getModalData()}
          color={selectedMetric.color}
          unit={selectedMetric.unit}
          icon={selectedMetric.icon}
          metricKey={selectedMetric.key}
          healthRange={
            selectedMetric.key === 'sleep' || selectedMetric.key === 'sleep_quality' ? SLEEP_DURATION_RANGES :
            selectedMetric.key === 'resting_hr' || selectedMetric.key === 'heart_rate' ? RESTING_HEART_RATE_RANGES :
            selectedMetric.key === 'hrv' ? HRV_RANGES :
            undefined
          }
        />
      )}

      {/* Modal explication estimations Apple */}
      <AppleHealthEstimationModal
        visible={showEstimationModal}
        onClose={() => setShowEstimationModal(false)}
      />

      {/* Modal avertissement version bêta */}
      <VitalityBetaWarningModal
        visible={showBetaWarning}
        onClose={handleCloseBetaWarning}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 250,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
  },
  hydrationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  addSleepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addSleepButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  betaBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  betaBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  betaBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  betaBannerText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  betaBannerButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  betaBannerButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  healthspanCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
