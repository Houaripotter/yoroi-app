// ============================================
// SANTÉ PAGE - Sommeil, Séances, Signes Vitaux, Pas
// Navigation par sous-onglets, style Apple Santé
// ============================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, RefreshControl, Linking, AppState, AppStateStatus, Alert, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsDetailModal } from '../StatsDetailModal';
import { HealthKitConnectCard } from '../HealthKitConnectCard';
import { healthConnect } from '@/lib/healthConnect';
import { isHealthKitAvailable } from '@/lib/healthKit.wrapper';
import { getTrainings, Training } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Moon, Flame, Heart, Footprints } from 'lucide-react-native';
import { SLEEP_DURATION_RANGES, HRV_RANGES, RESTING_HEART_RATE_RANGES } from '@/lib/healthRanges';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '@/lib/security/logger';
import { safeOpenURL } from '@/lib/security/validators';

import { SommeilTab } from './sante/SommeilTab';
import { SeancesTab } from './sante/SeancesTab';
import { SignesVitauxTab } from './sante/SignesVitauxTab';
import { PasTab } from './sante/PasTab';

export type SanteTab = 'sommeil' | 'seances' | 'signes' | 'pas';

const TAB_CONFIG: { key: SanteTab; label: string; Icon: React.FC<any>; iconColor: string; activeColor: string }[] = [
  { key: 'sommeil', label: 'Sommeil', Icon: Moon, iconColor: '#6366F1', activeColor: '#6366F1' },
  { key: 'seances', label: 'Séances', Icon: Flame, iconColor: '#F97316', activeColor: '#F97316' },
  { key: 'signes', label: 'Signes Vitaux', Icon: Heart, iconColor: '#EC4899', activeColor: '#EC4899' },
  { key: 'pas', label: 'Pas', Icon: Footprints, iconColor: '#10B981', activeColor: '#10B981' },
];

interface VitalitePageProps {
  forcedTab?: SanteTab;
  onNavigateToTab?: (tab: string) => void;
}

export const VitalitePage: React.FC<VitalitePageProps> = React.memo(({ forcedTab }) => {
  const { colors, isDark, screenBackground } = useTheme();
  const { t } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = fr;

  const [activeTab, setActiveTab] = useState<SanteTab>(forcedTab || 'sommeil');

  const pageTitle = forcedTab === 'sommeil' ? 'Sommeil'
    : forcedTab === 'pas' ? 'Pas'
    : forcedTab === 'signes' ? 'Signes Vitaux'
    : forcedTab === 'seances' ? 'Séances'
    : 'Santé';
  const pageDesc = forcedTab === 'sommeil' ? 'Analyse de tes nuits'
    : forcedTab === 'pas' ? 'Activité quotidienne'
    : forcedTab === 'signes' ? 'FC, VRC, SpO2...'
    : forcedTab === 'seances' ? 'Tout ton historique d\'entraînement'
    : 'Synchronise avec ton app Santé';
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('tout');
  const [isHealthKitConnected, setIsHealthKitConnected] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    distance: any[];
    exerciseMinutes: any[];
    standHours: any[];
    spo2: any[];
    respiratoryRate: any[];
    vo2max: any[];
    bodyTemperature: any[];
    bloodGlucose: any[];
  }>({ sleep: [], heartRate: [], hrv: [], steps: [], calories: [], distance: [], exerciseMinutes: [], standHours: [], spo2: [], respiratoryRate: [], vo2max: [], bodyTemperature: [], bloodGlucose: [] });

  const [sleepPhasesData, setSleepPhasesData] = useState<{
    avgAwake: number; avgRem: number; avgCore: number; avgDeep: number;
    totalSleepMin: number; nightsCount: number;
  }>({ avgAwake: 0, avgRem: 0, avgCore: 0, avgDeep: 0, totalSleepMin: 0, nightsCount: 0 });

  const [sleepComparisonData, setSleepComparisonData] = useState<{
    heartRate?: { min: number; max: number; avg: number };
    respiratoryRate?: { min: number; max: number; avg: number };
    wristTemperature?: { value: number };
    heartRateHistory?: { date: string; value: number }[];
    respiratoryRateHistory?: { date: string; value: number }[];
  }>({});

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [rawSleepHistory, setRawSleepHistory] = useState<any[]>([]);
  const [todaySteps, setTodaySteps] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayDistance, setTodayDistance] = useState(0);
  const [todayExerciseMinutes, setTodayExerciseMinutes] = useState(0);
  const [todayStandHours, setTodayStandHours] = useState(0);

  const [todayFloors, setTodayFloors] = useState(0);
  const [todayMindfulMinutes, setTodayMindfulMinutes] = useState(0);
  const [todayHydration, setTodayHydration] = useState(0);
  const [todayBodyTemp, setTodayBodyTemp] = useState(0);
  const [todayBloodGlucose, setTodayBloodGlucose] = useState(0);
  const [tabLoading, setTabLoading] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Toujours vérifier la connexion HealthKit pour permettre la sync
    checkHealthKitConnection();
  }, []);

  // Compteur pour annuler les chargements perimés
  const loadIdRef = useRef(0);

  // Quand on change d'onglet ou de periode, charger les données de cet onglet
  // Ne pas recharger si deja charge (performance)
  useEffect(() => {
    if (!loading && !loadedTabs.has(activeTab)) {
      if (activeTab === 'seances') {
        loadTabData(activeTab);
      } else if (isHealthKitConnected) {
        loadTabData(activeTab);
      }
    }
  }, [activeTab, selectedPeriod]);

  // Invalider les tabs chargees ET vider les données quand la periode change
  useEffect(() => {
    setLoadedTabs(new Set());
    setVitalHistory({ sleep: [], heartRate: [], hrv: [], steps: [], calories: [], distance: [], exerciseMinutes: [], standHours: [], spo2: [], respiratoryRate: [], vo2max: [], bodyTemperature: [], bloodGlucose: [] });
    setRawSleepHistory([]);
    setTrainings([]);
    setSleepPhasesData({ avgAwake: 0, avgRem: 0, avgCore: 0, avgDeep: 0, totalSleepMin: 0, nightsCount: 0 });
  }, [selectedPeriod]);

  const checkHealthKitConnection = async () => {
    try {
      const syncStatus = healthConnect.getSyncStatus();
      let isConnected = syncStatus.isConnected;

      const { failureReason } = syncStatus;
      const isDefinitiveFailure =
        failureReason === 'MODULE_NOT_LOADED' ||
        (failureReason === 'DEVICE_NOT_SUPPORTED' && !isHealthKitAvailable);
      const shouldRetry =
        !isConnected &&
        !isDefinitiveFailure &&
        isHealthKitAvailable;

      if (shouldRetry) {
        try {
          logger.info('[Santé] Tentative reconnexion silencieuse...');
          const success = await healthConnect.connect();
          if (success) {
            isConnected = true;
            logger.info('[Santé] Reconnexion silencieuse réussie');
          }
        } catch (reconnectErr) {
          logger.warn('[Santé] Reconnexion silencieuse échouée:', reconnectErr);
        }
      }

      if (isConnected) {
        // Sync HealthKit trainings (non-destructif)
        try {
          const syncedVersion = await AsyncStorage.getItem('@yoroi_trainings_synced_v5');
          const existingTrainings = await getTrainings();
          
          // Sync if never done, if DB empty, or if we are on the seances tab
          const needsSync = !syncedVersion || existingTrainings.length === 0 || activeTab === 'seances';
          
          if (needsSync) {
            try {
              await healthConnect.syncAll();
              logger.info('[Santé] Sync HealthKit termine');
              if (activeTab === 'seances') await loadTabData('seances');
            } catch (syncErr) {
              logger.warn('[Santé] syncAll echoue:', syncErr);
            }
            await AsyncStorage.setItem('@yoroi_trainings_synced_v5', 'true');
          }
        } catch (cleanupErr) {
          logger.warn('[Santé] Sync error:', cleanupErr);
        }
        // Marquer comme connecte et charger les données en parallèle
        setIsHealthKitConnected(true);
        // Lancer loadHealthData et loadTabData en parallèle (pas besoin d'attendre l'un pour l'autre)
        loadHealthData();
        loadTabData(activeTab);
      } else {
        // Pas connecte, on arrete le loading
        setLoading(false);
        // Charger les séances locales meme sans HealthKit
        loadTabData('seances');
      }
    } catch (error) {
      logger.error('Error checking HealthKit:', error);
      setLoading(false);
    }
  };

  // Phase 1: Charger les données de base (rapide) - affichage instantane
  const loadHealthData = async () => {
    setLoading(true);
    try {
      // Timeout de 5s pour les données de base (doivent etre rapides)
      const timeoutPromise = new Promise<PromiseSettledResult<any>[]>((resolve) =>
        setTimeout(() => {
          logger.warn('[Santé] Timeout sur loadHealthData (5s)');
          resolve(Array(10).fill({ status: 'rejected', reason: 'timeout' }));
        }, 5000)
      );

      const results = await Promise.race([
        Promise.allSettled([
          healthConnect.getLastSleep(),                      // 0
          healthConnect.getTodayHeartRate(),                 // 1
          healthConnect.getTodayHRV(),                       // 2
          healthConnect.getOxygenSaturation?.(),             // 3
          healthConnect.getRespiratoryRate?.(),              // 4
          healthConnect.getTodaySteps(),                     // 5
          healthConnect.getTodayCalories(),                  // 6
          healthConnect.getTodayDistance?.(),                // 7
          healthConnect.getTodayExerciseMinutes?.(),         // 8
          healthConnect.getTodayStandHours?.(),              // 9
          (healthConnect.getVO2Max?.() ?? Promise.resolve(null)),          // 10
          (healthConnect.getBloodPressure?.() ?? Promise.resolve(null)),   // 11
          (healthConnect.getFloorsClimbed?.() ?? Promise.resolve(null)),   // 12
          (healthConnect.getMindfulMinutes?.() ?? Promise.resolve(null)),  // 13
          (healthConnect.getTodayHydration?.() ?? Promise.resolve(null)),  // 14
          (healthConnect.getBodyTemperature?.() ?? Promise.resolve(null)), // 15
          (healthConnect.getBloodGlucose?.() ?? Promise.resolve(null)),    // 16
        ]),
        timeoutPromise,
      ]);

      const sleep = results[0].status === 'fulfilled' ? results[0].value : { duration: 0, quality: 0, phases: {} };
      const heartRate = results[1].status === 'fulfilled' ? results[1].value : { current: 0, resting: 0 };
      const hrv = results[2].status === 'fulfilled' ? results[2].value : { value: 0, baseline: 0 };
      const oxygenSaturation = results[3].status === 'fulfilled' ? results[3].value : null;
      const respiratoryRate = results[4].status === 'fulfilled' ? results[4].value : null;
      const vo2max = (results as any)[10]?.status === 'fulfilled' ? (results as any)[10].value : null;
      const bloodPressure = (results as any)[11]?.status === 'fulfilled' ? (results as any)[11].value : null;

      setHealthData({ sleep, heartRate, hrv, oxygenSaturation, respiratoryRate, vo2max, bloodPressure });
      setTodaySteps((results[5] as any).status === 'fulfilled' ? (results[5] as any).value?.count || 0 : 0);
      setTodayCalories((results[6] as any).status === 'fulfilled' ? (results[6] as any).value?.active || 0 : 0);
      // Distance en km
      const distData = results[7]?.status === 'fulfilled' ? (results[7] as any).value : null;
      const dist = distData?.walking ? (distData.walking + (distData.running || 0)) : (typeof distData === 'number' ? distData : 0);
      setTodayDistance(dist);
      setTodayExerciseMinutes(results[8]?.status === 'fulfilled' ? ((results[8] as any).value || 0) : 0);
      setTodayStandHours(results[9]?.status === 'fulfilled' ? ((results[9] as any).value || 0) : 0);
      setTodayFloors((results as any)[12]?.status === 'fulfilled' ? ((results as any)[12].value || 0) : 0);
      const mindfulData = (results as any)[13]?.status === 'fulfilled' ? (results as any)[13].value : null;
      setTodayMindfulMinutes(mindfulData?.minutes || 0);
      const hydrationData = (results as any)[14]?.status === 'fulfilled' ? (results as any)[14].value : null;
      setTodayHydration(hydrationData?.amount || 0);
      const bodyTempData = (results as any)[15]?.status === 'fulfilled' ? (results as any)[15].value : null;
      setTodayBodyTemp(bodyTempData?.value || 0);
      const bloodGlucoseData = (results as any)[16]?.status === 'fulfilled' ? (results as any)[16].value : null;
      setTodayBloodGlucose(bloodGlucoseData?.value || 0);
      // Ajouter bodyTemperature et bloodGlucose dans healthData pour les tabs
      if (bodyTempData || bloodGlucoseData) {
        setHealthData((prev: any) => prev ? {
          ...prev,
          bodyTemperature: bodyTempData,
          bloodGlucose: bloodGlucoseData,
        } : prev);
      }
    } catch (error) {
      logger.error('Error loading base health data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Timeout helper pour eviter les blocages sur grosses requetes
  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => {
        logger.warn(`[Santé] Timeout apres ${ms}ms`);
        resolve(fallback);
      }, ms)),
    ]);
  };

  // Phase 2: Charger les données de l'onglet actif seulement (lazy)
  const loadTabData = async (tab: SanteTab) => {
    const daysMap: { [key: string]: number } = { '7j': 7, '30j': 30, '90j': 90, '6m': 180, '1a': 365, '2a': 730, 'tout': 3650 };
    const days = selectedPeriod in daysMap ? daysMap[selectedPeriod] : 30;
    // Pour TOUT: les fonctions "loop" sont cappées à 365 jours (bulk query pour le reste).
    // Bulk queries HealthKit : ~2-5s. Augmenter le timeout pour laisser le temps.
    const timeoutMs = days > 730 ? 60000 : days > 180 ? 15000 : 8000;
    const currentLoadId = ++loadIdRef.current;

    setTabLoading(true);
    try {
      switch (tab) {
        case 'sommeil': {
          const [sleepHistory, sleepComparison] = await withTimeout(
            Promise.all([
              healthConnect.getSleepHistory?.(days) || [],
              healthConnect.getSleepComparisonData?.(days) || {},
            ]),
            timeoutMs,
            [[], {}]
          );

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
          // Déclencher une sync en arrière-plan pour l'onglet Séances
          if (isHealthKitConnected) {
            healthConnect.syncAll().catch(err => logger.warn('[Vitalite] Sync auto echoue:', err));
          }
          // Quand periode = 'tout', pas de limite (tout l'historique)
          const trainingData = selectedPeriod === 'tout' ? await getTrainings() : await getTrainings(days);
          setTrainings(Array.isArray(trainingData) ? trainingData : []);
          break;
        }

        case 'signes': {
          const [heartRateHistory, hrvHistory, spo2History, respRateHistory, vo2maxHistory, bodyTempHistory, bloodGlucoseHistory] = await withTimeout(
            Promise.all([
              (healthConnect.getHeartRateHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getHRVHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getOxygenSaturationHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getRespiratoryRateHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getVO2MaxHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getBodyTemperatureHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getBloodGlucoseHistory?.(days) ?? Promise.resolve([])).catch(() => []),
            ]),
            timeoutMs,
            [[], [], [], [], [], [], []]
          );

          // HRV baseline
          if (Array.isArray(hrvHistory) && hrvHistory.length > 1) {
            const hrvBaseline = Math.round(hrvHistory.reduce((sum: number, h: any) => sum + (h.value || 0), 0) / hrvHistory.length);
            setHealthData((prev: any) => prev ? { ...prev, hrv: { ...prev.hrv, baseline: hrvBaseline } } : prev);
          }

          setVitalHistory(prev => ({
            ...prev,
            heartRate: Array.isArray(heartRateHistory) ? heartRateHistory.map((h: any) => ({
              date: h.date, value: h.value || h.resting || 0,
            })).reverse() : [],
            hrv: Array.isArray(hrvHistory) ? hrvHistory.map((h: any) => ({
              date: h.date, value: h.value || 0,
            })).reverse() : [],
            spo2: Array.isArray(spo2History) ? spo2History.map((s: any) => ({
              date: s.date, value: s.value || 0,
            })).reverse() : [],
            respiratoryRate: Array.isArray(respRateHistory) ? respRateHistory.map((r: any) => ({
              date: r.date, value: r.value || 0,
            })).reverse() : [],
            vo2max: Array.isArray(vo2maxHistory) ? vo2maxHistory.map((v: any) => ({
              date: v.date, value: v.value || 0,
            })).reverse() : [],
            bodyTemperature: Array.isArray(bodyTempHistory) ? bodyTempHistory.map((t: any) => ({
              date: t.date, value: t.value || 0,
            })).reverse() : [],
            bloodGlucose: Array.isArray(bloodGlucoseHistory) ? bloodGlucoseHistory.map((g: any) => ({
              date: g.date, value: g.value || 0,
            })).reverse() : [],
          }));
          break;
        }

        case 'pas': {
          const [stepsHistory, caloriesHistory, distanceHistory, exerciseHistory, standHistory] = await withTimeout(
            Promise.all([
              healthConnect.getStepsHistory?.(days) || [],
              healthConnect.getCaloriesHistory?.(days) || [],
              healthConnect.getDistanceHistory?.(days) || [],
              healthConnect.getExerciseMinutesHistory?.(days) || [],
              healthConnect.getStandHoursHistory?.(days) || [],
            ]),
            timeoutMs,
            [[], [], [], [], []]
          );

          setVitalHistory(prev => ({
            ...prev,
            steps: Array.isArray(stepsHistory) ? stepsHistory.map((s: any) => ({
              date: s.date, value: s.value || s.count || 0,
            })).reverse() : [],
            calories: Array.isArray(caloriesHistory) ? caloriesHistory.map((c: any) => ({
              date: c.date, value: c.total || c.active || 0,
            })).reverse() : [],
            distance: Array.isArray(distanceHistory) ? distanceHistory.map((d: any) => ({
              date: d.date, value: d.value || 0,
            })).reverse() : [],
            exerciseMinutes: Array.isArray(exerciseHistory) ? exerciseHistory.map((e: any) => ({
              date: e.date, value: e.value || 0,
            })).reverse() : [],
            standHours: Array.isArray(standHistory) ? standHistory.map((s: any) => ({
              date: s.date, value: s.value || 0,
            })).reverse() : [],
          }));
          break;
        }
      }
      if (currentLoadId === loadIdRef.current) {
        setLoadedTabs(prev => new Set(prev).add(tab));
      }
    } catch (error) {
      logger.warn(`[Santé] Error loading ${tab} data:`, error);
    } finally {
      if (currentLoadId === loadIdRef.current) {
        setTabLoading(false);
      }
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setLoadedTabs(new Set());
      if (forcedTab === 'seances') {
        // Séances : recharger directement, pas besoin de HealthKit
        setTrainings([]);
        await loadTabData('seances');
      } else {
        if (isHealthKitConnected) {
          try {
            await healthConnect.syncAll();
          } catch (syncErr) {
            logger.warn('[Refresh] syncAll échoué:', syncErr);
          }
        }
        await checkHealthKitConnection();
      }
    } finally {
      setRefreshing(false);
    }
  }, [isHealthKitConnected, forcedTab]);

  // Listener AppState : quand l'app revient au premier plan (après Réglages), re-tenter la connexion
  const retryAfterSettingsRef = useRef(false);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active' && retryAfterSettingsRef.current) {
        retryAfterSettingsRef.current = false;
        setConnecting(true);
        try {
          const success = await healthConnect.connect();
          if (success) {
            setIsHealthKitConnected(true);
            await loadHealthData();
          }
        } catch (err) {
          logger.warn('[Santé] Re-tentative après Réglages échouée:', err);
        } finally {
          setConnecting(false);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const handleConnectHealthKit = async () => {
    setConnecting(true);
    try {
      const success = await healthConnect.connect();
      if (success) {
        setIsHealthKitConnected(true);
        setLoadedTabs(new Set()); // Forcer rechargement de tous les onglets
        // Importer les séances HealthKit après connexion (reset fingerprints pour tout importer)
        await AsyncStorage.removeItem('@yoroi_imported_workouts');
        try {
          await healthConnect.syncAll();
          logger.info('[Santé] syncAll apres connexion termine');
        } catch (syncErr) {
          logger.warn('[Santé] syncAll apres connexion echoue:', syncErr);
        }
        await AsyncStorage.setItem('@yoroi_trainings_cleaned_v4', 'true');
        await loadHealthData();
      } else {
        const { failureReason } = healthConnect.getSyncStatus();
        if (failureReason === 'HEALTH_CONNECT_NOT_INSTALLED') {
          // Android : Health Connect pas installé
          Alert.alert(
            'Health Connect requis',
            'L\'app Health Connect de Google doit être installée pour synchroniser tes données. Elle est gratuite sur le Play Store.',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Installer',
                onPress: () => safeOpenURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'),
              },
            ]
          );
        } else if (failureReason === 'MODULE_NOT_LOADED') {
          Alert.alert(
            'Build natif requis',
            'Apple Santé nécessite un build natif de l\'app (pas Expo Go). Lance l\'app via Xcode ou un build de production.',
            [{ text: 'OK' }]
          );
        } else if (failureReason === 'DEVICE_NOT_SUPPORTED') {
          const msg = Platform.OS === 'android'
            ? 'Health Connect n\'est pas disponible sur cet appareil (Android 9+ requis).'
            : 'Apple Santé n\'est pas disponible sur cet appareil. Assure-toi d\'utiliser un iPhone (pas un simulateur).';
          Alert.alert('Non disponible', msg, [{ text: 'OK' }]);
        } else {
          // USER_DENIED ou UNKNOWN
          if (Platform.OS === 'android') {
            Alert.alert(
              'Activer les permissions',
              'Va dans Réglages > Applis > Yoroi > Permissions, ou ouvre Health Connect et autorise Yoroi à lire tes données.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Ouvrir Réglages',
                  onPress: () => {
                    retryAfterSettingsRef.current = true;
                    Linking.openSettings();
                  },
                },
              ]
            );
          } else {
            Alert.alert(
              'Activer les permissions',
              'Va dans Réglages > Santé > Partage des données > Yoroi et active les données souhaitées (Activité, Sommeil, Fréquence cardiaque...)',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Ouvrir Réglages',
                  onPress: () => {
                    retryAfterSettingsRef.current = true;
                    Linking.openSettings();
                  },
                },
              ]
            );
          }
        }
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

  // Current steps/calories for PasTab - utilise todaySteps/todayCalories (meme API que l'accueil)
  const currentSteps = todaySteps;
  const currentCalories = Math.round(todayCalories);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: screenBackground }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      onScroll={onScrollContext}
      scrollEventThrottle={100}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <StatsHeader
        title={pageTitle}
        description={pageDesc}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Barre de sous-onglets - masquée si forcedTab */}
      {!forcedTab && (
        <View style={styles.tabBarContainer}>
          <View style={[styles.tabBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
            {TAB_CONFIG.map(({ key, label, Icon, iconColor, activeColor }) => {
              const isActive = activeTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.tabPill,
                    isActive
                      ? {
                          backgroundColor: activeColor,
                          shadowColor: activeColor,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 4,
                        }
                      : {
                          backgroundColor: isDark ? 'transparent' : 'transparent',
                        },
                  ]}
                  onPress={() => setActiveTab(key)}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={15}
                    color={isActive ? '#FFFFFF' : (isDark ? colors.textMuted : iconColor)}
                    strokeWidth={2.5}
                  />
                  <Text style={[
                    styles.tabPillText,
                    { color: isActive ? '#FFFFFF' : (isDark ? colors.textMuted : iconColor) },
                    isActive && { fontWeight: '700' },
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Contenu de l'onglet actif */}
      <View style={styles.tabContent}>
        {tabLoading && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}

        {activeTab === 'sommeil' && !isHealthKitConnected && (
          <HealthKitConnectCard onConnect={handleConnectHealthKit} isConnecting={connecting} />
        )}
        {activeTab === 'sommeil' && isHealthKitConnected && (
          <SommeilTab
            sleep={healthData?.sleep}
            sleepPhasesData={sleepPhasesData}
            sleepComparisonData={sleepComparisonData}
            sleepHistory={vitalHistory.sleep}
            rawSleepHistory={rawSleepHistory}
            mindfulMinutes={todayMindfulMinutes}
            onMetricPress={setSelectedMetric}
          />
        )}

        {activeTab === 'seances' && (
          <SeancesTab period={selectedPeriod} />
        )}

        {activeTab === 'signes' && !isHealthKitConnected && (
          <HealthKitConnectCard onConnect={handleConnectHealthKit} isConnecting={connecting} />
        )}
        {activeTab === 'signes' && isHealthKitConnected && (
          <SignesVitauxTab
            heartRate={healthData?.heartRate}
            hrv={healthData?.hrv}
            oxygenSaturation={healthData?.oxygenSaturation}
            respiratoryRate={healthData?.respiratoryRate}
            vo2max={healthData?.vo2max}
            bloodPressure={healthData?.bloodPressure}
            bodyTemperature={healthData?.bodyTemperature}
            bloodGlucose={healthData?.bloodGlucose}
            heartRateHistory={vitalHistory.heartRate}
            hrvHistory={vitalHistory.hrv}
            spo2History={vitalHistory.spo2}
            respiratoryRateHistory={vitalHistory.respiratoryRate}
            vo2maxHistory={vitalHistory.vo2max}
            bodyTemperatureHistory={vitalHistory.bodyTemperature}
            bloodGlucoseHistory={vitalHistory.bloodGlucose}
            onMetricPress={setSelectedMetric}
          />
        )}

        {activeTab === 'pas' && !isHealthKitConnected && (
          <HealthKitConnectCard onConnect={handleConnectHealthKit} isConnecting={connecting} />
        )}
        {activeTab === 'pas' && isHealthKitConnected && (
          <PasTab
            steps={currentSteps}
            calories={currentCalories}
            distance={todayDistance}
            exerciseMinutes={todayExerciseMinutes}
            standHours={todayStandHours}
            floors={todayFloors}
            todayHydration={todayHydration}
            weeklyExerciseMinutes={vitalHistory.exerciseMinutes
              .slice(0, 7)
              .reduce((sum, d) => sum + (d.value || 0), 0)}
            stepsHistory={vitalHistory.steps}
            caloriesHistory={vitalHistory.calories}
            distanceHistory={vitalHistory.distance}
            exerciseMinutesHistory={vitalHistory.exerciseMinutes}
            standHoursHistory={vitalHistory.standHours}
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
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 4,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    paddingHorizontal: 8,
  },
});
