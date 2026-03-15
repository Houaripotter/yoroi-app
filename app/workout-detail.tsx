// ============================================
// YOROI - DETAIL SÉANCE (Workout Detail)
// ============================================
// Affiche toutes les metriques d'une séance importee depuis Apple Health :
// FC, zones cardiaques, allure, intermédiaires, trace GPS, météo
// 2-phase loading: basic info instant, details async with retry

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Animated,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { MuscleMapCard } from '@/components/MuscleMapCard';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getEffectiveHRZones, calcZoneDurations, HRZoneThresholds } from '@/lib/hrZones';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock, MapPin, Flame, Heart, Timer, TrendingUp,
  Mountain, Thermometer, Droplets, Zap, Activity,
  Wind, ArrowUp, ArrowDown, Maximize2, X, Star, Users, Edit3,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { Header } from '@/components/ui/Header';
import { SamuraiLoader } from '@/components/SamuraiLoader';
import { HeartRateZonesBar } from '@/components/stats/HeartRateZonesBar';
import { WorkoutMapRoute } from '@/components/WorkoutMapRoute';
import { getTrainingById as _getTrainingById, updateTrainingDetails, updateTraining, getTrainings } from '@/lib/database';
import type { Training, CombatRound, Exercise } from '@/lib/database';
import type { WorkoutDetails, HeartRateSample } from '@/lib/healthConnect.ios';
import { healthConnect } from '@/lib/healthConnect';
import { getSportColor, getSportIcon, getSportName, SPORTS } from '@/lib/sports';
import logger from '@/lib/security/logger';
import { safeOpenURL } from '@/lib/security/validators';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

// ============================================
// DEMO DATA (quand HealthKit n'est pas dispo, ex: simulateur)
// ============================================

function generateDemoDetails(training: Training): WorkoutDetails {
  const duration = training.duration_minutes || 60;
  const isCardio = ['running', 'cycling', 'swimming', 'hiking', 'rowing'].some(s =>
    (training.sport || '').toLowerCase().includes(s)
  );

  // Generer des samples FC realistes
  const hrSamples: HeartRateSample[] = [];
  const sampleCount = Math.min(duration * 2, 200);
  const baseHR = training.heart_rate || 135;
  const startTime = training.start_time ? new Date(`2026-01-01T${training.start_time}:00`) : new Date();

  for (let i = 0; i < sampleCount; i++) {
    const progress = i / sampleCount;
    // Warm-up -> plateau -> cool-down curve
    let hrMod = 0;
    if (progress < 0.15) hrMod = -20 + (progress / 0.15) * 20; // warmup
    else if (progress > 0.85) hrMod = 10 - ((progress - 0.85) / 0.15) * 30; // cooldown
    else hrMod = (Math.sin(progress * Math.PI * 6) * 12) + (Math.random() * 8 - 4); // variation

    const bpm = Math.round(Math.max(70, Math.min(195, baseHR + hrMod)));
    const ts = new Date(startTime.getTime() + (i / sampleCount) * duration * 60000);
    hrSamples.push({ timestamp: ts.toISOString(), bpm });
  }

  // Calculer min/max/avg
  const bpms = hrSamples.map(s => s.bpm);
  const avgHR = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
  const minHR = Math.min(...bpms);
  const maxHR = Math.max(...bpms);

  // Zones FC
  const zones = [
    // Seuils Apple Fitness: 63/71/79/90% de FCmax (190 par défaut pour les données démo)
    { zone: 1, name: 'Z1 Recup', minBpm: 0, maxBpm: 120, durationSeconds: 0, color: '#3B82F6' },
    { zone: 2, name: 'Z2 Endurance', minBpm: 120, maxBpm: 135, durationSeconds: 0, color: '#22C55E' },
    { zone: 3, name: 'Z3 Tempo', minBpm: 135, maxBpm: 150, durationSeconds: 0, color: '#EAB308' },
    { zone: 4, name: 'Z4 Seuil', minBpm: 150, maxBpm: 171, durationSeconds: 0, color: '#F97316' },
    { zone: 5, name: 'Z5 Max', minBpm: 171, maxBpm: 250, durationSeconds: 0, color: '#EF4444' },
  ];
  const intervalSec = (duration * 60) / sampleCount;
  for (const s of hrSamples) {
    for (const z of zones) {
      if (s.bpm >= z.minBpm && s.bpm < z.maxBpm) {
        z.durationSeconds += intervalSec;
        break;
      }
    }
  }

  const details: WorkoutDetails = {
    durationMinutes: duration,
    heartRateSamples: hrSamples,
    avgHeartRate: avgHR,
    minHeartRate: minHR,
    maxHeartRate: maxHR,
    heartRateZones: zones,
    activeCalories: training.calories || Math.round(duration * 8.5),
    totalCalories: Math.round((training.calories || duration * 8.5) * 1.15),
    isIndoor: !isCardio,
    recoveryHR: {
      atEnd: maxHR - 5,
      after1Min: maxHR - 25,
      after2Min: maxHR - 42,
    },
  };

  // Distance + splits pour les sports cardio
  if (isCardio && (training.distance || 0) > 0) {
    const dist = training.distance || 5;
    details.distanceKm = dist;
    details.avgPaceSecondsPerKm = Math.round((duration * 60) / dist);
    details.elevationAscended = Math.round(dist * 12);
    details.elevationDescended = Math.round(dist * 10);

    // Splits
    const fullKm = Math.floor(dist);
    if (fullKm > 0) {
      details.splits = [];
      for (let k = 1; k <= fullKm; k++) {
        const basePace = details.avgPaceSecondsPerKm || 360;
        const variation = Math.round((Math.random() - 0.5) * 30);
        details.splits.push({
          index: k,
          distanceKm: 1,
          paceSecondsPerKm: basePace + variation,
          durationSeconds: basePace + variation,
          elevationGain: Math.round(Math.random() * 15),
          avgHeartRate: avgHR + Math.round((Math.random() - 0.5) * 10),
        });
      }
    }
  }

  // Pas de route GPS simulée — on n'affiche la carte que si les vraies données HealthKit sont disponibles

  return details;
}

// ============================================
// HELPERS
// ============================================

const formatPace = (secondsPerKm: number): string => {
  if (!secondsPerKm || secondsPerKm <= 0) return '-';
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}'${s.toString().padStart(2, '0')}"`;
};

const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}min` : ''}`.trim();
  return `${m} min`;
};

const formatDurationSec = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDurationApple = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0:00:00';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const s = Math.round((minutes % 1) * 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

function formatDateFull(date: string, startTime?: string): string {
  try {
    const d = new Date(date);
    const str = d.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    return startTime ? `${str} - ${startTime}` : str;
  } catch { return date; }
}

function formatDateHeader(date: string): string {
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  } catch { return ''; }
}

// Noms lisibles pour les sources — masque les noms internes laids
function getSourceDisplayName(source: string): string | null {
  const map: Record<string, string> = {
    apple_watch: 'Apple Watch', apple_health: 'Apple Santé',
    iphone: 'iPhone', strava: 'Strava', garmin: 'Garmin',
    polar: 'Polar', whoop: 'Whoop', suunto: 'Suunto',
    coros: 'Coros', wahoo: 'Wahoo', samsung: 'Samsung',
    fitbit: 'Fitbit', withings: 'Withings', amazfit: 'Amazfit',
    huawei: 'Huawei', oura: 'Oura', peloton: 'Peloton',
  };
  return map[source] ?? null; // null = ne pas afficher
}

function getAirQualityColor(aqi: number): string {
  if (aqi <= 50) return '#22C55E';   // Bon - vert
  if (aqi <= 100) return '#EAB308';  // Modere - jaune
  if (aqi <= 150) return '#F97316';  // Sensible - orange
  if (aqi <= 200) return '#EF4444';  // Mauvais - rouge
  if (aqi <= 300) return '#8B5CF6';  // Tres mauvais - violet
  return '#991B1B';                  // Dangereux - rouge fonce
}

function downsampleHR(samples: HeartRateSample[], targetCount: number): HeartRateSample[] {
  if (!samples || samples.length <= targetCount) return samples || [];
  const step = samples.length / targetCount;
  const result: HeartRateSample[] = [];
  for (let i = 0; i < samples.length; i += step) {
    result.push(samples[Math.floor(i)]);
  }
  return result;
}

// ============================================
// ANIMATED CARD WRAPPER
// ============================================

const AnimatedCard: React.FC<{
  delay: number;
  children: React.ReactNode;
  style?: any;
}> = ({ delay, children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0, duration: 400, useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

// ============================================
// SKELETON LOADER
// ============================================

const SkeletonPulse: React.FC<{ width: number | string; height: number; radius?: number; color: string }> = ({
  width, height, radius = 8, color,
}) => {
  const pulse = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={{
      width: width as any, height, borderRadius: radius,
      backgroundColor: color, opacity: pulse,
    }} />
  );
};

const DetailsSkeleton: React.FC<{ colors: any; isDark: boolean }> = ({ colors, isDark }) => {
  const skeletonColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <SkeletonPulse width={20} height={20} radius={10} color={skeletonColor} />
        <SkeletonPulse width={160} height={16} color={skeletonColor} />
      </View>
      <SkeletonPulse width="100%" height={120} radius={12} color={skeletonColor} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 }}>
        <SkeletonPulse width={60} height={32} color={skeletonColor} />
        <SkeletonPulse width={60} height={32} color={skeletonColor} />
        <SkeletonPulse width={60} height={32} color={skeletonColor} />
      </View>
    </View>
  );
};

// ============================================
// MAIN SCREEN
// ============================================

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ id?: string; demo?: string }>();
  const router = useRouter();

  const [training, setTraining] = useState<Training | null>(null);
  const [details, setDetails] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [userZones, setUserZones] = useState<HRZoneThresholds | null>(null);

  useEffect(() => {
    getEffectiveHRZones().then(zones => setUserZones(zones));
    if (params.demo === '1') {
      loadDemoData();
    } else {
      loadData();
    }
  }, []);

  // Zones cardiaques : utiliser les zones effectives (perso > âge > défaut)
  // Si samples HR disponibles → calculer le temps par zone
  // Sinon → fallback sur les zones retournées par HealthKit
  const hrZones = useMemo(() => {
    const hrSamples = details?.heartRateSamples;
    if (userZones && hrSamples && hrSamples.length > 1) {
      return calcZoneDurations(hrSamples, userZones);
    }
    return details?.heartRateZones;
  }, [userZones, details?.heartRateSamples, details?.heartRateZones]);

  // Parser les combat_rounds (stockés en JSON dans la DB, non parsés par getTrainingById)
  const combatRounds: CombatRound[] = useMemo(() => {
    const raw = training?.combat_rounds;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw as unknown as string); } catch { return []; }
  }, [training?.combat_rounds]);

  // Parser les exercises si pas encore parsés
  const exercisesList: Exercise[] = useMemo(() => {
    const raw = training?.exercises;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw as unknown as string); } catch { return []; }
  }, [training?.exercises]);

  const loadDemoData = () => {
    const demoTraining: Training = {
      id: 0,
      sport: 'running',
      session_type: 'Course à pied',
      date: new Date().toISOString().slice(0, 10),
      start_time: '07:30',
      duration_minutes: 63,
      distance: 10.2,
      calories: 612,
      heart_rate: 157,
      max_heart_rate: 183,
      intensity: 7,
      is_outdoor: 1,
      source: 'apple_watch',
      location_name: 'Bois de Vincennes',
      location_lat: 48.8330,
      location_lon: 2.4370,
      notes: 'Super séance, bonnes sensations sur les 5 derniers km.',
      muscles: null,
      exercises: null,
      created_at: new Date().toISOString(),
    } as unknown as Training;
    setTraining(demoTraining);
    setDetails(generateDemoDetails(demoTraining));
    setLoading(false);
  };

  const loadData = async () => {
    try {
      const id = parseInt(params.id || '0');
      if (!id) { setLoading(false); return; }

      // getTrainingById avec fallback si le bundler ne l'a pas resolu
      let tr: Training | null = null;
      if (typeof _getTrainingById === 'function') {
        tr = await _getTrainingById(id);
      } else {
        // Fallback: chercher dans la liste complete
        logger.warn('[WorkoutDetail] getTrainingById undefined, fallback getTrainings');
        const all = await getTrainings(1825);
        tr = all.find((t: Training) => t.id === id) || null;
      }
      if (!tr) { setLoading(false); return; }
      setTraining(tr);

      // Phase 1: basic info shown immediately
      setLoading(false);

      // Construire une date ISO precise pour recherche HealthKit par jour+heure
      const fallbackStart = tr.date && tr.start_time
        ? `${tr.date}T${tr.start_time}:00`
        : tr.date
          ? `${tr.date}T12:00:00`
          : undefined;

      // Phase 2: load details (JSON cache ou HealthKit en direct)
      if (tr.workout_details_json) {
        try {
          const cached = JSON.parse(tr.workout_details_json);
          // v4: invalider les anciens caches (v3: HKMaximumHeartRate metadata, v4: distance complète + élévation fallback)
          const isStaleCache = (cached.cacheVersion ?? 1) < 5;
          // Verifier que le cache a du contenu utile (pas juste durationMinutes)
          const hasRichData = cached.heartRateSamples?.length > 0 || cached.routePoints?.length > 0
            || cached.heartRateZones?.length > 0 || cached.weatherTemp != null;
          if (hasRichData && !isStaleCache) {
            setDetails(cached);
            // Cache incomplet: GPS ou qualité d'air manquants -> re-fetch en background
            const missingGPS = !cached.routePoints?.length;
            const missingAQI = cached.airQualityIndex == null;
            if (tr.healthkit_uuid && (missingGPS || missingAQI)) {
              loadDetailsFromHealthKit(
                tr.healthkit_uuid, id, fallbackStart, tr.duration_minutes, tr,
              );
            }
          } else {
            // Cache périmé ou pauvre, re-fetcher depuis HealthKit
            await loadDetailsFromHealthKit(
              tr.healthkit_uuid || 'fallback', id, fallbackStart, tr.duration_minutes, tr,
            );
          }
        } catch {
          // JSON corrupt - fetch HealthKit
          await loadDetailsFromHealthKit(
            tr.healthkit_uuid || 'fallback', id, fallbackStart, tr.duration_minutes, tr,
          );
        }
      } else {
        // Pas de cache, fetcher depuis HealthKit
        await loadDetailsFromHealthKit(
          tr.healthkit_uuid || 'fallback', id, fallbackStart, tr.duration_minutes, tr,
        );
      }
    } catch (error) {
      logger.error('[WorkoutDetail] Erreur chargement:', error);
      setLoading(false);
    }
  };

  const loadDetailsFromHealthKit = useCallback(async (uuid: string, trainingId: number, fallbackStartDate?: string, fallbackDurationMin?: number, trainingRecord?: Training | null) => {
    setDetailsLoading(true);
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const hkDetails = await healthConnect.getWorkoutDetailsByUUID(uuid, fallbackStartDate, fallbackDurationMin);
        if (hkDetails) {
          setDetails(hkDetails);
          // Save to DB so next time it's instant
          try {
            const toStore = { ...hkDetails };
            if (toStore.routePoints && toStore.routePoints.length > 500) {
              const step = Math.ceil(toStore.routePoints.length / 500);
              toStore.routePoints = toStore.routePoints.filter((_: any, i: number) => i % step === 0);
            }
            if (toStore.heartRateSamples && toStore.heartRateSamples.length > 500) {
              const step = Math.ceil(toStore.heartRateSamples.length / 500);
              toStore.heartRateSamples = toStore.heartRateSamples.filter((_: any, i: number) => i % step === 0);
            }
            await updateTrainingDetails(trainingId, JSON.stringify(toStore));
            logger.info(`[WorkoutDetail] Details lazy-loaded et sauvegardes pour #${trainingId}`);
          } catch (saveErr) {
            logger.warn('[WorkoutDetail] Erreur sauvegarde details:', saveErr);
          }
          setDetailsLoading(false);
          return;
        }
        // No data yet, retry
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
      } catch (e) {
        logger.warn(`[WorkoutDetail] Lazy load attempt ${attempt + 1}/${MAX_RETRIES}:`, e);
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    // HealthKit n'a rien retourné → générer un résumé depuis les données de la séance en DB
    if (trainingRecord) {
      logger.info('[WorkoutDetail] HealthKit vide, génération résumé depuis données DB');
      const fallbackDetails = generateDemoDetails(trainingRecord);
      // Supprimer le GPS fictif (ne montrer que les vraies données GPS si dispo)
      fallbackDetails.routePoints = undefined;
      fallbackDetails.routeBoundingBox = undefined;
      fallbackDetails.startLatitude = undefined;
      fallbackDetails.startLongitude = undefined;
      fallbackDetails.splits = undefined;
      setDetails(fallbackDetails);
    }
    setDetailsLoading(false);
  }, []);

  if (loading) {
    return (
      <View style={[styles.screenRoot, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
        <Header title="" showBack />
        <View style={styles.loadingContainer}>
          <SamuraiLoader />
        </View>
      </View>
    );
  }

  if (!training) {
    return (
      <View style={[styles.screenRoot, { backgroundColor: isDark ? colors.background : '#F2F2F7' }]}>
        <Header title="" showBack />
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Séance introuvable
          </Text>
        </View>
      </View>
    );
  }

  // Sport theming
  const sportColor = getSportColor(training.sport) || colors.primary;
  const sportIconName = getSportIcon(training.sport);
  const sportName = getSportName(training.sport);

  const hrSamples = details?.heartRateSamples;
  const splits = details?.splits;
  const route = details?.routePoints;
  const hasDetails = !!details;

  const fastestSplitIdx = splits && splits.length > 0
    ? splits.reduce((minIdx, s, i, arr) =>
        s.paceSecondsPerKm < arr[minIdx].paceSecondsPerKm ? i : minIdx, 0)
    : -1;

  const duration = training.duration_minutes || details?.durationMinutes || 0;
  const distance = details?.distanceKm ?? training.distance;
  const calories = details?.activeCalories ?? training.calories;
  const avgHR = details?.avgHeartRate ?? training.heart_rate;

  // Fond neutre style Apple (groupedBackground) pour les sections
  const groupedBg = isDark ? '#000000' : '#F2F2F7';

  return (
    <View style={[styles.screenRoot, { backgroundColor: isDark ? colors.background : sportColor }]}>
      <Header
        title={formatDateHeader(training.date)}
        showBack
        rightElement={(() => {
          const sportObj = SPORTS.find(s => s.id === training.sport);
          if (!sportObj || (sportObj.category !== 'combat_striking' && sportObj.category !== 'combat_grappling')) return undefined;
          return (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/add-combat-session', params: { sport: training.sport, editId: String(training.id) } } as any)}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: sportColor + '20', justifyContent: 'center', alignItems: 'center' }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Edit3 size={16} color={sportColor} strokeWidth={2.5} />
            </TouchableOpacity>
          );
        })()}
      />
      <ScrollView
        style={[styles.scroll, { backgroundColor: groupedBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ HERO HEADER ═══ */}
        <AnimatedCard delay={0} style={[styles.heroCard, { backgroundColor: sportColor }]}>
          <View style={styles.heroOverlay}>
            {/* Sport icon + name */}
            <View style={styles.heroTop}>
              <View style={styles.heroIconCircle}>
                <MaterialCommunityIcons name={sportIconName as any} size={32} color={sportColor} />
              </View>
              <View style={styles.heroTitleBlock}>
                <Text style={[styles.heroSportName, { color: colors.textOnAccent }]} numberOfLines={1}>
                  {(() => {
                    const base = training.session_type || sportName;
                    if (!details?.isIndoor) return base;
                    const indoorSuffix: Record<string, string> = {
                      'Marche': 'Marche (tapis)', 'Course': 'Course (tapis)',
                      'Velo': 'Velo (interieur)', 'Randonnee': 'Randonnee (int.)',
                    };
                    return indoorSuffix[base] || base;
                  })()}
                </Text>
                <Text style={styles.heroDate}>
                  {training.start_time ? `${training.start_time}-${addMinutesToTime(training.start_time, duration)}` : ''}
                </Text>
                <Text style={styles.heroDateSub}>
                  {formatDateFull(training.date)}
                </Text>
              </View>
            </View>

            {/* Big metrics row */}
            <View style={styles.heroMetrics}>
              <View style={styles.heroMetricItem}>
                <Text style={[styles.heroMetricValue, { color: colors.textOnAccent }]}>{formatDuration(duration)}</Text>
                <Text style={styles.heroMetricLabel}>{t('workoutDetail.duration') || 'Durée'}</Text>
              </View>
              {(distance ?? 0) > 0 && (
                <>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetricItem}>
                    <Text style={[styles.heroMetricValue, { color: colors.textOnAccent }]}>{typeof distance === 'number' ? distance.toFixed(1) : distance}</Text>
                    <Text style={styles.heroMetricLabel}>km</Text>
                  </View>
                </>
              )}
              {(calories ?? 0) > 0 && (
                <>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetricItem}>
                    <Text style={[styles.heroMetricValue, { color: colors.textOnAccent }]}>{Math.round(calories || 0)}</Text>
                    <Text style={styles.heroMetricLabel}>kcal</Text>
                  </View>
                </>
              )}
              {(avgHR ?? 0) > 0 && (
                <>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetricItem}>
                    <Text style={[styles.heroMetricValue, { color: colors.textOnAccent }]}>{avgHR}</Text>
                    <Text style={styles.heroMetricLabel}>bpm</Text>
                  </View>
                </>
              )}
            </View>

            {/* Badges */}
            <View style={styles.heroBadges}>
              {details?.isIndoor === false && (
                <View style={styles.heroBadge}>
                  <MapPin size={12} color="#FFFFFF" />
                  <Text style={[styles.heroBadgeText, { color: colors.textOnAccent }]}>Outdoor</Text>
                </View>
              )}
              {training.source && training.source !== 'manual' && getSourceDisplayName(training.source) && (
                <View style={styles.heroBadge}>
                  <Heart size={12} color="#FFFFFF" />
                  <Text style={[styles.heroBadgeText, { color: colors.textOnAccent }]}>
                    {getSourceDisplayName(training.source)}
                  </Text>
                </View>
              )}
              {details?.elevationAscended != null && details.elevationAscended > 0 && (
                <View style={styles.heroBadge}>
                  <ArrowUp size={12} color="#FFFFFF" />
                  <Text style={[styles.heroBadgeText, { color: colors.textOnAccent }]}>{details.elevationAscended}m</Text>
                </View>
              )}
            </View>
          </View>
        </AnimatedCard>

        {/* ═══ DETAILS DE L'EXERCICE - Style Apple Fitness ═══ */}
        <Text style={[styles.appleSectionTitle, { color: colors.text }]}>
          Détails de l'exercice {'>'}
        </Text>
        <AnimatedCard delay={80} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
          <View style={[styles.appleDetailsGrid, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            {/* Row 1: Durée + Distance */}
            <View style={styles.appleDetailsRow}>
              <View style={[styles.appleDetailCell, { borderRightWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Durée de l'exercice</Text>
                <Text style={[styles.appleDetailValue, { color: '#22C55E' }]}>
                  {formatDurationApple(duration)}
                </Text>
              </View>
              <View style={styles.appleDetailCell}>
                <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Distance</Text>
                <Text style={[styles.appleDetailValue, { color: '#3B82F6' }]}>
                  {(distance ?? 0) > 0 ? `${typeof distance === 'number' ? distance.toFixed(2).replace('.', ',') : distance}` : '-'}
                  <Text style={styles.appleDetailUnit}> KM</Text>
                </Text>
              </View>
            </View>
            {/* Separator */}
            <View style={[styles.appleDetailsSep, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
            {/* Row 2: Cal actives + Cal totales */}
            <View style={styles.appleDetailsRow}>
              <View style={[styles.appleDetailCell, { borderRightWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Cal. en activité</Text>
                <Text style={[styles.appleDetailValue, { color: '#F59E0B' }]}>
                  {(calories ?? 0) > 0 ? Math.round(calories || 0) : '-'}
                  <Text style={styles.appleDetailUnit}> CAL</Text>
                </Text>
              </View>
              <View style={styles.appleDetailCell}>
                <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Cal. totales</Text>
                <Text style={[styles.appleDetailValue, { color: '#F59E0B' }]}>
                  {details?.totalCalories ? details.totalCalories : '-'}
                  <Text style={styles.appleDetailUnit}> CAL</Text>
                </Text>
              </View>
            </View>
            {/* Separator */}
            <View style={[styles.appleDetailsSep, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
            {/* Row 3: Rythme moy + FC moy */}
            <View style={styles.appleDetailsRow}>
              <View style={[styles.appleDetailCell, { borderRightWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Rythme moyen</Text>
                <Text style={[styles.appleDetailValue, { color: '#22C55E' }]}>
                  {formatPace(details?.avgPaceSecondsPerKm || 0)}
                  <Text style={styles.appleDetailUnit}> /KM</Text>
                </Text>
              </View>
              <View style={styles.appleDetailCell}>
                <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Freq. cardiaque moy.</Text>
                <Text style={[styles.appleDetailValue, { color: '#EF4444' }]}>
                  {(avgHR ?? 0) > 0 ? avgHR : '-'}
                  <Text style={styles.appleDetailUnit}> BPM</Text>
                </Text>
              </View>
            </View>
            {/* Row 4: Elevation + FC max (si dispo) */}
            {(details?.elevationAscended != null || details?.maxHeartRate) && (
              <>
                <View style={[styles.appleDetailsSep, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                <View style={styles.appleDetailsRow}>
                  <View style={[styles.appleDetailCell, { borderRightWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                    <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Denivele positif</Text>
                    <Text style={[styles.appleDetailValue, { color: '#22C55E' }]}>
                      {details?.elevationAscended != null ? `${details.elevationAscended}` : '-'}
                      <Text style={styles.appleDetailUnit}> M</Text>
                    </Text>
                  </View>
                  <View style={styles.appleDetailCell}>
                    <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Freq. cardiaque max</Text>
                    <Text style={[styles.appleDetailValue, { color: '#EF4444' }]}>
                      {details?.maxHeartRate || training.max_heart_rate || '-'}
                      <Text style={styles.appleDetailUnit}> BPM</Text>
                    </Text>
                  </View>
                </View>
              </>
            )}
            {/* Row 5: Cadence + Vitesse (si dispo) */}
            {((training.cadence ?? 0) > 0 || (training.speed ?? 0) > 0 || (training.watts ?? 0) > 0) && (
              <>
                <View style={[styles.appleDetailsSep, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                <View style={styles.appleDetailsRow}>
                  {(training.cadence ?? 0) > 0 ? (
                    <View style={[styles.appleDetailCell, { borderRightWidth: (training.speed ?? 0) > 0 || (training.watts ?? 0) > 0 ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                      <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Cadence</Text>
                      <Text style={[styles.appleDetailValue, { color: '#8B5CF6' }]}>
                        {training.cadence}
                        <Text style={styles.appleDetailUnit}> SPM</Text>
                      </Text>
                    </View>
                  ) : null}
                  {(training.watts ?? 0) > 0 ? (
                    <View style={[styles.appleDetailCell, { borderRightWidth: (training.speed ?? 0) > 0 ? 1 : 0, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                      <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Puissance</Text>
                      <Text style={[styles.appleDetailValue, { color: '#F59E0B' }]}>
                        {training.watts}
                        <Text style={styles.appleDetailUnit}> W</Text>
                      </Text>
                    </View>
                  ) : null}
                  {(training.speed ?? 0) > 0 ? (
                    <View style={styles.appleDetailCell}>
                      <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Vitesse moy.</Text>
                      <Text style={[styles.appleDetailValue, { color: '#3B82F6' }]}>
                        {typeof training.speed === 'number' ? training.speed.toFixed(1).replace('.', ',') : training.speed}
                        <Text style={styles.appleDetailUnit}> KM/H</Text>
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            )}
          </View>
        </AnimatedCard>

        {/* ═══ CARTE MUSCULAIRE ═══ */}
        {training.sport && (
          <AnimatedCard delay={140}>
            <MuscleMapCard
              sport={training.sport}
              sportName={getSportName(training.sport)}
              sportColor={getSportColor(training.sport)}
              customMuscles={training.muscles || undefined}
              trainingId={training.id}
              onMusclesUpdated={(muscles) => setTraining(prev => prev ? { ...prev, muscles } : prev)}
            />
          </AnimatedCard>
        )}

        {/* ═══ THÈME TECHNIQUE + NOTE TECHNIQUE ═══ */}
        {(training.technical_theme || (training.technique_rating != null && (training.technique_rating || 0) > 0)) && (
          <AnimatedCard delay={145} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <Text style={[styles.sectionTitleInCard, { color: colors.text }]}>Technique</Text>
            {training.technical_theme ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Zap size={16} color={sportColor} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, flex: 1 }}>
                  {training.technical_theme}
                </Text>
              </View>
            ) : null}
            {(training.technique_rating != null && (training.technique_rating || 0) > 0) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginRight: 4 }}>Maîtrise :</Text>
                {[1,2,3,4,5].map(i => (
                  <Star
                    key={i}
                    size={18}
                    color="#F59E0B"
                    fill={i <= (training.technique_rating || 0) ? '#F59E0B' : 'transparent'}
                  />
                ))}
              </View>
            ) : null}
          </AnimatedCard>
        )}

        {/* ═══ ROUNDS ═══ */}
        {((training.rounds ?? 0) > 0 || (training.round_duration ?? 0) > 0) && (
          <AnimatedCard delay={150} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <Text style={[styles.sectionTitleInCard, { color: colors.text }]}>Rounds</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
              {(training.rounds ?? 0) > 0 && (
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: sportColor }}>{training.rounds}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Rounds</Text>
                </View>
              )}
              {(training.round_duration ?? 0) > 0 && (
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: sportColor }}>{training.round_duration}'</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Par round</Text>
                </View>
              )}
              {(training.rounds ?? 0) > 0 && (training.round_duration ?? 0) > 0 && (
                <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>
                    {(training.rounds || 0) * (training.round_duration || 0)}'
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>Total sparring</Text>
                </View>
              )}
            </View>
          </AnimatedCard>
        )}

        {/* ═══ ROUNDS DE COMBAT ═══ */}
        {combatRounds.length > 0 && (
          <>
          <Text style={[styles.appleSectionTitle, { color: colors.text }]}>
            Rounds de combat {'>'}
          </Text>
          <AnimatedCard delay={155} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            {combatRounds.map((round, idx) => {
              const resultColor = round.result === 'win' ? '#22C55E' : round.result === 'loss' ? '#EF4444' : '#F59E0B';
              const resultLabel = round.result === 'win' ? 'Victoire' : round.result === 'loss' ? 'Défaite' : round.result === 'draw' ? 'Match nul' : null;
              return (
                <View key={idx} style={[
                  { paddingVertical: 12 },
                  idx < combatRounds.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' } : undefined,
                ]}>
                  {/* En-tête round */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: sportColor, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>{round.number || idx + 1}</Text>
                      </View>
                      {round.partner ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Users size={13} color={colors.textMuted} />
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{round.partner}</Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 13, color: colors.textMuted }}>Round {round.number || idx + 1}</Text>
                      )}
                    </View>
                    {resultLabel && (
                      <View style={{ backgroundColor: `${resultColor}20`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: resultColor }}>{resultLabel}</Text>
                      </View>
                    )}
                  </View>
                  {/* Soumissions */}
                  {((round.submissionsGiven ?? 0) > 0 || (round.submissionsTaken ?? 0) > 0) && (
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
                      {(round.submissionsGiven ?? 0) > 0 && (
                        <View style={{ backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 12, color: '#22C55E', fontWeight: '600' }}>
                            {round.submissionsGiven} soumission{(round.submissionsGiven || 0) > 1 ? 's' : ''} placée{(round.submissionsGiven || 0) > 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                      {(round.submissionsTaken ?? 0) > 0 && (
                        <View style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 12, color: '#EF4444', fontWeight: '600' }}>
                            {round.submissionsTaken} prise{(round.submissionsTaken || 0) > 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {/* Méthode (champ legacy simple) */}
                  {round.method && !(round.methodsGiven?.length) && !(round.methodsTaken?.length) ? (
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 4 }}>
                      Finition : <Text style={{ color: colors.text, fontWeight: '600' }}>{round.method}</Text>
                    </Text>
                  ) : null}
                  {/* Finitions données (multi-select) */}
                  {(round.methodsGiven?.length ?? 0) > 0 && (
                    <View style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A', marginBottom: 4 }}>
                        Finitions données
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {round.methodsGiven!.map((m, i) => (
                          <View key={i} style={{ backgroundColor: isDark ? 'rgba(22,163,74,0.15)' : 'rgba(22,163,74,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '600' }}>{m}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {/* Finitions reçues (multi-select) */}
                  {(round.methodsTaken?.length ?? 0) > 0 && (
                    <View style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626', marginBottom: 4 }}>
                        Finitions reçues
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {round.methodsTaken!.map((m, i) => (
                          <View key={i} style={{ backgroundColor: isDark ? 'rgba(220,38,38,0.15)' : 'rgba(220,38,38,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600' }}>{m}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  {/* Notes du round */}
                  {round.notes ? (
                    <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 4 }}>
                      {round.notes}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </AnimatedCard>
          </>
        )}

        {/* ═══ EXERCICES (MUSCULATION) ═══ */}
        {exercisesList.length > 0 && (
          <>
          <Text style={[styles.appleSectionTitle, { color: colors.text }]}>
            Exercices {'>'}
          </Text>
          <AnimatedCard delay={155} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            {exercisesList.map((ex, idx) => (
              <View key={idx} style={[
                { paddingVertical: 12 },
                idx < exercisesList.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' } : undefined,
              ]}>
                {/* Nom + groupe musculaire */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 }}>{ex.name}</Text>
                  {ex.muscle_group ? (
                    <View style={{ backgroundColor: `${sportColor}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: sportColor }}>{ex.muscle_group}</Text>
                    </View>
                  ) : null}
                </View>
                {/* Métriques: séries × reps × poids */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(ex.sets ?? 0) > 0 && (
                    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: sportColor }}>{ex.sets}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>séries</Text>
                    </View>
                  )}
                  {(ex.reps ?? 0) > 0 && (
                    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{ex.reps}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>reps</Text>
                    </View>
                  )}
                  {(ex.weight ?? 0) > 0 && (
                    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#F59E0B' }}>{ex.weight} kg</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>poids</Text>
                    </View>
                  )}
                  {ex.distance != null && ex.distance > 0 && (
                    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#3B82F6' }}>{ex.distance} km</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>distance</Text>
                    </View>
                  )}
                  {ex.duration != null && ex.duration > 0 && (
                    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#22C55E' }}>{ex.duration} min</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>durée</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </AnimatedCard>
          </>
        )}

        {/* ═══ LOADING DETAILS SKELETON ═══ */}
        {detailsLoading && !hasDetails && (
          <AnimatedCard delay={160}>
            <DetailsSkeleton colors={colors} isDark={isDark} />
          </AnimatedCard>
        )}

        {/* ═══ FRÉQUENCE CARDIAQUE ═══ */}
        {hrSamples && hrSamples.length > 2 && (
          <>
          <Text style={[styles.appleSectionTitle, { color: colors.text }]}>
            Fréquence cardiaque {'>'}
          </Text>
          <AnimatedCard delay={160} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>

            {/* FC moyenne en grand */}
            <Text style={[styles.hrAvgLabel, { color: colors.textMuted }]}>Freq. cardiaque moy.</Text>
            <Text style={[styles.hrAvgValue, { color: '#EF4444' }]}>
              {details?.avgHeartRate || avgHR || '-'} <Text style={styles.hrAvgUnit}>BPM</Text>
            </Text>

            {/* Graphe barres verticales colorees par zone */}
            <HRBarsChart
              samples={hrSamples}
              maxBpm={details?.maxHeartRate || 200}
              minBpm={details?.minHeartRate || 60}
              startTime={training.start_time}
              durationMin={duration}
              isDark={isDark}
              textColor={colors.textMuted}
              zones={hrZones}
            />

            {/* Min / Moy / Max */}
            <View style={styles.hrStatsRow}>
              <HRStatBadge label="Min" value={details?.minHeartRate} color="#3B82F6" textColor={colors.text} mutedColor={colors.textMuted} isDark={isDark} />
              <HRStatBadge label="Moy" value={details?.avgHeartRate} color="#22C55E" textColor={colors.text} mutedColor={colors.textMuted} isDark={isDark} />
              <HRStatBadge label="Max" value={details?.maxHeartRate} color="#EF4444" textColor={colors.text} mutedColor={colors.textMuted} isDark={isDark} />
            </View>
          </AnimatedCard>
          </>
        )}

        {/* ═══ ZONES CARDIAQUES ═══ */}
        {hrZones && hrZones.length > 0 ? (
          <AnimatedCard delay={240} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <View style={styles.zonesTitleRow}>
              <Text style={[styles.sectionTitleInCard, { color: colors.text }]}>Zones cardiaques</Text>
              <TouchableOpacity onPress={() => router.push('/heart-zones-settings')} activeOpacity={0.7}>
                <Text style={[styles.zonesEditLink, { color: userZones ? colors.textMuted : colors.primary }]}>
                  {userZones ? 'Modifier' : 'Personnaliser'}
                </Text>
              </TouchableOpacity>
            </View>
            <HeartRateZonesBar zones={hrZones} />
          </AnimatedCard>
        ) : hrSamples && hrSamples.length > 0 && !userZones ? (
          /* Banneau de rappel si des données FC existent mais pas de zones configurées */
          <AnimatedCard delay={240} style={[styles.card, { backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)', borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.2)' }]}>
            <View style={styles.zonesReminderContent}>
              <Heart size={28} color="#EF4444" />
              <Text style={[styles.zonesReminderTitle, { color: colors.text }]}>
                Configure tes zones cardiaques
              </Text>
              <Text style={[styles.zonesReminderSub, { color: colors.textMuted }]}>
                Tes zones personnelles te permettront de voir exactement le temps passé dans chaque zone lors de tes séances.
              </Text>
              <TouchableOpacity
                style={styles.zonesReminderBtn}
                onPress={() => router.push('/heart-zones-settings')}
                activeOpacity={0.8}
              >
                <Text style={styles.zonesReminderBtnText}>Configurer mes zones</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        ) : null}

        {/* ═══ RÉCUPÉRATION FC ═══ */}
        {details?.recoveryHR && (
          <AnimatedCard delay={320} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <Text style={[styles.sectionTitleInCard, { color: colors.text }]}>Récupération FC</Text>
            <View style={styles.recoveryRow}>
              <RecoveryItem
                label="Fin" bpm={details.recoveryHR.atEnd}
                textColor={colors.text} mutedColor={colors.textMuted} isDark={isDark}
              />
              {details.recoveryHR.after1Min != null && (
                <RecoveryItem
                  label="+1 min" bpm={details.recoveryHR.after1Min}
                  diff={details.recoveryHR.atEnd - details.recoveryHR.after1Min}
                  textColor={colors.text} mutedColor={colors.textMuted} isDark={isDark}
                />
              )}
              {details.recoveryHR.after2Min != null && (
                <RecoveryItem
                  label="+2 min" bpm={details.recoveryHR.after2Min}
                  diff={details.recoveryHR.atEnd - details.recoveryHR.after2Min}
                  textColor={colors.text} mutedColor={colors.textMuted} isDark={isDark}
                />
              )}
            </View>
          </AnimatedCard>
        )}

        {/* ═══ INTERMÉDIAIRES ═══ */}
        {splits && splits.length > 0 && (
          <>
          <Text style={[styles.appleSectionTitle, { color: colors.text }]}>
            Intermédiaires {'>'}
          </Text>
          <AnimatedCard delay={400} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <View style={[styles.splitHeaderRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.splitHeaderCell, styles.splitIdxCell, { color: colors.textMuted }]}></Text>
              <Text style={[styles.splitHeaderCell, styles.splitTimeCell, { color: colors.textMuted }]}>Durée</Text>
              <Text style={[styles.splitHeaderCell, styles.splitPaceCell, { color: colors.textMuted }]}>Rythme</Text>
              <Text style={[styles.splitHeaderCell, styles.splitElevCell, { color: colors.textMuted }]}>D+</Text>
              <Text style={[styles.splitHeaderCell, styles.splitHrCell, { color: colors.textMuted }]}>FC</Text>
            </View>
            {splits.map((split, i) => {
              const isFastest = i === fastestSplitIdx;
              return (
                <View
                  key={split.index}
                  style={[
                    styles.splitRow,
                    { borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
                  ]}
                >
                  <Text style={[styles.splitCell, styles.splitIdxCell, { color: colors.textMuted }]}>
                    {split.index}
                  </Text>
                  {/* Durée - jaune comme Apple */}
                  <Text style={[styles.splitCell, styles.splitTimeCell, { color: '#F59E0B', fontWeight: '700' }]}>
                    {formatDurationSec(split.durationSeconds)}
                  </Text>
                  {/* Rythme/Allure - vert comme Apple */}
                  <Text style={[
                    styles.splitCell, styles.splitPaceCell,
                    { color: '#22C55E', fontWeight: isFastest ? '800' : '600' },
                  ]}>
                    {formatPace(split.paceSecondsPerKm)}
                  </Text>
                  {/* Elevation - bleu */}
                  <Text style={[styles.splitCell, styles.splitElevCell, { color: '#3B82F6', fontWeight: '600' }]}>
                    {split.elevationGain != null && split.elevationGain > 0 ? `+${split.elevationGain}m` : '-'}
                  </Text>
                  {/* FC - rouge comme Apple */}
                  <Text style={[styles.splitCell, styles.splitHrCell, { color: '#EF4444', fontWeight: '600' }]}>
                    {split.avgHeartRate || '-'}{split.avgHeartRate ? <Text style={{ fontSize: 11, color: colors.textMuted }}> BPM</Text> : null}
                  </Text>
                </View>
              );
            })}
          </AnimatedCard>
          </>
        )}

        {/* ═══ GPS (tracé / lieu / indisponible) ═══ */}
        {(() => {
          const pinLat = training.location_lat ?? details?.startLatitude;
          const pinLon = training.location_lon ?? details?.startLongitude;
          const hasPin = pinLat != null && pinLon != null
            && !isNaN(pinLat) && !isNaN(pinLon)
            && (pinLat !== 0 || pinLon !== 0);
          const hasRoute = route != null && route.length > 2;
          const cardStyle = [styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }];

          if (hasRoute) {
            return (
              <>
              <Text style={[styles.appleSectionTitle, { color: colors.text }]}>Tracé GPS {'>'}</Text>
              <AnimatedCard delay={480} style={cardStyle}>
                <View style={styles.mapContainer}>
                  <WorkoutMapRoute
                    routePoints={route}
                    boundingBox={details?.routeBoundingBox}
                    height={260}
                    strokeColor={sportColor}
                    strokeWidth={4}
                  />
                </View>
                <View style={styles.routeStats}>
                  {details?.distanceKm != null && (
                    <View style={[styles.routeStatItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                      <MapPin size={14} color={sportColor} />
                      <Text style={[styles.routeStatValue, { color: colors.text }]}>{details.distanceKm} km</Text>
                    </View>
                  )}
                  {details?.elevationAscended != null && details.elevationAscended > 0 && (
                    <View style={[styles.routeStatItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                      <ArrowUp size={14} color="#22C55E" />
                      <Text style={[styles.routeStatValue, { color: colors.text }]}>{details.elevationAscended}m</Text>
                    </View>
                  )}
                  {details?.elevationDescended != null && details.elevationDescended > 0 && (
                    <View style={[styles.routeStatItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                      <ArrowDown size={14} color="#EF4444" />
                      <Text style={[styles.routeStatValue, { color: colors.text }]}>{details.elevationDescended}m</Text>
                    </View>
                  )}
                </View>
              </AnimatedCard>
              </>
            );
          }

          if (hasPin) {
            return (
              <>
              <Text style={[styles.appleSectionTitle, { color: colors.text }]}>Lieu {'>'}</Text>
              <AnimatedCard delay={480} style={cardStyle}>
                <MapPinView
                  latitude={pinLat}
                  longitude={pinLon}
                  locationName={training.location_name || undefined}
                  pinColor={sportColor}
                  height={220}
                />
              </AnimatedCard>
              </>
            );
          }

          // Aucune donnée GPS
          return (
            <>
            <Text style={[styles.appleSectionTitle, { color: colors.text }]}>Localisation {'>'}</Text>
            <AnimatedCard delay={480} style={cardStyle}>
              <View style={{ alignItems: 'center', paddingVertical: 16, gap: 8 }}>
                <MapPin size={32} color={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted, textAlign: 'center' }}>
                  Aucune donnée GPS pour cette séance
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 }}>
                  Active la capture GPS lors de l'enregistrement pour voir ta trace ici.
                </Text>
              </View>
            </AnimatedCard>
            </>
          );
        })()}

        {/* ═══ CONDITIONS ═══ */}
        {(details?.weatherTemp != null || details?.weatherHumidity != null || details?.weatherCondition || details?.airQualityIndex) && (
          <>
          <Text style={[styles.appleSectionTitle, { color: colors.text }]}>
            Conditions {'>'}
          </Text>
          <AnimatedCard delay={560} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <View style={styles.weatherRow}>
              {details?.weatherTemp != null && (
                <View style={[styles.weatherCard, { backgroundColor: isDark ? '#F59E0B15' : '#F59E0B12' }]}>
                  <Thermometer size={24} color="#F59E0B" />
                  <Text style={[styles.weatherValue, { color: colors.text }]}>
                    {details.weatherTemp}°C
                  </Text>
                  <Text style={[styles.weatherLabel, { color: colors.textMuted }]}>Temperature</Text>
                </View>
              )}
              {details?.weatherHumidity != null && (
                <View style={[styles.weatherCard, { backgroundColor: isDark ? '#3B82F615' : '#3B82F612' }]}>
                  <Droplets size={24} color="#3B82F6" />
                  <Text style={[styles.weatherValue, { color: colors.text }]}>
                    {details.weatherHumidity}%
                  </Text>
                  <Text style={[styles.weatherLabel, { color: colors.textMuted }]}>Humidite</Text>
                </View>
              )}
              {details?.weatherCondition && (
                <View style={[styles.weatherCard, { backgroundColor: isDark ? '#8B5CF615' : '#8B5CF612' }]}>
                  <Wind size={24} color="#8B5CF6" />
                  <Text style={[styles.weatherValue, { color: colors.text, fontSize: 16 }]}>
                    {details.weatherCondition}
                  </Text>
                  <Text style={[styles.weatherLabel, { color: colors.textMuted }]}>Conditions</Text>
                </View>
              )}
            </View>
            {details?.airQualityIndex != null && (
              <View style={[styles.airQualityRow, { marginTop: 12 }]}>
                <View style={[styles.weatherCard, {
                  backgroundColor: isDark
                    ? `${getAirQualityColor(details.airQualityIndex)}15`
                    : `${getAirQualityColor(details.airQualityIndex)}12`,
                  flex: 1,
                }]}>
                  <Wind size={24} color={getAirQualityColor(details.airQualityIndex)} />
                  <Text style={[styles.weatherValue, { color: colors.text }]}>
                    {details.airQualityIndex}
                  </Text>
                  <Text style={[styles.weatherLabel, { color: colors.textMuted }]}>
                    {t('workoutDetail.airQuality') || 'Qualité de l\'air'}
                  </Text>
                  {details.airQualityCategory && (
                    <Text style={[styles.airQualityBadge, {
                      color: getAirQualityColor(details.airQualityIndex),
                    }]}>
                      {details.airQualityCategory}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </AnimatedCard>
          </>
        )}

        {/* === EFFORT PERCU (RPE) + NOTES === */}
        {(() => {
          // Filtrer les notes auto-generees (ex: "marche (33min)", "running (45min)")
          const rawNotes = training.notes?.trim() || '';
          const isAutoNote = /^[a-zA-ZÀ-ÿ\s]+\(\d+\s*min\)$/i.test(rawNotes);
          const hasRealNotes = rawNotes.length > 0 && !isAutoNote;
          if ((training.intensity ?? 0) <= 0 && !hasRealNotes) return null;
          return (
          <AnimatedCard delay={640} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            {(training.intensity ?? 0) > 0 && (
              <>
                <Text style={[styles.sectionTitleInCard, { color: colors.text }]}>
                  Effort
                </Text>
                <View style={styles.rpeContainer}>
                  <View style={[styles.rpeBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <View style={[styles.rpeBarFill, {
                      width: `${(training.intensity || 0) * 10}%`,
                      backgroundColor: (training.intensity || 0) <= 3 ? '#22C55E'
                        : (training.intensity || 0) <= 6 ? '#F59E0B'
                        : (training.intensity || 0) <= 8 ? '#F97316' : '#EF4444',
                    }]} />
                  </View>
                  <Text style={[styles.rpeValue, {
                    color: (training.intensity || 0) <= 3 ? '#22C55E'
                      : (training.intensity || 0) <= 6 ? '#F59E0B'
                      : (training.intensity || 0) <= 8 ? '#F97316' : '#EF4444',
                  }]}>
                    {training.intensity}/10
                  </Text>
                </View>
              </>
            )}
            {hasRealNotes && (
              <View style={(training.intensity ?? 0) > 0 ? { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' } : undefined}>
                <Text style={[styles.sectionTitleInCard, { color: colors.text }]}>Notes</Text>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {rawNotes}
                </Text>
              </View>
            )}
          </AnimatedCard>
          );
        })()}

        <View style={{ height: insets.bottom + 30 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

// ============================================
// MAP PIN VIEW — Carte avec point de départ + modal plein écran
// ============================================

const MapPinView: React.FC<{
  latitude: number;
  longitude: number;
  locationName?: string;
  pinColor: string;
  height?: number;
}> = ({ latitude, longitude, locationName, pinColor, height = 220 }) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  const btnBg = 'rgba(0,0,0,0.6)';

  const renderMap = (fullscreen: boolean) => (
    <MapView
      provider={PROVIDER_DEFAULT}
      style={{ flex: 1 }}
      initialRegion={region}
      scrollEnabled
      zoomEnabled
      rotateEnabled={fullscreen}
      pitchEnabled={fullscreen}
      mapType="hybrid"
      showsCompass={fullscreen}
      showsScale={fullscreen}
      showsTraffic={false}
      showsBuildings
      showsIndoors={false}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      loadingEnabled
      {...(Platform.OS === 'ios' ? { userInterfaceStyle: isDark ? 'dark' : 'light' } : {})}
    >
      <Marker coordinate={{ latitude, longitude }} pinColor={pinColor} />
    </MapView>
  );

  return (
    <>
      {/* Preview inline */}
      <View style={{ height, borderRadius: 12, overflow: 'hidden', marginBottom: 4 }}>
        {renderMap(false)}
        {/* Bouton plein écran */}
        <TouchableOpacity
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: btnBg,
            justifyContent: 'center', alignItems: 'center',
          }}
          onPress={() => setIsFullscreen(true)}
          activeOpacity={0.7}
        >
          <Maximize2 size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Nom du lieu */}
      {locationName ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <MapPin size={13} color={pinColor} />
          <Text style={{ fontSize: 13, color: isDark ? '#FFFFFF' : '#000000', fontWeight: '600' }}>
            {locationName}
          </Text>
        </View>
      ) : null}

      {/* Modal plein écran */}
      <Modal visible={isFullscreen} animationType="slide" presentationStyle="fullScreen">
        <View style={{ flex: 1 }}>
          {renderMap(true)}
          {/* Fermer */}
          <TouchableOpacity
            style={{
              position: 'absolute', top: insets.top + 10, left: 16,
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: btnBg,
              justifyContent: 'center', alignItems: 'center',
            }}
            onPress={() => setIsFullscreen(false)}
            activeOpacity={0.7}
          >
            <X size={18} color="#FFF" />
          </TouchableOpacity>
          {/* Nom du lieu en bas */}
          {locationName && (
            <View style={{
              position: 'absolute', bottom: insets.bottom + 16, left: 16, right: 16,
              backgroundColor: btnBg, paddingHorizontal: 16, paddingVertical: 10,
              borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <MapPin size={14} color={pinColor} />
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700', flex: 1 }}>{locationName}</Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
};

// ============================================
// HR BARS CHART - Barres verticales colorees par zone (style Apple Health)
// ============================================

const ZONE_COLORS = ['#3B82F6', '#22C55E', '#EAB308', '#F97316', '#EF4444'];

// Zones Apple Fitness (63/71/79/90% de FCmax).
// Si les vraies zones de l'utilisateur sont passées, on les utilise directement.
function getZoneColor(bpm: number, zones?: Array<{ minBpm: number; maxBpm: number; color: string }>): string {
  if (zones && zones.length >= 5) {
    for (const z of zones) {
      if (bpm >= z.minBpm && bpm < z.maxBpm) return z.color;
    }
    return zones[zones.length - 1].color;
  }
  // Fallback seuils Apple (FCmax=190 → 120/135/150/171)
  if (bpm < 120) return ZONE_COLORS[0];
  if (bpm < 135) return ZONE_COLORS[1];
  if (bpm < 150) return ZONE_COLORS[2];
  if (bpm < 171) return ZONE_COLORS[3];
  return ZONE_COLORS[4];
}

function addMinutesToTime(startTime: string | undefined, addMin: number): string {
  if (!startTime) return '';
  try {
    const [h, m] = startTime.split(':').map(Number);
    const totalMin = h * 60 + m + addMin;
    const rh = Math.floor(totalMin / 60) % 24;
    const rm = Math.floor(totalMin % 60);
    return `${rh.toString().padStart(2, '0')}:${rm.toString().padStart(2, '0')}`;
  } catch { return ''; }
}

const HRBarsChart: React.FC<{
  samples: HeartRateSample[];
  maxBpm: number;
  minBpm: number;
  startTime?: string;
  durationMin: number;
  isDark: boolean;
  textColor: string;
  zones?: Array<{ minBpm: number; maxBpm: number; color: string }>;
}> = ({ samples, maxBpm, minBpm, startTime, durationMin, isDark, textColor, zones }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const chartWidth = SCREEN_WIDTH - 64;
  const chartHeight = 130;
  const bpmPadding = 8;
  const effectiveMax = maxBpm + bpmPadding;
  const effectiveMin = Math.max(40, minBpm - bpmPadding);
  const bpmRange = effectiveMax - effectiveMin || 1;

  // Plus de barres pour une densité style Apple (jusqu'à 200)
  const downsampled = useMemo(() => downsampleHR(samples, Math.min(samples.length, Math.floor(chartWidth / 2))), [samples, chartWidth]);
  const barCount = downsampled.length;
  const totalBarWidth = chartWidth / barCount;
  const barWidth = Math.max(1, totalBarWidth * 0.65);
  const gap = totalBarWidth - barWidth;

  // Ligne de moyenne
  const avgBpm = Math.round(samples.reduce((s, v) => s + v.bpm, 0) / (samples.length || 1));
  const avgY = chartHeight - Math.max(2, ((avgBpm - effectiveMin) / bpmRange) * chartHeight);

  // Labels de temps
  const midTime = addMinutesToTime(startTime, durationMin / 2);
  const endTime = addMinutesToTime(startTime, durationMin);

  // Lignes de grille horizontales (3 niveaux)
  const gridBpms = [
    Math.round(effectiveMin + bpmRange * 0.33),
    Math.round(effectiveMin + bpmRange * 0.66),
    effectiveMax,
  ];

  return (
    <View style={styles.hrBarsContainer}>
      {/* Max BPM label */}
      <View style={styles.hrBarsLabels}>
        <Text style={[styles.hrBarsMinMax, { color: textColor }]}>{maxBpm}</Text>
      </View>

      {/* SVG Bars */}
      <View style={[styles.hrBarsChart, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Lignes de grille */}
          {gridBpms.map((bpm, i) => {
            const gy = chartHeight - ((bpm - effectiveMin) / bpmRange) * chartHeight;
            return (
              <Line
                key={`grid-${i}`}
                x1={0} y1={gy}
                x2={chartWidth} y2={gy}
                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                strokeWidth={1}
              />
            );
          })}

          {/* Barres FC colorées par zone */}
          {downsampled.map((s, i) => {
            const h = Math.max(3, ((s.bpm - effectiveMin) / bpmRange) * chartHeight);
            const x = i * (barWidth + gap) + gap / 2;
            const y = chartHeight - h;
            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={barWidth >= 2 ? 1 : 0}
                fill={getZoneColor(s.bpm, zones)}
                opacity={0.9}
              />
            );
          })}

          {/* Ligne de moyenne (pointillée) */}
          <Line
            x1={0} y1={avgY}
            x2={chartWidth} y2={avgY}
            stroke="#EF4444"
            strokeWidth={1}
            strokeDasharray="4,3"
            opacity={0.6}
          />
        </Svg>
      </View>

      {/* Min BPM */}
      <View style={styles.hrBarsBottom}>
        <Text style={[styles.hrBarsMinMax, { color: textColor }]}>{minBpm}</Text>
      </View>

      {/* Heures sur l'axe X */}
      <View style={styles.hrBarsTimeRow}>
        <Text style={[styles.hrBarsTime, { color: textColor }]}>{startTime || ''}</Text>
        <Text style={[styles.hrBarsTime, { color: textColor }]}>{midTime}</Text>
        <Text style={[styles.hrBarsTime, { color: textColor }]}>{endTime}</Text>
      </View>

      {/* Moy. BPM */}
      <Text style={[styles.hrBarsAvgLabel, { color: '#EF4444' }]}>
        Moy. de {avgBpm} BPM
      </Text>
    </View>
  );
};

const HRStatBadge: React.FC<{
  label: string; value?: number; color: string;
  textColor: string; mutedColor: string; isDark: boolean;
}> = ({ label, value, color, textColor, mutedColor, isDark }) => (
  <View style={[styles.hrStatItem, { backgroundColor: isDark ? `${color}15` : `${color}0A` }]}>
    <View style={[styles.hrStatDot, { backgroundColor: color }]} />
    <Text style={[styles.hrStatLabel, { color: mutedColor }]}>{label}</Text>
    <Text style={[styles.hrStatValue, { color: textColor }]}>
      {value || '-'} <Text style={[styles.hrStatUnit, { color: mutedColor }]}>bpm</Text>
    </Text>
  </View>
);

const RecoveryItem: React.FC<{
  label: string; bpm: number; diff?: number;
  textColor: string; mutedColor: string; isDark: boolean;
}> = ({ label, bpm, diff, textColor, mutedColor, isDark }) => (
  <View style={[styles.recoveryItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
    <Text style={[styles.recoveryLabel, { color: mutedColor }]}>{label}</Text>
    <Text style={[styles.recoveryBpm, { color: textColor }]}>{bpm}</Text>
    <Text style={[styles.recoveryUnit, { color: mutedColor }]}>bpm</Text>
    {diff != null && diff > 0 && (
      <View style={styles.recoveryDiffBadge}>
        <Text style={styles.recoveryDiffText}>-{diff}</Text>
      </View>
    )}
  </View>
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },

  // Hero card
  heroCard: {
    borderRadius: 24,
    marginBottom: 12,
    overflow: 'hidden',
  },
  heroOverlay: {
    padding: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconCircle: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  heroTitleBlock: { flex: 1 },
  heroSportName: {
    fontSize: 22, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroDate: {
    fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.9)',
    marginTop: 3,
  },
  heroDateSub: {
    fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  heroMetrics: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 20, paddingTop: 18,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroMetricItem: { flex: 1, alignItems: 'center' },
  heroMetricValue: {
    fontSize: 24, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroMetricLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)',
    marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  heroMetricDivider: {
    width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroBadges: {
    flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap',
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgeText: {
    fontSize: 11, fontWeight: '600', color: '#FFFFFF',
  },

  // Standard card
  card: {
    borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10, shadowRadius: 10, elevation: 4,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
  },
  sectionIconBg: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },

  // Apple details grid
  appleSectionTitle: {
    fontSize: 18, fontWeight: '700', marginBottom: 12, letterSpacing: -0.3,
  },
  sectionTitleInCard: {
    fontSize: 15, fontWeight: '700', letterSpacing: -0.2, marginBottom: 12,
  },
  appleDetailsGrid: {
    borderRadius: 14, overflow: 'hidden',
  },
  appleDetailsRow: {
    flexDirection: 'row',
  },
  appleDetailCell: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 14,
  },
  appleDetailLabel: {
    fontSize: 13, fontWeight: '500', marginBottom: 4,
  },
  appleDetailValue: {
    fontSize: 28, fontWeight: '800', letterSpacing: -1,
  },
  appleDetailUnit: {
    fontSize: 14, fontWeight: '700',
  },
  appleDetailsSep: {
    height: 1, marginHorizontal: 14,
  },

  // HR avg
  hrAvgLabel: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  hrAvgValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 16 },
  hrAvgUnit: { fontSize: 16, fontWeight: '600' },

  // HR Bars chart (Apple style)
  hrBarsContainer: { marginBottom: 8 },
  hrBarsLabels: { alignItems: 'flex-end', marginBottom: 2 },
  hrBarsChart: { borderRadius: 8, padding: 4, overflow: 'hidden' },
  hrBarsBottom: { alignItems: 'flex-end', marginTop: 2 },
  hrBarsMinMax: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] as any },
  hrBarsTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  hrBarsTime: { fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'] as any },
  hrBarsAvgLabel: { fontSize: 13, fontWeight: '600', marginTop: 6 },

  // HR stats
  hrStatsRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 8,
    marginTop: 14,
  },
  hrStatItem: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 10, borderRadius: 12,
  },
  hrStatDot: { width: 8, height: 8, borderRadius: 4 },
  hrStatLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  hrStatValue: { fontSize: 17, fontWeight: '700' },
  hrStatUnit: { fontSize: 11, fontWeight: '400' },

  // Recovery
  recoveryRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
  recoveryItem: {
    flex: 1, alignItems: 'center', gap: 3,
    paddingVertical: 14, borderRadius: 14,
  },
  recoveryLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  recoveryBpm: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  recoveryUnit: { fontSize: 11 },
  recoveryDiffBadge: {
    backgroundColor: '#22C55E20', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, marginTop: 4,
  },
  recoveryDiffText: { fontSize: 13, fontWeight: '700', color: '#22C55E' },

  // Splits
  splitHeaderRow: {
    flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  splitRow: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 6,
  },
  splitHeaderCell: { fontSize: 13, fontWeight: '500' },
  splitCell: { fontSize: 16, fontWeight: '600' },
  splitIdxCell: { width: 24, textAlign: 'center' },
  splitTimeCell: { flex: 1 },
  splitPaceCell: { width: 65 },
  splitElevCell: { width: 45 },
  splitHrCell: { width: 70, textAlign: 'right' },

  // Map
  mapContainer: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 8,
  },
  routeStats: {
    flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap',
  },
  routeStatItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  routeStatValue: { fontSize: 13, fontWeight: '700' },

  // Weather
  weatherRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  weatherCard: {
    flex: 1, alignItems: 'center', gap: 8,
    paddingVertical: 18, borderRadius: 16,
  },
  weatherValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  weatherLabel: { fontSize: 12, fontWeight: '500' },
  airQualityRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  airQualityBadge: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // RPE / Effort
  rpeContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4,
  },
  rpeBarBg: {
    flex: 1, height: 10, borderRadius: 5, overflow: 'hidden',
  },
  rpeBarFill: {
    height: '100%', borderRadius: 5,
  },
  rpeValue: {
    fontSize: 18, fontWeight: '800', letterSpacing: -0.5, minWidth: 45, textAlign: 'right',
  },

  // Notes
  notesText: {
    fontSize: 15, fontWeight: '400', lineHeight: 22, marginTop: 4,
  },

  // Zones cardiaques
  zonesTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
  },
  zonesEditLink: {
    fontSize: 13, fontWeight: '500',
  },
  zonesReminderContent: {
    alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, gap: 10,
  },
  zonesReminderTitle: {
    fontSize: 16, fontWeight: '700', textAlign: 'center',
  },
  zonesReminderSub: {
    fontSize: 13, lineHeight: 18, textAlign: 'center',
  },
  zonesReminderBtn: {
    marginTop: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  zonesReminderBtnText: {
    color: '#FFF', fontSize: 14, fontWeight: '700',
  },
});
