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
import { getTrainings, Training, deleteAllTrainings } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const TAB_CONFIG: { key: SanteTab; label: string; Icon: React.FC<any>; iconColor: string; activeColor: string }[] = [
  { key: 'sommeil', label: 'Sommeil', Icon: Moon, iconColor: '#6366F1', activeColor: '#6366F1' },
  { key: 'seances', label: 'Seances', Icon: Flame, iconColor: '#F97316', activeColor: '#F97316' },
  { key: 'signes', label: 'Signes Vitaux', Icon: Heart, iconColor: '#EC4899', activeColor: '#EC4899' },
  { key: 'pas', label: 'Pas', Icon: Footprints, iconColor: '#10B981', activeColor: '#10B981' },
];

export const VitalitePage: React.FC = React.memo(() => {
  const { colors, isDark } = useTheme();
  const { t, language } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = language === 'fr' ? fr : enUS;

  const [activeTab, setActiveTab] = useState<SanteTab>('sommeil');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('tout');
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
    spo2: any[];
    respiratoryRate: any[];
  }>({ sleep: [], heartRate: [], hrv: [], steps: [], calories: [], spo2: [], respiratoryRate: [] });

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
  const [rawSleepHistory, setRawSleepHistory] = useState<any[]>([]);
  const [todaySteps, setTodaySteps] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0);

  const [tabLoading, setTabLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkHealthKitConnection();
  }, []);

  // Quand on change d'onglet ou de periode, charger les donnees de cet onglet
  useEffect(() => {
    if (isHealthKitConnected && !loading) {
      loadTabData(activeTab);
    }
  }, [activeTab, selectedPeriod]);

  // Invalider les tabs chargees quand la periode change
  useEffect(() => {
    setLoadedTabs(new Set());
  }, [selectedPeriod]);

  const checkHealthKitConnection = async () => {
    try {
      const status = healthConnect.getSyncStatus();
      if (status.isConnected) {
        // One-time cleanup: supprimer les seances demo et reimporter depuis HealthKit
        // IMPORTANT: ceci DOIT se terminer AVANT de trigger loadHealthData
        try {
          const cleaned = await AsyncStorage.getItem('@yoroi_trainings_cleaned_v4');
          if (!cleaned) {
            const deleted = await deleteAllTrainings();
            logger.info(`[Sante] Cleanup v4: ${deleted} trainings supprimes, reimport 5 ans avec details`);
            await AsyncStorage.removeItem('@yoroi_imported_workouts');
            try {
              await healthConnect.syncAll();
              logger.info('[Sante] Reimport HealthKit termine (v4 - avec details enrichis)');
            } catch (syncErr) {
              logger.warn('[Sante] syncAll apres cleanup echoue:', syncErr);
            }
            await AsyncStorage.setItem('@yoroi_trainings_cleaned_v4', 'true');
          }
        } catch (cleanupErr) {
          logger.warn('[Sante] Cleanup error:', cleanupErr);
        }
        // APRES le cleanup, marquer comme connecte et charger les donnees
        setIsHealthKitConnected(true);
        await loadHealthData();
      }
    } catch (error) {
      logger.error('Error checking HealthKit:', error);
    } finally {
      setLoading(false);
    }
  };

  // Phase 1: Charger les donnees de base (rapide) - affichage instantane
  const loadHealthData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        healthConnect.getLastSleep(),
        healthConnect.getTodayHeartRate(),
        healthConnect.getTodayHRV(),
        healthConnect.getOxygenSaturation?.(),
        healthConnect.getRespiratoryRate?.(),
        healthConnect.getTodaySteps(),
        healthConnect.getTodayCalories(),
      ]);

      const sleep = results[0].status === 'fulfilled' ? results[0].value : { duration: 0, quality: 0, phases: {} };
      const heartRate = results[1].status === 'fulfilled' ? results[1].value : { current: 0, resting: 0 };
      const hrv = results[2].status === 'fulfilled' ? results[2].value : { value: 0, baseline: 0 };
      const oxygenSaturation = results[3].status === 'fulfilled' ? results[3].value : null;
      const respiratoryRate = results[4].status === 'fulfilled' ? results[4].value : null;

      setHealthData({ sleep, heartRate, hrv, oxygenSaturation, respiratoryRate });
      setTodaySteps((results[5] as any).status === 'fulfilled' ? (results[5] as any).value?.count || 0 : 0);
      setTodayCalories((results[6] as any).status === 'fulfilled' ? (results[6] as any).value?.active || 0 : 0);
    } catch (error) {
      logger.error('Error loading base health data:', error);
    } finally {
      setLoading(false);
      // Charger l'onglet actif apres les donnees de base
      loadTabData(activeTab);
    }
  };

  // Phase 2: Charger les donnees de l'onglet actif seulement (lazy)
  const loadTabData = async (tab: SanteTab) => {
    const daysMap: { [key: string]: number } = { '7j': 7, '30j': 30, '90j': 90, '6m': 180, 'tout': 1825 };
    const days = daysMap[selectedPeriod] || 30;

    setTabLoading(true);
    try {
      switch (tab) {
        case 'sommeil': {
          const [sleepHistory, sleepComparison] = await Promise.all([
            healthConnect.getSleepHistory?.(days) || [],
            healthConnect.getSleepComparisonData?.(days) || {},
          ]);

          const validSleepHistory = Array.isArray(sleepHistory) ? sleepHistory.filter((s: any) => {
            const hours = (s.duration || s.total || 0) / 60;
            return hours >= 3 && hours <= 16;
          }) : [];

          setRawSleepHistory(validSleepHistory);

          if (validSleepHistory.length > 0) {
            const withPhases = validSleepHistory.filter((s: any) => s.deep > 0 || s.rem > 0 || s.core > 0);
            const count = withPhases.length || 1;
            setSleepPhasesData({
              avgAwake: Math.round(withPhases.reduce((sum: number, s: any) => sum + (s.awake || 0), 0) / count),
              avgRem: Math.round(withPhases.reduce((sum: number, s: any) => sum + (s.rem || 0), 0) / count),
              avgCore: Math.round(withPhases.reduce((sum: number, s: any) => sum + (s.core || 0), 0) / count),
              avgDeep: Math.round(withPhases.reduce((sum: number, s: any) => sum + (s.deep || 0), 0) / count),
              totalSleepMin: Math.round(validSleepHistory.reduce((sum: number, s: any) => sum + (s.total || s.duration || 0), 0) / validSleepHistory.length),
              nightsCount: validSleepHistory.length,
            });
          }

          if (sleepComparison) setSleepComparisonData(sleepComparison as any);

          setVitalHistory(prev => ({
            ...prev,
            sleep: validSleepHistory.map((s: any) => ({
              date: s.date,
              value: (s.duration || s.total || 0) / 60,
            })).reverse(),
          }));
          break;
        }

        case 'seances': {
          const trainingData = await getTrainings(days);
          setTrainings(Array.isArray(trainingData) ? trainingData : []);
          break;
        }

        case 'signes': {
          const [heartRateHistory, hrvHistory, spo2History] = await Promise.all([
            healthConnect.getRestingHRHistory?.(days) || [],
            healthConnect.getHRVHistory?.(days) || [],
            healthConnect.getOxygenSaturationHistory?.(days).catch(() => []) || [],
          ]);

          // HRV baseline
          if (Array.isArray(hrvHistory) && hrvHistory.length > 1) {
            const hrvBaseline = Math.round(hrvHistory.reduce((sum: number, h: any) => sum + (h.value || 0), 0) / hrvHistory.length);
            setHealthData((prev: any) => prev ? { ...prev, hrv: { ...prev.hrv, baseline: hrvBaseline } } : prev);
          }

          setVitalHistory(prev => ({
            ...prev,
            heartRate: Array.isArray(heartRateHistory) ? heartRateHistory.map((h: any) => ({
              date: h.date, value: h.resting || h.value || 0,
            })).reverse() : [],
            hrv: Array.isArray(hrvHistory) ? hrvHistory.map((h: any) => ({
              date: h.date, value: h.value || 0,
            })).reverse() : [],
            spo2: Array.isArray(spo2History) ? spo2History.map((s: any) => ({
              date: s.date, value: s.value || 0,
            })).reverse() : [],
          }));
          break;
        }

        case 'pas': {
          const [stepsHistory, caloriesHistory] = await Promise.all([
            healthConnect.getStepsHistory?.(days) || [],
            healthConnect.getCaloriesHistory?.(days) || [],
          ]);

          setVitalHistory(prev => ({
            ...prev,
            steps: Array.isArray(stepsHistory) ? stepsHistory.map((s: any) => ({
              date: s.date, value: s.value || s.count || 0,
            })).reverse() : [],
            calories: Array.isArray(caloriesHistory) ? caloriesHistory.map((c: any) => ({
              date: c.date, value: c.total || c.active || 0,
            })).reverse() : [],
          }));
          break;
        }
      }
      setLoadedTabs(prev => new Set(prev).add(tab));
    } catch (error) {
      logger.info(`[Sante] Error loading ${tab} data:`, error);
    } finally {
      setTabLoading(false);
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
      case 'spo2':
        return vitalHistory.spo2.map((s) => ({
          value: s.value,
          label: format(new Date(s.date), 'd MMM', { locale: dateLocale }),
          date: s.date,
        }));
      case 'respiratory_rate':
        return vitalHistory.respiratoryRate.map((r) => ({
          value: r.value,
          label: format(new Date(r.date), 'd MMM', { locale: dateLocale }),
          date: r.date,
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
          title="Sante"
          description="Synchronise avec ton app Sante"
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
          title="Sante"
          description="Synchronise avec ton app Sante"
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

  // Current steps/calories for PasTab - utilise todaySteps/todayCalories (meme API que l'accueil)
  const currentSteps = todaySteps;
  const currentCalories = Math.round(todayCalories);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      onScroll={onScrollContext}
      scrollEventThrottle={100}
    >
      <StatsHeader
        title="Sante"
        description="Synchronise avec ton app Sante"
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Barre de sous-onglets - style colore */}
      <View style={styles.tabBarContainer}>
        <View style={[styles.tabBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
          {TAB_CONFIG.map(({ key, label, Icon, iconColor, activeColor }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tabPill,
                  isActive && {
                    backgroundColor: activeColor,
                    shadowColor: activeColor,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  },
                ]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.7}
              >
                <Icon
                  size={15}
                  color={isActive ? '#FFFFFF' : colors.textMuted}
                  strokeWidth={2.5}
                />
                <Text style={[
                  styles.tabPillText,
                  { color: isActive ? '#FFFFFF' : colors.textMuted },
                  isActive && { fontWeight: '700' },
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
        {tabLoading && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}

        {activeTab === 'sommeil' && (
          <SommeilTab
            sleep={healthData?.sleep}
            sleepPhasesData={sleepPhasesData}
            sleepComparisonData={sleepComparisonData}
            sleepHistory={vitalHistory.sleep}
            rawSleepHistory={rawSleepHistory}
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
            spo2History={vitalHistory.spo2}
            respiratoryRateHistory={vitalHistory.respiratoryRate}
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
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 14,
  },
  tabPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabContent: {
    paddingHorizontal: 16,
  },
});
