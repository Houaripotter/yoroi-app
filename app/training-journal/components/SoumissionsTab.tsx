// ============================================
// SOUMISSIONS TAB · deep-dive soumissions données/reçues
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import { Target, Shield, Swords, Trophy, TrendingUp, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import type { Training, CombatRound } from '@/lib/database';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';
import logger from '@/lib/security/logger';

function parseRounds(raw: any): CombatRound[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) ?? []; } catch { return []; }
  }
  return [];
}

export default function SoumissionsTab() {
  const { colors, isDark, screenBackground } = useTheme();
  const accent = screenBackground || '#8B5CF6';
  const cardBg = colors.backgroundCard;
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const bgColor = isDark ? colors.background : '#F2F2F7';

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const t = await getTrainings();
      setTrainings(t.filter(tr => tr.sport === 'jjb' || tr.sport === 'grappling' || tr.sport === 'mma'));
    } catch (e) {
      logger.error('[SoumissionsTab] load error', e);
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

  // ── Agrégat soumissions ──
  const stats = useMemo(() => {
    let given = 0;   // soumissions données
    let taken = 0;   // soumissions subies
    let totalRounds = 0;
    let totalWins = 0;

    const givenMap: Record<string, number> = {};
    const takenMap: Record<string, number> = {};

    // Par mois (12 derniers mois)
    const nowMonth = new Date().toISOString().slice(0, 7);
    const monthGiven: Record<string, number> = {};

    for (const tr of trainings) {
      const rounds = parseRounds(tr.combat_rounds);
      for (const r of rounds) {
        totalRounds++;
        if (r.result === 'win') totalWins++;
        for (const m of (r.methodsGiven || [])) {
          given++;
          givenMap[m] = (givenMap[m] || 0) + 1;
          const mkey = tr.date.slice(0, 7);
          monthGiven[mkey] = (monthGiven[mkey] || 0) + 1;
        }
        for (const m of (r.methodsTaken || [])) {
          taken++;
          takenMap[m] = (takenMap[m] || 0) + 1;
        }
      }
    }

    // Finishing rate : soumissions / victoires
    const finishingRate = totalWins > 0 ? Math.round((given / totalWins) * 100) : null;

    const topGiven = Object.entries(givenMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const topTaken = Object.entries(takenMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Evolution 12 derniers mois
    const now = new Date();
    const monthSeries: { key: string; label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      monthSeries.push({ key, label, count: monthGiven[key] || 0 });
    }
    const maxMonthly = Math.max(...monthSeries.map(m => m.count), 1);

    return { given, taken, totalRounds, totalWins, finishingRate, topGiven, topTaken, monthSeries, maxMonthly };
  }, [trainings]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}>
        <SkeletonGrid count={5} />
      </View>
    );
  }

  if (trainings.length === 0 || (stats.given === 0 && stats.taken === 0)) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatsEmptyState
          icon={<Target size={48} color={colors.textMuted} />}
          title="Pas encore de soumissions enregistrées"
          description="Logge des rounds de sparring avec les soumissions données et reçues pour voir ton jeu."
          ctaLabel="Ajouter un sparring"
          ctaHref="/add-training"
          accentColor="#8B5CF6"
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

      {/* ── STATS GLOBALES ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.sectionHead}>
          <Target size={14} color="#8B5CF6" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>TON JEU DE SOUMISSION</Text>
        </View>
        <View style={styles.statsRow}>
          <StatCard value={stats.given} label="Données" color="#22C55E" />
          <StatCard value={stats.taken} label="Subies" color="#EF4444" />
          <StatCard value={stats.totalRounds} label="Rounds" color="#3B82F6" />
          <StatCard
            value={stats.finishingRate !== null ? `${stats.finishingRate}%` : '·'}
            label="Finish rate"
            color="#A855F7"
          />
        </View>
        {stats.finishingRate !== null && (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {stats.finishingRate >= 60
              ? 'Excellent · tu finis tes victoires'
              : stats.finishingRate >= 30
                ? 'Bon équilibre points / soumissions'
                : 'Tu gagnes surtout aux points · travaille le finish'}
          </Text>
        )}
      </View>

      {/* ── ÉVOLUTION MENSUELLE ── */}
      {stats.monthSeries.some(m => m.count > 0) && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHead}>
            <TrendingUp size={14} color="#22C55E" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>ÉVOLUTION 12 MOIS</Text>
          </View>
          <View style={styles.chartRow}>
            {stats.monthSeries.map(m => {
              const pct = m.count / stats.maxMonthly;
              return (
                <View key={m.key} style={styles.chartCol}>
                  {m.count > 0 && (
                    <Text style={[styles.chartValue, { color: '#22C55E' }]}>{m.count}</Text>
                  )}
                  <View style={[styles.chartBar, {
                    height: m.count > 0 ? `${Math.max(8, pct * 100)}%` : 4,
                    backgroundColor: m.count > 0 ? '#22C55E' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                  }]} />
                  <Text style={[styles.chartLabel, { color: colors.textMuted }]}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── TOP SOUMISSIONS DONNÉES ── */}
      {stats.topGiven.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHead}>
            <Swords size={14} color="#22C55E" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>TON ARSENAL · TOP DONNÉES</Text>
          </View>
          <View style={{ gap: 6, marginTop: 10 }}>
            {stats.topGiven.map(([name, count], idx) => {
              const maxGiven = stats.topGiven[0][1];
              const pct = (count / maxGiven) * 100;
              return (
                <View key={name} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {idx === 0 && <Trophy size={12} color="#FBBF24" fill="#FBBF24" />}
                      <Text style={[styles.subName, { color: colors.text }]}>{name}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#22C55E' }}>×{count}</Text>
                  </View>
                  <View style={[styles.subTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    <View style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: '#22C55E',
                      borderRadius: 4,
                    }} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── SOUMISSIONS SUBIES · À DÉFENDRE ── */}
      {stats.topTaken.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHead}>
            <Shield size={14} color="#EF4444" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>DEFENSE MAP · À TRAVAILLER</Text>
          </View>
          <View style={{ gap: 6, marginTop: 10 }}>
            {stats.topTaken.map(([name, count], idx) => {
              const maxTaken = stats.topTaken[0][1];
              const pct = (count / maxTaken) * 100;
              return (
                <View key={name} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {idx === 0 && <AlertTriangle size={12} color="#EF4444" fill="#EF4444" />}
                      <Text style={[styles.subName, { color: colors.text }]}>{name}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#EF4444' }}>×{count}</Text>
                  </View>
                  <View style={[styles.subTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    <View style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: '#EF4444',
                      borderRadius: 4,
                    }} />
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: colors.textMuted, marginTop: 10 }]}>
            Les finitions qui te sont le + souvent appliquées. Drill la défense sur la première.
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

function StatCard({ value, label, color }: { value: number | string; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.3 },
  hint: { fontSize: 10, fontStyle: 'italic', textAlign: 'center', marginTop: 10 },

  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    marginTop: 10,
    gap: 3,
  },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  chartValue: { fontSize: 9, fontWeight: '900', marginBottom: 2 },
  chartBar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4, marginBottom: 4 },
  chartLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },

  subName: { fontSize: 13, fontWeight: '800' },
  subTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
});
