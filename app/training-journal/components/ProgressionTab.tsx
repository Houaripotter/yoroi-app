// ============================================
// PROGRESSION TAB · évolution PRs sur les gros mouvements
// Lit les benchmarks (yoroi_benchmarks_v2)
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TrendingUp, Weight, Trophy, Target } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';
import logger from '@/lib/security/logger';

// Gros mouvements classiques à tracker
const COMPOUND_LIFTS = [
  { key: 'squat',    label: 'Squat',              color: '#DC2626', keywords: ['squat', 'back squat', 'front squat'] },
  { key: 'bench',    label: 'Développé couché',   color: '#3B82F6', keywords: ['développé couché', 'developpé couché', 'bench press', 'dc', 'bench'] },
  { key: 'deadlift', label: 'Soulevé de terre',   color: '#F59E0B', keywords: ['soulevé de terre', 'souleve de terre', 'deadlift', 'sdt'] },
  { key: 'ohp',      label: 'Développé militaire', color: '#8B5CF6', keywords: ['développé militaire', 'developpé militaire', 'ohp', 'overhead press', 'dm'] },
  { key: 'row',      label: 'Rowing barre',       color: '#10B981', keywords: ['rowing', 'barbell row', 'pendlay'] },
  { key: 'dips',     label: 'Dips lestés',        color: '#F97316', keywords: ['dips'] },
  { key: 'pullup',   label: 'Tractions lestées', color: '#06B6D4', keywords: ['traction', 'tractions', 'pull-up', 'pullup', 'weighted pullup'] },
];

interface Benchmark {
  id: string;
  name: string;
  category: string;
  unit: string;
  entries?: Array<{ id: string; date: string; value: number; reps?: number; note?: string }>;
}

export default function ProgressionTab() {
  const { colors, isDark, screenBackground } = useTheme();
  const accent = screenBackground || '#EC4899';
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
      logger.error('[ProgressionTab] load error', e);
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

  const liftsData = useMemo(() => {
    return COMPOUND_LIFTS.map(lift => {
      const keywords = lift.keywords;
      const matches = benchmarks.filter(b => {
        const name = b.name.toLowerCase();
        return keywords.some(kw => name.includes(kw));
      });
      let best: { value: number; date: string; reps?: number } | null = null;
      let first: { value: number; date: string } | null = null;
      const entries: Array<{ value: number; date: string }> = [];
      for (const b of matches) {
        for (const e of (b.entries || [])) {
          entries.push({ value: e.value, date: e.date });
          if (!best || e.value > best.value) {
            best = { value: e.value, date: e.date, reps: e.reps };
          }
          if (!first || e.date < first.date) {
            first = { value: e.value, date: e.date };
          }
        }
      }
      // Progression : (current max - first) / first * 100
      const gain = first && best
        ? best.value - first.value
        : 0;
      const gainPct = first && first.value > 0
        ? Math.round(((best!.value - first.value) / first.value) * 100)
        : 0;

      // Trend : derniers 3 vs précédents 3
      entries.sort((a, b) => a.date.localeCompare(b.date));
      const last3 = entries.slice(-3);
      const prev3 = entries.slice(-6, -3);
      const avgLast = last3.length ? last3.reduce((s, e) => s + e.value, 0) / last3.length : 0;
      const avgPrev = prev3.length ? prev3.reduce((s, e) => s + e.value, 0) / prev3.length : 0;
      const trending: 'up' | 'stable' | 'down' | null =
        !prev3.length ? null
        : avgLast > avgPrev + 1 ? 'up'
        : avgLast < avgPrev - 1 ? 'down' : 'stable';

      return {
        ...lift,
        best,
        first,
        gain,
        gainPct,
        entries,
        totalEntries: entries.length,
        trending,
      };
    });
  }, [benchmarks]);

  const withData = liftsData.filter(l => l.best !== null);

  if (loading) return <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}><SkeletonGrid count={4} /></View>;

  if (withData.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatsEmptyState
          icon={<TrendingUp size={48} color={colors.textMuted} />}
          title="Aucune progression enregistrée"
          description="Ajoute tes PRs sur Squat, Bench, Deadlift et autres gros mouvements dans l'onglet Records."
          ctaLabel="Ajouter un record"
          ctaHref="/training-journal"
          accentColor="#EC4899"
        />
      </View>
    );
  }

  // Total Powerlifting si les 3 gros existent
  const squat = liftsData.find(l => l.key === 'squat')?.best?.value ?? 0;
  const bench = liftsData.find(l => l.key === 'bench')?.best?.value ?? 0;
  const dl = liftsData.find(l => l.key === 'deadlift')?.best?.value ?? 0;
  const totalPL = squat + bench + dl;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bgColor }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={accent} />}
    >

      {/* Total Powerlifting (si dispo) */}
      {totalPL > 0 && (
        <View style={[styles.card, { backgroundColor: '#DC262615', borderColor: '#DC2626' }]}>
          <View style={styles.head}>
            <Trophy size={14} color="#DC2626" />
            <Text style={[styles.title, { color: '#DC2626' }]}>TOTAL POWERLIFTING</Text>
          </View>
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <Text style={{ fontSize: 36, fontWeight: '900', color: '#DC2626', letterSpacing: -1 }}>
              {totalPL} <Text style={{ fontSize: 20 }}>kg</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>Squat {squat}</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#3B82F6' }}>Bench {bench}</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#F59E0B' }}>DL {dl}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Compound Lifts */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Weight size={14} color="#EC4899" />
          <Text style={[styles.title, { color: colors.text }]}>PROGRESSION · GROS MOUVEMENTS</Text>
        </View>
        <View style={{ gap: 10, marginTop: 12 }}>
          {withData.map(lift => (
            <View key={lift.key} style={[styles.liftRow, {
              backgroundColor: lift.color + '12',
              borderLeftColor: lift.color,
            }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.liftName, { color: lift.color }]}>{lift.label}</Text>
                  {lift.trending === 'up' && (
                    <View style={[styles.trendBadge, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.trendText}>↑ PROG</Text>
                    </View>
                  )}
                  {lift.trending === 'stable' && (
                    <View style={[styles.trendBadge, { backgroundColor: '#F59E0B' }]}>
                      <Text style={styles.trendText}>= STABLE</Text>
                    </View>
                  )}
                  {lift.trending === 'down' && (
                    <View style={[styles.trendBadge, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.trendText}>↓ BAISSE</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                  {lift.totalEntries} entrée{lift.totalEntries > 1 ? 's' : ''}
                  {lift.gainPct > 0 && <Text style={{ color: '#10B981', fontWeight: '800' }}> · +{lift.gain}kg ({lift.gainPct}%)</Text>}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                  <Text style={[styles.liftVal, { color: lift.color }]}>{lift.best!.value}</Text>
                  <Text style={{ fontSize: 13, color: lift.color, fontWeight: '800' }}>kg</Text>
                </View>
                {lift.best!.reps && lift.best!.reps > 1 && (
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>× {lift.best!.reps} reps</Text>
                )}
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                  {new Date(lift.best!.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  liftRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderLeftWidth: 3 },
  liftName: { fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
  liftVal: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  trendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  trendText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
});
