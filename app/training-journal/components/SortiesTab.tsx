// ============================================
// SORTIES TAB · historique des sorties endurance (running/trail/triathlon/cyclisme)
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, DeviceEventEmitter,
} from 'react-native';
import { MapPin, TrendingUp, Clock, Flame, Calendar, Activity, Trophy } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { sportsInPack } from '@/lib/sportPacks';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';
import logger from '@/lib/security/logger';

// Format allure mm:ss/km
function formatPace(paceSecPerKm: number): string {
  if (!isFinite(paceSecPerKm) || paceSecPerKm <= 0) return '—';
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.round(paceSecPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDuration(min: number): string {
  if (min < 60) return `${Math.round(min)}min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

function sportLabel(sport: string): string {
  const map: Record<string, string> = {
    running: 'Running', marathon: 'Marathon', trail: 'Trail',
    triathlon: 'Triathlon', cycling: 'Cyclisme', velo: 'Vélo',
    natation: 'Natation', swim: 'Natation', obstacle: 'OCR', ocr: 'OCR',
  };
  return map[sport] ?? sport;
}

function sportColor(sport: string): string {
  const map: Record<string, string> = {
    running: '#10B981', marathon: '#059669', trail: '#F59E0B',
    triathlon: '#3B82F6', cycling: '#8B5CF6', velo: '#8B5CF6',
    natation: '#06B6D4', swim: '#06B6D4', obstacle: '#DC2626', ocr: '#DC2626',
  };
  return map[sport] ?? '#10B981';
}

export default function SortiesTab() {
  const { colors, isDark, screenBackground } = useTheme();
  const accent = screenBackground || '#10B981';
  const cardBg = colors.backgroundCard;
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const bgColor = isDark ? colors.background : '#F2F2F7';

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const all = await getTrainings();
      const enduranceSports = new Set(sportsInPack('endurance'));
      setTrainings(all.filter(t => enduranceSports.has(t.sport)));
    } catch (e) {
      logger.error('[SortiesTab] load error', e);
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
    let totalKm = 0;
    let totalMin = 0;
    let totalSessions = trainings.length;
    let totalCalories = 0;
    let longestRun = 0;
    let longestRunDate = '';
    let fastestPace = Infinity;
    let fastestPaceDate = '';
    const byMonth: Record<string, { km: number; count: number }> = {};

    for (const t of trainings) {
      const km = (t as any).distance_km ?? (t as any).distance ?? 0;
      const min = t.duration_minutes || 0;
      totalKm += km;
      totalMin += min;
      totalCalories += t.calories || 0;

      if (km > longestRun) {
        longestRun = km;
        longestRunDate = t.date;
      }

      if (km >= 1 && min >= 5) {
        const pace = (min * 60) / km; // sec/km
        if (pace < fastestPace) {
          fastestPace = pace;
          fastestPaceDate = t.date;
        }
      }

      const monthKey = t.date.slice(0, 7);
      if (!byMonth[monthKey]) byMonth[monthKey] = { km: 0, count: 0 };
      byMonth[monthKey].km += km;
      byMonth[monthKey].count++;
    }

    const avgPace = totalKm > 0 ? (totalMin * 60) / totalKm : 0;

    // 6 derniers mois
    const now = new Date();
    const monthSeries: { key: string; label: string; km: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      monthSeries.push({ key, label, km: byMonth[key]?.km || 0, count: byMonth[key]?.count || 0 });
    }
    const maxMonthlyKm = Math.max(...monthSeries.map(m => m.km), 1);

    return {
      totalKm: Math.round(totalKm * 10) / 10,
      totalMin,
      totalSessions,
      totalCalories,
      longestRun: Math.round(longestRun * 10) / 10,
      longestRunDate,
      fastestPace,
      fastestPaceDate,
      avgPace,
      monthSeries,
      maxMonthlyKm,
    };
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
          icon={<Activity size={48} color={colors.textMuted} />}
          title="Aucune sortie enregistrée"
          description="Ajoute tes sorties running, trail, triathlon ou cyclisme pour voir tes stats ici."
          ctaLabel="Ajouter une séance"
          ctaHref="/add-training"
          accentColor="#10B981"
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
          <Activity size={14} color="#10B981" />
          <Text style={[styles.title, { color: colors.text }]}>TES SORTIES</Text>
        </View>
        <View style={styles.statsRow}>
          <Stat value={`${stats.totalKm}`} unit="km" label="Total" color="#10B981" />
          <Stat value={stats.totalSessions} label="Sorties" color="#3B82F6" />
          <Stat value={formatDuration(stats.totalMin)} label="Temps" color="#8B5CF6" />
          <Stat value={formatPace(stats.avgPace)} unit="/km" label="Allure moy" color="#F59E0B" />
        </View>
      </View>

      {/* Graphique kilomètres 6 mois */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <TrendingUp size={14} color="#10B981" />
          <Text style={[styles.title, { color: colors.text }]}>KILOMÈTRES · 6 MOIS</Text>
        </View>
        <View style={styles.chart}>
          {stats.monthSeries.map(m => {
            const pct = m.km / stats.maxMonthlyKm;
            return (
              <View key={m.key} style={styles.chartCol}>
                {m.km > 0 && (
                  <Text style={[styles.chartVal, { color: '#10B981' }]}>{Math.round(m.km)}</Text>
                )}
                <View style={[styles.chartBar, {
                  height: m.km > 0 ? `${Math.max(8, pct * 100)}%` : 4,
                  backgroundColor: m.km > 0 ? '#10B981' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                }]} />
                <Text style={[styles.chartLabel, { color: colors.textMuted }]}>{m.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Records */}
      {(stats.longestRun > 0 || isFinite(stats.fastestPace)) && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.head}>
            <Trophy size={14} color="#F59E0B" />
            <Text style={[styles.title, { color: colors.text }]}>TES RECORDS</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {stats.longestRun > 0 && (
              <View style={[styles.recordCard, { backgroundColor: '#10B98115', borderLeftColor: '#10B981' }]}>
                <Text style={[styles.recordLabel, { color: '#10B981' }]}>PLUS LONGUE</Text>
                <Text style={[styles.recordVal, { color: '#10B981' }]}>{stats.longestRun} km</Text>
                <Text style={[styles.recordDate, { color: colors.textMuted }]}>
                  {new Date(stats.longestRunDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            )}
            {isFinite(stats.fastestPace) && (
              <View style={[styles.recordCard, { backgroundColor: '#F59E0B15', borderLeftColor: '#F59E0B' }]}>
                <Text style={[styles.recordLabel, { color: '#F59E0B' }]}>ALLURE MAX</Text>
                <Text style={[styles.recordVal, { color: '#F59E0B' }]}>{formatPace(stats.fastestPace)}/km</Text>
                <Text style={[styles.recordDate, { color: colors.textMuted }]}>
                  {new Date(stats.fastestPaceDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Sorties récentes */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Calendar size={14} color="#3B82F6" />
          <Text style={[styles.title, { color: colors.text }]}>DERNIÈRES SORTIES</Text>
        </View>
        <View style={{ gap: 8, marginTop: 10 }}>
          {recentSessions.map(s => {
            const km = (s as any).distance_km ?? (s as any).distance ?? 0;
            const min = s.duration_minutes || 0;
            const pace = km >= 1 && min >= 5 ? (min * 60) / km : null;
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
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                    {km > 0 && <Metric icon={<MapPin size={10} color={color} />} label={`${km} km`} color={color} />}
                    {min > 0 && <Metric icon={<Clock size={10} color="#8B5CF6" />} label={formatDuration(min)} color="#8B5CF6" />}
                    {pace && <Metric icon={<TrendingUp size={10} color="#F59E0B" />} label={`${formatPace(pace)}/km`} color="#F59E0B" />}
                    {s.calories && <Metric icon={<Flame size={10} color="#EF4444" />} label={`${s.calories} kcal`} color="#EF4444" />}
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

function Stat({ value, unit, label, color }: { value: string | number; unit?: string; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statCard}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
        <Text style={[styles.statVal, { color }]}>{value}</Text>
        {unit && <Text style={[styles.statUnit, { color }]}>{unit}</Text>}
      </View>
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
  statUnit: { fontSize: 10, fontWeight: '800', letterSpacing: 0 },
  statLabel: { fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.3 },

  chart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: 110, marginTop: 10, gap: 6,
  },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  chartVal: { fontSize: 10, fontWeight: '900', marginBottom: 2 },
  chartBar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4, marginBottom: 4 },
  chartLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  recordCard: { flex: 1, padding: 12, borderRadius: 12, borderLeftWidth: 3 },
  recordLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4, marginBottom: 4 },
  recordVal: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  recordDate: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  sessionRow: { padding: 10, borderRadius: 10, borderLeftWidth: 3 },
  sportBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sportBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.3 },
});
