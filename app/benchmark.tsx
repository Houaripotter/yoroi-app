// ============================================
// YOROI - BENCHMARK VS PAIRS
// ============================================
// Comparaison anonymisée de tes stats vs
// moyennes de référence par ceinture/niveau
// (données locales, 100% offline)
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { ChevronLeft, TrendingUp, TrendingDown, Minus, ChevronDown, Award } from 'lucide-react-native';
import { useI18n } from '@/lib/I18nContext';
import { PremiumTeaser } from '@/components/premium/PremiumTeaser';
import { PremiumGate } from '@/components/premium/PremiumGate';

// ============================================
// RÉFÉRENTIELS PAR NIVEAU
// ============================================

interface LevelBenchmark {
  id: string;
  label: string;
  color: string;
  sport: string;
  // Stats moyennes de référence (estimations communautaires BJJ/Grappling)
  sessionsPerWeek: number;       // séances/semaine
  avgDurationMin: number;        // durée moyenne (min)
  sparringRoundsPerSession: number; // rounds sparring/séance
  drillingRatio: number;         // % séances drilling
  consistencyPct: number;        // % semaines actives sur 3 mois
  subRatioGivenTaken: number;    // ratio soumissions placées/subies (>1 = dominant)
  yearlySessionCount: number;    // séances/an
}

const BENCHMARKS: LevelBenchmark[] = [
  {
    id: 'bjj_white', label: 'Ceinture blanche', color: '#E5E7EB', sport: 'BJJ',
    sessionsPerWeek: 2, avgDurationMin: 70, sparringRoundsPerSession: 3,
    drillingRatio: 60, consistencyPct: 55, subRatioGivenTaken: 0.4, yearlySessionCount: 80,
  },
  {
    id: 'bjj_blue', label: 'Ceinture bleue', color: '#3B82F6', sport: 'BJJ',
    sessionsPerWeek: 3, avgDurationMin: 75, sparringRoundsPerSession: 5,
    drillingRatio: 50, consistencyPct: 65, subRatioGivenTaken: 0.8, yearlySessionCount: 130,
  },
  {
    id: 'bjj_purple', label: 'Ceinture violette', color: '#8B5CF6', sport: 'BJJ',
    sessionsPerWeek: 4, avgDurationMin: 80, sparringRoundsPerSession: 6,
    drillingRatio: 45, consistencyPct: 72, subRatioGivenTaken: 1.2, yearlySessionCount: 175,
  },
  {
    id: 'bjj_brown', label: 'Ceinture marron', color: '#92400E', sport: 'BJJ',
    sessionsPerWeek: 5, avgDurationMin: 85, sparringRoundsPerSession: 7,
    drillingRatio: 40, consistencyPct: 80, subRatioGivenTaken: 1.8, yearlySessionCount: 210,
  },
  {
    id: 'bjj_black', label: 'Ceinture noire', color: '#111827', sport: 'BJJ',
    sessionsPerWeek: 5, avgDurationMin: 90, sparringRoundsPerSession: 8,
    drillingRatio: 35, consistencyPct: 85, subRatioGivenTaken: 2.5, yearlySessionCount: 240,
  },
  {
    id: 'grappling_beg', label: 'Débutant Grappling', color: '#22C55E', sport: 'Grappling',
    sessionsPerWeek: 2, avgDurationMin: 65, sparringRoundsPerSession: 3,
    drillingRatio: 55, consistencyPct: 50, subRatioGivenTaken: 0.5, yearlySessionCount: 75,
  },
  {
    id: 'grappling_inter', label: 'Intermédiaire Grappling', color: '#F59E0B', sport: 'Grappling',
    sessionsPerWeek: 3.5, avgDurationMin: 75, sparringRoundsPerSession: 5,
    drillingRatio: 45, consistencyPct: 68, subRatioGivenTaken: 1.0, yearlySessionCount: 145,
  },
  {
    id: 'grappling_adv', label: 'Avancé Grappling', color: '#EF4444', sport: 'Grappling',
    sessionsPerWeek: 5, avgDurationMin: 85, sparringRoundsPerSession: 7,
    drillingRatio: 38, consistencyPct: 78, subRatioGivenTaken: 1.6, yearlySessionCount: 200,
  },
  {
    id: 'mma_beg', label: 'Débutant MMA', color: '#06B6D4', sport: 'MMA',
    sessionsPerWeek: 3, avgDurationMin: 80, sparringRoundsPerSession: 4,
    drillingRatio: 50, consistencyPct: 60, subRatioGivenTaken: 0.7, yearlySessionCount: 110,
  },
  {
    id: 'mma_inter', label: 'Intermédiaire MMA', color: '#F97316', sport: 'MMA',
    sessionsPerWeek: 5, avgDurationMin: 90, sparringRoundsPerSession: 6,
    drillingRatio: 42, consistencyPct: 75, subRatioGivenTaken: 1.1, yearlySessionCount: 180,
  },
];

const LEVEL_KEY = '@yoroi_benchmark_level';

// ============================================
// CALCUL DES STATS UTILISATEUR
// ============================================

interface UserStats {
  sessionsPerWeek: number;
  avgDurationMin: number;
  sparringRoundsPerSession: number;
  drillingRatio: number;
  consistencyPct: number;
  subRatioGivenTaken: number;
  yearlySessionCount: number;
}

function parseCombatRounds(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function computeUserStats(trainings: Training[]): UserStats {
  if (trainings.length === 0) {
    return { sessionsPerWeek: 0, avgDurationMin: 0, sparringRoundsPerSession: 0, drillingRatio: 0, consistencyPct: 0, subRatioGivenTaken: 0, yearlySessionCount: 0 };
  }

  const now = new Date();
  const yearAgo = new Date(now); yearAgo.setFullYear(now.getFullYear() - 1);
  const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);

  const yearlyTrainings = trainings.filter(t => new Date(t.date) >= yearAgo);
  const recentTrainings = trainings.filter(t => new Date(t.date) >= threeMonthsAgo);

  // Sessions/semaine (90 derniers jours)
  const sessionsPerWeek = recentTrainings.length > 0 ? recentTrainings.length / 13 : 0;

  // Durée moyenne
  const durations = trainings.map(t => t.duration_minutes ?? 0).filter(d => d > 0);
  const avgDurationMin = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // Rounds sparring par séance
  let totalRounds = 0; let sessionsWithRounds = 0;
  let totalSubGiven = 0; let totalSubTaken = 0;
  for (const tr of trainings) {
    const rounds = parseCombatRounds(tr.combat_rounds);
    if (rounds.length > 0) {
      totalRounds += rounds.length;
      sessionsWithRounds++;
      for (const r of rounds) {
        totalSubGiven += r.submissionsGiven ?? 0;
        totalSubTaken += r.submissionsTaken ?? 0;
      }
    }
  }
  const sparringRoundsPerSession = sessionsWithRounds > 0 ? totalRounds / sessionsWithRounds : 0;

  // Ratio drilling
  const isType = (tr: Training, keyword: string) => {
    if (tr.session_type?.toLowerCase().includes(keyword)) return true;
    if (tr.session_types) {
      try { const arr: string[] = JSON.parse(tr.session_types); return arr.some(s => s.toLowerCase().includes(keyword)); } catch {}
    }
    return false;
  };
  const drillingCount = trainings.filter(t => isType(t, 'drilling') || isType(t, 'drill')).length;
  const sparringCount = trainings.filter(t => isType(t, 'sparring')).length;
  const drillingRatio = (drillingCount + sparringCount) > 0 ? Math.round((drillingCount / (drillingCount + sparringCount)) * 100) : 0;

  // Consistance : semaines avec au moins 1 séance sur les 13 dernières semaines
  const weekSet = new Set<string>();
  for (const tr of recentTrainings) {
    const d = new Date(tr.date);
    weekSet.add(`${d.getFullYear()}-${Math.floor(d.getTime() / (7 * 86400000))}`);
  }
  const consistencyPct = Math.round((weekSet.size / 13) * 100);

  // Ratio soumissions
  const subRatioGivenTaken = totalSubTaken > 0 ? totalSubGiven / totalSubTaken : (totalSubGiven > 0 ? totalSubGiven : 0);

  // Séances/an
  const yearlySessionCount = yearlyTrainings.length;

  return {
    sessionsPerWeek: Math.round(sessionsPerWeek * 10) / 10,
    avgDurationMin: Math.round(avgDurationMin),
    sparringRoundsPerSession: Math.round(sparringRoundsPerSession * 10) / 10,
    drillingRatio,
    consistencyPct,
    subRatioGivenTaken: Math.round(subRatioGivenTaken * 10) / 10,
    yearlySessionCount,
  };
}

// ============================================
// COMPOSANT
// ============================================

interface StatRow {
  label: string;
  userValue: number;
  refValue: number;
  unit: string;
  higherIsBetter: boolean;
  format?: (v: number) => string;
}

const DEFAULT_FORMAT = (v: number) => v.toString();

function CompareRow({ row, isDark, colors }: { row: StatRow; isDark: boolean; colors: any }) {
  const { t } = useI18n();
  const fmt = row.format ?? DEFAULT_FORMAT;
  const diff = row.userValue - row.refValue;
  const pct = row.refValue > 0 ? (diff / row.refValue) * 100 : 0;
  const isAbove = row.higherIsBetter ? diff > 0 : diff < 0;
  const isEqual = Math.abs(pct) < 5;

  const statusColor = isEqual ? '#F59E0B' : isAbove ? '#22C55E' : '#EF4444';
  const StatusIcon = isEqual ? Minus : isAbove ? TrendingUp : TrendingDown;

  // Barre de comparaison : user vs ref
  const maxVal = Math.max(row.userValue, row.refValue, 0.01);
  const userPct = (row.userValue / maxVal) * 100;
  const refPct = (row.refValue / maxVal) * 100;

  return (
    <View style={{ gap: 6, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: colors.text, fontWeight: '600', flex: 1 }}>{row.label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <StatusIcon size={12} color={statusColor} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: statusColor }}>
            {fmt(row.userValue)} {row.unit}
          </Text>
        </View>
      </View>
      {/* Double barre */}
      <View style={{ gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', width: 36 }}>{t('benchmark.me')}</Text>
          <View style={{ flex: 1, height: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${userPct}%` as any, height: '100%', backgroundColor: statusColor, borderRadius: 4 }} />
          </View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: statusColor, width: 38, textAlign: 'right' }}>{fmt(row.userValue)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', width: 36 }}>{t('benchmark.ref')}</Text>
          <View style={{ flex: 1, height: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${refPct}%` as any, height: '100%', backgroundColor: `${colors.textMuted ?? '#888'}80`, borderRadius: 4 }} />
          </View>
          <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', width: 38, textAlign: 'right' }}>{fmt(row.refValue)}</Text>
        </View>
      </View>
      {!isEqual && (
        <Text style={{ fontSize: 11, color: statusColor, fontWeight: '600' }}>
          {isAbove ? '+' : ''}{Math.round(pct)}% {t('benchmark.vspeers')}
        </Text>
      )}
    </View>
  );
}

export default function BenchmarkScreen() {
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [levelId, setLevelId] = useState<string>('bjj_blue');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LEVEL_KEY).then(v => { if (v) setLevelId(v); });
    getTrainings(365).then(setTrainings).catch(() => {});
  }, []);

  const selectLevel = async (id: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setLevelId(id);
    await AsyncStorage.setItem(LEVEL_KEY, id);
    setShowPicker(false);
  };

  const benchmark = BENCHMARKS.find(b => b.id === levelId) ?? BENCHMARKS[1];
  const userStats = useMemo(() => computeUserStats(trainings), [trainings]);

  const rows: StatRow[] = [
    { label: t('benchmark.rowSessionsPerWeek'), userValue: userStats.sessionsPerWeek, refValue: benchmark.sessionsPerWeek, unit: t('benchmark.rowSessionsUnit'), higherIsBetter: true, format: v => v.toFixed(1) },
    { label: t('benchmark.rowAvgDuration'), userValue: userStats.avgDurationMin, refValue: benchmark.avgDurationMin, unit: 'min', higherIsBetter: true },
    { label: t('benchmark.rowSparringRounds'), userValue: userStats.sparringRoundsPerSession, refValue: benchmark.sparringRoundsPerSession, unit: 'rounds', higherIsBetter: true, format: v => v.toFixed(1) },
    { label: t('benchmark.rowDrillingRatio'), userValue: userStats.drillingRatio, refValue: benchmark.drillingRatio, unit: '%', higherIsBetter: false },
    { label: t('benchmark.rowConsistency'), userValue: userStats.consistencyPct, refValue: benchmark.consistencyPct, unit: '%', higherIsBetter: true },
    { label: t('benchmark.rowSubRatio'), userValue: userStats.subRatioGivenTaken, refValue: benchmark.subRatioGivenTaken, unit: '', higherIsBetter: true, format: v => v.toFixed(1) },
    { label: t('benchmark.rowYearlySessions'), userValue: userStats.yearlySessionCount, refValue: benchmark.yearlySessionCount, unit: '', higherIsBetter: true },
  ];

  // Score global : nb de métriques au-dessus ou égales
  const aboveCount = rows.filter(r => {
    const diff = r.userValue - r.refValue;
    const pct = r.refValue > 0 ? Math.abs((diff / r.refValue) * 100) : 0;
    if (pct < 5) return true; // égal = ok
    return r.higherIsBetter ? diff > 0 : diff < 0;
  }).length;
  const scoreColor = aboveCount >= 5 ? '#22C55E' : aboveCount >= 3 ? '#F59E0B' : '#EF4444';
  const scoreLabel = aboveCount >= 5 ? t('benchmark.aboveAverage') : aboveCount >= 3 ? t('benchmark.inAverage') : t('benchmark.belowAverage');

  const cardStyle = {
    backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    padding: 16,
    marginBottom: 14,
  };

  return (
    <PremiumGate featureTitle="Benchmark">
    <View style={{ flex: 1, backgroundColor: isDark ? colors.background : '#F2F2F7' }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{t('benchmark.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sélecteur de niveau */}
        <View style={cardStyle}>
          <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', marginBottom: 8 }}>{t('benchmark.yourRefLevel')}</Text>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: benchmark.color, borderWidth: benchmark.color === '#E5E7EB' ? 1 : 0, borderColor: '#ccc' }} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{benchmark.label}</Text>
              <View style={{ backgroundColor: `${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', fontWeight: '600' }}>{benchmark.sport}</Text>
              </View>
            </View>
            <ChevronDown size={16} color={colors.textMuted ?? '#888'} />
          </TouchableOpacity>
          <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginTop: 8, lineHeight: 16 }}>
            {t('benchmark.communityDataNote')}
          </Text>
        </View>

        {/* Score global */}
        <View style={[cardStyle, { borderLeftWidth: 3, borderLeftColor: scoreColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Award size={22} color={scoreColor} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: scoreColor }}>{scoreLabel}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', marginTop: 2 }}>
                {aboveCount}/{rows.length} {t('benchmark.metricsAtOrAbove')}
              </Text>
            </View>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: `${scoreColor}18`, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: scoreColor }}>{Math.round((aboveCount / rows.length) * 100)}%</Text>
            </View>
          </View>
          {/* Barre score */}
          <View style={{ height: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden', marginTop: 10 }}>
            <View style={{ width: `${(aboveCount / rows.length) * 100}%` as any, height: '100%', backgroundColor: scoreColor, borderRadius: 4 }} />
          </View>
        </View>

        {/* Comparaison détaillée */}
        <View style={cardStyle}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 4 }}>
            {t('benchmark.detailedComparison')}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted ?? '#888', marginBottom: 12 }}>
            {t('benchmark.statsVsAverage')} {benchmark.label.toLowerCase()}
          </Text>
          {rows.map((row, i) => (
            <CompareRow key={i} row={row} isDark={isDark} colors={colors} />
          ))}
        </View>

        {/* Note de transparence */}
        <View style={{ backgroundColor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.06)', borderRadius: 14, padding: 14, borderLeftWidth: 3, borderLeftColor: '#8B5CF6' }}>
          <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888', lineHeight: 18 }}>
            {t('benchmark.transparencyNote')}
          </Text>
        </View>
        <PremiumTeaser variant="detail" title="Benchmarks avancés" />
      </ScrollView>

      {/* Picker modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: isDark ? (colors.card ?? '#1a1a1a') : '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: insets.bottom + 16, maxHeight: '70%' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 14 }}>{t('benchmark.selectYourLevel')}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(() => {
                const sports = [...new Set(BENCHMARKS.map(b => b.sport))];
                return sports.map(sport => (
                  <View key={sport}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted ?? '#888', letterSpacing: 0.5, marginBottom: 8, marginTop: 8 }}>{sport.toUpperCase()}</Text>
                    {BENCHMARKS.filter(b => b.sport === sport).map(b => (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => selectLevel(b.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: b.id === levelId ? `${b.color}18` : 'transparent', marginBottom: 4 }}
                      >
                        <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: b.color, borderWidth: b.color === '#E5E7EB' ? 1 : 0, borderColor: '#ccc' }} />
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: b.id === levelId ? '800' : '500', color: colors.text }}>{b.label}</Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted ?? '#888' }}>{b.sessionsPerWeek}x/sem</Text>
                        {b.id === levelId && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: b.color }} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                ));
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
    </PremiumGate>
  );
}
