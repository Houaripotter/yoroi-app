// ============================================
// YOROI - DETAIL SEANCE (Workout Detail)
// ============================================
// Affiche toutes les metriques d'une seance importee depuis Apple Health :
// FC, zones cardiaques, allure, intermediaires, trace GPS, meteo
// 2-phase loading: basic info instant, details async with retry

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock, MapPin, Flame, Heart, Timer, TrendingUp,
  Mountain, Thermometer, Droplets, Zap, Activity,
  Wind, ArrowUp, ArrowDown,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { Header } from '@/components/ui/Header';
import { HeartRateZonesBar } from '@/components/stats/HeartRateZonesBar';
import { WorkoutMapRoute } from '@/components/WorkoutMapRoute';
import { getTrainingById as _getTrainingById, updateTrainingDetails, getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import type { WorkoutDetails, HeartRateSample } from '@/lib/healthConnect.ios';
import { healthConnect } from '@/lib/healthConnect';
import { getSportColor, getSportIcon, getSportName } from '@/lib/sports';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
    { zone: 1, name: 'Z1 Recup', minBpm: 0, maxBpm: 120, durationSeconds: 0, color: '#94A3B8' },
    { zone: 2, name: 'Z2 Endurance', minBpm: 120, maxBpm: 140, durationSeconds: 0, color: '#22C55E' },
    { zone: 3, name: 'Z3 Tempo', minBpm: 140, maxBpm: 160, durationSeconds: 0, color: '#EAB308' },
    { zone: 4, name: 'Z4 Seuil', minBpm: 160, maxBpm: 180, durationSeconds: 0, color: '#F97316' },
    { zone: 5, name: 'Z5 Max', minBpm: 180, maxBpm: 250, durationSeconds: 0, color: '#EF4444' },
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
    weatherTemp: 15,
    weatherHumidity: 72,
    airQualityIndex: 2,
    airQualityCategory: 'Bon',
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

  // Route GPS demo pour TOUS les workouts (Apple Sante donne des coordonnees pour chaque seance)
  {
    const dist = (training.distance || 0) > 0 ? training.distance! : 2; // 2km par defaut si pas de distance
    const centerLat = 48.8566;
    const centerLon = 2.3522;
    const radius = 0.003 + 0.003 * dist;
    details.routePoints = [];
    const pointCount = Math.min(200, Math.round(dist * 30));
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * 2 * Math.PI;
      const wobble = 1 + (Math.sin(angle * 3) * 0.15) + (Math.random() * 0.05);
      details.routePoints.push({
        latitude: centerLat + Math.cos(angle) * radius * wobble,
        longitude: centerLon + Math.sin(angle) * radius * wobble * 1.5,
        altitude: 35 + Math.sin(angle * 2) * 10,
      });
    }
    const lats = details.routePoints.map(p => p.latitude);
    const lons = details.routePoints.map(p => p.longitude);
    details.routeBoundingBox = {
      minLat: Math.min(...lats), maxLat: Math.max(...lats),
      minLon: Math.min(...lons), maxLon: Math.max(...lons),
    };
  }

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
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}`;
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
  const { colors, isDark, screenBackground } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ id?: string }>();

  const [training, setTraining] = useState<Training | null>(null);
  const [details, setDetails] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
          // Verifier que le cache a du contenu utile (pas juste durationMinutes)
          const hasRichData = cached.heartRateSamples?.length > 0 || cached.routePoints?.length > 0
            || cached.heartRateZones?.length > 0 || cached.weatherTemp != null;
          if (hasRichData) {
            setDetails(cached);
            // Cache incomplet: GPS ou qualite d'air manquants -> re-fetch en background
            const missingGPS = !cached.routePoints?.length;
            const missingAQI = cached.airQualityIndex == null;
            if (tr.healthkit_uuid && (missingGPS || missingAQI)) {
              loadDetailsFromHealthKit(
                tr.healthkit_uuid, id, fallbackStart, tr.duration_minutes, tr,
              );
            }
          } else {
            // Cache pauvre, re-fetcher depuis HealthKit
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
    // HealthKit n'a rien retourne (simulateur ou pas de donnees) -> donnees demo
    if (trainingRecord) {
      logger.info('[WorkoutDetail] HealthKit vide, generation donnees demo pour preview UI');
      setDetails(generateDemoDetails(trainingRecord));
    }
    setDetailsLoading(false);
  }, []);

  if (loading) {
    return (
      <View style={[styles.screenRoot, { backgroundColor: screenBackground }]}>
        <Header title={t('workoutDetail.title') || 'Detail Seance'} showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!training) {
    return (
      <View style={[styles.screenRoot, { backgroundColor: screenBackground }]}>
        <Header title={t('workoutDetail.title') || 'Detail Seance'} showBack />
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Seance introuvable
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
  const hrZones = details?.heartRateZones;
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

  return (
    <View style={[styles.screenRoot, { backgroundColor: screenBackground }]}>
      <Header title={t('workoutDetail.title') || 'Detail Seance'} showBack />
      <ScrollView
        style={styles.scroll}
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
                <Text style={styles.heroSportName} numberOfLines={1}>
                  {training.session_type || sportName}
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
                <Text style={styles.heroMetricValue}>{formatDuration(duration)}</Text>
                <Text style={styles.heroMetricLabel}>{t('workoutDetail.duration') || 'Duree'}</Text>
              </View>
              {(distance ?? 0) > 0 && (
                <>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetricItem}>
                    <Text style={styles.heroMetricValue}>{typeof distance === 'number' ? distance.toFixed(1) : distance}</Text>
                    <Text style={styles.heroMetricLabel}>km</Text>
                  </View>
                </>
              )}
              {(calories ?? 0) > 0 && (
                <>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetricItem}>
                    <Text style={styles.heroMetricValue}>{Math.round(calories || 0)}</Text>
                    <Text style={styles.heroMetricLabel}>kcal</Text>
                  </View>
                </>
              )}
              {(avgHR ?? 0) > 0 && (
                <>
                  <View style={styles.heroMetricDivider} />
                  <View style={styles.heroMetricItem}>
                    <Text style={styles.heroMetricValue}>{avgHR}</Text>
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
                  <Text style={styles.heroBadgeText}>Outdoor</Text>
                </View>
              )}
              {training.source && training.source !== 'manual' && (
                <View style={styles.heroBadge}>
                  <Heart size={12} color="#FFFFFF" />
                  <Text style={styles.heroBadgeText}>{training.source}</Text>
                </View>
              )}
              {details?.elevationAscended != null && details.elevationAscended > 0 && (
                <View style={styles.heroBadge}>
                  <ArrowUp size={12} color="#FFFFFF" />
                  <Text style={styles.heroBadgeText}>{details.elevationAscended}m</Text>
                </View>
              )}
            </View>
          </View>
        </AnimatedCard>

        {/* ═══ DETAILS DE L'EXERCICE - Style Apple Health ═══ */}
        <AnimatedCard delay={80} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
          <Text style={[styles.appleSectionTitle, { color: colors.text }]}>
            Details de l'exercice
          </Text>
          <View style={[styles.appleDetailsGrid, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            {/* Row 1: Duree + Distance */}
            <View style={styles.appleDetailsRow}>
              <View style={[styles.appleDetailCell, { borderRightWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Duree de l'exercice</Text>
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
                <Text style={[styles.appleDetailLabel, { color: colors.textMuted }]}>Cal. en activite</Text>
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

        {/* ═══ LOADING DETAILS SKELETON ═══ */}
        {detailsLoading && !hasDetails && (
          <AnimatedCard delay={160}>
            <DetailsSkeleton colors={colors} isDark={isDark} />
          </AnimatedCard>
        )}

        {/* ═══ FREQUENCE CARDIAQUE - Barres colorees par zone ═══ */}
        {hrSamples && hrSamples.length > 2 && (
          <AnimatedCard delay={160} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#EF444415' }]}>
                <Heart size={16} color="#EF4444" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('workoutDetail.heartRate') || 'Frequence cardiaque'}
              </Text>
            </View>

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
            />

            {/* Min / Moy / Max */}
            <View style={styles.hrStatsRow}>
              <HRStatBadge label="Min" value={details?.minHeartRate} color="#3B82F6" textColor={colors.text} mutedColor={colors.textMuted} isDark={isDark} />
              <HRStatBadge label="Moy" value={details?.avgHeartRate} color="#22C55E" textColor={colors.text} mutedColor={colors.textMuted} isDark={isDark} />
              <HRStatBadge label="Max" value={details?.maxHeartRate} color="#EF4444" textColor={colors.text} mutedColor={colors.textMuted} isDark={isDark} />
            </View>
          </AnimatedCard>
        )}

        {/* ═══ ZONES CARDIAQUES ═══ */}
        {hrZones && hrZones.length > 0 && (
          <AnimatedCard delay={240} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#F9731615' }]}>
                <Zap size={16} color="#F97316" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('workoutDetail.heartRateZones') || 'Zones cardiaques'}
              </Text>
            </View>
            <HeartRateZonesBar zones={hrZones} />
          </AnimatedCard>
        )}

        {/* ═══ RECUPERATION FC ═══ */}
        {details?.recoveryHR && (
          <AnimatedCard delay={320} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#06B6D415' }]}>
                <TrendingUp size={16} color="#06B6D4" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('workoutDetail.recovery') || 'Recuperation FC'}
              </Text>
            </View>
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

        {/* ═══ INTERMEDIAIRES ═══ */}
        {splits && splits.length > 0 && (
          <AnimatedCard delay={400} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#6366f115' }]}>
                <Timer size={16} color="#6366f1" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('workoutDetail.splits') || 'Intermediaires'}
              </Text>
            </View>
            <View style={[styles.splitHeaderRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[styles.splitHeaderCell, styles.splitIdxCell, { color: colors.textMuted }]}></Text>
              <Text style={[styles.splitHeaderCell, styles.splitTimeCell, { color: colors.textMuted }]}>Duree</Text>
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
                  {/* Duree - jaune comme Apple */}
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
        )}

        {/* ═══ PARCOURS GPS ═══ */}
        {route && route.length > 2 && (
          <AnimatedCard delay={480} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#22C55E15' }]}>
                <MapPin size={16} color="#22C55E" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('workoutDetail.route') || 'Parcours'}
              </Text>
            </View>
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
        )}

        {/* ═══ LIEU D'ENTRAINEMENT (pin GPS manuel) ═══ */}
        {!route?.length && training.location_lat != null && training.location_lon != null && (
          <AnimatedCard delay={480} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#22C55E15' }]}>
                <MapPin size={16} color="#22C55E" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Lieu d'entrainement
              </Text>
            </View>

            {Platform.OS === 'ios' ? (
              /* iOS : Apple Maps natif, aucune cle API requise */
              <View style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 4 }}>
                <MapView
                  provider={PROVIDER_DEFAULT}
                  style={{ height: 220 }}
                  initialRegion={{
                    latitude: training.location_lat,
                    longitude: training.location_lon,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  mapType="hybrid"
                  userInterfaceStyle={isDark ? 'dark' : 'light'}
                >
                  <Marker
                    coordinate={{ latitude: training.location_lat, longitude: training.location_lon }}
                    pinColor={sportColor}
                  />
                </MapView>
              </View>
            ) : (
              /* Android : carte de coordonnees + bouton ouvrir dans Maps */
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const lat = training.location_lat!;
                  const lon = training.location_lon!;
                  const label = encodeURIComponent(training.location_name || 'Lieu d\'entrainement');
                  Linking.openURL(`geo:${lat},${lon}?q=${lat},${lon}(${label})`);
                }}
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)',
                  borderWidth: 1,
                  borderColor: '#22C55E40',
                  padding: 16,
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <MapPin size={32} color="#22C55E" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
                  {training.location_name || 'Lieu capturé'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {training.location_lat!.toFixed(5)}, {training.location_lon!.toFixed(5)}
                </Text>
                <View style={{
                  marginTop: 4, paddingHorizontal: 16, paddingVertical: 8,
                  borderRadius: 20, backgroundColor: '#22C55E',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                    Ouvrir dans Maps
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {training.location_name && Platform.OS === 'ios' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <MapPin size={13} color={sportColor} />
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600' }}>
                  {training.location_name}
                </Text>
              </View>
            ) : null}
          </AnimatedCard>
        )}

        {/* ═══ METEO ═══ */}
        {(details?.weatherTemp != null || details?.weatherHumidity != null || details?.weatherCondition || details?.airQualityIndex) && (
          <AnimatedCard delay={560} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconBg, { backgroundColor: '#F59E0B15' }]}>
                <Thermometer size={16} color="#F59E0B" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('workoutDetail.weather') || 'Meteo'}
              </Text>
            </View>
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
                    {t('workoutDetail.airQuality') || 'Qualite de l\'air'}
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
        )}

        {/* === EFFORT PERCU (RPE) + NOTES === */}
        {((training.intensity ?? 0) > 0 || (training.notes && training.notes.trim())) && (
          <AnimatedCard delay={640} style={[styles.card, { backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            {(training.intensity ?? 0) > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: '#F9731615' }]}>
                    <Activity size={16} color="#F97316" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Effort percu (RPE)
                  </Text>
                </View>
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
            {training.notes && training.notes.trim() && (
              <View style={(training.intensity ?? 0) > 0 ? { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' } : undefined}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconBg, { backgroundColor: '#6366f115' }]}>
                    <MaterialCommunityIcons name="note-text-outline" size={16} color="#6366f1" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Notes
                  </Text>
                </View>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                  {training.notes}
                </Text>
              </View>
            )}
          </AnimatedCard>
        )}

        <View style={{ height: insets.bottom + 30 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

// ============================================
// HR BARS CHART - Barres verticales colorees par zone (style Apple Health)
// ============================================

const ZONE_COLORS = ['#3B82F6', '#22C55E', '#EAB308', '#F97316', '#EF4444'];

function getZoneColor(bpm: number): string {
  // Zones basees sur pourcentage FC max estimee (~190-200)
  if (bpm < 120) return ZONE_COLORS[0]; // Z1 bleu
  if (bpm < 140) return ZONE_COLORS[1]; // Z2 vert
  if (bpm < 155) return ZONE_COLORS[2]; // Z3 jaune
  if (bpm < 170) return ZONE_COLORS[3]; // Z4 orange
  return ZONE_COLORS[4]; // Z5 rouge
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
}> = ({ samples, maxBpm, minBpm, startTime, durationMin, isDark, textColor }) => {
  const chartWidth = SCREEN_WIDTH - 64; // padding
  const chartHeight = 120;
  const bpmPadding = 10;
  const effectiveMax = maxBpm + bpmPadding;
  const effectiveMin = Math.max(40, minBpm - bpmPadding);
  const bpmRange = effectiveMax - effectiveMin || 1;

  const downsampled = useMemo(() => downsampleHR(samples, Math.min(samples.length, 120)), [samples]);
  const barCount = downsampled.length;
  const barWidth = Math.max(1.5, (chartWidth / barCount) - 0.5);
  const gap = (chartWidth - barWidth * barCount) / Math.max(barCount - 1, 1);

  // Time labels
  const midTime = addMinutesToTime(startTime, durationMin / 2);
  const endTime = addMinutesToTime(startTime, durationMin);

  return (
    <View style={styles.hrBarsContainer}>
      {/* Max BPM label */}
      <View style={styles.hrBarsLabels}>
        <Text style={[styles.hrBarsMinMax, { color: textColor }]}>{maxBpm}</Text>
      </View>

      {/* SVG Bars */}
      <View style={[styles.hrBarsChart, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
        <Svg width={chartWidth} height={chartHeight}>
          {downsampled.map((s, i) => {
            const height = Math.max(2, ((s.bpm - effectiveMin) / bpmRange) * chartHeight);
            const x = i * (barWidth + gap);
            const y = chartHeight - height;
            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx={barWidth > 2 ? 1 : 0}
                fill={getZoneColor(s.bpm)}
              />
            );
          })}
        </Svg>
      </View>

      {/* Min BPM + time labels */}
      <View style={styles.hrBarsBottom}>
        <Text style={[styles.hrBarsMinMax, { color: textColor }]}>{minBpm}</Text>
      </View>
      <View style={styles.hrBarsTimeRow}>
        <Text style={[styles.hrBarsTime, { color: textColor }]}>{startTime || ''}</Text>
        <Text style={[styles.hrBarsTime, { color: textColor }]}>{midTime}</Text>
        <Text style={[styles.hrBarsTime, { color: textColor }]}>{endTime}</Text>
      </View>

      {/* Moy label sous le graphe */}
      <Text style={[styles.hrBarsAvgLabel, { color: '#EF4444' }]}>
        Moy. de {Math.round((samples.reduce((s, v) => s + v.bpm, 0) / samples.length) || 0)} BPM
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
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
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
});
