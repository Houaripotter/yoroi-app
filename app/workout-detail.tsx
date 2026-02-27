// ============================================
// YOROI - DETAIL SEANCE (Workout Detail)
// ============================================
// Affiche toutes les metriques d'une seance importee depuis Apple Health :
// FC, zones cardiaques, allure, intermediaires, trace GPS, meteo

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock, MapPin, Flame, Heart, Timer, TrendingUp,
  Mountain, Thermometer, Droplets, ChevronLeft, Zap, Activity,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { SmoothLineChart } from '@/components/charts/SmoothLineChart';
import { HeartRateZonesBar } from '@/components/stats/HeartRateZonesBar';
import { WorkoutMapRoute } from '@/components/WorkoutMapRoute';
import { getTrainingById } from '@/lib/database';
import type { Training } from '@/lib/database';
import type { WorkoutDetails, HeartRateSample } from '@/lib/healthConnect.ios';
import { healthConnect } from '@/lib/healthConnect';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '@/constants/design';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// HELPERS
// ============================================

const formatPace = (secondsPerKm: number): string => {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}'${s.toString().padStart(2, '0')}"`;
};

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min`;
  return `${m} min`;
};

const formatDurationSec = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const getSportIcon = (sport: string): string => {
  const icons: Record<string, string> = {
    running: 'run',
    jjb: 'karate',
    musculation: 'dumbbell',
    autre: 'flash',
  };
  return icons[sport] || 'flash';
};

const getSportLabel = (training: Training): string => {
  return training.session_type || training.sport || 'Seance';
};

// ============================================
// MAIN SCREEN
// ============================================

export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ id?: string }>();

  const [training, setTraining] = useState<Training | null>(null);
  const [details, setDetails] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const id = parseInt(params.id || '0');
      if (!id) { setLoading(false); return; }

      const t = await getTrainingById(id);
      if (!t) { setLoading(false); return; }
      setTraining(t);

      // Charger les details depuis le JSON stocke
      if (t.workout_details_json) {
        try {
          const parsed = JSON.parse(t.workout_details_json);
          setDetails(parsed);
        } catch {}
      }
      // Lazy load depuis HealthKit si pas de details et UUID disponible
      else if (t.healthkit_uuid) {
        try {
          const hkDetails = await healthConnect.getWorkoutDetailsByUUID(t.healthkit_uuid);
          if (hkDetails) setDetails(hkDetails);
        } catch (e) {
          logger.warn('[WorkoutDetail] Erreur lazy load:', e);
        }
      }
    } catch (error) {
      logger.error('[WorkoutDetail] Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title={t('workoutDetail.title') || 'Detail Seance'} showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!training) {
    return (
      <ScreenWrapper>
        <Header title={t('workoutDetail.title') || 'Detail Seance'} showBack />
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Seance introuvable
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const hrSamples = details?.heartRateSamples;
  const hrZones = details?.heartRateZones;
  const splits = details?.splits;
  const route = details?.routePoints;

  // Trouver le split le plus rapide
  const fastestSplitIdx = splits
    ? splits.reduce((minIdx, s, i, arr) =>
        s.paceSecondsPerKm < arr[minIdx].paceSecondsPerKm ? i : minIdx, 0)
    : -1;

  return (
    <ScreenWrapper noPadding>
      <Header title={t('workoutDetail.title') || 'Detail Seance'} showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ CARTE 1 - EN-TETE ═══ */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.headerRow}>
            <View style={[styles.sportBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Activity size={24} color={colors.primary} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.sportName, { color: colors.text }]}>
                {getSportLabel(training)}
              </Text>
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                {formatDateFull(training.date, training.start_time)}
              </Text>
            </View>
            {details?.isIndoor === false && (
              <View style={[styles.outdoorBadge, { backgroundColor: '#22C55E20' }]}>
                <MapPin size={14} color="#22C55E" />
                <Text style={styles.outdoorText}>Outdoor</Text>
              </View>
            )}
          </View>
        </View>

        {/* ═══ CARTE 2 - METRIQUES CLES ═══ */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.metricsGrid}>
            <MetricItem
              icon={<Clock size={18} color="#6366f1" />}
              label={t('workoutDetail.duration') || 'Duree'}
              value={formatDuration(training.duration_minutes || details?.durationMinutes || 0)}
              textColor={colors.text}
              mutedColor={colors.textMuted}
            />
            <MetricItem
              icon={<MapPin size={18} color="#06B6D4" />}
              label="Distance"
              value={details?.distanceKm ? `${details.distanceKm} km` : (training.distance ? `${training.distance} km` : '-')}
              textColor={colors.text}
              mutedColor={colors.textMuted}
            />
            <MetricItem
              icon={<Flame size={18} color="#F97316" />}
              label={t('workoutDetail.activeCal') || 'Cal actives'}
              value={details?.activeCalories ? `${details.activeCalories}` : (training.calories ? `${training.calories}` : '-')}
              unit="kcal"
              textColor={colors.text}
              mutedColor={colors.textMuted}
            />
            <MetricItem
              icon={<Flame size={18} color="#EF4444" />}
              label={t('workoutDetail.totalCal') || 'Cal totales'}
              value={details?.totalCalories ? `${details.totalCalories}` : '-'}
              unit="kcal"
              textColor={colors.text}
              mutedColor={colors.textMuted}
            />
            <MetricItem
              icon={<Timer size={18} color="#22C55E" />}
              label={t('workoutDetail.pace') || 'Allure'}
              value={details?.avgPaceSecondsPerKm ? formatPace(details.avgPaceSecondsPerKm) : '-'}
              unit="/km"
              textColor={colors.text}
              mutedColor={colors.textMuted}
            />
            <MetricItem
              icon={<Heart size={18} color="#EF4444" />}
              label={t('workoutDetail.avgHR') || 'FC moy'}
              value={details?.avgHeartRate?.toString() || training.heart_rate?.toString() || '-'}
              unit="bpm"
              textColor={colors.text}
              mutedColor={colors.textMuted}
            />
          </View>
        </View>

        {/* ═══ CARTE 3 - FREQUENCE CARDIAQUE ═══ */}
        {hrSamples && hrSamples.length > 2 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Heart size={16} color="#EF4444" /> {t('workoutDetail.heartRate') || 'Frequence cardiaque'}
            </Text>
            <SmoothLineChart
              data={downsampleHR(hrSamples, 80).map(s => ({ value: s.bpm }))}
              height={160}
              color="#EF4444"
              showGradient
              showDots={false}
              thickness={2}
            />
            <View style={styles.hrStatsRow}>
              <HRStatBadge label="Min" value={details?.minHeartRate} color="#3B82F6" textColor={colors.text} mutedColor={colors.textMuted} />
              <HRStatBadge label="Moy" value={details?.avgHeartRate} color="#22C55E" textColor={colors.text} mutedColor={colors.textMuted} />
              <HRStatBadge label="Max" value={details?.maxHeartRate} color="#EF4444" textColor={colors.text} mutedColor={colors.textMuted} />
            </View>
          </View>
        )}

        {/* ═══ CARTE 4 - ZONES CARDIAQUES ═══ */}
        {hrZones && hrZones.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Zap size={16} color="#F97316" /> {t('workoutDetail.heartRateZones') || 'Zones cardiaques'}
            </Text>
            <HeartRateZonesBar zones={hrZones} />
          </View>
        )}

        {/* ═══ CARTE 5 - RECUPERATION FC ═══ */}
        {details?.recoveryHR && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <TrendingUp size={16} color="#06B6D4" /> {t('workoutDetail.recovery') || 'Recuperation FC'}
            </Text>
            <View style={styles.recoveryRow}>
              <RecoveryItem
                label="Fin"
                bpm={details.recoveryHR.atEnd}
                textColor={colors.text}
                mutedColor={colors.textMuted}
              />
              {details.recoveryHR.after1Min && (
                <RecoveryItem
                  label="+1 min"
                  bpm={details.recoveryHR.after1Min}
                  diff={details.recoveryHR.atEnd - details.recoveryHR.after1Min}
                  textColor={colors.text}
                  mutedColor={colors.textMuted}
                />
              )}
              {details.recoveryHR.after2Min && (
                <RecoveryItem
                  label="+2 min"
                  bpm={details.recoveryHR.after2Min}
                  diff={details.recoveryHR.atEnd - details.recoveryHR.after2Min}
                  textColor={colors.text}
                  mutedColor={colors.textMuted}
                />
              )}
            </View>
          </View>
        )}

        {/* ═══ CARTE 6 - INTERMEDIAIRES ═══ */}
        {splits && splits.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Timer size={16} color="#6366f1" /> {t('workoutDetail.splits') || 'Intermediaires'}
            </Text>
            {/* En-tete tableau */}
            <View style={styles.splitHeaderRow}>
              <Text style={[styles.splitHeaderCell, styles.splitIdxCell, { color: colors.textMuted }]}>#</Text>
              <Text style={[styles.splitHeaderCell, styles.splitDistCell, { color: colors.textMuted }]}>Dist</Text>
              <Text style={[styles.splitHeaderCell, styles.splitTimeCell, { color: colors.textMuted }]}>Temps</Text>
              <Text style={[styles.splitHeaderCell, styles.splitPaceCell, { color: colors.textMuted }]}>Allure</Text>
              <Text style={[styles.splitHeaderCell, styles.splitHrCell, { color: colors.textMuted }]}>FC</Text>
            </View>
            {splits.map((split, i) => {
              const isFastest = i === fastestSplitIdx;
              return (
                <View
                  key={split.index}
                  style={[
                    styles.splitRow,
                    isFastest && { backgroundColor: `${colors.primary}10` },
                  ]}
                >
                  <Text style={[styles.splitCell, styles.splitIdxCell, { color: colors.text }]}>
                    {split.index}
                  </Text>
                  <Text style={[styles.splitCell, styles.splitDistCell, { color: colors.text }]}>
                    {split.distanceKm} km
                  </Text>
                  <Text style={[styles.splitCell, styles.splitTimeCell, { color: colors.text }]}>
                    {formatDurationSec(split.durationSeconds)}
                  </Text>
                  <Text style={[
                    styles.splitCell, styles.splitPaceCell,
                    { color: isFastest ? colors.primary : colors.text, fontWeight: isFastest ? '700' : '500' },
                  ]}>
                    {formatPace(split.paceSecondsPerKm)}
                  </Text>
                  <Text style={[styles.splitCell, styles.splitHrCell, { color: colors.textMuted }]}>
                    {split.avgHeartRate || '-'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ═══ CARTE 7 - PARCOURS GPS ═══ */}
        {route && route.length > 2 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <MapPin size={16} color="#22C55E" /> {t('workoutDetail.route') || 'Parcours'}
            </Text>
            <WorkoutMapRoute
              routePoints={route}
              boundingBox={details?.routeBoundingBox}
              height={250}
              strokeColor={colors.primary}
              strokeWidth={4}
            />
            <View style={styles.routeStats}>
              {details?.distanceKm && (
                <Text style={[styles.routeStat, { color: colors.textMuted }]}>
                  {details.distanceKm} km
                </Text>
              )}
              {details?.elevationAscended && (
                <Text style={[styles.routeStat, { color: colors.textMuted }]}>
                  <Mountain size={12} color={colors.textMuted} /> +{details.elevationAscended} m
                </Text>
              )}
              {details?.elevationDescended && (
                <Text style={[styles.routeStat, { color: colors.textMuted }]}>
                  -{details.elevationDescended} m
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ═══ CARTE 8 - METEO ═══ */}
        {(details?.weatherTemp != null || details?.weatherHumidity != null) && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Thermometer size={16} color="#F59E0B" /> {t('workoutDetail.weather') || 'Meteo'}
            </Text>
            <View style={styles.weatherRow}>
              {details.weatherTemp != null && (
                <View style={styles.weatherItem}>
                  <Thermometer size={20} color="#F59E0B" />
                  <Text style={[styles.weatherValue, { color: colors.text }]}>
                    {details.weatherTemp}°C
                  </Text>
                </View>
              )}
              {details.weatherHumidity != null && (
                <View style={styles.weatherItem}>
                  <Droplets size={20} color="#3B82F6" />
                  <Text style={[styles.weatherValue, { color: colors.text }]}>
                    {details.weatherHumidity}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

const MetricItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  textColor: string;
  mutedColor: string;
}> = ({ icon, label, value, unit, textColor, mutedColor }) => (
  <View style={styles.metricItem}>
    {icon}
    <Text style={[styles.metricValue, { color: textColor }]}>
      {value}
      {unit && <Text style={[styles.metricUnit, { color: mutedColor }]}> {unit}</Text>}
    </Text>
    <Text style={[styles.metricLabel, { color: mutedColor }]}>{label}</Text>
  </View>
);

const HRStatBadge: React.FC<{
  label: string;
  value?: number;
  color: string;
  textColor: string;
  mutedColor: string;
}> = ({ label, value, color, textColor, mutedColor }) => (
  <View style={styles.hrStatItem}>
    <View style={[styles.hrStatDot, { backgroundColor: color }]} />
    <Text style={[styles.hrStatLabel, { color: mutedColor }]}>{label}</Text>
    <Text style={[styles.hrStatValue, { color: textColor }]}>
      {value || '-'} <Text style={[styles.hrStatUnit, { color: mutedColor }]}>bpm</Text>
    </Text>
  </View>
);

const RecoveryItem: React.FC<{
  label: string;
  bpm: number;
  diff?: number;
  textColor: string;
  mutedColor: string;
}> = ({ label, bpm, diff, textColor, mutedColor }) => (
  <View style={styles.recoveryItem}>
    <Text style={[styles.recoveryLabel, { color: mutedColor }]}>{label}</Text>
    <Text style={[styles.recoveryBpm, { color: textColor }]}>{bpm}</Text>
    <Text style={[styles.recoveryUnit, { color: mutedColor }]}>bpm</Text>
    {diff != null && diff > 0 && (
      <Text style={[styles.recoveryDiff, { color: '#22C55E' }]}>-{diff}</Text>
    )}
  </View>
);

// ============================================
// HELPERS
// ============================================

function formatDateFull(date: string, startTime?: string): string {
  try {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    let str = d.toLocaleDateString('fr-FR', options);
    if (startTime) str += ` - ${startTime}`;
    return str;
  } catch {
    return date;
  }
}

function downsampleHR(samples: HeartRateSample[], targetCount: number): HeartRateSample[] {
  if (samples.length <= targetCount) return samples;
  const step = samples.length / targetCount;
  const result: HeartRateSample[] = [];
  for (let i = 0; i < samples.length; i += step) {
    result.push(samples[Math.floor(i)]);
  }
  return result;
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },

  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sportBadge: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  sportName: { fontSize: 18, fontWeight: '700' },
  dateText: { fontSize: 13, marginTop: 2 },
  outdoorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  outdoorText: { fontSize: 11, fontWeight: '600', color: '#22C55E' },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 4,
  },
  metricItem: {
    width: '48%',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: { fontSize: 20, fontWeight: '700' },
  metricUnit: { fontSize: 13, fontWeight: '400' },
  metricLabel: { fontSize: 12, fontWeight: '500' },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // HR stats
  hrStatsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  hrStatItem: { alignItems: 'center', gap: 4 },
  hrStatDot: { width: 8, height: 8, borderRadius: 4 },
  hrStatLabel: { fontSize: 11, fontWeight: '600' },
  hrStatValue: { fontSize: 16, fontWeight: '700' },
  hrStatUnit: { fontSize: 11, fontWeight: '400' },

  // Recovery
  recoveryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  recoveryItem: { alignItems: 'center', gap: 2 },
  recoveryLabel: { fontSize: 12, fontWeight: '600' },
  recoveryBpm: { fontSize: 22, fontWeight: '700' },
  recoveryUnit: { fontSize: 11 },
  recoveryDiff: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  // Splits
  splitHeaderRow: {
    flexDirection: 'row', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  splitRow: {
    flexDirection: 'row', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
  },
  splitHeaderCell: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  splitCell: { fontSize: 14, fontWeight: '500' },
  splitIdxCell: { width: 30, textAlign: 'center' },
  splitDistCell: { width: 60, textAlign: 'center' },
  splitTimeCell: { flex: 1, textAlign: 'center' },
  splitPaceCell: { width: 65, textAlign: 'center' },
  splitHrCell: { width: 40, textAlign: 'center' },

  // Route
  routeStats: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 16, marginTop: 12,
  },
  routeStat: { fontSize: 13, fontWeight: '600' },

  // Weather
  weatherRow: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  weatherItem: { alignItems: 'center', gap: 6 },
  weatherValue: { fontSize: 18, fontWeight: '700' },
});
