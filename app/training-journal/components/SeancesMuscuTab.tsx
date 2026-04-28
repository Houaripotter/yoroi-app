// ============================================
// SÉANCES MUSCU TAB · historique + split detection + volume
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, DeviceEventEmitter,
} from 'react-native';
import { Dumbbell, Calendar, Clock, Flame, TrendingUp, Layers } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';
import logger from '@/lib/security/logger';

// Detection du split à partir du thème
const SPLIT_KEYWORDS: Record<string, { label: string; color: string; keywords: string[] }> = {
  push:  { label: 'Push',  color: '#DC2626', keywords: ['push', 'pecs', 'épaules', 'triceps', 'dc', 'dm', 'développé couché', 'développé militaire'] },
  pull:  { label: 'Pull',  color: '#3B82F6', keywords: ['pull', 'dos', 'biceps', 'rowing', 'traction', 'tirage', 'sdt', 'soulevé'] },
  legs:  { label: 'Legs',  color: '#F59E0B', keywords: ['legs', 'jambes', 'quadri', 'ischio', 'squat', 'fente', 'mollet'] },
  upper: { label: 'Upper', color: '#8B5CF6', keywords: ['upper', 'haut du corps'] },
  lower: { label: 'Lower', color: '#EC4899', keywords: ['lower', 'bas du corps'] },
  full:  { label: 'Full',  color: '#10B981', keywords: ['full', 'full body', 'circuit'] },
  abs:   { label: 'Abdos', color: '#06B6D4', keywords: ['abdos', 'core', 'gainage', 'abs'] },
};

function detectSplit(theme: string): { key: string; label: string; color: string } | null {
  const lower = theme.toLowerCase();
  for (const [key, meta] of Object.entries(SPLIT_KEYWORDS)) {
    if (meta.keywords.some(kw => lower.includes(kw))) {
      return { key, label: meta.label, color: meta.color };
    }
  }
  return null;
}

function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)}min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export default function SeancesMuscuTab() {
  const { colors, isDark, screenBackground } = useTheme();
  const accent = screenBackground || '#EC4899';
  const cardBg = colors.backgroundCard;
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const bgColor = isDark ? colors.background : '#F2F2F7';

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await getTrainings();
      setTrainings(all.filter(t => ['musculation', 'bodybuilding', 'fitness'].includes(t.sport)));
    } catch (e) {
      logger.error('[SeancesMuscuTab] load error', e);
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

  const stats = useMemo(() => {
    const totalSessions = trainings.length;
    const totalMin = trainings.reduce((s, t) => s + (t.duration_minutes || 0), 0);
    const totalCalories = trainings.reduce((s, t) => s + (t.calories || 0), 0);
    const avgDuration = totalSessions > 0 ? Math.round(totalMin / totalSessions) : 0;

    // Split distribution
    const splits: Record<string, number> = {};
    for (const t of trainings) {
      const split = detectSplit(t.technical_theme || '');
      if (split) splits[split.key] = (splits[split.key] || 0) + 1;
    }
    const splitDist = Object.entries(splits)
      .map(([key, count]) => ({ key, count, ...SPLIT_KEYWORDS[key] }))
      .sort((a, b) => b.count - a.count);

    // Séances par semaine (12 dernières)
    const byWeek: Record<string, number> = {};
    for (const t of trainings) {
      const d = new Date(t.date);
      const year = d.getFullYear();
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = `${year}-W${String(Math.ceil((d.getTime() - new Date(year, 0, 1).getTime()) / (7 * 86400000))).padStart(2, '0')}`;
      byWeek[key] = (byWeek[key] || 0) + 1;
    }
    const avgPerWeek = Object.keys(byWeek).length > 0
      ? (Object.values(byWeek).reduce((s, n) => s + n, 0) / Object.keys(byWeek).length).toFixed(1)
      : '0';

    return { totalSessions, totalMin, totalCalories, avgDuration, splitDist, avgPerWeek };
  }, [trainings]);

  const recentSessions = useMemo(
    () => [...trainings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12),
    [trainings],
  );

  if (loading) return <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}><SkeletonGrid count={5} /></View>;

  if (trainings.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatsEmptyState
          icon={<Dumbbell size={48} color={colors.textMuted} />}
          title="Aucune séance muscu enregistrée"
          description="Ajoute tes séances de musculation avec le split (Push/Pull/Legs, Upper/Lower) dans le thème."
          ctaLabel="Ajouter une séance"
          ctaHref="/add-training"
          accentColor="#EC4899"
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

      {/* Stats */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Dumbbell size={14} color="#EC4899" />
          <Text style={[styles.title, { color: colors.text }]}>TES SÉANCES MUSCU</Text>
        </View>
        <View style={styles.statsRow}>
          <Stat value={stats.totalSessions} label="Sessions" color="#EC4899" />
          <Stat value={formatDuration(stats.totalMin)} label="Temps total" color="#8B5CF6" />
          <Stat value={`${stats.avgDuration}min`} label="Moy/session" color="#3B82F6" />
          <Stat value={stats.avgPerWeek} label="Par semaine" color="#10B981" />
        </View>
      </View>

      {/* Split distribution */}
      {stats.splitDist.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.head}>
            <Layers size={14} color="#8B5CF6" />
            <Text style={[styles.title, { color: colors.text }]}>RÉPARTITION PAR SPLIT</Text>
          </View>
          <View style={{ gap: 8, marginTop: 10 }}>
            {stats.splitDist.map(s => {
              const maxCount = stats.splitDist[0].count;
              const pct = (s.count / maxCount) * 100;
              return (
                <View key={s.key}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: s.color }}>{s.label}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>
                      {s.count} session{s.count > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    <View style={{ height: '100%', width: `${pct}%`, backgroundColor: s.color, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Dernières sessions */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Calendar size={14} color="#3B82F6" />
          <Text style={[styles.title, { color: colors.text }]}>DERNIÈRES SÉANCES</Text>
        </View>
        <View style={{ gap: 8, marginTop: 10 }}>
          {recentSessions.map(s => {
            const split = detectSplit(s.technical_theme || '');
            const color = split?.color || '#EC4899';
            return (
              <View key={s.id} style={[styles.sessionRow, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                borderLeftColor: color,
              }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {split && (
                      <View style={[styles.splitBadge, { backgroundColor: color }]}>
                        <Text style={styles.splitBadgeText}>{split.label}</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                      {new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </Text>
                  </View>
                  {s.technical_theme && (
                    <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700', marginTop: 3 }} numberOfLines={1}>
                      {s.technical_theme}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                    {s.duration_minutes && <Metric icon={<Clock size={10} color="#8B5CF6" />} label={formatDuration(s.duration_minutes)} color="#8B5CF6" />}
                    {s.intensity && <Metric icon={<Flame size={10} color="#DC2626" />} label={`${s.intensity}/10`} color="#DC2626" />}
                    {s.calories && <Metric icon={<TrendingUp size={10} color="#F59E0B" />} label={`${s.calories} kcal`} color="#F59E0B" />}
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
  statLabel: { fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.3, textAlign: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  sessionRow: { padding: 10, borderRadius: 10, borderLeftWidth: 3 },
  splitBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  splitBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
});
