// ============================================
// SANTE PAGE - Sommeil, Seances, Signes Vitaux, Pas
// Navigation par sous-onglets, style Apple Sante
// ============================================

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsDetailModal } from '../StatsDetailModal';
import { HealthKitConnectCard } from '../HealthKitConnectCard';
import { healthConnect } from '@/lib/healthConnect';
import { getTrainings, Training } from '@/lib/database';
import { Moon, Flame, Heart, Footprints } from 'lucide-react-native';
import { SLEEP_DURATION_RANGES, HRV_RANGES, RESTING_HEART_RATE_RANGES } from '@/lib/healthRanges';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { logger } from '@/lib/security/logger';

import { SommeilTab } from './sante/SommeilTab';
import { SeancesTab } from './sante/SeancesTab';
import { SignesVitauxTab } from './sante/SignesVitauxTab';
import { PasTab } from './sante/PasTab';

type SanteTab = 'sommeil' | 'seances' | 'signes' | 'pas';

const TAB_CONFIG: { key: SanteTab; label: string; Icon: React.FC<any>; iconColor: string }[] = [
  { key: 'sommeil', label: 'Sommeil', Icon: Moon, iconColor: '#6366F1' },
  { key: 'seances', label: 'Seances', Icon: Flame, iconColor: '#F97316' },
  { key: 'signes', label: 'Signes Vitaux', Icon: Heart, iconColor: '#EC4899' },
  { key: 'pas', label: 'Pas', Icon: Footprints, iconColor: '#10B981' },
];

export const VitalitePage: React.FC = React.memo(() => {
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = language === 'fr' ? fr : enUS;

  const [activeTab, setActiveTab] = useState<SanteTab>('sommeil');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [isHealthKitConnected, setIsHealthKitConnected] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Modal state
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
  } | null>(null);

  const [vitalHistory, setVitalHistory] = useState<{
    sleep: any[];
    heartRate: any[];
    hrv: any[];
    steps: any[];
    calories: any[];
  }>({ sleep: [], heartRate: [], hrv: [], steps: [], calories: [] });

  const [sleepPhasesData, setSleepPhasesData] = useState<{
    avgAwake: number; avgRem: number; avgCore: number; avgDeep: number;
    totalSleepMin: number; nightsCount: number;
  }>({ avgAwake: 0, avgRem: 0, avgCore: 0, avgDeep: 0, totalSleepMin: 0, nightsCount: 0 });

  const [sleepComparisonData, setSleepComparisonData] = useState<{
    heartRate?: { min: number; max: number; avg: number };
    respiratoryRate?: { min: number; max: number; avg: number };
    wristTemperature?: { value: number };
  }>({});

  const [trainings, setTrainings] = useState<Training[]>([]);

  useEffect(() => {
    checkHealthKitConnection();
  }, []);

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
      const results = await Promise.allSettled([
        healthConnect.getLastSleep(),
        healthConnect.getTodayHeartRate(),
        healthConnect.getTodayHRV(),
        healthConnect.getTodayHydration(),
        healthConnect.getOxygenSaturation?.(),
        healthConnect.getRespiratoryRate?.(),
        healthConnect.getRestingHRHistory?.(7),
      ]);

      const sleep = results[0].status === 'fulfilled' ? results[0].value : { duration: 0, quality: 0, phases: {} };
      const heartRate = results[1].status === 'fulfilled' ? results[1].value : { current: 0, resting: 0 };
      const hrv = results[2].status === 'fulfilled' ? results[2].value : { value: 0, baseline: 0 };
      const oxygenSaturation = results[4].status === 'fulfilled' ? results[4].value : null;
      const respiratoryRate = results[5].status === 'fulfilled' ? results[5].value : null;
      const restingHRHistory = results[6].status === 'fulfilled' ? results[6].value : [];

      // Calculer HRV baseline
      let hrvBaseline = 0;
      if (hrv && restingHRHistory && Array.isArray(restingHRHistory) && restingHRHistory.length > 0) {
        try {
          const hrvHistoryForBaseline = await healthConnect.getHRVHistory?.(7) || [];
          if (Array.isArray(hrvHistoryForBaseline) && hrvHistoryForBaseline.length > 1) {
            hrvBaseline = Math.round(hrvHistoryForBaseline.reduce((sum: number, h: any) => sum + (h.value || 0), 0) / hrvHistoryForBaseline.length);
          }
        } catch {}
      }

      const enrichedHrv = hrv ? { ...hrv, baseline: hrvBaseline || (hrv as any)?.baseline || 0 } : { value: 0, baseline: 0 };

      setHealthData({ sleep, heartRate, hrv: enrichedHrv, oxygenSaturation, respiratoryRate });

      // Historique selon la periode
      const daysMap: { [key: string]: number } = { '7j': 7, '30j': 30, '90j': 90, '6m': 180, '1a': 365, 'tout': 365 };
      const days = daysMap[selectedPeriod] || 30;

      try {
        const [sleepHistory, heartRateHistory, hrvHistory, stepsHistory, caloriesHistory, sleepComparison, trainingData] = await Promise.all([
          healthConnect.getSleepHistory?.(days) || [],
          healthConnect.getRestingHRHistory?.(days) || [],
          healthConnect.getHRVHistory?.(days) || [],
          healthConnect.getStepsHistory?.(days) || [],
          healthConnect.getCaloriesHistory?.(days) || [],
          healthConnect.getSleepComparisonData?.(days) || {},
          getTrainings(days),
        ]);

        setTrainings(Array.isArray(trainingData) ? trainingData : []);

        // Filtrer sommeil invalide
        const validSleepHistory = Array.isArray(sleepHistory) ? sleepHistory.filter((s: any) => {
          const hours = (s.duration || s.total || 0) / 60;
          return hours >= 3 && hours <= 16;
        }) : [];

        // Moyennes phases sommeil
        if (validSleepHistory.length > 0) {
          const withPhases = validSleepHistory.filter((s: any) => s.deep > 0 || s.rem > 0 || s.core > 0);
          const count = withPhases.length || 1;
          const totalAwake = withPhases.reduce((sum: number, s: any) => sum + (s.awake || 0), 0);
          const totalRem = withPhases.reduce((sum: number, s: any) => sum + (s.rem || 0), 0);
          const totalCore = withPhases.reduce((sum: number, s: any) => sum + (s.core || 0), 0);
          const totalDeep = withPhases.reduce((sum: number, s: any) => sum + (s.deep || 0), 0);
          const totalSleep = validSleepHistory.reduce((sum: number, s: any) => sum + (s.total || s.duration || 0), 0);

          setSleepPhasesData({
            avgAwake: Math.round(totalAwake / count),
            avgRem: Math.round(totalRem / count),
            avgCore: Math.round(totalCore / count),
            avgDeep: Math.round(totalDeep / count),
            totalSleepMin: Math.round(totalSleep / validSleepHistory.length),
            nightsCount: validSleepHistory.length,
          });
        }

        if (sleepComparison) {
          setSleepComparisonData(sleepComparison as any);
        }

        setVitalHistory({
          sleep: validSleepHistory.map((s: any) => ({
            date: s.date,
            value: (s.duration || s.total || 0) / 60,
          })).reverse(),
          heartRate: Array.isArray(heartRateHistory) ? heartRateHistory.map((h: any) => ({
            date: h.date,
            value: h.resting || h.value || 0,
          })).reverse() : [],
          hrv: Array.isArray(hrvHistory) ? hrvHistory.map((h: any) => ({
            date: h.date,
            value: h.value || 0,
          })).reverse() : [],
          steps: Array.isArray(stepsHistory) ? stepsHistory.map((s: any) => ({
            date: s.date,
            value: s.value || s.count || 0,
          })).reverse() : [],
          calories: Array.isArray(caloriesHistory) ? caloriesHistory.map((c: any) => ({
            date: c.date,
            value: c.total || c.active || 0,
          })).reverse() : [],
        });
      } catch (historyError) {
        logger.info('Historical data not available:', historyError);
        setVitalHistory({ sleep: [], heartRate: [], hrv: [], steps: [], calories: [] });
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

  // Loading state
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

  // Not connected
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

  // Current steps/calories for PasTab
  const currentSteps = vitalHistory.steps.length > 0
    ? vitalHistory.steps[vitalHistory.steps.length - 1]?.value || 0
    : 0;
  const currentCalories = vitalHistory.calories.length > 0
    ? Math.round(vitalHistory.calories[vitalHistory.calories.length - 1]?.value || 0)
    : 0;

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

      {/* Barre de sous-onglets */}
      <View style={styles.tabBarContainer}>
        <View style={[styles.tabBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
          {TAB_CONFIG.map(({ key, label, Icon, iconColor }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tabPill,
                  isActive && { backgroundColor: colors.accent },
                ]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.7}
              >
                <Icon
                  size={16}
                  color={isActive ? colors.textOnAccent : colors.textMuted}
                  strokeWidth={2.5}
                />
                <Text style={[
                  styles.tabPillText,
                  { color: isActive ? colors.textOnAccent : colors.textMuted },
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Contenu de l'onglet actif */}
      <View style={styles.tabContent}>
        {activeTab === 'sommeil' && (
          <SommeilTab
            sleep={healthData?.sleep}
            sleepPhasesData={sleepPhasesData}
            sleepComparisonData={sleepComparisonData}
            sleepHistory={vitalHistory.sleep}
            onMetricPress={setSelectedMetric}
          />
        )}

        {activeTab === 'seances' && (
          <SeancesTab trainings={trainings} />
        )}

        {activeTab === 'signes' && (
          <SignesVitauxTab
            heartRate={healthData?.heartRate}
            hrv={healthData?.hrv}
            oxygenSaturation={healthData?.oxygenSaturation}
            respiratoryRate={healthData?.respiratoryRate}
            heartRateHistory={vitalHistory.heartRate}
            hrvHistory={vitalHistory.hrv}
            onMetricPress={setSelectedMetric}
          />
        )}

        {activeTab === 'pas' && (
          <PasTab
            steps={currentSteps}
            calories={currentCalories}
            stepsHistory={vitalHistory.steps}
            caloriesHistory={vitalHistory.calories}
          />
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* Modal de detail */}
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
    </ScrollView>
  );
});

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
  tabBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabContent: {
    paddingHorizontal: 16,
  },
});
