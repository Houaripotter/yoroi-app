// ============================================
// VOIES TAB · pack Nature (Escalade)
// Lit les benchmarks nommés "voie" / "escalade" + trainings de type climbing
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, DeviceEventEmitter,
} from 'react-native';
import { Mountain, TrendingUp, Target, Trophy, Activity } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { sportsInPack } from '@/lib/sportPacks';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';
import logger from '@/lib/security/logger';

// Cotations françaises (simplifiées)
const GRADES = [
  { grade: '4a', val: 1, color: '#10B981' },
  { grade: '4b', val: 2, color: '#10B981' },
  { grade: '4c', val: 3, color: '#10B981' },
  { grade: '5a', val: 4, color: '#22C55E' },
  { grade: '5b', val: 5, color: '#22C55E' },
  { grade: '5c', val: 6, color: '#22C55E' },
  { grade: '6a', val: 7, color: '#F59E0B' },
  { grade: '6a+', val: 8, color: '#F59E0B' },
  { grade: '6b', val: 9, color: '#F59E0B' },
  { grade: '6b+', val: 10, color: '#F97316' },
  { grade: '6c', val: 11, color: '#F97316' },
  { grade: '6c+', val: 12, color: '#F97316' },
  { grade: '7a', val: 13, color: '#EF4444' },
  { grade: '7a+', val: 14, color: '#EF4444' },
  { grade: '7b', val: 15, color: '#DC2626' },
  { grade: '7b+', val: 16, color: '#DC2626' },
  { grade: '7c', val: 17, color: '#B91C1C' },
  { grade: '8a', val: 18, color: '#7C2D12' },
  { grade: '8a+', val: 19, color: '#7C2D12' },
  { grade: '8b', val: 20, color: '#1F2937' },
];

function gradeMeta(grade: string) {
  return GRADES.find(g => g.grade === grade.toLowerCase()) || { grade, val: 0, color: '#6B7280' };
}

export default function VoiesTab() {
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
      const all = await getTrainings();
      const natureSports = new Set(sportsInPack('nature'));
      setTrainings(all.filter(t => natureSports.has(t.sport)));
    } catch (e) {
      logger.error('[VoiesTab] load error', e);
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
    // Parser les "theme" pour extraire la cotation (ex: "voie 6b+" ou "6c flash")
    const byGrade: Record<string, number> = {};
    let bestGradeVal = 0;
    let bestGrade = '—';
    for (const t of trainings) {
      const theme = (t.technical_theme || '').toLowerCase();
      for (const g of GRADES) {
        if (theme.includes(g.grade)) {
          byGrade[g.grade] = (byGrade[g.grade] || 0) + 1;
          if (g.val > bestGradeVal) {
            bestGradeVal = g.val;
            bestGrade = g.grade;
          }
          break;
        }
      }
    }
    const gradeDist = Object.entries(byGrade)
      .map(([grade, count]) => ({ grade, count, ...gradeMeta(grade) }))
      .sort((a, b) => a.val - b.val);
    return { totalSessions, totalMin, bestGrade, bestGradeVal, gradeDist };
  }, [trainings]);

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}><SkeletonGrid count={4} /></View>;
  }

  if (trainings.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatsEmptyState
          icon={<Mountain size={48} color={colors.textMuted} />}
          title="Aucune voie enregistrée"
          description="Ajoute tes séances d'escalade avec la cotation dans le thème (ex: 6b+, 7a flash)."
          ctaLabel="Ajouter une séance"
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

      {/* Overview */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Mountain size={14} color="#8B5CF6" />
          <Text style={[styles.title, { color: colors.text }]}>TON NIVEAU GRIMPE</Text>
        </View>
        <View style={styles.statsRow}>
          <Stat value={stats.totalSessions} label="Séances" color="#8B5CF6" />
          <Stat value={`${Math.round(stats.totalMin / 60)}h`} label="Temps falaise" color="#3B82F6" />
          <Stat value={stats.bestGrade} label="Meilleure cote" color={gradeMeta(stats.bestGrade).color} />
          <Stat value={stats.gradeDist.length} label="Cotations tentées" color="#10B981" />
        </View>
      </View>

      {/* Répartition par cotation */}
      {stats.gradeDist.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.head}>
            <Target size={14} color="#F59E0B" />
            <Text style={[styles.title, { color: colors.text }]}>DISTRIBUTION PAR COTATION</Text>
          </View>
          <View style={{ gap: 6, marginTop: 10 }}>
            {stats.gradeDist.map(g => {
              const maxCount = Math.max(...stats.gradeDist.map(x => x.count));
              const pct = (g.count / maxCount) * 100;
              return (
                <View key={g.grade}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: g.color }}>
                      {g.grade}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted }}>
                      {g.count} voie{g.count > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    <View style={{ height: '100%', width: `${pct}%`, backgroundColor: g.color, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Séances récentes */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.head}>
          <Activity size={14} color="#3B82F6" />
          <Text style={[styles.title, { color: colors.text }]}>DERNIÈRES SÉANCES</Text>
        </View>
        <View style={{ gap: 8, marginTop: 10 }}>
          {trainings.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(s => (
            <View key={s.id} style={[styles.sessionRow, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
            }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                  {s.technical_theme || 'Séance grimpe'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  {new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                  {s.duration_minutes ? ` · ${s.duration_minutes}min` : ''}
                </Text>
              </View>
            </View>
          ))}
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

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  statCard: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.3, textAlign: 'center' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  sessionRow: { padding: 10, borderRadius: 10 },
});
