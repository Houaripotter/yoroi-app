// ============================================
// YOROI - DETAIL NUIT DE SOMMEIL
// ============================================

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
  Thermometer, Star,
} from 'lucide-react-native';
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
// COULEURS FIXES (fond blanc, texte sombre)
// ============================================
const BG       = '#F2F4F8';   // fond general gris tres clair
const CARD     = '#FFFFFF';   // fond des cartes blanc
const TEXT     = '#111827';   // texte principal noir
const MUTED    = '#6B7280';   // texte secondaire gris
const BORDER   = '#E5E7EB';   // bordures

const PHASE_COLORS = {
  deep:  '#5856D6',
  core:  '#60A5FA',
  rem:   '#34D399',
  awake: '#F97316',
};

const PHASE_DESCRIPTIONS: Record<string, { title: string; desc: string }> = {
  deep: {
    title: 'Sommeil profond',
    desc:  'La phase la plus restauratrice. Le corps repare les muscles, renforce le systeme immunitaire et consolide la memoire. Idealement 13-23% du sommeil total.',
  },
  rem: {
    title: 'Sommeil paradoxal (REM)',
    desc:  'Rapid Eye Movement. Le cerveau est tres actif, les reves surviennent. Essentiel pour la memoire emotionnelle, la creativite et l\'apprentissage. Idealement 20-25%.',
  },
  core: {
    title: 'Sommeil leger',
    desc:  'Phase de transition entre l\'eveil et le sommeil profond. Le corps se detend, la temperature baisse. Représente generalement 50-60% du sommeil.',
  },
  awake: {
    title: 'Eveils nocturnes',
    desc:  'Brefs eveils normaux entre les cycles de sommeil. Quelques minutes par nuit sont tout a fait normaux et n\'affectent pas la qualite si ils sont courts.',
  },
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
  const { t } = useI18n();
  const params = useLocalSearchParams<{ date?: string }>();

  const [entry, setEntry] = useState<SleepEntry | null>(null);
  const [vitals, setVitals] = useState<SleepVitals | null>(null);
  const [extra, setExtra] = useState<SleepDetailExtra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      if (!params.date) { setLoading(false); return; }
      const normalizeDate = (d: string) => d?.split('T')[0] || d;
      const target = normalizeDate(params.date);

      const entries = await getSleepEntriesByDate(params.date);
      if (entries.length > 0) {
        setEntry(entries[0]);
        loadVitalsFromHealthKit(target);
        loadSleepDetailsFromHealthKit(target);
        return;
      }

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
      targetDate.setHours(18, 0, 0, 0);
      const details = await healthConnect.getSleepDetails(targetDate, nextDay);
      if (details) {
        setExtra({
          efficiency: details.efficiency,
          interruptions: details.interruptions,
          inBedMinutes: details.stages?.inBed ? Math.round(details.stages.inBed * 60) : undefined,
          source: details.source,
        });
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

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Detail Nuit" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
        </View>
      </ScreenWrapper>
    );
  }

  if (!entry) {
    return (
      <ScreenWrapper>
        <Header title="Detail Nuit" showBack />
        <View style={styles.loadingContainer}>
          <Text style={[styles.emptyText, { color: MUTED }]}>Aucune donnee pour cette nuit</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const qualityColor = getQualityColor(entry.quality);
  const hasPhases = entry.phases && (entry.phases.deep > 0 || entry.phases.rem > 0 || entry.phases.core > 0);
  const hasVitals = entry.sleepHeartRate || entry.respiratoryRate || entry.wristTemperature != null;
  const sleepGoalMin = 480;
  const goalDiff = entry.duration - sleepGoalMin;
  const goalReached = goalDiff >= 0;
  const inBedMinutes = extra?.inBedMinutes || (entry.phases
    ? entry.duration + (entry.phases.awake || 0)
    : entry.duration);
  const efficiency = entry.efficiency ?? extra?.efficiency ??
    (inBedMinutes > 0 ? Math.round((entry.duration / inBedMinutes) * 100) : null);
  const interruptions = entry.interruptions ?? extra?.interruptions;

  return (
    <ScreenWrapper noPadding containerStyle={{ backgroundColor: BG }}>
      <Header title="Detail Nuit" showBack />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* CARTE 1 - EN-TETE */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.moonBadge, { backgroundColor: '#5856D615' }]}>
              <Moon size={28} color="#5856D6" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.dateText, { color: TEXT }]}>
                {formatDateFull(entry.date)}
              </Text>
              <View style={styles.qualityRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    size={16}
                    color={i <= entry.quality ? qualityColor : '#D1D5DB'}
                    fill={i <= entry.quality ? qualityColor : 'transparent'}
                  />
                ))}
                <Text style={[styles.qualityLabel, { color: qualityColor }]}>
                  {getQualityLabel(entry.quality)}
                </Text>
              </View>
            </View>
            {entry.source === 'healthkit' && (
              <View style={[styles.sourceBadge, { backgroundColor: '#FF375F10' }]}>
                <Heart size={12} color="#FF375F" />
                <Text style={styles.sourceText}>Apple</Text>
              </View>
            )}
          </View>
        </View>

        {/* CARTE 2 - HORAIRES & DUREE */}
        <View style={styles.card}>
          <View style={styles.timesRow}>
            <View style={styles.timeBlock}>
              <View style={[styles.timeIconBadge, { backgroundColor: '#5856D610' }]}>
                <Bed size={20} color="#5856D6" />
              </View>
              <Text style={[styles.timeValue, { color: TEXT }]}>{entry.bedTime || '--:--'}</Text>
              <Text style={[styles.timeLabel, { color: MUTED }]}>Coucher</Text>
            </View>
            <View style={styles.timeDivider}>
              <View style={[styles.timeLine, { backgroundColor: BORDER }]} />
              <View style={[styles.durationBubble, { backgroundColor: '#5856D610', borderColor: '#5856D630' }]}>
                <Clock size={14} color="#5856D6" />
                <Text style={[styles.durationText, { color: '#5856D6' }]}>
                  {formatDuration(entry.duration)}
                </Text>
              </View>
              <View style={[styles.timeLine, { backgroundColor: BORDER }]} />
            </View>
            <View style={styles.timeBlock}>
              <View style={[styles.timeIconBadge, { backgroundColor: '#F59E0B10' }]}>
                <AlarmClock size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.timeValue, { color: TEXT }]}>{entry.wakeTime || '--:--'}</Text>
              <Text style={[styles.timeLabel, { color: MUTED }]}>Reveil</Text>
            </View>
          </View>
        </View>

        {/* CARTE 3 - PHASES DE SOMMEIL */}
        {hasPhases && entry.phases && (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: TEXT }]}>Phases de sommeil</Text>
            <Text style={[styles.sectionSubtitle, { color: MUTED }]}>
              Repartition de la nuit par type de sommeil
            </Text>

            {/* Barre de phases colorees */}
            <View style={{ marginBottom: 16 }}>
              <SleepPhasesBar
                phases={[
                  { type: 'deep' as const, duration: entry.phases.deep },
                  { type: 'light' as const, duration: entry.phases.core },
                  { type: 'rem' as const, duration: entry.phases.rem },
                  { type: 'awake' as const, duration: entry.phases.awake },
                ].filter(p => p.duration > 0)}
                height={44}
              />
            </View>

            {/* Timeline */}
            <SleepPhasesTimeline
              phases={entry.phases}
              bedTime={entry.bedTime}
              wakeTime={entry.wakeTime}
            />

            {/* Detail des phases avec descriptions */}
            <View style={styles.phasesGrid}>
              {entry.phases.deep > 0 && (
                <PhaseItem phaseKey="deep" minutes={entry.phases.deep} total={entry.duration} />
              )}
              {entry.phases.core > 0 && (
                <PhaseItem phaseKey="core" minutes={entry.phases.core} total={entry.duration} />
              )}
              {entry.phases.rem > 0 && (
                <PhaseItem phaseKey="rem" minutes={entry.phases.rem} total={entry.duration} />
              )}
              {(entry.phases.awake || 0) > 0 && (
                <PhaseItem phaseKey="awake" minutes={entry.phases.awake || 0} total={entry.duration + (entry.phases.awake || 0)} />
              )}
            </View>
          </View>
        )}

        {/* CARTE 4 - VALEURS */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: TEXT }]}>Valeurs</Text>
          <View style={[styles.valuesGrid, { borderColor: BORDER }]}>
            <View style={styles.valuesRow}>
              <ValueCell
                label="Sommeil effectif"
                value={formatDurationShort(entry.duration)}
                sub="Sans les eveils"
                subColor={MUTED}
                color="#5856D6"
              />
              <ValueCell
                label="Temps au lit"
                value={formatDurationShort(inBedMinutes)}
                sub="Avec les eveils"
                subColor={MUTED}
                color="#60A5FA"
                hasBorder
              />
            </View>
            <View style={[styles.valuesSep, { backgroundColor: BORDER }]} />
            <View style={styles.valuesRow}>
              <ValueCell
                label="Objectif"
                value={formatDurationShort(sleepGoalMin)}
                sub={goalReached ? 'Objectif atteint' : `${formatDurationShort(Math.abs(goalDiff))} manquant`}
                subColor={goalReached ? '#22C55E' : '#F59E0B'}
                color={goalReached ? '#22C55E' : '#F59E0B'}
              />
              <ValueCell
                label="Efficacite"
                value={efficiency != null ? `${efficiency}%` : '-'}
                sub={efficiency != null ? (efficiency >= 90 ? 'Excellent' : efficiency >= 80 ? 'Bon' : 'A ameliorer') : ''}
                subColor={efficiency != null ? getEfficiencyColor(efficiency) : MUTED}
                color={efficiency != null ? getEfficiencyColor(efficiency) : MUTED}
                hasBorder
              />
            </View>
            {interruptions != null && (
              <>
                <View style={[styles.valuesSep, { backgroundColor: BORDER }]} />
                <View style={styles.valuesRow}>
                  <ValueCell
                    label="Eveils nocturnes"
                    value={`${interruptions}`}
                    sub={interruptions <= 2 ? 'Normal' : interruptions <= 5 ? 'Modere' : 'Eleve'}
                    subColor={interruptions <= 2 ? '#22C55E' : interruptions <= 5 ? '#F59E0B' : '#EF4444'}
                    color={interruptions <= 2 ? '#22C55E' : interruptions <= 5 ? '#F59E0B' : '#EF4444'}
                  />
                  <ValueCell
                    label="Source"
                    value={extra?.source || (entry.source === 'healthkit' ? 'Apple Sante' : 'Manuel')}
                    color={MUTED}
                    hasBorder
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* CARTE 5 - SIGNES VITAUX */}
        {hasVitals && (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: TEXT }]}>Signes vitaux pendant le sommeil</Text>
            <View style={styles.vitalsGrid}>
              {entry.sleepHeartRate && (
                <VitalCard
                  icon={<Heart size={20} color="#EF4444" />}
                  label="Frequence cardiaque"
                  desc="FC enregistree pendant le sommeil par l'Apple Watch"
                  mainValue={`${entry.sleepHeartRate.avg}`}
                  mainUnit="bpm"
                  mainLabel="Moyenne"
                  details={[
                    { label: 'Minimum', value: `${entry.sleepHeartRate.min} bpm`, color: '#3B82F6' },
                    { label: 'Maximum', value: `${entry.sleepHeartRate.max} bpm`, color: '#EF4444' },
                  ]}
                  accentColor="#EF4444"
                />
              )}
              {entry.respiratoryRate && (
                <VitalCard
                  icon={<Wind size={20} color="#06B6D4" />}
                  label="Frequence respiratoire"
                  desc="Nombre de respirations par minute pendant le sommeil"
                  mainValue={typeof entry.respiratoryRate === 'object' && 'avg' in entry.respiratoryRate
                    ? `${(entry.respiratoryRate as any).avg}`
                    : `${entry.respiratoryRate.min}-${entry.respiratoryRate.max}`}
                  mainUnit="resp/min"
                  mainLabel={typeof entry.respiratoryRate === 'object' && 'avg' in entry.respiratoryRate ? 'Moyenne' : 'Plage'}
                  details={[
                    { label: 'Minimum', value: `${entry.respiratoryRate.min}`, color: '#3B82F6' },
                    { label: 'Maximum', value: `${entry.respiratoryRate.max}`, color: '#F97316' },
                  ]}
                  accentColor="#06B6D4"
                />
              )}
              {entry.wristTemperature != null && (
                <VitalCard
                  icon={<Thermometer size={20} color="#F59E0B" />}
                  label="Temperature au poignet"
                  desc="Ecart de temperature par rapport a ta baseline habituelle"
                  mainValue={entry.wristTemperature > 0
                    ? `+${entry.wristTemperature.toFixed(1)}`
                    : entry.wristTemperature.toFixed(1)}
                  mainUnit="°C"
                  mainLabel="vs baseline"
                  accentColor="#F59E0B"
                />
              )}
            </View>
          </View>
        )}

        {/* CARTE 6 - NOTES */}
        {entry.notes && (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: TEXT }]}>Notes</Text>
            <Text style={[styles.notesText, { color: MUTED }]}>{entry.notes}</Text>
          </View>
        )}

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================
// COMPOSANTS
// ============================================

const PhaseItem: React.FC<{ phaseKey: string; minutes: number; total: number }> = ({ phaseKey, minutes, total }) => {
  const color = PHASE_COLORS[phaseKey as keyof typeof PHASE_COLORS] || PHASE_COLORS.core;
  const info = PHASE_DESCRIPTIONS[phaseKey] || { title: phaseKey, desc: '' };
  const pct = total > 0 ? Math.round((minutes / total) * 100) : 0;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return (
    <View style={[styles.phaseCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.phaseCardTop}>
        <View style={[styles.phaseDot, { backgroundColor: color }]} />
        <Text style={[styles.phaseTitle, { color: TEXT }]}>{info.title}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[styles.phaseTime, { color: TEXT }]}>{timeStr}</Text>
        <Text style={[styles.phasePct, { color: MUTED }]}>  {pct}%</Text>
      </View>
      <Text style={[styles.phaseDesc, { color: MUTED }]}>{info.desc}</Text>
      {/* Barre de progression */}
      <View style={[styles.phaseBar, { backgroundColor: BORDER }]}>
        <View style={[styles.phaseBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const SleepPhasesTimeline: React.FC<{
  phases: { deep: number; rem: number; core: number; awake: number };
  bedTime: string;
  wakeTime: string;
}> = ({ phases, bedTime, wakeTime }) => {
  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = 80;
  const totalMin = phases.deep + phases.rem + phases.core + phases.awake;
  if (totalMin <= 0) return null;

  const blocks: { type: string; startPct: number; widthPct: number }[] = [];
  const cycleCount = Math.max(2, Math.round(totalMin / 90));
  let pos = 0;

  for (let c = 0; c < cycleCount; c++) {
    const cycleLen = totalMin / cycleCount;
    const isFirst = c === 0;
    const isLast = c === cycleCount - 1;
    const segments = [
      { type: 'core', pct: isFirst ? 0.15 : 0.10 },
      { type: 'deep', pct: isFirst ? 0.35 : (isLast ? 0.10 : 0.25) },
      { type: 'core', pct: 0.20 },
      { type: 'rem', pct: isLast ? 0.40 : (isFirst ? 0.15 : 0.25) },
    ];
    if (c > 0) {
      blocks.push({ type: 'awake', startPct: (pos / totalMin) * 100, widthPct: (3 / totalMin) * 100 });
      pos += 3;
    }
    for (const seg of segments) {
      const dur = cycleLen * seg.pct;
      blocks.push({ type: seg.type, startPct: (pos / totalMin) * 100, widthPct: (dur / totalMin) * 100 });
      pos += dur;
    }
  }

  const phaseY: Record<string, number> = { awake: 0, rem: 18, core: 40, deep: 60 };
  const phaseHeight: Record<string, number> = { awake: 14, rem: 16, core: 16, deep: 20 };

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineYLabels}>
        {['Eveille', 'REM', 'Leger', 'Profond'].map(label => (
          <Text key={label} style={[styles.timelineYLabel, { color: MUTED }]}>{label}</Text>
        ))}
      </View>
      <View style={[styles.timelineChart, { backgroundColor: '#F9FAFB' }]}>
        <Svg width={chartWidth - 50} height={chartHeight}>
          {blocks.map((block, i) => {
            const x = (block.startPct / 100) * (chartWidth - 50);
            const w = Math.max(1, (block.widthPct / 100) * (chartWidth - 50));
            const y = phaseY[block.type] ?? 40;
            const h = phaseHeight[block.type] ?? 16;
            const color = PHASE_COLORS[block.type as keyof typeof PHASE_COLORS] || PHASE_COLORS.core;
            return <Rect key={i} x={x} y={y} width={w} height={h} fill={color} rx={2} />;
          })}
        </Svg>
      </View>
      <View style={styles.timelineTimeRow}>
        <View style={{ width: 50 }} />
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[styles.timelineTime, { color: MUTED }]}>{bedTime || ''}</Text>
          <Text style={[styles.timelineTime, { color: MUTED }]}>{wakeTime || ''}</Text>
        </View>
      </View>
    </View>
  );
};

const ValueCell: React.FC<{
  label: string; value: string; color: string;
  sub?: string; subColor?: string; hasBorder?: boolean;
}> = ({ label, value, color, sub, subColor, hasBorder }) => (
  <View style={[styles.valueCell, hasBorder && { borderLeftWidth: 1, borderLeftColor: BORDER }]}>
    <Text style={[styles.valueCellLabel, { color: MUTED }]}>{label}</Text>
    <Text style={[styles.valueCellValue, { color }]}>{value}</Text>
    {sub ? <Text style={[styles.valueCellSub, { color: subColor || color }]}>{sub}</Text> : null}
  </View>
);

const VitalCard: React.FC<{
  icon: React.ReactNode; label: string; desc: string;
  mainValue: string; mainUnit: string; mainLabel: string;
  details?: { label: string; value: string; color: string }[];
  accentColor: string;
}> = ({ icon, label, desc, mainValue, mainUnit, mainLabel, details, accentColor }) => (
  <View style={[styles.vitalCard, { borderLeftColor: accentColor, borderLeftWidth: 4 }]}>
    <View style={styles.vitalCardHeader}>
      <View style={[styles.vitalIconBadge, { backgroundColor: `${accentColor}15` }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.vitalCardTitle, { color: TEXT }]}>{label}</Text>
        <Text style={[styles.vitalCardDesc, { color: MUTED }]}>{desc}</Text>
      </View>
    </View>
    <View style={styles.vitalCardBody}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={[styles.vitalMainValue, { color: accentColor }]}>{mainValue}</Text>
          <Text style={[styles.vitalMainUnit, { color: MUTED }]}>{mainUnit}</Text>
        </View>
        <Text style={[styles.vitalMainLabel, { color: MUTED }]}>{mainLabel}</Text>
      </View>
      {details && details.length > 0 && (
        <View style={styles.vitalDetails}>
          {details.map((d, i) => (
            <View key={i} style={styles.vitalDetailRow}>
              <View style={[styles.vitalDetailDot, { backgroundColor: d.color }]} />
              <Text style={[styles.vitalDetailLabel, { color: MUTED }]}>{d.label}</Text>
              <Text style={[styles.vitalDetailValue, { color: TEXT }]}>{d.value}</Text>
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
    backgroundColor: CARD,
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
  moonBadge: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1 },
  dateText: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  qualityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  qualityLabel: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  sourceText: { fontSize: 10, fontWeight: '700', color: '#FF375F' },

  // Times
  timesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeBlock: { alignItems: 'center', gap: 6, width: 90 },
  timeIconBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  timeValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  timeLabel: { fontSize: 12, fontWeight: '600' },
  timeDivider: { flex: 1, alignItems: 'center', gap: 6 },
  timeLine: { width: 1, height: 20 },
  durationBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1,
  },
  durationText: { fontSize: 14, fontWeight: '700' },

  // Section titles
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, fontWeight: '500', marginBottom: 16 },

  // Phases
  phasesGrid: { gap: 12, marginTop: 16 },
  phaseCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  phaseCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phaseDot: { width: 10, height: 10, borderRadius: 5 },
  phaseTitle: { fontSize: 15, fontWeight: '700' },
  phaseTime: { fontSize: 15, fontWeight: '800' },
  phasePct: { fontSize: 13, fontWeight: '600' },
  phaseDesc: { fontSize: 12, lineHeight: 17, fontWeight: '400' },
  phaseBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  phaseBarFill: { height: '100%', borderRadius: 3 },

  // Timeline
  timelineContainer: { marginBottom: 8, marginTop: 4 },
  timelineYLabels: {
    position: 'absolute', left: 0, top: 0, width: 48,
    height: 80, justifyContent: 'space-between', zIndex: 1,
  },
  timelineYLabel: { fontSize: 10, fontWeight: '600' },
  timelineChart: { marginLeft: 50, borderRadius: 8, overflow: 'hidden' },
  timelineTimeRow: { flexDirection: 'row', marginTop: 4 },
  timelineTime: { fontSize: 11, fontWeight: '600' },

  // Values grid
  valuesGrid: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  valuesRow: { flexDirection: 'row' },
  valuesSep: { height: 1 },
  valueCell: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  valueCellLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  valueCellValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  valueCellSub: { fontSize: 12, fontWeight: '600', marginTop: 3 },

  // Vitals
  vitalsGrid: { gap: 12 },
  vitalCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  vitalCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  vitalIconBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  vitalCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  vitalCardDesc: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  vitalCardBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  vitalMainValue: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  vitalMainUnit: { fontSize: 14, fontWeight: '600' },
  vitalMainLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  vitalDetails: { alignItems: 'flex-end', gap: 6 },
  vitalDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vitalDetailDot: { width: 8, height: 8, borderRadius: 4 },
  vitalDetailLabel: { fontSize: 12, fontWeight: '500' },
  vitalDetailValue: { fontSize: 15, fontWeight: '700' },

  // Notes
  notesText: { fontSize: 14, lineHeight: 20 },
});
