// ============================================
// STATS HEALTH CONTEXT
// - Chargement unique partagé entre tous les onglets Santé
// - Cache AsyncStorage : graphiques instantanés au 2e lancement
// - Refresh HealthKit en arrière-plan sans bloquer l'affichage
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  InteractionManager,
  unstable_batchedUpdates,
  Alert,
  Platform,
  Linking,
  DeviceEventEmitter,
  AppState,
  AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthConnect } from '@/lib/healthConnect';
import { isHealthKitAvailable } from '@/lib/healthKit.wrapper';
import { getTrainings } from '@/lib/database';
import { getSleepEntries } from '@/lib/sleepService';
import { logger } from '@/lib/security/logger';
import { safeOpenURL } from '@/lib/security/validators';
import { useI18n } from '@/lib/I18nContext';
import type { Period } from '@/components/stats/StatsHeader';

export type SanteTab = 'sommeil' | 'seances' | 'signes' | 'pas';

// -------------------------------------------------------
// Cache keys & TTL
// -------------------------------------------------------
const CACHE_BASE_KEY = '@yoroi_stats_health_base_v3';
const CACHE_TAB_KEY = (tab: string, period: string) => `@yoroi_stats_health_${tab}_${period}_v3`;
const BASE_TTL  = 20 * 60 * 1000;   // 20 min  — données "aujourd'hui" (FC, pas, etc.)
const TAB_TTL   = 6 * 60 * 60 * 1000; // 6 heures — historiques (sommeil, FC, pas…)

interface VitalHistory {
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
}

interface SleepPhasesData {
  avgAwake: number;
  avgRem: number;
  avgCore: number;
  avgDeep: number;
  totalSleepMin: number;
  nightsCount: number;
}

interface StatsHealthContextValue {
  isHealthKitConnected: boolean;
  loading: boolean;
  refreshing: boolean;
  tabLoading: boolean;
  connecting: boolean;
  selectedPeriod: Period;
  setSelectedPeriod: (p: Period) => void;
  healthData: any | null;
  todaySteps: number;
  todayCalories: number;
  todayDistance: number;
  todayExerciseMinutes: number;
  todayStandHours: number;
  todayFloors: number;
  todayMindfulMinutes: number;
  todayHydration: number;
  todayBodyTemp: number;
  todayBloodGlucose: number;
  vitalHistory: VitalHistory;
  sleepPhasesData: SleepPhasesData;
  sleepComparisonData: any;
  rawSleepHistory: any[];
  loadedTabs: Set<string>;
  requestTabData: (tab: SanteTab, isConnected: boolean) => void;
  handleRefresh: (tab: SanteTab) => Promise<void>;
  handleConnectHealthKit: () => Promise<void>;
}

const EMPTY_HISTORY: VitalHistory = {
  sleep: [], heartRate: [], hrv: [], steps: [], calories: [],
  distance: [], exerciseMinutes: [], standHours: [], spo2: [],
  respiratoryRate: [], vo2max: [], bodyTemperature: [], bloodGlucose: [],
};

const EMPTY_SLEEP: SleepPhasesData = {
  avgAwake: 0, avgRem: 0, avgCore: 0, avgDeep: 0, totalSleepMin: 0, nightsCount: 0,
};

const StatsHealthContext = createContext<StatsHealthContextValue | null>(null);

export function useStatsHealth(): StatsHealthContextValue {
  const ctx = useContext(StatsHealthContext);
  if (!ctx) throw new Error('useStatsHealth must be used inside StatsHealthProvider');
  return ctx;
}

export const StatsHealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();

  const [isHealthKitConnected, setIsHealthKitConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('tout');
  const [healthData, setHealthData] = useState<any | null>(null);
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
  const [vitalHistory, setVitalHistory] = useState<VitalHistory>(EMPTY_HISTORY);
  const [sleepPhasesData, setSleepPhasesData] = useState<SleepPhasesData>(EMPTY_SLEEP);
  const [sleepComparisonData, setSleepComparisonData] = useState<any>({});
  const [rawSleepHistory, setRawSleepHistory] = useState<any[]>([]);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  // Refs pour éviter les stale closures
  const loadIdRef = useRef(0);
  const isHealthKitConnectedRef = useRef(false);
  const loadingRef = useRef(true);
  const selectedPeriodRef = useRef<Period>('tout');
  const retryAfterSettingsRef = useRef(false);
  // Empêche les double-chargements concurrents par onglet
  const loadingTabsRef = useRef<Set<string>>(new Set());

  useEffect(() => { isHealthKitConnectedRef.current = isHealthKitConnected; }, [isHealthKitConnected]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { selectedPeriodRef.current = selectedPeriod; }, [selectedPeriod]);

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------
  const withTimeout = useCallback(<T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
  }, []);

  // -------------------------------------------------------
  // CACHE — lecture instantanée au montage
  // -------------------------------------------------------
  const applyBaseCache = useCallback((cached: any) => {
    unstable_batchedUpdates(() => {
      if (cached.healthData) setHealthData(cached.healthData);
      if (cached.todaySteps != null) setTodaySteps(cached.todaySteps);
      if (cached.todayCalories != null) setTodayCalories(cached.todayCalories);
      if (cached.todayDistance != null) setTodayDistance(cached.todayDistance);
      if (cached.todayExerciseMinutes != null) setTodayExerciseMinutes(cached.todayExerciseMinutes);
      if (cached.todayStandHours != null) setTodayStandHours(cached.todayStandHours);
      if (cached.todayFloors != null) setTodayFloors(cached.todayFloors);
      if (cached.todayMindfulMinutes != null) setTodayMindfulMinutes(cached.todayMindfulMinutes);
      if (cached.todayHydration != null) setTodayHydration(cached.todayHydration);
      if (cached.todayBodyTemp != null) setTodayBodyTemp(cached.todayBodyTemp);
      if (cached.todayBloodGlucose != null) setTodayBloodGlucose(cached.todayBloodGlucose);
      setIsHealthKitConnected(true);
      setLoading(false);
    });
  }, []);

  const applyTabCache = useCallback((tab: SanteTab, cached: any) => {
    switch (tab) {
      case 'sommeil':
        if (cached.rawSleepHistory) setRawSleepHistory(cached.rawSleepHistory);
        if (cached.sleepPhasesData) setSleepPhasesData(cached.sleepPhasesData);
        if (cached.sleepComparisonData) setSleepComparisonData(cached.sleepComparisonData);
        if (cached.vitalHistoryPatch) setVitalHistory(prev => ({ ...prev, ...cached.vitalHistoryPatch }));
        break;
      case 'signes':
        if (cached.vitalHistoryPatch) setVitalHistory(prev => ({ ...prev, ...cached.vitalHistoryPatch }));
        if (cached.healthDataPatch && cached.healthDataPatch.hrv) {
          setHealthData((prev: any) => prev ? { ...prev, hrv: { ...prev.hrv, ...cached.healthDataPatch.hrv } } : prev);
        }
        break;
      case 'pas':
        if (cached.vitalHistoryPatch) setVitalHistory(prev => ({ ...prev, ...cached.vitalHistoryPatch }));
        break;
    }
  }, []);

  const loadBaseFromCache = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_BASE_KEY);
      if (!raw) return false;
      const cached = JSON.parse(raw);
      if (Date.now() - cached.timestamp > BASE_TTL) return false;
      applyBaseCache(cached);
      return true;
    } catch (e) {
      return false;
    }
  }, [applyBaseCache]);

  const loadTabFromCache = useCallback(async (tab: SanteTab): Promise<boolean> => {
    if (tab === 'seances') return false; // séances = SQLite, toujours frais
    try {
      const period = selectedPeriodRef.current;
      const raw = await AsyncStorage.getItem(CACHE_TAB_KEY(tab, period));
      if (!raw) return false;
      const cached = JSON.parse(raw);
      if (Date.now() - cached.timestamp > TAB_TTL) return false;
      applyTabCache(tab, cached);
      return true;
    } catch (e) {
      return false;
    }
  }, [applyTabCache]);

  const saveBaseToCache = useCallback(async (data: any) => {
    try {
      await AsyncStorage.setItem(CACHE_BASE_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
    } catch (e) { /* silencieux */ }
  }, []);

  const saveTabToCache = useCallback(async (tab: SanteTab, data: any) => {
    if (tab === 'seances') return;
    try {
      const period = selectedPeriodRef.current;
      await AsyncStorage.setItem(CACHE_TAB_KEY(tab, period), JSON.stringify({ ...data, timestamp: Date.now() }));
    } catch (e) { /* silencieux */ }
  }, []);

  // -------------------------------------------------------
  // Charger les données de base HealthKit (aujourd'hui)
  // -------------------------------------------------------
  const loadHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await withTimeout(
        Promise.allSettled([
          healthConnect.getLastSleep(),
          healthConnect.getTodayHeartRate(),
          healthConnect.getTodayHRV(),
          healthConnect.getOxygenSaturation?.(),
          healthConnect.getRespiratoryRate?.(),
          healthConnect.getTodaySteps(),
          healthConnect.getTodayCalories(),
          healthConnect.getTodayDistance?.(),
          healthConnect.getTodayExerciseMinutes?.(),
          healthConnect.getTodayStandHours?.(),
          (healthConnect.getVO2Max?.() ?? Promise.resolve(null)),
          Promise.resolve(null),
          (healthConnect.getFloorsClimbed?.() ?? Promise.resolve(null)),
          (healthConnect.getMindfulMinutes?.() ?? Promise.resolve(null)),
          (healthConnect.getTodayHydration?.() ?? Promise.resolve(null)),
          (healthConnect.getBodyTemperature?.() ?? Promise.resolve(null)),
          Promise.resolve(null),
        ]),
        3000, // 3s max — après on affiche ce qu'on a
        Array(17).fill({ status: 'rejected', reason: 'timeout' }) as PromiseSettledResult<any>[]
      );

      const get = (i: number) => results[i]?.status === 'fulfilled' ? (results[i] as any).value : null;

      const sleep = get(0) ?? { duration: 0, quality: 0, phases: {} };
      const heartRate = get(1) ?? { current: 0, resting: 0 };
      const hrv = get(2) ?? { value: 0, baseline: 0 };
      const distData = get(7);
      const dist = distData?.walking ? (distData.walking + (distData.running || 0)) : (typeof distData === 'number' ? distData : 0);
      const mindfulData = get(13);
      const hydrationData = get(14);
      const bodyTempData = get(15);

      const newHealthData = {
        sleep, heartRate, hrv,
        oxygenSaturation: get(3),
        respiratoryRate: get(4),
        vo2max: get(10),
        bloodPressure: null,
        bodyTemperature: bodyTempData,
        bloodGlucose: null,
      };
      const baseValues = {
        healthData: newHealthData,
        todaySteps: get(5)?.count || 0,
        todayCalories: get(6)?.active || 0,
        todayDistance: dist,
        todayExerciseMinutes: get(8) || 0,
        todayStandHours: get(9) || 0,
        todayFloors: get(12) || 0,
        todayMindfulMinutes: mindfulData?.minutes || 0,
        todayHydration: hydrationData?.amount || 0,
        todayBodyTemp: bodyTempData?.value || 0,
        todayBloodGlucose: 0,
      };

      unstable_batchedUpdates(() => {
        setHealthData(baseValues.healthData);
        setTodaySteps(baseValues.todaySteps);
        setTodayCalories(baseValues.todayCalories);
        setTodayDistance(baseValues.todayDistance);
        setTodayExerciseMinutes(baseValues.todayExerciseMinutes);
        setTodayStandHours(baseValues.todayStandHours);
        setTodayFloors(baseValues.todayFloors);
        setTodayMindfulMinutes(baseValues.todayMindfulMinutes);
        setTodayHydration(baseValues.todayHydration);
        setTodayBodyTemp(baseValues.todayBodyTemp);
        setTodayBloodGlucose(baseValues.todayBloodGlucose);
      });

      // Sauvegarder en cache (en arrière-plan, pas await)
      saveBaseToCache(baseValues);
    } catch (error) {
      logger.error('[StatsHealth] loadHealthData error:', error);
    } finally {
      setLoading(false);
    }
  }, [withTimeout, saveBaseToCache]);

  // -------------------------------------------------------
  // Charger les données d'un onglet spécifique
  // -------------------------------------------------------
  const loadTabData = useCallback(async (tab: SanteTab) => {
    // Éviter les chargements concurrents pour le même onglet
    if (loadingTabsRef.current.has(tab)) return;
    loadingTabsRef.current.add(tab);

    const period = selectedPeriodRef.current;
    const daysMap: Record<string, number> = {
      '7j': 7, '14j': 14, '30j': 30, '60j': 60, '90j': 90,
      '6m': 180, '9m': 270, '1a': 365, '2a': 730, 'tout': 1095, 'custom': 730,
    };
    const days = daysMap[period] ?? 30;
    // Timeout adapté : plus long pour les grandes périodes (1 an = ~20s sur iPhone lent)
    const timeoutMs = days <= 90 ? 10000 : days <= 180 ? 15000 : 25000;
    const currentLoadId = ++loadIdRef.current;

    setTabLoading(true);
    try {
      switch (tab) {
        case 'sommeil': {
          // ── SQLite (durée/liste) + HealthKit (phases) en parallèle ──
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - days);
          fromDate.setHours(0, 0, 0, 0);
          const fromStr = fromDate.toISOString().split('T')[0];

          const [allEntries, hkSleepRaw, sleepComparison] = await Promise.all([
            getSleepEntries(),
            // HealthKit pour les phases (Apple Watch) – timeout adapté
            isHealthKitConnectedRef.current
              ? withTimeout(
                  (healthConnect.getSleepHistory?.(days) as Promise<any[]>) || Promise.resolve([]),
                  timeoutMs, []
                )
              : Promise.resolve([]),
            withTimeout(
              healthConnect.getSleepComparisonData?.(days) || Promise.resolve({}),
              timeoutMs, {}
            ),
          ]);

          // SQLite → liste de base (durée, bedTime, wakeTime)
          const sleepHistory = allEntries
            .filter((s: any) => s.date >= fromStr)
            .map((s: any) => ({
              ...s,
              total: s.duration,
              deep: s.phases?.deep || s.deep || 0,
              rem: s.phases?.rem || s.rem || 0,
              core: s.phases?.core || s.core || 0,
              awake: s.phases?.awake || s.awake || 0,
            }));

          const validSleep = sleepHistory.filter((s: any) => {
            const h = (s.duration || s.total || 0) / 60;
            return h >= 1 && h <= 16; // 1h min (was 3h — rejetait les nuits courtes)
          });

          // HealthKit → phases détaillées (Apple Watch) ; fallback SQLite si timeout
          const hkFiltered = Array.isArray(hkSleepRaw)
            ? (hkSleepRaw as any[]).filter((s: any) => {
                if (!s?.date || s.date < fromStr) return false;
                const h = (s.total || s.duration || 0) / 60;
                return h >= 1 && h <= 16; // 1h min (was 3h)
              })
            : [];
          const rawSleepForPhases = hkFiltered.length > 0 ? hkFiltered : validSleep;

          // Sync HealthKit en arrière-plan pour corriger les heures stockées en SQLite
          if (isHealthKitConnectedRef.current && healthConnect.syncSleepHistory) {
            healthConnect.syncSleepHistory(Math.min(days, 730)).catch((e: any) =>
              logger.warn('[StatsHealth] Sync sommeil background:', e)
            );
          }

          let newSleepPhases = EMPTY_SLEEP;
          const sourceForPhases = rawSleepForPhases.length > 0 ? rawSleepForPhases : validSleep;
          if (sourceForPhases.length > 0) {
            const withPhases = sourceForPhases.filter((s: any) => s.deep > 0 || s.rem > 0 || s.core > 0);
            const count = withPhases.length || 1;
            newSleepPhases = {
              avgAwake: Math.round(withPhases.reduce((s: number, x: any) => s + (x.awake || 0), 0) / count),
              avgRem: Math.round(withPhases.reduce((s: number, x: any) => s + (x.rem || 0), 0) / count),
              avgCore: Math.round(withPhases.reduce((s: number, x: any) => s + (x.core || 0), 0) / count),
              avgDeep: Math.round(withPhases.reduce((s: number, x: any) => s + (x.deep || 0), 0) / count),
              totalSleepMin: Math.round(sourceForPhases.reduce((s: number, x: any) => s + (x.total || x.duration || 0), 0) / sourceForPhases.length),
              nightsCount: validSleep.length,
            };
          }
          // validSleep est DESC → slice(0, days) = nuits de la période → reverse() = ASC pour VitalitePage
          const sleepVH = validSleep
            .slice(0, days)
            .map((s: any) => ({ date: s.date, value: (s.duration || s.total || 0) / 60 }))
            .reverse();

          unstable_batchedUpdates(() => {
            setRawSleepHistory(rawSleepForPhases.length > 0 ? rawSleepForPhases : validSleep);
            setSleepPhasesData(newSleepPhases);
            if (sleepComparison) setSleepComparisonData(sleepComparison);
            setVitalHistory(prev => ({ ...prev, sleep: sleepVH }));
          });

          saveTabToCache(tab, {
            rawSleepHistory: validSleep,
            sleepPhasesData: newSleepPhases,
            sleepComparisonData: sleepComparison || {},
            vitalHistoryPatch: { sleep: sleepVH },
          });
          break;
        }

        case 'seances': {
          // séances = SQLite uniquement (rapide), + sync HealthKit en background
          if (isHealthKitConnectedRef.current) {
            healthConnect.syncAll().catch(e => logger.warn('[StatsHealth] Sync séances:', e));
          }
          break;
        }

        case 'signes': {
          const [hrHistory, hrvHistory, spo2History, respHistory, vo2History, tempHistory] = await withTimeout(
            Promise.all([
              (healthConnect.getHeartRateHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getHRVHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getOxygenSaturationHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getRespiratoryRateHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getVO2MaxHistory?.(days) ?? Promise.resolve([])).catch(() => []),
              (healthConnect.getBodyTemperatureHistory?.(days) ?? Promise.resolve([])).catch(() => []),
            ]),
            timeoutMs, [[], [], [], [], [], []]
          );

          let hrvBaseline: number | null = null;
          if (Array.isArray(hrvHistory) && hrvHistory.length > 1) {
            hrvBaseline = Math.round(hrvHistory.reduce((s: number, h: any) => s + (h.value || 0), 0) / hrvHistory.length);
          }

          const patch = {
            heartRate: Array.isArray(hrHistory) ? hrHistory.map((h: any) => ({ date: h.date, value: h.value || h.resting || 0 })).reverse() : [],
            hrv: Array.isArray(hrvHistory) ? hrvHistory.map((h: any) => ({ date: h.date, value: h.value || 0 })).reverse() : [],
            spo2: Array.isArray(spo2History) ? spo2History.map((s: any) => ({ date: s.date, value: s.value || 0 })).reverse() : [],
            respiratoryRate: Array.isArray(respHistory) ? respHistory.map((r: any) => ({ date: r.date, value: r.value || 0 })).reverse() : [],
            vo2max: Array.isArray(vo2History) ? vo2History.map((v: any) => ({ date: v.date, value: v.value || 0 })).reverse() : [],
            bodyTemperature: Array.isArray(tempHistory) ? tempHistory.map((t: any) => ({ date: t.date, value: t.value || 0 })).reverse() : [],
            bloodGlucose: [],
          };

          unstable_batchedUpdates(() => {
            setVitalHistory(prev => ({ ...prev, ...patch }));
            if (hrvBaseline !== null) {
              setHealthData((prev: any) => prev ? { ...prev, hrv: { ...prev.hrv, baseline: hrvBaseline } } : prev);
            }
          });

          saveTabToCache(tab, {
            vitalHistoryPatch: patch,
            healthDataPatch: hrvBaseline !== null ? { hrv: { baseline: hrvBaseline } } : undefined,
          });
          break;
        }

        case 'pas': {
          const [stepsH, calH, distH, exH, standH] = await withTimeout(
            Promise.all([
              healthConnect.getStepsHistory?.(days) || Promise.resolve([]),
              healthConnect.getCaloriesHistory?.(days) || Promise.resolve([]),
              healthConnect.getDistanceHistory?.(days) || Promise.resolve([]),
              healthConnect.getExerciseMinutesHistory?.(days) || Promise.resolve([]),
              healthConnect.getStandHoursHistory?.(days) || Promise.resolve([]),
            ]),
            timeoutMs, [[], [], [], [], []]
          );

          const patch = {
            steps: Array.isArray(stepsH) ? stepsH.map((s: any) => ({ date: s.date, value: s.value || s.count || 0 })).reverse() : [],
            calories: Array.isArray(calH) ? calH.map((c: any) => ({ date: c.date, value: c.total || c.active || 0 })).reverse() : [],
            distance: Array.isArray(distH) ? distH.map((d: any) => ({ date: d.date, value: d.value || 0 })).reverse() : [],
            exerciseMinutes: Array.isArray(exH) ? exH.map((e: any) => ({ date: e.date, value: e.value || 0 })).reverse() : [],
            standHours: Array.isArray(standH) ? standH.map((s: any) => ({ date: s.date, value: s.value || 0 })).reverse() : [],
          };

          setVitalHistory(prev => ({ ...prev, ...patch }));
          saveTabToCache(tab, { vitalHistoryPatch: patch });
          break;
        }
      }

      if (currentLoadId === loadIdRef.current) {
        setLoadedTabs(prev => new Set(prev).add(tab));
      }
    } catch (error) {
      logger.warn(`[StatsHealth] Erreur chargement ${tab}:`, error);
    } finally {
      loadingTabsRef.current.delete(tab);
      if (currentLoadId === loadIdRef.current) setTabLoading(false);
    }
  }, [withTimeout, saveTabToCache]);

  // -------------------------------------------------------
  // Vérification connexion HealthKit
  // -------------------------------------------------------
  const checkHealthKitConnection = useCallback(async () => {
    try {
      // Charger le statut sauvegardé AVANT de le lire (sinon il vaut toujours "non connecté"
      // et on redemandait les permissions Santé à chaque ouverture)
      if (!(healthConnect as any).isInitialized) await healthConnect.initialize().catch(() => false);
      const syncStatus = healthConnect.getSyncStatus();
      let isConnected = syncStatus.isConnected;
      const { failureReason } = syncStatus;
      const isDefinitiveFailure =
        failureReason === 'MODULE_NOT_LOADED' ||
        (failureReason === 'DEVICE_NOT_SUPPORTED' && !isHealthKitAvailable);

      // Reconnexion silencieuse uniquement pour les utilisateurs déjà connectés auparavant.
      // Ceux qui ont passé l'étape Santé ne doivent pas recevoir la demande de permission.
      if (!isConnected && syncStatus.lastSync && !isDefinitiveFailure && isHealthKitAvailable) {
        try {
          const success = await healthConnect.connect();
          if (success) isConnected = true;
        } catch (e) {
          logger.warn('[StatsHealth] Reconnexion silencieuse échouée:', e);
        }
      }

      if (isConnected) {
        // Sync séances si nécessaire (en arrière-plan)
        AsyncStorage.getItem('@yoroi_trainings_synced_v5').then(async (synced) => {
          if (!synced) {
            try {
              const existing = await getTrainings();
              if (existing.length === 0) {
                await healthConnect.syncAll();
                await AsyncStorage.setItem('@yoroi_trainings_synced_v5', 'true');
              } else {
                await AsyncStorage.setItem('@yoroi_trainings_synced_v5', 'true');
              }
            } catch (e) {
              logger.warn('[StatsHealth] Sync background échoué:', e);
            }
          }
        });

        setIsHealthKitConnected(true);
        loadHealthData();
      } else {
        setLoading(false);
      }
    } catch (error) {
      logger.error('[StatsHealth] checkHealthKitConnection error:', error);
      setLoading(false);
    }
  }, [loadHealthData]);

  // -------------------------------------------------------
  // Initialisation — cache d'abord, HealthKit ensuite
  // -------------------------------------------------------
  useEffect(() => {
    // Étape 1 : lire le cache immédiatement (synchrone ~50ms)
    loadBaseFromCache().then((hadCache) => {
      // Étape 2 : attendre la fin des animations, puis rafraîchir depuis HealthKit
      const handle = InteractionManager.runAfterInteractions(() => {
        checkHealthKitConnection();
      });
      return () => handle.cancel();
    });
  }, []);

  // Pré-charger les caches des onglets au démarrage (en background silencieux)
  useEffect(() => {
    const preloadTabCaches = async () => {
      const tabs: SanteTab[] = ['sommeil', 'signes', 'pas'];
      for (const tab of tabs) {
        const hit = await loadTabFromCache(tab);
        if (hit) {
          setLoadedTabs(prev => new Set(prev).add(tab));
        }
      }
    };
    preloadTabCaches();
  }, [loadTabFromCache]);

  // Invalider le cache et recharger quand la période change
  useEffect(() => {
    setLoadedTabs(new Set());
    loadIdRef.current++;
    // Essayer de charger depuis le cache pour la nouvelle période
    const reloadFromCache = async () => {
      const tabs: SanteTab[] = ['sommeil', 'signes', 'pas'];
      for (const tab of tabs) {
        const hit = await loadTabFromCache(tab);
        if (hit) setLoadedTabs(prev => new Set(prev).add(tab));
      }
    };
    reloadFromCache();
  }, [selectedPeriod]);

  // YOROI_DATA_CHANGED → invalider le cache séances, mais avec DEBOUNCE 3s pour
  // éviter la boucle : syncAll() émet YOROI_DATA_CHANGED → on invalide 'seances' →
  // qui relance syncAll() → qui ré-émet → boucle infinie toutes les 10s.
  // Le debounce garantit qu'on n'invalide qu'une fois tous les 3s max.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        setLoadedTabs(prev => {
          const next = new Set(prev);
          next.delete('seances');
          return next;
        });
      }, 3000);
    });
    return () => {
      sub.remove();
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  // AppState → retenter après Réglages iOS
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active' && retryAfterSettingsRef.current) {
        retryAfterSettingsRef.current = false;
        setConnecting(true);
        try {
          const success = await healthConnect.connect();
          if (success) {
            setIsHealthKitConnected(true);
            await loadHealthData();
          }
        } catch (e) {
          logger.warn('[StatsHealth] Re-tentative Réglages échouée:', e);
        } finally {
          setConnecting(false);
        }
      }
    });
    return () => sub.remove();
  }, [loadHealthData]);

  // -------------------------------------------------------
  // requestTabData — appelé par VitalitePage
  // Charge depuis le cache d'abord, puis HealthKit en background
  // -------------------------------------------------------
  const requestTabData = useCallback((tab: SanteTab, isConnected: boolean) => {
    if (tab === 'seances') {
      loadTabData(tab);
    } else if (isConnected) {
      loadTabData(tab);
    }
  }, [loadTabData]);

  // -------------------------------------------------------
  // Pull-to-refresh
  // -------------------------------------------------------
  const handleRefresh = useCallback(async (tab: SanteTab) => {
    setRefreshing(true);
    try {
      // Invalider le cache de l'onglet
      if (tab !== 'seances') {
        try { await AsyncStorage.removeItem(CACHE_TAB_KEY(tab, selectedPeriodRef.current)); } catch (_) {}
      }
      setLoadedTabs(prev => { const n = new Set(prev); n.delete(tab); return n; });
      loadIdRef.current++;
      loadingTabsRef.current.delete(tab);

      if (tab === 'seances') {
        await loadTabData(tab);
      } else {
        if (isHealthKitConnectedRef.current) {
          try { await healthConnect.syncAll(); } catch (e) { logger.warn('[StatsHealth] Refresh sync:', e); }
        }
        // Invalider aussi le cache de base pour forcer refresh des données aujourd'hui
        try { await AsyncStorage.removeItem(CACHE_BASE_KEY); } catch (_) {}
        await Promise.all([loadHealthData(), loadTabData(tab)]);
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadHealthData, loadTabData]);

  // -------------------------------------------------------
  // Connexion HealthKit depuis l'UI
  // -------------------------------------------------------
  const handleConnectHealthKit = useCallback(async () => {
    setConnecting(true);
    try {
      const success = await healthConnect.connect();
      if (success) {
        setIsHealthKitConnected(true);
        setLoadedTabs(new Set());
        await AsyncStorage.removeItem('@yoroi_imported_workouts');
        try { await healthConnect.syncAll(); } catch (e) { logger.warn('[StatsHealth] syncAll post-connexion:', e); }
        await AsyncStorage.setItem('@yoroi_trainings_cleaned_v4', 'true');
        await loadHealthData();
      } else {
        const { failureReason } = healthConnect.getSyncStatus();
        if ((failureReason as string) === 'HEALTH_CONNECT_NOT_INSTALLED') {
          Alert.alert(t('vitality.healthConnectRequired'), t('vitality.installHealthConnectMessage'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('vitality.install'), onPress: () => safeOpenURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata') },
          ]);
        } else if (failureReason === 'MODULE_NOT_LOADED') {
          Alert.alert(t('vitality.nativeBuiltRequired'), t('vitality.nativeBuiltMessage'), [{ text: 'OK' }]);
        } else if (failureReason === 'DEVICE_NOT_SUPPORTED') {
          Alert.alert(t('vitality.notAvailable'), Platform.OS === 'android' ? t('vitality.healthConnectNotAvailable') : t('vitality.appleHealthNotAvailable'), [{ text: 'OK' }]);
        } else {
          Alert.alert(t('vitality.enablePermissions'),
            Platform.OS === 'android' ? t('vitality.enablePermissionsAndroidMessage') : t('vitality.enablePermissionsIosMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('vitality.openSettings'), onPress: () => { retryAfterSettingsRef.current = true; Linking.openSettings(); } },
            ]
          );
        }
      }
    } catch (error) {
      logger.error('[StatsHealth] handleConnectHealthKit error:', error);
    } finally {
      setConnecting(false);
    }
  }, [loadHealthData, t]);

  const value: StatsHealthContextValue = useMemo(() => ({
    isHealthKitConnected, loading, refreshing, tabLoading, connecting,
    selectedPeriod, setSelectedPeriod,
    healthData, todaySteps, todayCalories, todayDistance, todayExerciseMinutes,
    todayStandHours, todayFloors, todayMindfulMinutes, todayHydration, todayBodyTemp, todayBloodGlucose,
    vitalHistory, sleepPhasesData, sleepComparisonData, rawSleepHistory,
    loadedTabs, requestTabData, handleRefresh, handleConnectHealthKit,
  }), [
    isHealthKitConnected, loading, refreshing, tabLoading, connecting,
    selectedPeriod, setSelectedPeriod,
    healthData, todaySteps, todayCalories, todayDistance, todayExerciseMinutes,
    todayStandHours, todayFloors, todayMindfulMinutes, todayHydration, todayBodyTemp, todayBloodGlucose,
    vitalHistory, sleepPhasesData, sleepComparisonData, rawSleepHistory,
    loadedTabs, requestTabData, handleRefresh, handleConnectHealthKit,
  ]);

  return (
    <StatsHealthContext.Provider value={value}>
      {children}
    </StatsHealthContext.Provider>
  );
};
