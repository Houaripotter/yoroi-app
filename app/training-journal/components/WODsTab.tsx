// ============================================
// WODs TAB · historique des workouts (Hyrox, CrossFit, Force)
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, DeviceEventEmitter,
} from 'react-native';
import { Dumbbell, Flame, Clock, Trophy, Zap, Target } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { sportsInPack } from '@/lib/sportPacks';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';
import logger from '@/lib/security/logger';

function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)}min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function sportLabel(sport: string): string {
  const map: Record<string, string> = {
    hyrox: 'Hyrox', crossfit: 'CrossFit', powerlifting: 'Powerlifting',
    fitness: 'Fitness', musculation: 'Musculation', bodybuilding: 'Bodybuilding',
    strongman: 'Strongman',
  };
  return map[sport] ?? sport;
}

function sportColor(sport: string): string {
  const map: Record<string, string> = {
    hyrox: '#F97316', crossfit: '#DC2626', powerlifting: '#7C3AED',
    fitness: '#10B981', musculation: '#F59E0B', bodybuilding: '#EF4444',
    strongman: '#B45309',
  };
  return map[sport] ?? '#F59E0B';
}

export default function WODsTab() {
  const { colors, isDark, screenBackground } = useTheme();
  const accent = screenBackground || '#F59E0B';
  const cardBg = colors.backgroundCard;
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const bgColor = isDark ? colors.background : '#F2F2F7';

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await getTrainings();
      const forceSports = new Set(sportsInPack('force'));
      setTrainings(all.filter(t => forceSports.has(t.sport)));
    } catch (e) {
      logger.error('[WODsTab] load error', e);
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

  // Stats globales
  const stats = useMemo(() => {
    const totalSessions = trainings.length;
    const totalMin = trainings.reduce((s, t) => s + (t.duration_minutes || 0), 0);
    const totalCalories = trainings.reduce((s, t) => s + (t.calories || 0), 0);
    const avgIntensity = totalSessions > 0
      ? Math.round(trainings.reduce((s, t) => s + (t.intensity || 0), 0) / totalSessions * 10) / 10
      : 0;

    // Compte par sport
    const bySport: Record<string, number> = {};
    for (const t of trainings) {
      bySport[t.sport] = (bySport[t.sport] || 0) + 1;
    }
    const sportDist = Object.entries(bySport)
      .map(([sport, count]) => ({ sport, count, pct: Math.round((count / totalSessions) * 100) }))
      .sort((a, b) => b.count - a.count);

    // Par mois (6 derniers)
    const byMonth: Record<string, number> = {};
    for (const t of trainings) {
      const key = t.date.slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + 1;
    }
    const now = new Date();
    const monthSeries: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      monthSeries.push({ key, label, count: byMonth[key] || 0 });
    }
    const maxMonth = Math.max(...monthSeries.map(m => m.count), 1);

    // Meilleure session (plus intense / plus longue)
    const longest = trainings.reduce<Training | null>(
      (max, t) => (t.duration_minutes || 0) > (max?.duration_minutes || 0) ? t : max,
      null,
    );

    return { totalSessions, totalMin, totalCalories, avgIntensity, sportDist, monthSeries, maxMonth, longest };
  }, [trainings]);

  const recentSessions = useMemo(
    () => [...trainings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [trainings],
  );

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}><SkeletonGrid count={5} /></View>;
  }

  if (trainings.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatsEmptyState
          icon={<Dumbbell size={48} color={colors.textMuted} />}
          title="Aucun WOD enregistré"
          description="Ajoute tes séances Hyrox, CrossFit, powerlifting ou musculation pour voir tes stats ici."
          ctaLabel="Ajouter une séance"
          ctaHref="/add-training"
          accentColor="#F59E0B"
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

      {/* Stats globales */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Dumbbell size={14} color="#F59E0B" />
          <Text style={[styles.title, { color: colors.text }]}>TES WODS</Text>
        </View>
        <View style={styles.statsRow}>
          <Stat value={stats.totalSessions} label="Sessions" color="#F59E0B" />
          <Stat value={formatDuration(stats.totalMin)} label="Temps total" color="#8B5CF6" />
          <Stat value={stats.totalCalories >= 1000 ? `${(stats.totalCalories / 1000).toFixed(1)}k` : stats.totalCalories} label="kcal" color="#EF4444" />
          <Stat value={`${stats.avgIntensity}/10`} label="Intensité" color="#DC2626" />
        </View>
      </View>

      {/* Sessions par mois */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Flame size={14} color="#EF4444" />
          <Text style={[styles.title, { color: colors.text }]}>VOLUME · 6 MOIS</Text>
        </View>
        <View style={styles.chart}>
          {stats.monthSeries.map(m => {
            const pct = m.count / stats.maxMonth;
            return (
              <View key={m.key} style={styles.chartCol}>
                {m.count > 0 && (
                  <Text style={[styles.chartVal, { color: '#F59E0B' }]}>{m.count}</Text>
                )}
                <View style={[styles.chartBar, {
                  height: m.count > 0 ? `${Math.max(8, pct * 100)}%` : 4,
                  backgroundColor: m.count > 0 ? '#F59E0B' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                }]} />
                <Text style={[styles.chartLabel, { color: colors.textMuted }]}>{m.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Distribution par type de sport */}
      {stats.sportDist.length > 1 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.head}>
            <Target size={14} color="#8B5CF6" />
            <Text style={[styles.title, { color: colors.text }]}>RÉPARTITION PAR TYPE</Text>
          </View>
          <View style={{ gap: 8, marginTop: 10 }}>
            {stats.sportDist.map(s => {
              const color = sportColor(s.sport);
              return (
                <View key={s.sport} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                      {sportLabel(s.sport)}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color }}>
                      {s.count} · {s.pct}%
                    </Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    <View style={{ height: '100%', width: `${s.pct}%`, backgroundColor: color, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Session record (plus longue) */}
      {stats.longest && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.head}>
            <Trophy size={14} color="#F59E0B" />
            <Text style={[styles.title, { color: colors.text }]}>SESSION RECORD</Text>
          </View>
          <View style={[styles.recordCard, { backgroundColor: '#F59E0B15', borderLeftColor: '#F59E0B', marginTop: 10 }]}>
            <Text style={[styles.recordLabel, { color: '#F59E0B' }]}>PLUS LONGUE</Text>
            <Text style={[styles.recordVal, { color: '#F59E0B' }]}>
              {formatDuration(stats.longest.duration_minutes || 0)}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
              {sportLabel(stats.longest.sport)} · {new Date(stats.longest.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
      )}

      {/* Dernières sessions */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Zap size={14} color="#3B82F6" />
          <Text style={[styles.title, { color: colors.text }]}>DERNIÈRES SESSIONS</Text>
        </View>
        <View style={{ gap: 8, marginTop: 10 }}>
          {recentSessions.map(s => {
            const color = sportColor(s.sport);
            return (
              <View key={s.id} style={[styles.sessionRow, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                borderLeftColor: color,
              }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.sportBadge, { backgroundColor: color }]}>
                      <Text style={styles.sportBadgeText}>{sportLabel(s.sport)}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                      {new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </Text>
                    {s.technical_theme && (
                      <Text style={{ fontSize: 11, color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                        · {s.technical_theme}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                    {s.duration_minutes && (
                      <Metric icon={<Clock size={10} color="#8B5CF6" />} label={formatDuration(s.duration_minutes)} color="#8B5CF6" />
                    )}
                    {s.intensity && (
                      <Metric icon={<Flame size={10} color="#DC2626" />} label={`${s.intensity}/10`} color="#DC2626" />
                    )}
                    {s.calories && (
                      <Metric icon={<Zap size={10} color="#EF4444" />} label={`${s.calories} kcal`} color="#EF4444" />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

    </ScrollView>
  );
}

function Stat({ value, label, color }: { value: string | number; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function Metric({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {icon}
      <Text style={{ fontSize: 11, fontWeight: '700', color }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  statCard: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.3 },

  chart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: 110, marginTop: 10, gap: 6,
  },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  chartVal: { fontSize: 10, fontWeight: '900', marginBottom: 2 },
  chartBar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4, marginBottom: 4 },
  chartLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },

  recordCard: { padding: 12, borderRadius: 12, borderLeftWidth: 3 },
  recordLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4, marginBottom: 4 },
  recordVal: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },

  sessionRow: { padding: 10, borderRadius: 10, borderLeftWidth: 3 },
  sportBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sportBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
});
