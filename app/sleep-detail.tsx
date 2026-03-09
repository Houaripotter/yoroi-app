// ============================================
// YOROI - DETAIL NUIT DE SOMMEIL
// ============================================
// Affiche toutes les metriques d'une nuit :
// Phases, efficacité, FC, respiratoire, temperature
// Style Apple Health avec toutes les données

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Moon, Clock, Bed, AlarmClock, Heart, Wind,
  Thermometer, Zap, Star, Eye, TrendingDown,
  Target, BarChart3, Activity,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { SleepPhasesBar } from '@/components/stats/advanced/SleepPhasesBar';
import { getSleepEntriesByDate } from '@/lib/sleepService';
import type { SleepEntry } from '@/lib/sleepService';
import { healthConnect } from '@/lib/healthConnect';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// PHASE COLORS (Apple Health style)
// ============================================
const PHASE_COLORS = {
  deep: '#5856D6',
  core: '#60A5FA',
  rem: '#34D399',
  awake: '#F97316',
};

// ============================================
// HELPERS
// ============================================

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, '0')}min`;
};

const formatDurationShort = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const formatDateFull = (date: string): string => {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return date; }
};

const getQualityLabel = (quality: number): string => {
  if (quality >= 4.5) return 'Excellente';
  if (quality >= 3.5) return 'Bonne';
  if (quality >= 2.5) return 'Moyenne';
  if (quality >= 1.5) return 'Mediocre';
  return 'Mauvaise';
};

const getQualityColor = (quality: number): string => {
  if (quality >= 4) return '#22C55E';
  if (quality >= 3) return '#06B6D4';
  if (quality >= 2) return '#F59E0B';
  return '#EF4444';
};

const getEfficiencyColor = (eff: number): string => {
  if (eff >= 90) return '#22C55E';
  if (eff >= 80) return '#06B6D4';
  if (eff >= 70) return '#F59E0B';
  return '#EF4444';
};

// ============================================
// TYPES
// ============================================
interface SleepVitals {
  heartRate?: { min: number; max: number; avg: number };
  respiratoryRate?: { min: number; max: number; avg: number };
  wristTemperature?: { value: number };
}

interface SleepDetailExtra {
  efficiency?: number;
  interruptions?: number;
  inBedMinutes?: number;
  source?: string;
}

// ============================================
// MAIN SCREEN
// ============================================

export default function SleepDetailScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ date?: string }>();

  const [entry, setEntry] = useState<SleepEntry | null>(null);
  const [vitals, setVitals] = useState<SleepVitals | null>(null);
  const [extra, setExtra] = useState<SleepDetailExtra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!params.date) { setLoading(false); return; }
      const normalizeDate = (d: string) => d?.split('T')[0] || d;
      const target = normalizeDate(params.date);

      // 1. Essayer le sleepService local (AsyncStorage - entrees manuelles)
      const entries = await getSleepEntriesByDate(params.date);
      if (entries.length > 0) {
        setEntry(entries[0]);
        // Still try to load vitals from HealthKit
        loadVitalsFromHealthKit(target);
        loadSleepDetailsFromHealthKit(target);
        return;
      }

      // 2. Essayer les données de demo/screenshot depuis AsyncStorage
      try {
        const sleepHistoryRaw = await AsyncStorage.getItem('@yoroi_sleep_history');
        if (sleepHistoryRaw) {
          const sleepHistory = JSON.parse(sleepHistoryRaw);
          if (!Array.isArray(sleepHistory)) return;
          const match = sleepHistory.find((s: any) => normalizeDate(s.date) === target);
          if (match) {
            const duration = match.duration || 0;
            const deepPct = match.deepSleepPercent || 25;
            const remPct = match.remSleepPercent || 22;
            const corePct = 100 - deepPct - remPct;
            const sleepMin = Math.round((deepPct / 100 * duration) + (remPct / 100 * duration) + (corePct / 100 * duration));
            const inBedMin = sleepMin + 15;
            const efficiency = inBedMin > 0 ? Math.round((sleepMin / inBedMin) * 100) : 0;
            setEntry({
              id: `demo_${target}`,
              date: target,
              bedTime: match.bedTime || '23:15',
              wakeTime: match.wakeTime || '07:00',
              duration,
              quality: match.quality || Math.min(5, Math.round((duration / 480) * 5)),
              phases: {
                deep: Math.round(deepPct / 100 * duration),
                rem: Math.round(remPct / 100 * duration),
                core: Math.round(corePct / 100 * duration),
                awake: 15,
              },
              efficiency,
              interruptions: Math.floor(Math.random() * 3) + 1,
              sleepHeartRate: { min: 48 + Math.floor(Math.random() * 8), max: 62 + Math.floor(Math.random() * 10), avg: 54 + Math.floor(Math.random() * 6) },
              respiratoryRate: { min: 12 + Math.floor(Math.random() * 2), max: 16 + Math.floor(Math.random() * 3) },
              wristTemperature: parseFloat((Math.random() * 1.2 - 0.4).toFixed(1)),
              source: 'healthkit',
            } as SleepEntry);
            setExtra({ efficiency, interruptions: 2, inBedMinutes: inBedMin });
            return;
          }
        }
      } catch {}

      // 3. Fallback : chercher dans HealthKit directement
      const targetDate = new Date(params.date);
      const now = new Date();
      const daysDiff = Math.max(7, Math.ceil((now.getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000)) + 3);

      const hkHistory = await healthConnect.getSleepHistory?.(daysDiff);
      if (Array.isArray(hkHistory) && hkHistory.length > 0) {
        const match = hkHistory.find((s: any) => normalizeDate(s.date) === target) as any;
        if (match) {
          const toLocalHHMM = (iso: string): string => {
            if (!iso) return '';
            try {
              const d = new Date(iso);
              return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            } catch { return ''; }
          };
          setEntry({
            id: `hk_${target}`,
            date: match.date,
            bedTime: toLocalHHMM(match.startTime),
            wakeTime: toLocalHHMM(match.endTime),
            duration: match.total || match.duration || 0,
            quality: Math.min(5, Math.round(((match.total || 0) / 480) * 5)),
            phases: {
              deep: match.deep || 0,
              rem: match.rem || 0,
              core: match.core || 0,
              awake: match.awake || 0,
            },
            source: 'healthkit',
          } as SleepEntry);
          // Load extra details and vitals from HealthKit
          loadVitalsFromHealthKit(target);
          loadSleepDetailsFromHealthKit(target);
        }
      }
    } catch (error) {
      logger.error('[SleepDetail] Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVitalsFromHealthKit = async (dateStr: string) => {
    try {
      if (typeof healthConnect.getSleepComparisonData !== 'function') return;
      const data = await healthConnect.getSleepComparisonData(7);
      if (data) {
        setVitals(data);
        // Also update entry vitals if not already set
        setEntry(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            sleepHeartRate: prev.sleepHeartRate || data.heartRate,
            respiratoryRate: prev.respiratoryRate || data.respiratoryRate,
            wristTemperature: prev.wristTemperature ?? data.wristTemperature?.value,
          };
        });
      }
    } catch (e) {
      logger.warn('[SleepDetail] Erreur vitals HealthKit:', e);
    }
  };

  const loadSleepDetailsFromHealthKit = async (dateStr: string) => {
    try {
      if (typeof healthConnect.getSleepDetails !== 'function') return;
      const targetDate = new Date(dateStr);
      const nextDay = new Date(dateStr);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(12, 0, 0, 0);
      targetDate.setHours(18, 0, 0, 0); // Start from 6 PM previous day

      const details = await healthConnect.getSleepDetails(targetDate, nextDay);
      if (details) {
        setExtra({
          efficiency: details.efficiency,
          interruptions: details.interruptions,
          inBedMinutes: details.stages?.inBed ? Math.round(details.stages.inBed * 60) : undefined,
          source: details.source,
        });
        // Update entry with efficiency/interruptions
        setEntry(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            efficiency: prev.efficiency ?? details.efficiency,
            interruptions: prev.interruptions ?? details.interruptions,
          };
        });
      }
    } catch (e) {
      logger.warn('[SleepDetail] Erreur details HealthKit:', e);
    }
  };

  // Couleurs nuit (needed before early returns)
  const nightMuted = '#7B8DB5';

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title={t('sleepDetail.title') || 'Détail Nuit'} showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={'#8B5CF6'} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!entry) {
    return (
      <ScreenWrapper>
        <Header title={t('sleepDetail.title') || 'Détail Nuit'} showBack />
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: nightMuted }]}>
            Aucune donnée pour cette nuit
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const qualityColor = getQualityColor(entry.quality);
  const hasPhases = entry.phases && (entry.phases.deep > 0 || entry.phases.rem > 0 || entry.phases.core > 0);
  const hasVitals = entry.sleepHeartRate || entry.respiratoryRate || entry.wristTemperature != null;
  const hasEfficiency = entry.efficiency != null || entry.interruptions != null || extra?.efficiency != null;

  // Compute sleep goal comparison
  const sleepGoalMin = 480; // 8h default
  const goalDiff = entry.duration - sleepGoalMin;
  const goalReached = goalDiff >= 0;

  // Compute in-bed time
  const inBedMinutes = extra?.inBedMinutes || (entry.phases
    ? entry.duration + (entry.phases.awake || 0)
    : entry.duration);

  const efficiency = entry.efficiency ?? extra?.efficiency ??
    (inBedMinutes > 0 ? Math.round((entry.duration / inBedMinutes) * 100) : null);
  const interruptions = entry.interruptions ?? extra?.interruptions;

  // Couleurs nuit
  const nightBg = '#0B1120';
  const nightCard = '#131D36';
  const nightText = '#E8ECF4';

  return (
    <ScreenWrapper noPadding containerStyle={{ backgroundColor: nightBg }}>
      <Header title={t('sleepDetail.title') || 'Détail Nuit'} showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARTE 1 - EN-TETE */}
        <View style={[styles.card, { backgroundColor: nightCard }]}>
          <View style={styles.headerRow}>
            <View style={[styles.moonBadge, { backgroundColor: '#5856D620' }]}>
              <Moon size={28} color="#5856D6" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.dateText, { color: nightText }]}>
                {formatDateFull(entry.date)}
              </Text>
              <View style={styles.qualityRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    size={16}
                    color={i <= entry.quality ? qualityColor : `${nightMuted}40`}
                    fill={i <= entry.quality ? qualityColor : 'transparent'}
                  />
                ))}
                <Text style={[styles.qualityLabel, { color: qualityColor }]}>
                  {getQualityLabel(entry.quality)}
                </Text>
              </View>
            </View>
            {entry.source === 'healthkit' && (
              <View style={[styles.sourceBadge, { backgroundColor: '#FF375F15' }]}>
                <Heart size={12} color="#FF375F" />
                <Text style={styles.sourceText}>Apple</Text>
              </View>
            )}
          </View>
        </View>

        {/* CARTE 2 - HORAIRES & DURÉE */}
        <View style={[styles.card, { backgroundColor: nightCard }]}>
          <View style={styles.timesRow}>
            <TimeBlock
              icon={<Bed size={20} color="#5856D6" />}
              label="Coucher"
              value={entry.bedTime}
              textColor={nightText}
              mutedColor={nightMuted}
            />
            <View style={styles.timeDivider}>
              <View style={[styles.timeLine, { backgroundColor: nightMuted + '30' }]} />
              <View style={[styles.durationBubble, { backgroundColor: '#5856D615' }]}>
                <Clock size={14} color="#5856D6" />
                <Text style={[styles.durationText, { color: '#5856D6' }]}>
                  {formatDuration(entry.duration)}
                </Text>
              </View>
              <View style={[styles.timeLine, { backgroundColor: nightMuted + '30' }]} />
            </View>
            <TimeBlock
              icon={<AlarmClock size={20} color="#F59E0B" />}
              label="Reveil"
              value={entry.wakeTime}
              textColor={nightText}
              mutedColor={nightMuted}
            />
          </View>
        </View>

        {/* CARTE 3 - PHASES DE SOMMEIL (visual bar + timeline) */}
        {hasPhases && entry.phases && (
          <View style={[styles.card, { backgroundColor: nightCard }]}>
            <Text style={[styles.sectionTitle, { color: nightText }]}>
              {t('sleepDetail.phases') || 'Phases de sommeil'}
            </Text>

            {/* Phase timeline bar (Apple Health style) */}
            <SleepPhasesTimeline
              phases={entry.phases}
              bedTime={entry.bedTime}
              wakeTime={entry.wakeTime}
              isDark={isDark}
              textColor={nightMuted}
            />

            {/* Segmented phases bar */}
            <View style={{ marginTop: 16 }}>
              <SleepPhasesBar
                phases={[
                  { type: 'deep' as const, duration: entry.phases.deep },
                  { type: 'light' as const, duration: entry.phases.core },
                  { type: 'rem' as const, duration: entry.phases.rem },
                  { type: 'awake' as const, duration: entry.phases.awake },
                ].filter(p => p.duration > 0)}
                height={40}
              />
            </View>

            {/* Detail des phases en grille */}
            <View style={styles.phasesGrid}>
              <PhaseItem
                label="Profond"
                minutes={entry.phases.deep}
                total={entry.duration}
                color={PHASE_COLORS.deep}
                textColor={nightText}
                mutedColor={nightMuted}
              />
              <PhaseItem
                label="Leger"
                minutes={entry.phases.core}
                total={entry.duration}
                color={PHASE_COLORS.core}
                textColor={nightText}
                mutedColor={nightMuted}
              />
              <PhaseItem
                label="REM"
                minutes={entry.phases.rem}
                total={entry.duration}
                color={PHASE_COLORS.rem}
                textColor={nightText}
                mutedColor={nightMuted}
              />
              <PhaseItem
                label="Eveils"
                minutes={entry.phases.awake}
                total={entry.duration + (entry.phases.awake || 0)}
                color={PHASE_COLORS.awake}
                textColor={nightText}
                mutedColor={nightMuted}
              />
            </View>
          </View>
        )}

        {/* CARTE 4 - VALEURS (Apple Health "Values" tab style) */}
        <View style={[styles.card, { backgroundColor: nightCard }]}>
          <Text style={[styles.sectionTitle, { color: nightText }]}>
            Valeurs
          </Text>
          <View style={[styles.valuesGrid, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            {/* Row 1: Durée sommeil + Temps au lit */}
            <View style={styles.valuesRow}>
              <ValueCell
                label="Sommeil effectif"
                value={formatDurationShort(entry.duration)}
                sub="Sans les éveils"
                subColor="#7B8DB5"
                color="#5856D6"
                isDark={isDark}
              />
              <ValueCell
                label="Temps au lit"
                value={formatDurationShort(inBedMinutes)}
                sub="Affiché par Apple Santé"
                subColor="#7B8DB5"
                color="#60A5FA"
                isDark={isDark}
                hasBorder
              />
            </View>
            <View style={[styles.valuesSep, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
            {/* Row 2: Objectif + Efficacité */}
            <View style={styles.valuesRow}>
              <ValueCell
                label="Objectif sommeil"
                value={formatDurationShort(sleepGoalMin)}
                sub={goalReached ? 'Atteint' : `${formatDurationShort(Math.abs(goalDiff))} manquant`}
                subColor={goalReached ? '#22C55E' : '#F59E0B'}
                color={goalReached ? '#22C55E' : '#F59E0B'}
                isDark={isDark}
              />
              <ValueCell
                label="Efficacité"
                value={efficiency != null ? `${efficiency}%` : '-'}
                color={efficiency != null ? getEfficiencyColor(efficiency) : nightMuted}
                isDark={isDark}
                hasBorder
              />
            </View>
            {interruptions != null && (
              <>
                <View style={[styles.valuesSep, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                <View style={styles.valuesRow}>
                  <ValueCell
                    label="Reveils nocturnes"
                    value={`${interruptions}`}
                    color={interruptions <= 2 ? '#22C55E' : interruptions <= 5 ? '#F59E0B' : '#EF4444'}
                    isDark={isDark}
                  />
                  <ValueCell
                    label="Source"
                    value={extra?.source || (entry.source === 'healthkit' ? 'Apple' : 'Manuel')}
                    color={nightMuted}
                    isDark={isDark}
                    hasBorder
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* CARTE 5 - COMPARAISONS / SIGNES VITAUX (Apple Health style) */}
        {hasVitals && (
          <View style={[styles.card, { backgroundColor: nightCard }]}>
            <Text style={[styles.sectionTitle, { color: nightText }]}>
              Comparaisons
            </Text>
            <View style={styles.vitalsGrid}>
              {entry.sleepHeartRate && (
                <VitalCardApple
                  icon={<Heart size={20} color="#EF4444" />}
                  label="Fréquence cardiaque"
                  mainValue={`${entry.sleepHeartRate.avg}`}
                  mainUnit="bpm"
                  mainLabel="Moyenne"
                  details={[
                    { label: 'Min', value: `${entry.sleepHeartRate.min}`, color: '#3B82F6' },
                    { label: 'Max', value: `${entry.sleepHeartRate.max}`, color: '#EF4444' },
                  ]}
                  accentColor="#EF4444"
                  textColor={nightText}
                  mutedColor={nightMuted}
                  isDark={isDark}
                />
              )}
              {entry.respiratoryRate && (
                <VitalCardApple
                  icon={<Wind size={20} color="#06B6D4" />}
                  label="Fréquence respiratoire"
                  mainValue={typeof entry.respiratoryRate === 'object' && 'avg' in entry.respiratoryRate
                    ? `${(entry.respiratoryRate as any).avg}`
                    : `${entry.respiratoryRate.min}-${entry.respiratoryRate.max}`}
                  mainUnit="resp/min"
                  mainLabel={typeof entry.respiratoryRate === 'object' && 'avg' in entry.respiratoryRate ? 'Moyenne' : 'Plage'}
                  details={[
                    { label: 'Min', value: `${entry.respiratoryRate.min}`, color: '#3B82F6' },
                    { label: 'Max', value: `${entry.respiratoryRate.max}`, color: '#F97316' },
                  ]}
                  accentColor="#06B6D4"
                  textColor={nightText}
                  mutedColor={nightMuted}
                  isDark={isDark}
                />
              )}
              {entry.wristTemperature != null && (
                <VitalCardApple
                  icon={<Thermometer size={20} color="#F59E0B" />}
                  label="Temperature au poignet"
                  mainValue={entry.wristTemperature > 0
                    ? `+${entry.wristTemperature.toFixed(1)}`
                    : entry.wristTemperature.toFixed(1)}
                  mainUnit="°C"
                  mainLabel="vs baseline"
                  accentColor="#F59E0B"
                  textColor={nightText}
                  mutedColor={nightMuted}
                  isDark={isDark}
                />
              )}
            </View>
          </View>
        )}

        {/* CARTE 6 - NOTES */}
        {entry.notes && (
          <View style={[styles.card, { backgroundColor: nightCard }]}>
            <Text style={[styles.sectionTitle, { color: nightText }]}>
              Notes
            </Text>
            <Text style={[styles.notesText, { color: nightMuted }]}>
              {entry.notes}
            </Text>
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

const TimeBlock: React.FC<{
  icon: React.ReactNode; label: string; value: string;
  textColor: string; mutedColor: string;
}> = ({ icon, label, value, textColor, mutedColor }) => (
  <View style={styles.timeBlock}>
    {icon}
    <Text style={[styles.timeValue, { color: textColor }]}>{value || '--:--'}</Text>
    <Text style={[styles.timeLabel, { color: mutedColor }]}>{label}</Text>
  </View>
);

const PhaseItem: React.FC<{
  label: string; minutes: number; total: number; color: string;
  textColor: string; mutedColor: string;
}> = ({ label, minutes, total, color, textColor, mutedColor }) => {
  const pct = total > 0 ? Math.round((minutes / total) * 100) : 0;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return (
    <View style={styles.phaseItem}>
      <View style={[styles.phaseDot, { backgroundColor: color }]} />
      <Text style={[styles.phaseLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.phaseTime, { color: textColor }]}>{timeStr}</Text>
      <Text style={[styles.phasePct, { color: mutedColor }]}>{pct}%</Text>
    </View>
  );
};

// Sleep phases timeline - vertical bars like Apple Health
const SleepPhasesTimeline: React.FC<{
  phases: { deep: number; rem: number; core: number; awake: number };
  bedTime: string;
  wakeTime: string;
  isDark: boolean;
  textColor: string;
}> = ({ phases, bedTime, wakeTime, isDark, textColor }) => {
  const chartWidth = SCREEN_WIDTH - 64;
  const chartHeight = 80;
  const totalMin = phases.deep + phases.rem + phases.core + phases.awake;
  if (totalMin <= 0) return null;

  // Generate simulated timeline blocks
  // In reality, HealthKit gives per-sample phases, but we simulate a plausible pattern
  const blocks: { type: string; startPct: number; widthPct: number }[] = [];
  const cycleCount = Math.max(2, Math.round(totalMin / 90)); // ~90 min sleep cycles

  // Build a realistic sleep cycle pattern
  let pos = 0;
  for (let c = 0; c < cycleCount; c++) {
    const cycleLen = totalMin / cycleCount;
    const isFirst = c === 0;
    const isLast = c === cycleCount - 1;

    // Each cycle: light -> deep -> light -> REM (with occasional awake)
    const segments = [
      { type: 'core', pct: isFirst ? 0.15 : 0.10 },
      { type: 'deep', pct: isFirst ? 0.35 : (isLast ? 0.10 : 0.25) },
      { type: 'core', pct: 0.20 },
      { type: 'rem', pct: isLast ? 0.40 : (isFirst ? 0.15 : 0.25) },
    ];

    // Add small awake between cycles
    if (c > 0) {
      blocks.push({
        type: 'awake',
        startPct: (pos / totalMin) * 100,
        widthPct: (3 / totalMin) * 100, // ~3 min awake
      });
      pos += 3;
    }

    for (const seg of segments) {
      const dur = cycleLen * seg.pct;
      blocks.push({
        type: seg.type,
        startPct: (pos / totalMin) * 100,
        widthPct: (dur / totalMin) * 100,
      });
      pos += dur;
    }
  }

  // Phase depth mapping (y position)
  const phaseY: Record<string, number> = {
    awake: 0,
    rem: 18,
    core: 40,
    deep: 60,
  };

  const phaseHeight: Record<string, number> = {
    awake: 14,
    rem: 16,
    core: 16,
    deep: 20,
  };

  return (
    <View style={styles.timelineContainer}>
      {/* Y-axis labels */}
      <View style={styles.timelineYLabels}>
        <Text style={[styles.timelineYLabel, { color: textColor }]}>Eveille</Text>
        <Text style={[styles.timelineYLabel, { color: textColor }]}>REM</Text>
        <Text style={[styles.timelineYLabel, { color: textColor }]}>Leger</Text>
        <Text style={[styles.timelineYLabel, { color: textColor }]}>Profond</Text>
      </View>

      {/* Chart area */}
      <View style={[styles.timelineChart, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
        <Svg width={chartWidth - 50} height={chartHeight}>
          {blocks.map((block, i) => {
            const x = (block.startPct / 100) * (chartWidth - 50);
            const w = Math.max(1, (block.widthPct / 100) * (chartWidth - 50));
            const y = phaseY[block.type] ?? 40;
            const h = phaseHeight[block.type] ?? 16;
            const color = PHASE_COLORS[block.type as keyof typeof PHASE_COLORS] || PHASE_COLORS.core;
            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={w}
                height={h}
                fill={color}
                rx={2}
              />
            );
          })}
        </Svg>
      </View>

      {/* Time labels */}
      <View style={styles.timelineTimeRow}>
        <View style={{ width: 50 }} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[styles.timelineTime, { color: textColor }]}>{bedTime || ''}</Text>
          <Text style={[styles.timelineTime, { color: textColor }]}>{wakeTime || ''}</Text>
        </View>
      </View>
    </View>
  );
};

// Value cell for the "Values" grid (Apple Health style)
const ValueCell: React.FC<{
  label: string;
  value: string;
  color: string;
  sub?: string;
  subColor?: string;
  isDark: boolean;
  hasBorder?: boolean;
}> = ({ label, value, color, sub, subColor, isDark, hasBorder }) => (
  <View style={[
    styles.valueCell,
    hasBorder && { borderLeftWidth: 1, borderLeftColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
  ]}>
    <Text style={[styles.valueCellLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }]}>{label}</Text>
    <Text style={[styles.valueCellValue, { color }]}>{value}</Text>
    {sub && <Text style={[styles.valueCellSub, { color: subColor || color }]}>{sub}</Text>}
  </View>
);

// Apple Health style vital card with main value and details
const VitalCardApple: React.FC<{
  icon: React.ReactNode;
  label: string;
  mainValue: string;
  mainUnit: string;
  mainLabel: string;
  details?: { label: string; value: string; color: string }[];
  accentColor: string;
  textColor: string;
  mutedColor: string;
  isDark: boolean;
}> = ({ icon, label, mainValue, mainUnit, mainLabel, details, accentColor, textColor, mutedColor, isDark }) => (
  <View style={[styles.vitalCardApple, { backgroundColor: isDark ? `${accentColor}10` : `${accentColor}08` }]}>
    <View style={styles.vitalCardHeader}>
      {icon}
      <Text style={[styles.vitalCardTitle, { color: textColor }]}>{label}</Text>
    </View>
    <View style={styles.vitalCardBody}>
      <View style={styles.vitalCardMain}>
        <Text style={[styles.vitalCardMainValue, { color: accentColor }]}>
          {mainValue}
        </Text>
        <Text style={[styles.vitalCardMainUnit, { color: mutedColor }]}>{mainUnit}</Text>
        <Text style={[styles.vitalCardMainLabel, { color: mutedColor }]}>{mainLabel}</Text>
      </View>
      {details && details.length > 0 && (
        <View style={styles.vitalCardDetails}>
          {details.map((d, i) => (
            <View key={i} style={styles.vitalCardDetailItem}>
              <View style={[styles.vitalCardDetailDot, { backgroundColor: d.color }]} />
              <Text style={[styles.vitalCardDetailLabel, { color: mutedColor }]}>{d.label}</Text>
              <Text style={[styles.vitalCardDetailValue, { color: textColor }]}>{d.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  </View>
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },

  card: {
    borderRadius: 20, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moonBadge: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  dateText: { fontSize: 15, fontWeight: '600' },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  qualityLabel: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  sourceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  sourceText: { fontSize: 10, fontWeight: '700', color: '#FF375F' },

  // Times
  timesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeBlock: { alignItems: 'center', gap: 4, width: 80 },
  timeValue: { fontSize: 24, fontWeight: '700' },
  timeLabel: { fontSize: 12, fontWeight: '500' },
  timeDivider: { flex: 1, alignItems: 'center', gap: 4 },
  timeLine: { width: 1, height: 16 },
  durationBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  durationText: { fontSize: 14, fontWeight: '700' },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Phases grid
  phasesGrid: { marginTop: 12, gap: 10 },
  phaseItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phaseDot: { width: 10, height: 10, borderRadius: 5 },
  phaseLabel: { fontSize: 14, fontWeight: '500', width: 70 },
  phaseTime: { fontSize: 14, fontWeight: '700', flex: 1 },
  phasePct: { fontSize: 13, width: 35, textAlign: 'right' },

  // Timeline
  timelineContainer: { marginBottom: 8 },
  timelineYLabels: {
    position: 'absolute', left: 0, top: 0, width: 48,
    height: 80, justifyContent: 'space-between', zIndex: 1,
  },
  timelineYLabel: { fontSize: 10, fontWeight: '500' },
  timelineChart: {
    marginLeft: 50, borderRadius: 8, padding: 0, overflow: 'hidden',
  },
  timelineTimeRow: { flexDirection: 'row', marginTop: 4 },
  timelineTime: { fontSize: 11, fontWeight: '500' },

  // Values grid (Apple Health style)
  valuesGrid: { borderRadius: 14, overflow: 'hidden' },
  valuesRow: { flexDirection: 'row' },
  valuesSep: { height: 1, marginHorizontal: 14 },
  valueCell: { flex: 1, paddingVertical: 12, paddingHorizontal: 14 },
  valueCellLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  valueCellValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  valueCellSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Vitals (Apple Health comparison style)
  vitalsGrid: { gap: 12 },
  vitalCardApple: {
    borderRadius: 16, padding: 16,
  },
  vitalCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  vitalCardTitle: { fontSize: 15, fontWeight: '700' },
  vitalCardBody: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  vitalCardMain: { flex: 1 },
  vitalCardMainValue: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  vitalCardMainUnit: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  vitalCardMainLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  vitalCardDetails: { alignItems: 'flex-end', gap: 6 },
  vitalCardDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vitalCardDetailDot: { width: 8, height: 8, borderRadius: 4 },
  vitalCardDetailLabel: { fontSize: 12, fontWeight: '500' },
  vitalCardDetailValue: { fontSize: 15, fontWeight: '700' },

  // Notes
  notesText: { fontSize: 14, lineHeight: 20 },
});
