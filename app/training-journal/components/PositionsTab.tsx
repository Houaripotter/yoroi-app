// ============================================
// POSITIONS TAB · thèmes techniques + catégories de soumissions
// Regroupe les techniques par "famille" pour donner une vue positionnelle du jeu
// ============================================

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  DeviceEventEmitter,
} from 'react-native';
import { Map, Target, TrendingUp, Clock, BookOpen } from 'lucide-react-native';
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

// ============================================
// CATEGORIES DE SOUMISSIONS
// Groupe les techniques par type pour une vue positionnelle
// ============================================

const SUBMISSION_CATEGORIES: Record<string, { label: string; color: string; keywords: string[] }> = {
  chokes: {
    label: 'Étranglements',
    color: '#8B5CF6',
    keywords: ['triangle', 'rnc', 'rear naked', 'guillotine', "d'arce", 'darce', 'ezekiel', 'cross collar', 'anaconda', 'bow and arrow', 'étranglement', 'etranglement', 'baseball', 'north south', 'loop choke', 'peruvian'],
  },
  arm: {
    label: 'Clés de bras',
    color: '#3B82F6',
    keywords: ['armbar', 'kimura', 'americana', 'americaine', 'omoplata', 'clé de bras', 'clef de bras', 'arm triangle', 'bras tendu', 'wrist lock'],
  },
  leg: {
    label: 'Leg locks',
    color: '#F59E0B',
    keywords: ['heel hook', 'kneebar', 'straight footlock', 'toe hold', 'calf slicer', 'leg lock', 'ashi', '50/50', 'talon', 'genou', 'saddle'],
  },
  back: {
    label: 'Soumissions du dos',
    color: '#DC2626',
    keywords: ['rnc', 'rear naked', 'bow and arrow', 'crucifix', 'back mount', 'dos'],
  },
  pressure: {
    label: 'Positions dominantes',
    color: '#10B981',
    keywords: ['mount', 'side control', 'knee on belly', 'monté', 'nord sud', 'north south', 'passage'],
  },
};

function categorizeTechnique(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [key, cat] of Object.entries(SUBMISSION_CATEGORIES)) {
    if (cat.keywords.some(kw => lower.includes(kw))) return key;
  }
  return null;
}

export default function PositionsTab() {
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
      const t = await getTrainings();
      setTrainings(t.filter(tr => tr.sport === 'jjb' || tr.sport === 'grappling' || tr.sport === 'mma'));
    } catch (e) {
      logger.error('[PositionsTab] load error', e);
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

  // ── Analyse : thèmes travaillés ──
  const themeStats = useMemo(() => {
    const map: Record<string, { sessions: number; minutes: number; lastDate: string }> = {};
    for (const tr of trainings) {
      const theme = tr.technical_theme?.trim();
      if (!theme) continue;
      if (!map[theme]) map[theme] = { sessions: 0, minutes: 0, lastDate: tr.date };
      map[theme].sessions++;
      map[theme].minutes += tr.duration_minutes || 0;
      if (tr.date > map[theme].lastDate) map[theme].lastDate = tr.date;
    }
    return Object.entries(map)
      .map(([theme, data]) => ({ theme, ...data }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
  }, [trainings]);

  // ── Analyse : catégories de soumissions ──
  const categoryStats = useMemo(() => {
    const givenByCat: Record<string, number> = {};
    const takenByCat: Record<string, number> = {};
    let totalGiven = 0;
    let totalTaken = 0;

    for (const tr of trainings) {
      const rounds = parseRounds(tr.combat_rounds);
      for (const r of rounds) {
        for (const m of (r.methodsGiven || [])) {
          totalGiven++;
          const cat = categorizeTechnique(m);
          if (cat) givenByCat[cat] = (givenByCat[cat] || 0) + 1;
        }
        for (const m of (r.methodsTaken || [])) {
          totalTaken++;
          const cat = categorizeTechnique(m);
          if (cat) takenByCat[cat] = (takenByCat[cat] || 0) + 1;
        }
      }
    }

    return Object.keys(SUBMISSION_CATEGORIES).map(key => {
      const given = givenByCat[key] || 0;
      const taken = takenByCat[key] || 0;
      return {
        key,
        ...SUBMISSION_CATEGORIES[key],
        given,
        taken,
        givenPct: totalGiven > 0 ? Math.round((given / totalGiven) * 100) : 0,
        takenPct: totalTaken > 0 ? Math.round((taken / totalTaken) * 100) : 0,
      };
    }).filter(c => c.given > 0 || c.taken > 0)
      .sort((a, b) => (b.given + b.taken) - (a.given + a.taken));
  }, [trainings]);

  // ── Temps total sur tatami ──
  const totalHours = useMemo(() => {
    const minutes = trainings.reduce((sum, tr) => sum + (tr.duration_minutes || 0), 0);
    return Math.round(minutes / 60);
  }, [trainings]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}>
        <SkeletonGrid count={5} />
      </View>
    );
  }

  if (trainings.length === 0 || (themeStats.length === 0 && categoryStats.length === 0)) {
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatsEmptyState
          icon={<Map size={48} color={colors.textMuted} />}
          title="Pas encore de données positionnelles"
          description="Ajoute des thèmes techniques à tes séances et logge les soumissions des rounds pour voir ton jeu positionnel."
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

      {/* ── OVERVIEW ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.sectionHead}>
          <Map size={14} color="#10B981" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>TON JEU POSITIONNEL</Text>
        </View>
        <View style={styles.statsRow}>
          <StatCard value={trainings.length} label="Séances" color="#10B981" />
          <StatCard value={`${totalHours}h`} label="Sur le tatami" color="#A855F7" />
          <StatCard value={themeStats.length} label="Thèmes" color="#F59E0B" />
          <StatCard value={categoryStats.length} label="Catégories" color="#3B82F6" />
        </View>
      </View>

      {/* ── CATÉGORIES DE SOUMISSIONS ── */}
      {categoryStats.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHead}>
            <Target size={14} color="#8B5CF6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>FAMILLES DE SOUMISSIONS</Text>
          </View>
          <View style={{ gap: 12, marginTop: 12 }}>
            {categoryStats.map(cat => (
              <View key={cat.key}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[styles.catLabel, { color: colors.text }]}>{cat.label}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#22C55E' }}>
                    {cat.given} données
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>
                    {cat.taken} subies
                  </Text>
                </View>
                {/* Stacked bar : données (vert) / subies (rouge) sur même ligne */}
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{
                    flex: Math.max(cat.given, 0.1),
                    height: 12,
                    backgroundColor: '#22C55E',
                    borderRadius: 4,
                  }} />
                  <View style={{
                    flex: Math.max(cat.taken, 0.1),
                    height: 12,
                    backgroundColor: '#EF4444',
                    borderRadius: 4,
                    opacity: 0.8,
                  }} />
                </View>
              </View>
            ))}
          </View>
          <Text style={[styles.hint, { color: colors.textMuted, marginTop: 10 }]}>
            Visualise ton jeu offensif vs défensif par famille de soumissions.
          </Text>
        </View>
      )}

      {/* ── TOP THÈMES TRAVAILLÉS ── */}
      {themeStats.length > 0 && (
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHead}>
            <BookOpen size={14} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>THÈMES TECHNIQUES TRAVAILLÉS</Text>
          </View>
          <View style={{ gap: 6, marginTop: 10 }}>
            {themeStats.map((t, idx) => {
              const maxSessions = themeStats[0].sessions;
              const pct = (t.sessions / maxSessions) * 100;
              const daysSinceLast = Math.floor((Date.now() - new Date(t.lastDate).getTime()) / 86400000);
              return (
                <View key={t.theme} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={[styles.themeRank, { backgroundColor: idx < 3 ? '#F59E0B' : '#6B7280' }]}>
                        <Text style={styles.themeRankText}>{idx + 1}</Text>
                      </View>
                      <Text style={[styles.themeName, { color: colors.text }]} numberOfLines={1}>
                        {t.theme}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#F59E0B' }}>
                      {t.sessions}×
                    </Text>
                  </View>
                  <View style={[styles.themeTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
                    <View style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: '#F59E0B',
                      borderRadius: 4,
                    }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600' }}>
                      <Clock size={8} color={colors.textMuted} /> {Math.round(t.minutes / 60)}h cumulées
                    </Text>
                    <Text style={{ fontSize: 10, color: daysSinceLast > 30 ? '#EF4444' : colors.textMuted, fontWeight: '600' }}>
                      · dernière fois il y a {daysSinceLast}j
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
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
  statValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, fontWeight: '700', marginTop: 2, letterSpacing: 0.3, textAlign: 'center' },
  hint: { fontSize: 10, fontStyle: 'italic', textAlign: 'center' },

  catDot: { width: 10, height: 10, borderRadius: 5 },
  catLabel: { fontSize: 13, fontWeight: '800' },

  themeRank: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  themeRankText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  themeName: { flex: 1, fontSize: 13, fontWeight: '700' },
  themeTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
});
