// ============================================
// STATIONS TAB · PRs sur les 8 stations Hyrox + benchmarks force
// Parse les benchmarks (yoroi_benchmarks_v2) avec filtres par nom
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trophy, Dumbbell, TrendingUp, Zap, Weight } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';
import logger from '@/lib/security/logger';

// Les 8 stations officielles Hyrox
const HYROX_STATIONS = [
  { key: 'ski_erg',          label: 'SkiErg',            unit: 'sec', target: '1000m',       color: '#F97316' },
  { key: 'sled_push',        label: 'Sled Push',         unit: 'sec', target: '50m',         color: '#DC2626' },
  { key: 'sled_pull',        label: 'Sled Pull',         unit: 'sec', target: '50m',         color: '#B91C1C' },
  { key: 'burpee_broad_jump',label: 'Burpee Broad Jump', unit: 'sec', target: '80m',         color: '#EA580C' },
  { key: 'rower',            label: 'Rower',             unit: 'sec', target: '1000m',       color: '#7C3AED' },
  { key: 'farmer_carry',     label: 'Farmer Carry',      unit: 'sec', target: '200m · 24kg', color: '#9333EA' },
  { key: 'sandbag_lunges',   label: 'Sandbag Lunges',    unit: 'sec', target: '100m · 20kg', color: '#CA8A04' },
  { key: 'wall_balls',       label: 'Wall Balls',        unit: 'reps', target: '100 · 6kg',  color: '#16A34A' },
];

// Mots-clés pour matcher un benchmark à une station
const STATION_KEYWORDS: Record<string, string[]> = {
  ski_erg:           ['ski erg', 'skierg', 'ski-erg'],
  sled_push:         ['sled push', 'sled-push', 'push sled', 'traîneau poussé'],
  sled_pull:         ['sled pull', 'sled-pull', 'pull sled', 'traîneau tiré'],
  burpee_broad_jump: ['burpee broad jump', 'burpee-broad', 'bbj', 'burpee jump'],
  rower:             ['rower', 'rameur', 'rowing'],
  farmer_carry:      ['farmer carry', 'farmer', 'farmers walk', 'farmer walk'],
  sandbag_lunges:    ['sandbag lunges', 'sandbag', 'lunges sandbag'],
  wall_balls:        ['wall ball', 'wall-ball', 'wall balls', 'wallball'],
};

// Benchmarks force classiques (powerlifting)
const FORCE_BENCHMARKS = [
  { key: 'squat',    label: 'Squat',              color: '#DC2626' },
  { key: 'bench',    label: 'Développé couché',   color: '#3B82F6' },
  { key: 'deadlift', label: 'Soulevé de terre',   color: '#F59E0B' },
  { key: 'press',    label: 'Développé militaire', color: '#8B5CF6' },
];

const FORCE_KEYWORDS: Record<string, string[]> = {
  squat:    ['squat', 'back squat', 'front squat'],
  bench:    ['développé couché', 'developpé couché', 'bench press', 'developpe couche', 'dc', 'bench'],
  deadlift: ['soulevé de terre', 'souleve de terre', 'deadlift', 'sdt'],
  press:    ['développé militaire', 'developpé militaire', 'ohp', 'overhead press', 'militaire'],
};

interface BenchmarkEntry {
  id: string;
  date: string;
  value: number;
  reps?: number;
  note?: string;
}

interface Benchmark {
  id: string;
  name: string;
  category: string;
  unit: string;
  entries?: BenchmarkEntry[];
}

function matchesStation(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

function formatSec(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

export default function StationsTab() {
  const { colors, isDark, screenBackground } = useTheme();
  const accent = screenBackground || '#F97316';
  const cardBg = colors.backgroundCard;
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const bgColor = isDark ? colors.background : '#F2F2F7';

  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('yoroi_benchmarks_v2');
      if (!raw) { setBenchmarks([]); return; }
      try {
        const parsed = JSON.parse(raw);
        setBenchmarks(Array.isArray(parsed) ? parsed : []);
      } catch {
        setBenchmarks([]);
      }
    } catch (e) {
      logger.error('[StationsTab] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', load);
    return () => sub.remove();
  }, [load]);

  // Matche chaque benchmark à une station
  const stationData = useMemo(() => {
    return HYROX_STATIONS.map(station => {
      const keywords = STATION_KEYWORDS[station.key] || [];
      const matches = benchmarks.filter(b => matchesStation(b.name, keywords));
      // PR = meilleur temps (le plus bas pour station Hyrox) ou max pour wall balls
      let best: { value: number; date: string; note?: string } | null = null;
      let totalEntries = 0;
      for (const b of matches) {
        for (const e of (b.entries || [])) {
          totalEntries++;
          const isWallBalls = station.key === 'wall_balls';
          if (!best) {
            best = { value: e.value, date: e.date, note: e.note };
          } else if (isWallBalls ? e.value > best.value : e.value < best.value) {
            best = { value: e.value, date: e.date, note: e.note };
          }
        }
      }
      return { ...station, best, totalEntries };
    });
  }, [benchmarks]);

  // Benchmarks force 1RM
  const forceData = useMemo(() => {
    return FORCE_BENCHMARKS.map(fb => {
      const keywords = FORCE_KEYWORDS[fb.key] || [];
      const matches = benchmarks.filter(b => matchesStation(b.name, keywords));
      let best: { value: number; date: string; reps?: number } | null = null;
      let totalEntries = 0;
      for (const b of matches) {
        for (const e of (b.entries || [])) {
          totalEntries++;
          // Prise du max en poids (1RM si reps=1, sinon approx)
          if (!best || e.value > best.value) {
            best = { value: e.value, date: e.date, reps: e.reps };
          }
        }
      }
      return { ...fb, best, totalEntries };
    });
  }, [benchmarks]);

  const hasHyroxData = stationData.some(s => s.best !== null);
  const hasForceData = forceData.some(f => f.best !== null);
  const hasAnyData = hasHyroxData || hasForceData;

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}><SkeletonGrid count={4} /></View>;
  }

  if (!hasAnyData) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatsEmptyState
          icon={<Dumbbell size={48} color={colors.textMuted} />}
          title="Aucune station / benchmark enregistré"
          description="Ajoute tes temps sur les 8 stations Hyrox ou tes 1RM (squat, bench, deadlift) dans l'onglet Records."
          ctaLabel="Ajouter un record"
          ctaHref="/training-journal"
          accentColor="#F97316"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bgColor }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={accent} />}
    >

      {/* 8 stations Hyrox */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Trophy size={14} color="#F97316" />
          <Text style={[styles.title, { color: colors.text }]}>8 STATIONS HYROX</Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' }}>
          Meilleurs temps / performances par station
        </Text>
        <View style={{ gap: 8, marginTop: 12 }}>
          {stationData.map(s => (
            <View key={s.key} style={[styles.stationRow, {
              backgroundColor: s.best ? s.color + '12' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)'),
              borderLeftColor: s.best ? s.color : 'transparent',
            }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stationLabel, { color: s.best ? s.color : colors.text }]}>
                  {s.label}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>
                  Objectif : {s.target}
                </Text>
                {s.totalEntries > 0 && (
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>
                    {s.totalEntries} entrée{s.totalEntries > 1 ? 's' : ''} enregistrée{s.totalEntries > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
              {s.best ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.stationVal, { color: s.color }]}>
                    {s.unit === 'sec' ? formatSec(s.best.value) : s.best.value}
                  </Text>
                  <Text style={{ fontSize: 9, color: s.color, fontWeight: '800', letterSpacing: 0.3 }}>
                    {s.unit === 'sec' ? 'PR' : 'reps'}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                    {new Date(s.best.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>—</Text>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* 1RM Force (Powerlifting) */}
      {hasForceData && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.head}>
            <Weight size={14} color="#DC2626" />
            <Text style={[styles.title, { color: colors.text }]}>1RM · POWERLIFTING</Text>
          </View>
          <View style={{ gap: 8, marginTop: 12 }}>
            {forceData.filter(f => f.best).map(f => (
              <View key={f.key} style={[styles.stationRow, {
                backgroundColor: f.color + '12',
                borderLeftColor: f.color,
              }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stationLabel, { color: f.color }]}>
                    {f.label}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}>
                    {f.totalEntries} record{f.totalEntries > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                    <Text style={[styles.stationVal, { color: f.color }]}>
                      {f.best!.value}
                    </Text>
                    <Text style={{ fontSize: 12, color: f.color, fontWeight: '800' }}>kg</Text>
                  </View>
                  {f.best!.reps && f.best!.reps > 1 && (
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>
                      × {f.best!.reps} reps
                    </Text>
                  )}
                  <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                    {new Date(f.best!.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          {/* Total charge */}
          {(() => {
            const squat = forceData.find(f => f.key === 'squat')?.best?.value ?? 0;
            const bench = forceData.find(f => f.key === 'bench')?.best?.value ?? 0;
            const dl = forceData.find(f => f.key === 'deadlift')?.best?.value ?? 0;
            const total = squat + bench + dl;
            if (total === 0) return null;
            return (
              <View style={[styles.totalBox, { backgroundColor: '#DC262615', borderColor: '#DC2626' }]}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#DC2626', letterSpacing: 0.5 }}>
                  TOTAL POWERLIFTING
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#DC2626', marginTop: 2 }}>
                  {total} kg
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                  Squat {squat} · Bench {bench} · Deadlift {dl}
                </Text>
              </View>
            );
          })()}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  stationLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  stationVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },

  totalBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});
