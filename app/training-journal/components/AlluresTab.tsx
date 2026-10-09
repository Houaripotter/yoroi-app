// ============================================
// ALLURES TAB · Personal Bests par distance standard (5K, 10K, semi, marathon)
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, DeviceEventEmitter,
} from 'react-native';
import { Zap, Trophy, Target, TrendingUp, Clock } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { sportsInPack } from '@/lib/sportPacks';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';
import logger from '@/lib/security/logger';

interface PbDistance {
  label: string;
  km: number;
  tolerance: number; // tolérance en km autour de la distance cible
  color: string;
}

// Distances standards du running
const STANDARD_DISTANCES: PbDistance[] = [
  { label: '5 km',         km: 5,      tolerance: 0.5, color: '#10B981' },
  { label: '10 km',        km: 10,     tolerance: 1.0, color: '#3B82F6' },
  { label: 'Semi-marathon', km: 21.1,  tolerance: 2.0, color: '#8B5CF6' },
  { label: 'Marathon',     km: 42.195, tolerance: 3.0, color: '#EF4444' },
];

function formatPace(paceSecPerKm: number): string {
  if (!isFinite(paceSecPerKm) || paceSecPerKm <= 0) return ',';
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.round(paceSecPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTime(min: number): string {
  if (min < 60) {
    const m = Math.floor(min);
    const s = Math.round((min - m) * 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  const h = Math.floor(min / 60);
  const rest = min - h * 60;
  const m = Math.floor(rest);
  const s = Math.round((rest - m) * 60);
  return `${h}h${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AlluresTab() {
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
      const enduranceSports = new Set(sportsInPack('endurance'));
      setTrainings(all.filter(t => enduranceSports.has(t.sport)));
    } catch (e) {
      logger.error('[AlluresTab] load error', e);
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

  // PRs par distance
  const prs = useMemo(() => {
    return STANDARD_DISTANCES.map(d => {
      // Trouve toutes les sorties dans la tolérance
      const candidates = trainings.filter(t => {
        const km = (t as any).distance_km ?? (t as any).distance ?? 0;
        const min = t.duration_minutes || 0;
        return km >= d.km - d.tolerance && km <= d.km + d.tolerance && min > 0;
      });
      if (candidates.length === 0) return { ...d, bestPace: null, bestDate: null, bestTime: null, bestKm: null, count: 0 };

      // Meilleure allure sur ces candidats (pace)
      let best: { pace: number; date: string; min: number; km: number } | null = null;
      for (const t of candidates) {
        const km = (t as any).distance_km ?? (t as any).distance ?? 0;
        const min = t.duration_minutes || 0;
        const pace = (min * 60) / km;
        if (!best || pace < best.pace) {
          best = { pace, date: t.date, min, km };
        }
      }
      return {
        ...d,
        bestPace: best?.pace ?? null,
        bestDate: best?.date ?? null,
        bestTime: best ? best.min : null,
        bestKm: best ? best.km : null,
        count: candidates.length,
      };
    });
  }, [trainings]);

  // Évolution mensuelle allure moyenne
  const paceEvolution = useMemo(() => {
    const byMonth: Record<string, { km: number; min: number }> = {};
    for (const t of trainings) {
      const km = (t as any).distance_km ?? (t as any).distance ?? 0;
      const min = t.duration_minutes || 0;
      if (km < 1 || min < 5) continue;
      const key = t.date.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { km: 0, min: 0 };
      byMonth[key].km += km;
      byMonth[key].min += min;
    }
    // 6 derniers mois
    const now = new Date();
    const series: { key: string; label: string; pace: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      const data = byMonth[key];
      const pace = data && data.km > 0 ? (data.min * 60) / data.km : 0;
      series.push({ key, label, pace, count: Object.keys(byMonth[key] || {}).length });
    }
    const paces = series.filter(s => s.pace > 0).map(s => s.pace);
    const min = paces.length ? Math.min(...paces) : 0;
    const max = paces.length ? Math.max(...paces) : 0;
    return { series, min, max };
  }, [trainings]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}><SkeletonGrid count={4} /></View>;
  }

  if (trainings.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatsEmptyState
          icon={<Zap size={48} color={colors.textMuted} />}
          title="Aucune allure enregistrée"
          description="Cours au moins 5 km avec ton temps pour débloquer tes records par distance."
          ctaLabel="Ajouter une sortie"
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

      {/* PRs par distance */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Trophy size={14} color="#F59E0B" />
          <Text style={[styles.title, { color: colors.text }]}>PERSONAL BESTS · PAR DISTANCE</Text>
        </View>
        <View style={{ gap: 10, marginTop: 12 }}>
          {prs.map(pr => (
            <View key={pr.label} style={[styles.prRow, {
              backgroundColor: pr.bestPace ? pr.color + '12' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)'),
              borderLeftColor: pr.bestPace ? pr.color : 'transparent',
            }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.prLabel, { color: pr.bestPace ? pr.color : colors.textMuted }]}>
                  {pr.label}
                </Text>
                {pr.bestPace ? (
                  <Text style={[styles.prTime, { color: colors.text }]}>
                    {pr.bestTime !== null ? formatTime(pr.bestTime) : ','}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 }}>
                    Aucune sortie enregistrée
                  </Text>
                )}
              </View>
              {pr.bestPace ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.prPace, { color: pr.color }]}>
                    {formatPace(pr.bestPace)}
                  </Text>
                  <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '700' }}>/km</Text>
                  {pr.bestDate && (
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                      {new Date(pr.bestDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {/* Évolution allure sur 6 mois */}
      {paceEvolution.series.some(s => s.pace > 0) && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.head}>
            <TrendingUp size={14} color="#10B981" />
            <Text style={[styles.title, { color: colors.text }]}>ALLURE MOYENNE · 6 MOIS</Text>
          </View>
          <View style={styles.chart}>
            {paceEvolution.series.map(s => {
              if (s.pace === 0) {
                return (
                  <View key={s.key} style={styles.chartCol}>
                    <View style={[styles.chartBar, { height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                    <Text style={[styles.chartLabel, { color: colors.textMuted }]}>{s.label}</Text>
                  </View>
                );
              }
              // Plus c'est rapide, plus c'est vert (inversé : low pace = haute barre verte)
              const range = paceEvolution.max - paceEvolution.min || 1;
              const normalized = 1 - (s.pace - paceEvolution.min) / range; // 0 = lent, 1 = rapide
              const heightPct = Math.max(15, normalized * 100);
              const color = normalized > 0.66 ? '#10B981' : normalized > 0.33 ? '#F59E0B' : '#EF4444';
              return (
                <View key={s.key} style={styles.chartCol}>
                  <Text style={[styles.chartVal, { color }]}>{formatPace(s.pace)}</Text>
                  <View style={[styles.chartBar, {
                    height: `${heightPct}%`,
                    backgroundColor: color,
                  }]} />
                  <Text style={[styles.chartLabel, { color: colors.textMuted }]}>{s.label}</Text>
                </View>
              );
            })}
          </View>
          <Text style={{ fontSize: 10, color: colors.textMuted, fontStyle: 'italic', marginTop: 8, textAlign: 'center' }}>
            Barre haute = plus rapide · allure moy pondérée sur le mois
          </Text>
        </View>
      )}

      {/* Stats globales */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Target size={14} color="#3B82F6" />
          <Text style={[styles.title, { color: colors.text }]}>STATS ALLURES</Text>
        </View>
        <View style={{ gap: 6, marginTop: 10 }}>
          {prs.filter(p => p.count > 0).map(p => (
            <View key={p.label} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 8 }}>
              <Text style={{ fontSize: 12, color: colors.text, fontWeight: '700' }}>{p.label}</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {p.count} sortie{p.count > 1 ? 's' : ''}
              </Text>
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

  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  prLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 0.3, textTransform: 'uppercase' },
  prTime: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  prPace: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },

  chart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    height: 110, marginTop: 10, gap: 6,
  },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  chartVal: { fontSize: 9, fontWeight: '900', marginBottom: 2 },
  chartBar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4, marginBottom: 4 },
  chartLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
});
